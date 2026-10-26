/* Simulateur Arduino (Nano, Uno, ESP32) : carte virtuelle, composants détectés à partir des blocs, moniteur série. */
(function (root) {
  'use strict';
  const { SimGen, SimRunner, Sound, el, holdable, injectCss } = root.SimCore;
  const F = SimGen.forBlock, val = SimGen.val, fld = SimGen.fld, line = SimGen.line, ATOM = SimGen.ATOM;

  /* ----- Blocs Arduino -> JavaScript simulé ----- */
  F.pin_mode = (b) => line('sim.hw.pinMode(' + fld(b, 'PIN') + ', ' + fld(b, 'MODE') + ')');
  F.digital_write = (b) => line('sim.hw.digitalWrite(' + fld(b, 'PIN') + ', ' + (b.getFieldValue('LEVEL') === 'HIGH' ? 1 : 0) + ')');
  F.digital_read = (b) => ['sim.hw.digitalRead(' + fld(b, 'PIN') + ')', ATOM];
  F.analog_write = (b, g) => line('sim.hw.analogWrite(' + fld(b, 'PIN') + ', ' + val(g, b, 'VALUE', '0') + ')');
  F.analog_read = (b) => ['sim.hw.analogRead(' + fld(b, 'PIN') + ')', ATOM];
  F.wait_time = (b, g) => line('await sim.sleep(sim.num(' + val(g, b, 'DURATION', '0') + ') * ' + Number(b.getFieldValue('UNIT')) + ')');
  F.millis_now = () => ['sim.millis()', ATOM];
  F.ultrasonic_cm = (b) => ['sim.hw.distance(' + fld(b, 'TRIG') + ', ' + fld(b, 'ECHO') + ')', ATOM];
  F.servo_write = (b, g) => line('sim.hw.servo(' + fld(b, 'PIN') + ', ' + val(g, b, 'ANGLE', '90') + ')');
  F.buzzer_tone = (b, g) => line('await sim.hw.tone(' + fld(b, 'PIN') + ', ' + val(g, b, 'FREQ', '440') + ', ' + val(g, b, 'DURATION', '500') + ')');
  F.serial_print = (b, g) => line('sim.hw.print(sim.str(' + val(g, b, 'TEXT', '""') + '), ' + (b.getFieldValue('NL') === 'ln') + ')');

  /* Les variables des blocs sont des entiers « long » côté Arduino. */
  const store = (v) => (typeof v === 'number' ? Math.trunc(v) : typeof v === 'boolean' ? (v ? 1 : 0) : v);
  const str = (v) => (typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : String(v));

  const LED_COLORS = ['#ff3b3b', '#2ecc40', '#ffcc00', '#3d7bff', '#ff8c1a', '#c84bc8', '#12b5a8'];
  const BOARD_LOOK = {
    nano: { body: '#1f6fb8', edge: '#14528a', w: 230 },
    uno: { body: '#1a7fa8', edge: '#11607f', w: 250 },
    esp32: { body: '#262a33', edge: '#111318', w: 230 },
  };

  /* ----- Repère les composants à afficher d'après les blocs utilisés ----- */
  function scan(ws, board) {
    const out = { leds: [], buttons: [], pots: [], dist: [], servos: [], buzzers: [], serial: false, robot: false,
      groups: root.MontageSim ? root.MontageSim.groupsOf(ws) : new Set() };
    const add = (list, key, obj) => { if (!list.some((x) => x.key === key)) list.push(Object.assign({ key: key }, obj)); };
    for (const b of ws.getAllBlocks(true)) {
      if (!b.isEnabled()) continue;
      const p = b.getField('PIN') ? String(b.getFieldValue('PIN')) : null;
      switch (b.type) {
        case 'pin_mode':
          if (b.getFieldValue('MODE') === 'OUTPUT') { if (p !== board.led) add(out.leds, p, { pin: p }); }
          else add(out.buttons, p, { pin: p });
          break;
        case 'digital_write': case 'analog_write': if (p !== board.led) add(out.leds, p, { pin: p }); break;
        case 'digital_read': add(out.buttons, p, { pin: p }); break;
        case 'analog_read': add(out.pots, p, { pin: p }); break;
        case 'ultrasonic_cm': { const t = b.getFieldValue('TRIG'), e = b.getFieldValue('ECHO'); add(out.dist, t + '/' + e, { trig: t, echo: e }); break; }
        case 'servo_write': add(out.servos, p, { pin: p }); break;
        case 'buzzer_tone': add(out.buzzers, p, { pin: p }); break;
        case 'serial_print': out.serial = true; break;
        default: if (b.type.indexOf('robot_') === 0 && b.type.indexOf('robot_radio') !== 0) out.robot = true;
      }
    }
    if (root.GuideMode && root.GuideMode.active && root.GuideMode.course && root.GuideMode.course.robot) out.robot = true;   // parcours guidé du robot : la piste est toujours affichée
    // une broche ne peut pas être à la fois une LED et un bouton : la lecture l'emporte (entrée)
    out.leds = out.leds.filter((l) => !out.buttons.some((x) => x.pin === l.pin) && !out.servos.some((x) => x.pin === l.pin) && !out.buzzers.some((x) => x.pin === l.pin));
    return out;
  }

  /* ----- Carte virtuelle ----- */
  class ArduinoSimBoard {
    constructor(container) {
      this.c = container;
      this.board = null;
      this.parts = null;
      this.pins = {};          // pin -> { mode, v (0/1), pwm (0-255 ou null) }
      this.pressed = {};       // boutons appuyés
      this.pots = {};          // valeurs des potentiomètres
      this.dist = {};          // distances (cm)
      this.angles = {};        // servos
      this.ui = {};
      this.serialLines = [''];
      this.m = root.MontageSim ? new root.MontageSim.MontageSim(this) : null;
    }
    pin(p) { return this.pins[p] || (this.pins[p] = { mode: null, v: 0, pwm: null }); }
    reset() {
      if (this.robot) this.robot.reset();
      if (this.m) this.m.reset();
      this.gen = (this.gen || 0) + 1;
      this.pins = {};
      this.serialLines = [''];
      this.paintAll();
      this.paintSerial();
    }
    /* --- API utilisée par le programme simulé --- */
    pinMode(p, m) { this.pin(p).mode = m; this.paintPin(p); }
    digitalWrite(p, v) { const s = this.pin(p); s.v = v ? 1 : 0; s.pwm = null; this.paintPin(p); }
    analogWrite(p, v) { const s = this.pin(p); v = Math.max(0, Math.min(255, Math.round(Number(v) || 0))); s.pwm = v; s.v = v > 0 ? 1 : 0; this.paintPin(p); }
    digitalRead(p) {
      const s = this.pin(p);
      const down = !!this.pressed[p];
      if (s.mode === 'INPUT_PULLUP') return down ? 0 : 1;    // bouton relié à GND
      if (s.mode === 'OUTPUT') return s.v;
      return down ? 1 : 0;                                    // bouton relié au + avec résistance de rappel
    }
    analogRead(p) { return this.pots[p] != null ? this.pots[p] : 512; }
    distance(t, e) { const d = this.dist[t + '/' + e]; return d != null ? d : 50; }
    servo(p, a) {
      a = Math.max(0, Math.min(180, Math.round(Number(a) || 0)));
      this.angles[p] = a;
      const u = this.ui['servo' + p];
      if (u) { u.arm.setAttribute('transform', 'rotate(' + (a - 90) + ' 50 52)'); u.txt.textContent = a + '°'; }
    }
    async tone(p, f, d) {
      f = Number(f) || 0; d = Math.max(0, Number(d) || 0);
      const gen = this.gen;
      const u = this.ui['buzz' + p];
      if (u) { u.card.classList.add('playing'); u.txt.textContent = Math.round(f) + ' Hz'; }
      Sound.tone(f);
      try { await this.sim.sleep(d); } finally {
        if (gen === this.gen) Sound.off();   // ne coupe pas le son d'un programme relancé entre-temps
        if (u) { u.card.classList.remove('playing'); u.txt.textContent = 'silence'; }
      }
    }
    print(text, nl) {
      const L = this.serialLines;
      const parts = String(text).split('\n');
      L[L.length - 1] += parts[0];
      for (let i = 1; i < parts.length; i++) L.push(parts[i]);
      if (nl) L.push('');
      if (L.length > 300) L.splice(0, L.length - 300);
      this.paintSerial();
    }
    /* --- Dessin --- */
    paintPin(p) {
      const s = this.pins[p] || { v: 0, pwm: null };
      const level = s.pwm != null ? s.pwm / 255 : s.v;
      if (this.board && p === this.board.led && this.ui.boardLed) {
        this.ui.boardLed.style.opacity = String(0.15 + 0.85 * level);
        this.ui.boardGlow.style.opacity = String(level * 0.9);
      }
      const u = this.ui['led' + p];
      if (u) {
        u.bulb.style.opacity = String(0.22 + 0.78 * level);
        u.glow.style.opacity = String(level * 0.85);
        u.txt.textContent = s.pwm != null ? 'PWM ' + s.pwm : s.v ? 'allumée' : 'éteinte';
      }
    }
    paintAll() {
      if (!this.board) return;
      this.paintPin(this.board.led);
      if (this.parts) for (const l of this.parts.leds) this.paintPin(l.pin);
      if (this.ui.power) this.ui.power.style.opacity = this.on ? '1' : '.2';
    }
    paintSerial() {
      if (!this.ui.serial) return;
      const box = this.ui.serial;
      const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 8;
      box.textContent = this.serialLines.join('\n');
      if (atEnd) box.scrollTop = box.scrollHeight;
    }
    setRunning(on) { this.on = on; if (!on && this.robot) this.robot.motors(0, 0); if (this.ui.power) this.ui.power.style.opacity = on ? '1' : '.2'; }

    /* Construit l'affichage (appelé à chaque changement de blocs ou de carte). */
    build(board, parts) {
      this.board = board;
      this.parts = parts;
      this.ui = {};
      const c = this.c;
      c.innerHTML = '';
      const look = BOARD_LOOK[board.id] || BOARD_LOOK.nano;
      const svgNS = 'http://www.w3.org/2000/svg';
      const W = look.w;
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + (W + 20) + ' 96');
      svg.setAttribute('class', 'boardsvg');
      svg.innerHTML =
        '<rect x="20" y="8" width="' + W + '" height="80" rx="10" fill="' + look.body + '" stroke="' + look.edge + '" stroke-width="3"/>'
        + '<rect x="2" y="32" width="30" height="32" rx="4" fill="#c9d1d9" stroke="#8a96a3" stroke-width="2"/>'
        + (board.id === 'esp32'
          ? '<rect x="' + (W - 70) + '" y="22" width="78" height="52" rx="4" fill="#b8bec7" stroke="#7d858f" stroke-width="2"/><text x="' + (W - 31) + '" y="52" text-anchor="middle" font-size="9" font-weight="600" fill="#3a3f47">ESP32</text>'
          : '<rect x="' + (W / 2 - 10) + '" y="30" width="56" height="36" rx="3" fill="#1b1f24"/><text x="' + (W / 2 + 18) + '" y="52" text-anchor="middle" font-size="8" fill="#cbd5e1">ATmega328</text>')
        + '<g><rect x="30" y="12" width="' + (W - 30) + '" height="5" rx="2" fill="#f5c542" opacity=".85"/><rect x="30" y="79" width="' + (W - 30) + '" height="5" rx="2" fill="#f5c542" opacity=".85"/></g>'
        + '<text x="' + (W / 2 - 46) + '" y="38" font-size="12" font-weight="600" fill="#fff">' + board.short + '</text>'
        + '<circle class="pwr" cx="56" cy="58" r="4.5" fill="#39e75f"/><text x="50" y="74" font-size="7" fill="#e5edf5">ON</text>'
        + '<circle class="glow" cx="76" cy="58" r="11" fill="#ffb020" opacity="0"/>'
        + '<circle class="bled" cx="76" cy="58" r="4.5" fill="#ffb020" opacity=".15"/><text x="73.5" y="74" font-size="7" fill="#e5edf5">L</text>'
        + '';
      this.ui.power = svg.querySelector('.pwr');
      this.ui.boardLed = svg.querySelector('.bled');
      this.ui.boardGlow = svg.querySelector('.glow');
      // avec le robot, la piste est l'essentiel : le dessin de la carte devient une simple ligne
      if (parts.robot) c.appendChild(el('div', { class: 'boardbox' }, [el('small', { text: board.name + ' · LED « L » sur ' + board.label(board.led).replace(' (LED)', '') })]));
      else c.appendChild(el('div', { class: 'boardbox' }, [svg, el('small', { text: board.name + ' · LED « L » sur ' + board.label(board.led).replace(' (LED)', '') })]));

      /* Robot Cagett'bot : piste vue de dessus */
      if (parts.robot && root.RobotSim) {
        root.RobotSim.css();
        if (!this.robot) this.robot = new root.RobotSim.RobotSim(this);
        this.robot.build(c);
      } else if (this.robot) this.robot.canvas = null;
      /* Montages de la classe (télécommande, pistolet, cibles, radio) */
      if (parts.groups.size && root.MontageSim) {
        root.MontageSim.css();
        if (!this.m) this.m = new root.MontageSim.MontageSim(this);
        this.m.build(c, parts.groups);
      } else if (this.m) this.m.ui = null;
      const grid = el('div', { class: 'simgrid' });
      const label = (p) => board.label(String(p)).replace(' (LED)', '');
      parts.leds.forEach((l, i) => {
        const col = LED_COLORS[i % LED_COLORS.length];
        const s = document.createElementNS(svgNS, 'svg');
        s.setAttribute('viewBox', '0 0 40 48'); s.setAttribute('width', '40'); s.setAttribute('height', '48');
        s.innerHTML = '<circle class="g" cx="20" cy="18" r="17" fill="' + col + '" opacity="0"/>'
          + '<path class="b" d="M9 30V18a11 11 0 0 1 22 0v12z" fill="' + col + '" opacity=".22" stroke="' + col + '" stroke-width="1.5"/>'
          + '<rect x="7" y="29" width="26" height="4" rx="1.5" fill="#9aa5b1"/><path d="M15 33v13M25 33v9" stroke="#9aa5b1" stroke-width="2"/>';
        const txt = el('small', { text: 'éteinte' });
        grid.appendChild(el('div', { class: 'simcard' }, [s, el('b', { text: 'LED · ' + label(l.pin) }), txt]));
        this.ui['led' + l.pin] = { bulb: s.querySelector('.b'), glow: s.querySelector('.g'), txt: txt };
      });
      parts.buttons.forEach((bt) => {
        const knob = holdable(el('div', { class: 'pushbtn press', 'aria-label': 'Bouton sur ' + label(bt.pin) }), (down) => {
          this.pressed[bt.pin] = down;
          txt.textContent = down ? 'appuyé' : 'relâché';
        });
        const txt = el('small', { text: this.pressed[bt.pin] ? 'appuyé' : 'relâché' });
        grid.appendChild(el('div', { class: 'simcard' }, [knob, el('b', { text: 'Bouton · ' + label(bt.pin) }), txt]));
      });
      parts.pots.forEach((pt) => {
        if (this.pots[pt.pin] == null) this.pots[pt.pin] = 512;
        const out = el('small', { text: String(this.pots[pt.pin]) });
        const r = el('input', { type: 'range', min: '0', max: '1023', value: String(this.pots[pt.pin]), 'aria-label': 'Potentiomètre ' + label(pt.pin) });
        r.addEventListener('input', () => { this.pots[pt.pin] = Number(r.value); out.textContent = r.value; });
        grid.appendChild(el('div', { class: 'simcard' }, [el('div', { class: 'knobico', html: '&#9881;' }), el('b', { text: 'Potentiomètre · ' + label(pt.pin) }), r, out]));
      });
      parts.dist.forEach((d) => {
        if (this.dist[d.key] == null) this.dist[d.key] = 50;
        const out = el('small', { text: this.dist[d.key] + ' cm' });
        const r = el('input', { type: 'range', min: '0', max: '400', value: String(this.dist[d.key]), 'aria-label': 'Distance mesurée' });
        r.addEventListener('input', () => { this.dist[d.key] = Number(r.value); out.textContent = r.value + ' cm'; });
        grid.appendChild(el('div', { class: 'simcard wide' }, [el('b', { text: 'Capteur de distance · ' + label(d.trig) + ' / ' + label(d.echo) }), el('small', { text: 'Fais glisser pour approcher un obstacle' }), r, out]));
      });
      parts.servos.forEach((sv) => {
        const s = document.createElementNS(svgNS, 'svg');
        s.setAttribute('viewBox', '0 0 100 64'); s.setAttribute('width', '84'); s.setAttribute('height', '54');
        s.innerHTML = '<path d="M14 52a36 36 0 0 1 72 0" fill="none" stroke="#dfe5f2" stroke-width="2" stroke-dasharray="3 4"/>'
          + '<rect x="30" y="46" width="40" height="16" rx="4" fill="#3D7BFF"/>'
          + '<g class="arm" transform="rotate(0 50 52)"><rect x="46" y="16" width="8" height="38" rx="4" fill="#fff" stroke="#2b2d42" stroke-width="2"/></g>'
          + '<circle cx="50" cy="52" r="5" fill="#FFC933" stroke="#2b2d42" stroke-width="2"/>';
        const txt = el('small', { text: (this.angles[sv.pin] != null ? this.angles[sv.pin] : 90) + '°' });
        grid.appendChild(el('div', { class: 'simcard' }, [s, el('b', { text: 'Servo · ' + label(sv.pin) }), txt]));
        this.ui['servo' + sv.pin] = { arm: s.querySelector('.arm'), txt: txt };
        if (this.angles[sv.pin] != null) this.servo(sv.pin, this.angles[sv.pin]);
      });
      parts.buzzers.forEach((bz) => {
        const card = el('div', { class: 'simcard buzz' });
        const txt = el('small', { text: 'silence' });
        card.appendChild(el('div', { class: 'buzzico', html: '&#9835;' }));
        card.appendChild(el('b', { text: 'Buzzer · ' + label(bz.pin) }));
        card.appendChild(txt);
        grid.appendChild(card);
        this.ui['buzz' + bz.pin] = { card: card, txt: txt };
      });
      if (grid.children.length) c.appendChild(grid);
      else if (!parts.robot && !parts.groups.size) c.appendChild(el('div', { class: 'simhint', text: 'Les composants (LED, boutons, potentiomètres, capteur de distance, servo, buzzer) apparaissent ici dès que tu utilises leurs blocs.' }));

      const clear = el('button', { type: 'button', text: 'Effacer', onclick: () => { this.serialLines = ['']; this.paintSerial(); } });
      c.appendChild(el('div', { class: 'serialhead' }, [el('span', { text: 'Moniteur série' + (parts.serial ? '' : ' (bloc « écrire dans le moniteur série »)') }), clear]));
      this.ui.serial = el('div', { class: 'serial', 'aria-live': 'polite' });
      c.appendChild(this.ui.serial);
      this.paintAll();
      this.paintSerial();
    }
  }

  const CSS = `
.boardbox{display:flex;flex-direction:column;align-items:center;gap:2px}
.boardbox small{color:var(--muted);font-size:12px}
.boardsvg{width:100%;max-width:250px;height:auto}
.simcard.wide{grid-column:1/-1}
.pushbtn{width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ff7b7b,#d62d2d);border:5px solid #2b2d42;box-shadow:0 4px 0 #1a1b26;transition:transform .05s}
.pushbtn.down{transform:translateY(3px);box-shadow:0 1px 0 #1a1b26;background:radial-gradient(circle at 40% 35%,#ff5151,#a91d1d)}
.knobico,.buzzico{font-size:28px;line-height:44px;height:44px;color:#3D7BFF}
.buzz.playing .buzzico{color:#F4631E;animation:hop .3s infinite}
`;

  /* ----- Contrôleur : barre de commandes + carte ----- */
  function mount(o) {
    injectCss();
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const box = o.container;
    const hw = new ArduinoSimBoard(el('div', { class: 'simboard' }));
    hw.speedFactor = () => runner.speed;
    const runner = new SimRunner({
      intDiv: 'trunc', store: store, str: str,
      onError: (e) => { o.log('Simulation arrêtée : ' + (e && e.message ? e.message : e), 'err'); },
      onStateChange: (on) => {
        hw.setRunning(on);
        startBtn.hidden = on; stopBtn.hidden = !on;
        state.textContent = on ? 'En marche' : 'Arrêtée';
        state.classList.toggle('on', on);
        if (!on) Sound.off();
        if (o.onState) o.onState(on);
      },
    });
    const ICON_PLAY = '<svg viewBox="0 0 16 16"><path d="M4 2.500v11l9-5.500z" fill="#fff"/></svg>';
    const ICON_STOP = '<svg viewBox="0 0 16 16"><rect x="3.500" y="3.500" width="9" height="9" rx="1.500" fill="#fff"/></svg>';
    const startBtn = el('button', { type: 'button', class: 'simbtn', html: ICON_PLAY + 'Démarrer', onclick: () => start() });
    const stopBtn = el('button', { type: 'button', class: 'simbtn stop', html: ICON_STOP + 'Arrêter', onclick: () => runner.stop() });
    stopBtn.hidden = true;
    const restartBtn = el('button', { type: 'button', class: 'simbtn light', text: 'Recommencer', title: 'Redémarre la carte virtuelle (comme le bouton RESET)', onclick: () => start() });
    const speed = el('select', { 'aria-label': 'Vitesse de la simulation' }, [
      el('option', { value: '1', text: 'vitesse ×1' }), el('option', { value: '2', text: 'vitesse ×2' }), el('option', { value: '5', text: 'vitesse ×5' })]);
    speed.addEventListener('change', () => runner.setSpeed(Number(speed.value)));
    const sound = el('select', { 'aria-label': 'Son du buzzer' }, [el('option', { value: 'on', text: 'son activé' }), el('option', { value: 'off', text: 'son coupé' })]);
    sound.addEventListener('change', () => { Sound.muted = sound.value === 'off'; if (Sound.muted) Sound.off(); });
    const state = el('span', { class: 'simstate', text: 'Arrêtée' });
    box.appendChild(el('div', { class: 'simbar' }, [startBtn, stopBtn, restartBtn, speed, sound, state]));
    box.appendChild(hw.c);

    function refresh() {
      const board = root.ArduinoBlocks.board();
      hw.build(board, scan(o.getWorkspace(), board));
    }
    function start() {
      Sound.ensure();
      refresh();
      let src;
      try { src = SimGen.generate(o.getWorkspace()); } catch (e) { o.log('Simulation impossible : ' + e.message, 'err'); return; }
      runner.start(src, hw);
    }
    refresh();
    const setSpeed = (v) => { speed.value = String(v); runner.setSpeed(Number(v)); };
    return { start: start, stop: () => runner.stop(), refresh: refresh, setSpeed: setSpeed, get speed() { return runner.speed; }, get running() { return runner.running; }, hw: hw, runner: runner };
  }

  root.ArduinoSim = { mount: mount, scan: scan };
})(typeof window !== 'undefined' ? window : globalThis);
