/* Parcours guidé « Exploration de la planète Mars » (5e) : le Cagett'bot devient un rover.
   À la fin, le rover explore tout seul : il avance et tourne quand il rencontre un rocher. */
(function (root) {
  'use strict';
  const K = root.GuideKit;
  const { prog, ifB, cmp, move, stop, led, dist, wait, ok, ko, BASE, orphanMsg, n } = K;
  const stopped = (p) => p.l === 0 && p.r === 0;
  const near = (d) => cmp('LT', dist(), n(d));
  const evite = (extra) => ifB([[near(25), [led(true), move('SPIN_R', 60), wait(0.5)]]], [led(false), move('FWD', 60)].concat(extra || []));
  /* place un rocher droit devant le rover, à « d » cm de son centre */
  const ahead = (T, d) => { const p = T.pose(); return { x: p.x + Math.cos(p.th) * d, y: p.y + Math.sin(p.th) * d }; };
  const inArena = (q) => q.x > 12 && q.x < 168 && q.y > 12 && q.y < 108;

  /* Fait rouler le rover vers un rocher posé devant lui ; renvoie la distance minimale et le virage effectué. */
  async function approach(T, ms) {
    const p0 = T.pose();
    let minD = 999, maxTurn = 0, movedAfter = 0, turned = false, last = p0;
    for (let t = 0; t < ms; t += 50) {
      await T.wait(50);
      const p = T.pose();
      if (T.robot().box.on) minD = Math.min(minD, p.d);
      let dth = Math.abs(p.th - p0.th) % (2 * Math.PI); if (dth > Math.PI) dth = 2 * Math.PI - dth;
      maxTurn = Math.max(maxTurn, dth);
      if (dth > 0.7) turned = true;
      if (turned) movedAfter += Math.hypot(p.x - last.x, p.y - last.y);
      last = p;
    }
    return { minD: minD, turn: maxTurn * 180 / Math.PI, movedAfter: movedAfter };
  }

  const missions = [
    /* 1 */ {
      id: 'm_sortie', title: 'Sortir du module',
      goal: 'Le rover vient de se poser sur Mars. Fais-le <b>descendre du module</b> : il avance <b>3 secondes</b>, puis il s\'arrête pour attendre les ordres.',
      explain: 'Sur Mars, le rover est à plusieurs minutes de la Terre par radio : il ne peut pas être piloté en direct. Il exécute un <b>programme</b>. Les blocs placés dans « au démarrage » ne s\'exécutent qu\'une fois.',
      criteria: ['Le rover avance', 'Pendant environ 3 secondes', 'Puis il s\'arrête'],
      blocks: BASE.concat(['robot_move', 'robot_stop', 'wait_time']),
      hints: [
        'Dans « au démarrage » : « robot : avancer à 60 % ».',
        'Puis « attendre 3 secondes » (catégorie Temps).',
        'Et enfin « robot : s\'arrêter ».'],
      start: K.empty,
      solution: () => prog([move('FWD', 60), wait(3), stop], []),
      async check(T) {
        if (!T.has('robot_move')) return ko('Il faut faire avancer le rover : « robot : avancer ».', 0);
        if (!T.has('robot_stop')) return ko('Le rover doit s\'arrêter : ajoute « robot : s\'arrêter ».', 2);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 30, y: 60, th: 0 }, obstacle: false });
        T.caption('Test : le rover doit avancer environ 3 secondes, puis s\'arrêter');
        const t0 = T.now();
        const moving = await T.until(() => !stopped(T.pose()), 1000, 20);
        if (moving < 0) return ko('Le rover ne bouge pas : mets « avancer » dans « au démarrage ».', 0);
        const end = await T.until(() => stopped(T.pose()), 6000, 20);
        if (end < 0) return ko('Le rover ne s\'arrête pas : ajoute « attendre 3 secondes » puis « s\'arrêter ».', 2);
        const dur = (T.now() - t0) / 1000;
        if (dur < 2.4 || dur > 3.6) return ko('Le rover a roulé ' + K.fr(dur) + ' s : il faut 3 secondes (bloc « attendre »).', 1);
        await T.wait(1000);
        if (!stopped(T.pose())) return ko('Le rover repart : tes blocs doivent être dans « au démarrage ».', 2);
        return ok('Le rover est sur le sol martien ! Il a roulé ' + K.fr(dur) + ' s.');
      },
    },
    /* 2 */ {
      id: 'm_alerte', title: 'Détecter les rochers',
      goal: 'Les yeux du rover, c\'est son capteur à ultrasons. Allume la <b>LED d\'alerte</b> quand un rocher est à <b>moins de 25 cm</b>, éteins-la sinon. Le rover reste immobile.',
      explain: 'Le capteur envoie un son trop aigu pour nos oreilles et mesure le temps que met l\'écho pour revenir : il en déduit la distance. Le programme compare cette distance à 25 cm, en boucle.',
      criteria: ['Rocher proche : LED allumée', 'Rien devant : LED éteinte'],
      blocks: BASE.concat(['controls_if', 'robot_distance', 'logic_compare', 'math_number', 'robot_led']),
      hints: [
        'Dans « répéter indéfiniment » : un bloc « si » avec son <b>+</b> pour ajouter « sinon ».',
        'Condition : « distance de l\'obstacle (cm) &lt; 25 » (bloc « = » de Logique, change-le en « &lt; »).',
        'Faire : « LED allumer ». Sinon : « LED éteindre ».'],
      start: K.empty,
      solution: () => prog([], [ifB([[near(25), [led(true)]]], [led(false)])]),
      async check(T) {
        if (!T.has('robot_distance')) return ko('Il faut mesurer la distance : bloc « distance de l\'obstacle (cm) ».', 0);
        if (!T.has('robot_led')) return ko('Il faut le bloc « robot : LED … ».', 1);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 40, y: 60, th: 0 }, obstacle: { x: 140, y: 60 } });
        T.caption('Test 1 / 3 : rocher loin (90 cm) → LED éteinte');
        await T.wait(700);
        if (T.pose().led) return ko('Le rocher est loin, mais la LED est allumée : il faut « sinon → LED éteindre ».', 1);
        T.caption('Test 2 / 3 : rocher à 15 cm → LED allumée');
        T.moveObstacle(63 + 7, 60, true); await T.wait(700);
        if (!T.pose().led) return ko('Le rocher est tout près (' + T.pose().d + ' cm), mais la LED reste éteinte. Vérifie la condition « distance &lt; 25 ».', 0);
        T.caption('Test 3 / 3 : rocher à 40 cm → LED éteinte');
        T.moveObstacle(88 + 7, 60, true); await T.wait(700);
        if (T.pose().led) return ko('À ' + T.pose().d + ' cm, la LED devrait être éteinte : le seuil est 25 cm.', 0);
        if (!stopped(T.pose())) return ko('Pour cette mission, le rover reste immobile.', 1);
        return ok('Le rover voit les rochers : sa LED d\'alerte s\'allume à moins de 25 cm.');
      },
    },
    /* 3 */ {
      id: 'm_stop', title: 'S\'arrêter devant un rocher',
      goal: 'Le rover avance, mais il doit <b>s\'arrêter</b> avant de heurter le rocher (à moins de 25 cm), en allumant sa LED d\'alerte.',
      explain: 'Un rover coûte des milliards et on ne peut pas aller le réparer : il ne doit jamais rien percuter ! À chaque tour de boucle, il regarde devant lui avant d\'avancer.',
      criteria: ['Rien devant : le rover avance', 'Rocher à moins de 25 cm : il s\'arrête et allume la LED', 'Il ne touche pas le rocher'],
      blocks: BASE.concat(['controls_if', 'robot_distance', 'logic_compare', 'math_number', 'robot_led', 'robot_move', 'robot_stop']),
      hints: [
        'Reprends le « si … sinon » de la mission 2.',
        'Dans « faire » (rocher proche) : ajoute « robot : s\'arrêter ».',
        'Dans « sinon » : ajoute « robot : avancer à 60 % ».'],
      start: () => prog([], [ifB([[near(25), [led(true)]]], [led(false)])]),
      solution: () => prog([], [ifB([[near(25), [led(true), stop]]], [led(false), move('FWD', 60)])]),
      async check(T) {
        if (!T.has('robot_stop')) return ko('Il faut « robot : s\'arrêter » quand le rocher est proche.', 1);
        if (!T.has('robot_move')) return ko('Quand la voie est libre, le rover doit avancer.', 2);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 30, y: 60, th: 0 }, obstacle: { x: 125, y: 60 } });
        T.caption('Test 1 / 2 : la voie est libre → le rover avance');
        await T.wait(700);
        if (stopped(T.pose())) return ko('Le rover ne démarre pas : dans « sinon », il doit avancer.', 2);
        T.caption('Test 2 / 2 : un rocher approche → le rover doit s\'arrêter avant');
        const t = await T.until(() => stopped(T.pose()), 8000, 30);
        await T.wait(600);
        const p = T.pose();
        if (t < 0 || p.d < 4) return ko('Le rover a percuté le rocher ! Il doit s\'arrêter quand la distance est inférieure à 25 cm.', 1);
        if (p.d > 30) return ko('Le rover s\'arrête trop loin (' + p.d + ' cm) : utilise 25 cm.', 1);
        if (!p.led) return ko('Le rover s\'est arrêté, mais la LED d\'alerte doit s\'allumer.', 0);
        return ok('Arrêt d\'urgence réussi à ' + p.d + ' cm du rocher !');
      },
    },
    /* 4 */ {
      id: 'm_contourner', title: 'Tourner devant un rocher',
      goal: 'Au lieu de rester bloqué, le rover <b>pivote sur place</b> quand un rocher est à moins de 25 cm, puis il <b>repart</b> dans une autre direction.',
      explain: 'Pour pivoter sur place, une roue avance et l\'autre recule. Pas besoin d\'un angle précis : dès que le capteur ne voit plus le rocher, la boucle fait de nouveau avancer le rover.',
      criteria: ['Rocher proche : le rover pivote', 'Il ne touche pas le rocher', 'Il repart dans une autre direction'],
      blocks: BASE.concat(['controls_if', 'robot_distance', 'logic_compare', 'math_number', 'robot_led', 'robot_move', 'robot_stop', 'wait_time']),
      hints: [
        'Reprends le programme de la mission 3.',
        'Remplace « s\'arrêter » par « robot : <b>pivoter sur place à droite</b> à 60 % ».',
        'Tu peux ajouter « attendre 0,5 seconde » après le pivot : le rover tourne alors franchement avant de regarder à nouveau.'],
      start: () => prog([], [ifB([[near(25), [led(true), stop]]], [led(false), move('FWD', 60)])]),
      solution: () => prog([], [evite()]),
      async check(T) {
        if (!T.has('robot_move', (b) => /SPIN|LEFT|RIGHT|BACK/.test(b.getFieldValue('DIR')))) return ko('Quand le rocher est proche, le rover doit tourner : « pivoter sur place à droite ».', 1);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 30, y: 60, th: 0 }, obstacle: { x: 115, y: 60 } });
        T.caption('Test : le rover roule vers un rocher → il doit tourner et repartir');
        const r = await approach(T, 7000);
        if (r.minD < 4) return ko('Le rover a percuté le rocher : il doit tourner dès que la distance est inférieure à 25 cm.', 0);
        if (r.turn < 40) return ko(r.movedAfter === 0 && stopped(T.pose()) ? 'Le rover reste bloqué devant le rocher : remplace « s\'arrêter » par « pivoter sur place à droite ».' : 'Le rover ne tourne pas assez pour éviter le rocher : utilise « pivoter sur place ».', 1);
        if (r.movedAfter < 15) return ko('Le rover a tourné mais ne repart pas : dans « sinon », il doit avancer.', 2);
        return ok('Rocher évité : le rover a tourné de ' + Math.round(r.turn) + '° et a repris sa route.');
      },
    },
    /* 5 */ {
      id: 'm_explorer', title: 'Exploration autonome',
      goal: 'Mission finale : le rover <b>attend le bouton MODE</b>, puis il explore Mars <b>tout seul</b> pendant longtemps : il avance et tourne chaque fois qu\'il rencontre un rocher, sans jamais en toucher.',
      explain: 'C\'est le principe des vrais rovers comme Perseverance : on leur donne une règle simple (« si un obstacle est trop près, tourne ; sinon avance ») répétée sans fin, et ils se débrouillent seuls sur un terrain inconnu.',
      criteria: ['Le rover attend l\'appui sur MODE', 'Il explore pendant 15 secondes', 'Il évite tous les rochers sans les toucher'],
      blocks: BASE.concat(['controls_whileUntil', 'robot_mode', 'controls_if', 'robot_distance', 'logic_compare', 'math_number', 'robot_led', 'robot_move', 'robot_stop', 'wait_time']),
      hints: [
        'Dans « au démarrage » : « répéter tant que », changé en <b>« répéter jusqu\'à »</b>, avec « bouton MODE appuyé ? ».',
        'La boucle d\'attente reste vide : elle bloque le programme jusqu\'à l\'appui.',
        'Dans « répéter indéfiniment » : ton programme de la mission 4.'],
      start: () => prog([], [evite()]),
      solution: () => prog([{ type: 'controls_whileUntil', fields: { MODE: 'UNTIL' }, inputs: { BOOL: { block: { type: 'robot_mode' } } } }], [evite()]),
      async check(T) {
        if (!T.has('robot_mode') && !T.has('robot_mode_click')) return ko('Il faut attendre le bouton : « bouton MODE appuyé ? ».', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 90, y: 60, th: 0 }, obstacle: false });
        T.caption('Test 1 / 2 : personne n\'appuie sur MODE → le rover attend');
        await T.wait(2000);
        if (!stopped(T.pose())) return ko('Le rover part tout seul : mets « répéter jusqu\'à bouton MODE appuyé » dans « au démarrage ».', 0);
        await T.pressMode(300);
        let rocks = 0, minD = 999, moved = 0, last = T.pose(), placedAt = -9999, removedAt = -9999, rockMin = 999;
        const t0 = T.now();
        while (T.now() - t0 < 15000) {
          const el = T.now() - t0;
          T.caption('Test 2 / 2 : exploration autonome… ' + Math.ceil((15000 - el) / 1000) + ' s · rochers évités : ' + rocks);
          const p = T.pose();
          moved += Math.hypot(p.x - last.x, p.y - last.y); last = p;
          const box = T.robot().box;
          if (box.on) {
            minD = Math.min(minD, p.d);
            rockMin = Math.min(rockMin, p.d);
            if (p.d > 60) { if (rockMin < 35) rocks++; T.moveObstacle(null, null, false); removedAt = T.now(); }   // rocher évité (le rover l'a vu de près puis s'en est détourné)
          }
          // un nouveau rocher sur la route toutes les 3 s (et toujours avant le bord du terrain)
          if (!T.robot().box.on && T.now() - removedAt > 700 && (T.now() - placedAt > 3000 || !inArena(ahead(T, 70)))) {
            const q = [55, 48, 41, 35].map((d) => ahead(T, d)).find(inArena);   // le plus loin possible, mais sur le terrain
            if (q) { T.moveObstacle(q.x, q.y, true); placedAt = T.now(); rockMin = 999; }
          }
          if (minD < 4) return ko('Le rover a heurté un rocher ! Vérifie la condition « distance &lt; 25 » et le pivot.', 2);
          await T.wait(50);
        }
        if (moved < 40) return ko('Le rover n\'explore presque pas (' + Math.round(moved) + ' cm). Après l\'appui sur MODE, il doit avancer.', 1);
        if (rocks < 2) return ko('Le rover n\'a évité que ' + rocks + ' rocher : il doit tourner à chaque obstacle et repartir.', 2);
        return ok('Mission accomplie ! Le rover a exploré ' + Math.round(moved) + ' cm de Mars et évité ' + rocks + ' rochers tout seul.');
      },
    },
  ];

  root.GuideMars = {
    id: 'mars', robot: true, theme: 'mars', icon: '🪐', title: 'Exploration de la planète Mars', level: '5e',
    description: 'Le Cagett\'bot devient un rover : il explore tout seul et évite les rochers.',
    finish: 'Ton rover explore Mars en autonomie : il avance et tourne devant chaque rocher, comme Perseverance !',
    missions: missions,
  };
})(typeof window !== 'undefined' ? window : globalThis);
