'use strict';
// ============================================================================
//  ITEM UIs: inventory book, notebook, storage chest, table pricing, forge,
//  potion shop and the town board (investments).
// ============================================================================

function tabsHeader(labels, active, cx, y, owner, onTap) {
  const w = 44 * labels.length;
  let x = cx - w / 2;
  labels.forEach((l, i) => {
    const on = i === active;
    if (owner) { const xx = x; hit(owner, xx, y - 2, 42, 18, () => { sfx('move'); onTap(i); }); }
    R(ctx, x, y, 42, 14, on ? C.teal3 : '#2a2a30'); R(ctx, x + 1, y + 1, 40, 12, on ? C.teal : '#4a4a55');
    txt(l, x + 21, y + 10, { size: 6, align: 'center', color: on ? '#fff' : '#b8b8c8' });
    x += 44;
  });
  btnGlyph(cx - w / 2 - 16, y + 10, 'LB', true); btnGlyph(cx + w / 2 + 4, y + 10, 'RB', true);
}
function statsTab(x, y, st, extra) {
  R(ctx, x, y, 38, 84, C.teal3); R(ctx, x + 1, y + 1, 36, 82, C.teal);
  const rows = [['hp', st.maxHp], ['dmg', st.dmg(S.equip.w[S.equip.active] || 'sword') | 0], ['def', st.def], ['spd', 100 + st.spd]];
  rows.forEach(([k, v], i) => {
    const yy = y + 6 + i * 19;
    ell(ctx, x + 3, yy, 13, 13, C.teal3); ctx.drawImage(statIcon(k), x + 6, yy + 3);
    txt(v, x + 34, yy + 10, { size: 7, align: 'right', color: '#fff' });
  });
}

// ---------------------------------------------------------------- inventory
class InventoryUI extends GridUI {
  constructor(o = {}) {
    super(); this.o = o;
    const bx = 76, by = 40;
    this.cells = bagCells(bx, by, 18, 2);
    const ex = (k, x, y, extra = {}) => this.cells.push({ x, y, w: 18, h: 18, kind: k, ...extra });
    ex('w0', 214, 36); ex('w1', 256, 36);
    ex('helm', 206, 64); ex('chest', 206, 86); ex('boots', 206, 108);
    for (let t = 0; t < 4; t++) ex('pot' + t, 214 + t * 22, 138);
    this.cells.push({ x: 92, y: 128, w: 26, h: 26, kind: 'pendant' });
    this.cells.push({ x: 138, y: 128, w: 26, h: 26, kind: 'mirror', get: () => null, set: () => { }, accept: v => this.o.inDungeon && !v.gear, noAuto: true });
  }
  update(dt) {
    super.update(dt);
    if (tapHits(this)) return;
    this.navigate();
    const tA = this.tapA();
    const c = this.cell();
    if (Input.pressed('A') || tA) {
      if (c.kind === 'bag') this.grab(true);
      else if (c.kind === 'w0' || c.kind === 'w1') this.cycleWeapon(c.kind === 'w0' ? 0 : 1);
      else if (c.kind === 'mirror') this.dissolve();
      else if (c.kind === 'pendant') {
        if (this.o.inDungeon) { const sc = this.o.scene; ask(`Use the merchant pendant for ${fmt(sc.d.pendantCost)} gold and return to town with your bag?`, () => { this.returnHeld(); this.close(); sc.usePendant(); }); }
        else say(['Your merchant pendant. Hold HOME in the dungeon to return to town with all your loot, for a price.']);
      }
    }
    if (Input.pressed('X') && c.kind === 'bag') this.grab(false);
    if (Input.pressed('Y')) { this.returnHeld(); sortBag(); sfx('select'); }
    if (Input.pressed('LB') || Input.pressed('RB')) { this.returnHeld(); this.close(); UI.open(new NotebookUI(this.o)); return; }
    if (Input.pressed('B') || Input.pressed('SELECT')) { if (this.held) { this.returnHeld(); sfx('cancel'); } else { sfx('cancel'); this.close(); } }
  }
  dissolve() {
    if (!this.o.inDungeon) { say(['The merchant mirror only works in the depths of a dungeon: it turns items into gold on the spot.']); return; }
    if (!this.held) { toast('Grab an item and drop it on the mirror to turn it into gold'); return; }
    const it = this.held, g = Math.max(1, Math.floor(ITEMS[it.id].value * it.n * 0.3));
    ask(`Dissolve ${it.n}x ${ITEMS[it.id].name} into ${fmt(g)} gold?`, () => { this.held = null; S.gold += g; sfx('coin'); });
  }
  cycleWeapon(slot) {
    const owned = Object.keys(WEAPON_LINES).filter(l => S.gear[l] >= 0 && l !== S.equip.w[slot ^ 1]);
    if (slot === 1) owned.push(null);
    if (!owned.length) return;
    const cur = owned.indexOf(S.equip.w[slot] || null);
    S.equip.w[slot] = owned[(cur + 1) % owned.length];
    if (!S.equip.w[0]) S.equip.w[0] = 'sword';
    if (!S.equip.w[S.equip.active]) S.equip.active = 0;
    sfx('select');
  }
  hoverStack() {
    const c = this.cell();
    if (c.kind === 'bag') return c.get();
    if (c.kind === 'w0' || c.kind === 'w1') { const l = S.equip.w[c.kind === 'w0' ? 0 : 1]; return l ? { gear: WEAPON_LINES[l].icon, tier: S.gear[l], line: l } : null; }
    if (['helm', 'chest', 'boots'].includes(c.kind)) return S.gear[c.kind] >= 0 ? { gear: c.kind, tier: S.gear[c.kind], line: c.kind } : null;
    if (c.kind.startsWith('pot')) { const t = +c.kind[3]; return S.potions[t] ? { potion: t, n: S.potions[t] } : null; }
    return null;
  }
  draw() {
    this.hits = [];
    dimScreen(0.55);
    tabsHeader(['Inventory', 'Notebook'], 0, W / 2, 4, this, i => { if (i === 1) { this.returnHeld(); this.close(); UI.open(new NotebookUI(this.o)); } });
    bookSpread(60, 26, 264, 162);
    drawBagGrid(76, 40, 18, 2);
    // pendant & mirror
    const circ = (x, y, fill, label) => { ell(ctx, x, y, 26, 26, C.paper3); ell(ctx, x + 2, y + 2, 22, 22, fill); txt(label, x + 13, y + 34, { size: 6, align: 'center', color: C.paperInk }); };
    circ(92, 128, '#e6d7b2', 'Pendant'); R(ctx, 104, 132, 2, 5, '#8a6a4a'); ell(ctx, 99, 136, 12, 12, C.teal); ell(ctx, 102, 139, 6, 6, C.mint);
    circ(138, 128, '#d8e8e8', 'Mirror'); ell(ctx, 143, 133, 16, 16, '#a8c8d8'); R(ctx, 147, 136, 3, 6, '#ffffff');
    if (this.o.inDungeon) txt(fmt(this.o.scene.d.pendantCost), 105, 169, { size: 6, align: 'center', color: C.gold2 });
    // equipment page
    const slot = (x, y, it, label) => { slotBox(x, y, 18); if (it) drawStack(it, x + 1, y + 1, 16); else if (label) txt(label, x + 9, y + 12, { size: 5, align: 'center', color: C.paper3 }); };
    const wl = S.equip.w;
    slot(214, 36, wl[0] && { gear: WEAPON_LINES[wl[0]].icon, tier: S.gear[wl[0]] });
    slot(256, 36, wl[1] && { gear: WEAPON_LINES[wl[1]].icon, tier: S.gear[wl[1]] }, 'W2');
    txt('⇄', 244, 49, { size: 8, align: 'center', color: C.teal2 }); if (S.equip.active === 0) R(ctx, 214, 56, 18, 2, C.teal); else R(ctx, 256, 56, 18, 2, C.teal);
    ['helm', 'chest', 'boots'].forEach((k, i) => slot(206, 64 + i * 22, S.gear[k] >= 0 && { gear: k, tier: S.gear[k] }, k.toUpperCase()));
    R(ctx, 232, 64, 58, 64, '#e6d7b2'); R(ctx, 233, 65, 56, 62, '#efe6cc');
    { const hp = heroPortrait(); ctx.drawImage(hp, 261 - hp.width / 2, 68); }
    for (let t = 0; t < 4; t++) {
      slotBox(214 + t * 22, 138, 18);
      if (S.potions[t]) drawStack({ potion: t, n: S.potions[t] }, 215 + t * 22, 139, 16);
      else { ctx.globalAlpha = 0.25; ctx.drawImage(potionIcon(t), 216 + t * 22, 140); ctx.globalAlpha = 1; }
    }
    txt('Potions', 257, 166, { size: 6, align: 'center', color: C.paperInk });
    statsTab(326, 56, playerStats());
    this.drawCursor(); this.drawHeld();
    // info
    const h = this.held || this.hoverStack();
    if (h) {
      let name = h.potion !== undefined ? POTIONS[h.potion].name : h.gear ? (WEAPON_LINES[h.line] || ARMOR_LINES[h.line] || { names: [] }).names[h.tier] : itemName(h);
      nameTag(name, W / 2, 190);
      const lines = h.potion !== undefined ? [POTIONS[h.potion].desc] : h.gear ? [WEAPON_LINES[h.line] ? WEAPON_LINES[h.line].desc : 'Armor: more health and defense.'] : itemInfoLines(h);
    }
    const c = this.cell();
    const pr = [['A', c.kind === 'bag' ? (this.held ? 'Place' : 'Grab') : c.kind.startsWith('w') ? 'Change' : 'Use'], ['X', 'Grab one'], ['Y', 'Sort'], ['B', this.held ? 'Drop' : 'Close']];
    promptBar(pr, H - 4);
    // tooltip panel on the right page bottom
    if (h && !h.gear && h.potion === undefined && ITEMS[h.id]) {
      const lines = wrapText(itemInfoLines(h).join(' '), 118, 6).slice(0, 3);
      R(ctx, 196, 160, 120, lines.length * 7 + 5, '#efe6cc');
      lines.forEach((l, i) => txt(l, 199, 166 + i * 7, { size: 6, color: C.paperDark }));
    }
  }
}
function sortBag() {
  const rest = S.bag.slice(5).filter(Boolean);
  mergeStacks(rest);
  rest.sort((a, b) => ITEMS[b.id].value - ITEMS[a.id].value);
  const edge = rest.filter(i => i.curse === 'edge'), other = rest.filter(i => i.curse !== 'edge');
  const out = Array(15).fill(null);
  // edge-cursed items go to the side columns first
  let ei = 0;
  for (let i = 0; i < 15 && ei < edge.length; i++) if (i % 5 === 0 || i % 5 === 4) out[i] = edge[ei++];
  let oi = 0;
  for (let i = 0; i < 15 && oi < other.length; i++) if (!out[i]) out[i] = other[oi++];
  // anything that didn't fit stays (shouldn't happen)
  for (let i = 0; i < 15; i++) S.bag[5 + i] = out[i];
}
function mergeStacks(arr) {
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    const a = arr[i], b = arr[j];
    if (!a || !b || a.id !== b.id || (a.curse || null) !== (b.curse || null)) continue;
    const cap = ITEMS[a.id].stack, mv = Math.min(cap - a.n, b.n);
    a.n += mv; b.n -= mv; if (b.n <= 0) arr[j] = null;
  }
  for (let i = arr.length - 1; i >= 0; i--) if (!arr[i]) arr.splice(i, 1);
}

