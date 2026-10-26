/* Montages de la classe (tous sur Arduino Nano) : télécommande du robot, pistolet laser, cible LED, cibles à volets.
   Blocs, code C++ et exemples. Le câblage est celui des nomenclatures : rien à régler pour les élèves. */
(function (root) {
  'use strict';
  const Blockly = root.Blockly;
  const AB = root.ArduinoBlocks, AG = root.ArduinoGen;
  const { val, top, addOnce, autoMode, ATOM } = AG.helpers;
  const F = AG.gen.forBlock;

  const COL = { ext: '#495057', duo: '#0B7285', robot: '#0B7285', radio: '#5F3DC4', tc: '#1098AD', laser: '#C92A2A', pl: '#C92A2A', cl: '#E8590C', cv: '#F08C00' };
  const ICON = {
    tc_button: 'remote', tc_click: 'remote', tc_led: 'bulb',
    pl_button: 'button', pl_click: 'button', pl_shoot: 'laser', pl_laser: 'laser', pl_ammo: 'bulb',
    cl_hit: 'target', cl_light: 'sun', cl_lives: 'heart', cible_raz: 'button',
    cv_hit: 'target', cv_light: 'sun', cv_flap: 'servo', cv_led: 'bulb',
  };
  function def(type, json) {
    Blockly.Blocks[type] = {
      init: function () {
        this.jsonInit(json);
        if (ICON[type] && root.ArduinoArt && this.inputList.length) {
          this.inputList[0].insertFieldAt(0, new Blockly.FieldImage(root.ArduinoArt.blockIcon(ICON[type], json.colour), 24, 24, ICON[type]));
        }
      },
    };
  }
  const stmt = { previousStatement: null, nextStatement: null };
  const num = (name) => ({ type: 'input_value', name: name, check: ['Number'] });
  const drop = (name, options) => ({ type: 'field_dropdown', name: name, options: options });
  const onOff = drop('STATE', [['allumer', 'HIGH'], ['éteindre', 'LOW']]);
  const seuil = { type: 'field_number', name: 'SEUIL', value: 300, min: 0, max: 1023, precision: 1 };

  /* ----- Télécommande : boutons D2 avant, D3 arrière, D4 gauche, D5 droite, D6 turbo (vers GND), LED turbo D7, radio D9-D13 ----- */
  const TC_BTNS = [['avant', '2'], ['arrière', '3'], ['gauche', '4'], ['droite', '5'], ['turbo', '6']];
  def('tc_button', Object.assign({ message0: 'télécommande : bouton %1 appuyé ?', args0: [drop('BTN', TC_BTNS)], output: 'Boolean', colour: COL.tc,
    tooltip: 'Vrai tant que le bouton est enfoncé (avant D2, arrière D3, gauche D4, droite D5, turbo D6).' }));
  def('tc_click', Object.assign({ message0: 'télécommande : bouton %1 vient d\'être appuyé ?', args0: [drop('BTN', TC_BTNS)], output: 'Boolean', colour: COL.tc,
    tooltip: 'Vrai une seule fois par appui : pratique pour le bouton turbo (activer / désactiver).' }));
  def('tc_led', Object.assign({ message0: 'télécommande : LED turbo %1', args0: [onOff], colour: COL.tc, tooltip: 'La LED du mode rapide (D7).' }, stmt));

  /* ----- Pistolet laser : gâchette D6, recharger D5, laser D9, LED de munitions D2 D3 D4 D7 D8 ----- */
  const PL_BTNS = [['gâchette', '6'], ['recharger', '5']];
  def('pl_button', { message0: 'pistolet : bouton %1 appuyé ?', args0: [drop('BTN', PL_BTNS)], output: 'Boolean', colour: COL.pl,
    tooltip: 'Vrai tant que le bouton est enfoncé (gâchette D6, recharger D5).' });
  def('pl_click', { message0: 'pistolet : bouton %1 vient d\'être appuyé ?', args0: [drop('BTN', PL_BTNS)], output: 'Boolean', colour: COL.pl,
    tooltip: 'Vrai une seule fois par appui : un appui sur la gâchette = un seul tir.' });
  def('pl_shoot', Object.assign({ message0: 'pistolet : tirer (laser pendant 0,2 s)', colour: COL.pl,
    tooltip: 'Allume le module laser (D9) pendant 0,2 seconde. Ne vise jamais les yeux !' }, stmt));
  def('pl_laser', Object.assign({ message0: 'laser : %1', args0: [onOff], colour: COL.pl, tooltip: 'Allume ou éteint le module laser (D9). Ne vise jamais les yeux !' }, stmt));
  def('pl_ammo', Object.assign({ message0: 'pistolet : afficher %1 munitions', args0: [num('N')], inputsInline: true, colour: COL.pl,
    tooltip: 'Allume autant de LED que de munitions (0 à 5) : D2, D3, D4, D7, D8.' }, stmt));

  /* ----- Cible LED : capteur de lumière KY-018 A0, bouton RAZ D2, LED de vies D4 à D8 ----- */
  def('cl_hit', { message0: 'cible : vient d\'être touchée par le laser ? (seuil %1)', args0: [seuil], output: 'Boolean', colour: COL.cl,
    tooltip: 'Vrai une seule fois quand le point laser arrive sur le capteur (A0). Le KY-018 donne une valeur plus faible quand il est éclairé : '
      + 'si la cible ne réagit pas, affiche « lumière reçue » dans le moniteur série et ajuste le seuil.' });
  def('cl_light', { message0: 'cible : lumière reçue (0-1023)', output: 'Number', colour: COL.cl,
    tooltip: 'Valeur du capteur KY-018 (A0) : plus elle est faible, plus il y a de lumière.' });
  def('cible_raz', { message0: 'bouton RAZ appuyé ?', output: 'Boolean', colour: COL.cl, tooltip: 'Le bouton de remise à zéro des cibles (D2).' });
  def('cl_lives', Object.assign({ message0: 'cible : afficher %1 vies', args0: [num('N')], inputsInline: true, colour: COL.cl,
    tooltip: 'Allume autant de LED que de vies (0 à 5) : D4 à D8.' }, stmt));

  /* ----- Cibles à volets : 5 capteurs A0-A4, 5 servos D9-D13 (0° ouvert, 90° fermé), 5 LED D4-D8, bouton RAZ D2 ----- */
  def('cv_hit', { message0: 'cible n° %1 vient d\'être touchée ? (seuil %2)', args0: [num('N'), seuil], inputsInline: true, output: 'Boolean', colour: COL.cv,
    tooltip: 'Cibles 1 à 5 (capteurs A0 à A4). Vrai une seule fois quand le laser arrive sur la cible.' });
  def('cv_light', { message0: 'lumière reçue par la cible n° %1', args0: [num('N')], inputsInline: true, output: 'Number', colour: COL.cv,
    tooltip: 'Valeur du capteur de la cible (plus faible quand il est éclairé).' });
  def('cv_flap', Object.assign({ message0: 'volet de la cible n° %1 : %2', args0: [num('N'), drop('POS', [['fermer', '90'], ['ouvrir', '0']])], inputsInline: true, colour: COL.cv,
    tooltip: 'Servomoteurs SG90 des cibles 1 à 5 (D9 à D13) : 0° ouvert, 90° fermé.' }, stmt));
  def('cv_led', Object.assign({ message0: 'LED de la cible n° %1 : %2', args0: [num('N'), onOff], inputsInline: true, colour: COL.cv,
    tooltip: 'LED des cibles 1 à 5 (D4 à D8).' }, stmt));

  /* ===================== Code C++ ===================== */
  const PIN_OF = (b) => b.getFieldValue('BTN');
  function clickHelper(g) {
    g.functions_.set('vient_appuye', [
      '// vrai une seule fois par appui (bouton relié à GND), avec anti-rebond',
      'bool vient_appuye(byte broche) {',
      '  static bool avant[20];',
      '  static unsigned long t[20];',
      '  bool maintenant = digitalRead(broche) == LOW;',
      '  bool appui = maintenant && !avant[broche] && millis() - t[broche] > 50;',
      '  if (maintenant != avant[broche]) t[broche] = millis();',
      '  avant[broche] = maintenant;',
      '  return appui;',
      '}',
    ].join('\n'));
  }
  function ledsHelper(g, name, pins) {
    for (const p of pins) autoMode(p, 'OUTPUT');
    addOnce(g.globals_, 'const byte ' + name + '[5] = {' + pins.join(', ') + '};');
    g.functions_.set('afficher_leds', [
      '// allume les n premières LED d\'une rangée de 5',
      'void afficher_leds(const byte broches[5], long n) {',
      '  for (byte i = 0; i < 5; i++) digitalWrite(broches[i], i < n ? HIGH : LOW);',
      '}',
    ].join('\n'));
  }
  function laserHelper(g) {
    g.functions_.set('touche_laser', [
      '// vrai une seule fois quand le capteur de lumière (KY-018) passe sous le seuil : le laser vient d\'arriver',
      'bool touche_laser(byte broche, int seuil) {',
      '  static bool avant[8];',
      '  byte i = broche - A0;',
      '  bool eclaire = analogRead(broche) < seuil;',
      '  bool arrive = eclaire && !avant[i];',
      '  avant[i] = eclaire;',
      '  return arrive;',
      '}',
    ].join('\n'));
  }
  const n15 = (g, b) => top(g, b, 'N', '1');
  function ciblesHelper(g) {
    addOnce(g.globals_, 'const byte CIBLES[5] = {A0, A1, A2, A3, A4};');
    g.functions_.set('cible_broche', 'byte cible_broche(long n) { return CIBLES[constrain(n, 1, 5) - 1]; }');
  }

  F.tc_button = (b) => { autoMode(PIN_OF(b), 'INPUT_PULLUP'); return ['(digitalRead(' + PIN_OF(b) + ') == LOW)', ATOM]; };
  F.tc_click = (b, g) => { autoMode(PIN_OF(b), 'INPUT_PULLUP'); clickHelper(g); return ['vient_appuye(' + PIN_OF(b) + ')', ATOM]; };
  F.tc_led = (b) => { autoMode('7', 'OUTPUT'); return 'digitalWrite(7, ' + b.getFieldValue('STATE') + ');\n'; };
  F.pl_button = F.tc_button;
  F.pl_click = F.tc_click;
  F.pl_shoot = () => { autoMode('9', 'OUTPUT'); return 'digitalWrite(9, HIGH);   // tir laser\ndelay(200);\ndigitalWrite(9, LOW);\n'; };
  F.pl_laser = (b) => { autoMode('9', 'OUTPUT'); return 'digitalWrite(9, ' + b.getFieldValue('STATE') + ');\n'; };
  F.pl_ammo = (b, g) => { ledsHelper(g, 'LEDS_MUNITIONS', ['2', '3', '4', '7', '8']); return 'afficher_leds(LEDS_MUNITIONS, ' + top(g, b, 'N', '0') + ');\n'; };
  F.cl_hit = (b, g) => { laserHelper(g); return ['touche_laser(A0, ' + Math.round(Number(b.getFieldValue('SEUIL'))) + ')', ATOM]; };
  F.cl_light = () => ['analogRead(A0)', ATOM];
  F.cible_raz = () => { autoMode('2', 'INPUT_PULLUP'); return ['(digitalRead(2) == LOW)', ATOM]; };
  F.cl_lives = (b, g) => { ledsHelper(g, 'LEDS_VIES', ['4', '5', '6', '7', '8']); return 'afficher_leds(LEDS_VIES, ' + top(g, b, 'N', '0') + ');\n'; };
  F.cv_hit = (b, g) => { laserHelper(g); ciblesHelper(g); return ['touche_laser(cible_broche(' + n15(g, b) + '), ' + Math.round(Number(b.getFieldValue('SEUIL'))) + ')', ATOM]; };
  F.cv_light = (b, g) => { ciblesHelper(g); return ['analogRead(cible_broche(' + n15(g, b) + '))', ATOM]; };
  F.cv_flap = (b, g) => {
    addOnce(g.includes_, '#include <Servo.h>');
    addOnce(g.globals_, 'Servo volets[5];                      // servos des cibles 1 à 5 : D9 à D13');
    addOnce(g.autoSetup_, 'for (byte i = 0; i < 5; i++) volets[i].attach(9 + i);');
    g.functions_.set('volet', 'void volet(long n, int angle) { volets[constrain(n, 1, 5) - 1].write(angle); }');
    return 'volet(' + n15(g, b) + ', ' + b.getFieldValue('POS') + ');\n';
  };
  F.cv_led = (b, g) => {
    for (const p of ['4', '5', '6', '7', '8']) autoMode(p, 'OUTPUT');
    addOnce(g.globals_, 'const byte LEDS_CIBLES[5] = {4, 5, 6, 7, 8};');
    g.functions_.set('led_cible', 'void led_cible(long n, byte etat) { digitalWrite(LEDS_CIBLES[constrain(n, 1, 5) - 1], etat); }');
    return 'led_cible(' + n15(g, b) + ', ' + b.getFieldValue('STATE') + ');\n';
  };

  /* ===================== Boîte à outils : « Radio » et « Extensions » (tout en bas) ===================== */
  const nb = (v) => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
  const blk = (type, inputs) => ({ kind: 'block', type: type, inputs: inputs });
  const sub = (name, key, contents) => ({ kind: 'category', name: name, colour: COL[key], cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-' + key }, contents: contents });
  const contents = AB.TOOLBOX.contents;
  const ri = contents.findIndex((c) => c.name === 'Robot');
  const robotCat = contents.splice(ri, 1)[0];
  const radioBlocks = robotCat.contents.filter((x) => x.type && x.type.indexOf('robot_radio') === 0);
  const robotOnly = robotCat.contents.filter((x) => !(x.type && x.type.indexOf('robot_radio') === 0) && !(x.kind === 'label' && /Radio/.test(x.text)));
  const note = (t) => ({ kind: 'label', text: t, 'web-class': 'flyoutNote' });
  // Radio : catégorie à part, juste après « Capteurs et actionneurs »
  const si = contents.findIndex((c) => /Capteurs/.test(c.name));
  contents.splice(si + 1, 0, sub('Radio', 'radio', [note('Module nRF24L01 : D9 CE, D10 CSN, D11 à D13'), ...radioBlocks]));
  // Extensions : tout en bas, les montages qui fonctionnent ensemble sont rangés ensemble
  contents.push({ kind: 'category', name: 'Extensions', colour: COL.ext, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-ext' }, expanded: false, contents: [
    { kind: 'category', name: 'Robot et télécommande', colour: COL.duo, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-duo' }, expanded: true, contents: [
      sub('Robot', 'robot', [note('Se pilote avec la télécommande (blocs Radio, même groupe radio)'), ...robotOnly]),
      sub('Télécommande', 'tc', [note('Pilote le robot : envoie un nombre par radio (blocs Radio)'),
        blk('tc_button'), blk('tc_click'), blk('tc_led'), ...radioBlocks.filter((x) => x.type === 'robot_radio_send')]),
    ] },
    { kind: 'category', name: 'Tir laser', colour: COL.laser, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-laser' }, expanded: true, contents: [
      sub('Pistolet laser', 'pl', [note('Tire sur la cible LED ou sur les cibles à volets'),
        blk('pl_click'), blk('pl_button'), blk('pl_shoot'), blk('pl_laser'), blk('pl_ammo', { N: nb(5) })]),
      sub('Cible LED', 'cl', [note('Se vise avec le pistolet laser'), blk('cl_hit'), blk('cl_light'), blk('cible_raz'), blk('cl_lives', { N: nb(5) })]),
      sub('Cibles à volets', 'cv', [note('Se visent avec le pistolet laser'),
        blk('cv_hit', { N: nb(1) }), blk('cv_light', { N: nb(1) }), blk('cv_flap', { N: nb(1) }), blk('cv_led', { N: nb(1) }), blk('cible_raz')]),
    ] },
  ] });
  // la couleur des blocs radio suit leur nouvelle catégorie
  for (const t of ['robot_radio_channel', 'robot_radio_send', 'robot_radio_received', 'robot_radio_value']) {
    const init = Blockly.Blocks[t].init;
    Blockly.Blocks[t].init = function () { init.call(this); this.setColour(COL.radio); };
  }
  AB.CATEGORY_ICONS.push(
    { cls: 'cat-ext', glyph: 'puzzle', color: COL.ext }, { cls: 'cat-duo', glyph: 'robot', color: COL.duo }, { cls: 'cat-laser', glyph: 'laser', color: COL.laser }, { cls: 'cat-radio', glyph: 'radio', color: COL.radio },
    { cls: 'cat-tc', glyph: 'remote', color: COL.tc }, { cls: 'cat-pl', glyph: 'laser', color: COL.pl },
    { cls: 'cat-cl', glyph: 'target', color: COL.cl }, { cls: 'cat-cv', glyph: 'servo', color: COL.cv });

  /* ===================== Exemples ===================== */
  const chain = (list) => { let next = null; for (let i = list.length - 1; i >= 0; i--) { const b = Object.assign({}, list[i]); if (next) b.next = { block: next }; next = b; } return next; };
  const ifB = (branches, elseBody) => {
    const b = { type: 'controls_if', extraState: {}, inputs: {} };
    if (branches.length > 1) b.extraState.elseIfCount = branches.length - 1;
    if (elseBody) { b.extraState.hasElse = true; b.inputs.ELSE = { block: chain(elseBody) }; }
    branches.forEach((br, i) => { b.inputs['IF' + i] = { block: br[0] }; b.inputs['DO' + i] = { block: chain(br[1]) }; });
    return b;
  };
  const n = (v) => ({ type: 'math_number', fields: { NUM: v } });
  const V = (id) => ({ id: id });
  const get = (v) => ({ type: 'variables_get', fields: { VAR: v } });
  const set = (v, x) => ({ type: 'variables_set', fields: { VAR: v }, inputs: { VALUE: { block: x } } });
  const add = (v, d) => ({ type: 'math_change', fields: { VAR: v }, inputs: { DELTA: { block: n(d) } } });
  const cmp = (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const and = (a, b) => ({ type: 'logic_operation', fields: { OP: 'AND' }, inputs: { A: { block: a }, B: { block: b } } });
  const arith = (op, a, b) => ({ type: 'math_arithmetic', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const forI = (v, body) => ({ type: 'controls_for', fields: { VAR: v }, inputs: { FROM: { block: n(1) }, TO: { block: n(5) }, BY: { block: n(1) }, DO: { block: chain(body) } } });
  const prog = (vars, setup, loop) => ({ board: 'nano', variables: vars.map((v) => ({ name: v[0], id: v[1] })), blocks: { languageVersion: 0, blocks: [
    { type: 'arduino_setup', x: 30, y: 20, inputs: setup.length ? { DO: { block: chain(setup) } } : {} },
    { type: 'arduino_loop', x: 30, y: 60 + 50 * setup.length, inputs: { DO: { block: chain(loop) } } },
  ] } });

  const EXAMPLES = {
    /* Télécommande : envoie 1 avant, 2 arrière, 3 gauche, 4 droite, 0 rien ; +10 en mode turbo. */
    telecommande: () => {
      const CODE = V('tc_code'), TURBO = V('tc_turbo');
      const btn = (k) => ({ type: 'tc_button', fields: { BTN: k } });
      return prog([['code', 'tc_code'], ['turbo', 'tc_turbo']],
        [{ type: 'robot_radio_channel', fields: { CH: 76 } }, set(TURBO, n(0))],
        [set(CODE, n(0)),
          ifB([[btn('2'), [set(CODE, n(1))]], [btn('3'), [set(CODE, n(2))]], [btn('4'), [set(CODE, n(3))]], [btn('5'), [set(CODE, n(4))]]]),
          ifB([[{ type: 'tc_click', fields: { BTN: '6' } }, [set(TURBO, arith('MINUS', n(1), get(TURBO)))]]]),
          ifB([[cmp('EQ', get(TURBO), n(1)), [{ type: 'tc_led', fields: { STATE: 'HIGH' } },
            ifB([[cmp('GT', get(CODE), n(0)), [add(CODE, 10)]]])]]], [{ type: 'tc_led', fields: { STATE: 'LOW' } }]),
          { type: 'robot_radio_send', inputs: { VALUE: { block: get(CODE) } } },
          { type: 'wait_time', fields: { UNIT: '1' }, inputs: { DURATION: { block: n(50) } } }]);
    },
    /* Pistolet : 5 tirs, puis il faut recharger. */
    pistolet: () => {
      const M = V('pl_mun');
      const show = { type: 'pl_ammo', inputs: { N: { block: get(M) } } };
      return prog([['munitions', 'pl_mun']], [set(M, n(5)), show], [
        ifB([[and({ type: 'pl_click', fields: { BTN: '6' } }, cmp('GT', get(M), n(0))), [{ type: 'pl_shoot' }, add(M, -1), show]]]),
        ifB([[and({ type: 'pl_click', fields: { BTN: '5' } }, cmp('EQ', get(M), n(0))), [set(M, n(5)), show]]]),
      ]);
    },
    /* Cible LED : 5 vies, une de moins à chaque tir reçu, RAZ pour recommencer. */
    cible: () => {
      const L = V('cl_vies');
      const show = { type: 'cl_lives', inputs: { N: { block: get(L) } } };
      return prog([['vies', 'cl_vies']], [set(L, n(5)), show], [
        ifB([[and({ type: 'cl_hit', fields: { SEUIL: 300 } }, cmp('GT', get(L), n(0))), [add(L, -1), show]]]),
        ifB([[{ type: 'cible_raz' }, [set(L, n(5)), show]]]),
      ]);
    },
    /* Cibles à volets : chaque cible touchée ferme son volet et allume sa LED ; RAZ rouvre tout. */
    volets: () => {
      const I = V('cv_i');
      const open = () => [{ type: 'cv_flap', fields: { POS: '0' }, inputs: { N: { block: get(I) } } }, { type: 'cv_led', fields: { STATE: 'LOW' }, inputs: { N: { block: get(I) } } }];
      return prog([['i', 'cv_i']], [forI(I, open())], [
        forI(I, [ifB([[{ type: 'cv_hit', fields: { SEUIL: 300 }, inputs: { N: { block: get(I) } } }, [
          { type: 'cv_flap', fields: { POS: '90' }, inputs: { N: { block: get(I) } } },
          { type: 'cv_led', fields: { STATE: 'HIGH' }, inputs: { N: { block: get(I) } } }]]])]),
        ifB([[{ type: 'cible_raz' }, [forI(I, open())]]]),
      ]);
    },
  };

  root.ArduinoMontages = { COLORS: COL, example: (k) => EXAMPLES[k](), uses: (ws, prefix) => ws.getAllBlocks(false).some((b) => b.isEnabled() && b.type.indexOf(prefix) === 0) };
})(typeof window !== 'undefined' ? window : globalThis);
