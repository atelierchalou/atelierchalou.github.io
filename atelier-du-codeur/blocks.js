/* Définition des blocs Arduino (en français) et de la boîte à outils. */
(function (root) {
  'use strict';
  const Blockly = root.Blockly;

  /* Palette vive : une couleur bien distincte par catégorie. */
  const C = {
    structure: '#E5A100', io: '#EF476F', time: '#12B5A8', sensors: '#3D7BFF', logic: '#8A5CF6',
    loops: '#34B34A', math: '#C84BC8', text: '#1AA6D9', vars: '#F4631E', robot: '#0B7285',
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

  /* ----- Cartes : broches disponibles (la Nano est la carte par défaut) ----- */
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(String(i)); return r; };
  const AN = (n) => range(0, n).map((i) => 'A' + i);
  const ESP_OUT = ['2', '4', '5', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23', '25', '26', '27', '32', '33'];
  const avrLabel = (v) => (v[0] === 'A' ? v : 'D' + v) + (v === '13' ? ' (LED)' : '');
  const BOARDS = {
    nano: { id: 'nano', name: 'Arduino Nano', short: 'Nano', led: '13', label: avrLabel,
      out: range(2, 13).concat(AN(5)), in: range(2, 13).concat(AN(5)), pwm: ['3', '5', '6', '9', '10', '11'], analog: AN(7) },
    uno: { id: 'uno', name: 'Arduino Uno', short: 'Uno', led: '13', label: avrLabel,
      out: range(2, 13).concat(AN(5)), in: range(2, 13).concat(AN(5)), pwm: ['3', '5', '6', '9', '10', '11'], analog: AN(5) },
    esp32: { id: 'esp32', name: 'ESP32 DevKit', short: 'ESP32', led: '2', label: (v) => 'GPIO ' + v + (v === '2' ? ' (LED)' : ''),
      out: ESP_OUT, in: ESP_OUT.concat(['34', '35', '36', '39']), pwm: ESP_OUT, analog: ['32', '33', '34', '35', '36', '39'] },
  };
  let current = 'nano';
  const pinsOf = (kind, id) => {
    const b = BOARDS[id || current];
    return kind === 'any' ? b.in : b[kind];
  };
  /* Liste déroulante de broches qui suit la carte choisie. */
  class FieldPin extends Blockly.FieldDropdown {
    constructor(kind, value) {
      super(() => pinsOf(kind).map((v) => [BOARDS[current].label(v), v]));
      this.kind_ = kind;
      if (value) this.setValue(value);
    }
    static fromJson(o) { return new FieldPin(o.kind, o.value); }
  }
  Blockly.fieldRegistry.register('field_pin', FieldPin);

  /* Change de carte ; renvoie le nombre de broches qu'il a fallu remplacer dans le programme. */
  function setBoard(id, ws) {
    const prev = BOARDS[current];
    current = BOARDS[id] ? id : 'nano';
    const led = BOARDS[current].led;
    let changed = 0;
    if (!ws) return 0;
    for (const blk of ws.getAllBlocks(false)) {
      for (const input of blk.inputList) for (const f of input.fieldRow) {
        if (!(f instanceof FieldPin)) continue;
        const list = pinsOf(f.kind_), v = f.getValue();
        let next = v;
        if (v === prev.led && prev.led !== led && list.indexOf(led) >= 0) next = led;       // la LED de la carte suit la carte
        else if (list.indexOf(v) < 0) next = f.kind_ !== 'analog' && list.indexOf(led) >= 0 ? led : list[0];
        if (next !== v) changed++;
        f.getOptions(false);      // recalcule la liste (D13 -> GPIO 13…)
        f.doValueUpdate_(next);
        f.forceRerender();
      }
    }
    return changed;
  }

  const ICON = {
    arduino_setup: 'flag', arduino_loop: 'loop', pin_mode: 'chip', digital_write: 'bulb', digital_read: 'button',
    analog_write: 'slider', analog_read: 'knob', wait_time: 'clock', millis_now: 'stopwatch', ultrasonic_cm: 'eyes',
    servo_write: 'servo', buzzer_tone: 'note', serial_print: 'chat', map_value: 'scale',
    robot_move: 'robot', robot_stop: 'robot', robot_motors: 'robot', robot_distance: 'eyes', robot_line: 'track', robot_led: 'bulb',
    robot_mode: 'button', robot_mode_click: 'button', robot_radio_channel: 'radio', robot_radio_send: 'radio',
    robot_radio_received: 'radio', robot_radio_value: 'radio',
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
  const pin = (name, kind) => ({ type: 'field_pin', name: name, kind: kind || 'out' });
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
    args0: [pin('PIN', 'any'), { type: 'field_dropdown', name: 'MODE', options: [
      ['sortie', 'OUTPUT'], ['entrée', 'INPUT'], ['entrée avec pull-up', 'INPUT_PULLUP'],
    ] }],
    previousStatement: null, nextStatement: null, colour: C.io,
    tooltip: 'Choisit si la broche envoie ou reçoit un signal. Pull-up : pratique pour un bouton relié à la masse.',
  });

  def('digital_write', {
    message0: 'mettre la broche %1 à %2',
    args0: [pin('PIN'), { type: 'field_dropdown', name: 'LEVEL', options: [['HAUT (allumé)', 'HIGH'], ['BAS (éteint)', 'LOW']] }],
    previousStatement: null, nextStatement: null, colour: C.io,
    tooltip: 'Allume ou éteint une sortie (LED, relais…). La LED de la carte est sur D13 (GPIO 2 sur l\'ESP32).',
  });

  def('digital_read', {
    message0: 'lire la broche %1',
    args0: [pin('PIN', 'in')],
    output: null, colour: C.io,
    tooltip: 'Donne HAUT (1) ou BAS (0). Avec une entrée pull-up, un bouton appuyé donne BAS.',
  });

  def('analog_write', {
    message0: 'régler la broche PWM %1 à %2 (0-255)',
    args0: [pin('PIN', 'pwm'), num('VALUE')],
    previousStatement: null, nextStatement: null, colour: C.io,
    tooltip: 'Variation de luminosité d\'une LED ou de vitesse d\'un moteur. 0 = éteint, 255 = maximum.',
  });

  def('analog_read', {
    message0: 'lire l\'entrée analogique %1',
    args0: [pin('PIN', 'analog')],
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
    args0: [pin('TRIG', 'out'), pin('ECHO', 'in')],
    output: 'Number', colour: C.sensors,
    tooltip: 'Mesure la distance avec un capteur à ultrasons. Donne 0 si rien n\'est détecté.',
  });

  def('servo_write', {
    message0: 'servo-moteur broche %1 angle %2 °',
    args0: [pin('PIN', 'pwm'), num('ANGLE')],
    previousStatement: null, nextStatement: null, colour: C.sensors,
    tooltip: 'Place le servo-moteur à un angle de 0 à 180 degrés.',
  });

  def('buzzer_tone', {
    message0: 'buzzer broche %1 fréquence %2 Hz pendant %3 ms',
    args0: [pin('PIN', 'pwm'), num('FREQ'), num('DURATION')],
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

  /* ----- Robot « Cagett'bot » (câblage fixe de la nomenclature, sur Arduino Nano) -----
     L298N : ENA D5, IN1 D7, IN2 D8 (moteur gauche) ; ENB D6, IN3 D4, IN4 D3 (moteur droit)
     HC-SR04 : TRIG D2, ECHO A0 ; LED obstacle : A1 ; suiveurs de ligne TCRT5000 : A2 (gauche), A3 (droit)
     bouton MODE : A4 (vers GND) ; radio nRF24L01 : CE D9, CSN D10, SPI D11-D13 */
  const R = { colour: C.robot };
  const pct = (name) => ({ type: 'input_value', name: name, check: ['Number'] });
  def('robot_move', Object.assign({ message0: 'robot : %1 à la vitesse %2 %%', args0: [
    { type: 'field_dropdown', name: 'DIR', options: [['avancer', 'FWD'], ['reculer', 'BACK'], ['tourner à gauche', 'LEFT'], ['tourner à droite', 'RIGHT'],
      ['pivoter sur place à gauche', 'SPIN_L'], ['pivoter sur place à droite', 'SPIN_R']] }, pct('SPEED')],
    inputsInline: true, previousStatement: null, nextStatement: null,
    tooltip: 'Fait rouler le robot (vitesse de 0 à 100 %). En dessous de 30 % environ, les moteurs jaunes peuvent ne pas démarrer. Le robot continue jusqu\'au prochain ordre.' }, R));
  def('robot_stop', Object.assign({ message0: 'robot : s\'arrêter', previousStatement: null, nextStatement: null,
    tooltip: 'Coupe les deux moteurs.' }, R));
  def('robot_motors', Object.assign({ message0: 'moteurs : gauche %1 %% droit %2 %%', args0: [pct('LEFT'), pct('RIGHT')], inputsInline: true,
    previousStatement: null, nextStatement: null,
    tooltip: 'Règle chaque roue de -100 % (marche arrière) à 100 % (marche avant). Si une roue tourne à l\'envers, inverse ses deux fils sur le L298N.' }, R));
  def('robot_distance', Object.assign({ message0: 'distance de l\'obstacle (cm)', output: 'Number',
    tooltip: 'Mesurée par le capteur à ultrasons (TRIG D2, ECHO A0). Donne 999 s\'il n\'y a rien devant (plus de 4 m).' }, R));
  def('robot_line', Object.assign({ message0: 'capteur de ligne %1 voit du %2 ?', args0: [
    { type: 'field_dropdown', name: 'SIDE', options: [['gauche', 'L'], ['droit', 'R']] },
    { type: 'field_dropdown', name: 'COLOR', options: [['noir', 'BLACK'], ['blanc', 'WHITE']] }], output: 'Boolean',
    tooltip: 'Capteurs TCRT5000 (A2 gauche, A3 droit). Règle leur potentiomètre pour que la petite LED du module change entre le sol et le ruban noir.' }, R));
  def('robot_led', Object.assign({ message0: 'LED obstacle : %1', args0: [{ type: 'field_dropdown', name: 'STATE', options: [['allumer', 'HIGH'], ['éteindre', 'LOW']] }],
    previousStatement: null, nextStatement: null, tooltip: 'La LED branchée sur A1.' }, R));
  def('robot_mode', Object.assign({ message0: 'bouton MODE appuyé ?', output: 'Boolean',
    tooltip: 'Vrai tant que le bouton MODE (A4) est enfoncé.' }, R));
  def('robot_mode_click', Object.assign({ message0: 'bouton MODE vient d\'être appuyé ?', output: 'Boolean',
    tooltip: 'Vrai une seule fois par appui : pratique pour changer de mode (ligne / radio).' }, R));
  def('robot_radio_channel', Object.assign({ message0: 'radio : canal %1 (0 à 125)', args0: [{ type: 'field_number', name: 'CH', value: 76, min: 0, max: 125, precision: 1 }],
    previousStatement: null, nextStatement: null,
    tooltip: 'À placer dans « au démarrage ». Le robot et la télécommande doivent utiliser le même canal. Change de canal si plusieurs groupes travaillent en même temps.' }, R));
  def('robot_radio_send', Object.assign({ message0: 'radio : envoyer le nombre %1', args0: [pct('VALUE')], inputsInline: true,
    previousStatement: null, nextStatement: null, tooltip: 'Envoie un nombre par le module nRF24L01.' }, R));
  def('robot_radio_received', Object.assign({ message0: 'radio : message reçu ?', output: 'Boolean',
    tooltip: 'Vrai si un nombre est arrivé. Il est alors disponible dans « radio : nombre reçu ».' }, R));
  def('robot_radio_value', Object.assign({ message0: 'radio : nombre reçu', output: 'Number',
    tooltip: 'Le dernier nombre reçu par la radio.' }, R));

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
      { kind: 'category', name: 'Robot', colour: C.robot, cssConfig: { icon: 'blocklyToolboxCategoryIcon cat-robot' }, contents: [
        { kind: 'label', text: 'Moteurs' },
        blk('robot_move', { SPEED: n(60) }), blk('robot_stop'), blk('robot_motors', { LEFT: n(60), RIGHT: n(60) }),
        { kind: 'label', text: 'Capteurs' },
        blk('robot_distance'), blk('robot_line'), blk('robot_led'), blk('robot_mode'), blk('robot_mode_click'),
        { kind: 'label', text: 'Radio nRF24L01' },
        blk('robot_radio_channel'), blk('robot_radio_send', { VALUE: n(1) }), blk('robot_radio_received'), blk('robot_radio_value'),
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

  /* Programme d'exemple : faire clignoter la LED de la carte (D13, ou GPIO 2 sur l'ESP32). */
  function example(id) {
    const led = BOARDS[id || current].led;
    const sec = { DURATION: { shadow: { type: 'math_number', fields: { NUM: 1 } } } };
    return { board: id || current, blocks: { languageVersion: 0, blocks: [
      { type: 'arduino_setup', x: 30, y: 30, inputs: { DO: { block: { type: 'pin_mode', fields: { PIN: led, MODE: 'OUTPUT' } } } } },
      { type: 'arduino_loop', x: 30, y: 150, inputs: { DO: { block:
        { type: 'digital_write', fields: { PIN: led, LEVEL: 'HIGH' }, next: { block:
        { type: 'wait_time', fields: { UNIT: '1000' }, inputs: sec, next: { block:
        { type: 'digital_write', fields: { PIN: led, LEVEL: 'LOW' }, next: { block:
        { type: 'wait_time', fields: { UNIT: '1000' }, inputs: sec },
        } } } } } } } } },
    ] } };
  }
  const EXAMPLE = example('nano');

  /* Exemples pour le Cagett'bot */
  const num0 = (v) => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
  const chainOf = (list) => { let next = null; for (let i = list.length - 1; i >= 0; i--) { const b = Object.assign({}, list[i]); if (next) b.next = { block: next }; next = b; } return next; };
  const ifBlock = (branches, elseBody) => {
    const b = { type: 'controls_if', extraState: {}, inputs: {} };
    if (branches.length > 1) b.extraState.elseIfCount = branches.length - 1;
    if (elseBody) { b.extraState.hasElse = true; b.inputs.ELSE = { block: chainOf(elseBody) }; }
    branches.forEach((br, i) => { b.inputs['IF' + i] = { block: br[0] }; b.inputs['DO' + i] = { block: chainOf(br[1]) }; });
    return b;
  };
  const move = (dir, v) => ({ type: 'robot_move', fields: { DIR: dir }, inputs: { SPEED: num0(v) } });
  const cmp = (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });
  const nb = (v) => ({ type: 'math_number', fields: { NUM: v } });
  const lineFollow = () => ifBlock([
    [cmp('LT', { type: 'robot_distance' }, nb(20)), [{ type: 'robot_led', fields: { STATE: 'HIGH' } }, { type: 'robot_stop' }]],
  ], [{ type: 'robot_led', fields: { STATE: 'LOW' } }, ifBlock([
    [{ type: 'robot_line', fields: { SIDE: 'L', COLOR: 'BLACK' } }, [move('LEFT', 60)]],
    [{ type: 'robot_line', fields: { SIDE: 'R', COLOR: 'BLACK' } }, [move('RIGHT', 60)]],
  ], [move('FWD', 60)])]);
  function robotExample(kind) {
    if (kind === 'ligne') {
      return { board: 'nano', blocks: { languageVersion: 0, blocks: [
        { type: 'arduino_loop', x: 30, y: 30, inputs: { DO: { block: lineFollow() } } }] } };
    }
    /* Cagett'bot complet : le bouton MODE bascule entre « suiveur de ligne » et « télécommandé par radio ».
       Codes radio : 1 avancer, 2 reculer, 3 gauche, 4 droite, 0 arrêt ; +10 en mode turbo (vitesse maximale). */
    const MODE = { id: 'var_mode' }, CODE = { id: 'var_code' }, VIT = { id: 'var_vitesse' };
    const get = (v) => ({ type: 'variables_get', fields: { VAR: v } });
    const set = (v, blockValue) => ({ type: 'variables_set', fields: { VAR: v }, inputs: { VALUE: { block: blockValue } } });
    const moveV = (dir) => ({ type: 'robot_move', fields: { DIR: dir }, inputs: { SPEED: { block: get(VIT) } } });
    return { board: 'nano', variables: [{ name: 'mode', id: 'var_mode' }, { name: 'code', id: 'var_code' }, { name: 'vitesse', id: 'var_vitesse' }],
      blocks: { languageVersion: 0, blocks: [
        { type: 'arduino_setup', x: 30, y: 20, inputs: { DO: { block: chainOf([
          { type: 'robot_radio_channel', fields: { CH: 76 } }, set(MODE, nb(0))]) } } },
        { type: 'arduino_loop', x: 30, y: 150, inputs: { DO: { block: chainOf([
          ifBlock([[{ type: 'robot_mode_click' }, [
            set(MODE, { type: 'math_arithmetic', fields: { OP: 'MINUS' }, inputs: { A: { block: nb(1) }, B: { block: get(MODE) } } }),
            { type: 'robot_stop' }]]]),
          ifBlock([[cmp('EQ', get(MODE), nb(0)), [lineFollow()]]], [
            ifBlock([[{ type: 'robot_radio_received' }, [
              set(CODE, { type: 'robot_radio_value' }),
              set(VIT, nb(60)),
              ifBlock([[cmp('GT', get(CODE), nb(10)), [
                set(VIT, nb(100)),
                set(CODE, { type: 'math_arithmetic', fields: { OP: 'MINUS' }, inputs: { A: { block: get(CODE) }, B: { block: nb(10) } } })]]]),
              ifBlock([
                [cmp('EQ', get(CODE), nb(1)), [moveV('FWD')]],
                [cmp('EQ', get(CODE), nb(2)), [moveV('BACK')]],
                [cmp('EQ', get(CODE), nb(3)), [moveV('SPIN_L')]],
                [cmp('EQ', get(CODE), nb(4)), [moveV('SPIN_R')]],
              ], [{ type: 'robot_stop' }])]]]),
          ]),
        ]) } } },
      ] } };
  }

  const CATEGORY_ICONS = [
    ['structure', 'flag'], ['io', 'chip'], ['time', 'clock'], ['sensors', 'eyes'], ['logic', 'fork'],
    ['loops', 'loop'], ['math', 'plusminus'], ['text', 'text'], ['vars', 'box'], ['robot', 'robot'],
  ].map((e) => ({ cls: 'cat-' + e[0], glyph: e[1], color: C[e[0]] }));

  /* Numéro de groupe radio : chaque paire robot + télécommande a sa propre adresse (ROB01, ROB02…). */
  let radioGroup = 1;
  const setRadioGroup = (n) => { radioGroup = Math.max(1, Math.min(99, Math.round(Number(n)) || 1)); return radioGroup; };
  const radioAddress = () => 'ROB' + String(radioGroup).padStart(2, '0');

  root.ArduinoBlocks = { setRadioGroup: setRadioGroup, radioGroup: () => radioGroup, radioAddress: radioAddress, TOOLBOX: TOOLBOX, EXAMPLE: EXAMPLE, example: example, robotExample: robotExample, THEME: THEME, COLORS: C, CATEGORY_ICONS: CATEGORY_ICONS,
    BOARDS: BOARDS, setBoard: setBoard, board: () => BOARDS[current], pinsOf: pinsOf };
})(typeof window !== 'undefined' ? window : globalThis);