// ---------------------------------------------------------------- notebook
class NotebookUI extends Overlay {
  constructor(o = {}) { super(); this.o = o; this.tab = 0; this.sel = 0; }
  list() { return ITEM_ORDER.filter(id => ITEMS[id].dungeon === this.tab); }
  update(dt) {
    super.update(dt);
    if (tapHits(this)) return;
    const L = this.list(), d = Input.dir();
    if (d === 'U') { this.sel = (this.sel + L.length - 1) % L.length; sfx('move'); }
    if (d === 'D') { this.sel = (this.sel + 1) % L.length; sfx('move'); }
    if (d === 'L' || d === 'R') { this.tab = (this.tab + (d === 'L' ? 3 : 1)) % 4; this.sel = 0; sfx('move'); }
    if (Input.pressed('LB') || Input.pressed('RB')) { this.close(); UI.open(new InventoryUI(this.o)); return; }
    if (Input.pressed('B') || Input.pressed('SELECT')) { sfx('cancel'); this.close(); }
  }
  draw() {
    this.hits = [];
    dimScreen(0.55);
    tabsHeader(['Inventory', 'Notebook'], 1, W / 2, 4, this, i => { if (i === 0) { this.close(); UI.open(new InventoryUI(this.o)); } });
    bookSpread(60, 26, 264, 162);
    // dungeon tabs sticking out of the top of the book
    DUNGEONS.forEach((d, i) => { const x = 74 + i * 24; hit(this, x, 16, 22, 14, () => { this.tab = i; this.sel = 0; sfx('move'); }); R(ctx, x, 20 + (i === this.tab ? 0 : 3), 20, 8, d.color); if (i === this.tab) R(ctx, x, 26, 20, 2, shade(d.color, 0.3)); });
    const L = this.list(), per = 5, page = Math.floor(this.sel / per), pages = Math.ceil(L.length / per);
    txt(DUNGEONS[this.tab].name, 124, 40, { size: 7, align: 'center', color: C.tealText, bold: true });
    L.slice(page * per, page * per + per).forEach((id, k) => {
      const i = page * per + k, y = 48 + k * 24, it = ITEMS[id], known = S.notes[id];
      hit(this, 66, y, 120, 23, () => { this.sel = i; sfx('move'); });
      txt(ITEM_ORDER.indexOf(id) + 1, 70, y + 12, { size: 5, color: C.paperInk });
      slotBox(80, y, 20, { fill: '#efe6cc' });
      if (known) ctx.drawImage(itemIcon(id), 81 + (18 - itemIcon(id).width) / 2, y + 1 + (18 - itemIcon(id).height) / 2);
      else { ctx.globalAlpha = 0.35; ctx.drawImage(whiteOf(itemIcon(id), C.paperInk), 81 + (18 - itemIcon(id).width) / 2, y + 2); ctx.globalAlpha = 1; }
      txt(known ? it.name : '???', 106, y + 13, { size: 7, color: i === this.sel ? C.tealText : C.paperDark });
      if (i === this.sel) selBrackets(80, y, 20, this.t);
      R(ctx, 70, y + 22, 112, 1, C.paperLine);
    });
    txt(`${page + 1}/${pages}`, 124, 182, { size: 6, align: 'center', color: C.paperInk });
    // right page: details
    const id = L[this.sel], it = ITEMS[id], nb = S.notes[id];
    const cx = 258;
    ell(ctx, cx - 16, 32, 32, 32, C.teal); ell(ctx, cx - 13, 35, 26, 26, C.mint2);
    if (nb) ctx.drawImage(itemIcon(id), cx - 7, 41); else txt('?', cx, 52, { size: 10, align: 'center', color: C.teal3 });
    R(ctx, 198, 70, 120, 104, '#bfe8d4'); R(ctx, 199, 71, 118, 102, '#d6f2e4');
    txt('Selling and Reactions', 204, 80, { size: 6, color: C.tealText });
    ['ecstatic', 'content', 'expensive', 'angry'].forEach((f, i) => {
      const x = 204 + i * 28;
      R(ctx, x, 84, 24, 9, '#efe6cc'); txt(nb && nb.r[f] ? fmt(nb.r[f]) : '????', x + 12, 91, { size: 6, align: 'center', color: C.paperDark });
      ctx.drawImage(faceIcon(f), x + 5, 96);
    });
    txt('Popularity', 204, 118, { size: 6, color: C.tealText });
    const pl = nb ? popLabel(id) : '';
    ['Low', 'Neutral', 'High'].forEach((l, i) => { R(ctx, 204 + i * 36, 121, 34, 7, pl === l ? C.teal : '#a8d8c0'); if (pl === l) txt(l, 221 + i * 36, 127, { size: 5, align: 'center', color: '#fff' }); });
    R(ctx, 202, 132, 112, 38, '#efe6cc');
    const desc = nb ? it.desc + (nb.sold ? ` Sold: ${nb.sold}.` : '') : 'You have not found this item yet.';
    wrapText(desc, 106, 6).slice(0, 5).forEach((l, i) => txt(l, 205, 139 + i * 7, { size: 6, color: C.paperDark }));
    if (nb) txt(it.name, cx, 180, { size: 7, align: 'center', color: C.paperDark });
    promptBar([['◀▶', 'Dungeon'], ['LB', 'Inventory'], ['B', 'Close']], H - 4);
  }
}

