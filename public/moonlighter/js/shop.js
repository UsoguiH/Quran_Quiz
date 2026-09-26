'use strict';
// ============================================================================
//  SHOP: the heart of the day loop. Tables hold stacks with prices; customers
//  browse, react (ecstatic / content / expensive / angry), queue at the
//  register and pay. Thieves grab and run: roll into them!
// ============================================================================

const SHOP_ROOM = { x: 60, y: 14, w: 264, h: 196 };
const TABLE_POS = [[104, 86], [152, 86], [104, 128], [152, 128], [200, 86], [104, 170], [248, 86], [152, 170]];
const REGISTER = { x: 268, y: 150 }, REG_SPOT = { x: 268, y: 136 };
const QUEUE_POS = [[268, 176], [290, 190], [246, 192]];
const SHOP_DOOR = { x: 192, y: 214 };
const CHEST_POS = { x: 294, y: 72 }, BED_POS = { x: 84, y: 64 };
const SHOP_DAY_LEN = 170; // seconds

// rounded speech bubble with an outline and a little tail pointing at tailX
function roundBubble(x, y, w, h, fill, tailX) {
  x = Math.round(x); y = Math.round(y);
  const o = '#1b1420';
  R(ctx, x + 2, y, w - 4, h, o); R(ctx, x, y + 2, w, h - 4, o); R(ctx, x + 1, y + 1, w - 2, h - 2, o);
  R(ctx, x + 2, y + 1, w - 4, h - 2, fill); R(ctx, x + 1, y + 2, w - 2, h - 4, fill);
  R(ctx, x + 2, y + h - 3, w - 4, 1, shade(fill, -0.08));
  if (tailX !== undefined) { R(ctx, tailX - 2, y + h - 1, 4, 2, fill); R(ctx, tailX - 1, y + h + 1, 2, 1, fill); P(ctx, tailX - 3, y + h, o); P(ctx, tailX + 2, y + h, o); P(ctx, tailX - 2, y + h + 1, o); P(ctx, tailX + 1, y + h + 1, o); P(ctx, tailX - 1, y + h + 2, o); P(ctx, tailX, y + h + 2, o); }
}
function priceBubble(s, x, bottomY) {
  const w = Math.max(14, textW(s, 7) + 8), h = 11;
  roundBubble(x - w / 2, bottomY - h - 2, w, h, '#ffffff', x);
  txt(s, x, bottomY - 5, { size: 7, align: 'center', color: '#1b1420', bold: true });
}
function tableCount() { return [4, 6, 8][S.invest.shop || 0]; }
function demandMul(id) { return 1 + 0.25 * (S.pop[id] || 0); }
function popLabel(id) { const p = S.pop[id] || 0; return p > 0.4 ? 'High' : p < -0.4 ? 'Low' : 'Neutral'; }
function reactionFor(id, price, cust) {
  const V = ITEMS[id].value * demandMul(id) * cust.tol * (S.invest.decor ? 1.05 : 1);
  const r = price / V;
  if (r < 0.9) return 'ecstatic';
  if (r <= 1.0) return 'content';
  if (r <= 1.1) return 'expensive';
  return 'angry';
}
function renderShopBG() {
  const c = mkCanvas(W, H), g = c.getContext('2d'), rng = mulberry32(5);
  R(g, 0, 0, W, H, '#0c0808');
  const { x, y, w, h } = SHOP_ROOM;
  // warm floor planks with grain and knots
  R(g, x, y, w, h, '#cf9058');
  for (let j = y; j < y + h; j += 7) {
    R(g, x, j, w, 1, '#a8663a'); R(g, x, j + 1, w, 1, '#dea46a');
    for (let i = x + (rng() * 30 | 0); i < x + w; i += 30 + (rng() * 26 | 0)) R(g, i, j, 1, 7, '#a8663a');
  }
  for (let i = 0; i < 120; i++) R(g, x + rng() * w, y + rng() * h, 2 + rng() * 5 | 0, 1, rng() < 0.5 ? '#c07e48' : '#dca068');
  for (let i = 0; i < 14; i++) { const kx = x + rng() * w, ky = y + rng() * h; ell(g, kx, ky, 3, 2, '#9a5a32'); }
  // big patterned rug under the tables
  const rx = 84, ry = 70, rw = 138, rh = 118;
  R(g, rx, ry, rw, rh, '#5a2e1c'); R(g, rx + 1, ry + 1, rw - 2, rh - 2, '#a85e36'); R(g, rx + 5, ry + 5, rw - 10, rh - 10, '#6a3822');
  R(g, rx + 6, ry + 6, rw - 12, rh - 12, '#dcc08e');
  g.fillStyle = '#c6a268';
  for (let i = -rh; i < rw; i += 12) for (let t = 0; t < rh - 16; t++) { const px = rx + 8 + i + t, py = ry + 8 + t; if (px > rx + 7 && px < rx + rw - 8) g.fillRect(px, py, 1, 1); const qx = rx + rw - 9 - i - t; if (qx > rx + 7 && qx < rx + rw - 8) g.fillRect(qx, py, 1, 1); }
  R(g, rx + 12, ry + 12, rw - 24, 1, '#8a5a36'); R(g, rx + 12, ry + rh - 13, rw - 24, 1, '#8a5a36'); R(g, rx + 12, ry + 12, 1, rh - 24, '#8a5a36'); R(g, rx + rw - 13, ry + 12, 1, rh - 24, '#8a5a36');
  ell(g, rx + rw / 2 - 16, ry + rh / 2 - 12, 32, 24, '#a85e36'); ell(g, rx + rw / 2 - 12, ry + rh / 2 - 9, 24, 18, '#dcc08e'); ell(g, rx + rw / 2 - 5, ry + rh / 2 - 4, 10, 8, '#2aa08c');
  for (let i = rx + 2; i < rx + rw - 2; i += 3) { R(g, i, ry - 2, 1, 2, '#efe0c0'); R(g, i, ry + rh, 1, 2, '#efe0c0'); }
  // log walls
  const logs = (lx, ly, lw, lh, vertical) => {
    R(g, lx, ly, lw, lh, '#7a3e22');
    if (vertical) for (let i = lx; i < lx + lw; i += 5) { R(g, i, ly, 4, lh, '#9a5230'); R(g, i, ly, 1, lh, '#b0663a'); }
    else for (let j = ly; j < ly + lh; j += 6) { R(g, lx, j, lw, 5, '#9a5230'); R(g, lx, j, lw, 1, '#b8703e'); R(g, lx, j + 4, lw, 1, '#6a3420'); }
  };
  logs(x, y, w, 42); logs(x, y, 10, h, true); logs(x + w - 10, y, 10, h, true); logs(x, y + h - 10, w, 10);
  R(g, x, y + 40, w, 3, '#4a2414'); g.globalAlpha = 0.28; R(g, x + 10, y + 43, w - 20, 6, '#000'); R(g, x + 10, y, 5, h, '#000'); R(g, x + w - 15, y, 5, h, '#000'); g.globalAlpha = 1;
  // window with daylight
  R(g, 84, y + 6, 30, 24, '#3a1c10'); R(g, 86, y + 8, 26, 20, '#a8dcf0'); R(g, 98, y + 8, 2, 20, '#3a1c10'); R(g, 86, y + 17, 26, 2, '#3a1c10'); R(g, 88, y + 10, 5, 3, '#e8f8ff'); R(g, 82, y + 29, 34, 3, '#6a3420');
  // fireplace
  R(g, 164, y + 2, 44, 40, '#8a4a3a'); for (let j = y + 4; j < y + 40; j += 5) for (let i = 164 + ((j / 5) % 2) * 4; i < 206; i += 8) R(g, i, j, 7, 4, '#a0584a');
  R(g, 162, y + 2, 48, 4, '#6a3a2a'); ell(g, 172, y + 16, 28, 22, '#1a0a08'); R(g, 172, y + 27, 28, 15, '#1a0a08');
  R(g, 176, y + 36, 20, 4, '#5a3020'); R(g, 178, y + 34, 16, 3, '#7a4428');
  // shelves with pottery and jars
  for (const [sx, sy] of [[222, y + 12], [222, y + 28]]) {
    R(g, sx, sy + 8, 64, 3, '#5a2c14'); R(g, sx, sy + 8, 64, 1, '#8a4a28');
    for (let k = 0; k < 6; k++) {
      const col = choice(['#c86a3a', '#2aa08c', '#e8c060', '#8ad0ff', '#b88ad8', '#d84a3e']), px = sx + 3 + k * 10;
      if (rng() < 0.5) { ell(g, px, sy, 8, 8, '#1b1420'); ell(g, px + 1, sy + 1, 6, 7, col); P(g, px + 2, sy + 2, '#fff'); }
      else { R(g, px + 1, sy + 1, 6, 7, '#1b1420'); R(g, px + 2, sy + 2, 4, 6, col); R(g, px + 2, sy, 4, 2, '#8a5a32'); }
    }
  }
  // hanging plants
  for (const hx of [72, 312]) { R(g, hx, y, 1, 10, '#3a2010'); ell(g, hx - 6, y + 10, 13, 9, '#8a4a28'); ell(g, hx - 8, y + 6, 17, 9, '#3e7428'); ell(g, hx - 5, y + 6, 8, 5, '#5e9a34'); R(g, hx - 7, y + 14, 2, 8, '#3e7428'); R(g, hx + 5, y + 14, 2, 6, '#3e7428'); }
  // doorway
  R(g, 176, y + h - 12, 32, 14, '#241208'); R(g, 178, y + h - 10, 28, 12, '#3a1c10'); R(g, 178, y + h - 10, 28, 2, '#f0d890');
  // rounded corners of the room
  g.fillStyle = '#0c0808';
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + sx * 26, cy); g.lineTo(cx, cy + sy * 26); g.fill();
  }
  // counter
  R(g, 232, 142, 70, 16, '#5a2c14'); R(g, 233, 142, 68, 7, '#b8693a'); R(g, 233, 142, 68, 2, '#e09a5e'); R(g, 236, 150, 62, 1, '#7a3e22');
  g.drawImage(barrelSprite(), 72, 172); g.drawImage(barrelSprite(), 300, 172); g.drawImage(crateSprite(), 286, 172);
  g.drawImage(bushSprite(1), 300, 46);
  return c;
}
// warm light that moves: fireplace flicker, window shaft, lamp glow
function drawShopLights(t) {
  ctx.globalCompositeOperation = 'lighter';
  const f = 1 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.03;
  const glow = (x, y, r, col) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  glow(186, 46, 70 * f, 'rgba(255,150,60,0.22)');
  glow(268, 138, 40, 'rgba(255,200,120,0.12)');
  ctx.fillStyle = 'rgba(255,240,190,0.07)';
  ctx.beginPath(); ctx.moveTo(86, 36); ctx.lineTo(112, 36); ctx.lineTo(170, 150); ctx.lineTo(128, 150); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // live fire
  for (let i = 0; i < 5; i++) { const fx = 178 + i * 4, fh = 5 + ((Math.sin(t * 11 + i * 2) + 1) * 3 | 0); R(ctx, fx, 48 - fh, 3, fh, '#f0602a'); R(ctx, fx + 1, 48 - fh + 2, 1, fh - 2, '#ffc040'); }
}

