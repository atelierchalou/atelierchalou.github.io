/* Assistant d'installation : repère le serveur de compilation, explique à quoi il sert et guide l'installation. */
(function (root) {
  'use strict';

  const FILES = 'serveur/';           // dossier des fichiers à télécharger (relatif à la page)
  const POLL_MS = 4000;

  const CSS = `
.srv-pill{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:7px 14px 7px 11px;font:600 13px var(--font);
  color:#fff;background:rgba(255,255,255,.2);cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.2);transition:transform .08s,background .15s}
.srv-pill:hover{background:rgba(255,255,255,.32)} .srv-pill:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.2)}
.srv-pill i{width:11px;height:11px;border-radius:50%;background:#c9c9d6;box-shadow:0 0 0 3px rgba(255,255,255,.25)}
.srv-pill[data-state=ready] i{background:#4ade80}
.srv-pill[data-state=down] i,.srv-pill[data-state=nocli] i,.srv-pill[data-state=noavr] i,.srv-pill[data-state=noesp] i{background:#ffb020;animation:ledpulse 1.3s infinite}
dialog.srv{border:0;border-radius:26px;padding:0;width:min(780px,94vw);max-height:92vh;overflow:hidden;color:var(--ink);font:400 15px/1.5 var(--font);
  box-shadow:0 24px 70px rgba(30,20,80,.4)}
dialog.srv[open]{display:flex;flex-direction:column}
dialog.srv::backdrop{background:rgba(35,25,90,.45);backdrop-filter:blur(2px)}
.srv-head{display:flex;align-items:center;gap:14px;padding:16px 20px;background:linear-gradient(120deg,#e9f4ff,#f1eaff);border-bottom:3px solid #e1d9fb}
.srv-head svg{width:72px;height:78px;flex:none}
.srv-head h2{margin:0;font-size:22px;line-height:1.2;color:var(--teal)} .srv-head p{margin:4px 0 0;color:var(--muted)}
.srv-head>div{flex:1}
.srv-x{border:0;background:rgba(255,255,255,.8);width:36px;height:36px;border-radius:50%;font-size:22px;line-height:1;cursor:pointer;color:var(--ink)}
.srv-body{padding:6px 22px 4px;overflow:auto;flex:1}
.srv-body h3{font-size:16px;margin:16px 0 6px;color:var(--teal)}
.srv-body p{margin:6px 0}
.srv-rows{display:grid;gap:8px;margin:6px 0}
.srv-row{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:14px;background:#f5f7fd;border:2px solid #e8ecf8}
.srv-row svg{width:26px;height:26px;flex:none} .srv-row b{display:block} .srv-row small{color:var(--muted)}
.srv-tabs{display:flex;gap:6px;margin:8px 0 4px}
.srv-tabs button{font:600 13px var(--font);border:2px solid #d9def0;background:#fff;color:var(--ink);border-radius:999px;padding:5px 14px;cursor:pointer}
.srv-tabs button[aria-pressed=true]{background:#3D7BFF;border-color:#3D7BFF;color:#fff}
.srv-steps{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:10px;counter-reset:s}
.srv-steps li{counter-increment:s;position:relative;padding:10px 14px 12px 56px;border-radius:16px;border:2px solid #e8ecf8;background:#fff}
.srv-steps li::before{content:counter(s);position:absolute;left:12px;top:10px;width:32px;height:32px;border-radius:50%;background:#8A5CF6;color:#fff;
  font-weight:600;display:flex;align-items:center;justify-content:center}
.srv-steps li.done{opacity:.55;background:#f4fbf6;border-color:#cfeedd} .srv-steps li.done::before{content:'\\2713';background:#34B34A}
.srv-steps li.now{border-color:#FFC933;background:#fffaf0;box-shadow:0 0 0 4px rgba(255,201,51,.25)}
.srv-steps h4{margin:0 0 2px;font-size:15.5px} .srv-steps p{margin:3px 0;font-size:14px}
.srv-act{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.srv-act a,.srv-btn{display:inline-flex;align-items:center;gap:6px;font:600 13.5px var(--font);text-decoration:none;color:#fff;background:#3D7BFF;border:0;
  border-radius:999px;padding:7px 14px;cursor:pointer;box-shadow:0 3px 0 #2a56bd}
.srv-act a:active,.srv-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #2a56bd}
.srv-btn.light{background:#eef1fb;color:var(--ink);box-shadow:0 3px 0 #cfd6ee}
.srv-btn.primary{background:var(--gold);color:#3a2a00;box-shadow:0 3px 0 var(--gold-deep)}
.srv-cmd{display:flex;align-items:center;gap:8px;margin:5px 0;background:#14213d;color:#dbe7ff;border-radius:10px;padding:6px 8px 6px 12px;
  font:12.5px ui-monospace,Consolas,monospace}
.srv-cmd code{flex:1;overflow-x:auto;white-space:nowrap}
.srv-cmd button{font:600 12px var(--font);border:0;border-radius:8px;padding:4px 10px;cursor:pointer;background:#fff;color:var(--ink)}
.srv-warn{font-size:13px;color:#7a5a00;background:#fff4d6;border-radius:10px;padding:6px 10px;margin-top:6px}
.srv-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 20px;border-top:2px solid #eceffa;background:#fafbff}
.srv-foot span{flex:1;color:var(--muted);font-size:13px;min-width:200px}
dialog.srv.connecting .srv-install{display:none}
dialog.srv.connecting .srv-rows{opacity:.55}
dialog.srv.connecting #srvTitle::after{content:'';display:inline-block;width:16px;height:16px;margin-left:10px;vertical-align:-2px;border-radius:50%;
  border:3px solid #9fc0ff;border-top-color:#3D7BFF;animation:srvspin .8s linear infinite}
@keyframes srvspin{to{transform:rotate(360deg)}}
`;

  const ICON = {
    ok: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#34B34A"/><path d="M6.500 12.500l3.600 3.600 7.400-7.600" fill="none" stroke="#fff" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    no: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#F4631E"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2.600" stroke-linecap="round"/></svg>',
    unk: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#cbd2e6"/><path d="M9.200 9.400a2.900 2.900 0 1 1 4.400 2.500c-1 .6-1.600 1.100-1.600 2.300" fill="none" stroke="#fff" stroke-width="2.400" stroke-linecap="round"/><circle cx="12" cy="17.400" r="1.400" fill="#fff"/></svg>',
  };

  const TITLES = {
    unknown: ['Connexion au serveur de compilation…', 'Je me connecte au petit serveur de ton ordinateur. Un instant…'],
    down: ['Je n\'arrive pas à me connecter au serveur', 'Le serveur de compilation ne répond pas : il n\'est peut-être pas démarré, ou pas encore installé. Voici à quoi il sert et comment l\'installer.'],
    nocli: ['Presque ! Il manque arduino-cli', 'Le serveur tourne, mais il ne trouve pas arduino-cli (étape 2).'],
    noavr: ['Presque ! Il manque les outils de la carte', 'Le serveur et arduino-cli sont là, il reste à installer les outils des cartes Nano et Uno (étape 3).'],
    noesp: ['Presque ! Il manque les outils de l\'ESP32', 'Le serveur et arduino-cli sont là, il reste à installer les outils de l\'ESP32 (étape 3).'],
    ready: ['Tout est prêt !', 'Le serveur de compilation fonctionne. Tu peux téléverser dans ta carte.'],
  };
  const PILL = { unknown: 'Connexion au serveur…', down: 'Serveur à installer', nocli: 'Il manque arduino-cli', noavr: 'Il manque les outils Nano/Uno', noesp: 'Il manque les outils ESP32', ready: 'Serveur prêt' };

  let connecting = false, attempt = 0;   // phase de connexion du démarrage : plusieurs essais avant d'annoncer un échec
  let opts = null, dlg = null, state = 'unknown', health = { up: false }, os = guessOs(), timer = null, closing = null;

  function guessOs() {
    const s = (navigator.platform || '') + ' ' + (navigator.userAgent || '');
    return /Mac/i.test(s) ? 'mac' : /Win/i.test(s) ? 'win' : /Linux|X11/i.test(s) ? 'linux' : 'win';
  }
  const isEsp = () => !!(opts && opts.getBoard && opts.getBoard() === 'esp32');
  const stateOf = (h) => (!h.up ? 'down' : !h.cli ? 'nocli' : isEsp() ? (!h.esp32 ? 'noesp' : 'ready') : !h.avr ? 'noavr' : 'ready');

  async function ping() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    try {
      const r = await fetch(opts.getUrl() + '/health', { cache: 'no-store', signal: ctrl.signal });
      const d = await r.json();
      return { up: true, cli: !!d.cli, avr: !!d.avr, esp32: !!d.esp32 };
    } catch (e) {
      return { up: false };
    } finally { clearTimeout(t); }
  }

  async function check() {
    const h = await ping();
    const prev = state;
    health = h;
    state = stateOf(h);
    render();
    if (state === 'ready') stop(); else start();
    if (prev !== state && opts.onChange) opts.onChange(state, prev);
    return state;
  }
  function start() { if (connecting) return; if (!timer) timer = setInterval(check, POLL_MS); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  /* ----- contenu des étapes, selon le système ----- */
  const cmd = (c) => '<div class="srv-cmd"><code>' + c + '</code><button type="button" data-copy="' + c.replace(/"/g, '&quot;') + '">Copier</button></div>';
  const link = (href, label, dl) => '<a href="' + href + '" target="_blank" rel="noopener"' + (dl ? ' download' : '') + '>' + label + '</a>';
  const dl = (file, label) => '<a href="' + FILES + file + '" download>' + label + '</a>';

  function steps() {
    const nodeStep = { done: health.up, h: 'Installer Node.js',
      b: '<p>Node.js est ce qui fait tourner le serveur. Télécharge la version « LTS » et installe-la en cliquant sur « Suivant ».</p><div class="srv-act">' + link('https://nodejs.org/', 'Ouvrir nodejs.org') + '</div>' };
    const cliStep = (extra) => ({ done: !!health.cli, h: 'Installer arduino-cli',
      b: '<p>C\'est l\'outil officiel d\'Arduino qui transforme ton programme en code pour la carte.</p>' + extra });
    const avrStep = isEsp()
      ? { done: !!health.esp32, h: 'Installer les outils de l\'ESP32',
        b: '<p>Ouvre un terminal, tape ces trois lignes l\'une après l\'autre. Le téléchargement est gros (plusieurs centaines de Mo) : compte 10 à 20 minutes.</p>'
          + cmd('arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json')
          + cmd('arduino-cli core update-index') + cmd('arduino-cli core install esp32:esp32')
          + '<p class="srv-warn">Sous Windows, il faut aussi le pilote USB de la carte : <b>CP210x</b> (Silicon Labs) ou <b>CH340</b>, selon la puce écrite près du port USB.</p>' }
      : { done: !!health.avr, h: 'Installer les outils des cartes Nano et Uno',
        b: '<p>Ouvre un terminal, tape ces deux lignes l\'une après l\'autre (il faut Internet, compte quelques minutes) :</p>'
          + cmd('arduino-cli core update-index') + cmd('arduino-cli core install arduino:avr')
          + '<p>Pour la radio du robot Cagett\'bot (module nRF24L01), ajoute aussi sa bibliothèque :</p>' + cmd('arduino-cli lib install RF24') };
    if (os === 'win') {
      return [nodeStep,
        cliStep('<p>Sur la page des versions, choisis le fichier qui se termine par <b>Windows_64bit.msi</b> (dans la liste « Assets »), puis installe-le. Ferme et rouvre ensuite le terminal.</p><div class="srv-act">'
          + link('https://github.com/arduino/arduino-cli/releases/latest', 'Ouvrir la page des versions') + '</div>'),
        Object.assign(avrStep, { b: avrStep.b.replace('un terminal', 'l\'« Invite de commandes » (menu Démarrer, tape <b>cmd</b>)') }),
        { done: health.up, h: 'Télécharger le serveur',
          b: '<p>Mets ces trois fichiers dans un même dossier, par exemple <b>Documents\\atelier-du-codeur</b> :</p><div class="srv-act">'
            + dl('server.js', 'server.js') + dl('demarrage-automatique.bat', 'demarrage-automatique.bat') + dl('demarrer.bat', 'demarrer.bat') + '</div>'
            + '<p class="srv-warn">Chrome peut dire que ce type de fichier est « dangereux » : clique sur « Conserver ». Ce sont des fichiers de quelques lignes, tu peux les lire avec le Bloc-notes.</p>' },
        { done: health.up, h: 'Démarrer le serveur',
          b: '<p>Double-clique sur <b>demarrage-automatique.bat</b> : le serveur démarre tout de suite, sans fenêtre, et se rallume tout seul à chaque ouverture de session Windows.</p>'
            + '<p>Tu préfères le lancer à la main ? Double-clique sur <b>demarrer.bat</b> et laisse sa fenêtre ouverte.</p>'
            + '<p class="srv-warn">Si Windows affiche « Windows a protégé votre ordinateur » : clique sur « Informations complémentaires », puis « Exécuter quand même ».</p>' }];
    }
    const installCli = os === 'mac'
      ? '<p>Avec Homebrew :</p>' + cmd('brew install arduino-cli')
      : '<p>Dans un terminal :</p>' + cmd('curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sudo BINDIR=/usr/local/bin sh');
    return [nodeStep, cliStep(installCli), avrStep,
      { done: health.up, h: 'Télécharger le serveur',
        b: '<p>Mets ce fichier dans un dossier, par exemple <b>atelier-du-codeur</b> :</p><div class="srv-act">' + dl('server.js', 'server.js') + '</div>' },
      { done: health.up, h: 'Démarrer le serveur',
        b: '<p>Dans un terminal, va dans ce dossier puis tape la commande ci-dessous. Laisse la fenêtre ouverte pendant que tu programmes.</p>' + cmd('node server.js')
          + (os === 'linux' ? '<p>Sous Linux, ajoute aussi ton compte au groupe des ports USB, puis rouvre ta session :</p>' + cmd('sudo usermod -aG dialout $USER') : '') }];
  }

  /* ----- affichage ----- */
  function row(status, title, sub) {
    return '<div class="srv-row">' + ICON[status] + '<div><b>' + title + '</b><small>' + sub + '</small></div></div>';
  }
  function render() {
    const pill = opts && opts.pill;
    if (pill) { pill.dataset.state = state; pill.querySelector('span').textContent = PILL[state]; }
    if (!dlg) return;
    const [t, sub] = TITLES[state];
    dlg.querySelector('#srvTitle').textContent = t;
    dlg.querySelector('#srvSub').textContent = sub;
    const mood = state === 'ready' ? 'happy' : state === 'unknown' ? 'work' : 'oops';
    dlg.querySelector('.srv-head svg').setAttribute('data-mood', mood);
    const up = health.up;
    dlg.querySelector('.srv-rows').innerHTML =
      row(up ? 'ok' : state === 'unknown' ? 'unk' : 'no', 'Le serveur de compilation', 'Le petit programme qui tourne sur ton ordinateur')
      + row(up ? (health.cli ? 'ok' : 'no') : 'unk', 'arduino-cli', up ? 'L\'outil officiel d\'Arduino qui compile' : 'On le saura quand le serveur sera allumé')
      + (isEsp()
        ? row(up && health.cli ? (health.esp32 ? 'ok' : 'no') : 'unk', 'Les outils de l\'ESP32', 'Les composants pour la carte ESP32 DevKit')
        : row(up && health.cli ? (health.avr ? 'ok' : 'no') : 'unk', 'Les outils des cartes Nano et Uno', 'Les composants pour les cartes Arduino Nano et Uno'));
    const list = steps();
    const now = list.findIndex((s) => !s.done);
    dlg.querySelector('.srv-steps').innerHTML = list.map((s, i) =>
      '<li class="' + (s.done ? 'done' : i === now ? 'now' : '') + '"><h4>' + s.h + '</h4>' + s.b + '</li>').join('');
    dlg.querySelectorAll('.srv-tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.os === os)));
    dlg.classList.toggle('connecting', state === 'unknown');
    if (state === 'unknown') dlg.querySelector('#srvSub').textContent = TITLES.unknown[1] + (attempt ? ' (essai ' + attempt + ' sur 3)' : '');
    dlg.querySelector('#srvHint').textContent = state === 'unknown' ? 'Connexion en cours…' : state === 'down'
      ? 'Déjà installé ? Il est peut-être éteint : lance demarrer.bat (ou redémarre l\'ordinateur si tu as activé le démarrage automatique).'
      : state === 'ready' ? 'Cette fenêtre va se fermer toute seule.' : 'Je vérifie toute seule toutes les quelques secondes.';
    if (state === 'ready' && dlg.open && !closing) closing = setTimeout(() => { dlg.close(); closing = null; }, 2200);
  }

  function build() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    dlg = document.createElement('dialog');
    dlg.className = 'srv';
    dlg.setAttribute('aria-labelledby', 'srvTitle');
    dlg.innerHTML =
      '<div class="srv-head"><div id="srvMascot"></div><div><h2 id="srvTitle"></h2><p id="srvSub"></p></div>'
      + '<button class="srv-x" type="button" aria-label="Fermer">&times;</button></div>'
      + '<div class="srv-body">'
      + '<h3>À quoi sert ce serveur ?</h3>'
      + '<p>Tes blocs sont traduits en code Arduino (tu le vois à droite de l\'écran). Mais la carte ne comprend pas ce code tel quel : il faut le <b>compiler</b>, c\'est-à-dire le transformer en instructions pour sa puce. Un navigateur ne sait pas faire ça tout seul.</p>'
      + '<p>Le <b>serveur de compilation</b> est un petit programme qui tourne <b>sur ton ordinateur</b>, pas sur Internet. La page lui envoie ton programme, il le compile avec <b>arduino-cli</b>, puis la page l\'envoie dans la carte par le câble USB. Tout reste chez toi.</p>'
      + '<h3>Où en es-tu ?</h3><div class="srv-rows"></div>'
      + '<div class="srv-install"><h3>Installation (une seule fois)</h3>'
      + '<div class="srv-tabs"><button type="button" data-os="win">Windows</button><button type="button" data-os="mac">macOS</button><button type="button" data-os="linux">Linux</button></div>'
      + '<ol class="srv-steps"></ol><p style="height:6px"></p></div></div>'
      + '<div class="srv-foot"><button class="srv-btn primary" id="srvRecheck" type="button">Vérifier maintenant</button>'
      + '<button class="srv-btn light" id="srvLater" type="button">Plus tard</button><span id="srvHint"></span></div>';
    document.body.appendChild(dlg);
    const m = document.getElementById('mascot');
    if (m) { const c = m.cloneNode(true); c.removeAttribute('id'); c.style.cssText = ''; dlg.querySelector('#srvMascot').appendChild(c); }
    dlg.querySelector('.srv-x').onclick = dlg.querySelector('#srvLater').onclick = () => dlg.close();
    dlg.querySelector('#srvRecheck').onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Je cherche…';
      await check(); b.disabled = false; b.textContent = 'Vérifier maintenant';
    };
    dlg.addEventListener('click', (e) => {
      const t = e.target;
      if (t.dataset && t.dataset.os) { os = t.dataset.os; render(); }
      else if (t.dataset && t.dataset.copy) {
        (navigator.clipboard ? navigator.clipboard.writeText(t.dataset.copy) : Promise.reject()).then(
          () => { t.textContent = 'Copié !'; setTimeout(() => { t.textContent = 'Copier'; }, 1400); },
          () => { t.textContent = 'Sélectionne et copie'; });
      } else if (t === dlg) dlg.close();    // clic sur le fond
    });
    dlg.addEventListener('close', () => { if (closing) { clearTimeout(closing); closing = null; } });
  }

  function open() { if (!dlg) build(); render(); if (!dlg.open) dlg.showModal(); if (state !== 'ready') start(); }

  /* getUrl : adresse du serveur ; pill : bouton d'état ; onChange(état, ancien) ; autoOpen : ouvrir seule si le serveur manque. */
  function init(o) {
    opts = o;
    if (!dlg) build();
    o.pill.onclick = open;
    render();
    let seen = false;
    try { seen = sessionStorage.getItem('atelier-assistant-vu') === '1'; } catch (e) { /* stockage indisponible */ }
    const auto = o.autoOpen !== false && !seen;
    const showOnce = () => { try { sessionStorage.setItem('atelier-assistant-vu', '1'); } catch (e) { /* ignoré */ } if (!dlg.open) open(); };
    return (async () => {
      /* 1. on annonce d'abord qu'on se connecte, et on essaie 3 fois avant de parler d'échec */
      connecting = true;
      for (attempt = 1; attempt <= 3; attempt++) {
        render();
        const h = await ping();
        if (h.up) break;
        if (attempt === 1 && auto) showOnce();          // la fenêtre s'ouvre en disant « Connexion au serveur… »
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
      }
      connecting = false;
      attempt = 0;
      /* 2. résultat : prêt (la fenêtre se ferme), ou explication de ce qui manque */
      const st = await check();
      if (st !== 'ready' && auto) showOnce();
      return st;
    })();
  }

  root.ServerSetup = { init: init, check: check, open: open, get state() { return state; } };
})(window);