// ---------------------------------------------------------------- storage chest
class ChestUI extends GridUI {
  constructor() {
    super();
    this.cells = bagCells(62, 60, 18, 2);
    for (let i = 0; i < 40; i++) {
      const col = i % 8, row = (i / 8) | 0;
      this.cells.push({ x: 196 + col * 20, y: 50 + row * 20, w: 18, h: 18, kind: 'chest', idx: i, get: () => S.chest[i], set: v => { S.chest[i] = v; }, accept: v => !v.gear && canPlaceAt(S.chest, i, v, 8) });
    }
  }
  quickMove(c) {
    const it = c.get(); if (!it) return;
    const dest = c.kind === 'bag' ? this.cells.filter(x => x.kind === 'chest') : this.cells.filter(x => x.kind === 'bag');
    let left = it.n;
    for (const d of dest) { const di = d.get(); if (di && di.id === it.id && (di.curse || null) === (it.curse || null) && di.n < ITEMS[it.id].stack) { const mv = Math.min(left, ITEMS[it.id].stack - di.n); di.n += mv; left -= mv; if (!left) break; } }
    if (left) for (const d of dest) { if (!d.get() && d.accept({ ...it })) { d.set({ ...it, n: left }); left = 0; break; } }
    if (left === it.n) { sfx('error'); return; }
    if (left) { it.n = left; c.set(it); } else c.set(null);
    sfx('select');
  }
  update(dt) {
    super.update(dt);
    this.navigate();
    const tA = this.tapA();
    const c = this.cell();
    if (Input.pressed('A') || tA) this.grab(true);
    if (Input.pressed('X')) this.grab(false);
    if (Input.pressed('RB') && !this.held) this.quickMove(c);
    if (Input.pressed('LB') && !this.held) { for (const cc of this.cells) if (cc.kind === 'bag' && cc.idx >= 5 && cc.get()) this.quickMove(cc); }
    if (Input.pressed('Y')) { this.returnHeld(); const all = S.chest.filter(Boolean); mergeStacks(all); all.sort((a, b) => ITEMS[b.id].value - ITEMS[a.id].value); S.chest = all.concat(Array(40 - all.length).fill(null)); sfx('select'); }
    if (Input.pressed('B')) { if (this.held) { this.returnHeld(); sfx('cancel'); } else { sfx('cancel'); this.close(); } }
  }
  draw() {
    dimScreen(0.5);
    paperPanel(48, 46, 124, 96);
    drawBagGrid(62, 60, 18, 2);
    // chest body
    R(ctx, 186, 30, 180, 128, '#2a3024'); R(ctx, 188, 32, 176, 124, '#4a5a3a'); R(ctx, 188, 32, 176, 12, '#5e6e4a');
    R(ctx, 190, 44, 172, 110, '#3a4a2e');
    for (let i = 0; i < 40; i++) {
      const col = i % 8, row = (i / 8) | 0, x = 196 + col * 20, y = 50 + row * 20;
      R(ctx, x, y, 18, 18, '#2a3a22'); R(ctx, x + 1, y + 1, 16, 16, '#4a5a3a');
      if (S.chest[i]) drawStack(S.chest[i], x + 1, y + 1, 16);
    }
    this.drawCursor(); this.drawHeld();
    const h = this.held || (this.cell().get && this.cell().get());
    nameTag(h ? itemName(h) : 'Storage', 276, 162);
    promptBar([['A', 'Grab/Place'], ['X', 'Grab one'], ['RB', 'Quick Move'], ['LB', 'Move All'], ['Y', 'Sort'], ['B', 'Back']], H - 4);
  }
}

