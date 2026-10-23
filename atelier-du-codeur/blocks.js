/* Définition des blocs Arduino (en français) et de la boîte à outils. */
(function (root) {
  'use strict';
  const Blockly = root.Blockly;

  /* Palette vive : une couleur bien distincte par catégorie. */
  const C = {
    structure: '#E5A100', io: '#EF476F', time: '#12B5A8', sensors: '#3D7BFF', logic: '#8A5CF6',
    loops: '#34B34A', math: '#C84BC8', text: '#1AA6D9', vars: '#F4631E',
  };
  function shade(hex, f) { // f > 0 : éclaircit vers le blanc ; f < 0 : assombrit vers le noir
    const n = parseInt(hex.slice(1), 16), t = f < 0 ? 0 : 255, k = Math.abs(f);
    const mix = (v) => Math.round((t - v) * k + v);
    const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const style = (c) => ({ colourPrimary: c, colourSecondary: shade(c, 0.35), colourTertiary: shade(c, -0.25) });
  /* Thème : recolore aussi les blocs standards de Blockly (logique, boucles, maths, texte, variables). */
  const THEME = Blockly.Theme.defineTheme('arduinoVif', {
    base: Blockly.Themes.Zelos,
    blockStyles: {
      logic_blocks: style(C.logic), loop_blocks: style(C.loops), math_blocks: style(C.math),
      text_blocks: style(C.text), variable_blocks: style(C.vars), variable_dynamic_blocks: style(C.vars),
    },
    fontStyle: { family: 'Fredoka, "Trebuchet MS", "Segoe UI", sans-serif', weight: '600', size: 12 },
    componentStyles: {
      workspaceBackgroundColour: 'transparent',   // le décor de la page reste visible derrière les blocs
      toolboxBackgroundColour: '#ffffff',
      toolboxForegroundColour: '#2b2d42',
      flyoutBackgroundColour: '#f3eeff',
      flyoutOpacity: 0.97,
      scrollbarColour: '#b9a6ff',
      scrollbarOpacity: 0.55,
    },
  });

  const DIGITAL = [];
  for (let i = 2; i <= 13; i++) DIGITAL.push(['D' + i, String(i)]);
  for (let i = 0; i <= 5; i++) DIGITAL.push(['A' + i, 'A' + i]);
  const PWM = [3, 5, 6, 9, 10, 11].map((n) => ['D' + n, String(n)]);
  const ANALOG = [];
  for (let i = 0; i <= 7; i++) ANALOG.push(['A' + i, 'A' + i]);

  const ICON = {
    arduino_setup: 'flag', arduino_loop: 'loop', pin_mode: 'chip', digital_write: 'bulb', digital_read: 'button',
    analog_write: 'slider', analog_read: 'knob', wait_time: 'clock', millis_now: 'stopwatch', ultrasonic_cm: 'eyes',
    servo_write: 'servo', buzzer_tone: 'note', serial_print: 'chat', map_value: 'scale',
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
  const pin = (name, opts) => ({ type: 'field_dropdown', name: name, options: opts || DIGITAL });
  const num = (name) => ({ type: 'input_value', name: name, check: ['Number'] });

  /* ----- Structure ----- */
  def('arduino_setup', {
    message0: 'au démarrage %1 %2',
    args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }],
    colour: C.structure,
    tooltip: 'Ces blocs sont exécutés une seule fois, quand la carte démarre.',
  }, true);

  def('arduino_loop', {
    message0: 'répéter indéfiniment %1 %2',
    args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }],
    colour: C.structure,
    tooltip: 'Ces blocs sont exécutés en boucle, sans fin.',
  }, true);

  /* ----- Entrées / sorties ----- */
  def('pin_mode', {
    message0: 'configurer la broche %1 en %2',
    args0: [pin('PIN'), { type: 'field_dropdown', name: 'MODE', options: [
      ['sortie', 'OUTPUT'], ['entrée', 'INPUT'], ['entrée avec pull-up', 'INPUT_PULLUP'],
    ] }],
    previousStatement: null, nextStatement: null, colour: C.io,
    tooltip: 'Choisit si la broche envoie ou reçoit un signal. Pull-up : pratique pour un bouton relié à la masse.',
  });

  def('digital_write', {
    message0: 'mettre la broche %1 à %2',
    args0: [pin('PIN'), { type: 'field_dropdown', name: 'LEVEL', options: [['HAUT (allumé)', 'HIGH'], ['BAS (éteint)', 'LOW']] }],
    previousStatement: null, nextStatement: null, colour: C.io,
    tooltip: 'Allume ou éteint une sortie (LED, relais…). La LED de la carte est sur D13.',
  });

  def('digital_read', {
    message0: 'lire la broche %1',
    args0: [pin('PIN')],
    output: null, colour: C.io,
    tooltip: 'Donne HAUT (1) ou BAS (0). Avec une entrée pull-up, un bouton appuyé donne BAS.',
  });

  def('analog_write', {
    message0: 'régler la broche PWM %1 à %2 (0-255)',
    args0: [pin('PIN', PWM), num('VALUE')],
    previousStatement: null, nextStatement: null, colour: C.io,
    tooltip: 'Variation de luminosité d\'une LED ou de vitesse d\'un moteur. 0 = éteint, 255 = maximum.',
  });

  def('analog_read', {
    message0: 'lire l\'entrée analogique %1',
    args0: [pin('PIN', ANALOG)],
    output: 'Number', colour: C.io,
    tooltip: 'Donne une valeur de 0 à 1023 (capteur de lumière, potentiomètre…).',
  });

  /* ----- Temps ----- */
  def('wait_time', {
    message0: 'attendre %1 %2',
    args0: [num('DURATION'), { type: 'field_dropdown', name: 'UNIT', options: [['secondes', '1000'], ['millisecondes', '1']] }],
    previousStatement: null, nextStatement: null, colour: C.time,
    tooltip: 'Met le programme en pause.',
  });

  def('millis_now', {
    message0: 'temps écoulé depuis le démarrage (ms)',
    output: 'Number', colour: C.time,
    tooltip: 'Nombre de millisecondes depuis le démarrage de la carte.',
  });

  /* ----- Capteurs et actionneurs ----- */
  def('ultrasonic_cm', {
    message0: 'distance (cm) capteur HC-SR04 trig %1 echo %2',
    args0: [pin('TRIG'), pin('ECHO')],
    output: 'Number', colour: C.sensors,
    tooltip: 'Mesure la distance avec un capteur à ultrasons. Donne 0 si rien n\'est détecté.',
  });

  def('servo_write', {
    message0: 'servo-moteur broche %1 angle %2 °',
    args0: [pin('PIN'), num('ANGLE')],
    previousStatement: null, nextStatement: null, colour: C.sensors,
    tooltip: 'Place le servo-moteur à un angle de 0 à 180 degrés.',
  });

  def('buzzer_tone', {
    message0: 'buzzer broche %1 fréquence %2 Hz pendant %3 ms',
    args0: [pin('PIN'), num('FREQ'), num('DURATION')],
    previousStatement: null, nextStatement: null, colour: C.sensors,
    tooltip: 'Joue une note (ex. 440 Hz = La) et attend la fin de la note.',
  });

  def('serial_print', {
    message0: 'écrire dans le moniteur série %1 %2',
    args0: [{ type: 'input_value', name: 'TEXT' }, { type: 'field_dropdown', name: 'NL', options: [['avec retour à la ligne', 'ln'], ['sans retour à la ligne', '']] }],
    previousStatement: null, nextStatement: null, colour: C.sensors,
    tooltip: 'Affiche une valeur dans le moniteur série de l\'IDE Arduino (9600 bauds).',
  });

  /* ----- Maths ----- */
  def('map_value', {
    message0: 'convertir %1 de %2 – %3 vers %4 – %5',
    args0: [num('VALUE'), num('FROM_LOW'), num('FROM_HIGH'), num('TO_LOW'), num('TO_HIGH')],
    inputsInline: true, output: 'Number', colour: C.math,
    tooltip: 'Change d\'échelle : par exemple 0-1023 vers 0-255.',
  });

  /* ----- Boîte à outils ----- */
  const n = (v) => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
  const blk = (type, inputs, fields) => ({ kind: 'block', type: type, inputs: inputs, fields: fields });

  const TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
      { kind: 'category', name: 'Structure', colour: C.structure, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-structure' }, contents: [blk('arduino_setup'), blk('arduino_loop')] },
      { kind: 'category', name: 'Entrées / sorties', colour: C.io, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-io' }, contents: [
        blk('pin_mode'), blk('digital_write'), blk('digital_read'),
        blk('analog_write', { VALUE: n(128) }), blk('analog_read'),
      ] },
      { kind: 'category', name: 'Temps', colour: C.time, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-time' }, contents: [
        blk('wait_time', { DURATION: n(1) }), blk('millis_now'),
      ] },
      { kind: 'category', name: 'Capteurs et actionneurs', colour: C.sensors, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-sensors' }, contents: [
        blk('ultrasonic_cm'), blk('servo_write', { ANGLE: n(90) }),
        blk('buzzer_tone', { FREQ: n(440), DURATION: n(500) }),
        blk('serial_print', { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Bonjour' } } } }),
      ] },
      { kind: 'category', name: 'Logique', colour: C.logic, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-logic' }, contents: [
        blk('controls_if'), blk('logic_compare'), blk('logic_operation'), blk('logic_negate'), blk('logic_boolean'),
      ] },
      { kind: 'category', name: 'Boucles', colour: C.loops, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-loops' }, contents: [
        blk('controls_repeat_ext', { TIMES: n(10) }), blk('controls_whileUntil'),
        blk('controls_for', { FROM: n(1), TO: n(10), BY: n(1) }), blk('controls_flow_statements'),
      ] },
      { kind: 'category', name: 'Maths', colour: C.math, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-math' }, contents: [
        blk('math_number'), blk('math_arithmetic', { A: n(1), B: n(1) }),
        blk('math_random_int', { FROM: n(1), TO: n(100) }),
        blk('map_value', { VALUE: n(0), FROM_LOW: n(0), FROM_HIGH: n(1023), TO_LOW: n(0), TO_HIGH: n(255) }),
      ] },
      { kind: 'category', name: 'Texte', colour: C.text, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-text' }, contents: [blk('text')] },
      { kind: 'category', name: 'Variables', colour: C.vars, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-vars' }, custom: 'VARIABLE' },
    ],
  };

  /* Programme d'exemple : faire clignoter la LED de la carte. */
  const EXAMPLE = {
    blocks: { languageVersion: 0, blocks: [
      { type: 'arduino_setup', x: 30, y: 30, inputs: { DO: { block: { type: 'pin_mode', fields: { PIN: '13', MODE: 'OUTPUT' } } } } },
      { type: 'arduino_loop', x: 30, y: 150, inputs: { DO: { block:
        { type: 'digital_write', fields: { PIN: '13', LEVEL: 'HIGH' }, next: { block:
        { type: 'wait_time', fields: { UNIT: '1000' }, inputs: { DURATION: { shadow: { type: 'math_number', fields: { NUM: 1 } } } }, next: { block:
        { type: 'digital_write', fields: { PIN: '13', LEVEL: 'LOW' }, next: { block:
        { type: 'wait_time', fields: { UNIT: '1000' }, inputs: { DURATION: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        } } } } } } } } },
    ] },
  };

  const CATEGORY_ICONS = [
    ['structure', 'flag'], ['io', 'chip'], ['time', 'clock'], ['sensors', 'eyes'], ['logic', 'fork'],
    ['loops', 'loop'], ['math', 'plusminus'], ['text', 'text'], ['vars', 'box'],
  ].map((e) => ({ cls: 'cat-' + e[0], glyph: e[1], color: C[e[0]] }));

  root.ArduinoBlocks = { TOOLBOX: TOOLBOX, EXAMPLE: EXAMPLE, THEME: THEME, COLORS: C, CATEGORY_ICONS: CATEGORY_ICONS };
})(typeof window !== 'undefined' ? window : globalThis);
