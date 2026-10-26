/* Réglages communs aux deux pages.
   Bloc « si » : la roue bleue (mini-éditeur) est remplacée par deux petits boutons directement sur le bloc :
   « + » ajoute d'abord un « sinon », puis des « sinon si » ; « − » retire le dernier ajouté. */
(function (root) {
  'use strict';
  const Blockly = root.Blockly;
  const svg = (inner, bg) => 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="9.300" fill="' + bg + '" stroke="#fff" stroke-width="1.400"/>' + inner + '</svg>');
  const PLUS = svg('<path d="M10 5.500v9M5.500 10h9" stroke="#fff" stroke-width="2.400" stroke-linecap="round"/>', '#34B34A');
  const MINUS = svg('<path d="M5.500 10h9" stroke="#fff" stroke-width="2.400" stroke-linecap="round"/>', '#EF476F');

  /* Écarte les blocs principaux (« au démarrage », « répéter indéfiniment »…) pour qu'ils ne se chevauchent pas :
     un bloc qui en recouvre un autre au-dessus de lui est poussé vers le bas. */
  function spread(ws, opts) {
    opts = opts || {};
    const gap = opts.gap || 36;
    if (!ws || !ws.rendered) return 0;
    const tops = ws.getTopBlocks(true);
    const placed = [];
    let moved = 0;
    for (const b of tops) {
      const r = b.getBoundingRectangle();
      let dy = 0, again = true, guard = 0;
      const canMove = !opts.hatsOnly || !b.previousConnection;
      while (again && canMove && guard++ < 50) {
        again = false;
        for (const p of placed) {
          const overlapX = r.left < p.right + 10 && r.right > p.left - 10;
          const overlapY = r.top + dy < p.bottom + gap && r.bottom + dy > p.top;
          if (overlapX && overlapY) { dy = p.bottom + gap - r.top; again = true; }
        }
      }
      if (dy > 0) { b.moveBy(0, dy); moved++; }
      placed.push({ left: r.left, right: r.right, top: r.top + dy, bottom: r.bottom + dy });
    }
    return moved;
  }
  /* Surveille l'espace de travail : quand « au démarrage » grandit, « répéter indéfiniment » descend. */
  function keepSpread(ws) {
    let t = null;
    ws.addChangeListener((e) => {
      if (e.isUiEvent || e.type === Blockly.Events.VIEWPORT_CHANGE) return;
      clearTimeout(t);
      t = setTimeout(() => { if (!ws.isDragging()) spread(ws, { hatsOnly: true }); }, 60);
    });
  }
  root.BlocksLayout = { spread: spread, keepSpread: keepSpread };

  const def = Blockly.Blocks.controls_if;
  if (!def || def.__plusButtons) return;
  const origInit = def.init;

  /* Change la forme du bloc en gardant les blocs déjà accrochés, et prévient l'espace de travail (annuler, code…). */
  function reshape(block, change) {
    if (block.isInFlyout || block.isDeadOrDying()) return;
    // même format que Blockly 10 pour l'annulation (Ctrl+Z) : l'état JSON du bloc
    const stateOf = () => { const st = block.saveExtraState(); return st ? JSON.stringify(st) : ''; };
    const before = stateOf();
    Blockly.Events.setGroup(true);
    try {
      change();
      block.rebuildShape_();
      const after = stateOf();
      if (before !== after) Blockly.Events.fire(new (Blockly.Events.get(Blockly.Events.BLOCK_CHANGE))(block, 'mutation', null, before, after));
      block.render();
      refreshButtons(block);
    } finally { Blockly.Events.setGroup(false); }
  }
  function refreshButtons(block) {
    if (block.getInput('BUTTONS')) block.moveInputBefore('BUTTONS', null);   // toujours sur la dernière ligne du bloc
    const minus = block.getField('IF_MINUS');
    if (minus) minus.setVisible(!!(block.elseifCount_ || block.elseCount_));
    if (block.rendered) block.render();
  }

  def.init = function () {
    origInit.call(this);
    this.setMutator(null);                       // plus de roue bleue
    const block = this;
    const plus = new Blockly.FieldImage(PLUS, 20, 20, '+', () => reshape(block, () => {
      if (!block.elseCount_) block.elseCount_ = 1;   // 1er appui : « sinon »
      else block.elseifCount_++;                     // appuis suivants : « sinon si »
    }));
    const minus = new Blockly.FieldImage(MINUS, 20, 20, '−', () => reshape(block, () => {
      if (block.elseifCount_) block.elseifCount_--;  // retire d'abord le dernier « sinon si »
      else block.elseCount_ = 0;                     // puis le « sinon »
    }));
    plus.setTooltip && plus.setTooltip('Ajouter « sinon », puis « sinon si »');
    minus.setTooltip && minus.setTooltip('Retirer le dernier « sinon si » ou le « sinon »');
    this.appendDummyInput('BUTTONS').appendField(plus, 'IF_PLUS').appendField(minus, 'IF_MINUS');
    minus.setVisible(false);
    /* après chargement d'un projet (« sinon » déjà présent…), le bouton « − » doit apparaître */
    const ol = this.loadExtraState, od = this.domToMutation;
    if (ol) this.loadExtraState = function (st) { ol.call(this, st); refreshButtons(this); };
    if (od) this.domToMutation = function (x) { od.call(this, x); refreshButtons(this); };
    this.setTooltip(() => 'Si la condition est vraie, les blocs de « faire » sont exécutés. Clique sur + pour ajouter « sinon », puis « sinon si ».');
  };
  def.__plusButtons = true;
})(typeof window !== 'undefined' ? window : globalThis);
