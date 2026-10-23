/* Générateur de code MicroPython (micro:bit V1 et V2) à partir des blocs. */
(function (root) {
  'use strict';
  const Blockly = root.Blockly;

  const gen = new Blockly.Generator('MICROPYTHON');
  gen.INDENT = '    ';
  const ATOM = 0, NONE = 99;

  const RESERVED = new Set(('False None True and as assert async await break class continue def del elif else except finally for from ' +
    'global if import in is lambda nonlocal not or pass raise return try while with yield print str int float len range abs min max ' +
    'sum list dict set tuple bool type sleep running_time panic reset temperature scale display button_a button_b accelerometer ' +
    'compass microphone speaker uart spi i2c Image Sound music random radio os time struct audio machine pin0 pin1 pin2 pin3 pin4 ' +
    'pin5 pin6 pin7 pin8 pin9 pin10 pin11 pin12 pin13 pin14 pin15 pin16 pin19 pin20 pin_logo pin_speaker set_volume ' +
    'convertir plage logo_touche niveau_sonore').split(' '));

  function safeName(name) {
    let s = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]/g, '_');
    if (!s || /^[0-9]/.test(s)) s = 'v_' + s;
    if (RESERVED.has(s)) s += '_';
    return s;
  }
  /* L'écran de LED ne sait afficher que l'ASCII : on retire les accents et on remplace le reste. */
  function asciiText(s) {
    const map = { 'œ': 'oe', 'Œ': 'OE', 'æ': 'ae', 'Æ': 'AE', '«': '"', '»': '"', '“': '"', '”': '"', '’': '\'', '‘': '\'', '–': '-', '—': '-', '…': '...', 'ç': 'c', 'Ç': 'C', '€': 'EUR' };
    return String(s).replace(/[œŒæÆ«»“”’‘–—…çÇ€]/g, (c) => map[c])
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E\n]/g, '?');
  }
  const isNum = (s) => /^-?\d+(\.\d+)?$/.test(s);
  const isStr = (s) => /^"(?:[^"\\]|\\.)*"$/.test(s);
  const varName = (b, f) => gen.varNames_.get(b.getFieldValue(f || 'VAR')) || safeName(b.getFieldValue(f || 'VAR'));
  const need = (g, module) => { g.imports_.add(module); };
  const strOf = (v) => (isStr(v) ? v : 'str(' + v + ')');
  const clampNum = (v, lo, hi) => (isNum(v) ? String(Math.max(lo, Math.min(hi, Math.round(parseFloat(v))))) : v);

  gen.init = function (workspace) {
    this.imports_ = new Set();
    this.defs_ = new Map();
    this.vars_ = [];
    this.varNames_ = new Map();
    this.setupBody_ = '';
    this.loopBody_ = '';
    this.counter_ = 0;
    const used = new Set();
    for (const v of workspace.getAllVariables()) {
      const base = safeName(v.name);
      let name = base, k = 2;
      while (used.has(name)) name = base + '_' + k++;
      used.add(name);
      this.varNames_.set(v.getId(), name);
      this.vars_.push(name + ' = 0');
    }
    this.isInitialized = true;
  };

  gen.finish = function () {
    const out = ['# Programme généré par L\'atelier du codeur', 'from microbit import *'];
    for (const m of ['music', 'random']) if (this.imports_.has(m)) out.push('import ' + m);
    out.push('');
    for (const d of this.defs_.values()) out.push(d, '');
    if (this.vars_.length) out.push(...this.vars_, '');
    const dedent = (s) => s.replace(/^ {4}/gm, '').replace(/\n$/, '');
    if (this.setupBody_.trim()) out.push(dedent(this.setupBody_), '');
    if (this.loopBody_.trim()) out.push('while True:', this.loopBody_.replace(/\n$/, ''));
    else if (!this.setupBody_.trim()) out.push('# Ajoute des blocs dans « au démarrage » ou « répéter indéfiniment ».');
    return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') + '\n';
  };

  gen.scrub_ = function (block, code, opt) {
    const next = block.nextConnection && block.nextConnection.targetBlock();
    return code + (opt ? '' : this.blockToCode(next));
  };

  const F = gen.forBlock;
  const val = (g, b, name, dflt) => g.valueToCode(b, name, NONE) || dflt;
  function unwrap(c) {
    if (c[0] !== '(' || c[c.length - 1] !== ')') return c;
    let depth = 0, q = false;
    for (let i = 0; i < c.length; i++) {
      const ch = c[i];
      if (ch === '"' && c[i - 1] !== '\\') q = !q;
      if (q) continue;
      if (ch === '(') depth++;
      else if (ch === ')' && --depth === 0 && i < c.length - 1) return c;
    }
    return c.slice(1, -1);
  }
  const top = (g, b, name, dflt) => unwrap(val(g, b, name, dflt));
  const body = (g, b, name) => g.statementToCode(b, name) || g.INDENT + 'pass\n';

  /* ----- Structure ----- */
  F.mb_setup = (b, g) => { g.setupBody_ += g.statementToCode(b, 'DO'); return ''; };
  F.mb_loop = (b, g) => { g.loopBody_ += g.statementToCode(b, 'DO'); return ''; };

  /* ----- Écran ----- */
  F.mb_scroll = (b, g) => 'display.scroll(' + strOf(top(g, b, 'TEXT', '""')) + ')\n';
  F.mb_show = (b, g) => 'display.show(' + strOf(top(g, b, 'TEXT', '""')) + ')\n';
  F.mb_show_image = (b) => 'display.show(Image.' + b.getFieldValue('IMAGE') + ')\n';
  F.mb_show_leds = (b) => {
    const v = String(b.getFieldValue('LEDS') || '0'.repeat(25)).replace(/1/g, '9');
    const rows = [0, 1, 2, 3, 4].map((r) => v.slice(r * 5, r * 5 + 5));
    return 'display.show(Image("' + rows.join(':') + '"))\n';
  };
  F.mb_led = (b, g) => 'display.set_pixel(' + clampNum(top(g, b, 'X', '0'), 0, 4) + ', ' + clampNum(top(g, b, 'Y', '0'), 0, 4) + ', ' + clampNum(top(g, b, 'LEVEL', '9'), 0, 9) + ')\n';
  F.mb_led_off = (b, g) => 'display.set_pixel(' + clampNum(top(g, b, 'X', '0'), 0, 4) + ', ' + clampNum(top(g, b, 'Y', '0'), 0, 4) + ', 0)\n';
  F.mb_clear = () => 'display.clear()\n';

  /* ----- Entrées ----- */
  F.mb_button = (b) => {
    const k = b.getFieldValue('BTN');
    return [k === 'ab' ? '(button_a.is_pressed() and button_b.is_pressed())' : 'button_' + k + '.is_pressed()', ATOM];
  };
  F.mb_was_pressed = (b) => ['button_' + b.getFieldValue('BTN') + '.was_pressed()', ATOM];
  F.mb_gesture = (b) => ['accelerometer.is_gesture("' + b.getFieldValue('G') + '")', ATOM];
  F.mb_accel = (b) => ['accelerometer.get_' + b.getFieldValue('AXIS') + '()', ATOM];
  F.mb_compass = () => ['compass.heading()', ATOM];
  F.mb_temperature = () => ['temperature()', ATOM];
  F.mb_light = () => ['display.read_light_level()', ATOM];
  F.mb_touch = (b) => ['pin' + b.getFieldValue('PIN') + '.is_touched()', ATOM];
  /* Les éléments propres à la V2 n'existent pas sur la V1 : on les entoure d'un garde-fou. */
  F.mb_logo = (b, g) => {
    g.defs_.set('logo_touche', ['def logo_touche():', '    try:', '        return pin_logo.is_touched()', '    except NameError:', '        return False'].join('\n'));
    return ['logo_touche()', ATOM];
  };
  F.mb_sound = (b, g) => {
    g.defs_.set('niveau_sonore', ['def niveau_sonore():', '    try:', '        return microphone.sound_level()', '    except NameError:', '        return 0'].join('\n'));
    return ['niveau_sonore()', ATOM];
  };
  F.mb_pin_write = (b) => 'pin' + b.getFieldValue('PIN') + '.write_digital(' + b.getFieldValue('LEVEL') + ')\n';
  F.mb_pin_read = (b) => ['pin' + b.getFieldValue('PIN') + '.read_digital()', ATOM];
  F.mb_pin_write_analog = (b, g) => 'pin' + b.getFieldValue('PIN') + '.write_analog(' + clampNum(top(g, b, 'VALUE', '0'), 0, 1023) + ')\n';
  F.mb_pin_read_analog = (b) => ['pin' + b.getFieldValue('PIN') + '.read_analog()', ATOM];
  F.mb_print = (b, g) => 'print(' + top(g, b, 'TEXT', '""') + ')\n';

  /* ----- Musique ----- */
  F.mb_note = (b, g) => { need(g, 'music'); return 'music.pitch(' + b.getFieldValue('NOTE') + ', ' + top(g, b, 'DURATION', '500') + ')\n'; };
  F.mb_pitch = (b, g) => { need(g, 'music'); return 'music.pitch(' + top(g, b, 'FREQ', '440') + ', ' + top(g, b, 'DURATION', '500') + ')\n'; };
  F.mb_melody = (b, g) => { need(g, 'music'); return 'music.play(music.' + b.getFieldValue('TUNE') + ')\n'; };
  F.mb_music_stop = (b, g) => { need(g, 'music'); return 'music.stop()\n'; };

  /* ----- Temps ----- */
  F.mb_wait = (b, g) => {
    const d = val(g, b, 'DURATION', '0');
    if (b.getFieldValue('UNIT') === '1') return 'sleep(' + unwrap(d) + ')\n';
    if (isNum(d)) return 'sleep(' + Math.round(parseFloat(d) * 1000) + ')\n';
    return 'sleep(int(' + d + ' * 1000))\n';
  };
  F.mb_running_time = () => ['running_time()', ATOM];

  /* ----- Logique ----- */
  F.controls_if = (b, g) => {
    let n = 0, code = '';
    do {
      code += (n > 0 ? 'elif ' : 'if ') + top(g, b, 'IF' + n, 'False') + ':\n' + body(g, b, 'DO' + n);
      n++;
    } while (b.getInput('IF' + n));
    if (b.getInput('ELSE')) code += 'else:\n' + body(g, b, 'ELSE');
    return code;
  };
  const CMP = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
  F.logic_compare = (b, g) => ['(' + val(g, b, 'A', '0') + ' ' + CMP[b.getFieldValue('OP')] + ' ' + val(g, b, 'B', '0') + ')', ATOM];
  F.logic_operation = (b, g) => ['(' + val(g, b, 'A', 'False') + (b.getFieldValue('OP') === 'AND' ? ' and ' : ' or ') + val(g, b, 'B', 'False') + ')', ATOM];
  F.logic_negate = (b, g) => ['(not ' + val(g, b, 'BOOL', 'True') + ')', ATOM];
  F.logic_boolean = (b) => [b.getFieldValue('BOOL') === 'TRUE' ? 'True' : 'False', ATOM];

  /* ----- Boucles ----- */
  F.controls_repeat_ext = (b, g) => {
    const i = '_n' + (++g.counter_), t = top(g, b, 'TIMES', '0');
    return 'for ' + i + ' in range(' + (isNum(t) ? Math.max(0, Math.round(parseFloat(t))) : 'int(' + t + ')') + '):\n' + body(g, b, 'DO');
  };
  F.controls_whileUntil = (b, g) => {
    const c = top(g, b, 'BOOL', 'False');
    return 'while ' + (b.getFieldValue('MODE') === 'UNTIL' ? 'not (' + c + ')' : c) + ':\n' + body(g, b, 'DO');
  };
  F.controls_for = (b, g) => {
    const v = varName(b), from = top(g, b, 'FROM', '0'), to = top(g, b, 'TO', '0'), by = top(g, b, 'BY', '1');
    let r;
    if (isNum(from) && isNum(to) && isNum(by) && parseFloat(by) !== 0) {
      const s = Math.round(parseFloat(by)), e = Math.round(parseFloat(to)) + (s > 0 ? 1 : -1);
      r = 'range(' + Math.round(parseFloat(from)) + ', ' + e + (s !== 1 ? ', ' + s : '') + ')';
    } else {
      g.defs_.set('plage', ['def plage(debut, fin, pas):', '    if pas == 0:', '        pas = 1', '    return range(int(debut), int(fin) + (1 if pas > 0 else -1), int(pas))'].join('\n'));
      r = 'plage(' + from + ', ' + to + ', ' + by + ')';
    }
    return 'for ' + v + ' in ' + r + ':\n' + body(g, b, 'DO');
  };
  F.controls_flow_statements = (b) => (b.getFieldValue('FLOW') === 'BREAK' ? 'break\n' : 'continue\n');

  /* ----- Maths, texte, variables ----- */
  F.math_number = (b) => [String(Number(b.getFieldValue('NUM'))), ATOM];
  const OPS = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '//', POWER: '**' };
  F.math_arithmetic = (b, g) => ['(' + val(g, b, 'A', '0') + ' ' + OPS[b.getFieldValue('OP')] + ' ' + val(g, b, 'B', '0') + ')', ATOM];
  F.math_random_int = (b, g) => { need(g, 'random'); return ['random.randint(' + top(g, b, 'FROM', '0') + ', ' + top(g, b, 'TO', '0') + ')', ATOM]; };
  F.mb_map = (b, g) => {
    g.defs_.set('convertir', ['def convertir(v, a, b, c, d):', '    if b == a:', '        return c', '    return (v - a) * (d - c) // (b - a) + c'].join('\n'));
    return ['convertir(' + ['VALUE', 'FROM_LOW', 'FROM_HIGH', 'TO_LOW', 'TO_HIGH'].map((n) => top(g, b, n, '0')).join(', ') + ')', ATOM];
  };
  F.text = (b) => ['"' + asciiText(b.getFieldValue('TEXT')).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"', ATOM];
  F.text_join = (b, g) => {
    const parts = [];
    for (let i = 0; i < (b.itemCount_ || 0); i++) parts.push(strOf(top(g, b, 'ADD' + i, '""')));
    return [parts.length ? '(' + parts.join(' + ') + ')' : '""', ATOM];
  };
  F.variables_get = (b) => [varName(b), ATOM];
  F.variables_set = (b, g) => varName(b) + ' = ' + top(g, b, 'VALUE', '0') + '\n';
  F.math_change = (b, g) => varName(b) + ' += ' + top(g, b, 'DELTA', '0') + '\n';

  const HATS = ['mb_setup', 'mb_loop'];
  root.MicrobitGen = {
    generate: (ws) => gen.workspaceToCode(ws),
    orphanCount: (ws) => ws.getTopBlocks(false).filter((b) => HATS.indexOf(b.type) < 0 && b.isEnabled()).length,
  };
})(typeof window !== 'undefined' ? window : globalThis);
