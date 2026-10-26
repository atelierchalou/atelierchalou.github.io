/* Moteur de simulation commun : les blocs sont traduits en JavaScript « asynchrone » puis exécutés dans la page,
   avec une carte virtuelle (fournie par sim-arduino.js ou sim-microbit.js). */
(function (root) {
  'use strict';
  const Blockly = root.Blockly;

  /* ================= Générateur blocs -> JavaScript simulé ================= */
  const gen = new Blockly.Generator('SIM');
  gen.INDENT = '  ';
  const ATOM = 0, NONE = 99;

  gen.init = function (workspace) {
    this.varNames_ = new Map();
    this.vars_ = [];
    this.setupBody_ = '';
    this.loopBody_ = '';
    this.counter_ = 0;
    let k = 0;
    for (const v of workspace.getAllVariables()) {
      const name = 'v' + (++k);
      this.varNames_.set(v.getId(), name);
      this.vars_.push(name);
    }
    this.isInitialized = true;
  };
  gen.finish = function () {
    return (this.vars_.length ? 'let ' + this.vars_.map((v) => v + ' = 0').join(', ') + ';\n' : '')
      + 'return {\n  setup: async () => {\n' + this.setupBody_ + '  },\n  loop: async () => {\n' + this.loopBody_ + '  },\n'
      + '  hasLoop: ' + (this.loopBody_.trim() ? 'true' : 'false') + ',\n};\n';
  };
  gen.scrub_ = function (block, code, opt) {
    const next = block.nextConnection && block.nextConnection.targetBlock();
    return code + (opt ? '' : this.blockToCode(next));
  };

  const F = gen.forBlock;
  const val = (g, b, name, dflt) => g.valueToCode(b, name, NONE) || dflt;
  const fld = (b, name) => JSON.stringify(String(b.getFieldValue(name)));
  const vname = (b) => gen.varNames_.get(b.getFieldValue('VAR')) || 'v0';
  const loopBody = (g, b, name) => g.INDENT + 'await sim.step();\n' + g.statementToCode(b, name);
  const line = (code) => code + ';\n';

  /* Structure : les deux applis */
  F.arduino_setup = F.mb_setup = (b, g) => { g.setupBody_ += g.prefixLines(g.statementToCode(b, 'DO'), g.INDENT); return ''; };
  F.arduino_loop = F.mb_loop = (b, g) => { g.loopBody_ += g.prefixLines(g.statementToCode(b, 'DO'), g.INDENT); return ''; };

  /* Logique */
  F.controls_if = (b, g) => {
    let n = 0, code = '';
    do {
      code += (n > 0 ? ' else ' : '') + 'if (sim.bool(' + val(g, b, 'IF' + n, 'false') + ')) {\n' + g.statementToCode(b, 'DO' + n) + '}';
      n++;
    } while (b.getInput('IF' + n));
    if (b.getInput('ELSE')) code += ' else {\n' + g.statementToCode(b, 'ELSE') + '}';
    return code + '\n';
  };
  const CMP = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
  F.logic_compare = (b, g) => ['(' + val(g, b, 'A', '0') + ' ' + CMP[b.getFieldValue('OP')] + ' ' + val(g, b, 'B', '0') + ')', ATOM];
  F.logic_operation = (b, g) => ['(sim.bool(' + val(g, b, 'A', 'false') + ')' + (b.getFieldValue('OP') === 'AND' ? ' && ' : ' || ') + 'sim.bool(' + val(g, b, 'B', 'false') + '))', ATOM];
  F.logic_negate = (b, g) => ['(!sim.bool(' + val(g, b, 'BOOL', 'true') + '))', ATOM];
  F.logic_boolean = (b) => [b.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', ATOM];

  /* Boucles : chaque tour laisse respirer la page et vérifie le bouton « Arrêter » */
  F.controls_repeat_ext = (b, g) => {
    const i = '_n' + (++g.counter_);
    return 'for (let ' + i + ' = 0, ' + i + 'max = sim.num(' + val(g, b, 'TIMES', '0') + '); ' + i + ' < ' + i + 'max; ' + i + '++) {\n' + loopBody(g, b, 'DO') + '}\n';
  };
  F.controls_whileUntil = (b, g) => {
    const c = 'sim.bool(' + val(g, b, 'BOOL', 'false') + ')';
    return 'while (' + (b.getFieldValue('MODE') === 'UNTIL' ? '!' + c : c) + ') {\n' + loopBody(g, b, 'DO') + '}\n';
  };
  F.controls_for = (b, g) => {
    const v = vname(b), k = ++g.counter_;
    return 'for (let _to' + k + ' = sim.num(' + val(g, b, 'TO', '0') + '), _by' + k + ' = sim.num(' + val(g, b, 'BY', '1') + '), _f' + k + ' = (' + v + ' = sim.num(' + val(g, b, 'FROM', '0') + '));'
      + ' (_by' + k + ' >= 0 ? ' + v + ' <= _to' + k + ' : ' + v + ' >= _to' + k + '); ' + v + ' += (_by' + k + ' || sim.zeroStep)) {\n' + loopBody(g, b, 'DO') + '}\n';
  };
  F.controls_flow_statements = (b) => (b.getFieldValue('FLOW') === 'BREAK' ? 'break;\n' : 'continue;\n');

  /* Maths, texte, variables */
  F.math_number = (b) => [String(Number(b.getFieldValue('NUM'))), ATOM];
  F.math_arithmetic = (b, g) => {
    const a = val(g, b, 'A', '0'), c = val(g, b, 'B', '0');
    switch (b.getFieldValue('OP')) {
      case 'ADD': return ['(sim.num(' + a + ') + sim.num(' + c + '))', ATOM];
      case 'MINUS': return ['(' + a + ' - ' + c + ')', ATOM];
      case 'MULTIPLY': return ['(' + a + ' * ' + c + ')', ATOM];
      case 'DIVIDE': return ['sim.div(' + a + ', ' + c + ')', ATOM];
      default: return ['Math.pow(' + a + ', ' + c + ')', ATOM];
    }
  };
  F.math_random_int = (b, g) => ['sim.rand(' + val(g, b, 'FROM', '0') + ', ' + val(g, b, 'TO', '0') + ')', ATOM];
  F.map_value = F.mb_map = (b, g) => ['sim.map(' + ['VALUE', 'FROM_LOW', 'FROM_HIGH', 'TO_LOW', 'TO_HIGH'].map((n) => val(g, b, n, '0')).join(', ') + ')', ATOM];
  F.text = (b) => [JSON.stringify(String(b.getFieldValue('TEXT'))), ATOM];
  F.text_join = (b, g) => {
    const parts = [];
    for (let i = 0; i < (b.itemCount_ || 0); i++) parts.push('sim.str(' + val(g, b, 'ADD' + i, '""') + ')');
    return [parts.length ? '(' + parts.join(' + ') + ')' : '""', ATOM];
  };
  F.variables_get = (b) => [vname(b), ATOM];
  F.variables_set = (b, g) => line(vname(b) + ' = sim.store(' + val(g, b, 'VALUE', '0') + ')');
  F.math_change = (b, g) => line(vname(b) + ' = sim.store(sim.num(' + vname(b) + ') + sim.num(' + val(g, b, 'DELTA', '0') + '))');

  const SimGen = {
    gen: gen, forBlock: F, val: val, fld: fld, line: line, ATOM: ATOM, NONE: NONE,
    generate: (ws) => gen.workspaceToCode(ws),
  };

  /* ================= Exécution ================= */
  class Stop extends Error {}
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  /* options : { intDiv: 'trunc' | 'floor', store(v), str(v), onError(e), onStateChange(running) } */
  class SimRunner {
    constructor(options) {
      this.o = options;
      this.token = 0;
      this.running = false;
      this.speed = 1;
      this.vtBase = 0;
      this.realBase = 0;
    }
    setSpeed(s) {
      const now = performance.now();
      this.vtBase += (now - this.realBase) * this.speed;
      this.realBase = now;
      this.speed = s;
    }
    millis() { return Math.floor(this.vtBase + (performance.now() - this.realBase) * this.speed); }
    stop() {
      this.token++;
      if (this.running) { this.running = false; if (this.o.onStateChange) this.o.onStateChange(false); }
    }
    /* Construit l'objet « sim » visible par le programme simulé. */
    api(hw, token) {
      const self = this, o = this.o;
      let lastYield = performance.now();
      const alive = () => { if (self.token !== token) throw new Stop(); };
      const num = (v) => (typeof v === 'boolean' ? (v ? 1 : 0) : Number(v) || 0);
      const roundDiv = o.intDiv === 'floor' ? Math.floor : Math.trunc;
      return {
        hw: hw,
        zeroStep: o.zeroStep || 0,   // pas de 0 dans « compter » : Arduino boucle sans fin, MicroPython prend 1
        num: num,
        bool: (v) => !!v,
        str: o.str || ((v) => String(v)),
        store: o.store || ((v) => v),
        div: (a, b) => {
          a = num(a); b = num(b);
          if (b === 0) { if (o.divZero) throw new Error(o.divZero); return 0; }
          return roundDiv(a / b);
        },
        rand: (a, b) => { a = Math.round(num(a)); b = Math.round(num(b)); if (b < a) [a, b] = [b, a]; return a + Math.floor(Math.random() * (b - a + 1)); },
        map: (v, a, b, c, d) => { v = num(v); a = num(a); b = num(b); c = num(c); d = num(d); return b === a ? c : roundDiv((v - a) * (d - c) / (b - a)) + c; },
        millis: () => self.millis(),
        alive: alive,
        async step() {
          alive();
          if (performance.now() - lastYield > 12) { await pause(0); lastYield = performance.now(); alive(); }
        },
        async sleep(ms) {
          alive();
          ms = Math.max(0, num(ms));
          const end = performance.now() + ms / self.speed;
          for (;;) {
            const left = end - performance.now();
            if (left <= 0) break;
            await pause(Math.min(40, left));
            alive();
          }
          lastYield = performance.now();
        },
      };
    }
    /* Lance un programme (source produite par SimGen) sur une carte virtuelle. */
    start(src, hw) {
      this.stop();
      const token = ++this.token;
      const sim = this.api(hw, token);
      hw.sim = sim;   // la carte virtuelle peut ainsi attendre (sons, défilement…) en respectant « Arrêter »
      let prog;
      try { prog = new Function('sim', src)(sim); } catch (e) { if (this.o.onError) this.o.onError(e); return; }
      this.vtBase = 0; this.realBase = performance.now();
      this.running = true;
      if (this.o.onStateChange) this.o.onStateChange(true);
      if (hw.reset) hw.reset();
      (async () => {
        try {
          await prog.setup();
          if (prog.hasLoop) for (;;) { await sim.step(); await prog.loop(); }
          else for (;;) { await sim.sleep(1000); }   // comme une vraie carte : le programme est fini, la carte reste allumée
        } catch (e) {
          if (!(e instanceof Stop) && this.token === token) {
            if (this.o.onError) this.o.onError(e);
            this.stop();
          }
        }
      })();
    }
  }

  /* Son : petits bips WebAudio (le navigateur exige un clic de l'utilisateur avant de jouer). */
  const Sound = {
    ctx: null, osc: null, gain: null, muted: false,
    ensure() {
      if (this.ctx || !(root.AudioContext || root.webkitAudioContext)) return this.ctx;
      try {
        this.ctx = new (root.AudioContext || root.webkitAudioContext)();
        this.gain = this.ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(this.ctx.destination);
        this.osc = this.ctx.createOscillator(); this.osc.type = 'square'; this.osc.frequency.value = 440; this.osc.connect(this.gain); this.osc.start();
      } catch (e) { this.ctx = null; }
      return this.ctx;
    },
    tone(freq) {
      if (!this.ensure()) return;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const t = this.ctx.currentTime;
      if (freq > 0 && !this.muted) { this.osc.frequency.setValueAtTime(Math.min(20000, freq), t); this.gain.gain.setTargetAtTime(0.06, t, 0.005); }
      else this.gain.gain.setTargetAtTime(0, t, 0.005);
    },
    off() { if (this.ctx) this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.005); },
  };

  /* Petite aide d'interface : crée un élément avec attributs et enfants. */
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of [].concat(children || [])) if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return e;
  }
  /* Bouton « à maintenir » : souris, doigt ou clavier (espace / entrée). */
  function holdable(node, onChange) {
    let down = false;
    const set = (v) => { if (v !== down) { down = v; node.classList.toggle('down', v); onChange(v); } };
    node.addEventListener('pointerdown', (e) => { e.preventDefault(); try { node.setPointerCapture(e.pointerId); } catch (x) { /* rien */ } set(true); });
    node.addEventListener('pointerup', () => set(false));
    node.addEventListener('pointercancel', () => set(false));
    node.addEventListener('lostpointercapture', () => set(false));
    node.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); set(true); } });
    node.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') set(false); });
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'button');
    return node;
  }

  /* Styles communs des panneaux de simulation. */
  const CSS = `
.tabs{display:flex;gap:4px;margin:10px 14px 0;padding:0 4px;border-bottom:3px solid #3D7BFF}
.tabs button{display:inline-flex;align-items:center;gap:7px;font:600 14px var(--font);border:2px solid #dfe5f2;border-bottom:0;background:#eef1f8;
  color:var(--muted);border-radius:9px 9px 0 0;padding:8px 16px 7px;cursor:pointer;margin-bottom:-1px}
.tabs button svg{width:18px;height:18px}
.tabs button:hover{background:#e3e9fb;color:var(--ink)}
.tabs button[aria-selected=true]{background:#3D7BFF;border-color:#3D7BFF;color:#fff}
.codewrap,.simwrap{margin-top:10px !important}
.simwrap{flex:1 1 160px;min-height:140px;margin:0 14px;display:flex;flex-direction:column;gap:10px;overflow:auto}
.simwrap>*,.simboard>*{flex:none}
.simboard{display:flex;flex-direction:column;gap:8px}
.simwrap[hidden],.codewrap[hidden]{display:none}
.simbar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.simbtn{display:inline-flex;align-items:center;gap:6px;font:600 13.5px var(--font);border:0;border-radius:999px;padding:7px 14px;cursor:pointer;color:#fff;background:#34B34A;box-shadow:0 3px 0 #23803a}
.simbtn.stop{background:#EF476F;box-shadow:0 3px 0 #b8304f}
.simbtn.light{background:#eef1fb;color:var(--ink);box-shadow:0 3px 0 #cfd6ee}
.simbtn:active{transform:translateY(2px);box-shadow:none}
.simbtn svg{width:16px;height:16px}
.simbar select{font:600 13px var(--font);border:2px solid #e3e8f4;border-radius:999px;padding:4px 8px;background:#fff;color:var(--ink)}
.simstate{font-size:12.5px;font-weight:600;color:var(--muted);margin-left:auto}
.simstate.on{color:#1a8f4e}
.simstate.on::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:#34B34A;margin-right:6px;animation:ledpulse 1.3s infinite}
.simgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}
aside.simmode #mascot{width:54px;height:58px}
aside.simmode .bubble{font-size:13px;padding:6px 10px}
aside.simmode #log{height:64px}
aside.simmode .buddy{margin:6px 14px 4px}
.simcard{background:#f7f9ff;border:2px solid #e6ebf8;border-radius:14px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;font-size:12.5px}
.simcard b{font-size:12.5px} .simcard small{color:var(--muted);font-size:11.5px}
.simcard input[type=range]{width:100%;accent-color:#3D7BFF}
.simhint{font-size:13px;color:var(--muted);background:#f7f9ff;border:2px dashed #e3e8f4;border-radius:12px;padding:8px 10px}
.serial{background:#14213d;color:#c8f7d4;border-radius:12px;font:12px/1.45 ui-monospace,Consolas,monospace;padding:8px 10px;min-height:56px;max-height:130px;overflow:auto;white-space:pre-wrap;word-break:break-word}
.serialhead{display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:13px;color:var(--teal)}
.serialhead button{font:600 12px var(--font);border:0;background:#eef1fb;border-radius:999px;padding:3px 10px;cursor:pointer}
.press{cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
.press:focus-visible{outline:3px solid #FFC933;outline-offset:2px;border-radius:50%}
`;
  let cssDone = false;
  function injectCss() {
    if (cssDone) return;
    cssDone = true;
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  root.SimCore = { SimGen: SimGen, SimRunner: SimRunner, Sound: Sound, el: el, holdable: holdable, injectCss: injectCss, Stop: Stop };
})(typeof window !== 'undefined' ? window : globalThis);
