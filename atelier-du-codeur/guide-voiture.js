/* Parcours guidé « Voiture autonome » : le Cagett'bot devient une voiture qui suit la route (la ligne noire)
   et s'arrête devant un obstacle. Les programmes sont testés sur la piste du simulateur. */
(function (root) {
  'use strict';
  const K = root.GuideKit;
  const { prog, ifB, cmp, move, stop, led, lineS, dist, follow, ok, ko, BASE, orphanMsg, get, set, n } = K;
  const OBST = { x: 125, y: 25 };          // obstacle posé sur la route, droit devant la voiture au départ
  const VIT = K.V('voiture_vitesse');
  const freine = (extra) => ifB([[cmp('LT', dist(), n(20)), [led(true), stop]], [lineS('L'), [led(false), move('LEFT', 60)]], [lineS('R'), [led(false), move('RIGHT', 60)]]], [led(false), move('FWD', 60)].concat(extra || []));
  const freineSansLed = () => ifB([[cmp('LT', dist(), n(20)), [stop]], [lineS('L'), [move('LEFT', 60)]], [lineS('R'), [move('RIGHT', 60)]]], [move('FWD', 60)]);
  const stopped = (p) => p.l === 0 && p.r === 0;

  /* Fait rouler la voiture et vérifie qu'elle reste sur la route. Renvoie la distance parcourue, ou un échec. */
  async function drive(T, ms, crit) {
    let path = 0, last = T.pose();
    for (let t = 0; t < ms; t += 150) {
      await T.wait(150);
      const p = T.pose();
      path += Math.hypot(p.x - last.x, p.y - last.y);
      last = p;
      if (T.offTrack() > 7) return { fail: ko(path < 20 ? 'La voiture quitte la route tout de suite. Si le capteur GAUCHE voit du noir, il faut tourner à GAUCHE (et pareil à droite).'
        : 'La voiture a quitté la route après ' + Math.round(path) + ' cm. Vérifie : gauche voit noir → tourner à gauche, droit voit noir → tourner à droite.', crit) };
    }
    return { path: path };
  }
  /* La voiture roule vers l'obstacle et doit s'arrêter avant de le toucher. */
  async function brake(T, crit) {
    const t = await T.until(() => stopped(T.pose()), 9000, 30);
    await T.wait(600);
    const p = T.pose();
    if (t < 0 || p.d < 4) return ko('La voiture percute l\'obstacle ! Elle doit s\'arrêter quand la distance est plus petite que 20 cm.', crit);
    if (p.d > 26) return ko('La voiture s\'arrête trop tôt (à ' + p.d + ' cm de l\'obstacle). Utilise 20 cm dans la condition.', crit);
    return null;
  }

  const missions = [
    /* 1 */ {
      id: 'route', title: 'Rester sur la route',
      goal: 'Ta voiture autonome doit <b>suivre la route</b> : le ruban noir de la piste, virages compris.',
      explain: 'Une voiture autonome « voit » la route avec ses capteurs. Ici, deux capteurs de ligne encadrent le ruban noir : si le capteur <b>gauche</b> voit du noir, la route tourne à gauche, donc la voiture tourne <b>à gauche</b> (et pareil à droite). Sinon, elle va tout droit.',
      criteria: ['La voiture avance', 'Elle tourne quand la route tourne', 'Elle roule 10 secondes sans quitter la route'],
      blocks: BASE.concat(['controls_if', 'robot_line', 'robot_move', 'robot_stop']),
      hints: [
        'Prends un bloc « si » (catégorie Logique) et clique deux fois sur son <b>+</b> : tu obtiens « si … sinon si … sinon ».',
        'Si « capteur de ligne gauche voit du noir » → tourner à gauche. Sinon si « capteur droit voit du noir » → tourner à droite.',
        'Sinon (les deux voient du blanc) → avancer à 60 %. Le tout dans « répéter indéfiniment ».'],
      start: K.empty,
      solution: () => prog([], [follow()]),
      async check(T) {
        if (!T.has('robot_line')) return ko('La voiture doit regarder la route : utilise les blocs « capteur de ligne … voit du noir ? ».', 1);
        if (!T.has('robot_move')) return ko('Il faut faire rouler la voiture : bloc « robot : avancer ».', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ obstacle: false });
        T.caption('Test : la voiture doit suivre la route pendant 10 secondes…');
        const r = await drive(T, 10000, 1);
        if (r.fail) return r.fail;
        if (r.path < 80) return ko('La voiture n\'avance presque pas (' + Math.round(r.path) + ' cm en 10 s). Dans « sinon », elle doit avancer.', 0);
        return ok('Bravo ! Ta voiture a roulé ' + Math.round(r.path) + ' cm sans quitter la route.');
      },
    },
    /* 2 */ {
      id: 'freiner', title: 'Freiner devant un obstacle',
      goal: 'Un carton est posé <b>sur la route</b>. La voiture suit la route, mais elle doit <b>s\'arrêter</b> à moins de 20 cm de l\'obstacle, sans le toucher.',
      explain: 'La sécurité passe avant tout : à chaque tour de boucle, la voiture regarde d\'abord la distance mesurée par le capteur à ultrasons. Si l\'obstacle est trop près, elle s\'arrête. Sinon seulement, elle suit la route. On ajoute donc une condition <b>tout en haut</b> du « si ».',
      criteria: ['La voiture suit la route', 'Elle s\'arrête avant l\'obstacle (moins de 20 cm)', 'Elle ne repart pas tant que l\'obstacle est là'],
      blocks: BASE.concat(['controls_if', 'robot_line', 'robot_move', 'robot_stop', 'robot_distance', 'logic_compare', 'math_number']),
      hints: [
        'Ton programme de la mission 1 est déjà là. Clique sur le <b>+</b> du « si » pour ajouter un « sinon si ».',
        'La première condition doit être « distance de l\'obstacle (cm) <b>&lt; 20</b> » (blocs Logique « = » et Robot « distance »).',
        'Si la condition est vraie → « robot : s\'arrêter ». Il faudra peut-être déplacer les autres blocs d\'une case vers le bas.'],
      start: () => prog([], [follow()]),
      solution: () => prog([], [freineSansLed()]),
      async check(T) {
        if (!T.has('robot_distance')) return ko('La voiture doit mesurer la distance : bloc « distance de l\'obstacle (cm) ».', 1);
        if (!T.has('robot_stop')) return ko('Il manque « robot : s\'arrêter ».', 1);
        if (!T.has('robot_line')) return ko('La voiture doit toujours suivre la route avec les capteurs de ligne.', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ obstacle: OBST });
        T.caption('Test 1 / 3 : la voiture doit rouler sur la route');
        await T.wait(900);
        let p = T.pose();
        if (stopped(p) || (p.l <= 0 && p.r <= 0)) return ko('La voiture ne démarre pas : quand la route est libre, elle doit suivre la ligne.', 0);
        T.caption('Test 2 / 3 : un obstacle est sur la route → la voiture doit freiner avant');
        const b = await brake(T, 1);
        if (b) return b;
        if (T.offTrack() > 7) return ko('La voiture a quitté la route avant de freiner : vérifie le suivi de ligne.', 0);
        p = T.pose();
        T.caption('Test 3 / 3 : l\'obstacle est toujours là → la voiture doit rester arrêtée');
        await T.wait(1500);
        const q = T.pose();
        if (!stopped(q) || Math.hypot(q.x - p.x, q.y - p.y) > 1) return ko('La voiture repart alors que l\'obstacle est toujours là : la condition « distance < 20 » doit être vérifiée en premier.', 2);
        return ok('Bien freiné ! La voiture s\'est arrêtée à ' + p.d + ' cm de l\'obstacle.');
      },
    },
    /* 3 */ {
      id: 'repartir', title: 'Feux stop et redémarrage',
      goal: 'Quand la voiture freine devant l\'obstacle, elle allume ses <b>feux</b> (la LED). Quand l\'obstacle s\'en va, elle éteint la LED et <b>repart</b> sur la route.',
      explain: 'Comme une vraie voiture : les feux préviennent les autres qu\'on est arrêté. Comme le programme tourne en boucle, la voiture redémarre toute seule dès que la distance redevient grande.',
      criteria: ['La LED s\'allume quand la voiture s\'arrête', 'La voiture repart quand la route est libre', 'La LED s\'éteint quand elle roule'],
      blocks: BASE.concat(['controls_if', 'robot_line', 'robot_move', 'robot_stop', 'robot_distance', 'logic_compare', 'math_number', 'robot_led']),
      hints: [
        'Ajoute « robot : LED allumer » juste avant « s\'arrêter ».',
        'La LED doit s\'éteindre quand la voiture roule : mets « LED éteindre » dans les branches où elle tourne ou avance.',
        'Astuce : tu peux aussi éteindre la LED une seule fois au début de la boucle… mais alors elle clignote très vite pendant l\'arrêt. Le plus propre : une LED éteinte dans chaque branche qui roule.'],
      start: () => prog([], [freineSansLed()]),
      solution: () => prog([], [freine()]),
      async check(T) {
        if (!T.has('robot_led')) return ko('Il faut utiliser le bloc « robot : LED … » pour les feux.', 0);
        if (!T.has('robot_distance')) return ko('La voiture doit mesurer la distance : bloc « distance de l\'obstacle (cm) ».', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ obstacle: OBST });
        T.caption('Test 1 / 3 : la voiture roule → feux éteints');
        await T.wait(900);
        let p = T.pose();
        if (stopped(p)) return ko('La voiture ne démarre pas : quand la route est libre, elle doit suivre la ligne.', 1);
        if (p.led) return ko('La LED est allumée alors que la voiture roule : éteins-la quand elle avance ou tourne.', 2);
        T.caption('Test 2 / 3 : obstacle → la voiture freine et allume ses feux');
        const b = await brake(T, 0);
        if (b) return b;
        if (!T.pose().led) return ko('La voiture s\'arrête bien, mais la LED doit s\'allumer pendant l\'arrêt.', 0);
        T.moveObstacle(null, null, false);
        T.caption('Test 3 / 3 : j\'enlève l\'obstacle → la voiture repart, feux éteints');
        await T.wait(1000);
        p = T.pose();
        if (stopped(p)) return ko('L\'obstacle a disparu mais la voiture ne repart pas : tout doit être dans « répéter indéfiniment ».', 1);
        const r = await drive(T, 3000, 1);
        if (r.fail) return r.fail;
        if (T.pose().led) return ko('La voiture est repartie, mais sa LED est restée allumée : éteins-la quand elle roule.', 2);
        return ok('Parfait : feux allumés à l\'arrêt, et la voiture repart dès que la route est libre.');
      },
    },
    /* 4 */ {
      id: 'ralentir', title: 'Ralentir à l\'approche',
      goal: 'Une voiture prudente <b>ralentit</b> avant de s\'arrêter : à moins de <b>50 cm</b> d\'un obstacle, elle roule à <b>35 %</b> ; à moins de <b>20 cm</b>, elle s\'arrête. Sinon, elle roule à 60 %.',
      explain: 'On range la vitesse dans une <b>variable</b> « vitesse ». Au début de chaque tour de boucle, on choisit la vitesse selon la distance ; ensuite, les blocs de suivi de route utilisent cette variable au lieu d\'un nombre fixe.',
      criteria: ['Loin de l\'obstacle : vitesse 60 %', 'Entre 20 et 50 cm : vitesse réduite (35 %)', 'À moins de 20 cm : arrêt'],
      blocks: BASE.concat(['controls_if', 'robot_line', 'robot_move', 'robot_stop', 'robot_distance', 'logic_compare', 'math_number', 'robot_led', 'VARIABLE']),
      hints: [
        'Catégorie <b>Variables</b> : crée une variable « vitesse ». En haut de la boucle : « si distance &lt; 50 → mettre vitesse à 35, sinon → mettre vitesse à 60 ».',
        'Dans tes blocs « avancer », « tourner à gauche » et « tourner à droite », remplace le nombre 60 par le bloc « vitesse ».',
        'Garde ensuite le « si distance &lt; 20 → s\'arrêter » de la mission 3 : il doit rester avant le suivi de route.'],
      start: () => prog([], [freine()]),
      solution: () => {
        const v = () => get(VIT);
        return prog([], [
          ifB([[cmp('LT', dist(), n(50)), [set(VIT, n(35))]]], [set(VIT, n(60))]),
          ifB([[cmp('LT', dist(), n(20)), [led(true), stop]], [lineS('L'), [led(false), move('LEFT', v())]], [lineS('R'), [led(false), move('RIGHT', v())]]], [led(false), move('FWD', v())]),
        ], [['vitesse', 'voiture_vitesse']]);
      },
      async check(T) {
        if (!T.has('robot_distance')) return ko('La voiture doit mesurer la distance : bloc « distance de l\'obstacle (cm) ».', 1);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 47, y: 25, th: 0 }, obstacle: { x: 133, y: 25 } });
        T.caption('Test 1 / 3 : obstacle loin (plus de 50 cm) → vitesse normale');
        const fast = [], slow = [];
        let t0 = T.now();
        while (T.now() - t0 < 9000) {
          const p = T.pose();
          if (stopped(p) && p.d < 30) break;
          const m = Math.max(Math.abs(p.l), Math.abs(p.r));
          if (p.d > 56) fast.push(m); else if (p.d > 26 && p.d < 46) slow.push(m);
          if (p.d < 50) T.caption('Test 2 / 3 : obstacle à moins de 50 cm → la voiture doit ralentir');
          await T.wait(40);
        }
        const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
        if (!fast.length || avg(fast) < 50) return ko('Loin de l\'obstacle, la voiture doit rouler à 60 %. Vérifie le « sinon → mettre vitesse à 60 ».', 0);
        if (!slow.length) return ko('Je n\'ai pas pu voir la voiture approcher de l\'obstacle : elle s\'arrête trop tôt ou percute l\'obstacle.', 1);
        if (avg(slow) > 45) return ko('Entre 20 et 50 cm, la voiture ne ralentit pas (vitesse ' + Math.round(avg(slow)) + ' %). Utilise la variable « vitesse » dans tous les blocs de déplacement.', 1);
        if (Math.min(...slow) < 20) return ko('La voiture ralentit tellement qu\'elle s\'arrête avant 20 cm : les moteurs calent sous 20 %. Choisis 35 %.', 1);
        T.caption('Test 3 / 3 : à moins de 20 cm → arrêt');
        const b = await brake(T, 2);
        if (b) return b;
        return ok('Conduite prudente ! La voiture ralentit (' + Math.round(avg(slow)) + ' %) puis s\'arrête à ' + T.pose().d + ' cm.');
      },
    },
    /* 5 */ {
      id: 'depart', title: 'Voiture autonome complète',
      goal: 'Le programme final : la voiture <b>attend le bouton MODE</b> pour partir, puis elle suit la route, freine devant les obstacles et repart quand la route est libre.',
      explain: 'Un bouton de démarrage permet de poser la voiture sur la piste avant qu\'elle ne parte. La boucle « répéter jusqu\'à … » de « au démarrage » attend l\'appui ; ensuite, « répéter indéfiniment » fait le reste.',
      criteria: ['La voiture attend l\'appui sur MODE', 'Elle suit la route', 'Elle s\'arrête devant l\'obstacle', 'Elle repart quand il disparaît'],
      blocks: BASE.concat(['controls_whileUntil', 'robot_mode', 'controls_if', 'robot_line', 'robot_move', 'robot_stop', 'robot_distance', 'logic_compare', 'math_number', 'robot_led', 'VARIABLE']),
      hints: [
        'Dans « au démarrage », mets « répéter tant que » et choisis <b>« répéter jusqu\'à »</b>.',
        'Sa condition : « bouton MODE appuyé ? » (catégorie Robot). La boucle reste vide : elle sert juste à attendre.',
        'Ton programme de la mission 3 (ou 4) reste dans « répéter indéfiniment ».'],
      start: () => prog([], [freine()]),
      solution: () => prog([{ type: 'controls_whileUntil', fields: { MODE: 'UNTIL' }, inputs: { BOOL: { block: { type: 'robot_mode' } } } }], [freine()]),
      async check(T) {
        if (!T.has('robot_mode') && !T.has('robot_mode_click')) return ko('Il faut utiliser le bloc « bouton MODE appuyé ? ».', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ obstacle: OBST });
        T.caption('Test 1 / 4 : personne n\'appuie sur MODE → la voiture attend');
        const a = T.pose();
        await T.wait(2000);
        const b = T.pose();
        if (!stopped(b) || Math.hypot(b.x - a.x, b.y - a.y) > 1) return ko('La voiture part toute seule ! Mets « répéter jusqu\'à bouton MODE appuyé » dans « au démarrage ».', 0);
        T.caption('Test 2 / 4 : j\'appuie sur MODE → la voiture part sur la route');
        await T.pressMode(300);
        await T.wait(150);
        if (stopped(T.pose())) return ko('Après l\'appui sur MODE, la voiture ne part pas : le suivi de route doit être dans « répéter indéfiniment ».', 1);
        T.caption('Test 3 / 4 : un obstacle est sur la route → la voiture freine');
        const k = await brake(T, 2);
        if (k) return k;
        if (T.offTrack() > 7) return ko('La voiture a quitté la route : vérifie le suivi de ligne.', 1);
        T.moveObstacle(null, null, false);
        T.caption('Test 4 / 4 : la route est libre → la voiture repart');
        await T.wait(800);
        if (stopped(T.pose())) return ko('L\'obstacle a disparu mais la voiture ne repart pas.', 3);
        const r = await drive(T, 4000, 1);
        if (r.fail) return r.fail;
        return ok('Bravo, ta voiture autonome est prête ! Téléverse le programme dans le vrai Cagett\'bot et pose un carton sur sa route.');
      },
    },
  ];

  root.GuideVoiture = {
    id: 'voiture', robot: true, icon: '🚗', title: 'Voiture autonome',
    description: 'Le Cagett\'bot suit la route et s\'arrête devant un obstacle.',
    finish: 'Ta voiture autonome suit la route, ralentit, freine devant les obstacles et repart toute seule !',
    missions: missions,
  };
})(typeof window !== 'undefined' ? window : globalThis);
