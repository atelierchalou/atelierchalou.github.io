/* Accès au site : mot de passe demandé une fois par session de navigateur.
   Attention : c'est une simple barrière, pas une vraie protection (le code est lisible dans la page). */
(function () {
  var KEY = 'atelier-chalou-acces';
  var CODE = 'RUxVQVJE'; // mot de passe encodé
  var ok = false;
  try { ok = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
  if (ok) return;

  var root = document.documentElement;
  root.classList.add('acces-verrou');
  var st = document.createElement('style');
  st.textContent =
    'html.acces-verrou body > *:not(#acces-gate){display:none !important}' +
    '#acces-gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:#152720;font-family:"Nunito Sans",system-ui,sans-serif;color:#f4f0e2}' +
    '#acces-gate .box{width:100%;max-width:360px;background:#1c332a;border:1px solid rgba(244,240,228,.14);border-radius:14px;padding:30px 26px;text-align:center}' +
    '#acces-gate img{height:60px;width:auto;margin-bottom:10px}' +
    '#acces-gate h2{font-family:"Kalam",cursive;font-size:1.5rem;margin:0 0 6px}' +
    '#acces-gate p{margin:0 0 18px;color:#b9c2b6;font-size:.95rem}' +
    '#acces-gate input{width:100%;padding:11px 12px;border-radius:10px;border:1px solid rgba(244,240,228,.25);background:#152720;color:#f4f0e2;font:inherit;font-size:1rem;text-align:center;margin-bottom:10px}' +
    '#acces-gate input:focus{outline:2px solid #e8c468;outline-offset:1px}' +
    '#acces-gate button{width:100%;padding:11px 12px;border:0;border-radius:10px;background:#e8c468;color:#152720;font:inherit;font-weight:800;font-size:1rem;cursor:pointer}' +
    '#acces-gate .err{color:#e06b5b;font-size:.9rem;min-height:1.3em;margin-top:10px}';
  (document.head || root).appendChild(st);

  function build() {
    var g = document.createElement('div');
    g.id = 'acces-gate';
    g.innerHTML =
      '<form class="box" autocomplete="off">' +
      '<img src="logo-blanc.png" alt="Atelier Chalou" onerror="this.remove()">' +
      '<h2>🔒 Accès réservé</h2>' +
      '<p>Entre le mot de passe pour accéder au site.</p>' +
      '<input type="password" id="acces-mdp" placeholder="Mot de passe" aria-label="Mot de passe">' +
      '<button type="submit">Entrer</button>' +
      '<div class="err" id="acces-err" aria-live="polite"></div>' +
      '</form>';
    document.body.appendChild(g);
    var inp = document.getElementById('acces-mdp');
    inp.focus();
    g.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (btoa(unescape(encodeURIComponent(inp.value.trim().toUpperCase()))) === CODE) {
        try { sessionStorage.setItem(KEY, '1'); } catch (er) {}
        location.reload();
      } else {
        document.getElementById('acces-err').textContent = 'Mot de passe incorrect.';
        inp.value = '';
        inp.focus();
      }
    });
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