// ---------------------------------------------------------------- tables & prices
class ShelfUI extends GridUI {
  constructor(focus = 0) {
    super();
    this.page = 0; // 0 bag, 1 chest 1-20, 2 chest 21-40
    this.n = tableCount();
    this.buildCells();
    this.cur = 20 + focus;
  }
  srcArr() { return this.page === 0 ? S.bag : S.chest; }
  srcOff() { return this.page === 2 ? 20 : 0; }
  panelRect(i) {
    const rows = Math.ceil(this.n / 2), ph = Math.min(76, Math.floor(150 / rows) - 4);
    return { x: 190 + (i % 2) * 94, y: 30 + Math.floor(i / 2) * (ph + 4), w: 90, h: ph };
  }
  buildCells() {
    this.cells = [];
    for (let i = 0; i < 20; i++) {
      const col = i % 5, row = (i / 5) | 0;
      this.cells.push({
        x: 64 + col * 20, y: 52 + row * 20, w: 18, h: 18, kind: 'src', idx: i,
        get: () => this.srcArr()[this.srcOff() + i], set: v => { this.srcArr()[this.srcOff() + i] = v; },
        accept: v => !v.gear && canPlaceAt(this.srcArr(), this.srcOff() + i, v, this.page === 0 ? 5 : 8),
      });
    }
    for (let i = 0; i < this.n; i++) {
      const r = this.panelRect(i);
      const small = r.h < 50;
      this.cells.push({
        x: r.x + (small ? 4 : 37), y: r.y + (small ? (r.h - 18) / 2 | 0 : 6), w: 18, h: 18, kind: 'table', idx: i,
        get: () => S.shelves[i].item, set: v => { const had = S.shelves[i].item; S.shelves[i].item = v; if (v && (!had || had.id !== v.id)) this.onPlaced(i); },
        accept: v => !v.gear,
      });
    }
  }
  onPlaced(i) {
    const sh = S.shelves[i], id = sh.item.id, nb = S.notes[id];
    noteSeen(id);
    let p = S.lastPrice[id];
    if (nb && nb.r.content) p = nb.r.content;
    sh.price = p || sh.price || 10;
    UI.open(new PriceUI(i, { fresh: true }));
  }
  update(dt) {
    super.update(dt);
    if (tapHits(this)) return;
    this.navigate();
    const tA = this.tapA();
    const c = this.cell();
    if (tA && c.kind === 'table' && !this.held && S.shelves[c.idx].item && this.lastTap === c) { UI.open(new PriceUI(c.idx)); sfx('select'); this.lastTap = null; return; }
    if (tA) this.lastTap = c;
    if (Input.pressed('A') || (tA && !(c.kind === 'table' && !this.held && S.shelves[c.idx].item))) this.grab(true);
    if (Input.pressed('X')) this.grab(false);
    if (Input.pressed('Y') && c.kind === 'table' && S.shelves[c.idx].item) { UI.open(new PriceUI(c.idx)); sfx('select'); return; }
    if (Input.pressed('LB') || Input.pressed('RB')) { this.page = (this.page + (Input.pressed('LB') ? 2 : 1)) % 3; sfx('move'); }
    if (Input.pressed('B')) { if (this.held) { this.returnHeld(); sfx('cancel'); } else { sfx('cancel'); this.close(); } }
  }
  draw() {
    this.hits = [];
    dimScreen(0.5);
    // source page (bag / chest)
    paperPanel(50, 34, 120, 128);
    const names = ['Bag', 'Chest I', 'Chest II'];
    tabsHeader(names, this.page, 110, 20, this, i => { this.page = i; });
    const arr = this.srcArr(), off = this.srcOff();
    for (let i = 0; i < 20; i++) { const col = i % 5, row = (i / 5) | 0, x = 64 + col * 20, y = 52 + row * 20; slotBox(x, y, 18, { safe: this.page === 0 && row === 0 }); if (arr[off + i]) drawStack(arr[off + i], x + 1, y + 1, 16); }
    txt(this.page === 0 ? 'Your bag' : 'Storage chest', 110, 146, { size: 6, align: 'center', color: C.paperInk });
    // table panels (wooden, like the reference)
    for (let i = 0; i < this.n; i++) {
      const r = this.panelRect(i), sh = S.shelves[i], small = r.h < 50;
      woodPanel(r.x, r.y, r.w, r.h);
      const cell = this.cells[20 + i];
      R(ctx, cell.x - 1, cell.y - 1, 20, 20, '#5e2f1d'); R(ctx, cell.x, cell.y, 18, 18, '#d98b52');
      if (sh.item) drawStack(sh.item, cell.x + 1, cell.y + 1, 16);
      // price box
      const bx = small ? r.x + 26 : r.x + 6, by = small ? r.y + 4 : r.y + r.h - 32, bw = small ? 60 : 78;
      R(ctx, bx, by, bw, small ? 11 : 12, '#1b1420'); R(ctx, bx + 1, by + 1, bw - 2, small ? 9 : 10, '#f4ecd6');
      const ps = String(sh.price | 0).padStart(7, '0');
      for (let k = 0; k < 7; k++) {
        const dx = bx + 4 + k * (small ? 6.5 : 7.5);
        const lead = ps.slice(0, k + 1).split('').every(ch => ch === '0') && k < 6;
        txt(ps[k], dx + 2, by + (small ? 8.5 : 9), { size: 7, align: 'center', color: lead ? '#c8bca0' : '#3a2e20' });
      }
      // tap the price to change it
      if (sh.item) hit(this, bx - 2, by - 3, bw + 4, (small ? 11 : 12) + 6, () => { if (!this.held) { UI.open(new PriceUI(i)); sfx('select'); } });
      const tot = sh.item ? sh.price * sh.item.n : 0;
      if (small) {
        txt(`x${sh.item ? sh.item.n : 0}  Total: ${fmt(tot)}`, r.x + 26, r.y + r.h - 5, { size: 6, color: '#fff', outline: C.wood4 });
      } else {
        txt(`x${sh.item ? sh.item.n : 0}`, r.x + r.w - 8, by - 3, { size: 6, align: 'right', color: '#fff', outline: C.wood4 });
        R(ctx, r.x + 4, r.y + r.h - 16, r.w - 8, 11, C.teal3); R(ctx, r.x + 5, r.y + r.h - 15, r.w - 10, 9, C.teal);
        txt('Total:', r.x + 8, r.y + r.h - 8, { size: 6, color: '#fff' }); txt(fmt(tot), r.x + r.w - 14, r.y + r.h - 8, { size: 6, align: 'right', color: '#fff' }); ctx.drawImage(coinIcon(), r.x + r.w - 12, r.y + r.h - 14);
      }
    }
    this.drawCursor(); this.drawHeld();
    // info strip: notebook knowledge of the item under the cursor
    const c = this.cell(), h = this.held || (c.get && c.get());
    if (h && ITEMS[h.id]) {
      nameTag(ITEMS[h.id].name, 110, 168);
      const nb = S.notes[h.id];
      const x0 = 56;
      ['ecstatic', 'content', 'expensive', 'angry'].forEach((f, i) => { ctx.drawImage(faceIcon(f), x0 + i * 30, 182); txt(nb && nb.r[f] ? fmt(nb.r[f]) : '?', x0 + i * 30 + 14, 191, { size: 6, color: '#efe3c5' }); });
      txt(`Popularity: ${popLabel(h.id)}`, 176, 191, { size: 6, color: '#efe3c5' });
    }
    promptBar([['A', this.held ? 'Place' : 'Grab'], ['X', 'Grab one'], ['Y', 'Set price'], ['LB', 'Bag/Chest'], ['B', 'Back']], H - 4);
  }
}

