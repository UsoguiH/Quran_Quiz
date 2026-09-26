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
  // floor planks
  R(g, x, y, w, h, '#c98a4e');
  for (let j = y; j < y + h; j += 6) { R(g, x, j, w, 1, '#a86a38'); for (let i = x + (rng() * 20 | 0); i < x + w; i += 24 + (rng() * 20 | 0)) R(g, i, j, 1, 6, '#a86a38'); }
  for (let i = 0; i < 80; i++) P(g, x + rng() * w, y + rng() * h, '#d89a5e');
  // rug
  R(g, 120, 104, 70, 46, '#8a2a2a'); R(g, 122, 106, 66, 42, '#b8403a'); R(g, 126, 110, 58, 34, '#3f8f7a'); R(g, 130, 114, 50, 26, '#b8403a');
  for (let i = 0; i < 6; i++) { P(g, 124 + i * 12, 104, '#e8d0a0'); P(g, 124 + i * 12, 149, '#e8d0a0'); }
  // top wall
  R(g, x, y, w, 40, '#8a4a28'); for (let j = y; j < y + 40; j += 5) R(g, x, j, w, 1, '#6a3418');
  for (let i = x; i < x + w; i += 22) R(g, i, y, 2, 40, '#5a2c14');
  R(g, x, y + 38, w, 4, '#5a2c14'); R(g, x, y + 42, w, 3, 'rgba(0,0,0,0.25)');
  // windows on the top wall
  for (const wx of [96, 236]) { R(g, wx - 1, y + 7, 26, 20, '#3a1c10'); R(g, wx, y + 8, 24, 18, '#9ad0e8'); R(g, wx + 11, y + 8, 2, 18, '#3a1c10'); R(g, wx, y + 16, 24, 2, '#3a1c10'); R(g, wx + 2, y + 10, 4, 3, '#e8f8ff'); }
  // shelves with jars
  for (const sx of [140, 184]) {
    R(g, sx, y + 20, 36, 3, '#5a2c14');
    for (let k = 0; k < 4; k++) { const col = choice(['#3fae8f', '#d8403a', '#e8c060', '#8ad0ff', '#b88ad8']); R(g, sx + 2 + k * 9, y + 13, 6, 7, '#1b1420'); R(g, sx + 3 + k * 9, y + 14, 4, 5, col); }
  }
  // side walls
  R(g, x, y, 10, h, '#6a3418'); R(g, x + w - 10, y, 10, h, '#6a3418');
  for (let j = y; j < y + h; j += 5) { R(g, x, j, 10, 1, '#5a2c14'); R(g, x + w - 10, j, 10, 1, '#5a2c14'); }
  // bottom wall with doorway
  R(g, x, y + h - 10, w, 10, '#6a3418');
  R(g, 176, y + h - 12, 32, 14, '#241208'); R(g, 178, y + h - 10, 28, 12, '#3a1c10');
  // cut corners (octagonal room)
  g.fillStyle = '#0c0808';
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + sx * 26, cy); g.lineTo(cx, cy + sy * 26); g.fill();
  }
  // counter (drawn in bg; register sprite on top)
  R(g, 232, 142, 70, 16, '#5a2c14'); R(g, 233, 142, 68, 6, '#b8693a'); R(g, 233, 142, 68, 2, '#d88a52');
  // plants & barrels
  g.drawImage(barrelSprite(), 72, 172); g.drawImage(barrelSprite(), 300, 172);
  g.drawImage(bushSprite(1), 300, 46);
  return c;
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
    list.push(...this.customers, this.player);
    list.sort((a, b) => a.y - b.y);
    for (const o of list) o.draw ? o.draw(0, 0) : null;
    // price tags above tables
    for (let i = 0; i < tableCount(); i++) {
      const [tx, ty] = TABLE_POS[i], sh = S.shelves[i];
      if (!sh || !sh.item) continue;
      const s = fmt(sh.price), w = textW(s, 6) + 6;
      R(ctx, tx - w / 2, ty - 26, w, 9, '#1b1420'); R(ctx, tx - w / 2 + 1, ty - 25, w - 2, 7, '#f4ecd6'); P(ctx, tx, ty - 17, '#1b1420');
      txt(s, tx, ty - 19.5, { size: 6, align: 'center', color: '#3a2e20' });
    }
    for (const c of this.customers) c.drawBubble();
    drawFX(this, 0, 0);
    if (this.near) worldPrompt(this.near.x, this.near.y - 26, [['A', this.near.label]]);
    this.drawHUD();
  }
  drawHUD() {
    goldBadge(6, 5);
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
    const x = Math.round(this.x), y = Math.round(this.y) - 34;
    R(ctx, x - 9, y - 9, 18, 16, '#1b1420'); R(ctx, x - 8, y - 8, 16, 14, '#f4ecd6'); R(ctx, x - 2, y + 6, 4, 2, '#1b1420'); R(ctx, x - 1, y + 6, 2, 1, '#f4ecd6');
    const k = this.bubble.kind;
    if (k === '!') txt('!', x, y + 4, { size: 11, align: 'center', color: C.red, bold: true });
    else if (k === 'wait') txt('...', x, y + 2, { size: 8, align: 'center', color: C.paperDark });
    else if (k === 'thinking') { const n = 1 + Math.floor(Game.time * 3) % 3; txt('.'.repeat(n), x - 4, y + 2, { size: 8, color: C.paperDark }); }
    else ctx.drawImage(faceIcon(k), x - 7, y - 7);
  }
}
