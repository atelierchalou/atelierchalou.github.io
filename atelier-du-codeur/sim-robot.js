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
  /* Décor de la piste selon le parcours guidé : 'mars' (sol martien, rochers, pas de ligne), 'route' (route et carton), sinon atelier. */
  const theme = () => { const G = root.GuideMode; return (G && G.active && G.course && G.course.theme) || ''; };
  /* nombres pseudo-aléatoires fixes : le décor ne « saute » pas d'une image à l'autre */
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

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
      this.tracks = [];
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
    seesBlack(side) { if (theme() === 'mars') return false; const q = this.sensorPoint(side); return distToTrack(q.x, q.y) <= TAPE; }   // sur Mars, pas de ligne au sol
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
      // tout le robot (caisse + roues) reste dans l'aire visible, quelle que soit son orientation
      const c = Math.cos(n.th), si = Math.sin(n.th), hw = BODY.wid / 2 + 2.2;
      let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
      for (const [a, b] of [[-BODY.len / 2 + 2, -hw], [-BODY.len / 2 + 2, hw], [BODY.len / 2 + (theme() === 'mars' ? 3.5 : 2), -hw], [BODY.len / 2 + (theme() === 'mars' ? 3.5 : 2), hw]]) {
        const cx = a * c - b * si, cy = a * si + b * c;
        x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
      }
      const M = theme() === 'mars' ? 3 : 0;   // sur Mars, petite marge ; ailleurs la piste passe près du bord : pas de marge
      n.x = Math.max(M - x0, Math.min(W - M - x1, n.x));
      n.y = Math.max(M - y0, Math.min(H - M - y1, n.y));
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
    /* ---------- décors ---------- */
    paintMars(g, k, X, Y) {
      const cv = this.canvas;
      const grd = g.createLinearGradient(0, 0, cv.width, cv.height);
      grd.addColorStop(0, '#d9783f'); grd.addColorStop(0.55, '#c45e2e'); grd.addColorStop(1, '#a9471f');
      g.fillStyle = grd; g.fillRect(0, 0, cv.width, cv.height);
      // taches de poussière
      for (let i = 0; i < 26; i++) {
        g.fillStyle = 'rgba(' + (rnd(i) > 0.5 ? '255,190,140' : '120,40,15') + ',' + (0.08 + rnd(i + 50) * 0.08) + ')';
        g.beginPath(); g.ellipse(X(rnd(i + 1) * W), Y(rnd(i + 2) * H), (6 + rnd(i + 3) * 16) * k, (3 + rnd(i + 4) * 8) * k, rnd(i + 5) * 3, 0, 7); g.fill();
      }
      // cratères
      const craters = [[150, 95, 12], [35, 22, 9], [120, 18, 6], [60, 100, 7], [165, 40, 5], [95, 52, 4]];
      for (const [cx, cy, r] of craters) {
        g.fillStyle = 'rgba(90,30,10,.35)'; g.beginPath(); g.arc(X(cx), Y(cy), r * k, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,200,150,.25)'; g.beginPath(); g.arc(X(cx - r * 0.15), Y(cy + r * 0.15), r * 0.8 * k, 0, 7); g.fill();
        g.strokeStyle = 'rgba(255,215,170,.45)'; g.lineWidth = 1.2 * k; g.beginPath(); g.arc(X(cx), Y(cy), r * k, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
      }
      // petits cailloux
      for (let i = 0; i < 60; i++) {
        g.fillStyle = rnd(i + 200) > 0.5 ? 'rgba(70,25,10,.55)' : 'rgba(250,200,160,.5)';
        g.beginPath(); g.arc(X(rnd(i + 100) * W), Y(rnd(i + 150) * H), (0.4 + rnd(i + 175) * 0.9) * k, 0, 7); g.fill();
      }
      // le module d'atterrissage, à gauche
      const lx = 10, ly = 60;
      g.save(); g.translate(X(lx), Y(ly));
      g.strokeStyle = '#d8d8d8'; g.lineWidth = 1.2 * k;
      for (const a of [0.6, 2.5, 3.8, 5.6]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 8 * k, Math.sin(a) * 8 * k); g.stroke(); }
      g.fillStyle = '#e9e9ef'; g.strokeStyle = '#8b8fa3'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, 5 * k, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#f2b134'; g.beginPath(); g.arc(0, 0, 2 * k, 0, 7); g.fill();
      g.restore();
      // traces de roues derrière le rover
      if (!this.tracks) this.tracks = [];
      const p = this.pose, last = this.tracks[this.tracks.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1.5) { this.tracks.push({ x: p.x, y: p.y, th: p.th }); if (this.tracks.length > 400) this.tracks.shift(); }
      g.fillStyle = 'rgba(80,25,8,.22)';
      for (const t of this.tracks) for (const sgn of [-1, 1]) {
        const ox = -Math.sin(t.th) * sgn * (BODY.wid / 2 + 1), oy = Math.cos(t.th) * sgn * (BODY.wid / 2 + 1);
        g.beginPath(); g.arc(X(t.x + ox), Y(t.y + oy), 0.7 * k, 0, 7); g.fill();
      }
    }
    paintRock(g, k, X, Y, b) {
      const pts = 9, R = b.w / 2 + 1;
      g.save(); g.translate(X(b.x), Y(b.y));
      g.fillStyle = 'rgba(60,20,5,.35)'; g.beginPath(); g.ellipse(1.5 * k, 1.8 * k, R * 1.05 * k, R * 0.8 * k, 0, 0, 7); g.fill();
      g.beginPath();
      for (let i = 0; i <= pts; i++) { const a = i / pts * Math.PI * 2, r = R * (0.78 + rnd(i + 7) * 0.3); const px = Math.cos(a) * r * k, py = Math.sin(a) * r * k; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      const gr = g.createRadialGradient(-R * 0.3 * k, -R * 0.4 * k, 1, 0, 0, R * k);
      gr.addColorStop(0, '#b0715a'); gr.addColorStop(1, '#5d2e1f');
      g.fillStyle = gr; g.fill(); g.strokeStyle = '#3c1a10'; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = 'rgba(255,220,190,.35)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-R * 0.4 * k, -R * 0.2 * k); g.lineTo(R * 0.1 * k, -R * 0.45 * k); g.stroke();
      g.restore();
      g.fillStyle = '#fff4e8'; g.font = '600 ' + Math.max(9, 3 * k) + 'px Fredoka, sans-serif'; g.textAlign = 'center';
      g.fillText('rocher', X(b.x), Y(b.y - b.h / 2 - 4));
    }
    paintRoad(g, k, X, Y, trackPath) {
      const cv = this.canvas;
      g.fillStyle = '#8cc36a'; g.fillRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(40,110,40,.18)'; g.beginPath(); g.arc(X(rnd(i + 300) * W), Y(rnd(i + 340) * H), (2 + rnd(i + 380) * 4) * k, 0, 7); g.fill(); }
      // arbres et maisons hors de la route
      const trees = [[8, 10], [172, 112], [8, 110], [172, 8], [90, 60], [75, 62], [105, 58]];
      for (const [tx, ty] of trees) {
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(X(tx + 1), Y(ty - 1), 5 * k, 0, 7); g.fill();
        g.fillStyle = '#2f8a3a'; g.beginPath(); g.arc(X(tx), Y(ty), 5 * k, 0, 7); g.fill();
        g.fillStyle = '#49ad52'; g.beginPath(); g.arc(X(tx - 1.2), Y(ty + 1.2), 3 * k, 0, 7); g.fill();
      }
      // route : bande grise avec bords blancs, la ligne noire au milieu sert au suivi
      g.lineJoin = 'round';
      g.strokeStyle = '#ffffff'; g.lineWidth = 26 * k; trackPath(); g.stroke();
      g.strokeStyle = '#5b6170'; g.lineWidth = 24 * k; trackPath(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.8 * k; g.setLineDash([4 * k, 4 * k]);
      // pointillés de bord de voie
      for (const off of [-8.5, 8.5]) {
        g.beginPath();
        const r = TRACK.r + off;
        g.moveTo(X(TRACK.cx - TRACK.a), Y(TRACK.cy - r));
        g.lineTo(X(TRACK.cx + TRACK.a), Y(TRACK.cy - r));
        g.arc(X(TRACK.cx + TRACK.a), Y(TRACK.cy), r * k, Math.PI / 2, -Math.PI / 2, true);
        g.lineTo(X(TRACK.cx - TRACK.a), Y(TRACK.cy + r));
        g.arc(X(TRACK.cx - TRACK.a), Y(TRACK.cy), r * k, -Math.PI / 2, Math.PI / 2, true);
        g.closePath(); g.stroke();
      }
      g.setLineDash([]);
    }
    paintRoadblock(g, k, X, Y, b) {
      g.save(); g.translate(X(b.x), Y(b.y));
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-b.w / 2 * k + 1.5 * k, -b.h / 2 * k + 1.5 * k, b.w * k, b.h * k);
      g.fillStyle = '#c98b4b'; g.strokeStyle = '#7a4f22'; g.lineWidth = 2;
      g.fillRect(-b.w / 2 * k, -b.h / 2 * k, b.w * k, b.h * k); g.strokeRect(-b.w / 2 * k, -b.h / 2 * k, b.w * k, b.h * k);
      g.strokeStyle = 'rgba(122,79,34,.6)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-b.w / 2 * k, 0); g.lineTo(b.w / 2 * k, 0); g.stroke();
      // cône orange posé dessus
      g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(0, 0, 3.6 * k, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 2.2 * k, 0, 7); g.fill();
      g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(0, 0, 1 * k, 0, 7); g.fill();
      g.restore();
      g.fillStyle = '#1d2433'; g.font = '700 ' + Math.max(9, 3 * k) + 'px Fredoka, sans-serif'; g.textAlign = 'center';
      g.fillText('travaux', X(b.x), Y(b.y - b.h / 2 - 3.5));
    }

    paint() {
      const cv = this.canvas;
      if (!cv || !cv.isConnected) return;
      const cssW = cv.clientWidth || 340, cssH = cssW * H / W, dpr = root.devicePixelRatio || 1;
      if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); cv.style.height = cssH + 'px'; }
      const k = cv.width / W, g = cv.getContext('2d');
      const X = (x) => x * k, Y = (y) => (H - y) * k;
      const th = theme();
      const trackPath = () => {
        g.beginPath();
        g.moveTo(X(TRACK.cx - TRACK.a), Y(TRACK.cy - TRACK.r));
        g.lineTo(X(TRACK.cx + TRACK.a), Y(TRACK.cy - TRACK.r));
        g.arc(X(TRACK.cx + TRACK.a), Y(TRACK.cy), TRACK.r * k, Math.PI / 2, -Math.PI / 2, true);
        g.lineTo(X(TRACK.cx - TRACK.a), Y(TRACK.cy + TRACK.r));
        g.arc(X(TRACK.cx - TRACK.a), Y(TRACK.cy), TRACK.r * k, -Math.PI / 2, Math.PI / 2, true);
        g.closePath();
      };
      if (th === 'mars') this.paintMars(g, k, X, Y);
      else if (th === 'route') this.paintRoad(g, k, X, Y, trackPath);
      else {
        g.fillStyle = '#f6f1e7'; g.fillRect(0, 0, cv.width, cv.height);
        // carrelage léger
        g.strokeStyle = 'rgba(0,0,0,.05)'; g.lineWidth = 1;
        for (let x = 0; x <= W; x += 30) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), cv.height); g.stroke(); }
        for (let y = 0; y <= H; y += 30) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(cv.width, Y(y)); g.stroke(); }
      }
      // piste (ligne noire) : pas sur Mars
      if (th !== 'mars') { g.strokeStyle = '#141414'; g.lineWidth = 2 * TAPE * k; g.lineJoin = 'round'; trackPath(); g.stroke(); }
      // obstacle
      if (this.box.on) {
        const b = this.box;
        if (th === 'mars') this.paintRock(g, k, X, Y, b);
        else if (th === 'route') this.paintRoadblock(g, k, X, Y, b);
        else {
          g.fillStyle = '#c98b4b'; g.strokeStyle = '#7a4f22'; g.lineWidth = 2;
          g.fillRect(X(b.x - b.w / 2), Y(b.y + b.h / 2), b.w * k, b.h * k);
          g.strokeRect(X(b.x - b.w / 2), Y(b.y + b.h / 2), b.w * k, b.h * k);
          g.fillStyle = '#4a2f12'; g.font = '600 ' + Math.max(9, 3.2 * k) + 'px Fredoka, sans-serif'; g.textAlign = 'center';
          g.fillText('obstacle', X(b.x), Y(b.y) + 3.5 * k / 3);
        }
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
      if (th === 'mars') {   // le Cagett'bot en tenue de rover : panneau solaire et mât de caméra
        g.fillStyle = '#23407a'; g.strokeStyle = '#9fb7e6'; g.lineWidth = 1;
        g.fillRect((rx + 2) * k, (ry + 1.5) * k, (BODY.len - 9) * k, (BODY.wid - 3) * k);
        for (let i = 1; i < 4; i++) { const xx = (rx + 2 + i * (BODY.len - 9) / 4) * k; g.beginPath(); g.moveTo(xx, (ry + 1.5) * k); g.lineTo(xx, (ry + BODY.wid - 1.5) * k); g.stroke(); }
        g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc((BODY.len / 2 - 3.5) * k, -3.2 * k, 1.5 * k, 0, 7); g.fill();
      }
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
