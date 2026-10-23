/* Blocs pour la carte micro:bit (V1 et V2) : définitions en français, boîte à outils, thème. */
(function (root) {
  'use strict';
  const Blockly = root.Blockly;

  const C = {
    structure: '#E5A100', display: '#EF476F', input: '#3D7BFF', music: '#F4631E', time: '#12B5A8',
    logic: '#8A5CF6', loops: '#34B34A', math: '#C84BC8', text: '#1AA6D9', vars: '#A8742A',
  };
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), t = f < 0 ? 0 : 255, k = Math.abs(f);
    const mix = (v) => Math.round((t - v) * k + v);
    const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const style = (c) => ({ colourPrimary: c, colourSecondary: shade(c, 0.35), colourTertiary: shade(c, -0.25) });
  const THEME = Blockly.Theme.defineTheme('microbitVif', {
    base: Blockly.Themes.Zelos,
    blockStyles: {
      logic_blocks: style(C.logic), loop_blocks: style(C.loops), math_blocks: style(C.math),
      text_blocks: style(C.text), variable_blocks: style(C.vars), variable_dynamic_blocks: style(C.vars),
    },
    fontStyle: { family: 'Fredoka, "Trebuchet MS", "Segoe UI", sans-serif', weight: '600', size: 12 },
    componentStyles: {
      workspaceBackgroundColour: 'transparent', toolboxBackgroundColour: '#ffffff', toolboxForegroundColour: '#2b2d42',
      flyoutBackgroundColour: '#f3eeff', flyoutOpacity: 0.97, scrollbarColour: '#b9a6ff', scrollbarOpacity: 0.55,
    },
  });

  /* ----- Champ « grille de LED » : 5 x 5 cases à cliquer ----- */
  const CELL = 17, GAP = 3, N = 5;
  class FieldMatrix extends Blockly.Field {
    constructor(value) {
      super(value || '0'.repeat(25));
      this.SERIALIZABLE = true;
      this.cells_ = [];
    }
    static fromJson(options) { return new FieldMatrix(options.value); }
    doClassValidator_(v) { return typeof v === 'string' && /^[01]{25}$/.test(v) ? v : null; }
    initView() {
      const mk = Blockly.utils.dom.createSvgElement;
      this.bg_ = mk('rect', { rx: 6 }, this.fieldGroup_);
      this.bg_.style.fill = '#2a1a2e'; this.bg_.style.fillOpacity = '0.9';   // le style en ligne l'emporte sur la règle CSS de Blockly (champs blancs)
      for (let i = 0; i < 25; i++) {
        const x = i % N, y = Math.floor(i / N);
        const r = mk('rect', { x: GAP + x * (CELL + GAP), y: GAP + y * (CELL + GAP), width: CELL, height: CELL, rx: 4, 'data-i': String(i), style: 'cursor:pointer' }, this.fieldGroup_);
        this.cells_.push(r);
      }
      this.paint_();
    }
    paint_() {
      const v = this.getValue() || '0'.repeat(25);
      this.cells_.forEach((r, i) => { r.style.fill = v[i] === '1' ? '#ff3b57' : '#5b4560'; r.style.fillOpacity = '1'; });
    }
    updateSize_() {
      const s = GAP + N * (CELL + GAP);
      this.size_.width = s; this.size_.height = s;
      if (this.bg_) { this.bg_.setAttribute('width', s); this.bg_.setAttribute('height', s); }
    }
    render_() { this.paint_(); this.updateSize_(); }
    showEditor_(e) {
      const t = e && e.target;
      const i = t && t.getAttribute ? t.getAttribute('data-i') : null;
      if (i == null) return;
      const v = (this.getValue() || '0'.repeat(25)).split('');
      v[+i] = v[+i] === '1' ? '0' : '1';
      this.setValue(v.join(''));
    }
    getText_() { return ''; }
  }
  Blockly.fieldRegistry.register('field_matrix', FieldMatrix);

  const PINS = [0, 1, 2, 8, 12, 13, 14, 15, 16].map((n) => ['P' + n, String(n)]);
  const PINS_ANALOG = [0, 1, 2].map((n) => ['P' + n, String(n)]);

  const ICON = {
    mb_setup: 'flag', mb_loop: 'loop', mb_scroll: 'text', mb_show: 'grid', mb_show_image: 'heart', mb_show_leds: 'grid',
    mb_led: 'bulb', mb_led_off: 'bulb', mb_clear: 'grid', mb_button: 'button', mb_was_pressed: 'button', mb_gesture: 'tilt',
    mb_accel: 'tilt', mb_compass: 'compass', mb_temperature: 'thermo', mb_light: 'sun', mb_touch: 'hand', mb_logo: 'hand',
    mb_sound: 'mic', mb_pin_write: 'chip', mb_pin_read: 'chip', mb_pin_write_analog: 'slider', mb_pin_read_analog: 'knob',
    mb_note: 'note', mb_pitch: 'note', mb_melody: 'note', mb_music_stop: 'note', mb_wait: 'clock', mb_running_time: 'stopwatch',
    mb_print: 'chat', mb_map: 'scale',
  };
  function def(type, json, hat) {
    Blockly.Blocks[type] = {
      init: function () {
        this.jsonInit(json);
        if (hat) this.hat = 'cap';
        if (ICON[type] && root.ArduinoArt && this.inputList.length) {
          this.inputList[0].insertFieldAt(0, new Blockly.FieldImage(root.ArduinoArt.blockIcon(ICON[type], json.colour), 24, 24, ICON[type]));
        }
      },
    };
  }
  const num = (name) => ({ type: 'input_value', name: name, check: ['Number'] });
  const any = (name) => ({ type: 'input_value', name: name });
  const drop = (name, options) => ({ type: 'field_dropdown', name: name, options: options });
  const stmt = { previousStatement: null, nextStatement: null };

  /* ----- Structure ----- */
  def('mb_setup', { message0: 'au démarrage %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }],
    colour: C.structure, tooltip: 'Ces blocs sont exécutés une seule fois, quand la carte démarre.' }, true);
  def('mb_loop', { message0: 'répéter indéfiniment %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }],
    colour: C.structure, tooltip: 'Ces blocs sont exécutés en boucle, sans fin.' }, true);

  /* ----- Écran ----- */
  const IMAGES = [
    ['cœur', 'HEART'], ['petit cœur', 'HEART_SMALL'], ['content', 'HAPPY'], ['sourire', 'SMILE'], ['triste', 'SAD'],
    ['surpris', 'SURPRISED'], ['en colère', 'ANGRY'], ['endormi', 'ASLEEP'], ['perplexe', 'CONFUSED'], ['rigolo', 'SILLY'],
    ['bof', 'MEH'], ['oui (✔)', 'YES'], ['non (✘)', 'NO'], ['canard', 'DUCK'], ['maison', 'HOUSE'], ['tortue', 'TORTOISE'],
    ['papillon', 'BUTTERFLY'], ['fantôme', 'GHOST'], ['girafe', 'GIRAFFE'], ['lapin', 'RABBIT'], ['vache', 'COW'],
    ['serpent', 'SNAKE'], ['crâne', 'SKULL'], ['épée', 'SWORD'], ['cible', 'TARGET'], ['carré', 'SQUARE'],
    ['losange', 'DIAMOND'], ['triangle', 'TRIANGLE'], ['flèche ↑', 'ARROW_N'], ['flèche →', 'ARROW_E'],
    ['flèche ↓', 'ARROW_S'], ['flèche ←', 'ARROW_W'],
  ];
  def('mb_scroll', { message0: 'faire défiler %1', args0: [any('TEXT')], ...stmt, colour: C.display,
    tooltip: 'Fait défiler un texte ou un nombre sur l\'écran de LED. Les accents ne s\'affichent pas : ils sont retirés.' });
  def('mb_show', { message0: 'afficher %1', args0: [any('TEXT')], ...stmt, colour: C.display,
    tooltip: 'Affiche un nombre ou des lettres, un caractère à la fois.' });
  def('mb_show_image', { message0: 'afficher l\'image %1', args0: [drop('IMAGE', IMAGES)], ...stmt, colour: C.display,
    tooltip: 'Affiche un dessin tout prêt sur les 25 LED.' });
  def('mb_show_leds', { message0: 'dessiner %1', args0: [{ type: 'field_matrix', name: 'LEDS', value: '0'.repeat(25) }], ...stmt, colour: C.display,
    tooltip: 'Clique sur les cases pour allumer ou éteindre les LED, puis la carte affiche ton dessin.' });
  def('mb_led', { message0: 'allumer la LED x %1 y %2 luminosité %3', args0: [num('X'), num('Y'), num('LEVEL')], inputsInline: true, ...stmt,
    colour: C.display, tooltip: 'x et y vont de 0 à 4 (0,0 = en haut à gauche). Luminosité de 0 (éteinte) à 9 (maximum).' });
  def('mb_led_off', { message0: 'éteindre la LED x %1 y %2', args0: [num('X'), num('Y')], inputsInline: true, ...stmt,
    colour: C.display, tooltip: 'x et y vont de 0 à 4 (0,0 = en haut à gauche).' });
  def('mb_clear', { message0: 'effacer l\'écran', ...stmt, colour: C.display, tooltip: 'Éteint toutes les LED.' });

  /* ----- Entrées ----- */
  def('mb_button', { message0: 'bouton %1 appuyé ?', args0: [drop('BTN', [['A', 'a'], ['B', 'b'], ['A+B', 'ab']])], output: 'Boolean',
    colour: C.input, tooltip: 'Vrai tant que le bouton est maintenu appuyé.' });
  def('mb_was_pressed', { message0: 'bouton %1 a été appuyé depuis tout à l\'heure ?', args0: [drop('BTN', [['A', 'a'], ['B', 'b']])], output: 'Boolean',
    colour: C.input, tooltip: 'Vrai si le bouton a été appuyé depuis la dernière fois qu\'on a posé la question (même un appui très court).' });
  def('mb_gesture', { message0: 'geste %1 ?', args0: [drop('G', [
    ['secoué', 'shake'], ['incliné à gauche', 'left'], ['incliné à droite', 'right'], ['écran vers le haut', 'face up'],
    ['écran vers le bas', 'face down'], ['carte debout (haut)', 'up'], ['carte debout (bas)', 'down'], ['en chute libre', 'freefall'],
  ])], output: 'Boolean', colour: C.input, tooltip: 'Vrai quand la carte fait ce mouvement.' });
  def('mb_accel', { message0: 'accélération %1', args0: [drop('AXIS', [['x (gauche-droite)', 'x'], ['y (avant-arrière)', 'y'], ['z (haut-bas)', 'z']])],
    output: 'Number', colour: C.input, tooltip: 'Force ressentie sur l\'axe, en milli-g (de -2000 à 2000 environ).' });
  def('mb_compass', { message0: 'direction de la boussole (°)', output: 'Number', colour: C.input,
    tooltip: 'De 0 à 359 (0 = nord). La première fois, la carte demande de faire un cercle avec l\'écran pour s\'étalonner.' });
  def('mb_temperature', { message0: 'température (°C)', output: 'Number', colour: C.input, tooltip: 'Température mesurée par la carte.' });
  def('mb_light', { message0: 'niveau de lumière', output: 'Number', colour: C.input,
    tooltip: 'De 0 (noir) à 255 (très lumineux), mesuré grâce aux LED de l\'écran.' });
  def('mb_touch', { message0: 'broche %1 touchée ?', args0: [drop('PIN', [['P0', '0'], ['P1', '1'], ['P2', '2']])], output: 'Boolean',
    colour: C.input, tooltip: 'Vrai si tu touches la broche (avec l\'autre main sur GND).' });
  def('mb_logo', { message0: 'logo touché ? (V2)', output: 'Boolean', colour: C.input,
    tooltip: 'Le logo doré est tactile sur la micro:bit V2. Sur une V1, la réponse est toujours faux.' });
  def('mb_sound', { message0: 'niveau sonore (V2)', output: 'Number', colour: C.input,
    tooltip: 'De 0 à 255, mesuré par le micro de la micro:bit V2. Sur une V1, la réponse est toujours 0.' });
  def('mb_pin_write', { message0: 'mettre la broche %1 à %2', args0: [drop('PIN', PINS), drop('LEVEL', [['1 (allumé)', '1'], ['0 (éteint)', '0']])], ...stmt,
    colour: C.input, tooltip: 'Allume ou éteint une sortie (LED, relais…).' });
  def('mb_pin_read', { message0: 'lire la broche %1', args0: [drop('PIN', PINS)], output: 'Number', colour: C.input,
    tooltip: 'Donne 1 ou 0.' });
  def('mb_pin_write_analog', { message0: 'régler la broche %1 à %2 (0-1023)', args0: [drop('PIN', PINS), num('VALUE')], ...stmt, colour: C.input,
    tooltip: 'Luminosité d\'une LED ou vitesse d\'un moteur. 0 = éteint, 1023 = maximum.' });
  def('mb_pin_read_analog', { message0: 'lire l\'entrée analogique %1', args0: [drop('PIN', PINS_ANALOG)], output: 'Number', colour: C.input,
    tooltip: 'Donne une valeur de 0 à 1023 (potentiomètre, capteur de lumière…).' });

  /* ----- Musique ----- */
  const NOTES = [['Do', '262'], ['Ré', '294'], ['Mi', '330'], ['Fa', '349'], ['Sol', '392'], ['La', '440'], ['Si', '494'], ['Do aigu', '523']];
  def('mb_note', { message0: 'jouer la note %1 pendant %2 ms', args0: [drop('NOTE', NOTES), num('DURATION')], inputsInline: true, ...stmt,
    colour: C.music, tooltip: 'Joue une note et attend la fin. Sur V1, branche un buzzer ou un casque entre P0 et GND.' });
  def('mb_pitch', { message0: 'jouer la fréquence %1 Hz pendant %2 ms', args0: [num('FREQ'), num('DURATION')], inputsInline: true, ...stmt,
    colour: C.music, tooltip: 'Joue un son (440 Hz = La) et attend la fin.' });
  const MELODIES = [['joyeux anniversaire', 'BIRTHDAY'], ['ode à la joie', 'ODE'], ['dadadadum (Beethoven)', 'DADADADUM'], ['prélude', 'PRELUDE'],
    ['entertainer', 'ENTERTAINER'], ['mariage', 'WEDDING'], ['nyan', 'NYAN'], ['sonnerie', 'RINGTONE'], ['funk', 'FUNK'], ['blues', 'BLUES'],
    ['python', 'PYTHON'], ['poursuite', 'CHASE'], ['punchline', 'PUNCHLINE'], ['funèbre', 'FUNERAL'], ['saut (haut)', 'JUMP_UP'],
    ['saut (bas)', 'JUMP_DOWN'], ['power up', 'POWER_UP'], ['power down', 'POWER_DOWN'], ['ding', 'BA_DING'], ['wawawawaa', 'WAWAWAWAA']];
  def('mb_melody', { message0: 'jouer la mélodie %1', args0: [drop('TUNE', MELODIES)], ...stmt, colour: C.music,
    tooltip: 'Joue une petite mélodie et attend la fin.' });
  def('mb_music_stop', { message0: 'arrêter le son', ...stmt, colour: C.music, tooltip: 'Coupe le son.' });

  /* ----- Temps ----- */
  def('mb_wait', { message0: 'attendre %1 %2', args0: [num('DURATION'), drop('UNIT', [['secondes', '1000'], ['millisecondes', '1']])], ...stmt,
    colour: C.time, tooltip: 'Met le programme en pause.' });
  def('mb_running_time', { message0: 'temps écoulé depuis le démarrage (ms)', output: 'Number', colour: C.time,
    tooltip: 'Nombre de millisecondes depuis le démarrage de la carte.' });

  /* ----- Autres ----- */
  def('mb_print', { message0: 'écrire dans la console série %1', args0: [any('TEXT')], ...stmt, colour: C.input,
    tooltip: 'Envoie du texte par le câble USB (visible dans l\'éditeur Mu ou sur python.microbit.org).' });
  def('mb_map', { message0: 'convertir %1 de %2 – %3 vers %4 – %5', args0: [num('VALUE'), num('FROM_LOW'), num('FROM_HIGH'), num('TO_LOW'), num('TO_HIGH')],
    inputsInline: true, output: 'Number', colour: C.math, tooltip: 'Change d\'échelle : par exemple 0-255 vers 0-4.' });

  /* ----- Boîte à outils ----- */
  const n = (v) => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
  const t = (v) => ({ shadow: { type: 'text', fields: { TEXT: v } } });
  const blk = (type, inputs, fields) => ({ kind: 'block', type: type, inputs: inputs, fields: fields });
  const cat = (name, key, contents, extra) => Object.assign({ kind: 'category', name: name, colour: C[key],
    cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-' + key }, contents: contents }, extra);

  const TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
      cat('Structure', 'structure', [blk('mb_setup'), blk('mb_loop')]),
      cat('Écran', 'display', [
        blk('mb_scroll', { TEXT: t('Bonjour !') }), blk('mb_show', { TEXT: n(5) }), blk('mb_show_image'), blk('mb_show_leds'),
        blk('mb_led', { X: n(2), Y: n(2), LEVEL: n(9) }), blk('mb_led_off', { X: n(2), Y: n(2) }), blk('mb_clear'),
      ]),
      cat('Entrées', 'input', [
        blk('mb_button'), blk('mb_was_pressed'), blk('mb_gesture'), blk('mb_accel'), blk('mb_compass'), blk('mb_temperature'),
        blk('mb_light'), blk('mb_touch'), blk('mb_logo'), blk('mb_sound'),
        blk('mb_pin_write'), blk('mb_pin_read'), blk('mb_pin_write_analog', { VALUE: n(512) }), blk('mb_pin_read_analog'),
        blk('mb_print', { TEXT: t('Bonjour') }),
      ]),
      cat('Musique', 'music', [
        blk('mb_note', { DURATION: n(500) }), blk('mb_pitch', { FREQ: n(440), DURATION: n(500) }), blk('mb_melody'), blk('mb_music_stop'),
      ]),
      cat('Temps', 'time', [blk('mb_wait', { DURATION: n(1) }), blk('mb_running_time')]),
      cat('Logique', 'logic', [blk('controls_if'), blk('logic_compare'), blk('logic_operation'), blk('logic_negate'), blk('logic_boolean')]),
      cat('Boucles', 'loops', [
        blk('controls_repeat_ext', { TIMES: n(10) }), blk('controls_whileUntil'),
        blk('controls_for', { FROM: n(1), TO: n(10), BY: n(1) }), blk('controls_flow_statements'),
      ]),
      cat('Maths', 'math', [
        blk('math_number'), blk('math_arithmetic', { A: n(1), B: n(1) }), blk('math_random_int', { FROM: n(1), TO: n(5) }),
        blk('mb_map', { VALUE: n(0), FROM_LOW: n(0), FROM_HIGH: n(255), TO_LOW: n(0), TO_HIGH: n(4) }),
      ]),
      cat('Texte', 'text', [blk('text'), blk('text_join')]),
      cat('Variables', 'vars', [], { custom: 'VARIABLE' }),
    ],
  };

  /* Programme d'exemple : un cœur qui bat, et un smiley quand on appuie sur A. */
  const wait = (ms, next) => ({ type: 'mb_wait', fields: { UNIT: '1' }, inputs: { DURATION: { shadow: { type: 'math_number', fields: { NUM: ms } } } }, next: next && { block: next } });
  const EXAMPLE = {
    blocks: { languageVersion: 0, blocks: [
      { type: 'mb_loop', x: 30, y: 30, inputs: { DO: { block:
        { type: 'mb_show_image', fields: { IMAGE: 'HEART' }, next: { block: wait(500, {
          type: 'mb_show_image', fields: { IMAGE: 'HEART_SMALL' }, next: { block: wait(500) } }) } } } } },
    ] },
  };

  const CATEGORY_ICONS = [
    ['structure', 'flag'], ['display', 'grid'], ['input', 'button'], ['music', 'note'], ['time', 'clock'], ['logic', 'fork'],
    ['loops', 'loop'], ['math', 'plusminus'], ['text', 'text'], ['vars', 'box'],
  ].map((e) => ({ cls: 'cat-' + e[0], glyph: e[1], color: C[e[0]] }));

  root.MicrobitBlocks = { TOOLBOX: TOOLBOX, EXAMPLE: EXAMPLE, THEME: THEME, COLORS: C, CATEGORY_ICONS: CATEGORY_ICONS, IMAGES: IMAGES, MELODIES: MELODIES };
})(typeof window !== 'undefined' ? window : globalThis);