// ---------------------------------------------------------------- price panel (opens when an item is placed on a table)
// Big +/- buttons with hold-to-repeat, percent steps, and the notebook's
// known reactions as one-tap prices: easy with a thumb, quick with keys.
class PriceUI extends Overlay {
  constructor(i, o = {}) {
    super(); this.i = i; this.sh = S.shelves[i]; this.orig = this.sh.price; this.fresh = !!o.fresh;
    this.bump = 0; this.hold = null; this.holdT = 0; this.repT = 0;
  }
  set(v) {
    v = clamp(Math.round(v), 1, 9999999);
    if (v !== this.sh.price) { this.sh.price = v; this.bump = 0.12; sfx('move'); }
  }
  step(k) { const p = this.sh.price; this.set(p + k); }
  pct(f) { const p = this.sh.price, n = Math.round(p * f); this.set(n === p ? p + Math.sign(f - 1) : n); }
  layout() {
    const x = 72, y = 16, w = 240;
    const bw = 50, gap = 5, bx = x + (w - (bw * 4 + gap * 3)) / 2;
    const b = (i, row, label, fn, rep) => ({ x: bx + i * (bw + gap), y: y + 84 + row * 25, w: bw, h: 20, label, fn, rep });
    return {
      x, y, w, h: 180,
      buttons: [
        b(0, 0, '-10', () => this.step(-10), true), b(1, 0, '-1', () => this.step(-1), true), b(2, 0, '+1', () => this.step(1), true), b(3, 0, '+10', () => this.step(10), true),
        b(0, 1, 'Half', () => this.pct(0.5), false), b(1, 1, '-10%', () => this.pct(0.9), true), b(2, 1, '+10%', () => this.pct(1.1), true), b(3, 1, 'Double', () => this.pct(2), false),
      ],
    };
  }
  done() { S.lastPrice[this.sh.item.id] = this.sh.price; sfx('confirm'); this.close(); }
  cancel() { if (!this.fresh) this.sh.price = this.orig; S.lastPrice[this.sh.item.id] = this.sh.price; sfx('cancel'); this.close(); }
  update(dt) {
    super.update(dt); this.bump = Math.max(0, this.bump - dt);
    if (!this.sh.item) { this.close(); return; }
    const L = this.layout(), ptr = Input.pointer();
    // hold a +/- button to keep counting, faster the longer you hold
    if (this.hold) {
      const b = this.hold, inside = ptr.down && ptr.x >= b.x && ptr.x < b.x + b.w && ptr.y >= b.y && ptr.y < b.y + b.h;
      if (!inside) this.hold = null;
      else {
        this.holdT += dt; this.repT -= dt;
        if (this.holdT > 0.4 && this.repT <= 0) { this.repT = this.holdT > 1.6 ? 0.03 : 0.08; b.fn(); }
      }
    }
    const t = Input.tap();
    if (t) {
      const b = L.buttons.find(b => t.x >= b.x && t.x < b.x + b.w && t.y >= b.y && t.y < b.y + b.h);
      if (b) { Input.eatTap(); b.fn(); if (b.rep) { this.hold = b; this.holdT = 0; this.repT = 0; } return; }
      if (tapHits(this)) return;
    }
    // keys / pad: left-right = 1, up-down = 10, bumpers = 10%
    const d = Input.dir();
    if (d === 'L') this.step(-1); if (d === 'R') this.step(1);
    if (d === 'U') this.step(10); if (d === 'D') this.step(-10);
    if (Input.pressed('LB')) this.pct(0.9); if (Input.pressed('RB')) this.pct(1.1);
    if (Input.pressed('X')) { const nb = S.notes[this.sh.item.id]; if (nb && nb.r.content) this.set(nb.r.content); }
    if (Input.pressed('A') || Input.pressed('Y')) this.done();
    else if (Input.pressed('B')) this.cancel();
  }
  draw() {
    this.hits = [];
    dimScreen(0.6);
    R(ctx, 0, H - 20, W, 20, '#0c0a10'); // hide the prompts of the screen underneath
    const L = this.layout(), { x, y, w, h } = L, sh = this.sh, it = sh.item, info = ITEMS[it.id];
    paperPanel(x, y, w, h);
    // item header
    R(ctx, x + 10, y + 8, 36, 36, '#5e2f1d'); R(ctx, x + 11, y + 9, 34, 34, '#d98b52');
    const ic = itemIcon(it.id); ctx.drawImage(ic, x + 12, y + 10, 32, 32);
    if (it.n > 1) txt('x' + it.n, x + 44, y + 42, { size: 7, align: 'right', color: '#fff', outline: '#1b1420' });
    txt(info.name, x + 54, y + 18, { size: 8, color: C.paperDark, bold: true });
    txt(`Popularity: ${popLabel(it.id)}`, x + 54, y + 29, { size: 6, color: C.paperInk });
    txt('Set a price', x + w - 10, y + 18, { size: 6, align: 'right', color: C.tealText });
    // the price, big
    const px = x + 54, pw = w - 64, py = y + 36;
    R(ctx, px, py, pw, 22, '#1b1420'); R(ctx, px + 1, py + 1, pw - 2, 20, '#f4ecd6'); R(ctx, px + 1, py + 1, pw - 2, 2, '#fffaf0');
    const s = fmt(sh.price), lift = this.bump > 0 ? 1 : 0;
    ctx.drawImage(coinIcon(), px + 6, py + 7 - lift);
    txt(s, px + pw / 2 + 4, py + 16 - lift, { size: 14, align: 'center', color: '#3a2e20', bold: true });
    txt(it.n > 1 ? `Total for ${it.n}: ${fmt(sh.price * it.n)}` : ' ', x + w - 10, py + 31, { size: 6, align: 'right', color: C.paperInk });
    // buttons
    const ptr = Input.pointer();
    for (const b of L.buttons) {
      const down = this.hold === b && ptr.down, yy = b.y + (down ? 1 : 0);
      R(ctx, b.x + 1, b.y + 2, b.w, b.h, 'rgba(0,0,0,0.25)');
      R(ctx, b.x + 1, yy, b.w - 2, b.h, TB.rim); R(ctx, b.x, yy + 1, b.w, b.h - 2, TB.rim);
      R(ctx, b.x + 1, yy + 1, b.w - 2, b.h - 2, TB.goldLo); R(ctx, b.x + 1, yy + 1, b.w - 2, 1, TB.goldHi);
      const neg = b.label[0] === '-' || b.label === 'Half';
      R(ctx, b.x + 2, yy + 2, b.w - 4, b.h - 4, down ? (neg ? TB.back[2] : TB.use[2]) : (neg ? TB.back[1] : TB.use[1]));
      R(ctx, b.x + 2, yy + b.h - 4, b.w - 4, 1, neg ? TB.back[0] : TB.use[0]);
      txt(b.label, b.x + b.w / 2, yy + 13, { size: 8, align: 'center', color: '#f3eedb', bold: true });
    }
    // notebook: what customers felt at each price so far; tap one to use it
    const nb = S.notes[it.id], ny = y + 140;
    txt('Notebook (tap a price to use it)', x + w / 2, ny, { size: 6, align: 'center', color: C.paperInk });
    ['ecstatic', 'content', 'expensive', 'angry'].forEach((f, i) => {
      const cw = 52, cx = x + (w - (cw * 4 + 12)) / 2 + i * (cw + 4), cy = ny + 5;
      const known = nb && nb.r[f];
      R(ctx, cx, cy, cw, 22, known ? '#e8dcbc' : '#e2d6b8'); R(ctx, cx, cy + 21, cw, 1, '#c8b890');
      if (known && sh.price === nb.r[f]) { R(ctx, cx - 1, cy - 1, cw + 2, 1, C.teal); R(ctx, cx - 1, cy + 22, cw + 2, 1, C.teal); R(ctx, cx - 1, cy, 1, 22, C.teal); R(ctx, cx + cw, cy, 1, 22, C.teal); }
      ctx.drawImage(faceIcon(f), cx + 3, cy + 4);
      txt(known ? fmt(nb.r[f]) : '?', cx + 32, cy + 14, { size: 7, align: 'center', color: known ? '#3a2e20' : '#a89a7a', bold: !!known });
      if (known) hit(this, cx, cy, cw, 22, () => this.set(nb.r[f]));
    });
    promptBar(Input.device() === 'touch' ? [['A', 'Done'], ['B', this.fresh ? 'Keep' : 'Cancel']]
      : [['◀▶', '1'], ['▲▼', '10'], ['LB', '10%'], ['A', 'Done'], ['B', this.fresh ? 'Keep' : 'Cancel']], H - 4);
  }
}

