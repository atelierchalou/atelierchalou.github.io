/* Générateur de code Arduino (C++) à partir des blocs. */
(function (root) {
  'use strict';
  const Blockly = root.Blockly;

  const gen = new Blockly.Generator('ARDUINO');
  gen.INDENT = '  ';
  gen.ORDER_ATOMIC = 0;
  gen.ORDER_NONE = 99;
  const ATOM = 0, NONE = 99;
  const boardId = () => (root.ArduinoBlocks ? root.ArduinoBlocks.board().id : 'nano');
  const isEsp = () => boardId() === 'esp32';

  const RESERVED = new Set(('int long float double char bool boolean byte word void if else for while do return break ' +
    'continue switch case default true false setup loop delay delayMicroseconds pinMode digitalWrite digitalRead ' +
    'analogRead analogWrite millis micros tone noTone map random randomSeed min max abs pow sqrt constrain Serial ' +
    'Servo String class new delete this auto const static signed unsigned short register volatile struct union enum ' +
    'typedef sizeof HIGH LOW INPUT OUTPUT INPUT_PULLUP PI pulseIn ultrasonic_cm servo_write buzzer_tone ledcAttach ledcWrite ledcWriteTone robot_moteur robot_moteurs robot_distance robot_mode_appui radio radio_recu radio_envoyer radio_valeur RADIO_ADRESSE').split(' '));

  function safeName(name) {
    let s = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]/g, '_');
    if (!s || /^[0-9]/.test(s)) s = 'v_' + s;
    if (RESERVED.has(s)) s += '_';
    return s;
  }
  const isNum = (s) => /^-?\d+(\.\d+)?$/.test(s);
  const varName = (b, f) => gen.varNames_.get(b.getFieldValue(f || 'VAR')) || safeName(b.getFieldValue(f || 'VAR'));
  const addOnce = (list, line) => { if (list.indexOf(line) < 0) list.push(line); };
  function autoMode(pin, mode) {
    pin = String(pin);
    if (!gen.explicitPins_.has(pin) && !gen.autoModes_.has(pin)) gen.autoModes_.set(pin, mode);
  }

  gen.init = function (workspace) {
    this.includes_ = [];
    this.globals_ = [];
    this.functions_ = new Map();
    this.autoSetup_ = [];
    this.autoModes_ = new Map();
    this.explicitPins_ = new Set();
    this.varNames_ = new Map();
    this.setupBody_ = '';
    this.loopBody_ = '';
    this.counter_ = 0;
    this.usesSerial_ = false;
    this.radioSetup_ = false;
    const used = new Set();
    for (const v of workspace.getAllVariables()) {
      const base = safeName(v.name);
      let name = base, k = 2;
      while (used.has(name)) name = base + '_' + k++;
      used.add(name);
      this.varNames_.set(v.getId(), name);
      this.globals_.push('long ' + name + ' = 0;');
    }
    for (const b of workspace.getBlocksByType('pin_mode', false)) this.explicitPins_.add(b.getFieldValue('PIN'));
    this.isInitialized = true;
  };

  gen.finish = function () {
    const out = ['// Programme généré par L\'atelier du codeur (' + (root.ArduinoBlocks ? root.ArduinoBlocks.board().name : 'Arduino Nano') + ')'];
    if (this.includes_.length) out.push(...this.includes_, '');
    if (this.globals_.length) out.push(...this.globals_, '');
    for (const f of this.functions_.values()) out.push(f, '');
    const setup = [];
    if (this.usesSerial_) setup.push('  Serial.begin(9600);');
    for (const [p, m] of this.autoModes_) setup.push('  pinMode(' + p + ', ' + m + ');');
    for (const l of this.autoSetup_) setup.push('  ' + l);
    out.push('void setup() {');
    if (setup.length) out.push(setup.join('\n'));
    if (this.setupBody_) out.push(this.setupBody_.replace(/\n$/, ''));
    out.push('}', '', 'void loop() {');
    if (this.loopBody_) out.push(this.loopBody_.replace(/\n$/, ''));
    out.push('}');
    return out.join('\n') + '\n';
  };

  gen.scrub_ = function (block, code, opt) {
    const next = block.nextConnection && block.nextConnection.targetBlock();
    return code + (opt ? '' : this.blockToCode(next));
  };

  const F = gen.forBlock;
  const val = (g, b, name, dflt) => g.valueToCode(b, name, NONE) || dflt;
  /* retire les parenthèses inutiles autour d'une expression entière */
  function unwrap(c) {
    if (c[0] !== '(' || c[c.length - 1] !== ')') return c;
    let depth = 0, q = false;
    for (let i = 0; i < c.length; i++) {
      const ch = c[i];
      if (ch === '"' && c[i - 1] !== '\\') q = !q;
      if (q) continue;
      if (ch === '(') depth++;
      else if (ch === ')' && --depth === 0 && i < c.length - 1) return c;
    }
    return c.slice(1, -1);
  }
  const top = (g, b, name, dflt) => unwrap(val(g, b, name, dflt));

  /* ----- Structure ----- */
  F.arduino_setup = (b, g) => { g.setupBody_ += g.statementToCode(b, 'DO'); return ''; };
  F.arduino_loop = (b, g) => { g.loopBody_ += g.statementToCode(b, 'DO'); return ''; };

  /* ----- Entrées / sorties ----- */
  F.pin_mode = (b) => 'pinMode(' + b.getFieldValue('PIN') + ', ' + b.getFieldValue('MODE') + ');\n';
  F.digital_write = (b) => {
    autoMode(b.getFieldValue('PIN'), 'OUTPUT');
    return 'digitalWrite(' + b.getFieldValue('PIN') + ', ' + b.getFieldValue('LEVEL') + ');\n';
  };
  F.digital_read = (b) => {
    autoMode(b.getFieldValue('PIN'), 'INPUT');
    return ['digitalRead(' + b.getFieldValue('PIN') + ')', ATOM];
  };
  F.analog_write = (b, g) => {
    autoMode(b.getFieldValue('PIN'), 'OUTPUT');
    return 'analogWrite(' + b.getFieldValue('PIN') + ', ' + val(g, b, 'VALUE', '0') + ');\n';
  };
  F.analog_read = (b, g) => {
    if (isEsp()) addOnce(g.autoSetup_, 'analogReadResolution(10);   // valeurs de 0 à 1023, comme sur Arduino');
    return ['analogRead(' + b.getFieldValue('PIN') + ')', ATOM];
  };

  /* ----- Temps ----- */
  F.wait_time = (b, g) => {
    const d = val(g, b, 'DURATION', '0');
    if (b.getFieldValue('UNIT') === '1') return 'delay(' + d + ');\n';
    if (isNum(d)) return 'delay(' + Math.round(parseFloat(d) * 1000) + ');\n';
    return 'delay((unsigned long)((' + d + ') * 1000));\n';
  };
  F.millis_now = () => ['millis()', ATOM];

  /* ----- Capteurs et actionneurs ----- */
  F.ultrasonic_cm = (b, g) => {
    const t = b.getFieldValue('TRIG'), e = b.getFieldValue('ECHO');
    autoMode(t, 'OUTPUT');
    autoMode(e, 'INPUT');
    g.functions_.set('ultrasonic_cm', [
      'long ultrasonic_cm(int trig, int echo) {',
      '  digitalWrite(trig, LOW);',
      '  delayMicroseconds(2);',
      '  digitalWrite(trig, HIGH);',
      '  delayMicroseconds(10);',
      '  digitalWrite(trig, LOW);',
      '  long duree_us = pulseIn(echo, HIGH, 30000UL);',
      '  return duree_us / 58;',
      '}',
    ].join('\n'));
    return ['ultrasonic_cm(' + t + ', ' + e + ')', ATOM];
  };
  F.servo_write = (b, g) => {
    const p = b.getFieldValue('PIN');
    let a = val(g, b, 'ANGLE', '90');
    a = isNum(a) ? String(Math.max(0, Math.min(180, Math.round(parseFloat(a))))) : 'constrain(' + a + ', 0, 180)';
    if (isEsp()) {
      /* ESP32 : pas de bibliothèque Servo dans le noyau, on pilote le signal (50 Hz) avec le module LEDC. */
      addOnce(g.autoSetup_, 'ledcAttach(' + p + ', 50, 14);');
      g.functions_.set('servo_write', [
        'void servo_write(int pin, long angle) {',
        '  angle = constrain(angle, 0, 180);',
        '  long us = 500 + angle * 2000 / 180;          // impulsion de 0,5 à 2,5 ms',
        '  ledcWrite(pin, (uint32_t)(us * 16384L / 20000L));',
        '}',
      ].join('\n'));
      return 'servo_write(' + p + ', ' + a + ');\n';
    }
    const s = 'servo_' + p;
    addOnce(g.includes_, '#include <Servo.h>');
    addOnce(g.globals_, 'Servo ' + s + ';');
    addOnce(g.autoSetup_, s + '.attach(' + p + ');');
    return s + '.write(' + a + ');\n';
  };
  F.buzzer_tone = (b, g) => {
    const p = b.getFieldValue('PIN'), f = val(g, b, 'FREQ', '440'), d = val(g, b, 'DURATION', '500');
    if (isEsp()) {
      addOnce(g.autoSetup_, 'ledcAttach(' + p + ', 2000, 10);');
      return 'ledcWriteTone(' + p + ', ' + f + ');\ndelay(' + d + ');\nledcWriteTone(' + p + ', 0);\n';
    }
    autoMode(p, 'OUTPUT');
    return 'tone(' + p + ', ' + f + ', ' + d + ');\ndelay(' + d + ');\n';
  };
  F.serial_print = (b, g) => {
    g.usesSerial_ = true;
    let v = val(g, b, 'TEXT', '""');
    if (/^"(?:[^"\\]|\\.)*"$/.test(v)) v = 'F(' + v + ')';
    return 'Serial.print' + b.getFieldValue('NL') + '(' + v + ');\n';
  };

  /* ----- Logique ----- */
  F.controls_if = (b, g) => {
    let n = 0, code = '';
    do {
      code += (n > 0 ? ' else ' : '') + 'if (' + top(g, b, 'IF' + n, 'false') + ') {\n' + g.statementToCode(b, 'DO' + n) + '}';
      n++;
    } while (b.getInput('IF' + n));
    if (b.getInput('ELSE')) code += ' else {\n' + g.statementToCode(b, 'ELSE') + '}';
    return code + '\n';
  };
  const CMP = { EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' };
  F.logic_compare = (b, g) => ['(' + val(g, b, 'A', '0') + ' ' + CMP[b.getFieldValue('OP')] + ' ' + val(g, b, 'B', '0') + ')', ATOM];
  F.logic_operation = (b, g) => ['(' + val(g, b, 'A', 'false') + (b.getFieldValue('OP') === 'AND' ? ' && ' : ' || ') + val(g, b, 'B', 'false') + ')', ATOM];
  F.logic_negate = (b, g) => ['!(' + val(g, b, 'BOOL', 'true') + ')', ATOM];
  F.logic_boolean = (b) => [b.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', ATOM];

  /* ----- Boucles ----- */
  F.controls_repeat_ext = (b, g) => {
    const i = '_n' + (++g.counter_);
    return 'for (int ' + i + ' = 0; ' + i + ' < ' + val(g, b, 'TIMES', '0') + '; ' + i + '++) {\n' + g.statementToCode(b, 'DO') + '}\n';
  };
  F.controls_whileUntil = (b, g) => {
    const c = top(g, b, 'BOOL', 'false');
    return 'while (' + (b.getFieldValue('MODE') === 'UNTIL' ? '!(' + c + ')' : c) + ') {\n' + g.statementToCode(b, 'DO') + '}\n';
  };
  F.controls_for = (b, g) => {
    const v = varName(b), from = val(g, b, 'FROM', '0'), to = val(g, b, 'TO', '0'), by = val(g, b, 'BY', '1');
    const cond = isNum(by) ? (parseFloat(by) >= 0 ? v + ' <= ' + to : v + ' >= ' + to)
      : '(' + by + ') > 0 ? ' + v + ' <= ' + to + ' : ' + v + ' >= ' + to;
    return 'for (' + v + ' = ' + from + '; ' + cond + '; ' + v + ' += ' + by + ') {\n' + g.statementToCode(b, 'DO') + '}\n';
  };
  F.controls_flow_statements = (b) => (b.getFieldValue('FLOW') === 'BREAK' ? 'break;\n' : 'continue;\n');

  /* ----- Maths, texte, variables ----- */
  F.math_number = (b) => [String(Number(b.getFieldValue('NUM'))), ATOM];
  const OPS = { ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/' };
  F.math_arithmetic = (b, g) => {
    const op = b.getFieldValue('OP'), a = val(g, b, 'A', '0'), c = val(g, b, 'B', '0');
    return [op === 'POWER' ? 'pow(' + a + ', ' + c + ')' : '(' + a + ' ' + OPS[op] + ' ' + c + ')', ATOM];
  };
  F.math_random_int = (b, g) => {
    addOnce(g.autoSetup_, isEsp() ? 'randomSeed(esp_random());' : boardId() === 'uno' ? 'randomSeed(analogRead(A0));' : 'randomSeed(analogRead(A7));');
    return ['random(' + val(g, b, 'FROM', '0') + ', ' + val(g, b, 'TO', '0') + ' + 1)', ATOM];
  };
  F.map_value = (b, g) => ['map(' + ['VALUE', 'FROM_LOW', 'FROM_HIGH', 'TO_LOW', 'TO_HIGH'].map((n) => val(g, b, n, '0')).join(', ') + ')', ATOM];
  F.text = (b) => ['"' + b.getFieldValue('TEXT').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"', ATOM];
  F.variables_get = (b) => [varName(b), ATOM];
  F.variables_set = (b, g) => varName(b) + ' = ' + top(g, b, 'VALUE', '0') + ';\n';
  F.math_change = (b, g) => varName(b) + ' += ' + top(g, b, 'DELTA', '0') + ';\n';

  /* ----- Robot « Cagett'bot » (câblage fixe) ----- */
  function robotMotors(g) {
    for (const p of ['5', '7', '8', '6', '4', '3']) autoMode(p, 'OUTPUT');
    g.functions_.set('robot_moteurs', [
      '// Cagett\'bot : moteurs pilotés par le L298N (vitesse de -100 à 100 %)',
      'void robot_moteur(int en, int inA, int inB, long v) {',
      '  v = constrain(v, -100, 100);',
      '  digitalWrite(inA, v > 0 ? HIGH : LOW);',
      '  digitalWrite(inB, v < 0 ? HIGH : LOW);',
      '  analogWrite(en, map(abs(v), 0, 100, 0, 255));',
      '}',
      '',
      'void robot_moteurs(long gauche, long droit) {',
      '  robot_moteur(5, 7, 8, gauche);   // ENA D5, IN1 D7, IN2 D8',
      '  robot_moteur(6, 4, 3, droit);    // ENB D6, IN3 D4, IN4 D3',
      '}',
    ].join('\n'));
  }
  F.robot_move = (b, g) => {
    robotMotors(g);
    const v = val(g, b, 'SPEED', '60');
    const half = isNum(v) ? String(Math.round(parseFloat(v) / 3)) : '(' + v + ') / 3';
    const neg = isNum(v) ? String(-parseFloat(v)) : '-(' + v + ')';
    const args = { FWD: [v, v], BACK: [neg, neg], LEFT: [half, v], RIGHT: [v, half], SPIN_L: [neg, v], SPIN_R: [v, neg] }[b.getFieldValue('DIR')];
    return 'robot_moteurs(' + args[0] + ', ' + args[1] + ');\n';
  };
  F.robot_stop = (b, g) => { robotMotors(g); return 'robot_moteurs(0, 0);\n'; };
  F.robot_motors = (b, g) => { robotMotors(g); return 'robot_moteurs(' + val(g, b, 'LEFT', '0') + ', ' + val(g, b, 'RIGHT', '0') + ');\n'; };
  F.robot_distance = (b, g) => {
    autoMode('2', 'OUTPUT'); autoMode('A0', 'INPUT');
    g.functions_.set('robot_distance', [
      '// Cagett\'bot : distance mesurée par le HC-SR04 (TRIG D2, ECHO A0), 999 si rien devant',
      'long robot_distance() {',
      '  digitalWrite(2, LOW);',
      '  delayMicroseconds(2);',
      '  digitalWrite(2, HIGH);',
      '  delayMicroseconds(10);',
      '  digitalWrite(2, LOW);',
      '  long duree_us = pulseIn(A0, HIGH, 25000UL);',
      '  if (duree_us == 0) return 999;',
      '  return duree_us / 58;',
      '}',
    ].join('\n'));
    return ['robot_distance()', ATOM];
  };
  F.robot_line = (b) => {
    const p = b.getFieldValue('SIDE') === 'L' ? 'A2' : 'A3';
    autoMode(p, 'INPUT');
    // module TCRT5000 : sortie HAUTE au-dessus du noir (pas de reflet), BASSE au-dessus du blanc
    return ['(digitalRead(' + p + ') == ' + (b.getFieldValue('COLOR') === 'BLACK' ? 'HIGH' : 'LOW') + ')', ATOM];
  };
  F.robot_led = (b) => { autoMode('A1', 'OUTPUT'); return 'digitalWrite(A1, ' + b.getFieldValue('STATE') + ');\n'; };
  F.robot_mode = () => { autoMode('A4', 'INPUT_PULLUP'); return ['(digitalRead(A4) == LOW)', ATOM]; };
  F.robot_mode_click = (b, g) => {
    autoMode('A4', 'INPUT_PULLUP');
    g.functions_.set('robot_mode_appui', [
      '// Cagett\'bot : vrai une seule fois par appui sur le bouton MODE (A4), avec anti-rebond',
      'bool robot_mode_appui() {',
      '  static bool avant = false;',
      '  static unsigned long t = 0;',
      '  bool maintenant = digitalRead(A4) == LOW;',
      '  bool appui = maintenant && !avant && millis() - t > 50;',
      '  if (maintenant != avant) t = millis();',
      '  avant = maintenant;',
      '  return appui;',
      '}',
    ].join('\n'));
    return ['robot_mode_appui()', ATOM];
  };
  function robotRadio(g) {
    addOnce(g.includes_, '#include <SPI.h>');
    addOnce(g.includes_, '#include <RF24.h>');
    addOnce(g.globals_, 'RF24 radio(9, 10);                    // nRF24L01 : CE D9, CSN D10');
    const grp = root.ArduinoBlocks ? root.ArduinoBlocks.radioGroup() : 1, adr = root.ArduinoBlocks ? root.ArduinoBlocks.radioAddress() : 'ROB01';
    addOnce(g.globals_, 'const byte RADIO_ADRESSE[6] = "' + adr + '";  // groupe radio n° ' + grp + ' : le même numéro sur le robot et sa télécommande'); 
    addOnce(g.globals_, 'long radio_valeur = 0;');
    if (!g.radioSetup_) {
      g.radioSetup_ = true;
      g.autoSetup_.unshift('radio.begin();', 'radio.setPALevel(RF24_PA_LOW);', 'radio.openWritingPipe(RADIO_ADRESSE);',
        'radio.openReadingPipe(1, RADIO_ADRESSE);', 'radio.startListening();');
    }
    g.functions_.set('radio', [
      '// Cagett\'bot : radio nRF24L01 (des nombres entiers)',
      'bool radio_recu() {',
      '  if (!radio.available()) return false;',
      '  radio.read(&radio_valeur, sizeof(radio_valeur));',
      '  return true;',
      '}',
      '',
      'void radio_envoyer(long v) {',
      '  radio.stopListening();',
      '  radio.write(&v, sizeof(v));',
      '  radio.startListening();',
      '}',
    ].join('\n'));
  }
  F.robot_radio_channel = (b, g) => { robotRadio(g); return 'radio.setChannel(' + Math.max(0, Math.min(125, Math.round(Number(b.getFieldValue('CH')) || 0))) + ');\n'; };
  F.robot_radio_send = (b, g) => { robotRadio(g); return 'radio_envoyer(' + top(g, b, 'VALUE', '0') + ');\n'; };
  F.robot_radio_received = (b, g) => { robotRadio(g); return ['radio_recu()', ATOM]; };
  F.robot_radio_value = (b, g) => { robotRadio(g); return ['radio_valeur', ATOM]; };

  const HATS = ['arduino_setup', 'arduino_loop'];
  root.ArduinoGen = {
    generate: (ws) => gen.workspaceToCode(ws),
    /* pour les blocs ajoutés par d'autres fichiers (montages) */
    gen: gen, helpers: { val: val, top: top, isNum: isNum, addOnce: addOnce, autoMode: autoMode, ATOM: ATOM, NONE: NONE },
    /* blocs posés en dehors des blocs « au démarrage » / « répéter indéfiniment » */
    usesRobot: (ws) => ws.getAllBlocks(false).some((b) => b.type.indexOf('robot_') === 0 && b.isEnabled()),
    orphanCount: (ws) => ws.getTopBlocks(false).filter((b) => HATS.indexOf(b.type) < 0 && b.isEnabled()).length,
  };
})(typeof window !== 'undefined' ? window : globalThis);
