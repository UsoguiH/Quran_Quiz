'use strict';
// ============================================================================
//  UI TOOLKIT: overlay stack, drawing primitives styled after the reference
//  (cream paper, open notebook, teal banners with zig-zag trims), slot grids
//  with grab/place mechanics, dialogue, confirmations, toasts, prompts.
// ============================================================================

const UI = {
  stack: [],
  open(o) { this.stack.push(o); if (o.onOpen) o.onOpen(); Input.clearAll(); return o; },
  close(o) {
    const i = this.stack.indexOf(o || this.top());
    if (i >= 0) { const [r] = this.stack.splice(i, 1); if (r.onClose) r.onClose(); }
    Input.clearAll();
  },
  top() { return this.stack[this.stack.length - 1]; },
  has(cls) { return this.stack.some(o => o instanceof cls); },
  update(dt) { const t = this.top(); if (t) t.update(dt); },
  draw() { for (const o of this.stack) o.draw(); },
  blocking() { return this.stack.length > 0; },
  clear() { while (this.stack.length) this.close(this.stack[this.stack.length - 1]); },
};

// ---------------------------------------------------------------- toasts / floating text
const Toasts = {
  list: [],
  add(msg, col = '#fff') { this.list.push({ msg, col, t: 2.6 }); if (this.list.length > 4) this.list.shift(); },
  update(dt) { this.list.forEach(t => t.t -= dt); this.list = this.list.filter(t => t.t > 0); },
  draw() {
    this.list.forEach((t, i) => {
      const a = clamp(t.t / 0.4, 0, 1);
      const y = H - 44 - (this.list.length - 1 - i) * 13;
      const w = textW(t.msg, 8) + 14;
      ctx.globalAlpha = a * 0.85; R(ctx, W / 2 - w / 2, y - 9, w, 12, '#1b1420'); ctx.globalAlpha = 1;
      txt(t.msg, W / 2, y, { align: 'center', color: t.col, alpha: a });
    });
  },
};
const toast = (m, c) => Toasts.add(m, c);

// ---------------------------------------------------------------- button glyphs
const KEY_LABEL = { RUN: 'SHF', A: 'E', B: 'Esc', X: 'J', Y: 'K', ROLL: 'Spc', LB: 'Q', RB: 'R', SELECT: 'I', START: 'P', PENDANT: 'F', LT: 'Z', RT: 'C' };
const PAD_COL = { A: C.btnA, B: C.btnB, X: C.btnX, Y: C.btnY };
function btnGlyph(x, y, b) {
  // pixel keycap / round gamepad button; returns the drawn width
  const dev = Input.device();
  const fix = l => l.replace('◀▶', '<>').replace('▲▼', '^v');
  x = Math.round(x); y = Math.round(y);
  if (dev === 'key') {
    const img = keyCap(fix(KEY_LABEL[b] || b));
    ctx.drawImage(img, x - 2, y - 10);
    return img.width - 4;
  }
  if (b === 'ROLL') b = 'B';
  if (PAD_LETTER_COL[b]) { const img = roundBtn(b, PAD_LETTER_COL[b]); ctx.drawImage(img, x - 2, y - 10); return 13; }
  const img = keyCap(fix(b === 'PENDANT' ? 'HOME' : b === 'SELECT' ? 'BAG' : b === 'START' ? 'II' : b));
  ctx.drawImage(img, x - 2, y - 10);
  return img.width - 4;
}
// prompts: [['A','Grab'],['B','Back']]; drawn centered at y
function promptBar(list, y = H - 6, col = '#efe3c5', center = W / 2) {
  let tot = 0; const parts = list.map(([b, l]) => { const w = 11 + textW(l, 7) + 10; tot += w; return w; });
  let x = center - tot / 2;
  list.forEach(([b, l], i) => { const bw = btnGlyph(x, y, b); txt(l, x + bw + 3, y, { size: 7, color: col, outline: col === '#efe3c5' ? '#1b1420' : undefined }); x += Math.max(parts[i], bw + textW(l, 7) + 12); });
}