// ---------------------------------------------------------------- crafting helpers
function countOwned(id) { let n = 0; for (const s of S.bag) if (s && s.id === id) n += s.n; for (const s of S.chest) if (s && s.id === id) n += s.n; return n; }
function consumeMats(mats) {
  for (const [id, need] of mats) {
    let left = need;
    for (const arr of [S.chest, S.bag]) for (let i = 0; i < arr.length && left > 0; i++) {
      const s = arr[i]; if (!s || s.id !== id) continue;
      const mv = Math.min(left, s.n); s.n -= mv; left -= mv; if (s.n <= 0) arr[i] = null;
    }
  }
}
function canAfford(rec) { return S.gold >= rec.gold && rec.mats.every(([id, n]) => countOwned(id) >= n); }
function recipePanel(x, y, w, rec, title) {
  paperPanel(x, y, w, 20 + rec.mats.length * 22);
  R(ctx, x + 2, y + 2, w - 4, 12, C.paper2);
  txt(title || 'Recipe', x + 6, y + 11, { size: 7, color: C.paperDark });
  txt(fmt(rec.gold), x + w - 16, y + 11, { size: 7, align: 'right', color: S.gold >= rec.gold ? C.paperDark : C.red }); ctx.drawImage(coinIcon(), x + w - 14, y + 4);
  rec.mats.forEach(([id, n], i) => {
    const yy = y + 18 + i * 22, own = countOwned(id), ok = own >= n;
    slotBox(x + 4, yy, 18); if (S.notes[id] || own) ctx.drawImage(itemIcon(id), x + 5 + (16 - itemIcon(id).width) / 2, yy + 1 + (16 - itemIcon(id).height) / 2); else txt('?', x + 13, yy + 12, { size: 8, align: 'center', color: C.paperInk });
    txt('Required:', x + 26, yy + 8, { size: 6, color: C.paperDark }); txt(n, x + w - 26, yy + 8, { size: 6, align: 'right', color: C.paperDark });
    txt('Owned:', x + 26, yy + 16, { size: 6, color: C.paperDark }); txt(own, x + w - 26, yy + 16, { size: 6, align: 'right', color: C.paperDark });
    R(ctx, x + w - 20, yy + 3, 14, 14, ok ? '#4fae52' : C.red); txt(ok ? '✓' : '✕', x + w - 13, yy + 13, { size: 8, align: 'center', color: '#fff' });
  });
}
function portraitStage(img, x, y) {
  // sheet sprites are scaled up to the counter's height
  const k = img.tall ? img.tall / img.height : 1, w = Math.round(img.width * k), h = Math.round(img.height * k);
  if (k !== 1) { x += Math.round((60 - w) / 2); y += 84 - h; }
  // wooden platform like the reference
  R(ctx, x - 8, y + h - 6, w + 16, 10, C.wood4); R(ctx, x - 6, y + h - 5, w + 12, 6, C.wood);
  R(ctx, x - 4, y + h - 3, w + 8, 1, C.wood3);
  ctx.drawImage(img, x, y, w, h);
}