class ShopScene {
  constructor() {
    this.parts = []; this.texts = []; this.rings = []; this.projs = []; this.pickups = []; this.enemies = [];
    this.bg = renderShopBG();
    this.player = new Player(SHOP_DOOR.x, 196); this.player.dir = 1;
    this.customers = []; this.open = false; this.timer = 0; this.spawnT = 2; this.sales = {}; this.thefts = []; this.served = 0; this.spawned = 0;
    this.closing = false; this.repStart = S.rep; this.t = 0;
    AudioSys.music('shop');
  }
  get world() { return this; }
  shake() { }
  solid(px, py) {
    const { x, y, w, h } = SHOP_ROOM;
    if (px < x + 12 || px > x + w - 12 || py < y + 46) return true;
    if (py > y + h - 12 && !(px > 178 && px < 206)) return true;
    // cut corners
    const cx = px - x, cy = py - y, rx = x + w - px, ry = y + h - py;
    if (cx + cy < 40 || rx + cy < 40 || cx + ry < 34 || rx + ry < 34) return true;
    for (let i = 0; i < tableCount(); i++) { const [tx, ty] = TABLE_POS[i]; if (px > tx - 12 && px < tx + 12 && py > ty - 8 && py < ty + 1) return true; }
    if (px > 232 && px < 302 && py > 144 && py < 158) return true; // counter
    if (Math.abs(px - CHEST_POS.x) < 11 && py > CHEST_POS.y - 8 && py < CHEST_POS.y + 2) return true;
    if (px > BED_POS.x - 11 && px < BED_POS.x + 12 && py > BED_POS.y - 28 && py < BED_POS.y + 1) return true;
    return false;
  }
  interactables() {
    const list = [];
    for (let i = 0; i < tableCount(); i++) { const [tx, ty] = TABLE_POS[i]; list.push({ x: tx, y: ty + 10, r: 16, label: 'Tables', fn: () => UI.open(new ShelfUI(i)) }); }
    list.push({ x: CHEST_POS.x, y: CHEST_POS.y + 10, r: 16, label: 'Storage chest', fn: () => UI.open(new ChestUI()) });
    list.push({ x: BED_POS.x + 12, y: BED_POS.y, r: 18, label: 'Bed', fn: () => this.useBed() });
    if (S.flags.finale) list.push({ x: 226, y: 66, r: 16, label: 'Aldric', fn: () => say([choice(['Your prices are too honest. I love it.', 'I sold a Golem Core for a sandwich once. Different times.', 'The door is quiet. Good. Let us keep it that way.', 'Sweep the floor, Keeper. Heroes still have customers.'])], { name: 'Aldric', portrait: aldricPortrait() }) });
    if (!this.open) {
      list.push({ x: REG_SPOT.x, y: REG_SPOT.y, r: 16, label: S.phase === 'day' && !S.shopOpenedToday ? 'Open shop' : 'Register', fn: () => this.tryOpen() });
      list.push({ x: SHOP_DOOR.x, y: 200, r: 14, label: 'Exit', fn: () => Game.goTown('shop') });
    } else {
      const front = this.customers.find(c => c.state === 'queue' && c.qi === 0 && c.arrived);
      if (front) list.push({ x: REG_SPOT.x, y: REG_SPOT.y, r: 14, label: `Charge ${fmt(front.carry.price * front.carry.n)}`, fn: () => this.charge(front) });
    }
    return list;
  }
  tryOpen() {
    if (S.phase !== 'day') { say(['The town is asleep. Customers come by during the day.', 'Rest in your bed to start a new day.']); return; }
    if (S.shopOpenedToday) { say(['You already opened the shop today. Time for an adventure, or some rest!']); return; }
    const any = S.shelves.slice(0, tableCount()).some(t => t && t.item);
    if (!any) { say(['Your tables are empty! Put some items on them and set their prices first.']); return; }
    ask('Open the shop for the day?', () => this.openShop());
  }
  openShop() {
    this.open = true; this.timer = 0; this.spawnT = 1.5; S.shopOpenedToday = true; sfx('bell');
    this.maxCustomers = 5 + Math.floor(S.rep / 8) + (S.invest.decor ? 3 : 0) + (S.invest.shop || 0) * 2;
    toast('The shop is open!', C.mint);
    if (!S.flags.tipShop) { S.flags.tipShop = true; UI.open(new TipUI('shop')); }
  }
  useBed() {
    if (this.open) { say(['Not while the shop is open!']); return; }
    if (S.phase === 'night') ask('Sleep until morning? (The game will be saved.)', () => Game.sleep());
    else ask(S.shopOpenedToday ? 'Rest until nightfall?' : 'Rest until nightfall? The shop will stay closed today.', () => { S.phase = 'night'; S.shopOpenedToday = true; Game.fade(() => { saveGame(); toast('Night has fallen.', '#a8c0ff'); }); });
  }
  charge(c) {
    const total = c.carry.price * c.carry.n;
    S.gold += total; sfx('cash'); this.served++;
    const rec = this.sales[c.carry.id] || (this.sales[c.carry.id] = { n: 0, gold: 0 });
    rec.n += c.carry.n; rec.gold += total;
    S.stats.sold += c.carry.n; S.stats.earned += total;
    const note = noteSeen(c.carry.id); note.sold += c.carry.n;
    FX.text(this, REGISTER.x, REGISTER.y - 20, '+' + fmt(total), C.gold, 9);
    FX.burst(this, REGISTER.x, REGISTER.y - 10, [C.gold, '#fff6d0'], 10, 50, { grav: 120, up: 40 });
    c.carry = null; c.leave(this);
    this.customers.filter(o => o.state === 'queue').forEach(o => { o.qi--; o.arrived = false; });
  }
  spawnCustomer() {
    const thiefChance = this.spawned >= 2 ? 0.1 + S.day * 0.005 : 0;
    const thief = Math.random() < Math.min(0.2, thiefChance);
    let look;
    if (thief) look = THIEF_LOOK;
    else {
      const level = S.invest.shop || 0;
      const pool = LOOKS.filter(l => l.kind !== 'rich' || level >= 1 || Math.random() < 0.15);
      look = choice(pool);
    }
    const c = new Customer(look, thief);
    this.customers.push(c); this.spawned++;
    sfx('bell');
  }
  close() {
    this.open = false; this.closing = false;
    S.phase = 'night';
    UI.open(new BalanceUI(this.sales, this.thefts, S.rep - this.repStart, () => { saveGame(); }));
  }
  update(dt) {
    this.t += dt;
    const p = this.player;
    if (Input.pressed('START')) { UI.open(new PauseUI()); return; }
    if (Input.pressed('SELECT')) { UI.open(new InventoryUI({})); return; }
    p.update(dt, this, 'shop');
    // shop timing
    if (this.open) {
      this.timer = Math.min(1, this.timer + dt / SHOP_DAY_LEN);
      const stock = S.shelves.slice(0, tableCount()).some(t => t && t.item);
      const active = this.customers.length;
      this.spawnT -= dt;
      const conc = 2 + Math.floor(S.rep / 30) + (S.invest.shop || 0);
      if (this.spawnT <= 0 && this.timer < 0.95 && stock && this.spawned < this.maxCustomers && active < conc) {
        this.spawnCustomer(); this.spawnT = rand(5, 9) * (1 - S.rep / 250);
      }
      // close once the day is over (or stock / customers ran out) and everyone has left
      if ((this.timer >= 1 || !stock || this.spawned >= this.maxCustomers) && this.customers.length === 0) this.close();
    }
    for (const c of this.customers) c.update(dt, this);
    this.customers = this.customers.filter(c => !c.gone);
    updateFX(this, dt);
    // interactions
    this.near = null; let best = 1e9;
    for (const it of this.interactables()) { const d = dist(p.x, p.y, it.x, it.y); if (d < it.r && d < best) { best = d; this.near = it; } }
    if (this.near && Input.pressed('A')) { sfx('select'); this.near.fn(); }
    // leaving through the door while closed
    if (p.y > 208 && !this.open) Game.goTown('shop');
    if (p.y > 206 && this.open) { p.y = 204; toast('Close up shop before leaving! Customers are waiting.'); }
  }
  draw() {
    ctx.drawImage(this.bg, 0, 0);
    const list = [];
    for (let i = 0; i < tableCount(); i++) {
      const [tx, ty] = TABLE_POS[i], sh = S.shelves[i];
      list.push({ y: ty, draw: () => {
        drawSpr(tableSprite(), tx, ty + 6);
        if (sh && sh.item) {
          const ic = itemIcon(sh.item.id);
          ctx.drawImage(ic, tx - ic.width / 2, ty - 13);
          if (sh.item.n > 1) txt(sh.item.n, tx + 9, ty - 1, { size: 6, color: '#fff', outline: '#1b1420' });
        }
      } });
    }
    list.push({ y: REGISTER.y, draw: () => drawSpr(registerSprite(), REGISTER.x, REGISTER.y - 4) });
    list.push({ y: CHEST_POS.y, draw: () => drawSpr(chestSprite(false, false), CHEST_POS.x, CHEST_POS.y + 2) });
    list.push({ y: BED_POS.y, draw: () => drawSpr(bedSprite(), BED_POS.x + 1, BED_POS.y + 2) });
    if (S.flags.finale) list.push({ y: 62, draw: () => { shadow(226, 62, 12); drawSpr(personSprite(ALDRIC_LOOK, 0, 0, 'idle'), 226, 63); } });
    list.push(...this.customers, this.player);
    list.sort((a, b) => a.y - b.y);
    for (const o of list) o.draw ? o.draw(0, 0) : null;
    // price tags above tables
    for (let i = 0; i < tableCount(); i++) {
      const [tx, ty] = TABLE_POS[i], sh = S.shelves[i];
      if (!sh || !sh.item) continue;
      priceBubble(fmt(sh.price), tx, ty - 17);
    }
    drawShopLights(this.t);
    for (const c of this.customers) c.drawBubble();
    drawFX(this, 0, 0);
    if (this.near) worldPrompt(this.near.x, this.near.y - 26, [['A', this.near.label]]);
    this.drawHUD();
  }
  drawHUD() {
    drawHealthHUD(5, 5);
    // day/night progress bar like the balance screen
    if (this.open) {
      const x = W / 2 - 60, y = 6;
      R(ctx, x - 12, y, 144, 12, '#1b1420');
      ell(ctx, x - 10, y + 2, 8, 8, C.gold);
      R(ctx, x, y + 3, 120, 6, '#3a3a2a'); R(ctx, x, y + 3, 120 * this.timer, 6, C.teal); R(ctx, x, y + 3, 120 * this.timer, 1, C.mint);
      ell(ctx, x + 122, y + 2, 8, 8, '#e8e0c0'); ell(ctx, x + 124, y + 1, 7, 7, '#1b1420');
      txt(`Customers: ${this.served} served`, W / 2, y + 22, { size: 6, align: 'center', color: '#efe3c5', outline: '#1b1420' });
    } else {
      const s = S.phase === 'day' ? (S.shopOpenedToday ? 'Shop closed for today' : 'Shop closed: open it at the register') : 'Night: the town sleeps';
      txt(s, W / 2, 14, { size: 7, align: 'center', color: '#efe3c5', outline: '#1b1420' });
    }
    txt(`Popularity ${S.rep | 0}`, W - 8, 14, { size: 6, align: 'right', color: '#efe3c5', outline: '#1b1420' });
  }
}