// ---------------------------------------------------------------- panels
function paperPanel(x, y, w, h, o = {}) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  if (!o.noShadow) { ctx.globalAlpha = 0.35; R(ctx, x + 3, y + 4, w, h, '#000'); ctx.globalAlpha = 1; }
  R(ctx, x, y, w, h, o.edge || C.paper3);
  R(ctx, x + 1, y + 1, w - 2, h - 2, o.fill || C.paper);
  // rough torn edge pixels
  const rnd = mulberry32((x * 31 + y * 17 + w) | 0);
  for (let i = 0; i < w; i += 3) { if (rnd() < 0.4) P(ctx, x + i, y + h - 2, C.paper2); if (rnd() < 0.3) P(ctx, x + i, y + 1, C.paper2); }
  for (let j = 0; j < h; j += 3) { if (rnd() < 0.3) P(ctx, x + 1, y + j, C.paper2); if (rnd() < 0.3) P(ctx, x + w - 2, y + j, C.paper2); }
  if (o.lines) for (let j = y + 14; j < y + h - 6; j += 12) R(ctx, x + 6, j, w - 12, 1, C.paperLine);
}
function darkPanel(x, y, w, h, fill = '#2a2230') {
  R(ctx, x, y, w, h, '#120e16'); R(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}
function tealPanel(x, y, w, h) {
  ctx.globalAlpha = 0.35; R(ctx, x + 2, y + 3, w, h, '#000'); ctx.globalAlpha = 1;
  R(ctx, x, y, w, h, C.teal3); R(ctx, x + 1, y + 1, w - 2, h - 2, C.teal); R(ctx, x + 1, y + 1, w - 2, 2, C.mint);
}
function woodPanel(x, y, w, h) {
  R(ctx, x, y, w, h, C.wood4); R(ctx, x + 1, y + 1, w - 2, h - 2, C.wood);
  for (let j = y + 6; j < y + h - 2; j += 7) R(ctx, x + 1, j, w - 2, 1, C.wood2);
  R(ctx, x + 1, y + 1, w - 2, 1, C.wood3);
}
// open notebook spread like the reference inventory (left page + right page, red ribbon)
function bookSpread(x, y, w, h) {
  ctx.globalAlpha = 0.4; R(ctx, x + 4, y + 6, w, h, '#000'); ctx.globalAlpha = 1;
  // cover
  R(ctx, x - 3, y + 2, w + 6, h + 2, '#6a4a2e'); R(ctx, x - 2, y + h + 2, w + 4, 2, '#4a3220');
  const half = (w / 2) | 0;
  paperPanel(x, y, half - 1, h, { noShadow: true });
  paperPanel(x + half + 1, y, w - half - 1, h, { noShadow: true });
  // spine & ribbon
  R(ctx, x + half - 2, y, 4, h, '#cbb88c'); R(ctx, x + half - 1, y, 2, h, '#b8a070');
  R(ctx, x + half - 1, y + 10, 2, h - 6, C.red); R(ctx, x + half - 2, y + h - 4, 4, 8, C.red); P(ctx, x + half - 1, y + h + 3, '#00000000');
  // page curl shading
  R(ctx, x + half - 6, y + 1, 4, h - 2, 'rgba(120,100,60,0.12)'); R(ctx, x + half + 2, y + 1, 4, h - 2, 'rgba(120,100,60,0.12)');
}
function zigzag(x, y, w, col, s = 4, down = true) {
  ctx.fillStyle = col;
  for (let i = 0; i < w; i += s * 2) {
    ctx.beginPath();
    if (down) { ctx.moveTo(x + i, y); ctx.lineTo(x + i + s * 2, y); ctx.lineTo(x + i + s, y + s); }
    else { ctx.moveTo(x + i, y); ctx.lineTo(x + i + s * 2, y); ctx.lineTo(x + i + s, y - s); }
    ctx.fill();
  }
}
// teal banner hanging from a wooden rod (VULCAN'S FORGE style)
function banner(cx, y, w, text) {
  const x = (cx - w / 2) | 0;
  R(ctx, x - 6, y - 2, w + 12, 4, C.wood4); R(ctx, x - 5, y - 1, w + 10, 2, C.wood);
  R(ctx, x - 8, y - 3, 4, 6, C.red2); R(ctx, x + w + 4, y - 3, 4, 6, C.red2);
  R(ctx, x, y + 2, w, 14, C.teal3); R(ctx, x + 1, y + 2, w - 2, 13, C.teal);
  zigzag(x + 1, y + 15, w - 2, C.teal, 4, true);
  zigzag(x + 1, y + 13, w - 2, C.mint2, 2, true);
  txt(text, cx, y + 12, { size: 8, align: 'center', color: '#effff6', fam: FONT_TITLE, outline: C.teal3 });
}
function slotBox(x, y, s = 16, o = {}) {
  R(ctx, x, y, s, s, o.dark ? '#3a3326' : C.paper3);
  R(ctx, x + 1, y + 1, s - 2, s - 2, o.dark ? '#4a4232' : (o.fill || '#e6d7b2'));
  R(ctx, x + 1, y + 1, s - 2, 1, o.dark ? '#2e281e' : '#d6c59a');
  if (o.safe) { R(ctx, x + 1, y + s - 3, s - 2, 2, 'rgba(63,174,143,0.35)'); }
}
function selBrackets(x, y, s, t = Game.time) {
  const o = Math.sin(t * 8) > 0 ? 1 : 0;
  const c = C.teal2, L = 4;
  const x0 = x - 2 - o, y0 = y - 2 - o, x1 = x + s + 1 + o, y1 = y + s + 1 + o;
  R(ctx, x0, y0, L, 2, c); R(ctx, x0, y0, 2, L, c);
  R(ctx, x1 - L + 1, y0, L, 2, c); R(ctx, x1 - 1, y0, 2, L, c);
  R(ctx, x0, y1 - 1, L, 2, c); R(ctx, x0, y1 - L + 1, 2, L, c);
  R(ctx, x1 - L + 1, y1 - 1, L, 2, c); R(ctx, x1 - 1, y1 - L + 1, 2, L, c);
}
const CURSE_COL = { destroy: '#e0453a', transform: '#4a8ae0', edge: '#b04ad0' };
const CURSE_TXT = { destroy: 'Cursed: destroys the item to its right when you return to town.', transform: 'Cursed: transforms into a random item when you return to town.', edge: 'Cursed: can only be placed in the leftmost or rightmost column.' };
function drawStack(it, x, y, s = 16, o = {}) {
  if (!it) return;
  const ic = it.gear ? gearIcon(it.gear, it.tier) : it.potion !== undefined ? potionIcon(it.potion) : itemIcon(it.id);
  const ox = x + ((s - ic.width) / 2 | 0), oy = y + ((s - ic.height) / 2 | 0);
  if (o.ghost) ctx.globalAlpha = 0.45;
  ctx.drawImage(ic, ox, oy);
  ctx.globalAlpha = 1;
  if (it.curse) { R(ctx, x + 1, y + 1, 4, 4, '#1b1420'); R(ctx, x + 2, y + 2, 2, 2, CURSE_COL[it.curse]); }
  if (it.n > 1) txt(it.n, x + s - 1, y + s, { size: 7, align: 'right', color: '#fff', outline: '#1b1420' });
}
function hpBar(x, y, w, h, frac, col = C.hp) {
  R(ctx, x, y, w, h, '#1b1420'); R(ctx, x + 1, y + 1, w - 2, h - 2, C.hpBack);
  R(ctx, x + 1, y + 1, Math.max(0, (w - 2) * clamp(frac, 0, 1)), h - 2, col);
  R(ctx, x + 1, y + 1, Math.max(0, (w - 2) * clamp(frac, 0, 1)), 1, shade(col, 0.35));
}
function goldBadge(x, y) {
  ctx.drawImage(bagBadge(), x, y);
  const s = fmt(S.gold);
  ctx.drawImage(coinIcon(), x + 3 + textW(s, 7) + 2, y + 23);
  txt(s, x + 3, y + 29, { size: 7, color: '#fff', outline: '#1b1420' });
}
function dimScreen(a = 0.55) { ctx.globalAlpha = a; R(ctx, 0, 0, W, H, '#07050a'); ctx.globalAlpha = 1; }

// ---------------------------------------------------------------- spatial nav across rects
function navMove(cells, idx, dir) {
  const cur = cells[idx]; if (!cur) return idx;
  const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
  const dx = dir === 'L' ? -1 : dir === 'R' ? 1 : 0, dy = dir === 'U' ? -1 : dir === 'D' ? 1 : 0;
  let best = -1, bs = 1e9;
  cells.forEach((c, i) => {
    if (i === idx || c.disabled) return;
    const px = c.x + c.w / 2 - cx, py = c.y + c.h / 2 - cy;
    const along = px * dx + py * dy;
    if (along <= 2) return;
    const across = Math.abs(px * dy) + Math.abs(py * dx);
    const sc = along + across * 2.2;
    if (sc < bs) { bs = sc; best = i; }
  });
  return best >= 0 ? best : idx;
}

// ---------------------------------------------------------------- base overlay
class Overlay {
  constructor() { this.t = 0; }
  update(dt) { this.t += dt; }
  draw() { }
  close() { UI.close(this); }
}

// ---------------------------------------------------------------- dialogue
class Dialogue extends Overlay {
  // lines: array of strings; o: {name, portrait(canvas), onDone}
  constructor(lines, o = {}) {
    super(); this.lines = Array.isArray(lines) ? lines : [lines]; this.o = o; this.i = 0; this.chars = 0;
    this.who = o.name || 'Narrator';
    Voice.speak(this.lines[0], this.who);
  }
  onClose() { Voice.stop(); }
  update(dt) {
    super.update(dt);
    const line = this.lines[this.i];
    const speed = [30, 55, 110][OPTS.textSpeed] || 55;
    const before = this.chars | 0;
    this.chars = Math.min(line.length, this.chars + dt * speed);
    for (let k = before; k < (this.chars | 0); k++) Voice.blip(line[k], k);
    if (Input.pressed('A') || Input.pressed('X') || Input.pressed('B')) {
      if (this.chars < line.length) this.chars = line.length;
      else if (this.i < this.lines.length - 1) { this.i++; this.chars = 0; sfx('select'); Voice.speak(this.lines[this.i], this.who); }
      else { this.close(); if (this.o.onDone) this.o.onDone(); }
    }
  }
  draw() {
    const w = 250, h = 50, x = (W - w) / 2 | 0, y = this.o.top ? 10 : H - h - 16;
    paperPanel(x, y, w, h);
    let tx = x + 8;
    if (this.o.portrait) {
      const p = this.o.portrait;
      const s = Math.min(1, 44 / p.height);
      R(ctx, x + 4, y + 3, 44, 44, C.paper2);
      ctx.drawImage(p, x + 4 + (44 - p.width * s) / 2, y + 3 + (44 - p.height * s), p.width * s, p.height * s);
      tx = x + 54;
    }
    if (this.o.name) txt(this.o.name + ':', tx, y + 11, { size: 8, color: C.tealText, bold: true });
    const line = this.lines[this.i].slice(0, this.chars | 0);
    wrapText(line, x + w - tx - 8, 8).forEach((l, k) => txt(l, tx, y + (this.o.name ? 21 : 12) + k * 9, { size: 8, color: C.paperDark }));
    if (this.chars >= this.lines[this.i].length && Math.sin(this.t * 6) > -0.3) btnGlyph(x + w - 14, y + h - 3, 'A');
  }
}
function say(lines, o) { return UI.open(new Dialogue(lines, o)); }

// ---------------------------------------------------------------- confirm
class Confirm extends Overlay {
  constructor(q, onYes, o = {}) { super(); this.q = q; this.onYes = onYes; this.o = o; this.sel = 0; this.opts = o.opts || ['Yes', 'No']; }
  update(dt) {
    super.update(dt);
    const d = Input.dir();
    if (d === 'L' || d === 'U') { this.sel = (this.sel + this.opts.length - 1) % this.opts.length; sfx('move'); }
    if (d === 'R' || d === 'D') { this.sel = (this.sel + 1) % this.opts.length; sfx('move'); }
    if (Input.pressed('A') || Input.pressed('X')) {
      this.close();
      if (this.o.opts) { sfx('confirm'); this.onYes(this.sel); }
      else if (this.sel === 0) { sfx('confirm'); this.onYes(); } else { sfx('cancel'); if (this.o.onNo) this.o.onNo(); }
    }
    if (Input.pressed('B')) { this.close(); sfx('cancel'); if (this.o.onNo) this.o.onNo(); }
  }
  draw() {
    dimScreen(0.35);
    const lines = wrapText(this.q, 190, 8);
    const w = 214, h = 30 + lines.length * 10 + 6, x = (W - w) / 2 | 0, y = (H - h) / 2 | 0;
    paperPanel(x, y, w, h);
    lines.forEach((l, i) => txt(l, W / 2, y + 14 + i * 10, { align: 'center', color: C.paperDark }));
    const n = this.opts.length, bw = 56, gap = 8, tot = n * bw + (n - 1) * gap;
    this.opts.forEach((op, i) => {
      const bx = W / 2 - tot / 2 + i * (bw + gap), by = y + h - 18;
      if (i === this.sel) { R(ctx, bx, by, bw, 13, C.teal3); R(ctx, bx + 1, by + 1, bw - 2, 11, C.teal); }
      else { R(ctx, bx, by, bw, 13, C.paper3); R(ctx, bx + 1, by + 1, bw - 2, 11, C.paper2); }
      txt(op, bx + bw / 2, by + 9.5, { align: 'center', color: i === this.sel ? '#fff' : C.paperDark });
    });
  }
}
function ask(q, onYes, o) { return UI.open(new Confirm(q, onYes, o)); }

// ---------------------------------------------------------------- item grid / transfer base
// Cells: {x,y,w,h, get:()=>stack, set:(v)=>void, accept:(v)=>bool, kind, id}
class GridUI extends Overlay {
  constructor() { super(); this.cells = []; this.cur = 0; this.held = null; this.heldFrom = null; this.info = ''; }
  cell() { return this.cells[this.cur]; }
  navigate() {
    const d = Input.dir();
    if (d) { const n = navMove(this.cells, this.cur, d); if (n !== this.cur) { this.cur = n; sfx('move'); } }
  }
  grab(all = true) {
    const c = this.cell(); if (!c || !c.get) return false;
    const it = c.get();
    if (this.held) {
      if (!it) {
        if (!c.accept || c.accept(this.held, c)) {
          if (all) { c.set(this.held); this.held = null; }
          else { c.set({ ...this.held, n: 1 }); this.held.n--; if (this.held.n <= 0) this.held = null; }
          sfx('select'); return true;
        }
        sfx('error'); return false;
      }
      if (it.id === this.held.id && !it.gear && (it.curse || null) === (this.held.curse || null)) {
        const cap = ITEMS[it.id] ? ITEMS[it.id].stack : 1;
        const room = cap - it.n;
        if (room <= 0) { sfx('error'); return false; }
        const mv = all ? Math.min(room, this.held.n) : 1;
        it.n += mv; this.held.n -= mv; c.set(it);
        if (this.held.n <= 0) this.held = null;
        sfx('select'); return true;
      }
      // swap
      if (!all) { sfx('error'); return false; }
      if (c.accept && !c.accept(this.held, c)) { sfx('error'); return false; }
      if (c.canTake && !c.canTake(it)) { sfx('error'); return false; }
      const tmp = it; c.set(this.held); this.held = tmp; this.heldFrom = c;
      sfx('select'); return true;
    }
    if (!it) return false;
    if (c.canTake && !c.canTake(it)) { sfx('error'); return false; }
    if (all || it.n <= 1) { this.held = { ...it }; c.set(null); }
    else { this.held = { ...it, n: 1 }; it.n--; c.set(it); }
    this.heldFrom = c; sfx('select'); return true;
  }
  returnHeld() {
    if (!this.held) return;
    const c = this.heldFrom;
    if (c && c.get) {
      const it = c.get();
      if (!it && (!c.accept || c.accept(this.held, c))) { c.set(this.held); this.held = null; return; }
      if (it && it.id === this.held.id) { it.n += this.held.n; c.set(it); this.held = null; return; }
    }
    // any free cell that accepts
    for (const cc of this.cells) {
      if (cc.get && !cc.get() && (!cc.accept || cc.accept(this.held, cc)) && !cc.noAuto) { cc.set(this.held); this.held = null; return; }
    }
  }
  drawHeld() {
    if (!this.held) return;
    const c = this.cell(); if (!c) return;
    const bob = Math.sin(this.t * 6) * 1.5;
    drawStack(this.held, c.x + (c.w - 16) / 2 + 5, c.y + (c.h - 16) / 2 - 9 + bob, 16);
  }
  drawCursor() {
    const c = this.cell(); if (!c) return;
    if (c.w === c.h) selBrackets(c.x, c.y, c.w, this.t);
    else { const o = Math.sin(this.t * 8) > 0 ? 1 : 0; ctx.strokeStyle = C.teal2; ctx.lineWidth = 2; ctx.strokeRect(c.x - 1.5 - o, c.y - 1.5 - o, c.w + 3 + o * 2, c.h + 3 + o * 2); }
  }
}
// bag cells (5x4) at x,y
function bagCells(x, y, s = 18, gap = 2) {
  const out = [];
  for (let i = 0; i < 20; i++) {
    const col = i % 5, row = (i / 5) | 0;
    out.push({
      x: x + col * (s + gap), y: y + row * (s + gap), w: s, h: s, kind: 'bag', idx: i,
      get: () => S.bag[i], set: v => { S.bag[i] = v; },
      accept: v => !v.gear && canPlaceAt(S.bag, i, v, 5),
    });
  }
  return out;
}
function canPlaceAt(arr, i, v, cols) {
  if (v && v.curse === 'edge') { const c = i % cols; return c === 0 || c === cols - 1; }
  return true;
}
function drawBagGrid(x, y, s = 18, gap = 2, o = {}) {
  for (let i = 0; i < 20; i++) {
    const col = i % 5, row = (i / 5) | 0;
    const sx = x + col * (s + gap), sy = y + row * (s + gap);
    slotBox(sx, sy, s, { safe: row === 0 });
    const it = S.bag[i];
    if (it) drawStack(it, sx + (s - 16) / 2, sy + (s - 16) / 2, 16, { ghost: o.lost && row > 0 });
    if (o.lost && row > 0 && it) { line(ctx, sx + 3, sy + 3, sx + s - 4, sy + s - 4, C.red); line(ctx, sx + s - 4, sy + 3, sx + 3, sy + s - 4, C.red); }
  }
  // row markers (hero = safe pocket row, golem = regular)
  const hx = x - 12;
  ctx.drawImage(cached('rowHero', () => fromRows(['.22.', '2222', '.22.', '2222', '2..2'], { 2: C.teal }, null)), hx + 2, y + 6);
  ctx.drawImage(cached('rowBag', () => fromRows(['2..2', '2222', '2122', '2222'], { 1: C.paper, 2: C.teal }, null)), hx + 2, y + s + gap + 6);
}
function itemInfoLines(it) {
  if (!it) return [];
  if (it.gear) return [];
  const d = ITEMS[it.id]; if (!d) return [];
  const lines = [d.desc];
  if (it.curse) lines.push(CURSE_TXT[it.curse]);
  return lines;
}
function itemName(it) {
  if (!it) return '';
  if (it.gear) return (WEAPON_LINES[it.gear] || ARMOR_LINES[it.gear]).names[it.tier];
  return ITEMS[it.id] ? ITEMS[it.id].name : '?';
}
function nameTag(text, cx, y) {
  if (!text) return;
  const w = textW(text, 7) + 16;
  R(ctx, cx - w / 2, y, w, 11, C.paper3); R(ctx, cx - w / 2 + 1, y + 1, w - 2, 9, C.paper);
  R(ctx, cx - w / 2 - 3, y + 3, 3, 5, C.paper3); R(ctx, cx + w / 2, y + 3, 3, 5, C.paper3);
  txt(text, cx, y + 8, { size: 7, align: 'center', color: C.paperDark });
}