// ---------------------------------------------------------------- forge
class ForgeUI extends Overlay {
  constructor() { super(); this.tab = 0; this.row = 0; this.col = 0; this.sync(); }
  lines() { return this.tab === 0 ? Object.keys(WEAPON_LINES) : Object.keys(ARMOR_LINES); }
  sync() { const L = this.lines(); this.row = clamp(this.row, 0, L.length - 1); this.col = clamp(Math.max(0, S.gear[L[this.row]] + 1), 0, 3); }
  update(dt) {
    super.update(dt);
    if (tapHits(this)) return;
    const L = this.lines(), d = Input.dir();
    if (d === 'U') { this.row = (this.row + L.length - 1) % L.length; this.col = clamp(S.gear[L[this.row]] + 1, 0, 3); sfx('move'); }
    if (d === 'D') { this.row = (this.row + 1) % L.length; this.col = clamp(S.gear[L[this.row]] + 1, 0, 3); sfx('move'); }
    if (d === 'L') { this.col = Math.max(0, this.col - 1); sfx('move'); }
    if (d === 'R') { this.col = Math.min(3, this.col + 1); sfx('move'); }
    if (Input.pressed('LB') || Input.pressed('RB')) { this.tab ^= 1; this.row = 0; this.sync(); sfx('move'); }
    if (Input.pressed('A')) this.craft();
    if (Input.pressed('B') || Input.pressed('Y')) { sfx('cancel'); this.close(); }
  }
  craft() {
    const line = this.lines()[this.row], tier = this.col, have = S.gear[line];
    if (tier <= have) { toast('You already own this.'); return; }
    if (tier > have + 1) { toast('Forge the previous tier first.', '#ffb0a0'); sfx('error'); return; }
    const rec = gearRecipe(line, tier);
    if (!canAfford(rec)) { sfx('error'); toast('Not enough gold or materials.', '#ffb0a0'); return; }
    const def = WEAPON_LINES[line] || ARMOR_LINES[line];
    ask(`Forge the ${def.names[tier]} for ${fmt(rec.gold)} gold?`, () => {
      S.gold -= rec.gold; consumeMats(rec.mats); S.gear[line] = tier; sfx('craft');
      if (WEAPON_LINES[line] && !S.equip.w.includes(line) && !S.equip.w[1]) S.equip.w[1] = line;
      if (ARMOR_LINES[line]) S.hp = Math.min(playerStats().maxHp, S.hp + ARMOR_LINES[line].hp[tier]);
      toast(`${def.names[tier]} forged!`, C.mint); saveGame();
    });
  }
  draw() {
    R(ctx, 0, 0, W, H, '#150f18');
    for (let i = 0; i < 40; i++) { const r = mulberry32(i); P(ctx, r() * W, r() * H, '#2a2230'); }
    portraitStage(TOWNSFOLK.ready ? refStanding(13) : smithPortrait(), 12, 72);
    banner(160, 8, 150, "BROM'S ANVIL");
    // centre paper with categories
    this.hits = [];
    paperPanel(92, 34, 140, 112);
    tabsHeader(['Weapons', 'Armor'], this.tab, 162, 36, this, i => { if (i !== this.tab) { this.tab = i; this.row = 0; this.sync(); } });
    const L = this.lines();
    L.forEach((line, r) => {
      const y = 56 + r * (this.tab === 0 ? 17 : 26), def = WEAPON_LINES[line] || ARMOR_LINES[line];
      for (let t = 0; t < 4; t++) {
        const x = 104 + t * 32, owned = S.gear[line] >= t, next = S.gear[line] + 1 === t;
        hit(this, x - 2, y - 1, 21, 18, () => { if (this.row === r && this.col === t) this.craft(); else { this.row = r; this.col = t; sfx('move'); } });
        if (t > 0) txt('›', x - 6, y + 11, { size: 8, align: 'center', color: C.paperInk });
        R(ctx, x, y, 17, 16, owned ? C.teal : next ? '#e6d7b2' : '#d8c8a0');
        const ic = gearIcon(def.icon, t);
        if (!owned && !next) { ctx.globalAlpha = 0.35; ctx.drawImage(whiteOf(ic, C.paperInk), x + 1, y + 1); ctx.globalAlpha = 1; }
        else ctx.drawImage(ic, x + 1, y + 1);
        if (r === this.row && t === this.col) selBrackets(x, y, 16, this.t);
      }
    });
    // big preview on the chalkboard
    const line = L[this.row], tier = this.col, def = WEAPON_LINES[line] || ARMOR_LINES[line];
    R(ctx, 108, 150, 108, 50, '#6a4a2e'); R(ctx, 111, 153, 102, 44, '#4a4a4c'); R(ctx, 113, 155, 98, 40, '#5a5a5c');
    const ic = gearIcon(def.icon, tier); ctx.drawImage(ic, 162 - ic.width * 1.25, 158, ic.width * 2.5, ic.height * 2.5);
    // stats card
    paperPanel(244, 8, 128, 12); txt(def.names[tier], 308, 17, { size: 7, align: 'center', color: C.paperDark });
    tealPanel(244, 24, 128, 72);
    const cur = S.gear[line];
    const stat = (k, i, v, dv) => {
      const y = 30 + i * 16; ell(ctx, 250, y, 12, 12, C.teal3); ctx.drawImage(statIcon(k), 252, y + 2);
      R(ctx, 266, y + 1, 98, 11, C.teal2); txt(v === null ? '-' : (dv > 0 ? '+' : '') + v, 315, y + 9, { size: 7, align: 'center', color: '#fff' });
    };
    if (WEAPON_LINES[line]) { const dmg = def.dmg[tier], d0 = cur >= 0 ? def.dmg[cur] : 0; stat('hp', 0, null); stat('dmg', 1, dmg - (this.tab === 0 && cur >= 0 ? d0 : 0), 1); stat('def', 2, null); stat('spd', 3, null); }
    else { const a = ARMOR_LINES[line], c = cur >= 0 ? cur : -1; stat('hp', 0, a.hp[tier] - (c >= 0 ? a.hp[c] : 0), 1); stat('dmg', 1, null); stat('def', 2, a.def[tier] - (c >= 0 ? a.def[c] : 0), 1); stat('spd', 3, a.spd[tier] ? a.spd[tier] - (c >= 0 ? a.spd[c] : 0) : null, 1); }
    if (tier <= cur) { txt('OWNED', 308, 110, { size: 8, align: 'center', color: C.mint, bold: true }); txt(def.desc || 'Armor piece.', 308, 122, { size: 6, align: 'center', color: '#b8b8c8' }); }
    else recipePanel(244, 102, 128, gearRecipe(line, tier));
    promptBar([['A', 'Forge'], ['LB', 'Weapons/Armor'], ['B', 'Back'], ['Y', 'Goodbye!']], H - 3);
  }
}

// ---------------------------------------------------------------- potion shop
class WitchUI extends Overlay {
  constructor() { super(); this.sel = 0; }
  update(dt) {
    super.update(dt);
    if (tapHits(this)) return;
    const d = Input.dir();
    if (d === 'L' || d === 'U') { this.sel = (this.sel + 3) % 4; sfx('move'); }
    if (d === 'R' || d === 'D') { this.sel = (this.sel + 1) % 4; sfx('move'); }
    if (Input.pressed('A')) this.brew();
    if (Input.pressed('B') || Input.pressed('Y')) { sfx('cancel'); this.close(); }
  }
  brew() {
    const p = POTIONS[this.sel];
    if (S.potions[this.sel] >= POTION_CAP) { toast(`You can carry at most ${POTION_CAP} of these.`); sfx('error'); return; }
    if (!canAfford(p)) { toast('Not enough gold or ingredients.', '#ffb0a0'); sfx('error'); return; }
    S.gold -= p.gold; consumeMats(p.mats); S.potions[this.sel]++; sfx('heal'); toast(`${p.name} brewed!`, C.mint);
  }
  draw() {
    R(ctx, 0, 0, W, H, '#150f18');
    portraitStage(TOWNSFOLK.ready ? refStanding(14) : witchPortrait(), 14, 76);
    banner(162, 8, 150, 'COPPER CAULDRON');
    paperPanel(96, 34, 132, 64);
    txt('Potions List:', 104, 46, { size: 7, color: C.paperDark });
    R(ctx, 104, 48, 116, 1, C.paperLine);
    R(ctx, 102, 56, 3, 34, C.paper3); R(ctx, 102, 56 + this.sel * 8, 3, 10, C.teal);
    this.hits = [];
    for (let i = 0; i < 4; i++) {
      const x = 112 + i * 27, y = 58;
      hit(this, x - 2, y - 2, 26, 26, () => { if (this.sel === i) this.brew(); else { this.sel = i; sfx('move'); } });
      slotBox(x, y, 22, { fill: '#e6d7b2' });
      ctx.drawImage(potionIcon(i), x + 4, y + 4);
      if (S.potions[i]) txt(S.potions[i], x + 21, y + 21, { size: 6, align: 'right', color: '#fff', outline: '#1b1420' });
      if (i === this.sel) selBrackets(x, y, 22, this.t);
    }
    // cauldron
    const cx = 162, cy = 110;
    ell(ctx, cx - 30, cy + 18, 60, 60, '#3a2a3a'); ell(ctx, cx - 28, cy + 20, 56, 54, '#5a3a5a'); ell(ctx, cx - 24, cy + 16, 48, 14, '#2a1a2a');
    ell(ctx, cx - 21, cy + 18, 42, 10, ['#d8403a', '#d84a9a', '#9a5ad8', '#2ac0b0'][this.sel]);
    for (let i = 0; i < 3; i++) { const k = (this.t * 0.8 + i / 3) % 1; ctx.globalAlpha = 1 - k; ell(ctx, cx - 6 + i * 5, cy + 14 - k * 20, 4, 4, '#e8dcc0'); ctx.globalAlpha = 1; }
    // card
    const p = POTIONS[this.sel];
    paperPanel(240, 8, 132, 12); txt(p.name, 306, 17, { size: 7, align: 'center', color: C.paperDark });
    tealPanel(240, 24, 132, 62);
    ell(ctx, 346, 12, 22, 22, C.paper3); ell(ctx, 347, 13, 20, 20, C.paper); ctx.drawImage(potionIcon(this.sel), 351, 16);
    txt(`Owned: ${S.potions[this.sel]} / ${POTION_CAP}`, 246, 36, { size: 7, color: '#fff' });
    wrapText(p.desc, 120, 6).forEach((l, i) => txt(l, 246, 48 + i * 8, { size: 6, color: '#e8fff4' }));
    recipePanel(240, 92, 132, p);
    promptBar([['A', 'Brew'], ['B', 'Back'], ['Y', 'Goodbye!']], H - 3);
  }
}

