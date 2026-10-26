/* Parcours guidés tirés des exemples : LED de la carte, télécommande, pistolet laser, cible LED, cibles à volets.
   Les programmes sont testés sur la carte virtuelle (boutons appuyés, tirs laser… sous les yeux de l'élève). */
(function (root) {
  'use strict';
  const K = root.GuideKit;
  const { prog, ifB, cmp, and, n, sh, ok, ko, BASE, orphanMsg, get, set, add, write, mode, read, wait, waitMs, repeat, forI, V, fr } = K;
  const LED = '13';
  const segs = (samples) => K.segments(samples);

  /* =============== 1. La LED de la carte =============== */
  const blink = (s) => [write(LED, true), wait(s), write(LED, false), wait(s)];
  const FEU = { vert: '5', orange: '6', rouge: '7' };
  const feuSol = () => prog([mode(FEU.vert, 'OUTPUT'), mode(FEU.orange, 'OUTPUT'), mode(FEU.rouge, 'OUTPUT')], [
    write(FEU.vert, true), wait(3), write(FEU.vert, false),
    write(FEU.orange, true), wait(1), write(FEU.orange, false),
    write(FEU.rouge, true), wait(3), write(FEU.rouge, false)]);
  const ledCourse = {
    id: 'led', icon: '💡', title: 'La LED de la carte',
    description: 'Allumer, faire clignoter, compter, réagir à un bouton, feu tricolore.',
    finish: 'Tu sais commander des LED, utiliser le temps, les boucles et un bouton !',
    missions: [
      {
        id: 'allumer', title: 'Allumer la LED',
        goal: 'Allume la <b>LED « L »</b> de la carte (broche <b>D13</b>) et laisse-la allumée.',
        explain: 'Une broche de la carte peut être une <b>sortie</b> : quand on la met à HAUT, elle envoie du courant et la LED s\'allume. On configure la broche une seule fois, dans « au démarrage ».',
        criteria: ['La broche D13 est configurée en sortie', 'La LED est allumée'],
        blocks: BASE.concat(['pin_mode', 'digital_write']),
        hints: [
          'Catégorie <b>Entrées / sorties</b> : « configurer la broche … en sortie » et « mettre la broche … à HAUT ».',
          'Choisis la broche <b>D13</b> dans les deux blocs (c\'est la LED « L » de la carte).',
          'Mets les deux blocs dans « au démarrage », l\'un sous l\'autre.'],
        start: K.empty,
        solution: () => prog([mode(LED, 'OUTPUT'), write(LED, true)], []),
        async check(T) {
          if (!T.has('digital_write')) return ko('Il manque le bloc « mettre la broche … à HAUT ».', 1);
          if (!T.has('pin_mode', (b) => b.getFieldValue('PIN') === LED && b.getFieldValue('MODE') === 'OUTPUT')) return ko('Il faut configurer la broche D13 en sortie : bloc « configurer la broche D13 en sortie ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test : la LED « L » doit s\'allumer…');
          await T.wait(1200);
          if (!T.pin(LED)) return ko('La LED reste éteinte. Mets la broche D13 à HAUT (et vérifie que c\'est bien D13).', 1);
          return ok('Bravo, la LED est allumée !');
        },
      },
      {
        id: 'clignoter', title: 'Faire clignoter la LED',
        goal: 'La LED doit <b>clignoter</b> sans fin : allumée <b>1 seconde</b>, éteinte <b>1 seconde</b>.',
        explain: 'La carte va extrêmement vite : sans pause, on ne verrait rien. Le bloc « attendre » fait durer chaque état. Et « répéter indéfiniment » recommence sans arrêt.',
        criteria: ['La LED s\'allume et s\'éteint', 'Environ 1 seconde allumée', 'Environ 1 seconde éteinte'],
        blocks: BASE.concat(['pin_mode', 'digital_write', 'wait_time']),
        hints: [
          'Dans « répéter indéfiniment » : « mettre D13 à HAUT », « attendre 1 seconde », « mettre D13 à BAS », « attendre 1 seconde ».',
          'Le bloc « attendre » est dans la catégorie <b>Temps</b>.',
          'Sans le 2e « attendre », la LED se rallume aussitôt éteinte : on croit qu\'elle reste allumée !'],
        start: () => prog([mode(LED, 'OUTPUT')], []),
        solution: () => prog([mode(LED, 'OUTPUT')], blink(1)),
        async check(T) {
          if (!T.has('wait_time')) return ko('Il faut des blocs « attendre » (catégorie Temps).', 1);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test : j\'observe la LED pendant 5 secondes…');
          const s = segs(await T.sample(() => T.pin(LED), 5000, 20));
          const on = s.filter((x) => x.v === 1).slice(0, -1), off = s.filter((x) => x.v === 0).slice(1, -1);
          if (s.length < 3) return ko(s[0] && s[0].v ? 'La LED reste allumée. Il faut l\'éteindre ensuite, et attendre après chaque changement.' : 'La LED reste éteinte. Mets D13 à HAUT, puis à BAS, dans « répéter indéfiniment ».', 0);
          const bad = (arr) => arr.find((x) => x.dur < 750 || x.dur > 1300);
          if (on.length && bad(on)) return ko('La LED reste allumée ' + fr(bad(on).dur / 1000) + ' s : il faut 1 seconde.', 1);
          if (off.length && bad(off)) return ko('La LED reste éteinte ' + fr(bad(off).dur / 1000) + ' s : il faut 1 seconde. N\'oublie pas le « attendre » après « mettre à BAS ».', 2);
          return ok('Ça clignote : 1 seconde allumée, 1 seconde éteinte. C\'est le programme d\'exemple « blink » !');
        },
      },
      {
        id: 'cinq', title: 'Clignoter 5 fois, puis s\'arrêter',
        goal: 'La LED doit clignoter <b>exactement 5 fois</b> (0,5 seconde allumée, 0,5 seconde éteinte), puis rester <b>éteinte</b>.',
        explain: 'La boucle « répéter 10 fois » répète les blocs qu\'elle contient un nombre précis de fois. Placée dans « au démarrage », elle ne s\'exécute qu\'une fois au total.',
        criteria: ['Une boucle « répéter … fois »', 'Exactement 5 clignotements', 'La LED reste éteinte à la fin'],
        blocks: BASE.concat(['pin_mode', 'digital_write', 'wait_time', 'controls_repeat_ext']),
        hints: [
          'Catégorie <b>Boucles</b> : « répéter 10 fois ». Remplace 10 par <b>5</b>.',
          'Dans la boucle : allumer, attendre 0,5 s, éteindre, attendre 0,5 s. Pour 0,5, tape <b>0.5</b> (avec un point).',
          'Mets la boucle dans <b>« au démarrage »</b>, sous « configurer la broche D13 en sortie ». « répéter indéfiniment » reste vide.'],
        start: () => prog([mode(LED, 'OUTPUT')], blink(1)),
        solution: () => prog([mode(LED, 'OUTPUT'), repeat(5, blink(0.5))], []),
        async check(T) {
          if (!T.has('controls_repeat_ext')) return ko('Utilise la boucle « répéter … fois » (catégorie Boucles).', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test : je compte les clignotements pendant 7 secondes…');
          const s = segs(await T.sample(() => T.pin(LED), 7000, 20));
          const count = s.filter((x) => x.v === 1).length;
          if (count === 0) return ko('La LED ne s\'allume jamais.', 1);
          const last = s[s.length - 1];
          if (count > 5 || (last.v === 1 && last.dur > 1000)) return ko(count > 5 ? 'J\'ai compté ' + count + ' clignotements : la LED ne s\'arrête pas. La boucle doit être dans « au démarrage ».' : 'À la fin, la LED doit être éteinte.', count > 5 ? 2 : 2);
          if (count < 5) return ko('J\'ai compté seulement ' + count + ' clignotement' + (count > 1 ? 's' : '') + ' : il en faut 5.', 1);
          if (last.v !== 0) return ko('À la fin, la LED doit rester éteinte.', 2);
          if (s.filter((x) => x.v === 1).some((x) => x.dur < 300 || x.dur > 800)) return ko('Chaque clignotement doit durer 0,5 seconde allumé.', 1);
          return ok('5 clignotements, puis plus rien : la boucle « répéter 5 fois » a bien fonctionné.');
        },
      },
      {
        id: 'bouton', title: 'Allumer avec un bouton',
        goal: 'La LED D13 doit être <b>allumée tant qu\'on appuie</b> sur le bouton branché sur <b>D2</b>, et éteinte sinon.',
        explain: 'Le bouton est une <b>entrée</b> : « lire la broche D2 » donne HAUT quand il est appuyé. Le programme regarde le bouton à chaque tour de boucle et décide avec « si … sinon ».',
        criteria: ['Bouton relâché : LED éteinte', 'Bouton appuyé : LED allumée', 'La LED suit le bouton à chaque appui'],
        blocks: BASE.concat(['pin_mode', 'digital_write', 'digital_read', 'controls_if', 'logic_compare', 'math_number']),
        hints: [
          'Dans « au démarrage » : D2 en <b>entrée</b> et D13 en sortie.',
          'Dans « répéter indéfiniment » : un « si » (clique sur son <b>+</b> pour avoir « sinon ») avec la condition « lire la broche D2 ».',
          'Dans « faire » : D13 à HAUT. Dans « sinon » : D13 à BAS. Dans le simulateur, maintiens le bouton D2 appuyé pour essayer.'],
        start: () => prog([mode('2', 'INPUT'), mode(LED, 'OUTPUT')], []),
        solution: () => prog([mode('2', 'INPUT'), mode(LED, 'OUTPUT')], [ifB([[read('2'), [write(LED, true)]]], [write(LED, false)])]),
        async check(T) {
          if (!T.has('digital_read')) return ko('Il faut lire le bouton : bloc « lire la broche D2 ».', 1);
          if (!T.has('controls_if')) return ko('Il faut un bloc « si … sinon » pour décider.', 1);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.setButton('2', false);
          T.caption('Test 1 / 3 : bouton relâché → LED éteinte');
          await T.wait(700);
          if (T.pin(LED)) return ko('Bouton relâché, la LED devrait être éteinte. Ajoute un « sinon → mettre D13 à BAS ».', 0);
          T.caption('Test 2 / 3 : j\'appuie sur le bouton D2 → LED allumée');
          T.setButton('2', true);
          await T.wait(700);
          if (!T.pin(LED)) { T.setButton('2', false); return ko('J\'appuie sur le bouton mais la LED reste éteinte. Vérifie la broche lue (D2) et la broche de la LED (D13).', 1); }
          T.caption('Test 3 / 3 : je relâche → LED éteinte');
          T.setButton('2', false);
          await T.wait(700);
          if (T.pin(LED)) return ko('Après avoir relâché le bouton, la LED reste allumée : il faut un « sinon → mettre D13 à BAS ».', 2);
          return ok('La LED obéit au bouton. C\'est le principe d\'une sonnette !');
        },
      },
      {
        id: 'feu', title: 'Feu tricolore',
        ledColors: { [FEU.vert]: 'verte', [FEU.orange]: 'orange', [FEU.rouge]: 'rouge' },
        goal: 'Fabrique un <b>feu tricolore</b> : LED verte (D5) <b>3 s</b>, puis orange (D6) <b>1 s</b>, puis rouge (D7) <b>3 s</b>, et on recommence. Une seule LED allumée à la fois.',
        explain: 'Chaque LED externe se branche sur sa propre broche (avec une résistance). Le programme allume une LED, attend, l\'éteint, et passe à la suivante.',
        criteria: ['Vert 3 s', 'Orange 1 s', 'Rouge 3 s', 'Une seule LED à la fois, dans le bon ordre'],
        blocks: BASE.concat(['pin_mode', 'digital_write', 'wait_time']),
        hints: [
          'Dans « au démarrage » : D5, D6 et D7 en sortie.',
          'Dans « répéter indéfiniment » : D5 à HAUT, attendre 3 s, D5 à BAS, puis D6 à HAUT…',
          'Après le rouge (D7 à HAUT, attendre 3 s), n\'oublie pas de l\'éteindre (D7 à BAS) avant de recommencer.'],
        start: () => prog([mode(FEU.vert, 'OUTPUT'), mode(FEU.orange, 'OUTPUT'), mode(FEU.rouge, 'OUTPUT')], []),
        solution: feuSol,
        async check(T) {
          if (!T.has('wait_time')) return ko('Il faut des blocs « attendre » pour faire durer chaque couleur.', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test : j\'observe le feu pendant 8 secondes…');
          const NAME = { [FEU.vert]: 'vert', [FEU.orange]: 'orange', [FEU.rouge]: 'rouge' };
          const s = segs(await T.sample(() => [FEU.vert, FEU.orange, FEU.rouge].filter((p) => T.pin(p)).join('+'), 8200, 20)).filter((x) => x.dur > 80);
          if (s.some((x) => x.v.indexOf('+') >= 0)) return ko('Deux LED sont allumées en même temps : éteins chaque LED avant d\'allumer la suivante.', 3);
          const lit = s.filter((x) => x.v);
          if (!lit.length) return ko('Aucune LED ne s\'allume : utilise les broches D5 (vert), D6 (orange) et D7 (rouge).', 0);
          const want = [[FEU.vert, 3000, 0], [FEU.orange, 1000, 1], [FEU.rouge, 3000, 2]];
          for (let i = 0; i < Math.min(3, lit.length); i++) {
            const [pin, dur, crit] = want[i];
            if (lit[i].v !== pin) return ko('La ' + (i + 1) + 'e couleur est ' + (NAME[lit[i].v] || 'D' + lit[i].v) + ' : il faut ' + NAME[pin] + '. Ordre : vert, orange, rouge.', 3);
            if (Math.abs(lit[i].dur - dur) > dur * 0.25) return ko('Le ' + NAME[pin] + ' dure ' + fr(lit[i].dur / 1000) + ' s : il faut ' + dur / 1000 + ' s.', crit);
          }
          if (lit.length < 4 || lit[3].v !== FEU.vert) return ko('Après le rouge, le feu doit repasser au vert : le cycle doit être dans « répéter indéfiniment », et le rouge doit s\'éteindre.', 3);
          return ok('Ton feu tricolore fonctionne : vert, orange, rouge… et ça recommence !');
        },
      },
    ],
  };

  /* =============== 2. Télécommande =============== */
  const tcBtn = (k) => ({ type: 'tc_button', fields: { BTN: k } });
  const send = (x) => ({ type: 'robot_radio_send', inputs: { VALUE: typeof x === 'number' ? sh(x) : { block: x } } });
  const chan = { type: 'robot_radio_channel', fields: { CH: 76 } };
  const tcLed = (on) => ({ type: 'tc_led', fields: { STATE: on ? 'HIGH' : 'LOW' } });
  const CODE = V('tc_code');
  const dirsSol = () => prog([chan], [ifB([[tcBtn('2'), [send(1)]], [tcBtn('3'), [send(2)]], [tcBtn('4'), [send(3)]], [tcBtn('5'), [send(4)]]], [send(0)]), waitMs(50)]);
  const TC_NAME = { 2: 'avant', 3: 'arrière', 4: 'gauche', 5: 'droite', 6: 'turbo' };
  async function holdAndRead(T, key, ms) { T.hold(key, true); await T.wait(ms || 400); const v = T.sent(); T.hold(key, false); return v; }
  const tcCourse = {
    id: 'telecommande', icon: '🎮', title: 'Télécommande du robot',
    description: 'Lire les boutons et envoyer des ordres par radio au Cagett\'bot.',
    finish: 'Ta télécommande envoie les bons codes par radio : il ne reste qu\'à programmer le robot pour qu\'il les reçoive (parcours Cagett\'bot, mission 8) !',
    missions: [
      {
        id: 'tc_led', title: 'La LED du bouton turbo',
        goal: 'La LED turbo (D7) doit être <b>allumée tant qu\'on appuie</b> sur le bouton <b>turbo</b>, et éteinte sinon.',
        explain: 'La télécommande a 5 boutons et une LED. Pour commencer, on vérifie que tout est bien branché : la LED s\'allume quand on appuie sur turbo.',
        criteria: ['Turbo relâché : LED éteinte', 'Turbo appuyé : LED allumée'],
        blocks: BASE.concat(['controls_if', 'tc_button', 'tc_led']),
        hints: [
          'Catégorie <b>Télécommande</b> : « bouton … appuyé ? » et « LED turbo ».',
          'Dans « répéter indéfiniment » : « si bouton turbo appuyé ? » → LED turbo allumer ; clique sur <b>+</b> pour le « sinon » → éteindre.',
          'Choisis bien « turbo » dans le menu du bloc bouton.'],
        start: K.empty,
        solution: () => prog([], [ifB([[tcBtn('6'), [tcLed(true)]]], [tcLed(false)])]),
        async check(T) {
          if (!T.has('tc_led')) return ko('Il faut le bloc « télécommande : LED turbo ».', 1);
          if (!T.has('tc_button') && !T.has('tc_click')) return ko('Il faut lire le bouton : « télécommande : bouton turbo appuyé ? ».', 1);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test 1 / 2 : personne n\'appuie → LED éteinte');
          await T.wait(600);
          if (T.out('turbo')) return ko('La LED est allumée alors que personne n\'appuie : ajoute le « sinon → éteindre ».', 0);
          T.caption('Test 2 / 2 : j\'appuie sur turbo → LED allumée');
          T.hold('tc6', true); await T.wait(600);
          const on = T.out('turbo'); T.hold('tc6', false); await T.wait(600);
          if (!on) return ko('J\'appuie sur turbo mais la LED reste éteinte. Vérifie que le bloc bouton est réglé sur « turbo ».', 1);
          if (T.out('turbo')) return ko('Après avoir relâché turbo, la LED reste allumée : il faut un « sinon → éteindre ».', 0);
          return ok('La LED turbo suit le bouton. La télécommande est bien câblée !');
        },
      },
      {
        id: 'tc_avant', title: 'Envoyer « avancer » par radio',
        goal: 'Quand on appuie sur <b>avant</b>, la télécommande envoie le nombre <b>1</b> par radio. Sinon, elle envoie <b>0</b> (s\'arrêter).',
        explain: 'Le robot ne reçoit que des nombres : 1 veut dire « avancer », 0 « s\'arrêter ». La télécommande en envoie un toutes les 50 millisecondes, pour que le robot réagisse tout de suite. Le canal radio doit être le même que celui du robot (76).',
        criteria: ['Le canal radio est réglé au démarrage', 'Bouton avant : envoie 1', 'Aucun bouton : envoie 0'],
        blocks: BASE.concat(['robot_radio_channel', 'robot_radio_send', 'controls_if', 'tc_button', 'wait_time', 'math_number']),
        hints: [
          'Dans « au démarrage » : « radio : canal 76 » (catégorie Radio).',
          'Dans « répéter indéfiniment » : « si bouton avant appuyé ? » → « radio : envoyer 1 », sinon → « radio : envoyer 0 ».',
          'Ajoute « attendre 50 millisecondes » à la fin de la boucle, pour ne pas inonder la radio de messages.'],
        start: K.empty,
        solution: () => prog([chan], [ifB([[tcBtn('2'), [send(1)]]], [send(0)]), waitMs(50)]),
        async check(T) {
          if (!T.has('robot_radio_send')) return ko('Il faut envoyer un nombre : « radio : envoyer … ».', 1);
          if (!T.allIn('robot_radio_channel', 'arduino_setup')) return ko('Règle le canal radio dans « au démarrage » : « radio : canal 76 ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test 1 / 2 : aucun bouton → la télécommande envoie 0');
          await T.wait(600);
          if (!T.sentCount()) return ko('La télécommande n\'envoie rien. Le bloc « envoyer » doit être dans « répéter indéfiniment ».', 2);
          if (T.sent() !== 0) return ko('Sans bouton appuyé, il faut envoyer 0 (la télécommande a envoyé ' + T.sent() + ').', 2);
          T.caption('Test 2 / 2 : j\'appuie sur avant → la télécommande envoie 1');
          const v = await holdAndRead(T, 'tc2');
          if (v !== 1) return ko('Bouton avant appuyé : il faut envoyer 1 (envoyé : ' + v + '). Vérifie le menu du bloc bouton (« avant »).', 1);
          await T.wait(400);
          if (T.sent() !== 0) return ko('Après avoir relâché le bouton, la télécommande doit renvoyer 0.', 2);
          return ok('La télécommande envoie 1 pour avancer et 0 pour s\'arrêter.');
        },
      },
      {
        id: 'tc_dirs', title: 'Les quatre directions',
        goal: 'Chaque bouton envoie son code : <b>avant 1</b>, <b>arrière 2</b>, <b>gauche 3</b>, <b>droite 4</b>. Aucun bouton : <b>0</b>.',
        explain: 'On ajoute des « sinon si » : le programme teste les boutons l\'un après l\'autre et envoie le code du premier bouton appuyé.',
        criteria: ['avant : 1', 'arrière : 2', 'gauche : 3', 'droite : 4', 'aucun : 0'],
        blocks: BASE.concat(['robot_radio_channel', 'robot_radio_send', 'controls_if', 'tc_button', 'wait_time', 'math_number']),
        hints: [
          'Clique sur le <b>+</b> du « si » pour ajouter des « sinon si » : il en faut 3, plus le « sinon ».',
          'Chaque « sinon si » teste un bouton : arrière → envoyer 2, gauche → envoyer 3, droite → envoyer 4.',
          'Le « sinon » final envoie 0. Garde « attendre 50 millisecondes » à la fin de la boucle.'],
        start: () => prog([chan], [ifB([[tcBtn('2'), [send(1)]]], [send(0)]), waitMs(50)]),
        solution: dirsSol,
        async check(T) {
          if (!T.has('robot_radio_send')) return ko('Il faut envoyer les codes : « radio : envoyer … ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          for (const [key, code, crit] of [['tc2', 1, 0], ['tc3', 2, 1], ['tc4', 3, 2], ['tc5', 4, 3]]) {
            T.caption('J\'appuie sur ' + TC_NAME[key.slice(2)] + ' → il faut envoyer ' + code);
            const v = await holdAndRead(T, key);
            if (v !== code) return ko('Bouton ' + TC_NAME[key.slice(2)] + ' : il faut envoyer ' + code + ' (envoyé : ' + v + ').', crit);
            await T.wait(300);
          }
          T.caption('Aucun bouton → il faut envoyer 0');
          await T.wait(400);
          if (T.sent() !== 0) return ko('Sans bouton appuyé, il faut envoyer 0.', 4);
          return ok('Les quatre directions sont envoyées. Ta télécommande peut piloter le robot !');
        },
      },
      {
        id: 'tc_turbo', title: 'Le mode turbo',
        goal: 'Un appui sur <b>turbo</b> active le mode rapide (LED allumée), un autre appui le désactive. En mode turbo, on ajoute <b>10</b> au code envoyé (11, 12, 13, 14).',
        explain: 'Il faut se souvenir du mode : c\'est le rôle d\'une <b>variable</b> « turbo » (0 ou 1). « vient d\'être appuyé ? » n\'est vrai qu\'une fois par appui : parfait pour basculer. Le code est aussi rangé dans une variable « code », pour pouvoir lui ajouter 10 avant de l\'envoyer.',
        criteria: ['Un appui sur turbo allume la LED, un autre l\'éteint', 'En turbo : avant envoie 11', 'Hors turbo : avant envoie 1'],
        blocks: BASE.concat(['robot_radio_channel', 'robot_radio_send', 'controls_if', 'tc_button', 'tc_click', 'tc_led', 'wait_time', 'math_number', 'logic_compare', 'math_arithmetic', 'VARIABLE']),
        hints: [
          'Variables « code » et « turbo ». Début de boucle : code = 0, puis les « si / sinon si » des boutons mettent code à 1, 2, 3 ou 4.',
          '« si bouton turbo vient d\'être appuyé ? » → mettre turbo à <b>1 − turbo</b> (ça alterne entre 0 et 1).',
          '« si turbo = 1 » → LED allumée et, si code &gt; 0, ajouter 10 à code ; sinon → LED éteinte. Enfin « envoyer code » et attendre 50 ms.'],
        start: dirsSol,
        solution: () => root.ArduinoMontages.example('telecommande'),
        async check(T) {
          if (!T.has('tc_led')) return ko('La LED turbo doit montrer le mode : bloc « LED turbo ».', 0);
          if (!T.has('tc_click') && !T.has('tc_button', (b) => b.getFieldValue('BTN') === '6')) return ko('Il faut lire le bouton turbo : « bouton turbo vient d\'être appuyé ? ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test 1 / 4 : mode normal → avant envoie 1');
          await T.wait(400);
          if (T.out('turbo')) return ko('Au démarrage, le mode turbo doit être éteint (variable turbo à 0 et LED éteinte).', 0);
          let v = await holdAndRead(T, 'tc2');
          if (v !== 1) return ko('En mode normal, avant doit envoyer 1 (envoyé : ' + v + ').', 2);
          T.caption('Test 2 / 4 : j\'appuie une fois sur turbo → LED allumée');
          await T.press('tc6', 200); await T.wait(500);
          if (!T.out('turbo')) return ko('Après un appui sur turbo, la LED doit rester allumée (même bouton relâché) : utilise une variable « turbo ».', 0);
          T.caption('Test 3 / 4 : mode turbo → avant envoie 11');
          v = await holdAndRead(T, 'tc2');
          if (v !== 11) return ko('En mode turbo, avant doit envoyer 11 (envoyé : ' + v + '). Ajoute 10 au code quand turbo = 1.', 1);
          await T.wait(300);
          if (T.sent() !== 0) return ko('Sans bouton, même en turbo, il faut envoyer 0 (n\'ajoute 10 que si code &gt; 0).', 1);
          T.caption('Test 4 / 4 : nouvel appui sur turbo → retour au mode normal');
          await T.press('tc6', 200); await T.wait(500);
          if (T.out('turbo')) return ko('Un 2e appui sur turbo doit éteindre le mode turbo : mets turbo à 1 − turbo.', 0);
          v = await holdAndRead(T, 'tc2');
          if (v !== 1) return ko('Revenu en mode normal, avant doit renvoyer 1 (envoyé : ' + v + ').', 2);
          return ok('Mode turbo parfait ! Le robot du parcours Cagett\'bot reconnaît les codes 11 à 14 (exemple « Cagett\'bot complet »).');
        },
      },
    ],
  };

  /* =============== 3. Pistolet laser =============== */
  const MUN = V('pl_mun');
  const plClick = (k) => ({ type: 'pl_click', fields: { BTN: k } });
  const ammo = (x) => ({ type: 'pl_ammo', inputs: { N: typeof x === 'number' ? sh(x) : { block: x } } });
  const shoot = { type: 'pl_shoot' };
  const countSol = () => prog([set(MUN, n(5)), ammo(get(MUN))], [ifB([[plClick('6'), [shoot, add(MUN, -1), ammo(get(MUN))]]])], [['munitions', 'pl_mun']]);
  async function pull(T, times, key) {
    const c = K.edgeCounter(() => T.out('laser'));
    for (let i = 0; i < times; i++) { await T.press(key || 'pl6', 120); await T.wait(450); }
    await T.wait(200);
    return c.stop();
  }
  const plCourse = {
    id: 'pistolet', icon: '🔫', title: 'Pistolet laser',
    description: 'Tirer, afficher et compter les munitions, recharger.',
    finish: 'Ton pistolet tire, compte ses munitions et se recharge. Essaie-le avec la cible LED ou les cibles à volets !',
    missions: [
      {
        id: 'pl_tir', title: 'Tirer avec la gâchette',
        goal: 'À chaque appui sur la <b>gâchette</b>, le pistolet <b>tire</b> (le laser s\'allume 0,2 seconde).',
        explain: '« vient d\'être appuyé ? » n\'est vrai qu\'<b>une fois</b> par appui : même si on garde le doigt sur la gâchette, il n\'y a qu\'un seul tir. ⚠️ Ne vise jamais les yeux avec le vrai laser.',
        criteria: ['Pas de tir sans appui', 'Un appui = un tir'],
        blocks: BASE.concat(['controls_if', 'pl_click', 'pl_button', 'pl_shoot']),
        hints: [
          'Catégorie <b>Pistolet laser</b>.',
          'Dans « répéter indéfiniment » : « si pistolet : bouton gâchette vient d\'être appuyé ? » → « pistolet : tirer ».',
          'Avec « bouton appuyé ? » (sans « vient d\'être »), le pistolet tirerait en rafale tant que le doigt reste appuyé.'],
        start: K.empty,
        solution: () => prog([], [ifB([[plClick('6'), [shoot]]])]),
        async check(T) {
          if (!T.has('pl_shoot') && !T.has('pl_laser')) return ko('Il faut le bloc « pistolet : tirer ».', 1);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test 1 / 3 : personne n\'appuie → pas de tir');
          const c0 = K.edgeCounter(() => T.out('laser'));
          await T.wait(1000);
          if (c0.stop() || T.out('laser')) return ko('Le pistolet tire tout seul ! Le tir doit être dans un « si gâchette vient d\'être appuyée ? ».', 0);
          T.caption('Test 2 / 3 : un appui sur la gâchette → un tir');
          let shots = await pull(T, 1);
          if (shots !== 1) return ko(shots ? 'Un seul appui a fait ' + shots + ' tirs : utilise « vient d\'être appuyé ? ».' : 'J\'appuie sur la gâchette mais le laser ne s\'allume pas. Vérifie le bouton choisi (gâchette).', 1);
          T.caption('Test 3 / 3 : trois appuis → trois tirs');
          shots = await pull(T, 3);
          if (shots !== 3) return ko('Trois appuis ont fait ' + shots + ' tir' + (shots > 1 ? 's' : '') + ' : il en faut exactement 3.', 1);
          return ok('Pan ! Un appui, un tir.');
        },
      },
      {
        id: 'pl_ammo', title: 'Afficher les munitions',
        goal: 'Au démarrage, le pistolet affiche <b>5 munitions</b> (5 LED allumées).',
        explain: 'Le bloc « afficher … munitions » allume autant de LED que le nombre donné (de 0 à 5) : D2, D3, D4, D7 et D8.',
        criteria: ['5 LED allumées au démarrage', 'Le pistolet tire toujours'],
        blocks: BASE.concat(['controls_if', 'pl_click', 'pl_shoot', 'pl_ammo', 'math_number']),
        hints: [
          'Le bloc « pistolet : afficher … munitions » est dans la même catégorie.',
          'Mets-le dans <b>« au démarrage »</b> avec le nombre 5.',
          'Garde le tir de la mission 1 dans « répéter indéfiniment ».'],
        start: () => prog([], [ifB([[plClick('6'), [shoot]]])]),
        solution: () => prog([ammo(5)], [ifB([[plClick('6'), [shoot]]])]),
        async check(T) {
          if (!T.has('pl_ammo')) return ko('Il faut le bloc « pistolet : afficher … munitions ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test 1 / 2 : au démarrage, 5 munitions affichées');
          await T.wait(600);
          if (T.bar('ammo') !== 5) return ko('Au démarrage, ' + T.bar('ammo') + ' LED sont allumées : il en faut 5.', 0);
          T.caption('Test 2 / 2 : le pistolet tire toujours');
          if ((await pull(T, 1)) !== 1) return ko('Le pistolet ne tire plus : garde le « si gâchette… → tirer » dans la boucle.', 1);
          return ok('5 munitions affichées. Il reste à les compter !');
        },
      },
      {
        id: 'pl_compte', title: 'Compter les munitions',
        goal: 'Chaque tir <b>enlève une munition</b> : après 3 tirs, il ne reste plus que 2 LED allumées.',
        explain: 'Le nombre de munitions change pendant le jeu : on le range dans une <b>variable</b> « munitions ». Elle vaut 5 au démarrage ; à chaque tir, on lui ajoute −1, puis on l\'affiche.',
        criteria: ['Une variable « munitions » qui vaut 5 au départ', 'Chaque tir enlève 1', 'L\'affichage suit la variable'],
        blocks: BASE.concat(['controls_if', 'pl_click', 'pl_shoot', 'pl_ammo', 'math_number', 'VARIABLE']),
        hints: [
          'Catégorie <b>Variables</b> : crée « munitions ». Au démarrage : « mettre munitions à 5 », puis « afficher munitions ».',
          'Après « tirer » : « ajouter −1 à munitions » (bloc « ajouter … à »).',
          'Puis « afficher » avec le bloc <b>munitions</b> (catégorie Variables) au lieu d\'un nombre.'],
        start: () => prog([ammo(5)], [ifB([[plClick('6'), [shoot]]])]),
        solution: countSol,
        async check(T) {
          if (!T.has('variables_set') && !T.has('math_change')) return ko('Il faut une variable « munitions » (catégorie Variables).', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          await T.wait(500);
          if (T.bar('ammo') !== 5) return ko('Au démarrage, il faut afficher 5 munitions.', 0);
          for (let i = 1; i <= 3; i++) {
            T.caption('Tir n° ' + i + ' → il doit rester ' + (5 - i) + ' munitions');
            const s = await pull(T, 1);
            if (s !== 1) return ko('Le tir n° ' + i + ' n\'a pas fonctionné.', 1);
            if (T.bar('ammo') !== 5 - i) return ko('Après ' + i + ' tir' + (i > 1 ? 's' : '') + ', le pistolet affiche ' + T.bar('ammo') + ' munitions au lieu de ' + (5 - i) + '. Ajoute −1 à la variable puis affiche-la.', T.bar('ammo') === 5 ? 1 : 2);
          }
          return ok('Le compte est bon : 3 tirs, 2 munitions restantes.');
        },
      },
      {
        id: 'pl_vide', title: 'Chargeur vide, recharger',
        goal: 'Quand il n\'y a plus de munitions, le pistolet <b>ne tire plus</b>. Le bouton <b>recharger</b> remet 5 munitions.',
        explain: 'On combine deux conditions avec « et » : on tire seulement si la gâchette vient d\'être appuyée <b>et</b> s\'il reste des munitions (munitions &gt; 0).',
        criteria: ['Pas plus de 5 tirs', 'Recharger remet 5 munitions', 'Le pistolet retire après la recharge'],
        blocks: BASE.concat(['controls_if', 'pl_click', 'pl_shoot', 'pl_ammo', 'math_number', 'logic_compare', 'logic_operation', 'VARIABLE']),
        hints: [
          'Remplace la condition du tir par « gâchette vient d\'être appuyée ? <b>et</b> munitions &gt; 0 » (blocs Logique « et » et « = »).',
          'Ajoute un 2e « si » : « bouton recharger vient d\'être appuyé ? » → mettre munitions à 5, puis afficher munitions.',
          'Pour être réaliste, tu peux n\'autoriser la recharge que si munitions = 0.'],
        start: countSol,
        solution: () => root.ArduinoMontages.example('pistolet'),
        async check(T) {
          if (!T.has('pl_click', (b) => b.getFieldValue('BTN') === '5') && !T.has('pl_button', (b) => b.getFieldValue('BTN') === '5')) return ko('Il faut utiliser le bouton « recharger ».', 1);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          await T.wait(400);
          T.caption('Test 1 / 3 : 7 appuis sur la gâchette → seulement 5 tirs');
          const s = await pull(T, 7);
          if (s > 5) return ko('Le pistolet a tiré ' + s + ' fois avec 5 munitions ! Ajoute la condition « munitions &gt; 0 » avec un « et ».', 0);
          if (s < 5) return ko('Le pistolet n\'a tiré que ' + s + ' fois : il doit tirer 5 fois avant d\'être vide.', 0);
          if (T.bar('ammo') !== 0) return ko('Le chargeur est vide : il faut afficher 0 munition.', 0);
          T.caption('Test 2 / 3 : j\'appuie sur recharger → 5 munitions');
          await T.press('pl5', 150); await T.wait(500);
          if (T.bar('ammo') !== 5) return ko('Après « recharger », il faut afficher 5 munitions (affiché : ' + T.bar('ammo') + ').', 1);
          T.caption('Test 3 / 3 : le pistolet peut de nouveau tirer');
          if ((await pull(T, 1)) !== 1 || T.bar('ammo') !== 4) return ko('Après la recharge, un tir doit fonctionner et laisser 4 munitions : la variable doit être remise à 5.', 2);
          return ok('Ton pistolet est terminé : 5 tirs, puis il faut recharger !');
        },
      },
    ],
  };

  /* =============== 4. Cible LED =============== */
  const VIES = V('cl_vies');
  const lives = (x) => ({ type: 'cl_lives', inputs: { N: typeof x === 'number' ? sh(x) : { block: x } } });
  const hit = { type: 'cl_hit', fields: { SEUIL: 300 } };
  const raz = { type: 'cible_raz' };
  const viesSol = (extra) => prog([set(VIES, n(5)), lives(get(VIES))], [ifB([[hit, [add(VIES, -1), lives(get(VIES))].concat(extra || [])]])], [['vies', 'cl_vies']]);
  const razSol = (extra) => prog([set(VIES, n(5)), lives(get(VIES))], [
    ifB([[K.and(hit, cmp('GT', get(VIES), n(0))), [add(VIES, -1), lives(get(VIES))].concat(extra || [])]]),
    ifB([[raz, [set(VIES, n(5)), lives(get(VIES))]]])], [['vies', 'cl_vies']]);
  async function fire(T, i, after) { T.shoot(i); await T.wait(after || 700); }
  const clCourse = {
    id: 'cible', icon: '🎯', title: 'Cible LED',
    description: 'Une cible à 5 vies qui détecte le laser.',
    finish: 'Ta cible compte les tirs reçus et se remet à zéro. Prête pour un duel avec le pistolet laser !',
    missions: [
      {
        id: 'cl_vies', title: 'Afficher 5 vies',
        goal: 'Au démarrage, la cible affiche <b>5 vies</b> (5 LED allumées).',
        explain: 'Le bloc « cible : afficher … vies » allume autant de LED que le nombre donné (D4 à D8). On prépare tout de suite une <b>variable</b> « vies » : elle servira à les compter.',
        criteria: ['Une variable « vies » qui vaut 5', '5 LED allumées au démarrage'],
        blocks: BASE.concat(['cl_lives', 'math_number', 'VARIABLE']),
        hints: [
          'Catégorie <b>Variables</b> : crée « vies » et prends « mettre vies à … » (valeur 5).',
          'Catégorie <b>Cible LED</b> : « cible : afficher … vies ».',
          'Dans « afficher », mets le bloc <b>vies</b> (catégorie Variables). Le tout dans « au démarrage ».'],
        start: K.empty,
        solution: () => prog([set(VIES, n(5)), lives(get(VIES))], [], [['vies', 'cl_vies']]),
        async check(T) {
          if (!T.has('cl_lives')) return ko('Il faut le bloc « cible : afficher … vies ».', 1);
          if (!T.has('variables_set')) return ko('Range le nombre de vies dans une variable : « mettre vies à 5 ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test : au démarrage, 5 vies affichées');
          await T.wait(600);
          if (T.bar('lives') !== 5) return ko('La cible affiche ' + T.bar('lives') + ' vies : il en faut 5. Mets la variable à 5 avant de l\'afficher.', 1);
          return ok('5 vies affichées. La partie peut commencer !');
        },
      },
      {
        id: 'cl_touche', title: 'Perdre une vie',
        goal: 'Chaque fois que le laser touche la cible, elle <b>perd une vie</b> : une LED s\'éteint.',
        explain: 'Le capteur de lumière KY-018 voit le point laser. « vient d\'être touchée ? » n\'est vrai qu\'une fois par tir. Dans le simulateur, le bouton « Tirer » envoie le laser sur la cible.',
        criteria: ['Un tir : 4 vies', 'Deux tirs : 3 vies', 'Pas de vie perdue sans tir'],
        blocks: BASE.concat(['controls_if', 'cl_hit', 'cl_lives', 'math_number', 'VARIABLE']),
        hints: [
          'Dans « répéter indéfiniment » : « si cible : vient d\'être touchée par le laser ? ».',
          'Dans ce « si » : « ajouter −1 à vies », puis « afficher vies ».',
          'Garde le démarrage de la mission 1 (vies à 5 et affichage).'],
        start: () => prog([set(VIES, n(5)), lives(get(VIES))], [], [['vies', 'cl_vies']]),
        solution: () => viesSol(),
        async check(T) {
          if (!T.has('cl_hit')) return ko('Il faut détecter le tir : « cible : vient d\'être touchée par le laser ? ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test 1 / 3 : pas de tir → 5 vies');
          await T.wait(1000);
          if (T.bar('lives') !== 5) return ko('Sans tir, la cible doit garder 5 vies (elle en affiche ' + T.bar('lives') + ').', 2);
          T.caption('Test 2 / 3 : un tir → 4 vies');
          await fire(T, 0);
          if (T.bar('lives') !== 4) return ko(T.bar('lives') === 5 ? 'Le tir n\'a rien changé : ajoute −1 à vies et affiche vies dans le « si touchée ».' : 'Après un tir, il faut 4 vies (affiché : ' + T.bar('lives') + '). Utilise « vient d\'être touchée ? ».', T.bar('lives') === 5 ? 0 : 1);
          T.caption('Test 3 / 3 : un deuxième tir → 3 vies');
          await fire(T, 0);
          if (T.bar('lives') !== 3) return ko('Après deux tirs, il faut 3 vies (affiché : ' + T.bar('lives') + ').', 1);
          return ok('Touché ! Chaque tir enlève bien une vie.');
        },
      },
      {
        id: 'cl_raz', title: 'Remise à zéro',
        goal: 'À 0 vie, la cible ne compte plus les tirs. Le bouton <b>RAZ</b> (D2) remet <b>5 vies</b> pour une nouvelle partie.',
        explain: 'Deux améliorations : on ne perd une vie que s\'il en reste (« touchée ? <b>et</b> vies &gt; 0 »), et un deuxième « si » surveille le bouton RAZ.',
        criteria: ['La variable ne descend pas sous 0', 'RAZ remet 5 vies'],
        blocks: BASE.concat(['controls_if', 'cl_hit', 'cl_lives', 'cible_raz', 'math_number', 'logic_compare', 'logic_operation', 'VARIABLE']),
        hints: [
          'Condition du tir : « vient d\'être touchée ? <b>et</b> vies &gt; 0 » (Logique).',
          'Ajoute un 2e « si » dans la boucle : « bouton RAZ appuyé ? » → mettre vies à 5, afficher vies.',
          'Le bloc « bouton RAZ appuyé ? » est dans la catégorie Cible LED.'],
        start: () => viesSol(),
        solution: () => root.ArduinoMontages.example('cible'),
        async check(T) {
          if (!T.has('cible_raz')) return ko('Il faut utiliser le bloc « bouton RAZ appuyé ? ».', 1);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          await T.wait(400);
          T.caption('Test 1 / 3 : 7 tirs → la cible tombe à 0 vie');
          for (let i = 0; i < 7; i++) await fire(T, 0, 600);
          if (T.bar('lives') !== 0) return ko('Après 7 tirs, la cible devrait afficher 0 vie (affiché : ' + T.bar('lives') + ').', 0);
          T.caption('Test 2 / 3 : RAZ → 5 vies');
          T.hold('raz', true); await T.wait(400); T.hold('raz', false); await T.wait(300);
          if (T.bar('lives') !== 5) return ko('Après un appui sur RAZ, il faut 5 vies (affiché : ' + T.bar('lives') + ').', 1);
          T.caption('Test 3 / 3 : un tir après RAZ → 4 vies');
          await fire(T, 0);
          if (T.bar('lives') !== 4) return ko('Après RAZ puis un tir, il faut 4 vies. Si la cible affiche 0 ou 5, la variable est peut-être descendue sous 0 : ajoute « et vies &gt; 0 ».', 0);
          return ok('La cible est prête pour des parties à répétition !');
        },
      },
      {
        id: 'cl_bouclier', title: 'Bouclier d\'une seconde',
        goal: 'Après chaque tir reçu, la cible est <b>protégée pendant 1 seconde</b> : un 2e tir trop rapide ne compte pas.',
        explain: 'Comme dans les jeux vidéo : après un coup, on est invincible un court instant. Il suffit d\'<b>attendre 1 seconde</b> après avoir perdu une vie : pendant ce temps, la carte ne regarde plus le capteur.',
        criteria: ['Deux tirs très rapprochés : une seule vie perdue', 'Un tir plus tard compte de nouveau'],
        blocks: BASE.concat(['controls_if', 'cl_hit', 'cl_lives', 'cible_raz', 'math_number', 'logic_compare', 'logic_operation', 'wait_time', 'VARIABLE']),
        hints: [
          'Le bloc « attendre » est dans la catégorie <b>Temps</b>.',
          'Place « attendre 1 seconde » juste après « afficher vies », dans le « si touchée ».',
          'Garde le « si RAZ » de la mission précédente.'],
        start: () => root.ArduinoMontages.example('cible'),
        solution: () => razSol([wait(1)]),
        async check(T) {
          if (!T.has('wait_time')) return ko('Il faut un bloc « attendre » pour le bouclier.', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          await T.wait(400);
          T.caption('Test 1 / 2 : deux tirs à 0,5 s d\'écart → une seule vie perdue');
          await fire(T, 0, 500);
          await fire(T, 0, 1500);
          const after = T.bar('lives');
          if (after === 3) return ko('Les deux tirs rapprochés ont compté : ajoute « attendre 1 seconde » après la perte d\'une vie.', 0);
          if (after !== 4) return ko('Après deux tirs rapprochés, il faut 4 vies (affiché : ' + after + ').', 0);
          T.caption('Test 2 / 2 : un tir 1,5 s plus tard → il compte');
          await fire(T, 0, 1500);
          if (T.bar('lives') !== 3) return ko('Un tir après la fin du bouclier doit compter (3 vies attendues, ' + T.bar('lives') + ' affichées). Le bouclier dure-t-il plus d\'une seconde ?', 1);
          return ok('Bouclier activé ! Les tirs en rafale ne comptent plus qu\'une fois.');
        },
      },
    ],
  };

  /* =============== 5. Cibles à volets =============== */
  const I = V('cv_i');
  const nb = (x) => (typeof x === 'number' ? { block: n(x) } : { block: x });
  const flap = (i, open) => ({ type: 'cv_flap', fields: { POS: open ? '0' : '90' }, inputs: { N: nb(i) } });
  const cvLed = (i, on) => ({ type: 'cv_led', fields: { STATE: on ? 'HIGH' : 'LOW' }, inputs: { N: nb(i) } });
  const cvHit = (i) => ({ type: 'cv_hit', fields: { SEUIL: 300 }, inputs: { N: nb(i) } });
  const openAll = () => [1, 2, 3, 4, 5].map((i) => flap(i, true));
  const cvCourse = {
    id: 'volets', icon: '🎪', title: 'Cibles à volets',
    description: '5 cibles dont le volet se ferme quand on les touche.',
    finish: 'Ton stand de tir est complet : les volets se ferment quand on touche les cibles, et RAZ relance la partie !',
    missions: [
      {
        id: 'cv_ouvrir', title: 'Ouvrir les 5 volets',
        goal: 'Au démarrage, les <b>5 volets</b> doivent s\'<b>ouvrir</b> pour montrer les cibles.',
        explain: 'Chaque volet est porté par un petit servomoteur (D9 à D13) : à 0° il est ouvert, à 90° il est fermé. Le bloc « volet de la cible n° … » s\'occupe des broches pour toi.',
        criteria: ['Les 5 volets sont ouverts'],
        blocks: BASE.concat(['cv_flap', 'math_number']),
        hints: [
          'Catégorie <b>Cibles à volets</b> : « volet de la cible n° … : ouvrir ».',
          'Il en faut un par cible : n° 1, 2, 3, 4 et 5.',
          'Mets-les tous dans « au démarrage ». (La mission 3 te montrera comment le faire avec une seule boucle !)'],
        start: K.empty,
        solution: () => prog(openAll(), []),
        async check(T) {
          if (!T.has('cv_flap')) return ko('Il faut le bloc « volet de la cible n° … ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          T.caption('Test : les 5 volets doivent s\'ouvrir');
          await T.wait(800);
          const closed = T.flaps().map((a, i) => (a >= 45 ? i + 1 : 0)).filter(Boolean);
          if (closed.length) return ko('Volet' + (closed.length > 1 ? 's' : '') + ' encore fermé' + (closed.length > 1 ? 's' : '') + ' : n° ' + closed.join(', ') + '. Choisis « ouvrir » et le bon numéro de cible.', 0);
          return ok('Les 5 cibles sont visibles !');
        },
      },
      {
        id: 'cv_un', title: 'Toucher la cible n° 1',
        goal: 'Quand la <b>cible n° 1</b> est touchée, son volet se <b>ferme</b> et sa <b>LED s\'allume</b>.',
        explain: 'Chaque cible a son capteur de lumière (A0 à A4). Le volet qui se ferme montre au tireur qu\'il a réussi, et la LED le confirme.',
        criteria: ['Cible 1 touchée : volet 1 fermé', 'LED 1 allumée', 'Les autres cibles ne bougent pas'],
        blocks: BASE.concat(['cv_flap', 'cv_hit', 'cv_led', 'controls_if', 'math_number']),
        hints: [
          'Dans « répéter indéfiniment » : « si cible n° 1 vient d\'être touchée ? ».',
          'Dans ce « si » : « volet de la cible n° 1 : fermer » et « LED de la cible n° 1 : allumer ».',
          'Garde l\'ouverture des volets dans « au démarrage ».'],
        start: () => prog(openAll(), []),
        solution: () => prog(openAll(), [ifB([[cvHit(1), [flap(1, false), cvLed(1, true)]]])]),
        async check(T) {
          if (!T.has('cv_hit')) return ko('Il faut détecter le tir : « cible n° … vient d\'être touchée ? ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          await T.wait(600);
          T.caption('Test 1 / 2 : je tire sur la cible n° 2 → rien ne doit se passer pour la cible 1');
          await fire(T, 1);
          if (T.flaps()[0] >= 45) return ko('Le volet 1 s\'est fermé alors que j\'ai tiré sur la cible 2 : teste bien la cible n° 1.', 2);
          T.caption('Test 2 / 2 : je tire sur la cible n° 1 → volet 1 fermé, LED 1 allumée');
          await fire(T, 0);
          if (T.flaps()[0] < 45) return ko('Cible 1 touchée, mais son volet reste ouvert : « volet de la cible n° 1 : fermer ».', 0);
          if (!T.cibleLeds()[0]) return ko('Le volet se ferme, mais la LED de la cible 1 doit aussi s\'allumer.', 1);
          return ok('Cible 1 abattue !');
        },
      },
      {
        id: 'cv_boucle', title: 'Les 5 cibles avec une boucle',
        goal: 'Fais la même chose pour <b>les 5 cibles</b>, mais <b>sans recopier</b> 5 fois les blocs : utilise une boucle « compter avec i de 1 à 5 ».',
        explain: 'La boucle « compter avec i » répète ses blocs avec i = 1, puis 2, 3, 4 et 5. Si on met <b>i</b> à la place du numéro de cible, un seul « si » surveille les 5 cibles !',
        criteria: ['Une boucle « compter avec i »', 'Chaque cible touchée ferme son volet', 'Sa LED s\'allume'],
        blocks: BASE.concat(['cv_flap', 'cv_hit', 'cv_led', 'controls_if', 'controls_for', 'math_number', 'VARIABLE']),
        hints: [
          'Catégorie <b>Boucles</b> : « compter avec i de 1 à 5 par 1 ».',
          'Dans la boucle, mets ton « si » de la mission 2, et remplace chaque 1 par le bloc <b>i</b> (catégorie Variables).',
          'Tu peux aussi ouvrir les 5 volets au démarrage avec une boucle « compter avec i » !'],
        start: () => prog(openAll(), [ifB([[cvHit(1), [flap(1, false), cvLed(1, true)]]])]),
        solution: () => prog([K.forI(I, 1, 5, [flap(get(I), true), cvLed(get(I), false)])],
          [K.forI(I, 1, 5, [ifB([[cvHit(get(I)), [flap(get(I), false), cvLed(get(I), true)]]])])], [['i', 'cv_i']]),
        async check(T) {
          if (!T.has('controls_for')) return ko('Utilise la boucle « compter avec i de 1 à 5 » (catégorie Boucles).', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          await T.wait(600);
          for (const i of [3, 5, 2]) {
            T.caption('Je tire sur la cible n° ' + i + ' → son volet doit se fermer');
            await fire(T, i - 1);
            if (T.flaps()[i - 1] < 45) return ko('La cible ' + i + ' est touchée mais son volet reste ouvert. Dans la boucle, utilise <b>i</b> comme numéro de cible (au lieu de 1).', 1);
            if (!T.cibleLeds()[i - 1]) return ko('Le volet ' + i + ' se ferme, mais la LED de la cible ' + i + ' doit aussi s\'allumer.', 2);
          }
          const f = T.flaps();
          if (f[0] >= 45 || f[3] >= 45) return ko('Des cibles que je n\'ai pas touchées se sont fermées.', 1);
          return ok('Une seule boucle pour 5 cibles : c\'est toute la puissance des boucles !');
        },
      },
      {
        id: 'cv_raz', title: 'Nouvelle partie avec RAZ',
        goal: 'Un appui sur le bouton <b>RAZ</b> rouvre les 5 volets et éteint les 5 LED : une nouvelle partie commence.',
        explain: 'On réutilise la boucle « compter avec i » : quand RAZ est appuyé, on ouvre le volet n° i et on éteint la LED n° i, pour i de 1 à 5.',
        criteria: ['RAZ rouvre tous les volets', 'RAZ éteint toutes les LED'],
        blocks: BASE.concat(['cv_flap', 'cv_hit', 'cv_led', 'cible_raz', 'controls_if', 'controls_for', 'math_number', 'VARIABLE']),
        hints: [
          'Ajoute un 2e « si » dans « répéter indéfiniment » : « bouton RAZ appuyé ? » (catégorie Cible LED ou Cibles à volets).',
          'Dans ce « si » : une boucle « compter avec i de 1 à 5 » avec « volet n° i : ouvrir » et « LED n° i : éteindre ».',
          'C\'est la même boucle que dans « au démarrage » : tu peux la dupliquer (clic droit › Dupliquer).'],
        start: () => prog([K.forI(I, 1, 5, [flap(get(I), true), cvLed(get(I), false)])],
          [K.forI(I, 1, 5, [ifB([[cvHit(get(I)), [flap(get(I), false), cvLed(get(I), true)]]])])], [['i', 'cv_i']]),
        solution: () => root.ArduinoMontages.example('volets'),
        async check(T) {
          if (!T.has('cible_raz')) return ko('Il faut utiliser le bloc « bouton RAZ appuyé ? ».', 0);
          if (T.orphans()) return ko(orphanMsg, 0);
          await T.start();
          await T.wait(600);
          T.caption('Test 1 / 2 : je touche les cibles 1, 2 et 4');
          for (const i of [1, 2, 4]) await fire(T, i - 1, 500);
          if (T.flaps().filter((a) => a >= 45).length !== 3) return ko('Les cibles touchées doivent se fermer (reprends la mission 3).', 0);
          T.caption('Test 2 / 2 : j\'appuie sur RAZ → tout se rouvre');
          T.hold('raz', true); await T.wait(400); T.hold('raz', false); await T.wait(500);
          if (T.flaps().some((a) => a >= 45)) return ko('Après RAZ, tous les volets doivent être ouverts.', 0);
          if (T.cibleLeds().some(Boolean)) return ko('Les volets sont rouverts, mais il faut aussi éteindre les LED.', 1);
          return ok('Nouvelle partie ! Ton stand de tir est terminé.');
        },
      },
    ],
  };

  root.GuideMontages = { led: ledCourse, telecommande: tcCourse, pistolet: plCourse, cible: clCourse, volets: cvCourse };
})(typeof window !== 'undefined' ? window : globalThis);
