/* Liaison avec une plateforme (Moodle / Éléa…) au format SCORM 1.2.
   Activée quand la page est ouverte avec ?parcours=<id> (c'est ce que fait le paquetage SCORM) :
   - le mode guidé démarre directement sur ce parcours, sans possibilité d'en changer ;
   - la progression (missions réussies, indices, points) est enregistrée dans la plateforme : l'élève la retrouve sur n'importe quel poste ;
   - la note (en %) et l'état « terminé » sont envoyés au carnet de notes ;
   - les programmes des missions restent dans le navigateur, rangés à part pour chaque élève. */
(function (root) {
  'use strict';
  let parcours = null;
  try { parcours = new URLSearchParams(root.location.search).get('parcours'); } catch (e) {}

  function findIn(w) {
    for (let n = 0; w && n < 12; n++) {
      try { if (w.API && typeof w.API.LMSInitialize === 'function') return w.API; } catch (e) { return null; }
      if (!w.parent || w.parent === w) break;
      w = w.parent;
    }
    return null;
  }
  let api = null;
  if (parcours) {
    api = findIn(root);
    if (!api) { try { if (root.opener) api = findIn(root.opener); } catch (e) {} }
  }
  let started = false, ended = false;
  const call = (fn, ...a) => { try { return api ? String(api[fn](...a)) : ''; } catch (e) { return ''; } };
  if (api) started = call('LMSInitialize', '') === 'true';
  const get = (k) => (started ? call('LMSGetValue', k) : '');
  const set = (k, v) => (started ? call('LMSSetValue', k, String(v)) : '');
  const commit = () => (started ? call('LMSCommit', '') : '');

  /* « Nom, Prénom » (format SCORM) → « Prénom Nom » */
  function studentName() {
    const raw = get('cmi.core.student_name');
    if (!raw) return '';
    const p = raw.split(',').map((x) => x.trim()).filter(Boolean);
    return p.length === 2 ? p[1] + ' ' + p[0] : raw;
  }
  const studentId = () => get('cmi.core.student_id').replace(/[^\w.@-]/g, '');

  /* Données compactes (4096 caractères au plus en SCORM 1.2) : { c: mission en cours, f: terminé, m: { id: [réussie, points, indices, échecs, solution] } } */
  function load(c) {
    if (!started || c.id !== parcours) return null;
    let d = null;
    try { d = JSON.parse(get('cmi.suspend_data') || 'null'); } catch (e) {}
    if (!d || !d.m) return null;
    const missions = {};
    for (const [id, v] of Object.entries(d.m)) missions[id] = { done: !!v[0], points: Number(v[1]) || 0, hints: v[2] || 0, fails: v[3] || 0, solution: !!v[4] };
    return { cur: d.c || 0, finished: !!d.f, missions: missions };
  }
  function save(c, st, sm) {
    if (!started || ended || c.id !== parcours) return;
    const m = {};
    for (const [id, v] of Object.entries(st.missions)) {
      if (!v.done && !v.hints && !v.fails && !v.solution) continue;
      m[id] = [v.done ? 1 : 0, v.done ? v.points || 0 : 0, v.hints || 0, v.fails || 0, v.solution ? 1 : 0];
    }
    set('cmi.suspend_data', JSON.stringify({ c: st.cur, f: st.finished ? 1 : 0, m: m }));
    set('cmi.core.lesson_location', String(st.cur + 1));
    set('cmi.core.score.min', 0);
    set('cmi.core.score.max', 100);
    set('cmi.core.score.raw', sm.pct);
    set('cmi.core.lesson_status', st.finished ? 'completed' : 'incomplete');
    commit();
  }
  function finish(c, st, sm) { save(c, st, sm); }
  function end() {
    if (!started || ended) return;
    set('cmi.core.exit', 'suspend');
    commit();
    call('LMSFinish', '');
    ended = true;
  }
  if (started) { root.addEventListener('pagehide', end); root.addEventListener('beforeunload', end); }

  root.AtelierScorm = {
    parcours: parcours,
    get connected() { return started; },
    /* options ajoutées au mode guidé */
    guideOptions() {
      if (!parcours) return {};
      const id = studentId();
      return {
        locked: true,
        storageSuffix: id ? '-' + id : '',
        studentName: studentName,
        progress: started ? { load: load, save: save, finish: finish } : null,
      };
    },
    end: end,
  };
})(typeof window !== 'undefined' ? window : globalThis);
