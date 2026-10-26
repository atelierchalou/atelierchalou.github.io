/* Simulateur du robot « Cagett'bot » : vue de dessus, piste en ruban noir, obstacle déplaçable (la radio est dans sim-montages.js).
   Unités : centimètres, axe y vers le haut (comme en maths). */
(function (root) {
  'use strict';
  const { SimGen, el, holdable } = root.SimCore;
  const F = SimGen.forBlock, val = SimGen.val, fld = SimGen.fld, line = SimGen.line, ATOM = SimGen.ATOM;

  /* ----- Blocs robot -> JavaScript simulé ----- */
  F.robot_move = (b, g) => {
    const v = 'sim.num(' + val(g, b, 'SPEED', '60') + ')';
    const half = 'sim.div(' + v + ', 3)', neg = '(-' + v + ')';
    const a = { FWD: [v, v], BACK: [neg, neg], LEFT: [half, v], RIGHT: [v, half], SPIN_L: [neg, v], SPIN_R: [v, neg] }[b.getFieldValue('DIR')];
    return line('sim.hw.robot.motors(' + a[0] + ', ' + a[1] + ')');
  };
  F.robot_stop = () => line('sim.hw.robot.motors(0, 0)');
  F.robot_motors = (b, g) => line('sim.hw.robot.motors(' + val(g, b, 'LEFT', '0') + ', ' + val(g, b, 'RIGHT', '0') + ')');
  F.robot_distance = () => ['sim.hw.robot.distance()', ATOM];
  F.robot_line = (b) => ['sim.hw.robot.line(' + fld(b, 'SIDE') + ', ' + fld(b, 'COLOR') + ')', ATOM];
  F.robot_led = (b) => line('sim.hw.robot.led(' + (b.getFieldValue('STATE') === 'HIGH' ? 1 : 0) + ')');
  F.robot_mode = () => ['sim.hw.robot.mode()', ATOM];
  F.robot_mode_click = () => ['sim.hw.robot.modeClick()', ATOM];

  /* ----- Monde ----- */
  const W = 180, H = 120;                         // aire de jeu : 1,80 m x 1,20 m
  const TRACK = { cx: 90, cy: 60, a: 45, r: 35 }; // piste « stade » : environ 4 m de ruban
  const TAPE = 1;                                 // demi-largeur du ruban (2 cm)
  const BODY = { len: 17, wid: 14, axle: 13 };
  const SENS = { fwd: 8, side: 2.2 };             // capteurs de ligne : 8 cm devant l'essieu, à 2,2 cm de l'axe
  const VMAX = 35, DEAD = 20;                     // 35 cm/s à 100 % ; en dessous de 20 % les moteurs calent
  const START = () => ({ x: TRACK.cx - 25, y: TRACK.cy - TRACK.r, th: 0 });

  function distToTrack(x, y) {
    const dx = x - TRACK.cx, dy = y - TRACK.cy;
    if (Math.abs(dx) <= TRACK.a) return Math.abs(Math.abs(dy) - TRACK.r);
    const ox = dx > 0 ? TRACK.a : -TRACK.a;
    return Math.abs(Math.hypot(dx - ox, dy) - TRACK.r);
  }
  /* Rayon du capteur à ultrasons contre l'obstacle (rectangle). */
  function rayToBox(px, py, ux, uy, box) {
    let tmin = 0, tmax = Infinity;
    for (const [p, u, lo, hi] of [[px, ux, box.x - box.w / 2, box.x + box.w / 2], [py, uy, box.y - box.h / 2, box.y + box.h / 2]]) {
      if (Math.abs(u) < 1e-9) { if (p < lo || p > hi) return Infinity; continue; }
      let t1 = (lo - p) / u, t2 = (hi - p) / u;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
    return tmin;
  }

  class RobotSim {
    constructor(board) {
      this.board = board;
      this.pose = START();
      this.box = { x: TRACK.cx + 25, y: TRACK.cy + TRACK.r, w: 14, h: 14, on: true };
      this.reset();
      this.loopOn = false;
    }
    reset() {
      this.m = { l: 0, r: 0 };
      this.ledOn = 0;
      this.clicks = 0;
      this.pressed = false;
      this.pose = START();
      this.vt = null;
      this.paint();
    }
    /* --- API du programme simulé --- */
    /* Fait avancer la physique jusqu'à l'instant présent de la carte virtuelle (horloge simulée) :
       les mouvements sont exacts même si l'écran est lent ou la simulation accélérée. */
    advance() {
      const s = this.board.sim;
      if (!this.board.on || !s) { this.vt = null; return; }
      const now = s.millis();
      if (this.vt == null || now < this.vt) { this.vt = now; return; }
      // après une pause de la page (ordinateur chargé), on ne rattrape pas plus de 0,08 s d'un coup :
      // sinon le robot filerait tout droit sans que le programme puisse corriger sa trajectoire
      let left = Math.min(0.08, (now - this.vt) / 1000);
      this.vt = now;
      while (left > 1e-6) { const h = Math.min(0.01, left); this.step(h); left -= h; }
    }
    motors(l, r) {
      this.advance();
      const c = (v) => Math.max(-100, Math.min(100, Math.trunc(Number(v) || 0)));
      this.m = { l: c(l), r: c(r) };   // l'affichage est mis à jour à chaque image (pas à chaque ordre : trop coûteux)
    }
    sensorPoint(side) {
      const p = this.pose, s = side === 'L' ? SENS.side : -SENS.side;
      return { x: p.x + SENS.fwd * Math.cos(p.th) - s * Math.sin(p.th), y: p.y + SENS.fwd * Math.sin(p.th) + s * Math.cos(p.th) };
    }
    seesBlack(side) { const q = this.sensorPoint(side); return distToTrack(q.x, q.y) <= TAPE; }
    line(side, color) { this.advance(); return this.seesBlack(side) === (color === 'BLACK'); }
    distance() {
      this.advance();
      const p = this.pose, ux = Math.cos(p.th), uy = Math.sin(p.th);
      const sx = p.x + (BODY.len / 2) * ux, sy = p.y + (BODY.len / 2) * uy;
      const d = this.box.on ? rayToBox(sx, sy, ux, uy, this.box) : Infinity;
      return d > 400 ? 999 : Math.round(d);
    }
    led(v) { this.ledOn = v ? 1 : 0; }   // dessinée à la prochaine image
    mode() { return this.pressed; }
    modeClick() { const c = this.clicks > 0; this.clicks = 0; return c; }

    /* --- Physique (appelée à chaque image) --- */
    step(dt) {
      const sp = (pct) => (Math.abs(pct) < DEAD ? 0 : (pct / 100) * VMAX);
      const vl = sp(this.m.l), vr = sp(this.m.r);
      if (!vl && !vr) return;
      const p = this.pose;
      const v = (vl + vr) / 2, w = (vr - vl) / BODY.axle;
      const n = { th: p.th + w * dt };
      n.x = p.x + v * Math.cos(p.th + w * dt / 2) * dt;
      n.y = p.y + v * Math.sin(p.th + w * dt / 2) * dt;
      // bords de l'aire et obstacle : le robot bute dessus
      const rad = 8;
      n.x = Math.max(rad, Math.min(W - rad, n.x));
      n.y = Math.max(rad, Math.min(H - rad, n.y));
      if (this.box.on && Math.abs(n.x - this.box.x) < this.box.w / 2 + rad && Math.abs(n.y - this.box.y) < this.box.h / 2 + rad) { n.x = p.x; n.y = p.y; }
      this.pose = n;
    }
    startLoop() {
      if (this.loopOn) return;
      this.loopOn = true;
      let last = performance.now();
      const frame = (now) => {
        if (!this.canvas || !this.canvas.isConnected) { this.loopOn = false; return; }
        last = now;
        this.advance();
        this.paint();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    /* --- Affichage --- */
    build(container) {
      const c = el('div', { class: 'robotbox' });
      this.canvas = el('canvas', { class: 'robotcanvas', 'aria-label': 'Piste du robot vue de dessus' });
      this.cap = el('div', { class: 'robotcap', hidden: '' });             // légende des tests du mode guidé
      c.appendChild(el('div', { class: 'robotstage' }, [this.canvas, this.cap]));
      /* voyants des capteurs de ligne, bien visibles sous la piste */
      this.lamps = {};
      const lamp = (side, label) => {
        const dot = el('i', { class: 'lamp' }), txt = el('b', { text: 'blanc' });
        this.lamps[side] = { box: el('div', { class: 'lampbox' }, [dot, el('span', {}, [el('small', { text: label }), txt])]), txt: txt };
        return this.lamps[side].box;
      };
      c.appendChild(el('div', { class: 'linelamps', title: 'Capteurs de ligne TCRT5000 : le voyant s\'allume quand le capteur voit le ruban noir' },
        [lamp('L', 'Capteur de ligne gauche (A2)'), lamp('R', 'Capteur de ligne droit (A3)')]));
      this.info = el('div', { class: 'robotinfo' });
      const ctrl = el('div', { class: 'simbar' }, [
        el('button', { type: 'button', class: 'simbtn light', text: 'Replacer', title: 'Remet le robot au départ', onclick: () => { this.pose = START(); this.paint(); } }),
        el('button', { type: 'button', class: 'simbtn light', text: '⟲', title: 'Tourner le robot vers la gauche', onclick: () => { this.pose.th += Math.PI / 12; this.paint(); } }),
        el('button', { type: 'button', class: 'simbtn light', text: '⟳', title: 'Tourner le robot vers la droite', onclick: () => { this.pose.th -= Math.PI / 12; this.paint(); } }),
        (() => {
          const b = el('button', { type: 'button', class: 'simbtn light', text: 'Obstacle : ' + (this.box.on ? 'oui' : 'non') });
          b.onclick = () => { this.box.on = !this.box.on; b.textContent = 'Obstacle : ' + (this.box.on ? 'oui' : 'non'); this.paint(); };
          return b;
        })(),
        holdable(el('span', { class: 'simbtn modebtn press', text: 'Bouton MODE' }), (down) => { this.pressed = down; if (down) this.clicks++; }),
      ]);
      c.appendChild(ctrl);
      c.appendChild(this.info);
      container.appendChild(c);
      this.dragging();
      this.paint();
      this.startLoop();
    }
    dragging() {
      const cv = this.canvas;
      let drag = null;
      const toWorld = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: H - (e.clientY - r.top) / r.height * H }; };
      cv.addEventListener('pointerdown', (e) => {
        const q = toWorld(e);
        if (this.box.on && Math.abs(q.x - this.box.x) < this.box.w && Math.abs(q.y - this.box.y) < this.box.h) drag = 'box';
        else if (Math.hypot(q.x - this.pose.x, q.y - this.pose.y) < 12) drag = 'robot';
        if (drag) { cv.setPointerCapture(e.pointerId); e.preventDefault(); }
      });
      cv.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const q = toWorld(e);
        const t = drag === 'box' ? this.box : this.pose;
        t.x = Math.max(8, Math.min(W - 8, q.x)); t.y = Math.max(8, Math.min(H - 8, q.y));
        this.paint();
      });
      const end = () => { drag = null; };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
    }
    caption(t) { if (!this.cap) return; this.cap.hidden = !t; this.cap.textContent = t || ''; }
    paintInfo() {
      if (this.lamps) for (const side of ['L', 'R']) {
        const black = this.seesBlack(side), l = this.lamps[side];
        l.box.classList.toggle('on', black);
        l.txt.textContent = black ? 'voit le NOIR' : 'voit du blanc';
      }
      if (!this.info) return;
      const L = this.seesBlack('L') ? 'noir' : 'blanc', R = this.seesBlack('R') ? 'noir' : 'blanc';
      const d = this.distance();
      this.info.textContent = 'Moteurs : gauche ' + this.m.l + ' %, droit ' + this.m.r + ' %  ·  Ligne : gauche ' + L + ', droit ' + R
        + '  ·  Distance : ' + (d === 999 ? 'rien devant' : d + ' cm');
    }
    paint() {
      const cv = this.canvas;
      if (!cv || !cv.isConnected) return;
      const cssW = cv.clientWidth || 340, cssH = cssW * H / W, dpr = root.devicePixelRatio || 1;
      if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); cv.style.height = cssH + 'px'; }
      const k = cv.width / W, g = cv.getContext('2d');
      const X = (x) => x * k, Y = (y) => (H - y) * k;
      g.fillStyle = '#f6f1e7'; g.fillRect(0, 0, cv.width, cv.height);
      // carrelage léger
      g.strokeStyle = 'rgba(0,0,0,.05)'; g.lineWidth = 1;
      for (let x = 0; x <= W; x += 30) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), cv.height); g.stroke(); }
      for (let y = 0; y <= H; y += 30) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(cv.width, Y(y)); g.stroke(); }
      // piste
      g.strokeStyle = '#141414'; g.lineWidth = 2 * TAPE * k; g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(X(TRACK.cx - TRACK.a), Y(TRACK.cy - TRACK.r));
      g.lineTo(X(TRACK.cx + TRACK.a), Y(TRACK.cy - TRACK.r));
      g.arc(X(TRACK.cx + TRACK.a), Y(TRACK.cy), TRACK.r * k, Math.PI / 2, -Math.PI / 2, true);
      g.lineTo(X(TRACK.cx - TRACK.a), Y(TRACK.cy + TRACK.r));
      g.arc(X(TRACK.cx - TRACK.a), Y(TRACK.cy), TRACK.r * k, -Math.PI / 2, Math.PI / 2, true);
      g.closePath(); g.stroke();
      // obstacle
      if (this.box.on) {
        const b = this.box;
        g.fillStyle = '#c98b4b'; g.strokeStyle = '#7a4f22'; g.lineWidth = 2;
        g.fillRect(X(b.x - b.w / 2), Y(b.y + b.h / 2), b.w * k, b.h * k);
        g.strokeRect(X(b.x - b.w / 2), Y(b.y + b.h / 2), b.w * k, b.h * k);
        g.fillStyle = '#4a2f12'; g.font = '600 ' + Math.max(9, 3.2 * k) + 'px Fredoka, sans-serif'; g.textAlign = 'center';
        g.fillText('obstacle', X(b.x), Y(b.y) + 3.5 * k / 3);
      }
      // faisceau ultrason
      const p = this.pose, d = this.distance();
      const ux = Math.cos(p.th), uy = Math.sin(p.th), sx = p.x + BODY.len / 2 * ux, sy = p.y + BODY.len / 2 * uy;
      if (d !== 999) {
        g.strokeStyle = d < 20 ? 'rgba(239,71,111,.75)' : 'rgba(61,123,255,.45)'; g.lineWidth = 2; g.setLineDash([5, 4]);
        g.beginPath(); g.moveTo(X(sx), Y(sy)); g.lineTo(X(sx + d * ux), Y(sy + d * uy)); g.stroke(); g.setLineDash([]);
      }
      // robot
      g.save();
      g.translate(X(p.x), Y(p.y)); g.rotate(-p.th);
      g.fillStyle = '#1b1d24';
      g.fillRect(-4 * k, -(BODY.wid / 2 + 2.2) * k, 8 * k, 2.4 * k);  // roue gauche (en haut à l'écran quand il va à droite)
      g.fillRect(-4 * k, (BODY.wid / 2 - 0.2) * k, 8 * k, 2.4 * k);   // roue droite
      g.fillStyle = '#12A3A6'; g.strokeStyle = '#0b6e75'; g.lineWidth = 2;
      const rx = -BODY.len / 2 + 2, ry = -BODY.wid / 2;
      g.beginPath(); if (g.roundRect) g.roundRect(rx * k, ry * k, BODY.len * k, BODY.wid * k, 3 * k); else g.rect(rx * k, ry * k, BODY.len * k, BODY.wid * k);
      g.fill(); g.stroke();
      // ultrasons (deux « yeux »)
      g.fillStyle = '#dfe6ee';
      for (const s of [-2.6, 2.6]) { g.beginPath(); g.arc((BODY.len / 2 + 1.2) * k, s * k, 1.8 * k, 0, 7); g.fill(); }
      // LED obstacle
      g.fillStyle = this.ledOn ? '#ff3b3b' : '#6b2a2a';
      if (this.ledOn) { g.shadowColor = '#ff3b3b'; g.shadowBlur = 12; }
      g.beginPath(); g.arc(-1 * k, 0, 1.6 * k, 0, 7); g.fill(); g.shadowBlur = 0;
      g.restore();
      // capteurs de ligne
      for (const side of ['L', 'R']) {
        const q = this.sensorPoint(side), black = this.seesBlack(side);
        // voyant bien visible : rouge lumineux sur le noir, gris éteint sur le blanc
        if (black) { g.shadowColor = '#ff3b3b'; g.shadowBlur = 16; }
        g.fillStyle = black ? '#ff3b3b' : '#c7ccd6'; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
        g.beginPath(); g.arc(X(q.x), Y(q.y), 2 * k, 0, 7); g.fill(); g.stroke();
        g.shadowBlur = 0;
        g.fillStyle = '#2b2d42'; g.font = '600 ' + Math.max(9, 2.6 * k) + 'px Fredoka, sans-serif'; g.textAlign = 'center';
        g.fillText(side === 'L' ? 'G' : 'D', X(q.x), Y(q.y) + 0.9 * k);
      }
      this.paintInfo();
    }
  }

  const CSS = `
.robotbox{display:flex;flex-direction:column;gap:6px}
.robotcanvas{width:100%;border-radius:12px;border:2px solid #e3e8f4;touch-action:none;cursor:grab;display:block}
.robotinfo{font-size:12px;color:var(--muted);line-height:1.4}
.robotstage{position:relative}
.robotcap{position:absolute;left:8px;right:8px;top:8px;background:rgba(20,33,61,.86);color:#fff;font:600 13.5px/1.35 var(--font);border-radius:10px;
  padding:6px 10px;text-align:center;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.2)}
.robotcap[hidden]{display:none}
.linelamps{display:flex;gap:8px}
.lampbox{flex:1;display:flex;align-items:center;gap:8px;background:#f7f9ff;border:2px solid #e3e8f4;border-radius:12px;padding:5px 8px}
.lampbox span{display:flex;flex-direction:column;line-height:1.2}
.lampbox small{font-size:11px;color:var(--muted)} .lampbox b{font-size:13px}
.lamp{width:20px;height:20px;border-radius:50%;flex:none;background:#c7ccd6;border:2px solid #9aa3b5}
.lampbox.on{border-color:#ff9d9d;background:#fff1f1}
.lampbox.on .lamp{background:#ff3b3b;border-color:#c81e1e;box-shadow:0 0 12px 3px rgba(255,59,59,.7)}
.lampbox.on b{color:#c81e1e}
.remotehead{font-size:12.5px;font-weight:600;color:var(--teal)}
.remote{display:flex;flex-wrap:wrap;align-items:center;gap:5px}
.rbtn{font:600 14px var(--font);width:34px;height:30px;border:0;border-radius:9px;background:#0B7285;color:#fff;cursor:pointer;box-shadow:0 3px 0 #08515e}
.rbtn:active{transform:translateY(2px);box-shadow:none}
.rnum{width:64px;font:600 13px var(--font);border:2px solid #e3e8f4;border-radius:999px;padding:4px 8px}
.modebtn{background:#0B7285!important;color:#fff!important;box-shadow:0 3px 0 #08515e!important}
.modebtn.down{transform:translateY(2px);box-shadow:none!important}
`;
  let cssDone = false;
  function css() {
    if (cssDone) return;
    cssDone = true;
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
  }

  /* Vitesse de rotation du robot virtuel (degrés par seconde) pour un ordre de virage à une puissance donnée.
     kind : 'SPIN' (pivoter sur place : une roue avance, l'autre recule) ou 'TURN' (tourner : la roue intérieure va 3 fois moins vite). */
  function turnRate(power, kind) {
    const v = (p) => (Math.abs(p) < DEAD ? 0 : (p / 100) * VMAX);
    const p = Math.abs(Number(power) || 0);
    const w = kind === 'SPIN' ? 2 * v(p) / BODY.axle : (v(p) - v(Math.trunc(p / 3))) / BODY.axle;
    return w * 180 / Math.PI;
  }
  root.RobotSim = { RobotSim: RobotSim, css: css, distToTrack: distToTrack, TRACK: TRACK, turnRate: turnRate, DEAD: DEAD };
})(typeof window !== 'undefined' ? window : globalThis);
