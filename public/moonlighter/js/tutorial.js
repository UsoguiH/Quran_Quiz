'use strict';
// ============================================================================
//  TUTORIAL: one short goal at a time in a small banner, with the right
//  button for the device and an arrow pointing where to go. Each step ticks
//  itself off when the player does it, so nothing needs to be read twice.
// ============================================================================

const inScene = cls => typeof cls !== 'undefined' && Game.scene instanceof cls;
// where the arrow points, per scene: [x, y] in world space
const shopDoorFromTown = () => inScene(TownScene) ? [200, 588] : null;
const TUT_STEPS = [
  { id: 'move', text: { touch: 'Drag on the left side to walk', key: 'Walk with {WASD}', pad: 'Walk with the left stick' }, done: t => t.moved > 70 },
  { id: 'roll', text: { any: 'Dodge-roll with {ROLL}' }, done: t => t.rolled },
  { id: 'gates', text: { any: 'Head north to the Gates' }, target: () => inScene(TownScene) ? [224, 116] : inScene(ShopScene) ? [192, 206] : null, done: () => inScene(DungeonScene) },
  { id: 'attack', text: { any: 'Attack with {X}' }, done: t => t.attacked },
  { id: 'fight', text: { any: 'Defeat the monsters' }, done: () => (inScene(DungeonScene) && Game.scene.kills >= 2) || S.stats.kills >= 2 },
  { id: 'loot', text: { any: 'Walk over the loot to pick it up' }, target: () => { const pk = inScene(DungeonScene) && Game.scene.pickups[0]; return pk ? [pk.x, pk.y] : null; }, done: () => S.bag.some(Boolean) },
  { id: 'home', text: { any: 'Hold {PENDANT} to go home with your loot' }, done: () => !inScene(DungeonScene) },
  { id: 'sleep', skip: () => S.phase === 'day' && !S.shopOpenedToday, text: { any: 'Night fell. Sleep in the bed in your shop' },
    target: () => shopDoorFromTown() || (inScene(ShopScene) ? [BED_POS.x + 12, BED_POS.y] : null), done: () => S.phase === 'day' && !S.shopOpenedToday },
  { id: 'table', text: { any: 'Put loot on a table and set a price' }, target: () => shopDoorFromTown() || (inScene(ShopScene) ? [TABLE_POS[0][0], TABLE_POS[0][1] + 10] : null),
    done: () => S.shelves.some(t => t && t.item) },
  { id: 'open', text: { any: 'Open the shop at the register' }, target: () => shopDoorFromTown() || (inScene(ShopScene) ? [REG_SPOT.x, REG_SPOT.y] : null),
    done: () => (inScene(ShopScene) && Game.scene.open) || S.stats.sold > (S.tut.sold0 || 0) },
  { id: 'sell', text: { any: 'Charge customers at the register with {A}' }, target: () => inScene(ShopScene) && Game.scene.customers.some(c => c.state === 'queue') ? [REG_SPOT.x, REG_SPOT.y] : null,
    done: () => S.stats.sold > (S.tut.sold0 || 0) },
  { id: 'faces', text: { any: 'Watch faces: a grin means cheap, a frown means pricey' }, done: t => t.stepT > 7 },
];

