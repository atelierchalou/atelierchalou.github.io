/* Mode guidé : l'élève suit un parcours de missions. Pour chaque mission : consigne, boîte à outils réduite aux blocs utiles,
   indices, vérification automatique dans le simulateur, étoiles et progression enregistrée.
   Le programme « libre » de l'élève est mis de côté pendant le mode guidé, puis rendu à la sortie. */
(function (root) {
  'use strict';

  const CSS = `
.guide{margin:10px 14px 0;border-radius:18px;background:linear-gradient(135deg,#e9fbf4,#eef3ff);border:3px solid #b9ead6;padding:10px 12px;display:flex;flex-direction:column;gap:7px;flex:none}
.guide[hidden]{display:none}
.ghead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ghead .gnum{font-weight:600;font-size:12.5px;color:#1a8f4e;text-transform:uppercase;letter-spacing:.04em}
.gdots{display:flex;gap:5px;margin-left:auto}
.gdots button{width:22px;height:22px;border-radius:50%;border:2px solid #9fd8bd;background:#fff;font:600 11px var(--font);color:#5d7a6c;cursor:pointer;padding:0}
.gdots button.done{background:#34B34A;border-color:#34B34A;color:#fff}
.gdots button.cur{outline:3px solid #FFC933;outline-offset:1px}
.gtitle{font-size:17px;font-weight:600;color:#0b6e75;margin:0}
.gcourses{display:grid;grid-template-columns:1fr;gap:7px}
.gcourse{display:flex;align-items:center;gap:10px;text-align:left;font:inherit;background:#fff;border:2px solid #cfe9dc;border-radius:14px;padding:8px 10px;cursor:pointer;color:var(--ink)}
.gcourse:hover,.gcourse:focus-visible{border-color:#34B34A;background:#f4fcf7;outline:none}
.gcourse.finished{border-color:#34B34A}
.gcicon{font-size:26px;width:38px;text-align:center;flex:none}
.gctext{display:flex;flex-direction:column;gap:1px}
.gctext b{font-size:14.5px;color:#0b6e75} .gctext small{font-size:12.5px;color:var(--muted)} .gctext em{font-style:normal;font-size:12px;color:#1a6f3e;font-weight:600}
.gcaption{margin:6px 0 0;background:rgba(20,33,61,.9);color:#fff;font:600 13.5px/1.35 var(--font);border-radius:10px;padding:6px 10px;text-align:center}
.gcaption[hidden]{display:none}
.gstage{position:fixed;inset:0;z-index:1000;background:rgba(20,24,52,.55);display:flex;align-items:center;justify-content:center;padding:16px;animation:gfade .2s ease-out}
@keyframes gfade{from{opacity:0}to{opacity:1}}
.gstage-card{background:#fff;border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.35);width:min(900px,96vw);max-height:94vh;overflow:auto;padding:14px 18px;display:flex;flex-direction:column;gap:10px;animation:gpop .25s ease-out}
@keyframes gpop{from{transform:scale(.92)}to{transform:none}}
.gstage-head b{font-size:18px;color:#0b6e75}
.gstage-status{margin:4px 0 0;font-size:16px;font-weight:600;border-radius:12px;padding:8px 12px;background:#fff9e6;color:#7a5a00}
.gstage-status.ok{background:#eafaf0;color:#1a6f3e} .gstage-status.ko{background:#fff0f4;color:#a3203f}
.gstage-sim #simPanel{margin:0 !important;overflow:visible;flex:none;min-height:0}
.gstage-sim{pointer-events:none;user-select:none}   /* pendant la vérification, c'est le test qui appuie sur les boutons : pas de clic de l'élève */
.gstage-sim .simbar{display:none !important}
.gstage.robot .robotcanvas{max-width:calc((94vh - 290px) * 1.5);margin:0 auto}
.gstage-sim .serialhead,.gstage-sim .serial,.gstage-sim .simhint{display:none !important}
.gstage.robot .boardbox{display:none}
.gstage:not(.robot) .gstage-sim{zoom:1.25}
.gstage-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px}
.gstage-foot:empty{display:none}
.gstage-btn{font-size:19px;padding:12px 26px}
.gstage-btn.light{font-size:15px;padding:9px 16px}
.gstage-info{flex-basis:100%}
.gstage-pts{flex-basis:100%;text-align:center;font-size:22px;font-weight:600;color:#1a8f4e}
body .confetti{z-index:2000}
.gbilan-card{width:min(760px,96vw)}
.gnote{display:flex;align-items:baseline;justify-content:center;gap:6px;color:#1a8f4e;font-weight:600}
.gnote span{font-size:56px;line-height:1} .gnote small{font-size:22px}
.gnote-sub{text-align:center;margin:0;font-weight:600;color:#0b6e75}
.gbilan{width:100%;border-collapse:collapse;font-size:14px}
.gbilan th{text-align:left;background:#e9fbf4;color:#0b6e75;padding:6px 8px}
.gbilan td{padding:6px 8px;border-top:1px solid #e3e8f4}
.gbilan tr.ok td:nth-child(3){color:#1a8f4e;font-weight:600} .gbilan tr.ko td:nth-child(3){color:#a3203f;font-weight:600} .gbilan tr.sol td:nth-child(3){color:#a05a00;font-weight:600}
.gname{font:600 16px var(--font);border:2px solid #cfd6ee;border-radius:999px;padding:10px 16px;min-width:240px}
.gname:focus{outline:none;border-color:#3D7BFF}
.gbtn:disabled{opacity:.5;cursor:not-allowed}
.gmenu{position:fixed;z-index:600;background:#fff;color:var(--ink);border-radius:16px;padding:6px;min-width:240px;box-shadow:0 12px 30px rgba(30,20,80,.25);display:flex;flex-direction:column}
.gmenu button{font:600 14px var(--font);text-align:left;border:0;background:transparent;border-radius:10px;padding:9px 12px;cursor:pointer;color:var(--ink)}
.gmenu button:hover,.gmenu button:focus-visible{background:#f1ecff;outline:none}
.gsay{display:flex;align-items:center;gap:8px}
.gsay .gmascot{width:58px;height:62px;flex:none;overflow:visible}
.gbubble{position:relative;flex:1;background:#fff;border:3px solid #9fd8bd;border-radius:16px;padding:8px 12px;font-size:14.5px;line-height:1.4}
.gbubble::before{content:'';position:absolute;left:-11px;top:50%;margin-top:-8px;border:8px solid transparent;border-right-color:#9fd8bd;border-left:0}
.gbtn.next.blink{animation:gblink 1.1s ease-in-out infinite}
@keyframes gblink{0%,100%{transform:scale(1);box-shadow:0 3px 0 #2a56bd,0 0 0 0 rgba(61,123,255,.6)}50%{transform:scale(1.07);box-shadow:0 3px 0 #2a56bd,0 0 0 9px rgba(61,123,255,0);filter:brightness(1.15)}}
@media (prefers-reduced-motion: reduce){.gbtn.next.blink{animation:none;outline:3px solid #FFC933}}
.ggoal{font-size:14px;margin:0}
.gexp{font-size:13px;color:var(--muted);margin:0}
.gcrit{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px;font-size:13px}
.gcrit li::before{content:'○';display:inline-block;width:18px;color:#9aa5b1;font-weight:600}
.gcrit li.ok::before{content:'✔';color:#1a8f4e} .gcrit li.ko::before{content:'✘';color:#d6335a}
.gbtns{display:flex;flex-wrap:wrap;gap:6px}
.gbtn{display:inline-flex;align-items:center;gap:5px;font:600 13.5px var(--font);border:0;border-radius:999px;padding:7px 13px;cursor:pointer;color:#fff;background:#34B34A;box-shadow:0 3px 0 #23803a}
.gbtn:active{transform:translateY(2px);box-shadow:none}
.gbtn:disabled{opacity:.6;cursor:wait}
.gbtn[hidden]{display:none}
body.guided .simwrap{flex:none;min-height:300px;overflow:visible}
body.guided #log{height:56px}
.gexp summary{cursor:pointer;color:#0b6e75;font-weight:600}
.gbtn.hint{background:#FFC933;color:#3a2a00;box-shadow:0 3px 0 #d9a100}
.gbtn.light{background:#fff;color:var(--ink);box-shadow:0 3px 0 #cfd6ee}
.gbtn.next{background:#3D7BFF;box-shadow:0 3px 0 #2a56bd}
.ghint{font-size:13px;background:#fff8e1;border:2px dashed #ffd666;border-radius:12px;padding:6px 10px}
.ghint[hidden]{display:none}
.gres{font-size:13.5px;font-weight:600;border-radius:12px;padding:6px 10px}
.gres[hidden]{display:none}
.ginfo{font-size:12.5px;line-height:1.5;background:#eef5ff;border:2px solid #cfe0ff;border-radius:12px;padding:7px 10px}
.ginfo[hidden]{display:none}
.ginfo small{color:var(--muted)}
.gres.ok{background:#eafaf0;color:#1a6f3e} .gres.ko{background:#fff0f4;color:#a3203f} .gres.work{background:#fff9e6;color:#7a5a00}
.gpts{font-size:14px;font-weight:600;color:#1a6f3e;background:#fff;border-radius:999px;padding:3px 12px;align-self:flex-start;box-shadow:0 2px 0 #cfeedd}
.gpts.zero{color:#a05a00;box-shadow:0 2px 0 #ffd9a8}
.gtotal{font-size:12.5px;font-weight:600;color:#0b6e75;background:#fff;border-radius:999px;padding:2px 10px}
.gbareme{font-size:12.5px;color:var(--muted);margin:0}
.gbareme b{color:#1a6f3e}
.gdots button.zero{background:#ffb84d;border-color:#ffb84d;color:#fff}
body.guided .exwrap,body.guided #ddFile,body.guided #ddBoard{display:none}
body.guided aside .tabs{margin-top:8px}
#btnGuide.on{background:#34B34A;box-shadow:0 3px 0 #23803a}
`;

  let o = null, course = null, state = null, panel = null, busy = false;   // busy : vérification en cours
  const LIBRE = 'blocs-guide-programme-libre';
  /* Barème : 3 points sans indice, 2 avec 1 indice, 1,5 avec 2, 1 avec 3 ; 0 si l'élève a dû prendre la solution. */
  const POINTS = [3, 2, 1.5, 1];
  const pointsNow = (s) => (s && s.solution ? 0 : POINTS[Math.min((s && s.hints) || 0, 3)]);
  const fmt = (n) => String(n).replace('.', ',');
  const pts = (n) => fmt(n) + (n > 1 ? ' points' : ' point');
  const totalPoints = () => course.missions.reduce((t, m) => { const s = state.missions[m.id]; return t + (s && s.done ? s.points || 0 : 0); }, 0);
  const safe = (fn) => { try { return fn(); } catch (e) { return null; } };
  const keyOf = (c) => 'blocs-guide-' + c.id + ((o && o.storageSuffix) || '');   // progression enregistrée pour chaque parcours
  /* Bilan chiffré d'un parcours (utilisé par la fenêtre de bilan, le PDF et la plateforme SCORM) */
  function summary(c, st) {
    c = c || course; st = st || state;
    const max = c.missions.length * 3;
    const missions = c.missions.map((m, i) => { const s = st.missions[m.id] || {}; return { n: i + 1, title: m.title, done: !!s.done, points: s.done ? s.points || 0 : 0, hints: s.hints || 0, solution: !!s.solution }; });
    const total = missions.reduce((t, m) => t + m.points, 0);
    return { course: c.title, id: c.id, total: total, max: max, pct: max ? Math.round(1000 * total / max) / 10 : 0, note20: max ? Math.round(40 * total / max) / 2 : 0,
      done: missions.filter((m) => m.done).length, missions: missions, finished: !!st.finished };
  }
  const store = () => {
    if (!course || !state) return;
    safe(() => localStorage.setItem(keyOf(course), JSON.stringify(state)));
    if (o.progress && o.progress.save) safe(() => o.progress.save(course, state, summary()));
  };
  const loadState = (c) => {
    const st = safe(() => JSON.parse(localStorage.getItem(keyOf(c)))) || { cur: 0, missions: {} };
    if (!st.missions) st.missions = {};
    /* plateforme (SCORM) : la progression enregistrée là-bas fait foi ; les programmes restent dans le navigateur */
    const ext = o.progress && o.progress.load ? safe(() => o.progress.load(c)) : null;
    if (ext) {
      for (const id of Object.keys(st.missions)) { const p = st.missions[id].program; st.missions[id] = p ? { program: p } : {}; }
      for (const [id, v] of Object.entries(ext.missions || {})) st.missions[id] = Object.assign(st.missions[id] || {}, v);
      if (ext.cur != null) st.cur = ext.cur;
      st.finished = !!ext.finished;
    }
    if (!(st.cur >= 0 && st.cur < c.missions.length)) st.cur = 0;
    return st;
  };
  let courses = [];
  const el = (tag, attrs, kids) => root.SimCore.el(tag, attrs, kids);

  /* Boîte à outils réduite : uniquement les blocs autorisés par la mission (les catégories vides disparaissent). */
  function reducedToolbox(allowed) {
    const keep = new Set(allowed);
    const out = [];
    const walk = (cats) => {
      for (const c of cats) {
        if (c.kind !== 'category') continue;
        if (c.custom === 'VARIABLE') { if (keep.has('VARIABLE')) out.push(c); continue; }
        const blocks = (c.contents || []).filter((x) => x.kind === 'block' && keep.has(x.type));
        const seen = new Set();
        const uniq = blocks.filter((x) => { const k = x.type + JSON.stringify(x.fields || {}); if (seen.has(k)) return false; seen.add(k); return true; });
        if (uniq.length) out.push(Object.assign({}, c, { contents: uniq, expanded: undefined }));
        walk((c.contents || []).filter((x) => x.kind === 'category'));
      }
    };
    walk(o.fullToolbox.contents);
    // un même bloc peut être rangé dans deux catégories (ex. « envoyer » dans Radio et Télécommande) : on n'en garde qu'un
    const used = new Set();
    for (const c of out) if (c.contents) c.contents = c.contents.filter((x) => { if (used.has(x.type)) return false; used.add(x.type); return true; });
    return { kind: 'categoryToolbox', contents: out.filter((c) => c.custom || c.contents.length) };
  }

  /* ----- Outils de vérification donnés aux missions ----- */
  function tester() {
    const ws = o.ws, sim = o.sim;
    const all = () => ws.getAllBlocks(false).filter((b) => b.isEnabled());
    const rootOf = (b) => { let r = b; while (r.getParent()) r = r.getParent(); return r; };
    const T = {
      blocks: (type, pred) => all().filter((b) => b.type === type && (!pred || pred(b))),
      has: (type, pred) => T.blocks(type, pred).length > 0,
      inHat: (b, hat) => rootOf(b).type === hat,
      allIn: (type, hat) => T.blocks(type).length > 0 && T.blocks(type).every((b) => T.inHat(b, hat)),
      orphans: () => ws.getTopBlocks(false).filter((b) => b.isEnabled() && b.type !== 'arduino_setup' && b.type !== 'arduino_loop').length,
      field: (b, name) => b.getFieldValue(name),
      numIn: (b, input) => { const t = b.getInputTargetBlock(input); return t && t.type === 'math_number' ? Number(t.getFieldValue('NUM')) : null; },
      robot: () => (sim.hw.robot && sim.hw.robot.canvas ? sim.hw.robot : null),
      pose: () => { const r = T.robot(); return r ? { x: r.pose.x, y: r.pose.y, th: r.pose.th, l: r.m.l, r: r.m.r, led: r.ledOn, d: r.distance() } : null; },
      offTrack: () => { const r = T.robot(); return r ? root.RobotSim.distToTrack(r.pose.x, r.pose.y) : 0; },
      /* Lance le programme dans le simulateur après avoir placé le robot et l'obstacle. */
      async start(opt) {
        opt = opt || {};
        const placeBox = () => {
          const r = sim.hw.robot;
          if (!r) return;
          r.box.on = !!opt.obstacle;
          if (opt.obstacle) { r.box.x = opt.obstacle.x; r.box.y = opt.obstacle.y; }
        };
        placeBox();
        sim.setSpeed(opt.speed || 1);   // vitesse normale : l'élève a le temps de voir chaque étape du test
        sim.start();
        placeBox();
        const r = sim.hw.robot;
        if (r && opt.robot) { r.pose = { x: opt.robot.x, y: opt.robot.y, th: opt.robot.th || 0 }; }
        if (r && r.canvas && r.canvas.isConnected) { const b = r.canvas.closest('.robotbox').querySelector('.simbar .simbtn.light:nth-child(4)'); if (b) b.textContent = 'Obstacle : ' + (r.box.on ? 'oui' : 'non'); r.paint(); }
        await T.wait(60);
      },
      moveObstacle(x, y, on) { const r = T.robot(); if (!r) return; r.box.on = on !== false; if (x != null) { r.box.x = x; r.box.y = y; } r.paint(); },
      /* Attend une durée « simulée » (en millisecondes de la carte virtuelle). */
      now: () => sim.runner.millis(),
      /* Attend une durée en temps de la carte virtuelle. */
      async wait(ms) {
        const end = T.now() + ms;
        while (T.now() < end) await new Promise((res) => setTimeout(res, Math.max(1, Math.min(15, (end - T.now()) / (sim.speed || 1)))));
      },
      /* Attend qu'une condition soit vraie ; renvoie le temps écoulé (ms simulées), ou -1. */
      async until(cond, maxMs, every) {
        const t0 = T.now();
        while (T.now() - t0 <= maxMs) { if (cond()) return T.now() - t0; await T.wait(every || 50); }
        return -1;
      },
      async pressMode(ms) { const r = T.robot(); if (!r) return; r.pressed = true; r.clicks++; await T.wait(ms || 250); r.pressed = false; },
      radio(v) { sim.hw.m.radio.inbox.push(v); },
      running: () => sim.running,
      /* Légende affichée pendant le test (« Test 1 / 4 : … ») : sur la piste du robot, sinon en haut du simulateur. */
      caption(t) {
        const r = sim.hw.robot;
        if (r && r.caption && r.canvas && r.canvas.isConnected) { r.caption(t); return; }
        let c = document.getElementById('gcaption');
        if (!c) { c = el('div', { id: 'gcaption', class: 'gcaption' }); const bar = document.querySelector('#simPanel .simbar'); if (bar) bar.after(c); }
        c.hidden = !t; c.textContent = t || '';
      },
      /* --- cartes et montages (LED, boutons, télécommande, pistolet, cibles) --- */
      pin: (p) => { const s = sim.hw.pins[String(p)]; return s ? (s.pwm != null ? (s.pwm > 0 ? 1 : 0) : s.v) : 0; },
      /* appuie sur un bouton de la carte… et une main le montre à l'écran */
      setButton(p, down) {
        const k = sim.hw.setPressed ? sim.hw.setPressed(p, down) : (sim.hw.pressed[String(p)] = !!down, null);
        if (k && root.SimCore.finger) root.SimCore.finger(k, down ? 'press' : 'hover');
      },
      m: () => sim.hw.m,
      hold(key, down) {
        const m = sim.hw.m; m.btn[key] = !!down; if (down) m.clicks[key] = (m.clicks[key] || 0) + 1;
        const b = document.querySelector('#simPanel .mbtn[data-key="' + key + '"]');
        if (b) { b.classList.toggle('down', !!down); if (root.SimCore.finger) root.SimCore.finger(b, down ? 'press' : 'hover'); }
      },
      async press(key, ms) { T.hold(key, true); await T.wait(ms || 250); T.hold(key, false); },
      shoot(i) { sim.hw.m.hitUntil[i] = performance.now() + 400 / (sim.speed || 1); },
      out: (k) => sim.hw.m.outs[k] || 0,
      bar: (k) => sim.hw.m.bars[k],
      flaps: () => sim.hw.m.flaps.slice(),
      cibleLeds: () => sim.hw.m.leds.slice(),
      sent: () => sim.hw.m.radio.sent,
      sentCount: () => sim.hw.m.radio.sentCount,
      /* Relève une valeur à intervalles réguliers pendant une durée (temps de la carte virtuelle). */
      async sample(fn, ms, every) { const out = []; const t0 = T.now(); while (T.now() - t0 < ms) { out.push([T.now() - t0, fn()]); await T.wait(every || 25); } return out; },
    };
    root.__guideT = T;   // pour les tests automatiques
    return T;
  }

  /* ----- Affichage du panneau ----- */
  function mission() { return course.missions[state.cur]; }
  function render() {
    const m = mission(), st = state.missions[m.id] || {};
    panel.innerHTML = '';
    const dots = el('div', { class: 'gdots' });
    course.missions.forEach((mm, i) => {
      const d = el('button', { type: 'button', text: String(i + 1), title: (i + 1) + '. ' + mm.title, onclick: () => goTo(i) });
      const ms = state.missions[mm.id] || {};
      if (ms.done) d.classList.add(ms.points > 0 ? 'done' : 'zero');
      if (i === state.cur) d.classList.add('cur');
      dots.appendChild(d);
    });
    panel.appendChild(el('div', { class: 'ghead' }, [el('span', { class: 'gnum', text: course.title + ' · mission ' + (state.cur + 1) + ' / ' + course.missions.length }),
      el('span', { class: 'gtotal', text: 'Total : ' + fmt(totalPoints()) + ' / ' + course.missions.length * 3 + ' points' }), dots]));
    panel.appendChild(el('h3', { class: 'gtitle', text: m.title }));
    /* la consigne est dite par la mascotte, dans une bulle */
    const say = el('div', { class: 'gsay' });
    const src = document.getElementById('mascot');
    if (src) { const mc = src.cloneNode(true); mc.removeAttribute('id'); mc.setAttribute('class', 'mascot gmascot'); mc.setAttribute('data-mood', st.done ? 'happy' : 'idle'); say.appendChild(mc); panel.mascot = mc; }
    say.appendChild(el('div', { class: 'gbubble', html: m.goal }));
    panel.appendChild(say);
    if (m.explain) { const d = el('details', { class: 'gexp' }); d.appendChild(el('summary', { text: 'Comment ça marche ?' })); d.appendChild(el('p', { html: m.explain })); if (state.cur === 0) d.open = true; panel.appendChild(d); }
    const crit = el('ul', { class: 'gcrit' });
    m.criteria.forEach((c) => crit.appendChild(el('li', { text: c })));
    if (st.done) [...crit.children].forEach((li) => li.classList.add('ok'));
    panel.appendChild(crit);
    const bareme = el('p', { class: 'gbareme' });
    const showBareme = () => {
      const cur = state.missions[m.id] || {};
      bareme.innerHTML = 'Si tu réussis maintenant : <b>' + pts(pointsNow(cur)) + '</b>. Barème : 3 sans indice · 2 avec 1 indice · 1,5 avec 2 · 1 avec 3 · 0 avec la solution.';
    };
    showBareme();
    panel.appendChild(bareme);
    const hint = el('div', { class: 'ghint', hidden: '' });
    const res = el('div', { class: 'gres', hidden: '' });
    const used = st.hints || 0;
    const btnHint = el('button', { type: 'button', class: 'gbtn hint', text: '💡 Indice' + (m.hints.length ? ' (' + Math.min(used, m.hints.length) + '/' + m.hints.length + ')' : '') });
    const showHints = (n) => { if (n > 0) { hint.hidden = false; hint.innerHTML = m.hints.slice(0, n).map((h, i) => '<b>Indice ' + (i + 1) + ' :</b> ' + h).join('<br>'); } };
    showHints(Math.min(used, m.hints.length));
    btnHint.onclick = () => {
      const s = state.missions[m.id] = state.missions[m.id] || {};
      s.hints = Math.min((s.hints || 0) + 1, m.hints.length);
      store(); showHints(s.hints);
      btnHint.textContent = '💡 Indice (' + s.hints + '/' + m.hints.length + ')';
      showBareme();
      o.say('idle', s.hints >= m.hints.length ? 'Tu as tous les indices ! Tu peux y arriver.' : 'Voici un indice. Lis-le bien !');
      if (s.hints >= m.hints.length) btnSol.hidden = false;
    };
    const btnCheck = el('button', { type: 'button', class: 'gbtn', text: '✔ Vérifier mon programme' });
    btnCheck.onclick = () => verify(btnCheck, res, crit);
    const btnNext = el('button', { type: 'button', class: 'gbtn next', text: state.cur + 1 < course.missions.length ? 'Mission suivante →' : 'Terminer le parcours' });
    btnNext.hidden = !st.done;
    btnNext.onclick = () => (state.cur + 1 < course.missions.length ? goTo(state.cur + 1) : finish());
    const btnSol = el('button', { type: 'button', class: 'gbtn light', text: 'Voir la solution (0 point)' });
    btnSol.hidden = !((st.fails || 0) >= 3 || used >= m.hints.length);
    btnSol.onclick = () => {
      if (!confirm('Remplacer ton programme par la solution ? Cette mission rapportera 0 point, mais tu pourras l\'étudier et passer à la suite.')) return;
      const s = state.missions[m.id] = state.missions[m.id] || {};
      s.solution = true; store(); showBareme();
      o.loadState(m.solution());
      o.ws.cleanUp();
      o.say('idle', 'Voici une solution. Lis-la bloc par bloc, puis clique sur « Vérifier ».');
    };
    panel.appendChild(el('div', { class: 'gbtns' }, [btnCheck, btnHint, btnNext, btnSol]));
    panel.appendChild(res);
    const info = el('div', { class: 'ginfo', hidden: '' });
    panel.appendChild(info);
    panel.appendChild(hint);
    if (st.done) panel.appendChild(el('div', { class: 'gpts' + (st.points > 0 ? '' : ' zero'), text: 'Points gagnés : ' + fmt(st.points || 0) + ' / 3' }));
    panel.btnNext = btnNext;
  }

  async function verify(btn, res, crit) {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    const m = mission();
    res.hidden = false; res.className = 'gres work'; res.textContent = course.robot ? 'Je teste ton programme sur le robot virtuel…' : 'Je teste ton programme sur la carte virtuelle…';
    { const info = panel.querySelector('.ginfo'); if (info) info.hidden = true; }
    o.say('work', 'Je teste ton programme… Regarde le simulateur !');
    if (panel.mascot) panel.mascot.setAttribute('data-mood', 'work');
    o.showTab('sim');
    const stage = openStage(m);
    const prevSpeed = o.sim.speed || 1;
    let r;
    try { r = await m.check(tester()); } catch (e) { r = { ok: false, msg: 'Le test a rencontré un problème : ' + (e && e.message ? e.message : e) }; }
    o.sim.stop();
    o.sim.setSpeed(prevSpeed);
    if (o.sim.hw.robot && o.sim.hw.robot.caption) o.sim.hw.robot.caption('');
    { const c = document.getElementById('gcaption'); if (c) c.hidden = true; }
    if (root.SimCore.fingersOff) root.SimCore.fingersOff();
    const s = state.missions[m.id] = state.missions[m.id] || {};
    if (r.ok) {
      const won = pointsNow(s);
      s.points = s.done ? Math.max(s.points || 0, won) : won;
      s.done = true;
      res.className = 'gres ok'; res.textContent = r.msg || 'Bravo, mission réussie !';
      [...crit.children].forEach((li) => { li.classList.remove('ko'); li.classList.add('ok'); });
      o.say(won > 0 ? 'happy' : 'idle', won > 0 ? 'Mission réussie : ' + pts(won) + ' !' + (state.cur + 1 < course.missions.length ? ' Passe à la suivante !' : '')
        : 'Mission terminée avec la solution : 0 point. Essaie de bien la comprendre !');
      if (root.ArduinoArt) root.ArduinoArt.confetti();
      store(); render();
      if (panel.btnNext) panel.btnNext.classList.add('blink');   // invite à passer à la suite
      if (panel.mascot) panel.mascot.setAttribute('data-mood', 'happy');
      stage.success(r.msg || 'Bravo, mission réussie !', won);
      const resNew = panel.querySelector('.gres'); resNew.hidden = false; resNew.className = 'gres ok'; resNew.textContent = r.msg || 'Bravo, mission réussie !';
    } else {
      s.fails = (s.fails || 0) + 1; store();
      res.className = 'gres ko'; res.textContent = r.msg;
      if (panel.mascot) panel.mascot.setAttribute('data-mood', 'oops');
      const info = panel.querySelector('.ginfo');
      if (info) { info.hidden = !r.info; info.innerHTML = r.info || ''; }
      stage.fail(r.msg, r.info);
      if (r.crit != null && crit.children[r.crit]) { [...crit.children].forEach((li, i) => li.classList.toggle('ok', i < r.crit)); crit.children[r.crit].classList.add('ko'); }
      o.say('oops', 'Pas encore… Lis le message, corrige, puis vérifie à nouveau.');
      if (s.fails >= 3) { const b = [...panel.querySelectorAll('.gbtn.light')].find((x) => /solution/.test(x.textContent)); if (b) b.hidden = false; }
    }
    btn.disabled = false;
    busy = false;
  }

  /* ----- Scène de vérification : le simulateur s'affiche en grand au milieu de l'écran pendant le test ----- */
  function openStage(m) {
    closeStage();
    const sp = document.getElementById('simPanel');
    const home = { parent: sp.parentNode, next: sp.nextSibling };
    const status = el('p', { class: 'gstage-status', text: course.robot ? 'Je teste ton programme sur le robot virtuel… Regarde bien !' : 'Je teste ton programme sur la carte virtuelle… Regarde bien !' });
    const slot = el('div', { class: 'gstage-sim' });
    const foot = el('div', { class: 'gstage-foot' });
    const card = el('div', { class: 'gstage-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Vérification de la mission' }, [
      el('div', { class: 'gstage-head' }, [el('b', { text: 'Mission ' + (state.cur + 1) + ' : ' + m.title }), status]), slot, foot]);
    const ov = el('div', { class: 'gstage' + (course.robot ? ' robot' : '') }, [card]);
    document.body.appendChild(ov);
    slot.appendChild(sp);
    slot.setAttribute('inert', '');   // ni clic ni clavier dans le simulateur pendant le test
    sp.hidden = false;
    const repaint = () => { const r = o.sim.hw && o.sim.hw.robot; if (r && r.canvas && r.canvas.isConnected) r.paint(); };
    requestAnimationFrame(repaint);
    let done = false;
    const close = () => {
      if (!ov.isConnected) return;
      document.removeEventListener('keydown', onKey);
      if (home.parent) home.parent.insertBefore(sp, home.next && home.next.parentNode === home.parent ? home.next : null);
      ov.remove();
      requestAnimationFrame(repaint);
      stageClose = null;
    };
    const onKey = (e) => { if (e.key === 'Escape' && done) close(); };
    document.addEventListener('keydown', onKey);
    stageClose = close;
    const big = (text, cls, fn) => el('button', { type: 'button', class: 'gbtn gstage-btn ' + (cls || ''), text: text, onclick: fn });
    return {
      success(msg, won) {
        done = true;
        status.className = 'gstage-status ok';
        status.textContent = '🎉 ' + msg;
        ov.classList.add('won');
        // les confettis tombent, puis le gros bouton « Mission suivante » apparaît
        setTimeout(() => {
          if (!ov.isConnected) return;
          const last = state.cur + 1 >= course.missions.length;
          foot.appendChild(el('div', { class: 'gstage-pts', text: won > 0 ? '+ ' + pts(won) : 'Mission terminée avec la solution : 0 point' }));
          const next = big(last ? 'Terminer le parcours 🏁' : 'Mission suivante →', 'next blink', () => { close(); if (last) finish(); else goTo(state.cur + 1); });
          foot.appendChild(next);
          foot.appendChild(big('Rester sur cette mission', 'light', close));
          next.focus({ preventScroll: true });
          foot.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }, 1700);
      },
      fail(msg, info) {
        done = true;
        status.className = 'gstage-status ko';
        status.textContent = msg;
        if (info) foot.appendChild(el('div', { class: 'ginfo gstage-info', html: info }));
        const b = big('Corriger mon programme', '', close);
        foot.appendChild(b);
        b.focus({ preventScroll: true });
        card.scrollTop = 0;
      },
      close: close,
    };
  }
  let stageClose = null;
  function closeStage() { if (stageClose) stageClose(); }

  /* Bouton du bandeau pendant le mode guidé : petit menu « Changer de parcours » / « Quitter le mode guidé » */
  let gmenu = null;
  function toggleMenu() {
    if (gmenu) { gmenu.remove(); gmenu = null; return; }
    const r = o.button.getBoundingClientRect();
    const item = (text, fn) => el('button', { type: 'button', text: text, onclick: () => { gmenu.remove(); gmenu = null; fn(); } });
    gmenu = el('div', { class: 'gmenu', role: 'menu' }, [item('↩ Changer de parcours', () => picker()), item('✖ Quitter le mode guidé', () => exit())]);
    gmenu.style.top = (r.bottom + 8) + 'px';
    gmenu.style.left = r.left + 'px';
    document.body.appendChild(gmenu);
    const w = gmenu.getBoundingClientRect();
    if (w.right > innerWidth - 8) gmenu.style.left = Math.max(8, innerWidth - 8 - w.width) + 'px';
    gmenu.querySelector('button').focus();
    setTimeout(() => document.addEventListener('click', function off(e) { if (gmenu && !gmenu.contains(e.target)) { gmenu.remove(); gmenu = null; } document.removeEventListener('click', off); }), 0);
  }

  /* ----- Navigation entre missions ----- */
  function loadMissionProgram() {
    const m = mission(), st = state.missions[m.id] || {};
    o.ws.updateToolbox(reducedToolbox(m.blocks));
    o.loadState(st.program || m.start());
  }
  function goTo(i) {
    if (busy) return;
    o.sim.stop();
    state.cur = i; store();
    loadMissionProgram();
    render();
    o.say('idle', 'Mission ' + (i + 1) + ' : ' + mission().title + '. Lis la consigne, puis construis ton programme !');
  }
  function finish() {
    state.finished = true;
    store();
    if (o.progress && o.progress.finish) safe(() => o.progress.finish(course, state, summary()));
    const sm = summary();
    panel.innerHTML = '';
    panel.appendChild(el('h3', { class: 'gtitle', text: '🏆 Parcours terminé !' }));
    panel.appendChild(el('p', { class: 'ggoal', text: 'Tu as gagné ' + fmt(sm.total) + ' points sur ' + sm.max + ' (note : ' + fmt(sm.note20) + ' / 20). ' + (course.finish || '') }));
    panel.appendChild(el('p', { class: 'gexp', text: course.robot ? 'Téléverse ton dernier programme dans le vrai robot.' : 'Téléverse ton dernier programme dans la vraie carte.' }));
    panel.appendChild(el('div', { class: 'gbtns' }, [
      el('button', { type: 'button', class: 'gbtn', text: '📄 Mon bilan', onclick: () => report() }),
      el('button', { type: 'button', class: 'gbtn light', text: 'Revoir les missions', onclick: () => render() })]));
    o.say('happy', 'Bravo, tu as terminé le parcours « ' + course.title + ' » !');
    report();
    if (root.ArduinoArt) root.ArduinoArt.confetti();
  }

  /* ----- Bilan de fin de parcours : grande fenêtre, et PDF à télécharger avec le nom de l'élève ----- */
  const KEY_NOM = 'blocs-nom-eleve';
  function report() {
    closeStage();
    const sm = summary();
    const rows = sm.missions.map((m) => el('tr', { class: m.done ? (m.solution ? 'sol' : 'ok') : 'ko' }, [
      el('td', { text: String(m.n) }), el('td', { text: m.title }),
      el('td', { text: m.done ? (m.solution ? '✔ avec la solution' : '✔ réussie') : '✘ pas réussie' }),
      el('td', { text: String(m.hints) }), el('td', { text: fmt(m.points) + ' / 3' })]));
    const table = el('table', { class: 'gbilan' }, [
      el('thead', {}, [el('tr', {}, ['N°', 'Mission', 'Résultat', 'Indices', 'Points'].map((t) => el('th', { text: t })))]),
      el('tbody', {}, rows)]);
    const name = el('input', { type: 'text', class: 'gname', placeholder: 'Ton prénom et ton nom', maxlength: '60', 'aria-label': 'Ton prénom et ton nom' });
    name.value = (o.studentName && o.studentName()) || safe(() => localStorage.getItem(KEY_NOM)) || '';
    const dl = el('button', { type: 'button', class: 'gbtn gstage-btn', text: '📄 Télécharger le bilan (PDF)' });
    const upd = () => { dl.disabled = name.value.trim().length < 2; };
    name.addEventListener('input', upd); upd();
    const msg = el('p', { class: 'gexp' });
    dl.onclick = async () => {
      const nm = name.value.trim();
      safe(() => localStorage.setItem(KEY_NOM, nm));
      dl.disabled = true; msg.textContent = 'Préparation du PDF…';
      try { await pdf(sm, nm); msg.textContent = 'Le bilan est enregistré dans tes téléchargements.'; }
      catch (e) { msg.textContent = 'Impossible de créer le PDF : ' + (e && e.message ? e.message : e); }
      upd();
    };
    const card = el('div', { class: 'gstage-card gbilan-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bilan du parcours' }, [
      el('div', { class: 'gstage-head' }, [el('b', { text: '🏆 Bilan du parcours « ' + course.title + ' »' })]),
      el('div', { class: 'gnote' }, [el('span', { text: fmt(sm.note20) }), el('small', { text: '/ 20' })]),
      el('p', { class: 'gnote-sub', text: sm.done + ' mission' + (sm.done > 1 ? 's' : '') + ' réussie' + (sm.done > 1 ? 's' : '') + ' sur ' + sm.missions.length + ' · ' + fmt(sm.total) + ' points sur ' + sm.max }),
      table,
      el('p', { class: 'gbareme', text: 'Barème par mission : 3 points sans indice · 2 avec 1 indice · 1,5 avec 2 · 1 avec 3 · 0 avec la solution.' }),
      el('div', { class: 'gstage-foot' }, [name, dl, el('button', { type: 'button', class: 'gbtn gstage-btn light', text: 'Fermer', onclick: () => close() })]),
      msg]);
    const ov = el('div', { class: 'gstage' }, [card]);
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); stageClose = null; };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    stageClose = close;
    document.body.appendChild(ov);
    (name.value ? dl : name).focus();
  }
  /* jsPDF n'est chargé que lorsqu'on en a besoin */
  function loadPdfLib() {
    if (root.jspdf) return Promise.resolve(root.jspdf);
    return new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'vendor/jspdf/jspdf.umd.min.js';
      sc.onload = () => (root.jspdf ? res(root.jspdf) : rej(new Error('jsPDF introuvable')));
      sc.onerror = () => rej(new Error('fichier vendor/jspdf/jspdf.umd.min.js introuvable'));
      document.head.appendChild(sc);
    });
  }
  async function pdf(sm, nm) {
    const { jsPDF } = await loadPdfLib();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const clean = (t) => String(t).replace(/[’‘]/g, "'").replace(/[^\x20-\xFF«»œŒ€]/g, '');
    const L = 18, R = 192;
    doc.setFillColor(52, 179, 74); doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text("L'atelier du codeur", L, 13);
    doc.setFontSize(12); doc.setFont('helvetica', 'normal');
    doc.text(clean('Bilan du parcours guidé « ' + sm.course + ' »'), L, 21);
    doc.setTextColor(20, 33, 61);
    doc.setFontSize(12);
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFont('helvetica', 'bold'); doc.text('Élève :', L, 38); doc.setFont('helvetica', 'normal'); doc.text(clean(nm), L + 18, 38);
    doc.setFont('helvetica', 'bold'); doc.text('Date :', L, 45); doc.setFont('helvetica', 'normal'); doc.text(date, L + 18, 45);
    // note
    doc.setDrawColor(52, 179, 74); doc.setLineWidth(0.8); doc.roundedRect(138, 32, 54, 22, 3, 3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(26, 111, 62);
    doc.text(fmt(sm.note20) + ' / 20', 165, 45, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(fmt(sm.total) + ' points sur ' + sm.max, 165, 51, { align: 'center' });
    doc.setTextColor(20, 33, 61);
    // tableau
    let y = 66;
    const cols = [L, L + 12, L + 98, L + 140, L + 158];
    doc.setFillColor(233, 251, 244); doc.rect(L, y - 6, R - L, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    ['N°', 'Mission', 'Résultat', 'Indices', 'Points'].forEach((t, i) => doc.text(t, cols[i] + 2, y));
    doc.setFont('helvetica', 'normal');
    for (const m of sm.missions) {
      const title = doc.splitTextToSize(clean(m.title), 82);
      const h = Math.max(1, title.length) * 5 + 4;
      y += 3;
      doc.setDrawColor(220, 226, 236); doc.setLineWidth(0.2); doc.line(L, y, R, y);
      y += 6;
      doc.text(String(m.n), cols[0] + 2, y);
      doc.text(title, cols[1] + 2, y);
      if (m.done && !m.solution) doc.setTextColor(26, 111, 62); else if (!m.done) doc.setTextColor(163, 32, 63); else doc.setTextColor(160, 90, 0);
      doc.text(m.done ? (m.solution ? 'Avec la solution' : 'Réussie') : 'Pas réussie', cols[2] + 2, y);
      doc.setTextColor(20, 33, 61);
      doc.text(String(m.hints), cols[3] + 2, y);
      doc.text(fmt(m.points) + ' / 3', cols[4] + 2, y);
      y += h - 9;
    }
    y += 3; doc.setDrawColor(20, 33, 61); doc.setLineWidth(0.4); doc.line(L, y, R, y);
    y += 7; doc.setFont('helvetica', 'bold');
    doc.text('Total', cols[1] + 2, y); doc.text(sm.done + ' / ' + sm.missions.length + ' réussies', cols[2] + 2, y); doc.text(fmt(sm.total) + ' / ' + sm.max, cols[4] + 2, y);
    y += 12; doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(93, 106, 130);
    doc.text('Barème par mission : 3 points sans indice, 2 avec 1 indice, 1,5 avec 2, 1 avec 3, 0 avec la solution.', L, y);
    doc.text('Note sur 20 = points obtenus / ' + sm.max + ' x 20 (arrondie au demi-point).', L, y + 5);
    doc.text(clean('Bilan créé le ' + date + ' par L\'atelier du codeur.'), L, 285);
    const slug = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    doc.save('bilan-' + slug(sm.course) + '-' + slug(nm) + '.pdf');
  }

  /* Écran de choix du parcours */
  function picker() {
    if (busy) return;
    o.sim.stop();
    course = null; GuideMode.course = null; state = null;   // plus de mission en cours : rien n'est enregistré
    o.ws.updateToolbox(reducedToolbox(['arduino_setup', 'arduino_loop']));
    o.loadState(root.GuideKit ? root.GuideKit.empty() : { board: 'nano', blocks: { languageVersion: 0, blocks: [] } });
    panel.innerHTML = '';
    panel.appendChild(el('h3', { class: 'gtitle', text: 'Choisis un parcours' }));
    const say = el('div', { class: 'gsay' });
    const src = document.getElementById('mascot');
    if (src) { const mc = src.cloneNode(true); mc.removeAttribute('id'); mc.setAttribute('class', 'mascot gmascot'); mc.setAttribute('data-mood', 'happy'); say.appendChild(mc); }
    say.appendChild(el('div', { class: 'gbubble', text: 'Chaque parcours est une suite de missions, de la plus facile à la plus difficile. Par lequel veux-tu commencer ?' }));
    panel.appendChild(say);
    const grid = el('div', { class: 'gcourses' });
    for (const c of courses) {
      const st = loadState(c);
      const done = c.missions.filter((m) => (st.missions[m.id] || {}).done).length;
      const pts0 = c.missions.reduce((t, m) => { const s2 = st.missions[m.id]; return t + (s2 && s2.done ? s2.points || 0 : 0); }, 0);
      grid.appendChild(el('button', { type: 'button', class: 'gcourse' + (done === c.missions.length ? ' finished' : ''), 'data-course': c.id, onclick: () => choose(c.id) }, [
        el('span', { class: 'gcicon', text: c.icon || '🎯' }),
        el('span', { class: 'gctext' }, [el('b', { text: c.title }), el('small', { text: c.description || '' }),
          el('em', { text: c.missions.length + ' missions · ' + (done ? done + ' réussie' + (done > 1 ? 's' : '') + ' · ' + fmt(pts0) + ' / ' + c.missions.length * 3 + ' points' : 'pas encore commencé') })]),
      ]));
    }
    panel.appendChild(grid);
    o.say('happy', 'Choisis un parcours dans le panneau à droite !');
  }
  function choose(id) {
    const c = courses.find((x) => x.id === id) || courses[0];
    course = c;
    GuideMode.course = c;
    state = loadState(c);
    loadMissionProgram();
    render();
    o.showTab('sim');
    o.say('happy', 'Parcours « ' + c.title + ' » ! Lis la mission en haut à droite. Tu peux demander un indice à tout moment.');
  }
  function enter(courseId) {
    if (GuideMode.active) return;
    safe(() => localStorage.setItem(LIBRE, JSON.stringify(o.snapshot())));
    GuideMode.active = true;
    document.body.classList.add('guided');
    o.button.classList.add('on');
    o.button.querySelector('span').textContent = 'Mode guidé ▾';
    if (o.locked) { o.button.hidden = true; o.button.style.display = 'none'; }   // parcours imposé (plateforme) : pas de changement de parcours
    o.setBoard('nano');
    panel.hidden = false;
    if (courseId) choose(courseId); else picker();
  }
  function exit() {
    if (!GuideMode.active || busy) return;
    closeStage();
    o.sim.stop();
    GuideMode.active = false;
    document.body.classList.remove('guided');
    o.button.classList.remove('on');
    o.button.querySelector('span').textContent = 'Mode guidé';
    panel.hidden = true;
    o.ws.updateToolbox(o.fullToolbox);
    const libre = safe(() => JSON.parse(localStorage.getItem(LIBRE)));
    if (libre) o.loadState(libre);
    o.say('idle', 'Retour au mode libre : ton programme est de retour.');
  }
  /* Appelé à chaque modification : le programme de la mission est mémorisé. */
  function saveProgram(snapshot) {
    if (!GuideMode.active || !course || !state) return;
    const m = mission();
    const s = state.missions[m.id] = state.missions[m.id] || {};
    s.program = snapshot;
    store();
  }

  const GuideMode = {
    active: false,
    /* options : ws, sim, fullToolbox, loadState, snapshot, showTab, say, log, setBoard, panel, button, course, key */
    course: null,
    init(opts) {
      o = opts; courses = opts.courses || [opts.course]; panel = opts.panel;
      const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      o.button.onclick = () => (GuideMode.active ? (busy || o.locked ? null : toggleMenu()) : enter());
    },
    enter: enter, exit: exit, saveProgram: saveProgram, goTo: (i) => goTo(i), choose: (id) => choose(id), picker: () => picker(),
    get courses() { return courses; },
    summary: () => (course && state ? summary() : null),
    report: () => report(),
    get mission() { return course && state ? mission() : null; },
    get busy() { return busy; },
  };
  root.GuideMode = GuideMode;
})(typeof window !== 'undefined' ? window : globalThis);
