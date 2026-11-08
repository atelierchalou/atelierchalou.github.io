/* Petites animations jouées au début d'un parcours guidé (fusée vers Mars, voiture qui freine, barrière qui se lève…).
   GuideIntro.play(idParcours, titre) → Promise résolue à la fin de l'animation (ou dès que l'élève clique / appuie sur Échap). */
(function (root) {
  'use strict';
  const KEY_OFF = 'atelier-sans-intro';   // localStorage = '1' : pas d'animation (tests automatiques)
  const DUR = { mars: 10600, voiture: 6000, robot: 5200, led: 4600, barriere: 6200, pistolet: 5200, cible: 5200, volets: 6200, telecommande: 5400 };
  const TXT = {
    mars: ['Mission Mars', 'Ton rover vient de se poser sur la planète rouge. À toi de le programmer !'],
    voiture: ['Voiture autonome', 'Une voiture qui conduit toute seule… et qui freine devant les obstacles !'],
    robot: ['Cagett\'bot', 'Salut ! Je suis Cagett\'bot. Apprends-moi à avancer, tourner et voir les obstacles.'],
    led: ['La LED de la carte', 'Premier programme : allumer une LED, puis la faire clignoter !'],
    barriere: ['Barrière de parking', 'Un bouton, une LED orange, un servo-moteur : la barrière s\'ouvre pour laisser passer la voiture.'],
    pistolet: ['Pistolet laser', 'Un tir, une munition en moins… attention au chargeur vide !'],
    cible: ['Cible LED', 'Chaque tir reçu fait perdre une vie à la cible.'],
    volets: ['Cibles à volets', 'Touche une cible : son volet se referme !'],
    telecommande: ['Télécommande', 'Des ordres envoyés par radio pour piloter le robot.'],
  };

  /* ---------- petits éléments réutilisés ---------- */
  const stars = (n) => { let s = ''; for (let i = 0; i < n; i++) { const x = (i * 97.3) % 400, y = (i * 53.7) % 240, r = 0.6 + (i % 3) * 0.5; s += '<circle class="twk" style="animation-delay:' + ((i % 7) * 0.3) + 's" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="#fff"/>'; } return s; };
  const bot = (body) => '<g>'
    + '<rect x="-22" y="-16" width="44" height="30" rx="8" fill="' + (body || '#12A3A6') + '" stroke="#0b6e75" stroke-width="2.5"/>'
    + '<circle cx="-9" cy="-3" r="6" fill="#fff"/><circle cx="9" cy="-3" r="6" fill="#fff"/>'
    + '<circle class="eye" cx="-9" cy="-3" r="2.6" fill="#14213d"/><circle class="eye" cx="9" cy="-3" r="2.6" fill="#14213d"/>'
    + '<path d="M-6 7q6 5 12 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    + '<rect x="-24" y="12" width="12" height="9" rx="3" fill="#1b1d24"/><rect x="12" y="12" width="12" height="9" rx="3" fill="#1b1d24"/>'
    + '</g>';
  const car = (brake) => '<g>'
    + '<rect x="-34" y="-14" width="68" height="24" rx="9" fill="#12A3A6" stroke="#0b6e75" stroke-width="2.5"/>'
    + '<path d="M-18 -14l6 -12h22l8 12z" fill="#9fe3e6" stroke="#0b6e75" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<circle cx="-18" cy="12" r="8" fill="#1b1d24"/><circle cx="18" cy="12" r="8" fill="#1b1d24"/><circle cx="-18" cy="12" r="3" fill="#9aa"/><circle cx="18" cy="12" r="3" fill="#9aa"/>'
    + '<rect x="30" y="-8" width="6" height="7" rx="2" fill="#fff6b0"/>'
    + (brake ? '<rect class="brake" x="-36" y="-8" width="5" height="7" rx="2" fill="#ff3b3b"/>' : '')
    + '</g>';

  /* ---------- les scènes (SVG 400 × 240) ---------- */
  const SCENES = {
    mars: () => `
      <defs>
        <linearGradient id="mzsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2a476"/><stop offset="1" stop-color="#f7cfa4"/></linearGradient>
        <linearGradient id="ersky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa9ff"/><stop offset="1" stop-color="#cfe9ff"/></linearGradient>
        <radialGradient id="heat"><stop offset="0" stop-color="#fff3b0"/><stop offset=".45" stop-color="#ffb703"/><stop offset="1" stop-color="#ff5d1f" stop-opacity="0"/></radialGradient>
        <radialGradient id="marsball" cx=".35" cy=".35"><stop offset="0" stop-color="#ee8a5a"/><stop offset="1" stop-color="#a8401c"/></radialGradient>
        <g id="rk"><path d="M0 -26c10 9 11 25 7 38h-14c-4-13-3-29 7-38z" fill="#f2f4f8" stroke="#8b8fa3" stroke-width="1.5"/>
          <circle cx="0" cy="-6" r="4.5" fill="#3d7bff" stroke="#8b8fa3"/><path d="M-7 6l-8 10h8zM7 6l8 10h-8z" fill="#ef476f"/>
          <path class="flame" d="M-5 13q5 20 10 0z" fill="#ffb703"/><path class="flame" d="M-2.5 13q2.5 11 5 0z" fill="#fff3b0"/></g>
      </defs>
      <!-- 1. décollage depuis la Terre -->
      <g class="mz-a">
        <rect width="400" height="240" fill="url(#ersky)"/>
        <ellipse cx="80" cy="60" rx="30" ry="10" fill="#fff" opacity=".8"/><ellipse cx="300" cy="44" rx="38" ry="11" fill="#fff" opacity=".7"/>
        <path d="M0 200q100-20 200 0t200 0v40H0z" fill="#58b368"/>
        <path d="M168 200V96h8v104zM176 110h18M176 140h18M176 170h18" stroke="#6c757d" stroke-width="4" fill="none"/>
        <g class="mz-smoke">${[0, 1, 2, 3, 4].map((i) => '<circle class="puff" style="animation-delay:' + (0.3 + i * 0.12) + 's" cx="' + (186 + (i - 2) * 16) + '" cy="196" r="14" fill="#eef1f6"/>').join('')}</g>
        <g class="mz-lift"><g transform="translate(206 160) scale(1.6)"><use href="#rk"/></g></g>
      </g>
      <!-- 2. voyage dans l'espace -->
      <g class="mz-b">
        <rect width="400" height="240" fill="#0b1030"/>
        <g class="mz-stars">${stars(70)}</g><g class="mz-stars2" transform="translate(400 0)">${stars(70)}</g>
        <g class="mz-earth"><circle cx="60" cy="190" r="34" fill="#2f7de1"/><path d="M38 176q14-10 22 2t24 4" fill="#3fbf6a"/><path d="M44 204q12 4 26-6" fill="#3fbf6a"/></g>
        <g class="mz-planet"><circle cx="330" cy="70" r="40" fill="url(#marsball)"/><circle cx="316" cy="58" r="7" fill="#9b3a17" opacity=".7"/><circle cx="344" cy="84" r="5" fill="#9b3a17" opacity=".7"/><circle cx="340" cy="50" r="3" fill="#f2a27a"/></g>
        <g class="mz-rocket"><g transform="rotate(90)"><use href="#rk"/></g></g>
      </g>
      <!-- 3. entrée dans l'atmosphère, parachute, atterrissage, sortie du rover -->
      <g class="mz-c">
        <rect width="400" height="240" fill="url(#mzsky)"/>
        <circle cx="330" cy="40" r="10" fill="#fff6dc" opacity=".8"/>
        <path d="M0 140q60-22 120-8t130-14 150 10v112H0z" fill="#c45e2e"/>
        <path d="M0 168q90-20 200-4t200-6v82H0z" fill="#a9471f"/>
        <ellipse cx="320" cy="205" rx="26" ry="6" fill="#8b3514"/><ellipse cx="70" cy="214" rx="16" ry="4" fill="#8b3514"/>
        <g class="mz-tracks">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => '<rect class="trk" style="animation-delay:' + (7.4 + i * 0.13) + 's" x="' + (222 + i * 12) + '" y="203" width="7" height="3" rx="1" fill="#7a2c10"/>').join('')}</g>
        <g class="mz-entry"><circle r="26" fill="url(#heat)"/><path d="M-12 -8h24l6 16h-36z" fill="#e9e9ef" stroke="#8b8fa3" stroke-width="2"/></g>
        <g class="mz-capsule">
          <g class="mz-chute"><path d="M-36 -74q36-36 72 0z" fill="#fff" stroke="#ef476f" stroke-width="2"/><path d="M-36 -74q36-16 72 0" fill="#ef476f" opacity=".25"/><path d="M-36 -74l30 52M36 -74l-30 52M0 -92v70" stroke="#c9ccd8" stroke-width="1.2"/></g>
          <path d="M-16 -22h32l6 22h-44z" fill="#e9e9ef" stroke="#8b8fa3" stroke-width="2"/><rect x="-6" y="-16" width="12" height="8" rx="2" fill="#3d7bff"/>
        </g>
        <g class="mz-dust">${[0, 1, 2, 3].map((i) => '<circle class="dust" style="animation-delay:' + (6.5 + i * 0.05) + 's" cx="' + (200 + (i - 1.5) * 22) + '" cy="200" r="10" fill="#d98a5c"/>').join('')}</g>
        <g class="mz-rover"><g transform="scale(.95)">
          <rect x="-24" y="-16" width="48" height="26" rx="7" fill="#12A3A6" stroke="#0b6e75" stroke-width="2.5"/>
          <rect x="-20" y="-24" width="40" height="7" rx="1.5" fill="#23407a" stroke="#9fb7e6"/>
          <g class="mz-mast"><path d="M14 -16v-16" stroke="#c9ccd8" stroke-width="2.5"/><rect x="8" y="-38" width="13" height="7" rx="2" fill="#f2f2f2" stroke="#8b8fa3"/><circle class="blink" cx="20" cy="-35" r="1.8" fill="#ff3b3b"/></g>
          <circle cx="-8" cy="-3" r="5" fill="#fff"/><circle cx="8" cy="-3" r="5" fill="#fff"/><circle cx="-8" cy="-3" r="2.3" fill="#14213d"/><circle cx="8" cy="-3" r="2.3" fill="#14213d"/>
          ${[-16, 0, 16].map((x) => '<g transform="translate(' + x + ' 14)"><g class="wheel"><circle r="6.5" fill="#1b1d24"/><path d="M-5 0h10M0 -5v10" stroke="#9aa" stroke-width="1.6"/></g></g>').join('')}
        </g></g>
        <g class="mz-hello" transform="translate(300 110)"><rect x="-58" y="-18" width="116" height="30" rx="15" fill="#fff" stroke="#0b6e75" stroke-width="2"/><path d="M-12 12l-6 12 16-12z" fill="#fff" stroke="#0b6e75" stroke-width="2"/><text x="0" y="3" text-anchor="middle" font-size="13" font-weight="700" fill="#0b6e75">Bonjour Mars !</text></g>
      </g>`,
    voiture: () => `
      <rect width="400" height="240" fill="#bfe6ff"/><circle cx="340" cy="44" r="20" fill="#ffd166"/>
      <path d="M0 150q100-30 200 0t200 0v90H0z" fill="#8cc36a"/>
      <rect y="160" width="400" height="56" fill="#5b6170"/><rect y="160" width="400" height="4" fill="#fff"/><rect y="212" width="400" height="4" fill="#fff"/>
      <g class="vt-dash">${Array.from({ length: 14 }, (_, i) => '<rect x="' + (i * 40) + '" y="186" width="22" height="4" rx="2" fill="#fff"/>').join('')}</g>
      <g class="vt-box"><rect x="-16" y="-30" width="32" height="30" fill="#c98b4b" stroke="#7a4f22" stroke-width="2"/><path d="M-16 -15h32" stroke="#7a4f22"/><path d="M-9 -30l9 -16 9 16z" fill="#ff7a1a"/><rect x="-6" y="-38" width="12" height="3" fill="#fff"/></g>
      <g class="vt-car">${car(true)}<g class="vt-wave"><path d="M42 -6q8 8 0 16" stroke="#3d7bff" stroke-width="2.5" fill="none"/><path d="M50 -12q14 14 0 28" stroke="#3d7bff" stroke-width="2.5" fill="none" opacity=".6"/></g></g>`,
    robot: () => `
      <rect width="400" height="240" fill="#fff7e6"/>${Array.from({ length: 9 }, (_, i) => '<rect x="' + (i * 50 - 10) + '" y="200" width="40" height="40" fill="#f3e3c2"/>').join('')}
      <g class="rb-bot">${bot()}<g class="rb-arm"><path d="M24 0l14 -12" stroke="#0b6e75" stroke-width="5" stroke-linecap="round"/></g></g>
      <g transform="translate(200 196)"><rect x="-60" y="-42" width="120" height="42" rx="4" fill="#d9a35b" stroke="#8a5a24" stroke-width="3"/>
        <rect x="-52" y="-34" width="104" height="8" fill="#b9823d"/><rect x="-52" y="-18" width="104" height="8" fill="#b9823d"/>
        <text x="0" y="-22" text-anchor="middle" font-size="9" font-weight="700" fill="#5a3a12">CAGETTE</text></g>`,
    led: () => `
      <rect width="400" height="240" fill="#14213d"/>${stars(25)}
      <g transform="translate(200 140)"><rect x="-110" y="-40" width="220" height="80" rx="8" fill="#0f7b8a" stroke="#0b5560" stroke-width="3"/>
        ${Array.from({ length: 15 }, (_, i) => '<rect x="' + (-100 + i * 14) + '" y="-36" width="6" height="6" fill="#d9d9d9"/><rect x="' + (-100 + i * 14) + '" y="30" width="6" height="6" fill="#d9d9d9"/>').join('')}
        <rect x="-30" y="-14" width="40" height="28" rx="3" fill="#1b1d24"/><text x="-10" y="4" font-size="9" text-anchor="middle" fill="#ccc">NANO</text>
        <g transform="translate(60 -6)"><circle class="ld-glow" r="26" fill="#ffd166" opacity=".0"/><path d="M-9 8v-12a9 9 0 0 1 18 0v12z" class="ld-bulb" fill="#7a5a00"/><path d="M-5 8v14M5 8v18" stroke="#ccc" stroke-width="2"/><text x="0" y="-18" font-size="9" text-anchor="middle" fill="#fff">L (D13)</text></g></g>`,
    barriere: () => `
      <rect width="400" height="240" fill="#cde9ff"/><path d="M0 150h400v90H0z" fill="#9aa1ad"/><rect y="176" width="400" height="44" fill="#5b6170"/>
      <rect x="236" y="96" width="14" height="80" rx="3" fill="#ffd166" stroke="#7a5a00" stroke-width="2"/>
      <circle class="bp-light" cx="243" cy="92" r="7" fill="#ff8c1a"/>
      <g class="bp-arm" transform="translate(243 112)"><rect x="-124" y="-5" width="124" height="10" rx="5" fill="#fff" stroke="#c22" stroke-width="2"/>${[0, 1, 2, 3, 4, 5].map((i) => '<rect x="' + (-120 + i * 20) + '" y="-4" width="10" height="8" fill="#e63946"/>').join('')}</g>
      <rect x="252" y="140" width="22" height="30" rx="3" fill="#3d7bff"/><circle class="bp-btn" cx="263" cy="152" r="5" fill="#ef476f"/>
      <g class="bp-car">${car(false)}</g>`,
    pistolet: () => laser(false),
    cible: () => laser(true),
    volets: () => {
      const X = [230, 292, 354], T0 = [0.8, 2.0, 3.2];
      return `
      <rect width="400" height="240" fill="#1d1640"/>${stars(30)}
      <rect x="196" y="78" width="190" height="122" rx="10" fill="#2b2357" stroke="#463a8a" stroke-width="3"/>
      <g transform="translate(70 150)"><path d="M-30 -14h56l8 8v12h-40l-8 24h-16z" fill="#6c757d" stroke="#343a40" stroke-width="3" stroke-linejoin="round"/><rect x="26" y="-10" width="12" height="8" fill="#343a40"/></g>
      ${X.map((x, i) => `
        <path class="vb" style="animation-delay:${T0[i]}s" d="M108 144L${x} 128" stroke="#ff2d55" stroke-width="4" stroke-linecap="round"/>
        <g transform="translate(${x} 128)"><circle r="21" fill="#fff" stroke="#e63946" stroke-width="4"/><circle r="13" fill="#e63946"/><circle r="5" fill="#fff"/>
          <circle class="vhit" style="animation-delay:${T0[i] + 0.25}s" r="27" fill="none" stroke="#ffd166" stroke-width="4" opacity="0"/></g>
        <g transform="translate(${x} 98)"><rect class="vflap" style="animation-delay:${T0[i] + 0.35}s, 4.9s" x="-26" y="0" width="52" height="56" rx="4" fill="#ffd166" stroke="#a87800" stroke-width="2"/>
          <rect x="-28" y="-5" width="56" height="7" rx="3" fill="#8b8fa3"/></g>
        <circle class="vled" style="animation-delay:${T0[i] + 0.35}s, 4.9s" cx="${x}" cy="184" r="6" fill="#2c2c2c" stroke="#555"/>`).join('')}
      <g class="vraz"><circle cx="40" cy="214" r="13" fill="#ef476f" stroke="#7a1030" stroke-width="2"/><text x="62" y="219" font-size="13" font-weight="700" fill="#fff">RAZ</text></g>
      <text class="vmsg" x="290" y="62" text-anchor="middle" font-size="16" font-weight="700" fill="#ffd166">3 cibles touchées !</text>`;
    },
    telecommande: () => `
      <rect width="400" height="240" fill="#eef4ff"/><rect y="196" width="400" height="44" fill="#dfe6f3"/>
      <g transform="translate(90 140)"><rect x="-30" y="-50" width="60" height="100" rx="14" fill="#3d7bff" stroke="#1f3f8a" stroke-width="3"/>
        <circle cx="0" cy="-22" r="7" fill="#fff"/><circle cx="0" cy="8" r="7" fill="#fff"/><circle cx="-14" cy="-7" r="7" fill="#fff"/><circle cx="14" cy="-7" r="7" fill="#fff"/><circle cx="0" cy="32" r="8" fill="#ff8c1a"/></g>
      <g class="tc-waves">${[0, 1, 2].map((i) => '<path style="animation-delay:' + (i * 0.25) + 's" class="tc-w" d="M128 ' + (100 - i * 12) + 'q' + (18 + i * 10) + ' ' + (40 + i * 12) + ' 0 ' + (80 + i * 24) + '" stroke="#3d7bff" stroke-width="4" fill="none" stroke-linecap="round"/>').join('')}</g>
      <g class="tc-bot">${bot()}</g>`,
  };
  function laser(target, flaps) {
    return `
      <rect width="400" height="240" fill="#1d1640"/>${stars(30)}
      <g transform="translate(70 150)"><path d="M-30 -14h56l8 8v12h-40l-8 24h-16z" fill="#6c757d" stroke="#343a40" stroke-width="3" stroke-linejoin="round"/><rect x="26" y="-10" width="12" height="8" fill="#343a40"/></g>
      <path class="lz-beam" d="M108 144H300" stroke="#ff2d55" stroke-width="4" stroke-linecap="round"/>
      <g transform="translate(316 144)">
        ${flaps ? '<g class="lz-flap"><rect x="-26" y="-60" width="52" height="56" rx="4" fill="#ffd166" stroke="#7a5a00" stroke-width="2"/></g>' : ''}
        <circle r="30" fill="#fff" stroke="#e63946" stroke-width="5"/><circle r="19" fill="#e63946"/><circle r="9" fill="#fff"/>
        <circle class="lz-hit" r="38" fill="none" stroke="#ffd166" stroke-width="5" opacity="0"/></g>
      ${target ? [0, 1, 2, 3, 4].map((i) => '<circle class="lz-led" style="animation-delay:' + (1.6 + i * 0.5) + 's" cx="' + (270 + i * 18) + '" cy="200" r="6" fill="#2ecc40"/>').join('') : [0, 1, 2, 3, 4].map((i) => '<circle class="lz-ammo" style="animation-delay:' + (1.2 + i * 0.55) + 's" cx="' + (40 + i * 18) + '" cy="206" r="6" fill="#ffd166"/>').join('')}`;
  }

  const CSS = `
.gintro{position:fixed;inset:0;z-index:1500;background:rgba(15,20,45,.72);display:flex;align-items:center;justify-content:center;padding:16px;animation:gfade .25s ease-out;cursor:pointer}
.gintro-card{width:min(760px,96vw);background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.45)}
.gintro svg{display:block;width:100%;height:auto;font-family:var(--font, sans-serif)}
.gintro-txt{padding:12px 20px 16px;text-align:center}
.gintro-txt b{display:block;font-size:24px;color:#0b6e75}
.gintro-txt span{display:block;font-size:16px;color:#34405a;margin-top:2px}
.gintro-skip{margin-top:10px;font:600 14px var(--font, sans-serif);border:0;border-radius:999px;padding:8px 18px;background:#eef1f8;color:#3a4766;cursor:pointer}
.gintro-bar{height:5px;background:#eef1f8}.gintro-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#34B34A,#3D7BFF);animation:gibar linear forwards}
@keyframes gibar{to{width:100%}}
.gintro .twk{animation:twk 1.6s ease-in-out infinite alternate}@keyframes twk{from{opacity:.25}to{opacity:1}}
.gintro .flame{animation:flame .15s infinite alternate;transform-origin:0 13px}@keyframes flame{to{transform:scaleY(1.5)}}
/* Mars */
.gintro .mz-a{animation:mzhide .4s 1.9s forwards}
@keyframes mzhide{to{opacity:0;visibility:hidden}}
@keyframes mzshow{from{opacity:0}to{opacity:1}}
.gintro .puff{transform-box:fill-box;transform-origin:center;transform:scale(0);animation:puff 1.2s ease-out forwards}
@keyframes puff{0%{transform:scale(0);opacity:1}100%{transform:scale(2.6) translateY(-4px);opacity:.15}}
.gintro .mz-lift{animation:lift 1.5s .6s cubic-bezier(.5,0,.9,.6) forwards}@keyframes lift{0%{transform:translate(0,0)}8%{transform:translate(-1px,1px)}16%{transform:translate(1px,0)}100%{transform:translate(0,-330px)}}
.gintro .mz-b{opacity:0;animation:mzshow .3s 1.9s forwards,mzhide .4s 4.1s forwards}
.gintro .mz-stars,.gintro .mz-stars2{animation:stars 2.4s 1.9s linear forwards}@keyframes stars{to{transform:translateX(-400px)}}
.gintro .mz-stars2{animation-name:stars2}@keyframes stars2{from{transform:translateX(400px)}to{transform:translateX(0)}}
.gintro .mz-earth{transform-box:fill-box;transform-origin:center;animation:shrink 2.2s 1.9s ease-in forwards}@keyframes shrink{to{transform:scale(.4) translate(-60px,40px);opacity:.6}}
.gintro .mz-planet{transform-box:fill-box;transform-origin:center;animation:grow 2.2s 1.9s ease-in forwards}@keyframes grow{to{transform:scale(2.4) translate(-14px,22px)}}
.gintro .mz-rocket{offset-path:path('M50 190 C 130 80, 240 50, 320 80');offset-rotate:auto;offset-distance:0%;animation:mzfly 2.2s 1.9s ease-in-out forwards}
@keyframes mzfly{from{offset-distance:0%}to{offset-distance:100%;transform:scale(.4)}}
.gintro .mz-c{opacity:0;animation:mzshow .4s 4.1s forwards}
.gintro .mz-entry{offset-path:path('M60 -20 C 120 40, 170 70, 200 90');offset-distance:0%;opacity:0;animation:entry 1.2s 4.3s ease-in forwards}
@keyframes entry{0%{offset-distance:0%;opacity:1}90%{opacity:1}100%{offset-distance:100%;opacity:0}}
.gintro .mz-capsule{transform:translate(200px,90px);opacity:0;animation:capdrop 1.6s 5.4s cubic-bezier(.2,.8,.4,1) forwards}
@keyframes capdrop{0%{opacity:1;transform:translate(200px,90px)}100%{opacity:1;transform:translate(200px,196px)}}
.gintro .mz-chute{transform-origin:0 -22px;transform:scale(.05);animation:chute .5s 5.4s cubic-bezier(.3,1.6,.5,1) forwards,chuteoff .6s 7.1s forwards}
@keyframes chute{to{transform:scale(1)}}@keyframes chuteoff{to{transform:translate(40px,30px) rotate(70deg) scale(.9);opacity:.6}}
.gintro .dust{transform-box:fill-box;transform-origin:center;transform:scale(0);opacity:0;animation:dust .9s ease-out forwards}
@keyframes dust{0%{transform:scale(.2);opacity:.9}100%{transform:scale(2.4) translateY(-6px);opacity:0}}
.gintro .mz-rover{opacity:0;transform:translate(200px,190px);animation:mzrove 2.2s 7.3s ease-in-out forwards}
@keyframes mzrove{0%{opacity:1;transform:translate(208px,188px)}100%{opacity:1;transform:translate(330px,190px)}}
.gintro .wheel{transform-box:fill-box;transform-origin:center;animation:spin .7s 7.3s linear 3}@keyframes spin{to{transform:rotate(360deg)}}
.gintro .mz-mast{transform-origin:14px -16px;transform:scaleY(.2);animation:mast .5s 9.2s forwards}@keyframes mast{to{transform:none}}
.gintro .blink{animation:twk .4s infinite alternate}
.gintro .trk{opacity:0;animation:mzshow .2s forwards}
.gintro .mz-hello{opacity:0;transform:translate(300px,110px) scale(.6);animation:hello .4s 9.4s cubic-bezier(.3,1.6,.5,1) forwards}@keyframes hello{to{opacity:1;transform:translate(300px,118px) scale(1)}}
/* Cibles à volets */
.gintro .vb{stroke-dasharray:240;stroke-dashoffset:240;opacity:0;animation:lzshot .45s forwards}
.gintro .vhit{animation:lzhit .5s forwards}
.gintro .vflap{transform-box:fill-box;transform-origin:top;transform:scaleY(.12);animation:vclose .35s ease-in forwards,vopen .4s ease-out forwards}
@keyframes vclose{from{transform:scaleY(.12)}to{transform:scaleY(1)}}@keyframes vopen{from{transform:scaleY(1)}to{transform:scaleY(.12)}}
.gintro .vled{animation:vledon .2s forwards,vledoff .2s forwards}
@keyframes vledon{to{fill:#2ecc40;filter:drop-shadow(0 0 4px #2ecc40)}}@keyframes vledoff{from{fill:#2ecc40}to{fill:#2c2c2c;filter:none}}
.gintro .vraz{animation:razp .3s 4.6s 2 alternate}@keyframes razp{to{transform:translateY(3px);filter:brightness(.8)}}
.gintro .vmsg{opacity:0;animation:mzshow .3s 3.9s forwards,mzhide .3s 4.8s forwards}
/* Voiture */
.gintro .vt-car{transform:translate(-60px,186px);animation:vtdrive 3.4s .2s cubic-bezier(.25,.6,.35,1) forwards}
@keyframes vtdrive{to{transform:translate(250px,186px)}}
.gintro .vt-dash{animation:vtdash 3.6s linear forwards}@keyframes vtdash{to{transform:translateX(-80px)}}
.gintro .vt-box{transform:translate(340px,200px);opacity:0;animation:mzin .4s 1.2s forwards}
.gintro .vt-wave{animation:vtwave .6s infinite}@keyframes vtwave{50%{opacity:.2}}
.gintro .brake{opacity:0;animation:vtbrake .5s 3.2s infinite alternate}@keyframes vtbrake{to{opacity:1}}
/* Cagett'bot */
.gintro .rb-bot{transform:translate(200px,190px);animation:rbup 1.2s .4s cubic-bezier(.3,1.6,.5,1) forwards}
@keyframes rbup{to{transform:translate(200px,120px)}}
.gintro .rb-arm{transform-origin:24px 0;animation:rbwave .35s 1.6s 6 alternate}@keyframes rbwave{to{transform:rotate(-35deg)}}
.gintro .eye{animation:blink 2.4s 1s infinite}@keyframes blink{0%,92%,100%{transform:none}96%{transform:scaleY(.1)}}
.gintro .eye{transform-box:fill-box;transform-origin:center}
/* LED */
.gintro .ld-bulb{animation:ldon 1s .6s infinite}@keyframes ldon{0%,49%{fill:#ffd166}50%,100%{fill:#7a5a00}}
.gintro .ld-glow{animation:ldglow 1s .6s infinite}@keyframes ldglow{0%,49%{opacity:.45}50%,100%{opacity:0}}
/* Barrière */
.gintro .bp-btn{animation:bpbtn .3s 0.8s 2 alternate}@keyframes bpbtn{to{fill:#7a1030;transform:translateY(2px)}}
.gintro .bp-arm{animation:bparm 4.6s 1s ease-in-out forwards}@keyframes bparm{0%{transform:translate(243px,112px) rotate(0)}18%,72%{transform:translate(243px,112px) rotate(80deg)}100%{transform:translate(243px,112px) rotate(0)}}
.gintro .bp-light{animation:bplight .5s 1s 9 alternate}@keyframes bplight{from{opacity:.25}to{opacity:1;filter:drop-shadow(0 0 6px #ff8c1a)}}
.gintro .bp-car{transform:translate(-60px,190px);animation:bpcar 5s ease-in-out forwards}
@keyframes bpcar{0%{transform:translate(-60px,190px)}25%,35%{transform:translate(150px,190px)}100%{transform:translate(470px,190px)}}
/* Laser */
.gintro .lz-beam{stroke-dasharray:200;stroke-dashoffset:200;animation:lzshot .5s .9s 4}@keyframes lzshot{0%{stroke-dashoffset:200;opacity:1}60%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
.gintro .lz-hit{animation:lzhit .5s 1.2s 4}@keyframes lzhit{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(1.3)}}
.gintro .lz-led,.gintro .lz-ammo{animation:lzoff .3s forwards}@keyframes lzoff{to{fill:#3a3a3a}}
.gintro .lz-flap{transform-origin:0 -4px;animation:lzflap .6s 1.4s forwards}@keyframes lzflap{from{transform:rotateX(90deg)}to{transform:none}}
/* Télécommande */
.gintro .tc-w{opacity:0;animation:tcw 1.2s infinite}@keyframes tcw{0%{opacity:0}30%{opacity:1}100%{opacity:0;transform:translateX(30px)}}
.gintro .tc-bot{transform:translate(270px,180px);animation:tcbot 4.2s .8s ease-in-out forwards}@keyframes tcbot{0%{transform:translate(270px,180px)}40%{transform:translate(330px,180px)}70%{transform:translate(300px,180px) rotate(-20deg)}100%{transform:translate(260px,180px)}}
@media (prefers-reduced-motion: reduce){.gintro *{animation-duration:.01s !important;animation-delay:0s !important;animation-iteration-count:1 !important}}
`;

  function play(id, title) {
    const scene = SCENES[id];
    let off = false;
    try { off = localStorage.getItem(KEY_OFF) === '1'; } catch (e) {}
    if (!scene || off) return Promise.resolve();
    if (!document.getElementById('gintro-css')) { const st = document.createElement('style'); st.id = 'gintro-css'; st.textContent = CSS; document.head.appendChild(st); }
    const dur = DUR[id] || 5000;
    const [t1, t2] = TXT[id] || [title || '', ''];
    const ov = document.createElement('div');
    ov.className = 'gintro';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Présentation du parcours ' + t1);
    ov.innerHTML = '<div class="gintro-card"><svg viewBox="0 0 400 240" aria-hidden="true">' + scene() + '</svg>'
      + '<div class="gintro-bar"><i style="animation-duration:' + dur + 'ms"></i></div>'
      + '<div class="gintro-txt"><b></b><span></span><button type="button" class="gintro-skip">C\'est parti ! ▶</button></div></div>';
    ov.querySelector('b').textContent = t1;
    ov.querySelector('span').textContent = t2;
    document.body.appendChild(ov);
    return new Promise((resolve) => {
      let done = false;
      const end = () => { if (done) return; done = true; clearTimeout(tm); document.removeEventListener('keydown', key, true); ov.style.transition = 'opacity .25s'; ov.style.opacity = '0'; setTimeout(() => ov.remove(), 260); resolve(); };
      const key = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); end(); } };
      const tm = setTimeout(end, dur + 400);
      ov.addEventListener('click', end);
      document.addEventListener('keydown', key, true);
      ov.querySelector('.gintro-skip').focus();
    });
  }
  /* ---------- Illustrations fixes (bilan PDF) : 400 × 120, sans animation ni police externe ---------- */
  const sky = (a, b) => '<defs><linearGradient id="psky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs><rect width="400" height="120" fill="url(#psky)"/>';
  const g = (x, y, k, inner) => '<g transform="translate(' + x + ' ' + y + ') scale(' + (k || 1) + ')">' + inner + '</g>';
  const rover = () => '<rect x="-24" y="-16" width="48" height="26" rx="7" fill="#12A3A6" stroke="#0b6e75" stroke-width="2.5"/><rect x="-20" y="-24" width="40" height="7" rx="1.5" fill="#23407a" stroke="#9fb7e6"/>'
    + '<path d="M14 -16v-16" stroke="#c9ccd8" stroke-width="2.5"/><rect x="8" y="-38" width="13" height="7" rx="2" fill="#f2f2f2" stroke="#8b8fa3"/>'
    + '<circle cx="-8" cy="-3" r="5" fill="#fff"/><circle cx="8" cy="-3" r="5" fill="#fff"/><circle cx="-8" cy="-3" r="2.3" fill="#14213d"/><circle cx="8" cy="-3" r="2.3" fill="#14213d"/>'
    + [-16, 0, 16].map((x) => '<circle cx="' + x + '" cy="14" r="6.5" fill="#1b1d24"/>').join('');
  const target = (x, y, r) => g(x, y, 1, '<circle r="' + r + '" fill="#fff" stroke="#e63946" stroke-width="' + r / 6 + '"/><circle r="' + r * 0.62 + '" fill="#e63946"/><circle r="' + r * 0.25 + '" fill="#fff"/>');
  const pistol = (x, y) => g(x, y, 1, '<path d="M-30 -14h56l8 8v12h-40l-8 24h-16z" fill="#6c757d" stroke="#343a40" stroke-width="3" stroke-linejoin="round"/>');
  const starsBg = (n) => { let t = ''; for (let i = 0; i < n; i++) t += '<circle cx="' + ((i * 97.3) % 400).toFixed(1) + '" cy="' + ((i * 41.7) % 120).toFixed(1) + '" r="' + (0.6 + (i % 3) * 0.5) + '" fill="#fff" opacity=".8"/>'; return t; };
  const POSTERS = {
    mars: () => sky('#e2a476', '#f7cfa4') + '<circle cx="340" cy="26" r="9" fill="#fff6dc"/>'
      + '<path d="M0 70q60-18 120-6t130-12 150 8v60H0z" fill="#c45e2e"/><path d="M0 92q90-16 200-3t200-5v36H0z" fill="#a9471f"/>'
      + '<ellipse cx="90" cy="106" rx="20" ry="4" fill="#8b3514"/><path d="M250 98l10-14 14 4 6 12z" fill="#6b3020"/>'
      + g(60, 80, 1, '<path d="M-16 -22h32l6 22h-44z" fill="#e9e9ef" stroke="#8b8fa3" stroke-width="2"/><path d="M-20 0l-8 10M20 0l8 10" stroke="#c9ccd8" stroke-width="2"/>')
      + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => '<rect x="' + (110 + i * 12) + '" y="96" width="7" height="3" rx="1" fill="#7a2c10"/>').join('') + g(225, 86, 1, rover()),
    voiture: () => sky('#bfe6ff', '#e6f5ff') + '<circle cx="350" cy="28" r="14" fill="#ffd166"/><path d="M0 62q100-20 200 0t200 0v58H0z" fill="#8cc36a"/>'
      + '<rect y="72" width="400" height="40" fill="#5b6170"/><rect y="72" width="400" height="3" fill="#fff"/><rect y="109" width="400" height="3" fill="#fff"/>'
      + Array.from({ length: 10 }, (_, i) => '<rect x="' + (i * 44) + '" y="90" width="24" height="3" rx="1.5" fill="#fff"/>').join('')
      + g(300, 96, 1, '<rect x="-14" y="-26" width="28" height="26" fill="#c98b4b" stroke="#7a4f22" stroke-width="2"/><path d="M-8 -26l8 -14 8 14z" fill="#ff7a1a"/>')
      + g(190, 95, 0.9, car(false)) + '<path d="M228 84q8 8 0 16M236 78q14 14 0 28" stroke="#3d7bff" stroke-width="2.5" fill="none"/>'
      + g(40, 50, 1, '<circle r="12" fill="#2f8a3a"/><rect x="-2" y="10" width="4" height="10" fill="#7a4f22"/>'),
    robot: () => sky('#fff7e6', '#fff1d6') + Array.from({ length: 9 }, (_, i) => '<rect x="' + (i * 50 - 10) + '" y="96" width="40" height="24" fill="#f3e3c2"/>').join('')
      + g(200, 52, 1.1, bot()) + g(200, 104, 1, '<rect x="-60" y="-34" width="120" height="34" rx="4" fill="#d9a35b" stroke="#8a5a24" stroke-width="3"/><rect x="-52" y="-27" width="104" height="7" fill="#b9823d"/><rect x="-52" y="-14" width="104" height="7" fill="#b9823d"/>')
      + '<path d="M90 70h50M260 70h50" stroke="#141414" stroke-width="4" stroke-linecap="round"/>',
    led: () => '<rect width="400" height="120" fill="#14213d"/>' + starsBg(25)
      + g(200, 66, 1, '<rect x="-110" y="-36" width="220" height="72" rx="8" fill="#0f7b8a" stroke="#0b5560" stroke-width="3"/>'
        + Array.from({ length: 15 }, (_, i) => '<rect x="' + (-100 + i * 14) + '" y="-32" width="6" height="6" fill="#d9d9d9"/><rect x="' + (-100 + i * 14) + '" y="26" width="6" height="6" fill="#d9d9d9"/>').join('')
        + '<rect x="-30" y="-14" width="40" height="28" rx="3" fill="#1b1d24"/>'
        + '<g transform="translate(60 -4)"><circle r="24" fill="#ffd166" opacity=".45"/><path d="M-9 8v-12a9 9 0 0 1 18 0v12z" fill="#ffd166"/><path d="M-5 8v12M5 8v16" stroke="#ccc" stroke-width="2"/></g>'),
    barriere: () => sky('#cde9ff', '#eaf5ff') + '<path d="M0 70h400v50H0z" fill="#9aa1ad"/><rect y="84" width="400" height="30" fill="#5b6170"/>'
      + '<rect x="236" y="34" width="14" height="60" rx="3" fill="#ffd166" stroke="#7a5a00" stroke-width="2"/><circle cx="243" cy="30" r="8" fill="#ff8c1a"/><circle cx="243" cy="30" r="14" fill="#ff8c1a" opacity=".3"/>'
      + g(243, 46, 1, '<g transform="rotate(70)"><rect x="-124" y="-5" width="124" height="10" rx="5" fill="#fff" stroke="#c22" stroke-width="2"/>' + [0, 1, 2, 3, 4, 5].map((i) => '<rect x="' + (-120 + i * 20) + '" y="-4" width="10" height="8" fill="#e63946"/>').join('') + '</g>')
      + g(150, 100, 0.85, car(false)) + '<rect x="256" y="64" width="20" height="26" rx="3" fill="#3d7bff"/><circle cx="266" cy="74" r="5" fill="#ef476f"/>',
    pistolet: () => '<rect width="400" height="120" fill="#1d1640"/>' + starsBg(30) + pistol(80, 64) + '<path d="M118 58H300" stroke="#ff2d55" stroke-width="4" stroke-linecap="round"/>' + target(316, 58, 28)
      + [0, 1, 2, 3, 4].map((i) => '<circle cx="' + (50 + i * 16) + '" cy="104" r="5.5" fill="' + (i < 2 ? '#ffd166' : '#3a3a3a') + '"/>').join(''),
    cible: () => '<rect width="400" height="120" fill="#1d1640"/>' + starsBg(30) + pistol(80, 64) + '<path d="M118 58H284" stroke="#ff2d55" stroke-width="4" stroke-linecap="round"/>' + target(300, 58, 28)
      + '<circle cx="300" cy="58" r="36" fill="none" stroke="#ffd166" stroke-width="4" opacity=".7"/>' + [0, 1, 2, 3, 4].map((i) => '<circle cx="' + (264 + i * 18) + '" cy="106" r="5.5" fill="' + (i < 3 ? '#2ecc40' : '#3a3a3a') + '"/>').join(''),
    volets: () => '<rect width="400" height="120" fill="#1d1640"/>' + starsBg(30) + pistol(70, 70)
      + '<rect x="196" y="14" width="190" height="96" rx="10" fill="#2b2357" stroke="#463a8a" stroke-width="3"/>'
      + [[230, true], [292, true], [354, false]].map(([x, closed]) => target(x, 58, 20) + (closed ? '<rect x="' + (x - 26) + '" y="30" width="52" height="54" rx="4" fill="#ffd166" stroke="#a87800" stroke-width="2"/>' : '<rect x="' + (x - 26) + '" y="30" width="52" height="7" rx="3" fill="#ffd166" stroke="#a87800" stroke-width="2"/>')
        + '<circle cx="' + x + '" cy="98" r="5.5" fill="' + (closed ? '#2ecc40' : '#3a3a3a') + '"/>').join('') + '<path d="M108 64L354 58" stroke="#ff2d55" stroke-width="3.5" stroke-linecap="round"/>',
    telecommande: () => sky('#eef4ff', '#dfe8fb') + '<rect y="98" width="400" height="22" fill="#dfe6f3"/>'
      + g(110, 60, 0.85, '<rect x="-30" y="-50" width="60" height="100" rx="14" fill="#3d7bff" stroke="#1f3f8a" stroke-width="3"/><circle cx="0" cy="-22" r="7" fill="#fff"/><circle cx="0" cy="8" r="7" fill="#fff"/><circle cx="-14" cy="-7" r="7" fill="#fff"/><circle cx="14" cy="-7" r="7" fill="#fff"/><circle cx="0" cy="32" r="8" fill="#ff8c1a"/>')
      + [0, 1, 2].map((i) => '<path d="M' + (150 + i * 16) + ' ' + (40 - i * 8) + 'q' + (14 + i * 8) + ' ' + (20 + i * 8) + ' 0 ' + (40 + i * 16) + '" stroke="#3d7bff" stroke-width="4" fill="none" stroke-linecap="round" opacity="' + (1 - i * 0.25) + '"/>').join('')
      + g(290, 80, 1, bot()),
  };
  function poster(id) {
    const f = POSTERS[id];
    return f ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="1200" height="360">' + f() + '</svg>' : null;
  }
  function robotFace() { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -26 60 52" width="300" height="260">' + bot() + '</svg>'; }

  root.GuideIntro = { play: play, scenes: Object.keys(SCENES), poster: poster, robotFace: robotFace };
})(typeof window !== 'undefined' ? window : globalThis);
