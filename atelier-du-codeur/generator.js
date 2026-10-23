/* Générateur de code Arduino (C++) à partir des blocs. */
(function (root) {
  'use strict';
  const Blockly = root.Blockly;

  const gen = new Blockly.Generator('ARDUINO');
  gen.INDENT = '  ';
  gen.ORDER_ATOMIC = 0;
  gen.ORDER_NONE = 99;
  const ATOM = 0, NONE = 99;

  const RESERVED = new Set(('int long float double char bool boolean byte word void if else for while do return break ' +
    'continue switch case default true false setup loop delay delayMicroseconds pinMode digitalWrite digitalRead ' +
    'analogRead analogWrite millis micros tone noTone map random randomSeed min max abs pow sqrt constrain Serial ' +
    'Servo String class new delete this auto const static signed unsigned short register volatile struct union enum ' +
    'typedef sizeof HIGH LOW INPUT OUTPUT INPUT_PULLUP PI pulseIn ultrasonic_cm').split(' '));

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
    const out = ['// Programme généré par L\'atelier du codeur'];
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
  F.analog_read = (b) => ['analogRead(' + b.getFieldValue('PIN') + ')', ATOM];

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
    const p = b.getFieldValue('PIN'), s = 'servo_' + p;
    addOnce(g.includes_, '#include <Servo.h>');
    addOnce(g.globals_, 'Servo ' + s + ';');
    addOnce(g.autoSetup_, s + '.attach(' + p + ');');
    let a = val(g, b, 'ANGLE', '90');
    a = isNum(a) ? String(Math.max(0, Math.min(180, Math.round(parseFloat(a))))) : 'constrain(' + a + ', 0, 180)';
    return s + '.write(' + a + ');\n';
  };
  F.buzzer_tone = (b, g) => {
    const p = b.getFieldValue('PIN'), f = val(g, b, 'FREQ', '440'), d = val(g, b, 'DURATION', '500');
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
    addOnce(g.autoSetup_, 'randomSeed(analogRead(A7));');
    return ['random(' + val(g, b, 'FROM', '0') + ', ' + val(g, b, 'TO', '0') + ' + 1)', ATOM];
  };
  F.map_value = (b, g) => ['map(' + ['VALUE', 'FROM_LOW', 'FROM_HIGH', 'TO_LOW', 'TO_HIGH'].map((n) => val(g, b, n, '0')).join(', ') + ')', ATOM];
  F.text = (b) => ['"' + b.getFieldValue('TEXT').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"', ATOM];
  F.variables_get = (b) => [varName(b), ATOM];
  F.variables_set = (b, g) => varName(b) + ' = ' + top(g, b, 'VALUE', '0') + ';\n';
  F.math_change = (b, g) => varName(b) + ' += ' + top(g, b, 'DELTA', '0') + ';\n';

  const HATS = ['arduino_setup', 'arduino_loop'];
  root.ArduinoGen = {
    generate: (ws) => gen.workspaceToCode(ws),
    /* blocs posés en dehors des blocs « au démarrage » / « répéter indéfiniment » */
    orphanCount: (ws) => ws.getTopBlocks(false).filter((b) => HATS.indexOf(b.type) < 0 && b.isEnabled()).length,
  };
})(typeof window !== 'undefined' ? window : globalThis);
