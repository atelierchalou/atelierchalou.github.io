/* Outils communs aux parcours guidés : petits constructeurs de programmes (format JSON de Blockly)
   et aides pour les vérifications. */
(function (root) {
  'use strict';
  const chain = (list) => { let next = null; for (let i = list.length - 1; i >= 0; i--) { const b = Object.assign({}, list[i]); if (next) b.next = { block: next }; next = b; } return next; };
  const n = (v) => ({ type: 'math_number', fields: { NUM: v } });
  const sh = (v) => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
  const ifB = (branches, elseBody) => {
    const b = { type: 'controls_if', extraState: {}, inputs: {} };
    if (branches.length > 1) b.extraState.elseIfCount = branches.length - 1;
    if (elseBody) { b.extraState.hasElse = true; b.inputs.ELSE = { block: chain(elseBody) }; }
    branches.forEach((br, i) => { b.inputs['IF' + i] = { block: br[0] }; b.inputs['DO' + i] = { block: chain(br[1]) }; });
    return b;
  };
  /* vars : [['nom', 'id'], …] */
  const prog = (setup, loop, vars) => ({ board: 'nano', variables: (vars || []).map((v) => ({ name: v[0], id: v[1] })), blocks: { languageVersion: 0, blocks: [
    { type: 'arduino_setup', x: 30, y: 20, inputs: setup.length ? { DO: { block: chain(setup) } } : {} },
    { type: 'arduino_loop', x: 30, y: 90 + 45 * Math.min(setup.length, 6), inputs: loop.length ? { DO: { block: chain(loop) } } : {} },
  ] } });
  const K = {
    chain: chain, n: n, sh: sh, ifB: ifB, prog: prog,
    empty: () => prog([], []),
    wait: (s) => ({ type: 'wait_time', fields: { UNIT: '1000' }, inputs: { DURATION: sh(s) } }),
    waitMs: (ms) => ({ type: 'wait_time', fields: { UNIT: '1' }, inputs: { DURATION: sh(ms) } }),
    cmp: (op, a, b) => ({ type: 'logic_compare', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } }),
    and: (a, b) => ({ type: 'logic_operation', fields: { OP: 'AND' }, inputs: { A: { block: a }, B: { block: b } } }),
    arith: (op, a, b) => ({ type: 'math_arithmetic', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } }),
    repeat: (times, body) => ({ type: 'controls_repeat_ext', inputs: { TIMES: sh(times), DO: { block: chain(body) } } }),
    V: (id) => ({ id: id }),
    get: (v) => ({ type: 'variables_get', fields: { VAR: v } }),
    set: (v, x) => ({ type: 'variables_set', fields: { VAR: v }, inputs: { VALUE: { block: x } } }),
    add: (v, d) => ({ type: 'math_change', fields: { VAR: v }, inputs: { DELTA: { block: n(d) } } }),
    forI: (v, from, to, body) => ({ type: 'controls_for', fields: { VAR: v }, inputs: { FROM: { block: n(from) }, TO: { block: n(to) }, BY: { block: n(1) }, DO: { block: chain(body) } } }),
    /* carte */
    mode: (pin, m) => ({ type: 'pin_mode', fields: { PIN: String(pin), MODE: m } }),
    write: (pin, on) => ({ type: 'digital_write', fields: { PIN: String(pin), LEVEL: on ? 'HIGH' : 'LOW' } }),
    read: (pin) => ({ type: 'digital_read', fields: { PIN: String(pin) } }),
    /* robot */
    move: (dir, v) => ({ type: 'robot_move', fields: { DIR: dir }, inputs: { SPEED: typeof v === 'object' ? { block: v } : sh(v) } }),
    stop: { type: 'robot_stop' },
    led: (on) => ({ type: 'robot_led', fields: { STATE: on ? 'HIGH' : 'LOW' } }),
    lineS: (side) => ({ type: 'robot_line', fields: { SIDE: side, COLOR: 'BLACK' } }),
    dist: () => ({ type: 'robot_distance' }),
    /* résultats */
    ok: (msg) => ({ ok: true, msg: msg }),
    ko: (msg, crit, info) => ({ ok: false, msg: msg, crit: crit, info: info }),
    fr: (x, d) => x.toFixed(d == null ? 1 : d).replace('.', ','),
    BASE: ['arduino_setup', 'arduino_loop'],
    orphanMsg: 'Un bloc n\'est accroché à rien : glisse-le dans « au démarrage » ou dans « répéter indéfiniment ».',
    /* Suivi de ligne (vitesse : nombre, ou bloc pour une variable) */
    follow: (v) => ifB([[K.lineS('L'), [K.move('LEFT', v == null ? 60 : v)]], [K.lineS('R'), [K.move('RIGHT', v == null ? 60 : v)]]], [K.move('FWD', v == null ? 60 : v)]),
    /* Compte les passages de 0 à 1 d'une valeur, observée en continu (temps réel, toutes les 8 ms). */
    edgeCounter(fn) {
      let last = fn() ? 1 : 0, count = 0;
      const id = setInterval(() => { const v = fn() ? 1 : 0; if (v && !last) count++; last = v; }, 8);
      return { get count() { return count; }, stop() { clearInterval(id); return count; } };
    },
    /* Découpe une série de relevés [t, valeur] en paliers { v, start, dur } (ms). */
    segments(samples) {
      const out = [];
      for (const [t, v] of samples) {
        const k = JSON.stringify(v);
        const last = out[out.length - 1];
        if (last && last.k === k) last.end = t; else out.push({ k: k, v: v, start: t, end: t });
      }
      out.forEach((s, i) => { s.dur = (i + 1 < out.length ? out[i + 1].start : s.end) - s.start; });
      return out;
    },
  };
  root.GuideKit = K;
})(typeof window !== 'undefined' ? window : globalThis);
