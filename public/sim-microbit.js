/* Simulateur micro:bit (V1 et V2) : écran 5x5, boutons A et B, logo tactile, capteurs, broches, son, console série. */
(function (root) {
  'use strict';
  const { SimGen, SimRunner, Sound, el, holdable, injectCss } = root.SimCore;
  const F = SimGen.forBlock, val = SimGen.val, fld = SimGen.fld, line = SimGen.line, ATOM = SimGen.ATOM;
  const DATA = root.MicrobitSimData;

  /* ----- Blocs micro:bit -> JavaScript simulé ----- */
  F.mb_scroll = (b, g) => line('await sim.hw.scroll(sim.str(' + val(g, b, 'TEXT', '""') + '))');
  F.mb_show = (b, g) => line('await sim.hw.show(sim.str(' + val(g, b, 'TEXT', '""') + '))');
  F.mb_show_image = (b) => line('sim.hw.showBits(sim.hw.image(' + fld(b, 'IMAGE') + '))');
  F.mb_show_leds = (b) => line('sim.hw.showBits(' + JSON.stringify(String(b.getFieldValue('LEDS') || '0'.repeat(25))) + ')');
  F.mb_led = (b, g) => line('sim.hw.setPixel(' + val(g, b, 'X', '0') + ', ' + val(g, b, 'Y', '0') + ', ' + val(g, b, 'LEVEL', '9') + ')');
  F.mb_led_off = (b, g) => line('sim.hw.setPixel(' + val(g, b, 'X', '0') + ', ' + val(g, b, 'Y', '0') + ', 0)');
  F.mb_clear = () => line('sim.hw.clear()');
  F.mb_button = (b) => ['sim.hw.isPressed(' + fld(b, 'BTN') + ')', ATOM];
  F.mb_was_pressed = (b) => ['sim.hw.wasPressed(' + fld(b, 'BTN') + ')', ATOM];
  F.mb_gesture = (b) => ['sim.hw.isGesture(' + fld(b, 'G') + ')', ATOM];
  F.mb_accel = (b) => ['sim.hw.accel(' + fld(b, 'AXIS') + ')', ATOM];
  F.mb_compass = () => ['sim.hw.sensor("compass")', ATOM];
  F.mb_temperature = () => ['sim.hw.sensor("temperature")', ATOM];
  F.mb_light = () => ['sim.hw.sensor("light")', ATOM];
  F.mb_sound = () => ['sim.hw.soundLevel()', ATOM];
  F.mb_touch = (b) => ['sim.hw.pinTouched(' + fld(b, 'PIN') + ')', ATOM];
  F.mb_logo = () => ['sim.hw.logoTouched()', ATOM];
  F.mb_pin_write = (b) => line('sim.hw.pinWrite(' + fld(b, 'PIN') + ', ' + Number(b.getFieldValue('LEVEL')) + ')');
  F.mb_pin_read = (b) => ['sim.hw.pinRead(' + fld(b, 'PIN') + ')', ATOM];
  F.mb_pin_write_analog = (b, g) => line('sim.hw.pinWriteAnalog(' + fld(b, 'PIN') + ', ' + val(g, b, 'VALUE', '0') + ')');
  F.mb_pin_read_analog = (b) => ['sim.hw.pinReadAnalog(' + fld(b, 'PIN') + ')', ATOM];
  F.mb_print = (b, g) => line('sim.hw.print(sim.str(' + val(g, b, 'TEXT', '""') + '))');
  F.mb_note = (b, g) => line('await sim.hw.pitch(' + Number(b.getFieldValue('NOTE')) + ', ' + val(g, b, 'DURATION', '500') + ')');
  F.mb_pitch = (b, g) => line('await sim.hw.pitch(' + val(g, b, 'FREQ', '440') + ', ' + val(g, b, 'DURATION', '500') + ')');
  F.mb_melody = (b) => line('await sim.hw.play(' + fld(b, 'TUNE') + ')');
  F.mb_music_stop = () => line('sim.hw.musicStop()');
  F.mb_wait = (b, g) => line('await sim.sleep(sim.num(' + val(g, b, 'DURATION', '0') + ') * ' + Number(b.getFieldValue('UNIT')) + ')');
  F.mb_running_time = () => ['sim.millis()', ATOM];

  /* Python : True/False, et les nombres entiers restent entiers. */
  const str = (v) => (v === true ? 'True' : v === false ? 'False' : String(v));
  function asciiText(s) {
    const map = { 'œ': 'oe', 'Œ': 'OE', 'æ': 'ae', 'Æ': 'AE', '«': '"', '»': '"', '“': '"', '”': '"', '’': '\'', '‘': '\'', '–': '-', '—': '-', '…': '...', 'ç': 'c', 'Ç': 'C', '€': 'EUR' };
    return String(s).replace(/[œŒæÆ«»“”’‘–—…çÇ€]/g, (c) => map[c]).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '?');
  }
  const glyph = (ch) => {
    let c = ch.charCodeAt(0);
    if (c < 32 || c > 126) c = 63;
    return DATA.font.slice((c - 32) * 5, (c - 32) * 5 + 5);
  };
  const px = (data, x, y) => (data[y] >> (4 - x)) & 1;
  const colBlank = (data, x) => { for (let y = 0; y < 5; y++) if (px(data, x, y)) return 0; return 1; };
  const rightmost = (data) => (!colBlank(data, 4) ? 4 : !colBlank(data, 3) ? 3 : 2);

  /* Fréquence d'une note MicroPython (« c4:4 », « eb », « r »…). */
  const SEMI = { c: -9, d: -7, e: -5, f: -4, g: -2, a: 0, b: 2 };

  const POSITIONS = [
    ['à plat, écran vers le haut', 'face up', [0, 0, -1024]], ['à plat, écran vers le bas', 'face down', [0, 0, 1024]],
    ['inclinée à gauche', 'left', [-1024, 0, 0]], ['inclinée à droite', 'right', [1024, 0, 0]],
    ['debout, logo en haut', 'up', [0, -1024, 0]], ['debout, logo en bas', 'down', [0, 1024, 0]], ['en chute libre', 'freefall', [0, 0, 0]],
  ];

  function scan(ws) {
    const used = new Set(), pins = { read: new Set(), analog: new Set(), write: new Set(), touch: new Set() };
    for (const b of ws.getAllBlocks(false)) {
      if (!b.isEnabled()) continue;
      used.add(b.type);
      const p = b.getField('PIN') ? String(b.getFieldValue('PIN')) : null;
      if (b.type === 'mb_pin_read') pins.read.add(p);
      if (b.type === 'mb_pin_read_analog') pins.analog.add(p);
      if (b.type === 'mb_pin_write' || b.type === 'mb_pin_write_analog') pins.write.add(p);
      if (b.type === 'mb_touch') pins.touch.add(p);
    }
    return { used: used, pins: pins };
  }

  class MicrobitSimBoard {
    constructor() {
      this.c = el('div', { class: 'simboard' });
      this.leds = new Array(25).fill(0);
      this.btn = { a: false, b: false };
      this.presses = { a: 0, b: 0 };
      this.touch = {};
      this.logo = false;
      this.position = 'face up';
      this.shakeUntil = 0;
      this.values = { temperature: 21, light: 120, compass: 0, sound: 40 };
      this.analog = {};
      this.out = {};
      this.serialLines = [''];
      this.music = { octave: 4, duration: 4, stopped: 0 };
      this.version = 'V2';
    }
    reset() {
      this.leds.fill(0);
      this.presses = { a: 0, b: 0 };
      this.out = {};
      this.music = { octave: 4, duration: 4, stopped: this.music.stopped + 1 };
      this.serialLines = [''];
      this.paintLeds(); this.paintOut(); this.paintSerial();
    }
    err(type, msg) { const e = new Error(type + ' : ' + msg); e.pyType = type; throw e; }
    /* --- écran --- */
    image(name) { return DATA.images[name] || '0'.repeat(25); }
    showBits(bits) { for (let i = 0; i < 25; i++) this.leds[i] = bits[i] === '1' || bits[i] === '9' ? 9 : 0; this.paintLeds(); }
    setChar(ch) { const d = glyph(ch); for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) this.leds[y * 5 + x] = px(d, x, y) * 9; this.paintLeds(); }
    async show(text) {
      text = asciiText(text);
      if (text.length === 0) return;
      if (text.length === 1) { this.setChar(text); return; }
      for (const ch of text) { this.setChar(ch); await this.sim.sleep(400); }
    }
    async scroll(text) {
      /* même algorithme que MicroPython : une colonne toutes les 150 ms, espacement proportionnel */
      text = asciiText(text);
      const img = new Array(25).fill(0);
      let i = 0, offset = 0, right = text.length ? text[0] : ' ';
      let limit = text.length ? rightmost(glyph(right)) + 1 : 5;
      for (;;) {
        if (i === text.length && offset === 5) break;
        for (let y = 0; y < 5; y++) { for (let x = 0; x < 4; x++) img[y * 5 + x] = img[y * 5 + x + 1]; img[y * 5 + 4] = 0; }
        if (offset < limit) {
          const d = glyph(right);
          for (let y = 0; y < 5; y++) img[y * 5 + 4] = px(d, offset, y) * 9;
        } else if (offset === limit) {
          i++;
          if (i >= text.length) { i = text.length; right = ' '; limit = 5; offset = 0; }
          else { right = text[i]; const d = glyph(right); offset = -(1 - colBlank(d, 0)); limit = rightmost(d) + 1; }
        }
        offset++;
        for (let k = 0; k < 25; k++) this.leds[k] = img[k];
        this.paintLeds();
        await this.sim.sleep(150);
      }
    }
    setPixel(x, y, b) {
      x = Number(x); y = Number(y); b = Number(b);
      if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 4 || y < 0 || y > 4) this.err('ValueError', 'index out of bounds (x et y doivent aller de 0 à 4)');
      if (!Number.isInteger(b) || b < 0 || b > 9) this.err('ValueError', 'brightness out of bounds (luminosité de 0 à 9)');
      this.leds[y * 5 + x] = b; this.paintLeds();
    }
    clear() { this.leds.fill(0); this.paintLeds(); }
    /* --- entrées --- */
    isPressed(k) { return k === 'ab' ? this.btn.a && this.btn.b : !!this.btn[k]; }
    wasPressed(k) { const n = this.presses[k] > 0; this.presses[k] = 0; return n; }
    gesture() { return performance.now() < this.shakeUntil ? 'shake' : this.position; }
    isGesture(g) { return this.gesture() === g; }
    accel(axis) {
      if (performance.now() < this.shakeUntil) return Math.round((Math.random() * 2 - 1) * 2000);
      const p = POSITIONS.find((q) => q[1] === this.position) || POSITIONS[0];
      return p[2]['xyz'.indexOf(axis)] + Math.round(Math.random() * 16 - 8);
    }
    sensor(name) { return this.values[name]; }
    soundLevel() { return this.version === 'V2' ? this.values.sound : 0; }
    logoTouched() { return this.version === 'V2' && this.logo; }
    pinTouched(p) { return !!this.touch[p]; }
    pinRead(p) { return this.touch[p] ? 1 : this.out[p] != null ? (this.out[p] > 0 ? 1 : 0) : 0; }
    pinReadAnalog(p) { return this.analog[p] != null ? this.analog[p] : 0; }
    pinWrite(p, v) { this.out[p] = v ? 1023 : 0; this.paintOut(); }
    pinWriteAnalog(p, v) {
      v = Math.round(Number(v) || 0);
      if (v < 0 || v > 1023) this.err('ValueError', 'value must be between 0 and 1023');
      this.out[p] = v; this.paintOut();
    }
    print(t) {
      const L = this.serialLines;
      const parts = String(t).split('\n');
      L[L.length - 1] += parts[0];
      for (let i = 1; i < parts.length; i++) L.push(parts[i]);
      L.push('');
      if (L.length > 300) L.splice(0, L.length - 300);
      this.paintSerial();
    }
    /* --- son --- */
    async pitch(f, ms) {
      f = Number(f) || 0; ms = Math.max(0, Number(ms) || 0);
      const token = this.music.stopped;
      this.speaker(true); Sound.tone(f);
      try {
        const end = this.sim.millis() + ms;
        while (this.sim.millis() < end && token === this.music.stopped) await this.sim.sleep(Math.min(40, end - this.sim.millis()));
      } finally { if (token === this.music.stopped) { Sound.off(); this.speaker(false); } }   // un programme relancé entre-temps garde son son
    }
    async play(name) {
      const notes = DATA.tunes[name] || [];
      const token = this.music.stopped;
      const tick = 60000 / 120 / 4;   // 120 battements par minute, 4 « ticks » par battement
      this.speaker(true);
      try {
        for (const n of notes) {
          if (token !== this.music.stopped) break;
          const m = /^([a-gA-GrR])(#|b)?(\d)?(?::(\d{1,2}))?$/.exec(n);
          if (!m) continue;
          if (m[3]) this.music.octave = Number(m[3]);
          if (m[4]) this.music.duration = Number(m[4]);
          const ms = this.music.duration * tick;
          const letter = m[1].toLowerCase();
          if (letter === 'r') { Sound.off(); await this.sim.sleep(ms); continue; }
          const semi = SEMI[letter] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (this.music.octave - 4);
          Sound.tone(440 * Math.pow(2, semi / 12));
          await this.sim.sleep(Math.max(0, ms - 10));
          Sound.off();
          await this.sim.sleep(10);
        }
      } finally { if (token === this.music.stopped) { Sound.off(); this.speaker(false); } }   // un programme relancé entre-temps garde son son
    }
    musicStop() { this.music.stopped++; Sound.off(); this.speaker(false); }

    /* --- dessin --- */
    paintLeds() {
      if (!this.ui) return;
      this.ui.leds.forEach((r, i) => {
        const b = this.leds[i];
        r.style.fill = b ? '#ff2b3d' : '#3a2a30';
        r.style.opacity = b ? String(0.3 + 0.7 * b / 9) : '1';
        r.style.filter = b > 5 ? 'drop-shadow(0 0 3px #ff4d5e)' : 'none';
      });
    }
    paintOut() {
      if (!this.ui) return;
      for (const p of ['0', '1', '2']) {
        const d = this.ui.outs[p];
        if (!d) continue;
        const v = this.out[p] || 0;
        d.style.opacity = String(v ? 0.35 + 0.65 * v / 1023 : 0.12);
      }
    }
    paintSerial() {
      if (!this.ui || !this.ui.serial) return;
      const box = this.ui.serial;
      const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 8;
      box.textContent = this.serialLines.join('\n');
      if (atEnd) box.scrollTop = box.scrollHeight;
    }
    speaker(on) { if (this.ui && this.ui.spk) this.ui.spk.classList.toggle('on', on); }

    build(parts, version) {
      this.version = version;
      const c = this.c, u = parts.used;
      c.innerHTML = '';
      this.ui = { leds: [], outs: {} };
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 300 236');
      svg.setAttribute('class', 'mbsvg');
      let h = '<rect x="6" y="6" width="288" height="196" rx="24" fill="' + (version === 'V2' ? '#22232b' : '#2b2f38') + '" stroke="#0f1014" stroke-width="3"/>'
        + '<rect x="6" y="176" width="288" height="56" rx="6" fill="#22232b"/>';
      // connecteur : P0, P1, P2, 3V, GND
      const pads = [['0', 18, 52], ['1', 92, 52], ['2', 166, 52], ['3V', 238, 24], ['GND', 266, 26]];
      for (const [name, x, w] of pads) {
        h += '<g class="' + (name.length === 1 ? 'pad press" data-pin="' + name : 'padx') + '"><rect x="' + x + '" y="190" width="' + w + '" height="40" rx="5" fill="#d9a62e" stroke="#9c741b" stroke-width="1.500"/>'
          + (name.length === 1 ? '<circle cx="' + (x + w / 2) + '" cy="203" r="7" fill="#22232b"/>' : '')
          + '<text x="' + (x + w / 2) + '" y="' + (name.length === 1 ? 225 : 216) + '" text-anchor="middle" font-size="' + (name.length === 1 ? 11 : 8.5) + '" font-weight="600" fill="#3d2a00">' + (name.length === 1 ? 'P' + name : name) + '</text></g>';
      }
      for (const p of ['0', '1', '2']) {
        const x = pads.find((q) => q[0] === p)[1] + 26;
        h += '<circle class="out" data-pin="' + p + '" cx="' + x + '" cy="181" r="4" fill="#39e75f" opacity=".12"/>';
      }
      // logo (tactile sur V2)
      h += '<g class="logo' + (version === 'V2' ? ' press' : '') + '"><ellipse cx="150" cy="30" rx="20" ry="11" fill="none" stroke="' + (version === 'V2' ? '#d9a62e' : '#6b6f7a') + '" stroke-width="3.500"/>'
        + '<circle cx="141" cy="30" r="3.200" fill="' + (version === 'V2' ? '#d9a62e' : '#6b6f7a') + '"/><circle cx="159" cy="30" r="3.200" fill="' + (version === 'V2' ? '#d9a62e' : '#6b6f7a') + '"/></g>';
      // écran 5x5
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
        h += '<rect class="led" x="' + (99 + x * 22) + '" y="' + (52 + y * 22) + '" width="8" height="14" rx="2"/>';
      }
      // boutons A et B
      for (const [k, x] of [['a', 36], ['b', 264]]) {
        h += '<g class="mbbtn press" data-k="' + k + '"><rect x="' + (x - 21) + '" y="84" width="42" height="42" rx="7" fill="#c9ccd3" stroke="#8a8f99" stroke-width="2"/>'
          + '<circle cx="' + x + '" cy="105" r="13" fill="#20222a"/><text x="' + x + '" y="148" text-anchor="middle" font-size="15" font-weight="600" fill="#fff">' + k.toUpperCase() + '</text></g>';
      }
      h += '<g class="spk"><circle cx="250" cy="34" r="9" fill="#14151a" stroke="#555" stroke-width="1.500"/><path d="M246 30.500h3l4-3v13l-4-3h-3z" fill="#9aa"/></g>'
        + '<text x="24" y="38" font-size="12" font-weight="600" fill="#9aa3b5">micro:bit ' + version + '</text>';
      svg.innerHTML = h;
      this.ui.leds = [...svg.querySelectorAll('.led')];
      this.ui.spk = svg.querySelector('.spk');
      svg.querySelectorAll('.out').forEach((d) => { this.ui.outs[d.getAttribute('data-pin')] = d; });
      svg.querySelectorAll('.mbbtn').forEach((g) => {
        const k = g.getAttribute('data-k');
        holdable(g, (down) => { this.btn[k] = down; if (down) this.presses[k]++; });
        g.setAttribute('aria-label', 'Bouton ' + k.toUpperCase());
      });
      svg.querySelectorAll('.pad').forEach((g) => {
        const p = g.getAttribute('data-pin');
        holdable(g, (down) => { this.touch[p] = down; });
        g.setAttribute('aria-label', 'Toucher la broche P' + p);
      });
      const logo = svg.querySelector('.logo');
      if (version === 'V2') { holdable(logo, (down) => { this.logo = down; }); logo.setAttribute('aria-label', 'Toucher le logo'); }
      c.appendChild(el('div', { class: 'mbbox' }, [svg]));

      // A+B ensemble (impossible à la souris) + astuce
      const ab = holdable(el('span', { class: 'simbtn light press', text: 'A+B' }), (down) => {
        this.btn.a = this.btn.b = down;
        if (down) { this.presses.a++; this.presses.b++; }
      });
      c.appendChild(el('div', { class: 'simhint small' }, ['Clique sur A, B, le logo' + (version === 'V2' ? '' : ' (V2 seulement)') + ' ou les broches P0 à P2 (maintiens appuyé). ', ab]));

      const grid = el('div', { class: 'simgrid' });
      const slider = (title, key, min, max, unit, target) => {
        target = target || this.values;
        const out = el('small', { text: target[key] + unit });
        const r = el('input', { type: 'range', min: String(min), max: String(max), value: String(target[key]), 'aria-label': title });
        r.addEventListener('input', () => { target[key] = Number(r.value); out.textContent = r.value + unit; });
        grid.appendChild(el('div', { class: 'simcard' }, [el('b', { text: title }), r, out]));
      };
      if (u.has('mb_gesture') || u.has('mb_accel')) {
        const sel = el('select', { 'aria-label': 'Position de la carte' }, POSITIONS.map((p) => el('option', { value: p[1], text: p[0] })));
        sel.value = this.position;
        sel.addEventListener('change', () => { this.position = sel.value; });
        const shake = el('button', { type: 'button', class: 'simbtn light', text: 'Secouer', onclick: () => { this.shakeUntil = performance.now() + 1200; } });
        grid.appendChild(el('div', { class: 'simcard wide' }, [el('b', { text: 'Mouvement de la carte' }), el('div', { class: 'simbar' }, [sel, shake])]));
      }
      if (u.has('mb_temperature')) slider('Température', 'temperature', -10, 50, ' °C');
      if (u.has('mb_light')) slider('Lumière', 'light', 0, 255, '');
      if (u.has('mb_compass')) slider('Boussole (nord = 0)', 'compass', 0, 359, '°');
      if (u.has('mb_sound')) {
        if (version === 'V2') slider('Bruit (micro)', 'sound', 0, 255, '');
        else grid.appendChild(el('div', { class: 'simcard' }, [el('b', { text: 'Micro' }), el('small', { text: 'absent sur la V1 : niveau 0' })]));
      }
      for (const p of [...parts.pins.analog].sort()) {
        if (this.analog[p] == null) this.analog[p] = 0;
        slider('Broche P' + p + ' (analogique)', p, 0, 1023, '', this.analog);
      }
      if (grid.children.length) c.appendChild(grid);

      const clear = el('button', { type: 'button', text: 'Effacer', onclick: () => { this.serialLines = ['']; this.paintSerial(); } });
      c.appendChild(el('div', { class: 'serialhead' }, [el('span', { text: 'Console série' }), clear]));
      this.ui.serial = el('div', { class: 'serial', 'aria-live': 'polite' });
      c.appendChild(this.ui.serial);
      this.paintLeds(); this.paintOut(); this.paintSerial();
    }
  }

  const CSS = `
.mbbox{display:flex;justify-content:center}
.mbsvg{width:100%;max-width:330px;height:auto}
.mbsvg .press{cursor:pointer}
.mbsvg .mbbtn.down rect{fill:#a9adb6} .mbsvg .mbbtn.down circle{fill:#000}
.mbsvg .pad.down rect{fill:#ffd35c} .mbsvg .logo.down ellipse{stroke:#ffd35c}
.mbsvg .spk.on circle{stroke:#FFC933;stroke-width:3}
.simhint.small{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;padding:6px 10px}
.simcard.wide{grid-column:1/-1}
`;

  function mount(o) {
    injectCss();
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const hw = new MicrobitSimBoard();
    const runner = new SimRunner({
      intDiv: 'floor', str: str, zeroStep: 1,
      divZero: 'ZeroDivisionError : division par zéro',
      onError: (e) => { o.log('Simulation arrêtée : ' + (e && e.message ? e.message : e), 'err'); },
      onStateChange: (on) => {
        startBtn.hidden = on; stopBtn.hidden = !on;
        state.textContent = on ? 'En marche' : 'Arrêtée';
        state.classList.toggle('on', on);
        if (!on) { Sound.off(); hw.speaker(false); }
        if (o.onState) o.onState(on);
      },
    });
    const ICON_PLAY = '<svg viewBox="0 0 16 16"><path d="M4 2.500v11l9-5.500z" fill="#fff"/></svg>';
    const ICON_STOP = '<svg viewBox="0 0 16 16"><rect x="3.500" y="3.500" width="9" height="9" rx="1.500" fill="#fff"/></svg>';
    const startBtn = el('button', { type: 'button', class: 'simbtn', html: ICON_PLAY + 'Démarrer', onclick: () => start() });
    const stopBtn = el('button', { type: 'button', class: 'simbtn stop', html: ICON_STOP + 'Arrêter', onclick: () => runner.stop() });
    stopBtn.hidden = true;
    const restartBtn = el('button', { type: 'button', class: 'simbtn light', text: 'Recommencer', title: 'Redémarre la carte virtuelle', onclick: () => start() });
    const speed = el('select', { 'aria-label': 'Vitesse de la simulation' }, [
      el('option', { value: '1', text: 'vitesse ×1' }), el('option', { value: '2', text: 'vitesse ×2' }), el('option', { value: '5', text: 'vitesse ×5' })]);
    speed.addEventListener('change', () => runner.setSpeed(Number(speed.value)));
    const sound = el('select', { 'aria-label': 'Son' }, [el('option', { value: 'on', text: 'son activé' }), el('option', { value: 'off', text: 'son coupé' })]);
    sound.addEventListener('change', () => { Sound.muted = sound.value === 'off'; if (Sound.muted) Sound.off(); });
    const state = el('span', { class: 'simstate', text: 'Arrêtée' });
    o.container.appendChild(el('div', { class: 'simbar' }, [startBtn, stopBtn, restartBtn, speed, sound, state]));
    o.container.appendChild(hw.c);

    function refresh() { hw.build(scan(o.getWorkspace()), o.getVersion()); }
    function start() {
      Sound.ensure();
      refresh();
      let src;
      try { src = SimGen.generate(o.getWorkspace()); } catch (e) { o.log('Simulation impossible : ' + e.message, 'err'); return; }
      runner.start(src, hw);
    }
    refresh();
    return { start: start, stop: () => runner.stop(), refresh: refresh, get running() { return runner.running; }, hw: hw, runner: runner };
  }

  root.MicrobitSim = { mount: mount, scan: scan };
})(typeof window !== 'undefined' ? window : globalThis);