// ---------------------------------------------------------------- town board (investments / "staff")
class BoardUI extends Overlay {
  constructor() { super(); this.sel = 0; }
  level(inv) { return S.invest[inv.id] || 0; }
  update(dt) {
    super.update(dt);
    if (tapHits(this)) return;
    const d = Input.dir();
    if (d) {
      const pos = [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1]];
      const [cx, cy] = pos[this.sel];
      let best = this.sel, bs = 1e9;
      pos.forEach(([x, y], i) => { if (i === this.sel) return; const dx = x - cx, dy = y - cy; const ok = d === 'L' ? dx < 0 : d === 'R' ? dx > 0 : d === 'U' ? dy < 0 : dy > 0; if (!ok) return; const s = Math.abs(dx) + Math.abs(dy) * 1.5; if (s < bs) { bs = s; best = i; } });
      if (best !== this.sel) { this.sel = best; sfx('move'); }
    }
    if (Input.pressed('A')) this.invest();
    if (Input.pressed('B') || Input.pressed('Y')) { sfx('cancel'); this.close(); }
  }
  invest() {
    const inv = INVEST[this.sel], lv = this.level(inv);
    if (lv >= inv.cost.length) { toast('Already built!'); return; }
    const cost = inv.cost[lv];
    if (S.gold < cost) { toast(`You need ${fmt(cost)} gold.`, '#ffb0a0'); sfx('error'); return; }
    ask(`Invest ${fmt(cost)} gold in ${inv.name}${inv.cost.length > 1 ? ` (level ${lv + 1})` : ''}?`, () => {
      S.gold -= cost; S.invest[inv.id] = lv + 1; sfx('craft');
      if (inv.id === 'shop') { while (S.shelves.length < 8) S.shelves.push({ item: null, price: 10 }); }
      toast(`${inv.name} ${inv.id === 'shop' ? 'upgraded' : 'is now open'}!`, C.mint);
      saveGame();
      if (Game.scene instanceof TownScene) Game.scene.build();
    });
  }
  draw() {
    dimScreen(0.6);
    // wooden board
    R(ctx, 18, 22, 348, 176, C.wood4); R(ctx, 20, 24, 344, 172, C.wood);
    for (let j = 30; j < 196; j += 9) R(ctx, 20, j, 344, 1, C.wood2);
    banner(W / 2, 6, 120, 'TOWN BOARD');
    paperPanel(30, 36, 190, 150);
    zigzag(32, 36, 186, C.teal, 3);
    const pos = [[62, 70], [124, 70], [186, 70], [93, 132], [155, 132]];
    this.hits = [];
    INVEST.forEach((inv, i) => {
      const [cx, cy] = pos[i], lv = this.level(inv), done = lv >= inv.cost.length;
      hit(this, cx - 26, cy - 26, 52, 58, () => { if (this.sel === i) this.invest(); else { this.sel = i; sfx('move'); } });
      ell(ctx, cx - 25, cy - 25, 50, 50, done ? C.teal : '#c8b890'); ell(ctx, cx - 22, cy - 22, 44, 44, done ? '#e6d7b2' : '#d8c8a0');
      const drawP = (img) => { const s = 40 / img.height; ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 21, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(img, cx - img.width * s / 2, cy - 20, img.width * s, img.height * s); ctx.restore(); };
      if (inv.id === 'forge') done ? drawP(smithPortrait()) : null;
      if (inv.id === 'witch') done ? drawP(witchPortrait()) : null;
      if (!done && (inv.id === 'forge' || inv.id === 'witch')) { ell(ctx, cx - 14, cy - 18, 28, 26, C.teal); ell(ctx, cx - 18, cy + 4, 36, 22, C.teal); }
      if (inv.id === 'shop') { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 21, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(buildingSprite('shop', false), cx - 30, cy - 22, 60, 44); ctx.restore(); }
      if (inv.id === 'decor') { ctx.drawImage(bushSprite(1), cx - 16, cy - 12, 32, 24); }
      if (inv.id === 'bank') { for (let k = 0; k < 5; k++) ctx.drawImage(coinIcon(), cx - 10 + (k % 3) * 7, cy - 4 - (k / 3 | 0) * 6); }
      // label chip
      R(ctx, cx - 18, cy + 18, 36, 9, done ? C.teal : C.teal3); txt(done ? '✓' : `${lv}/${inv.cost.length}`, cx, cy + 25, { size: 6, align: 'center', color: '#fff' });
      if (i === this.sel) { ctx.strokeStyle = C.teal2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 28 + Math.sin(this.t * 8), 0, Math.PI * 2); ctx.stroke(); }
    });
    // detail card
    const inv = INVEST[this.sel], lv = this.level(inv), done = lv >= inv.cost.length;
    R(ctx, 232, 32, 124, 158, '#6a4a2e'); tealPanel(234, 34, 120, 154);
    paperPanel(240, 40, 108, 60);
    const img = inv.id === 'forge' ? buildingSprite('forge', false) : inv.id === 'witch' ? buildingSprite('witch', false) : inv.id === 'shop' ? buildingSprite('shop', false) : null;
    if (img) { const s = Math.min(96 / img.width, 50 / img.height); ctx.drawImage(img, 294 - img.width * s / 2, 45, img.width * s, img.height * s); }
    else if (inv.id === 'bank') { for (let k = 0; k < 9; k++) ctx.drawImage(coinIcon(), 280 + (k % 3) * 9, 58 + (k / 3 | 0) * 8); }
    else ctx.drawImage(bushSprite(1), 278, 58, 32, 24);
    R(ctx, 240, 104, 108, 12, C.paper); txt(inv.name.toUpperCase(), 294, 113, { size: 6, align: 'center', color: C.paperDark, fam: FONT_TITLE });
    if (!done) { txt(fmt(inv.cost[lv]), 330, 128, { size: 8, align: 'right', color: '#fff' }); ctx.drawImage(coinIcon(), 332, 121); }
    else txt('BUILT', 294, 128, { size: 8, align: 'center', color: C.mint2, bold: true });
    wrapText(inv.desc, 108, 6).slice(0, 6).forEach((l, i) => txt(l, 242, 140 + i * 7, { size: 6, color: '#e8fff4' }));
    promptBar([['A', done ? 'Built' : 'Invest'], ['B', 'Back']], H - 3);
  }
}
