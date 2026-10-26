/* Parcours guidé « Cagett'bot » : 8 missions, de « avancer » jusqu'à « piloter par radio ».
   Chaque mission : consigne, explication, critères de réussite, blocs disponibles, indices, solution et vérification
   automatique dans le simulateur (le robot est placé, l'obstacle déplacé, le bouton MODE appuyé… sous les yeux de l'élève). */
(function (root) {
  'use strict';

  /* ----- petits constructeurs de programmes ----- */
  const chain = (list) => { let next = null; for (let i = list.length - 1; i >= 0; i--) { const b = Object.assign({}, list[i]); if (next) b.next = { block: next }; next = b; } return next; };
  const n = (v) => ({ type: 'math_number', fields: { NUM: v } });
  const sh = (v) => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
  const move = (dir, v) => ({ type: 'robot_move', fields: { DIR: dir }, inputs: { SPEED: sh(v) } });
  const stop = { type: 'robot_stop' };
  const wait = (s) => ({ type: 'wait_time', fields: { UNIT: '1000' }, inputs: { DURATION: sh(s) } });
  const cmp = (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const led = (on) => ({ type: 'robot_led', fields: { STATE: on ? 'HIGH' : 'LOW' } });
  const lineS = (side) => ({ type: 'robot_line', fields: { SIDE: side, COLOR: 'BLACK' } });
  const ifB = (branches, elseBody) => {
    const b = { type: 'controls_if', extraState: {}, inputs: {} };
    if (branches.length > 1) b.extraState.elseIfCount = branches.length - 1;
    if (elseBody) { b.extraState.hasElse = true; b.inputs.ELSE = { block: chain(elseBody) }; }
    branches.forEach((br, i) => { b.inputs['IF' + i] = { block: br[0] }; b.inputs['DO' + i] = { block: chain(br[1]) }; });
    return b;
  };
  const prog = (setup, loop, vars) => ({ board: 'nano', variables: vars || [], blocks: { languageVersion: 0, blocks: [
    { type: 'arduino_setup', x: 30, y: 20, inputs: setup.length ? { DO: { block: chain(setup) } } : {} },
    { type: 'arduino_loop', x: 30, y: 180, inputs: loop.length ? { DO: { block: chain(loop) } } : {} },
  ] } });
  const empty = () => prog([], []);
  const follow = () => ifB([[lineS('L'), [move('LEFT', 60)]], [lineS('R'), [move('RIGHT', 60)]]], [move('FWD', 60)]);

  const ok = (msg) => ({ ok: true, msg: msg });
  const ko = (msg, crit, info) => ({ ok: false, msg: msg, crit: crit, info: info });
  const fr = (x, d) => x.toFixed(d == null ? 2 : d).replace('.', ',');

  /* Aide « virage à 90° » : temps à attendre selon la puissance, et ce qu'a vraiment fait le programme de l'élève. */
  function turnHelp(T) {
    const RS = root.RobotSim;
    const turn = T.blocks('robot_move', (b) => /SPIN|LEFT|RIGHT/.test(b.getFieldValue('DIR')))[0];
    let mine = '';
    if (turn) {
      const kind = /SPIN/.test(turn.getFieldValue('DIR')) ? 'SPIN' : 'TURN';
      const power = T.numIn(turn, 'SPEED');
      const next = turn.getNextBlock();
      const wait = next && next.type === 'wait_time' ? T.numIn(next, 'DURATION') : null;
      const secs = wait == null ? null : wait * (next.getFieldValue('UNIT') === '1' ? 0.001 : 1);
      if (power != null) {
        const rate = RS.turnRate(power, kind);
        if (rate <= 0) mine = 'À ' + power + ' %, les moteurs calent : le robot ne tourne pas. Prends au moins ' + (kind === 'SPIN' ? RS.DEAD : 3 * RS.DEAD) + ' %.';
        else {
          mine = 'Ton programme : « ' + (kind === 'SPIN' ? 'pivoter sur place' : 'tourner') + ' » à <b>' + power + ' %</b>'
            + (secs != null ? ' pendant <b>' + fr(secs) + ' s</b> → le robot tourne d\'environ <b>' + Math.round(rate * secs) + '°</b>.' : ', mais aucun bloc « attendre » juste après : le virage ne dure presque pas.')
            + ' Pour 90° à ' + power + ' %, attends environ <b>' + fr(90 / rate) + ' s</b>.';
        }
      }
    }
    const row = (kind) => [40, 50, 60, 70, 80, 100].map((p) => { const r = RS.turnRate(p, kind); return r > 0 ? p + ' % → ' + fr(90 / r) + ' s' : p + ' % → ne tourne pas'; }).join(' · ');
    return '<b>🔄 Virage à 90° (robot du simulateur)</b><br>' + (mine ? mine + '<br>' : '')
      + '<b>Pivoter sur place</b> : ' + row('SPIN')
      + (turn && !/SPIN/.test(turn.getFieldValue('DIR')) ? '<br><b>Tourner</b> (la roue intérieure va 3 fois moins vite, et s\'arrête sous ' + RS.DEAD + ' %) : ' + row('TURN') : '')
      + '<br><small>Sur le vrai robot, ces temps changent un peu selon les piles et les moteurs : fais un essai et ajuste.</small>';
  }
  const BASE = ['arduino_setup', 'arduino_loop'];
  const orphanMsg = 'Un bloc n\'est accroché à rien : glisse-le dans « au démarrage » ou dans « répéter indéfiniment ».';

  const missions = [
    /* 1 */ {
      id: 'avancer', title: 'Faire avancer le robot',
      goal: 'Fais rouler ton Cagett\'bot <b>tout droit vers l\'avant</b>.',
      explain: 'Le robot a deux moteurs, un par roue. « robot : avancer » fait tourner les deux roues dans le même sens et à la même vitesse : il va donc tout droit.',
      criteria: ['Le robot avance', 'Il va tout droit', 'Sa vitesse est d\'au moins 30 %'],
      blocks: BASE.concat(['robot_move', 'robot_stop']),
      hints: [
        'Ouvre la catégorie <b>Robot</b> et glisse le bloc « robot : avancer à la vitesse … % ».',
        'Accroche-le dans <b>« au démarrage »</b> : un seul ordre suffit, le robot continue ensuite tout seul.',
        'Laisse la vitesse à <b>60 %</b>. En dessous de 30 %, les moteurs risquent de ne pas démarrer.'],
      start: empty,
      solution: () => prog([move('FWD', 60)], []),
      async check(T) {
        if (!T.has('robot_move')) return ko('Il manque le bloc « robot : avancer ». Tu le trouves dans la catégorie Robot.', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 30, y: 60, th: 0 }, obstacle: false });
        T.caption('Test : le robot doit avancer tout droit…');
        await T.wait(2000);
        const p = T.pose();
        if (!p) return ko('Le robot n\'a pas reçu d\'ordre.', 0);
        if (p.l < 0 && p.r < 0) return ko('Ton robot recule ! Choisis « avancer » dans le menu du bloc.', 0);
        if (p.l === 0 && p.r === 0) return ko('Le robot ne bouge pas. Vérifie que le bloc « avancer » est bien accroché et que la vitesse n\'est pas 0.', 0);
        if (p.l !== p.r) return ko('Les deux roues ne tournent pas pareil : le robot tourne au lieu d\'aller tout droit. Choisis « avancer ».', 1);
        if (Math.min(p.l, p.r) < 30) return ko('Le robot est trop lent : à moins de 30 %, les moteurs calent. Mets une vitesse plus grande (60 %).', 2);
        if (p.x - 30 < 10) return ko('Le robot a à peine bougé. Augmente la vitesse.', 0);
        return ok('Bravo ! Ton robot avance tout droit.');
      },
    },
    /* 2 */ {
      id: 'arret', title: 'Avancer 2 secondes, puis s\'arrêter',
      goal: 'Le robot doit <b>avancer pendant 2 secondes</b>, puis <b>s\'arrêter</b> pour de bon.',
      explain: 'Un ordre au moteur dure jusqu\'au suivant. Pour rouler 2 secondes, on donne l\'ordre « avancer », on <b>attend</b> 2 secondes, puis on donne l\'ordre « s\'arrêter ».',
      criteria: ['Le robot avance', 'Il s\'arrête au bout d\'environ 2 secondes', 'Il ne repart pas'],
      blocks: BASE.concat(['robot_move', 'robot_stop', 'wait_time']),
      hints: [
        'Il te faut trois blocs, l\'un sous l\'autre : « avancer », « attendre 2 secondes » et « s\'arrêter ».',
        '« attendre » est dans la catégorie <b>Temps</b>.',
        'Mets ces blocs dans <b>« au démarrage »</b>. Dans « répéter indéfiniment », le robot recommencerait sans fin !'],
      start: empty,
      solution: () => prog([move('FWD', 60), wait(2), stop], []),
      async check(T) {
        if (!T.has('robot_move')) return ko('Il manque le bloc « robot : avancer ».', 0);
        if (!T.has('wait_time')) return ko('Il manque le bloc « attendre » (catégorie Temps) : sans lui, le robot s\'arrête aussitôt.', 1);
        if (!T.has('robot_stop')) return ko('Il manque le bloc « robot : s\'arrêter ».', 1);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 20, y: 60, th: 0 }, obstacle: false });
        T.caption('Test : avancer 2 secondes, puis s\'arrêter…');
        const t0 = T.now();
        await T.wait(500);
        let p = T.pose();
        if (!p || (p.l <= 0 && p.r <= 0)) return ko('Le robot ne démarre pas : « avancer » doit être le premier bloc.', 0);
        const t = await T.until(() => { const q = T.pose(); return q.l === 0 && q.r === 0; }, 4000, 20);
        if (t < 0) return ko('Le robot ne s\'arrête pas. Mets « robot : s\'arrêter » juste après « attendre 2 secondes ».', 1);
        const stopAt = (T.now() - t0) / 1000;
        if (stopAt < 1.4 || stopAt > 2.7) return ko('Le robot s\'arrête au bout de ' + stopAt.toFixed(1) + ' s : il faut environ 2 secondes. Vérifie le bloc « attendre ».', 1);
        p = T.pose();
        T.caption('Le robot s\'est arrêté : il ne doit plus repartir…');
        await T.wait(1800);
        const q = T.pose();
        if (q.l !== 0 || q.r !== 0 || Math.hypot(q.x - p.x, q.y - p.y) > 1) return ko('Le robot repart ! Tes blocs sont dans « répéter indéfiniment » : mets-les dans « au démarrage ».', 2);
        return ok('Parfait : 2 secondes de route, puis arrêt. Le bloc « attendre » sert à faire durer un ordre.');
      },
    },
    /* 3 */ {
      id: 'carre', title: 'Dessiner un carré',
      goal: 'Fais faire au robot <b>un carré</b> : 4 fois « avancer 1 seconde, puis tourner d\'un quart de tour », et il revient à son point de départ.',
      explain: 'Au lieu d\'écrire 4 fois les mêmes blocs, on utilise une <b>boucle</b> « répéter 4 fois ». Pour pivoter sur place, une roue avance et l\'autre recule.',
      criteria: ['Une boucle « répéter 4 fois »', 'Le robot avance et pivote', 'Il revient près de son point de départ et s\'arrête'],
      blocks: BASE.concat(['robot_move', 'robot_stop', 'wait_time', 'controls_repeat_ext']),
      hints: [
        'Prends « répéter 10 fois » dans la catégorie <b>Boucles</b> et remplace 10 par <b>4</b>.',
        'Dans la boucle : « avancer à 60 % », « attendre 1 seconde », « pivoter sur place à droite à 60 % », « attendre … ».',
        'À 60 %, un quart de tour prend environ <b>0,5 seconde</b>. Après la boucle, ajoute « s\'arrêter ». Le tout va dans « au démarrage ».'],
      start: empty,
      solution: () => prog([{ type: 'controls_repeat_ext', inputs: { TIMES: sh(4), DO: { block: chain([move('FWD', 60), wait(1), move('SPIN_R', 60), wait(0.5)]) } } }, stop], []),
      async check(T) {
        const rep = T.blocks('controls_repeat_ext');
        if (!rep.length) return ko('Utilise une boucle « répéter … fois » (catégorie Boucles).', 0);
        if (!rep.some((b) => T.numIn(b, 'TIMES') === 4)) return ko('Un carré a 4 côtés : la boucle doit se répéter <b>4</b> fois.'.replace(/<\/?b>/g, ''), 0);
        if (!T.has('robot_move', (b) => b.getFieldValue('DIR') === 'FWD')) return ko('Dans la boucle, le robot doit « avancer ».', 1);
        if (!T.has('robot_move', (b) => /SPIN|LEFT|RIGHT/.test(b.getFieldValue('DIR')))) return ko('Dans la boucle, le robot doit aussi tourner : « pivoter sur place à droite ».', 1);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 60, y: 70, th: 0 }, obstacle: false });
        T.caption('Test : le robot doit dessiner un carré et revenir à son départ…');
        // on suit le trajet : un vrai carré est aussi large que haut (des virages de 180° feraient un aller-retour)
        const box = { x0: 60, x1: 60, y0: 70, y1: 70 };
        const t = await T.until(() => {
          const q = T.pose();
          box.x0 = Math.min(box.x0, q.x); box.x1 = Math.max(box.x1, q.x); box.y0 = Math.min(box.y0, q.y); box.y1 = Math.max(box.y1, q.y);
          return q.l === 0 && q.r === 0;
        }, 12000, 50);
        const p = T.pose();
        if (t < 0) return ko('Le robot ne s\'arrête jamais : ajoute « s\'arrêter » après la boucle, et mets le tout dans « au démarrage ».', 2, turnHelp(T));
        await T.wait(800);
        const q = T.pose();
        if (q.l !== 0 || q.r !== 0) return ko('Le robot repart : tes blocs doivent être dans « au démarrage », pas dans « répéter indéfiniment ».', 2, turnHelp(T));
        const w = box.x1 - box.x0, h = box.y1 - box.y0;
        if (Math.max(w, h) < 8) return ko('Le robot a à peine bougé : vérifie la vitesse et la durée de « avancer ».', 1, turnHelp(T));
        if (Math.min(w, h) < 0.6 * Math.max(w, h)) return ko('Le trajet ne forme pas un carré (' + Math.round(w) + ' cm sur ' + Math.round(h) + ' cm) : les virages ne font pas un quart de tour (90°). Regarde le tableau ci-dessous.', 2, turnHelp(T));
        const dist = Math.hypot(p.x - 60, p.y - 70);
        if (dist > 18) return ko('Le robot finit à ' + Math.round(dist) + ' cm de son départ : ses virages ne font pas tout à fait un quart de tour (90°). Regarde le tableau ci-dessous.', 2, turnHelp(T));
        return ok('Superbe carré ! La boucle « répéter 4 fois » t\'a évité d\'écrire 16 blocs.');
      },
    },
    /* 4 */ {
      id: 'led', title: 'Allumer la LED devant un obstacle',
      goal: 'Le robot reste sur place. Sa <b>LED</b> doit s\'<b>allumer</b> quand un obstacle est à <b>moins de 20 cm</b>, et s\'<b>éteindre</b> sinon.',
      explain: 'Le capteur à ultrasons envoie un son (trop aigu pour nos oreilles) et mesure le temps de l\'écho : il donne la distance en cm. Le robot doit la mesurer <b>sans arrêt</b>, donc dans « répéter indéfiniment ».',
      criteria: ['La LED s\'allume si l\'obstacle est proche (moins de 20 cm)', 'Elle s\'éteint quand l\'obstacle s\'éloigne', 'Elle reste éteinte sans obstacle'],
      blocks: BASE.concat(['controls_if', 'logic_compare', 'math_number', 'robot_distance', 'robot_led']),
      hints: [
        'Prends le bloc « si … faire » (catégorie Logique) et clique sur son <b>+</b> pour ajouter un « sinon ».',
        'Comme condition : « distance de l\'obstacle » <b>&lt;</b> 20 (bloc de comparaison de la catégorie Logique).',
        'Dans « faire » : « LED obstacle : allumer ». Dans « sinon » : « LED obstacle : éteindre ». Le tout dans « répéter indéfiniment ».'],
      start: empty,
      solution: () => prog([], [ifB([[cmp('LT', { type: 'robot_distance' }, n(20)), [led(true)]]], [led(false)])]),
      async check(T) {
        if (!T.has('robot_distance')) return ko('Il faut mesurer la distance : bloc « distance de l\'obstacle (cm) ».', 0);
        if (!T.has('robot_led')) return ko('Il manque le bloc « LED obstacle ».', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        if (!T.allIn('robot_distance', 'arduino_loop')) return ko('La distance doit être mesurée sans arrêt : mets ton « si » dans « répéter indéfiniment ».', 0);
        const X = 40, front = X + 8.5;
        await T.start({ robot: { x: X, y: 60, th: 0 }, obstacle: { x: front + 10 + 7, y: 60 } });
        T.caption('Test 1 / 4 : obstacle à 10 cm → la LED doit s\'allumer');
        await T.wait(1800);
        if (!T.pose().led) return ko('L\'obstacle est à 10 cm mais la LED reste éteinte. Vérifie la condition : distance < 20.', 0);
        T.moveObstacle(front + 50 + 7, 60);
        T.caption('Test 2 / 4 : obstacle à 50 cm → la LED doit s\'éteindre');
        await T.wait(1800);
        if (T.pose().led) return ko('L\'obstacle s\'est éloigné à 50 cm mais la LED reste allumée : ajoute « sinon : éteindre ».', 1);
        T.moveObstacle(front + 15 + 7, 60);
        T.caption('Test 3 / 4 : obstacle à 15 cm → la LED doit s\'allumer');
        await T.wait(1800);
        if (!T.pose().led) return ko('À 15 cm, la LED doit s\'allumer (15 est plus petit que 20).', 0);
        T.moveObstacle(null, null, false);
        T.caption('Test 4 / 4 : plus d\'obstacle → la LED doit être éteinte');
        await T.wait(1800);
        if (T.pose().led) return ko('Sans obstacle, la LED doit être éteinte.', 2);
        return ok('Bien joué ! La LED réagit à la distance, comme un radar de recul.');
      },
    },
    /* 5 */ {
      id: 'obstacle', title: 'S\'arrêter devant un obstacle',
      goal: 'Le robot <b>avance</b>, mais il doit <b>s\'arrêter</b> (et allumer sa LED) si un obstacle est à moins de 20 cm. Quand l\'obstacle disparaît, il <b>repart</b>.',
      explain: 'C\'est la mission 4 avec les moteurs en plus : à chaque tour de boucle, le robot regarde devant lui et choisit entre avancer et s\'arrêter.',
      criteria: ['Le robot avance quand la voie est libre', 'Il s\'arrête avant de toucher l\'obstacle', 'Il repart quand l\'obstacle est enlevé'],
      blocks: BASE.concat(['controls_if', 'logic_compare', 'math_number', 'robot_distance', 'robot_led', 'robot_move', 'robot_stop']),
      hints: [
        'Reprends la mission 4 : un « si … sinon » avec la condition « distance de l\'obstacle < 20 ».',
        'Dans « faire » : LED allumée et « s\'arrêter ». Dans « sinon » : LED éteinte et « avancer à 60 % ».',
        'Tout cela va dans « répéter indéfiniment », pour que le robot surveille la route en permanence.'],
      start: empty,
      solution: () => prog([], [ifB([[cmp('LT', { type: 'robot_distance' }, n(20)), [led(true), stop]]], [led(false), move('FWD', 60)])]),
      async check(T) {
        if (!T.has('robot_distance')) return ko('Il faut mesurer la distance : bloc « distance de l\'obstacle (cm) ».', 1);
        if (!T.has('robot_stop')) return ko('Il manque « robot : s\'arrêter ».', 1);
        if (!T.has('robot_move', (b) => b.getFieldValue('DIR') === 'FWD')) return ko('Il manque « robot : avancer ».', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 20, y: 60, th: 0 }, obstacle: { x: 120, y: 60 } });
        T.caption('Test 1 / 3 : la route est libre → le robot doit avancer');
        await T.wait(1200);
        let p = T.pose();
        if (!(p.l > 0 && p.r > 0)) return ko('La voie est libre mais le robot n\'avance pas. Dans « sinon », mets « avancer ».', 0);
        T.caption('Test 2 / 3 : un obstacle approche → le robot doit s\'arrêter avant');
        const t = await T.until(() => { const q = T.pose(); return q.l === 0 && q.r === 0; }, 8000);
        await T.wait(1000);
        p = T.pose();
        if (t < 0 || p.d < 3) return ko('Le robot fonce dans l\'obstacle ! Il doit s\'arrêter quand la distance est plus petite que 20 cm.', 1);
        if (p.d > 25) return ko('Le robot s\'arrête trop tôt (à ' + p.d + ' cm). Utilise bien 20 cm dans la condition.', 1);
        if (!p.led) return ko('Le robot s\'arrête bien, mais sa LED doit aussi s\'allumer.', 1);
        const stopD = p.d;
        T.moveObstacle(null, null, false);
        T.caption('Test 3 / 3 : j\'enlève l\'obstacle → le robot doit repartir');
        await T.wait(1500);
        p = T.pose();
        if (!(p.l > 0 && p.r > 0)) return ko('L\'obstacle a disparu mais le robot ne repart pas : vérifie que tout est dans « répéter indéfiniment ».', 2);
        return ok('Excellent ! Ton robot s\'arrête à ' + stopD + ' cm de l\'obstacle et repart dès que la voie est libre.');
      },
    },
    /* 6 */ {
      id: 'ligne', title: 'Suivre la ligne noire',
      goal: 'Le robot doit <b>suivre le ruban noir</b> de la piste sans le perdre.',
      explain: 'Les deux capteurs sont de part et d\'autre du ruban : tant qu\'ils voient du blanc, le robot va tout droit. Si le capteur <b>gauche</b> voit du noir, la ligne part à gauche : il faut tourner <b>à gauche</b> (et pareil à droite).',
      criteria: ['Le robot avance sur la ligne', 'Il corrige sa direction dans les virages', 'Il fait au moins la moitié d\'un tour sans sortir'],
      blocks: BASE.concat(['controls_if', 'robot_line', 'robot_move', 'robot_stop']),
      hints: [
        'Utilise un « si … sinon si … sinon » : clique deux fois sur le <b>+</b> du bloc « si » pour ajouter un « sinon » et un « sinon si ».',
        'Si « capteur de ligne gauche voit du noir » : tourner à gauche. Sinon si « capteur droit voit du noir » : tourner à droite.',
        'Sinon (les deux voient du blanc) : avancer. Le tout dans « répéter indéfiniment ».'],
      start: empty,
      solution: () => prog([], [follow()]),
      async check(T) {
        if (!T.has('robot_line')) return ko('Il faut utiliser les capteurs de ligne : bloc « capteur de ligne … voit du … ? ».', 1);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ obstacle: false });
        T.caption('Test : le robot doit suivre la ligne pendant 10 secondes…');
        let worst = 0, path = 0, last = T.pose();
        for (let t = 0; t < 10000; t += 150) {
          await T.wait(150);
          const p = T.pose();
          path += Math.hypot(p.x - last.x, p.y - last.y);
          last = p;
          worst = Math.max(worst, T.offTrack());
          if (worst > 7) return ko(path < 20 ? 'Le robot sort tout de suite de la ligne. As-tu inversé gauche et droite ? Si le capteur GAUCHE voit du noir, il faut tourner à GAUCHE.'
            : 'Le robot a perdu la ligne après ' + Math.round(path) + ' cm. Vérifie : gauche voit noir → tourner à gauche, droit voit noir → tourner à droite.', path < 20 ? 1 : 2);
        }
        if (path < 80) return ko('Le robot n\'avance presque pas (' + Math.round(path) + ' cm en 10 s). Dans « sinon », il doit avancer.', 0);
        return ok('Bravo, ton robot suit la ligne (' + Math.round(path) + ' cm parcourus sans la perdre) !');
      },
    },
    /* 7 */ {
      id: 'mode', title: 'Démarrer avec le bouton MODE',
      goal: 'Au démarrage, le robot doit <b>attendre</b> qu\'on appuie sur le bouton <b>MODE</b>. Ensuite seulement, il suit la ligne.',
      explain: 'Pratique pour poser le robot sur la piste avant qu\'il ne parte ! La boucle « répéter jusqu\'à » recommence tant que la condition est fausse.',
      criteria: ['Le robot ne bouge pas tant qu\'on n\'appuie pas sur MODE', 'Après l\'appui, il suit la ligne'],
      blocks: BASE.concat(['controls_whileUntil', 'robot_mode', 'wait_time', 'controls_if', 'robot_line', 'robot_move', 'robot_stop']),
      hints: [
        'Dans « au démarrage », mets la boucle « répéter tant que » et choisis <b>« répéter jusqu\'à »</b>.',
        'Sa condition : « bouton MODE appuyé ? ». La boucle peut rester vide : elle sert juste à attendre.',
        'Dans « répéter indéfiniment », remets ton programme de suivi de ligne (mission 6).'],
      start: () => prog([], [follow()]),
      solution: () => prog([{ type: 'controls_whileUntil', fields: { MODE: 'UNTIL' }, inputs: { BOOL: { block: { type: 'robot_mode' } } } }], [follow()]),
      async check(T) {
        if (!T.has('robot_mode') && !T.has('robot_mode_click')) return ko('Il faut utiliser le bloc « bouton MODE appuyé ? ».', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ obstacle: false });
        T.caption('Test 1 / 2 : personne n\'appuie sur MODE → le robot doit attendre');
        const a = T.pose();
        await T.wait(2200);
        const b = T.pose();
        if (b.l !== 0 || b.r !== 0 || Math.hypot(b.x - a.x, b.y - a.y) > 1) return ko('Le robot part tout seul ! Il doit attendre l\'appui sur MODE : mets « répéter jusqu\'à bouton MODE appuyé » dans « au démarrage ».', 0);
        T.caption('Test 2 / 2 : j\'appuie sur MODE → le robot doit partir sur la ligne');
        await T.pressMode(400);
        await T.wait(3000);
        const c = T.pose();
        if (Math.hypot(c.x - b.x, c.y - b.y) < 15) return ko('Après l\'appui sur MODE, le robot ne part pas. Le suivi de ligne doit être dans « répéter indéfiniment ».', 1);
        if (T.offTrack() > 7) return ko('Le robot démarre bien, mais il a perdu la ligne : reprends la mission 6.', 1);
        return ok('Parfait ! Le robot attend sagement le signal de départ.');
      },
    },
    /* 8 */ {
      id: 'radio', title: 'Piloter le robot avec la télécommande',
      goal: 'Le robot obéit aux nombres reçus par <b>radio</b> : 1 avancer, 2 reculer, 3 pivoter à gauche, 4 pivoter à droite, 0 s\'arrêter.',
      explain: 'La télécommande envoie un nombre par radio. Le robot regarde s\'il a reçu un message, puis compare le nombre reçu avec chaque code. Dans le simulateur, la télécommande est en bas : boutons ▲ ▼ ◀ ▶ ■.',
      criteria: ['1 : avancer', '2 : reculer', '3 : pivoter à gauche', '4 : pivoter à droite', '0 : s\'arrêter'],
      blocks: BASE.concat(['robot_radio_channel', 'robot_radio_received', 'robot_radio_value', 'controls_if', 'logic_compare', 'math_number', 'robot_move', 'robot_stop']),
      hints: [
        'Dans « répéter indéfiniment » : « si radio : message reçu ? » (catégorie Radio).',
        'À l\'intérieur, un « si … sinon si … » : « radio : nombre reçu = 1 » → avancer, « = 2 » → reculer, etc.',
        'Pour 0 (et tout autre nombre), utilise le « sinon » final : « s\'arrêter ». N\'oublie pas le « groupe radio » en haut de l\'écran pour le vrai robot !'],
      start: empty,
      solution: () => {
        const v = { type: 'robot_radio_value' };
        return prog([{ type: 'robot_radio_channel', fields: { CH: 76 } }], [ifB([[{ type: 'robot_radio_received' }, [ifB([
          [cmp('EQ', v, n(1)), [move('FWD', 60)]], [cmp('EQ', v, n(2)), [move('BACK', 60)]],
          [cmp('EQ', v, n(3)), [move('SPIN_L', 60)]], [cmp('EQ', v, n(4)), [move('SPIN_R', 60)]]], [stop])]]])]);
      },
      async check(T) {
        if (!T.has('robot_radio_received')) return ko('Il faut d\'abord vérifier qu\'un message est arrivé : « radio : message reçu ? ».', 0);
        if (!T.has('robot_radio_value')) return ko('Il faut comparer le nombre reçu : bloc « radio : nombre reçu ».', 0);
        if (T.orphans()) return ko(orphanMsg, 0);
        await T.start({ robot: { x: 90, y: 60, th: 0 }, obstacle: false });
        const tests = [
          [1, (p) => p.l > 0 && p.r > 0 && p.l === p.r, 'Avec le code 1, le robot doit avancer tout droit.', 0],
          [2, (p) => p.l < 0 && p.r < 0, 'Avec le code 2, le robot doit reculer.', 1],
          [3, (p) => p.l < p.r, 'Avec le code 3, le robot doit tourner (pivoter) à gauche.', 2],
          [4, (p) => p.l > p.r, 'Avec le code 4, le robot doit tourner (pivoter) à droite.', 3],
          [0, (p) => p.l === 0 && p.r === 0, 'Avec le code 0, le robot doit s\'arrêter.', 4],
        ];
        const LABEL = { 1: 'avancer', 2: 'reculer', 3: 'pivoter à gauche', 4: 'pivoter à droite', 0: 's\'arrêter' };
        for (const [code, good, msg, crit] of tests) {
          T.caption('La télécommande envoie ' + code + ' → le robot doit ' + LABEL[code]);
          T.radio(code);
          await T.wait(1300);
          if (!good(T.pose())) return ko(msg, crit);
          T.robot().pose = { x: 90, y: 60, th: 0 };
        }
        return ok('Bravo ! Ton robot obéit à la télécommande. Pour le vrai robot, choisis le même « groupe radio » que la télécommande.');
      },
    },
  ];

  root.GuideRobot = {
    id: 'robot', robot: true, icon: '🤖', title: 'Cagett\'bot',
    description: 'Avancer, tourner, éviter les obstacles, suivre une ligne, obéir à la radio.',
    finish: 'Ton Cagett\'bot sait avancer, éviter les obstacles, suivre une ligne et obéir à la télécommande !',
    missions: missions,
  };
})(typeof window !== 'undefined' ? window : globalThis);
