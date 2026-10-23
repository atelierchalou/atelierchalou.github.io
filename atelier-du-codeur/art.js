/* Illustrations : petits dessins en SVG (aucun fichier image), fond décoré, confettis. */
(function (root) {
  'use strict';

  /* Chaque dessin tient dans un carré de 24 x 24. f = couleur du trait, a = couleur d'accent. */
  const G = {
    flag: (f, a) => `<path d="M8.5 19.5V5" stroke="${f}" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M9 5.8h9l-2.4 3.6 2.4 3.6H9z" fill="${f}"/><circle cx="8.5" cy="19.5" r="1.5" fill="${a}"/>`,
    loop: (f, a) => `<path d="M18 12a6 6 0 1 1-1.9-4.4" fill="none" stroke="${f}" stroke-width="2.3" stroke-linecap="round"/><path d="M18.8 4.4v5.2h-5.2z" fill="${f}"/><circle cx="12" cy="12" r="1.7" fill="${a}"/>`,
    chip: (f, a) => `<path d="M9.8 4.5v3.3M14.2 4.5v3.3M9.8 16.2v3.3M14.2 16.2v3.3M4.5 9.8h3.3M4.5 14.2h3.3M16.2 9.8h3.3M16.2 14.2h3.3" stroke="${f}" stroke-width="1.8" stroke-linecap="round"/><rect x="7.6" y="7.6" width="8.8" height="8.8" rx="2" fill="${f}"/><circle cx="12" cy="12" r="1.9" fill="${a}"/>`,
    bulb: (f, a) => `<path d="M12 4.2a5.3 5.3 0 0 0-3.2 9.5c.5.4.7.9.7 1.5v.4h5v-.4c0-.6.2-1.1.7-1.5A5.3 5.3 0 0 0 12 4.2z" fill="${a}" stroke="${f}" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 18.3h4M10.8 20.1h2.4" stroke="${f}" stroke-width="1.6" stroke-linecap="round"/>`,
    button: (f, a) => `<rect x="4.5" y="14" width="15" height="5.2" rx="2" fill="${f}"/><path d="M7.2 14v-1.6a4.8 4.8 0 0 1 9.6 0V14z" fill="${a}" stroke="${f}" stroke-width="1.6" stroke-linejoin="round"/>`,
    slider: (f, a) => `<path d="M4.5 12h15" stroke="${f}" stroke-width="2.6" stroke-linecap="round"/><circle cx="14.5" cy="12" r="3.5" fill="${a}" stroke="${f}" stroke-width="1.8"/>`,
    knob: (f, a) => `<circle cx="12" cy="12.8" r="6.8" fill="${f}"/><path d="M12 12.8l3.4-3.7" stroke="${a}" stroke-width="2.3" stroke-linecap="round"/><path d="M5.2 6.4l1.4 1.3M18.8 6.4l-1.4 1.3M12 3.8v1.6" stroke="${f}" stroke-width="1.6" stroke-linecap="round"/>`,
    clock: (f, a) => `<circle cx="12" cy="12" r="7.2" fill="${a}" stroke="${f}" stroke-width="2"/><path d="M12 7.8v4.4l2.9 1.7" stroke="${f}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    stopwatch: (f, a) => `<circle cx="12" cy="13.4" r="6.2" fill="${a}" stroke="${f}" stroke-width="2"/><path d="M10 4.5h4M12 4.5v2.7M12 10.2v3.6l2.1 1.3" stroke="${f}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    eyes: (f, a) => `<circle cx="8" cy="13" r="4" fill="#fff" stroke="${f}" stroke-width="1.8"/><circle cx="16" cy="13" r="4" fill="#fff" stroke="${f}" stroke-width="1.8"/><circle cx="8.7" cy="13.3" r="1.7" fill="${f}"/><circle cx="16.7" cy="13.3" r="1.7" fill="${f}"/><path d="M6 6.4a8 8 0 0 1 12 0" fill="none" stroke="${a}" stroke-width="1.9" stroke-linecap="round"/>`,
    servo: (f, a) => `<rect x="4.2" y="11.6" width="10.4" height="7.2" rx="1.8" fill="${f}"/><path d="M14.5 10.5l4-4.4" stroke="${f}" stroke-width="2.5" stroke-linecap="round"/><circle cx="14.5" cy="10.5" r="2.5" fill="${a}" stroke="${f}" stroke-width="1.6"/>`,
    note: (f, a) => `<path d="M9.6 17V6.8l8-1.8v10" fill="none" stroke="${f}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="7.6" cy="17.2" rx="2.5" ry="2.1" fill="${a}" stroke="${f}" stroke-width="1.6"/><ellipse cx="15.6" cy="15.2" rx="2.5" ry="2.1" fill="${a}" stroke="${f}" stroke-width="1.6"/>`,
    chat: (f, a) => `<path d="M5.4 8a2.6 2.6 0 0 1 2.6-2.6h8A2.6 2.6 0 0 1 18.6 8v5a2.6 2.6 0 0 1-2.6 2.6h-4.4l-3.4 3v-3H8A2.6 2.6 0 0 1 5.4 13z" fill="${f}"/><circle cx="9.1" cy="10.5" r="1.15" fill="${a}"/><circle cx="12" cy="10.5" r="1.15" fill="${a}"/><circle cx="14.9" cy="10.5" r="1.15" fill="${a}"/>`,
    scale: (f, a) => `<path d="M4.5 12h15M8.2 8.2L4.5 12l3.7 3.8M15.8 8.2l3.7 3.8-3.7 3.8" fill="none" stroke="${f}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.9" fill="${a}"/>`,
    fork: (f, a) => `<path d="M12 8.4v3.2M12 11.6L6.8 15.6M12 11.6l5.2 4" stroke="${f}" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="12" cy="6.2" r="2.3" fill="${f}"/><circle cx="6.8" cy="17.8" r="2.3" fill="${a}" stroke="${f}" stroke-width="1.4"/><circle cx="17.2" cy="17.8" r="2.3" fill="${f}"/>`,
    plusminus: (f, a) => `<path d="M6 8.6h6.4M9.2 5.4v6.4M13.6 17.4h6" stroke="${f}" stroke-width="2.3" stroke-linecap="round"/><circle cx="17" cy="8.6" r="1.7" fill="${a}"/><circle cx="7.4" cy="17.4" r="1.7" fill="${a}"/>`,
    text: (f, a) => `<path d="M6.2 7.4h11.6M12 7.4V18" stroke="${f}" stroke-width="2.7" stroke-linecap="round" fill="none"/><circle cx="17.6" cy="16.8" r="1.9" fill="${a}"/>`,
    box: (f, a) => `<path d="M5.5 9.6L12 5.5l6.5 4.1v6.8L12 20.5l-6.5-4.1z" fill="${a}" stroke="${f}" stroke-width="1.8" stroke-linejoin="round"/><path d="M5.8 9.9l6.2 3.7 6.2-3.7M12 13.6v6.8" stroke="${f}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`,
  };

  const uri = (svg) => 'data:image/svg+xml,' + encodeURIComponent(svg);

  /* Icône ronde : un disque de couleur (bg) avec le dessin par-dessus. */
  function iconSvg(name, o) {
    const g = G[name];
    if (!g) throw new Error('Icône inconnue : ' + name);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">'
      + '<circle cx="12" cy="12" r="12" fill="' + o.bg + '"/>' + g(o.fg, o.acc) + '</svg>';
  }
  const blockIcon = (name, color) => uri(iconSvg(name, { bg: '#ffffff', fg: color, acc: '#FFC933' }));

  /* Règles CSS pour les icônes des catégories de la boîte à outils. */
  function categoryCss(list) {
    return list.map((c) => '.' + c.cls + '{background:url("' + uri(iconSvg(c.glyph, { bg: c.color, fg: '#ffffff', acc: '#FFE066' })) + '") center/contain no-repeat;}').join('\n')
      + '\n.blocklyToolboxCategoryIcon{display:inline-block!important;visibility:visible!important;width:26px;height:26px;margin-right:8px;vertical-align:middle;}';
  }

  /* Papier peint tout doux : lavis pastel, petits nuages, étincelles et pois à peine visibles. */
  function decorTile() {
    const cloud = (x, y, k, op) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')" fill="#ffffff" fill-opacity="' + op + '">'
      + '<circle cx="0" cy="0" r="14"/><circle cx="18" cy="-8" r="18"/><circle cx="38" cy="0" r="13"/>'
      + '<rect x="-14" y="-1" width="65" height="15" rx="7.500"/></g>';
    const spark = (x, y, k, fill) => '<path transform="translate(' + x + ' ' + y + ') scale(' + k + ')" fill="' + fill
      + '" d="M0-10Q1.500-1.500 10 0Q1.500 1.500 0 10Q-1.500 1.500-10 0Q-1.500-1.500 0-10z"/>';
    const dot = (x, y, r, fill) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '"/>';
    const ring = (x, y, r, c) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + c + '" stroke-width="2.500"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">'
      + cloud(46, 70, 1, 0.62)
      + cloud(214, 214, 0.8, 0.55)
      + spark(170, 52, 1, '#fff0bf') + spark(274, 112, 0.7, '#ffe6ea') + spark(86, 232, 0.8, '#e3dcff') + spark(300, 290, 0.6, '#fff0bf')
      + dot(120, 126, 4, '#ddd3fb') + dot(250, 40, 3, '#cfe6f8') + dot(30, 176, 3.500, '#ffdbe2') + dot(160, 286, 4, '#d3efe0')
      + dot(284, 196, 3, '#ddd3fb') + dot(100, 22, 2.500, '#ffe9b0')
      + ring(214, 90, 7, '#e3dcfa') + ring(60, 300, 6, '#d6ecf7')
      + '</svg>';
  }
  function decor(el) {
    el.style.backgroundColor = '#fbf8ff';
    el.style.backgroundImage = 'url("' + uri(decorTile()) + '"),'
      + 'radial-gradient(circle at 12% 8%, rgba(255,226,233,.75) 0, rgba(255,226,233,0) 42%),'
      + 'radial-gradient(circle at 92% 18%, rgba(222,236,255,.85) 0, rgba(222,236,255,0) 46%),'
      + 'radial-gradient(circle at 78% 94%, rgba(222,246,236,.8) 0, rgba(222,246,236,0) 44%),'
      + 'radial-gradient(circle at 8% 90%, rgba(255,240,214,.7) 0, rgba(255,240,214,0) 40%),'
      + 'linear-gradient(165deg, #fffaf6 0%, #f6f3ff 100%)';
    el.style.backgroundSize = '320px 320px, auto, auto, auto, auto, auto';
  }

  /* Confettis (désactivés si l'ordinateur demande moins d'animations). */
  const COLORS = ['#EF476F', '#FFC933', '#12B5A8', '#3D7BFF', '#8A5CF6', '#34B34A', '#F4631E', '#C84BC8'];
  function confetti() {
    if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = COLORS[i % COLORS.length];
      p.style.width = (6 + Math.random() * 7) + 'px';
      p.style.height = (8 + Math.random() * 9) + 'px';
      p.style.borderRadius = Math.random() < 0.3 ? '50%' : '2px';
      p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
      p.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      p.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3800);
  }

  root.ArduinoArt = { blockIcon: blockIcon, categoryCss: categoryCss, decor: decor, confetti: confetti, glyphs: Object.keys(G) };
})(typeof window !== 'undefined' ? window : globalThis);