const Tutorial = {
  moved: 0, rolled: false, attacked: false, stepT: 0, doneT: 0, doneText: '', lx: null, ly: null, lsc: null,
  active() { return !!(S && S.tut && !S.tut.done && OPTS.tutorial !== false); },
  visible() {
    const sc = Game.scene;
    return this.active() && sc && sc.player && !sc.cinematic && !UI.blocking() && !Game.fadeDir
      && !inScene(Cutscene) && !inScene(TitleScene) && !inScene(SlotScene);
  },
  textFor(step) {
    const dev = Input.device();
    return step.text[dev] || step.text.any || step.text.key;
  },
  update(dt) {
    if (!S) return;
    // older saves that are clearly past the basics skip the tutorial
    if (!S.tut) S.tut = S.day > 1 || S.stats.sold > 0 || S.stats.runs > 0 ? { done: true } : { i: 0 };
    this.doneT = Math.max(0, this.doneT - dt);
    if (!this.visible()) return;
    const sc = Game.scene, p = sc.player;
    if (this.lsc === sc && this.lx !== null) this.moved += Math.min(8, Math.hypot(p.x - this.lx, p.y - this.ly));
    this.lx = p.x; this.ly = p.y; this.lsc = sc;
    if (p.state === 'roll') this.rolled = true;
    if (p.state === 'attack' && inScene(DungeonScene)) this.attacked = true;
    this.stepT += dt;
    const T = S.tut;
    for (let guard = 0; guard < TUT_STEPS.length; guard++) {
      const step = TUT_STEPS[T.i];
      if (!step) break;
      if (step.id === 'open' && T.sold0 === undefined) T.sold0 = S.stats.sold;
      const skip = step.skip && step.skip();
      if (!skip && !step.done(this)) break;
      if (!skip) { this.doneT = 0.9; this.doneText = this.textFor(step).replace(/\{\w+\}/g, '').replace(/\s+/g, ' ').trim(); sfx('pickup'); }
      T.i++; this.stepT = 0;
    }
    if (T.i >= TUT_STEPS.length) { T.done = true; toast('Tutorial complete! The shop is yours.', C.mint); saveGame(); }
  },
  // text with {BUTTON} tokens -> [str | {b}] segments
  segments(s) { return s.split(/(\{\w+\})/).filter(Boolean).map(p => /^\{\w+\}$/.test(p) ? { b: p.slice(1, -1) } : p); },
  measure(segs) {
    let w = 0;
    for (const sg of segs) {
      if (typeof sg === 'string') w += textW(sg, 7);
      else { ctx.save(); ctx.globalAlpha = 0; w += btnGlyph(-50, -50, sg.b) + 2; ctx.restore(); }
    }
    return w;
  },
  draw() {
    const finished = this.doneT > 0 && S && S.tut && S.tut.done && Game.scene && Game.scene.player && !UI.blocking();
    if (!this.visible() && !finished) return;
    const T = S.tut, step = TUT_STEPS[T.i];
    const sc = Game.scene;
    // arrow toward the goal
    if (step && step.target && this.doneT <= 0) {
      const tg = step.target();
      if (tg) {
        const ox = sc.cam ? Math.round(sc.cam.x) : 0, oy = sc.cam ? Math.round(sc.cam.y) : 0;
        this.arrow(tg[0] - ox, tg[1] - oy);
      }
    }
    // banner
    const done = this.doneT > 0;
    const segs = done ? [this.doneText] : this.segments(this.textFor(step));
    const tw = this.measure(segs), w = tw + 28, h = 15;
    const shopOpen = inScene(ShopScene) && sc.open;
    const x = Math.round(W / 2 - w / 2), y = shopOpen ? 36 : 26;
    const slide = done ? 0 : Math.round(Math.max(0, 1 - this.stepT / 0.25) * -8);
    ctx.save(); ctx.translate(0, slide); if (!done) ctx.globalAlpha = clamp(this.stepT / 0.25, 0, 1);
    R(ctx, x + 2, y, w - 4, h, TB.rim); R(ctx, x, y + 2, w, h - 4, TB.rim); R(ctx, x + 1, y + 1, w - 2, h - 2, TB.rim);
    R(ctx, x + 2, y + 1, w - 4, h - 2, TB.goldLo); R(ctx, x + 1, y + 2, w - 2, h - 4, TB.goldLo); R(ctx, x + 2, y + 1, w - 4, 1, TB.goldHi);
    R(ctx, x + 2, y + 2, w - 4, h - 4, done ? TB.use[1] : TB.slate[1]);
    // step badge
    ell(ctx, x + 2, y + 1, 13, 13, TB.rim); ell(ctx, x + 3, y + 2, 11, 11, done ? '#5cc04a' : TB.gold);
    if (done) ctx.drawImage(tIcon('check'), x + 3, y + 3);
    else txt(String(T.i + 1), x + 8.5, y + 10.5, { size: 7, align: 'center', color: '#2a1a14', bold: true });
    let cx = x + 19;
    for (const sg of segs) {
      if (typeof sg === 'string') { txt(sg, cx, y + 11, { size: 7, color: '#f3eedb' }); cx += textW(sg, 7); }
      else cx += btnGlyph(cx + 1, y + 12, sg.b) + 2;
    }
    ctx.restore();
  },
  arrow(sx, sy) {
    const m = 14, onScreen = sx > m && sx < W - m && sy > 44 && sy < H - m;
    const bounce = Math.round(Math.abs(Math.sin(Game.time * 5)) * 4);
    const img = cached('tutArrow', () => sprite(11, 10, g => {
      R(g, 3, 0, 5, 4, '#f4d49a'); R(g, 3, 0, 2, 4, '#fff0c0');
      for (let j = 0; j < 6; j++) R(g, j, 4 + j, 11 - j * 2, 1, j === 0 ? '#e8b84a' : '#d8a458');
    }, '#2a1a14'));
    if (onScreen) { ctx.drawImage(img, Math.round(sx - img.width / 2), Math.round(sy - 34 - bounce)); return; }
    // off screen: pin to the edge and point toward it
    const cx = clamp(sx, m + 4, W - m - 4), cy = clamp(sy, 50, H - m - 4);
    const a = Math.atan2(sy - cy, sx - cx) - Math.PI / 2;
    ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.rotate(a); ctx.translate(0, bounce - 2);
    ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2)); ctx.restore();
  },
};
