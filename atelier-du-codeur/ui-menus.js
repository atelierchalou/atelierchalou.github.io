/* Menus déroulants de l'en-tête (Téléverser, Fichier, Ma carte) et gestion des fichiers de projet
   (Ouvrir, Enregistrer, Enregistrer sous… avec choix de l'emplacement quand le navigateur le permet). */
(function (root) {
  'use strict';

  const CSS = `
.dd{position:relative;display:inline-flex}
.dd-btn .caret{font-size:11px;opacity:.85;margin-left:2px}
.dd-menu{position:absolute;top:calc(100% + 8px);left:0;z-index:500;background:#fff;color:var(--ink);border-radius:16px;padding:6px;min-width:250px;
  box-shadow:0 12px 30px rgba(30,20,80,.25);display:flex;flex-direction:column;max-height:80vh;overflow:auto}
.dd-menu[hidden]{display:none}
.dd-menu>button{font:600 14px var(--font);text-align:left;border:0;background:transparent;border-radius:10px;padding:8px 12px;cursor:pointer;color:var(--ink);
  display:flex;flex-direction:column;align-items:flex-start;gap:1px;position:relative}
.dd-menu>button:hover,.dd-menu>button:focus-visible{background:#f1ecff;outline:none}
.dd-menu>button small{font-weight:400;color:var(--muted);font-size:12px}
.dd-menu>button kbd{position:absolute;right:12px;top:9px;font:600 11px var(--font);color:var(--muted);background:#f3f4f8;border-radius:6px;padding:1px 6px}
.dd-menu>button[aria-pressed=true]{background:#e8f6ee}
.dd-menu>button[aria-pressed=true]::after{content:'✓';position:absolute;right:14px;top:8px;color:#1a8f4e;font-weight:600}
.dd-menu .dd-head{font-size:11.5px;font-weight:600;color:#0b6e75;text-transform:uppercase;letter-spacing:.04em;padding:8px 12px 2px}
.dd-menu hr{border:0;border-top:2px solid #eef0f6;margin:4px 6px}
`;
  let cssDone = false;
  function css() { if (cssDone) return; cssDone = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }

  /* Garde un menu déroulant entièrement dans l'écran (décalé vers la gauche s'il dépasse à droite). */
  function fit(menu) {
    menu.style.left = ''; menu.style.right = ''; menu.style.maxWidth = 'calc(100vw - 16px)';
    const r = menu.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    if (r.right > vw - 8) menu.style.left = (menu.offsetLeft - (r.right - (vw - 8))) + 'px';
    if (menu.getBoundingClientRect().left < 8) menu.style.left = (menu.offsetLeft + 8 - menu.getBoundingClientRect().left) + 'px';
  }

  /* Un seul menu ouvert à la fois ; clic ailleurs ou Échap pour fermer ; un choix ferme le menu. */
  function initMenus() {
    css();
    const all = [...document.querySelectorAll('.dd')];
    const closeAll = (except) => all.forEach((d) => { if (d !== except) { d.querySelector('.dd-menu').hidden = true; d.querySelector('.dd-btn').setAttribute('aria-expanded', 'false'); } });
    for (const d of all) {
      const btn = d.querySelector('.dd-btn'), menu = d.querySelector('.dd-menu');
      btn.setAttribute('aria-haspopup', 'menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu.hidden;
        closeAll(d);
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
        if (open) fit(menu);
        if (open) { const first = menu.querySelector('button'); if (first) first.focus({ preventScroll: true }); }
      });
      menu.addEventListener('click', (e) => { if (e.target.closest('button')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    }
    document.addEventListener('click', () => closeAll(null));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(null); });
  }

  /* ----- Fichiers de projet ----- */
  const canPick = () => typeof root.showSaveFilePicker === 'function' && typeof root.showOpenFilePicker === 'function';
  const TYPES = [{ description: 'Projet L\'atelier du codeur', accept: { 'application/json': ['.json'] } }];

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const withExt = (n) => (/\.json$/i.test(n) ? n : n + '.json');

  /* opts : { defaultName, input (élément <input type=file>), onName(nom) } */
  function ProjectFile(opts) {
    let handle = null;
    let name = opts.defaultName;
    const setName = (n) => { name = n; if (opts.onName) opts.onName(n); };
    const api = {
      get name() { return name; },
      /* Ouvre un projet : renvoie { name, text } ou null si l'utilisateur annule. */
      async open() {
        if (canPick()) {
          try {
            const [h] = await root.showOpenFilePicker({ types: TYPES, multiple: false });
            const f = await h.getFile();
            handle = h; setName(f.name);
            return { name: f.name, text: await f.text() };
          } catch (e) { if (e && e.name === 'AbortError') return null; }
        }
        return new Promise((resolve) => {
          const inp = opts.input;
          inp.value = '';
          inp.onchange = async () => {
            const f = inp.files[0];
            if (!f) { resolve(null); return; }
            handle = null; setName(f.name);
            resolve({ name: f.name, text: await f.text() });
          };
          inp.click();
        });
      },
      /* Enregistre dans le fichier déjà choisi ; la première fois, demande où (comme « Enregistrer sous »). */
      async save(text) {
        if (handle) {
          try {
            const w = await handle.createWritable();
            await w.write(text); await w.close();
            return { name: name, where: 'même fichier' };
          } catch (e) { handle = null; }
        }
        if (canPick()) return api.saveAs(text);
        download(withExt(name), text);
        return { name: withExt(name), where: 'téléchargements' };
      },
      /* Demande le nom ET l'emplacement du fichier (fenêtre « Enregistrer sous » du système). */
      async saveAs(text) {
        if (canPick()) {
          try {
            const h = await root.showSaveFilePicker({ suggestedName: withExt(name), types: TYPES });
            const w = await h.createWritable();
            await w.write(text); await w.close();
            handle = h; setName(h.name);
            return { name: h.name, where: 'emplacement choisi' };
          } catch (e) { if (e && e.name === 'AbortError') return null; throw e; }
        }
        // navigateur sans choix d'emplacement : on demande au moins le nom
        const n = root.prompt('Nom du fichier :', withExt(name));
        if (!n) return null;
        setName(withExt(n.trim()));
        download(name, text);
        return { name: name, where: 'téléchargements' };
      },
      /* Nouveau projet : on oublie le fichier en cours */
      reset() { handle = null; setName(opts.defaultName); },
      canChooseFolder: canPick,
    };
    return api;
  }

  root.UiMenus = { init: initMenus, ProjectFile: ProjectFile, fit: fit };
})(typeof window !== 'undefined' ? window : globalThis);