class Customer {
  constructor(look, thief) {
    this.look = look; this.thief = thief;
    const kind = CUSTOMER_KINDS[look.kind || 'villager'] || CUSTOMER_KINDS.villager;
    this.tol = thief ? 1 : kind.tol * rand(0.98, 1.02); this.budget = kind.budget * (1 + (S.invest.shop || 0));
    this.x = SHOP_DOOR.x; this.y = SHOP_DOOR.y; this.dir = 1; this.anim = 0;
    this.path = []; this.state = 'enter'; this.st = 0; this.tries = 0; this.bubble = null; this.carry = null; this.patience = 38;
    this.speed = thief ? 42 : 34; this.visited = new Set();
    this.pickTable();
  }
  pickTable(sc) {
    const scn = sc || Game.scene;
    const opts = [];
    for (let i = 0; i < tableCount(); i++) {
      const t = S.shelves[i];
      if (!t || !t.item || this.visited.has(i)) continue;
      if (scn.customers && scn.customers.some(c => c !== this && c.target === i && ['enter', 'goto', 'browse', 'react'].includes(c.state))) continue;
      if (!this.thief && t.price * t.item.n > this.budget && Math.random() < 0.8) continue;
      opts.push(i);
    }
    if (!opts.length) { this.target = null; return false; }
    this.target = choice(opts); this.visited.add(this.target);
    const [tx, ty] = TABLE_POS[this.target];
    const ay = ty + 14;
    this.path = [[192, 152], [192, ay], [tx, ay]];
    this.state = 'goto';
    return true;
  }
  leave(sc) {
    this.state = 'leave';
    this.path = [[this.x, Math.max(this.y, 152)], [192, Math.max(this.y, 152)], [192, 200], [SHOP_DOOR.x, SHOP_DOOR.y + 6]];
    if (this.y < 152 && Math.abs(this.x - 192) > 2) this.path.unshift([this.x, this.y]);
  }
  walk(dt, sp) {
    if (!this.path.length) return true;
    const [tx, ty] = this.path[0];
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (d < 1.5) { this.path.shift(); return !this.path.length; }
    const m = Math.min(d, sp * dt);
    this.x += dx / d * m; this.y += dy / d * m;
    this.dir = dirFromVec(dx, dy); this.anim += dt * 8;
    return false;
  }
  update(dt, sc) {
    this.st += dt;
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
    const p = sc.player;
    switch (this.state) {
      case 'enter': case 'goto':
        if (this.target == null) { this.leave(sc); break; }
        if (!S.shelves[this.target] || !S.shelves[this.target].item) { if (!this.pickTable(sc)) this.leave(sc); break; }
        if (this.walk(dt, this.speed)) { this.state = 'browse'; this.st = 0; this.dir = 1; this.bubble = { kind: 'thinking', t: 99 }; }
        break;
      case 'browse': {
        const t = S.shelves[this.target];
        if (!t || !t.item) { this.bubble = null; if (!this.pickTable(sc)) this.leave(sc); break; }
        if (this.st > (this.thief ? 1.0 : rand(1.6, 2.4))) {
          if (this.thief) {
            this.carry = { ...t.item, price: t.price, table: this.target }; S.shelves[this.target].item = null;
            this.bubble = { kind: '!', t: 99 }; this.state = 'run'; this.st = 0; sfx('alarm');
            this.path = [[this.x, this.y + 14], [192, Math.max(this.y + 14, 152)], [192, 200], [SHOP_DOOR.x, SHOP_DOOR.y + 8]];
            toast('Thief! Roll into them!', '#ff9a8a');
            break;
          }
          const re = reactionFor(t.item.id, t.price, this);
          const note = noteSeen(t.item.id); note.r[re] = t.price;
          this.bubble = { kind: re, t: 1.6 }; this.state = 'react'; this.st = 0;
          this.reaction = re;
          if (re === 'content') S.rep = Math.min(100, S.rep + 1.5);
          if (re === 'ecstatic') S.rep = Math.min(100, S.rep + 1);
          if (re === 'expensive') { S.pop[t.item.id] = clamp((S.pop[t.item.id] || 0) - 0.25, -1, 1); S.rep = Math.max(0, S.rep - 1); }
          if (re === 'angry') { S.pop[t.item.id] = clamp((S.pop[t.item.id] || 0) - 0.1, -1, 1); S.rep = Math.max(0, S.rep - 2); }
          sfx(re === 'angry' ? 'error' : 'select');
        }
        break;
      }
      case 'react':
        if (this.st > 1.3) {
          const t = S.shelves[this.target];
          if (this.reaction !== 'angry' && t && t.item) {
            this.carry = { ...t.item, price: t.price }; t.item = null;
            S.pop[this.carry.id] = clamp((S.pop[this.carry.id] || 0) - 0.08 * this.carry.n / 3, -1, 1);
            // join the queue
            const q = sc.customers.filter(c => c.state === 'queue').length;
            this.qi = q; this.state = 'queue'; this.arrived = false; this.st = 0;
            const [qx, qy] = QUEUE_POS[Math.min(q, QUEUE_POS.length - 1)];
            this.path = [[this.x, Math.max(this.y, 152)], [192, Math.max(this.y, 152)], [192, 184], [qx, qy]];
          } else if (++this.tries < 2 && this.pickTable(sc)) { /* try another table */ }
          else this.leave(sc);
        }
        break;
      case 'queue': {
        const [qx, qy] = QUEUE_POS[Math.min(this.qi, QUEUE_POS.length - 1)];
        if (!this.path.length && (Math.abs(this.x - qx) > 1 || Math.abs(this.y - qy) > 1)) this.path = [[qx, qy]];
        if (this.walk(dt, this.speed)) { this.arrived = true; this.dir = 1; }
        this.patience -= dt;
        if (this.qi === 0 && this.arrived && dist(p.x, p.y, REG_SPOT.x, REG_SPOT.y) > 30 && Math.random() < dt * 0.3) this.bubble = { kind: 'wait', t: 1.2 };
        if (this.patience <= 0) {
          // give up: put the item back
          const idx = S.shelves.findIndex((t, i) => i < tableCount() && t && !t.item);
          if (idx >= 0) S.shelves[idx].item = { id: this.carry.id, n: this.carry.n, curse: this.carry.curse || null };
          else chestAdd({ id: this.carry.id, n: this.carry.n });
          this.carry = null; S.rep = Math.max(0, S.rep - 3);
          this.bubble = { kind: 'angry', t: 1.5 }; toast('A customer got tired of waiting...', '#ffb0a0');
          sc.customers.filter(o => o.state === 'queue' && o.qi > this.qi).forEach(o => { o.qi--; o.arrived = false; });
          this.leave(sc);
        }
        break;
      }
      case 'run': {
        if (this.walk(dt, 58)) {
          this.gone = true;
          sc.thefts.push(this.carry); S.rep = Math.max(0, S.rep - 2);
          toast(`The thief escaped with ${ITEMS[this.carry.id].name}!`, '#ff9a8a');
        }
        if (p.state === 'roll' && dist(p.x, p.y, this.x, this.y) < 12 || (p.state !== 'roll' && dist(p.x, p.y, this.x, this.y) < 8 && Math.random() < dt * 2)) {
          // caught!
          sfx('hit'); FX.burst(sc, this.x, this.y - 10, ['#fff', C.gold], 12, 60); FX.text(sc, this.x, this.y - 28, 'Caught!', C.mint);
          const t = S.shelves[this.carry.table];
          if (t && !t.item) t.item = { id: this.carry.id, n: this.carry.n, curse: this.carry.curse || null };
          else chestAdd({ id: this.carry.id, n: this.carry.n });
          this.carry = null; this.bubble = { kind: 'angry', t: 1 }; S.rep = Math.min(100, S.rep + 2);
          this.speed = 70; this.leave(sc);
        }
        break;
      }
      case 'leave':
        if (this.walk(dt, this.speed)) this.gone = true;
        break;
    }
  }
  draw() {
    const x = Math.round(this.x), y = Math.round(this.y);
    shadow(x, y, 12);
    const moving = this.path.length > 0;
    const pose = this.state === 'run' ? 'walk' : moving ? 'walk' : 'idle';
    drawSpr(personSprite(this.look, this.dir, Math.floor(this.anim) % 4, pose), x, y + 1);
    if (this.carry && this.state !== 'run') { const ic = itemIcon(this.carry.id); ctx.drawImage(ic, x - 6, y - 26, 10, 10); }
    if (this.carry && this.state === 'run') { const ic = itemIcon(this.carry.id); ctx.drawImage(ic, x - 5, y - 30); }
  }
  drawBubble() {
    if (!this.bubble) return;
    const x = Math.round(this.x), y = Math.round(this.y) - 36;
    roundBubble(x - 11, y - 10, 22, 18, '#f7efd8', x);
    const k = this.bubble.kind;
    if (k === '!') txt('!', x, y + 4, { size: 11, align: 'center', color: C.red, bold: true });
    else if (k === 'wait') txt('...', x, y + 2, { size: 8, align: 'center', color: C.paperDark });
    else if (k === 'thinking') { const n = 1 + Math.floor(Game.time * 3) % 3; txt('.'.repeat(n), x - 4, y + 2, { size: 8, color: C.paperDark }); }
    else ctx.drawImage(faceIcon(k), x - 7, y - 8);
  }
}
