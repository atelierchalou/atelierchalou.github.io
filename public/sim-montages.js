/* Simulation des montages : radio nRF24L01 (commune au robot et à la télécommande), télécommande, pistolet laser,
   cible LED (5 vies) et cibles à volets (5 cibles). */
(function (root) {
  'use strict';
  const { SimGen, el, holdable } = root.SimCore;
  const F = SimGen.forBlock, val = SimGen.val, line = SimGen.line, ATOM = SimGen.ATOM;
  const q = (s) => JSON.stringify(String(s));

  /* ----- Blocs -> JavaScript simulé ----- */
  F.robot_radio_channel = (b) => line('sim.hw.m.radioChannel(' + Number(b.getFieldValue('CH')) + ')');
  F.robot_radio_send = (b, g) => line('sim.hw.m.radioSend(' + val(g, b, 'VALUE', '0') + ')');
  F.robot_radio_received = () => ['sim.hw.m.radioReceived()', ATOM];
  F.robot_radio_value = () => ['sim.hw.m.radioValue()', ATOM];
  F.tc_button = (b) => ['sim.hw.m.pressed(' + q('tc' + b.getFieldValue('BTN')) + ')', ATOM];
  F.tc_click = (b) => ['sim.hw.m.clicked(' + q('tc' + b.getFieldValue('BTN')) + ')', ATOM];
  F.tc_led = (b) => line('sim.hw.m.out("turbo", ' + (b.getFieldValue('STATE') === 'HIGH' ? 1 : 0) + ')');
  F.pl_button = (b) => ['sim.hw.m.pressed(' + q('pl' + b.getFieldValue('BTN')) + ')', ATOM];
  F.pl_click = (b) => ['sim.hw.m.clicked(' + q('pl' + b.getFieldValue('BTN')) + ')', ATOM];
  F.pl_shoot = () => line('await sim.hw.m.shoot()');
  F.pl_laser = (b) => line('sim.hw.m.out("laser", ' + (b.getFieldValue('STATE') === 'HIGH' ? 1 : 0) + ')');
  F.pl_ammo = (b, g) => line('sim.hw.m.bar("ammo", ' + val(g, b, 'N', '0') + ')');
  F.cl_hit = (b) => ['sim.hw.m.hit(0, ' + Number(b.getFieldValue('SEUIL')) + ')', ATOM];
  F.cl_light = () => ['sim.hw.m.light(0)', ATOM];
  F.cible_raz = () => ['sim.hw.m.pressed("raz")', ATOM];
  F.cl_lives = (b, g) => line('sim.hw.m.bar("lives", ' + val(g, b, 'N', '0') + ')');
  F.cv_hit = (b, g) => ['sim.hw.m.hit(sim.hw.m.idx(' + val(g, b, 'N', '1') + '), ' + Number(b.getFieldValue('SEUIL')) + ')', ATOM];
  F.cv_light = (b, g) => ['sim.hw.m.light(sim.hw.m.idx(' + val(g, b, 'N', '1') + '))', ATOM];
  F.cv_flap = (b, g) => line('sim.hw.m.flap(sim.hw.m.idx(' + val(g, b, 'N', '1') + '), ' + Number(b.getFieldValue('POS')) + ')');
  F.cv_led = (b, g) => line('sim.hw.m.cibleLed(sim.hw.m.idx(' + val(g, b, 'N', '1') + '), ' + (b.getFieldValue('STATE') === 'HIGH' ? 1 : 0) + ')');

  /* Quels montages le programme utilise-t-il ? */
  function groupsOf(ws) {
    const g = new Set();
    for (const b of ws.getAllBlocks(false)) {
      if (!b.isEnabled()) continue;
      const t = b.type;
      if (t.indexOf('robot_radio') === 0) { g.add('radio'); if (t === 'robot_radio_received' || t === 'robot_radio_value') g.add('radioIn'); }
      else if (t.indexOf('tc_') === 0) g.add('tc');
      else if (t.indexOf('pl_') === 0) g.add('pl');
      else if (t.indexOf('cl_') === 0) g.add('cl');
      else if (t.indexOf('cv_') === 0) g.add('cv');
      else if (t === 'cible_raz') g.add('raz');
    }
    if (g.has('raz') && !g.has('cv')) g.add('cl');
    return g;
  }

  const CODES = { 0: 'rien / arrêt', 1: 'avancer', 2: 'reculer', 3: 'gauche', 4: 'droite' };
  const meaning = (v) => (v > 10 && CODES[v - 10] ? CODES[v - 10] + ', turbo' : CODES[v] || '');
  const AMBIENT = 800, LIT = 60;

  class MontageSim {
    constructor(board) { this.board = board; this.ambient = [AMBIENT, AMBIENT, AMBIENT, AMBIENT, AMBIENT]; this.ui = null; this.remoteTurbo = false; this.reset(); }
    reset() {
      this.btn = {}; this.clicks = {}; this.outs = {}; this.bars = { ammo: 0, lives: 0 };
      this.hitUntil = [0, 0, 0, 0, 0]; this.prev = [false, false, false, false, false];
      this.flaps = [90, 90, 90, 90, 90]; this.leds = [0, 0, 0, 0, 0];
      this.radio = { ch: 76, inbox: [], last: 0, sent: null, sentCount: 0 };
      this.paint();
    }
    /* --- API du programme simulé --- */
    pressed(k) { return !!this.btn[k]; }
    clicked(k) { const c = (this.clicks[k] || 0) > 0; this.clicks[k] = 0; return c; }
    out(k, v) { this.outs[k] = v ? 1 : 0; this.paint(); }
    async shoot() { this.out('laser', 1); try { await this.board.sim.sleep(200); } finally { this.out('laser', 0); } }
    bar(k, n) { this.bars[k] = Math.max(0, Math.min(5, Math.trunc(Number(n) || 0))); this.paint(); }
    idx(n) { return Math.max(1, Math.min(5, Math.trunc(Number(n) || 1))) - 1; }
    light(i) { return performance.now() < this.hitUntil[i] ? LIT : this.ambient[i]; }
    hit(i, seuil) { const lit = this.light(i) < seuil; const arrive = lit && !this.prev[i]; this.prev[i] = lit; return arrive; }
    flap(i, a) { this.flaps[i] = a; this.paint(); }
    cibleLed(i, v) { this.leds[i] = v ? 1 : 0; this.paint(); }
    radioChannel(c) { this.radio.ch = c; this.paint(); }
    radioSend(v) { this.radio.sent = Math.trunc(Number(v) || 0); this.radio.sentCount++; this.paintRadio(); }
    radioReceived() { if (!this.radio.inbox.length) return false; this.radio.last = this.radio.inbox.shift(); this.paintRadio(); return true; }
    radioValue() { return this.radio.last; }

    /* --- Affichage --- */
    holdBtn(label, key, cls) {
      return holdable(el('span', { class: 'mbtn press ' + (cls || ''), text: label }), (down) => {
        this.btn[key] = down;
        if (down) this.clicks[key] = (this.clicks[key] || 0) + 1;
      });
    }
    ledRow(n, color, cls) {
      const row = el('div', { class: 'ledrow ' + (cls || '') });
      for (let i = 0; i < n; i++) row.appendChild(el('i', { style: '--c:' + color }));
      return row;
    }
    shootBtn(i, text) {
      return el('button', { type: 'button', class: 'simbtn light shot', text: text || 'Tirer', title: 'Envoie le point laser sur le capteur', onclick: () => { this.hitUntil[i] = performance.now() + 400; } });
    }
    ambientSlider() {
      const out = el('small', { text: String(this.ambient[0]) });
      const r = el('input', { type: 'range', min: '0', max: '1023', value: String(this.ambient[0]), 'aria-label': 'Lumière ambiante' });
      r.addEventListener('input', () => { this.ambient = this.ambient.map(() => Number(r.value)); out.textContent = r.value; });
      return el('div', { class: 'mrow' }, [el('small', { text: 'Lumière de la salle (valeur du capteur sans laser) :' }), r, out]);
    }
    build(c, groups) {
      this.ui = {};
      if (groups.has('tc')) {
        const pad = el('div', { class: 'tcpad' }, [
          el('span'), this.holdBtn('▲', 'tc2'), el('span'),
          this.holdBtn('◀', 'tc4'), this.holdBtn('TURBO', 'tc6', 'turbo'), this.holdBtn('▶', 'tc5'),
          el('span'), this.holdBtn('▼', 'tc3'), el('span')]);
        this.ui.turbo = el('i', { class: 'led1', style: '--c:#2ecc40' });
        c.appendChild(el('div', { class: 'mcard' }, [el('b', { text: 'Télécommande' }), pad,
          el('div', { class: 'mrow' }, [this.ui.turbo, el('small', { text: 'LED turbo (D7)' })])]));
      }
      if (groups.has('pl')) {
        this.ui.ammo = this.ledRow(5, '#ffcc00');
        this.ui.beam = el('div', { class: 'beam' });
        c.appendChild(el('div', { class: 'mcard' }, [el('b', { text: 'Pistolet laser' }),
          el('div', { class: 'gun' }, [el('div', { class: 'gunbody', text: '🔫' }), this.ui.beam]),
          el('div', { class: 'mrow' }, [el('small', { text: 'Munitions :' }), this.ui.ammo]),
          el('div', { class: 'mrow' }, [this.holdBtn('Gâchette', 'pl6', 'red'), this.holdBtn('Recharger', 'pl5')])]));
      }
      if (groups.has('cl')) {
        this.ui.lives = this.ledRow(5, '#ff3b3b');
        this.ui.target = el('div', { class: 'tgt big' });
        c.appendChild(el('div', { class: 'mcard' }, [el('b', { text: 'Cible LED' }),
          el('div', { class: 'mrow' }, [this.ui.target, el('div', {}, [this.shootBtn(0, 'Tirer sur la cible'), el('div', { class: 'mrow' }, [el('small', { text: 'Vies :' }), this.ui.lives])])]),
          el('div', { class: 'mrow' }, [this.holdBtn('RAZ', 'raz')]), this.ambientSlider()]));
      }
      if (groups.has('cv')) {
        const row = el('div', { class: 'cvrow' });
        this.ui.cv = [];
        for (let i = 0; i < 5; i++) {
          const flap = el('div', { class: 'flap' }), led = el('i', { class: 'led1', style: '--c:#ff3b3b' }), tgt = el('div', { class: 'tgt' });
          row.appendChild(el('div', { class: 'cv' }, [el('div', { class: 'cvbox' }, [tgt, flap]), led, el('small', { text: 'n° ' + (i + 1) }), this.shootBtn(i)]));
          this.ui.cv.push({ flap: flap, led: led, tgt: tgt });
        }
        c.appendChild(el('div', { class: 'mcard' }, [el('b', { text: 'Cibles à volets' }), row,
          el('div', { class: 'mrow' }, [this.holdBtn('RAZ', 'raz')]), this.ambientSlider()]));
      }
      if (groups.has('radio')) {
        this.ui.radioInfo = el('small', { class: 'rinfo' });
        const remote = el('div', { class: 'remote' });
        const push = (v) => { this.radio.inbox.push(v); if (this.radio.inbox.length > 30) this.radio.inbox.shift(); this.paintRadio(); };
        const turbo = el('button', { type: 'button', class: 'simbtn light', text: 'Turbo : non' });
        turbo.onclick = () => { this.remoteTurbo = !this.remoteTurbo; turbo.textContent = 'Turbo : ' + (this.remoteTurbo ? 'oui' : 'non'); };
        for (const [t, v, title] of [['▲', 1, 'avancer (1)'], ['▼', 2, 'reculer (2)'], ['◀', 3, 'gauche (3)'], ['▶', 4, 'droite (4)'], ['■', 0, 'stop (0)']]) {
          remote.appendChild(el('button', { type: 'button', class: 'rbtn', text: t, title: 'Envoie ' + title, onclick: () => push(v && this.remoteTurbo ? v + 10 : v) }));
        }
        remote.appendChild(turbo);
        const numIn = el('input', { type: 'number', value: '5', class: 'rnum', 'aria-label': 'Nombre à envoyer' });
        remote.appendChild(numIn);
        remote.appendChild(el('button', { type: 'button', class: 'simbtn light', text: 'Envoyer', onclick: () => push(Math.trunc(Number(numIn.value) || 0)) }));
        const parts = [el('b', { text: 'Radio nRF24L01' })];
        if (groups.has('radioIn')) parts.push(el('small', { text: 'Une autre carte (la télécommande) envoie des nombres à ta carte :' }), remote);
        else parts.push(el('small', { text: 'Ce que ta carte envoie par radio (au robot, par exemple) :' }));
        parts.push(this.ui.radioInfo);
        c.appendChild(el('div', { class: 'mcard' }, parts));
      }
      this.paint();
    }
    paintRadio() {
      if (!this.ui || !this.ui.radioInfo) return;
      const r = this.radio;
      const AB = root.ArduinoBlocks;
      this.ui.radioInfo.textContent = (AB ? 'Groupe ' + AB.radioGroup() + ' (adresse ' + AB.radioAddress() + ') · ' : '') + 'Canal ' + r.ch + ' · '
        + (r.sent != null ? 'ta carte a envoyé ' + r.sent + (meaning(r.sent) ? ' (' + meaning(r.sent) + ')' : '') + ' · ' + r.sentCount + ' envoi(s)' : 'ta carte n\'a rien envoyé')
        + ' · reçu en dernier : ' + r.last + (r.inbox.length ? ' · ' + r.inbox.length + ' en attente' : '');
    }
    paint() {
      const u = this.ui;
      if (!u) return;
      const setRow = (row, n) => { if (row) [...row.children].forEach((d, i) => d.classList.toggle('on', i < n)); };
      if (u.turbo) u.turbo.classList.toggle('on', !!this.outs.turbo);
      setRow(u.ammo, this.bars.ammo);
      setRow(u.lives, this.bars.lives);
      if (u.beam) u.beam.classList.toggle('on', !!this.outs.laser);
      if (u.cv) u.cv.forEach((x, i) => { x.flap.classList.toggle('closed', this.flaps[i] >= 45); x.led.classList.toggle('on', !!this.leds[i]); });
      this.paintRadio();
    }
  }

  const CSS = `
.mcard{background:#f7f9ff;border:2px solid #e6ebf8;border-radius:14px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
.mcard>b{font-size:13.5px;color:var(--teal)}
.mrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mrow input[type=range]{flex:1;min-width:90px;accent-color:#3D7BFF}
.mbtn{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:34px;padding:0 12px;border-radius:10px;font:600 13px var(--font);
  background:#2b2d42;color:#fff;box-shadow:0 3px 0 #11121c;cursor:pointer;user-select:none}
.mbtn.down{transform:translateY(2px);box-shadow:none;background:#4b4e6b}
.mbtn.red{background:#C92A2A;box-shadow:0 3px 0 #8a1c1c} .mbtn.turbo{background:#e8590c;box-shadow:0 3px 0 #a23e08}
.tcpad{display:grid;grid-template-columns:repeat(3,auto);gap:6px;justify-content:start}
.ledrow{display:flex;gap:6px}
.ledrow i,.led1{width:16px;height:16px;border-radius:50%;display:inline-block;background:color-mix(in srgb,var(--c) 22%,#3a3a44);border:2px solid #2b2d42}
.ledrow i.on,.led1.on{background:var(--c);box-shadow:0 0 10px var(--c)}
.gun{display:flex;align-items:center;gap:4px;height:34px}
.gunbody{font-size:28px;transform:scaleX(-1)}
.beam{height:4px;flex:1;border-radius:4px;background:transparent}
.beam.on{background:linear-gradient(90deg,#ff2b2b,#ff8a8a);box-shadow:0 0 8px #ff2b2b}
.tgt{width:44px;height:44px;border-radius:50%;background:radial-gradient(circle,#ff3b3b 0 18%,#fff 19% 38%,#ff3b3b 39% 58%,#fff 59% 78%,#ff3b3b 79%)}
.tgt.big{width:64px;height:64px}
.cvrow{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.cv{display:flex;flex-direction:column;align-items:center;gap:4px}
.cv .shot{padding:4px 8px;font-size:12px}
.cvbox{position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center}
.flap{position:absolute;inset:0;background:#8a6a43;border:2px solid #4f3a20;border-radius:6px;transform-origin:top;transform:scaleY(0.08);transition:transform .25s}
.flap.closed{transform:scaleY(1)}
.rinfo{color:var(--muted)}
.remote{display:flex;flex-wrap:wrap;align-items:center;gap:5px}
.rbtn{font:600 14px var(--font);width:34px;height:30px;border:0;border-radius:9px;background:#5F3DC4;color:#fff;cursor:pointer;box-shadow:0 3px 0 #3f2785}
.rbtn:active{transform:translateY(2px);box-shadow:none}
.rnum{width:64px;font:600 13px var(--font);border:2px solid #e3e8f4;border-radius:999px;padding:4px 8px}
`;
  let cssDone = false;
  function css() { if (cssDone) return; cssDone = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }

  root.MontageSim = { MontageSim: MontageSim, groupsOf: groupsOf, css: css };
})(typeof window !== 'undefined' ? window : globalThis);
