'use strict';
// ============================================================================
//  MINI GAME: Pip the travelling juggler drops by the shop once a day and
//  plays Cups: follow the coin while he shuffles. Find it and he tips you.
// ============================================================================

const PIP_LOOK = { id: 'pip', skin: '#f0c49a', hair: '#d8702a', hairStyle: 'short', shirt: '#2f8a80', pants: '#4a3050', hat: 'feather', hatCol: '#c8384a', scarf: '#e8c060' };
const PIP_SPOT = { x: 232, y: 118 };
function pipPortrait() {
  return cached('pipPortrait', () => {
    const src = personSprite(PIP_LOOK, 0, 0, 'idle');
    const c = mkCanvas(src.width * 2, 22 * 2), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 10, src.width, 22, 0, 0, src.width * 2, 44);
    return c;
  });
}
const PIP_BALLS = ['#e24a5a', '#eab432', '#44c6ee'];

class Gambler {
  constructor() {
    this.look = PIP_LOOK; this.x = SHOP_DOOR.x; this.y = SHOP_DOOR.y; this.dir = 1; this.anim = 0;
    this.state = 'enter'; this.st = 0; this.bubble = null; this.wait = 55;
    this.path = [[192, 200], [192, 120], [PIP_SPOT.x, PIP_SPOT.y]];
  }
  walk(dt, sp) {
    if (!this.path.length) return true;
    const [tx, ty] = this.path[0], dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    if (d < 1.5) { this.path.shift(); return !this.path.length; }
    const m = Math.min(d, sp * dt); this.x += dx / d * m; this.y += dy / d * m;
    this.dir = dirFromVec(dx, dy); this.anim += dt * 8;
    return false;
  }
  update(dt, sc) {
    this.st += dt;
    if (this.bubble) { this.bubble.t -= dt; this.bubble.age = (this.bubble.age || 0) + dt; if (this.bubble.t <= 0) this.bubble = null; }
    const p = sc.player;
    if (this.state === 'enter' && this.walk(dt, 36)) {
      this.state = 'wait'; this.st = 0; this.dir = 0;
      toast('Pip the juggler wants to play Cups!', C.gold);
    } else if (this.state === 'wait') {
      this.wait -= dt;
      const near = dist(p.x, p.y, this.x, this.y) < 60;
      if (near && !this.bubble) this.bubble = { kind: 'cups', t: 99 };
      if (!near && this.bubble && this.bubble.kind === 'cups') this.bubble = null;
      if (Math.abs(p.x - this.x) + Math.abs(p.y - this.y) < 80) this.dir = dirFromVec(p.x - this.x, p.y - this.y);
      if (this.wait <= 0 || sc.timer >= 0.95 || !sc.open) this.leave();
    } else if (this.state === 'after') {
      if (this.st > 1.6) this.leave();
    } else if (this.state === 'leave' && this.walk(dt, 40)) this.gone = true;
  }
  leave() {
    this.state = 'leave'; this.bubble = null;
    this.path = [[192, this.y], [192, 200], [SHOP_DOOR.x, SHOP_DOOR.y + 6]];
  }
  offer(sc) {
    const first = !S.flags.metPip;
    const lines = first
      ? ['Pip\'s the name, juggling\'s the game! Care for a little round of Cups?', 'Follow the coin while I shuffle. Find it and I\'ll tip you. Lose, and you lose nothing!']
      : [choice(['Back again, shopkeeper? My cups missed you!', 'Sharp eyes today? Let\'s find out!', 'The coin is shy, but you are sharper. Maybe!'])];
    S.flags.metPip = true;
    say(lines, { name: 'Pip', portrait: pipPortrait(), onDone: () => ask('Play Cups with Pip?', () => { this.state = 'play'; this.bubble = null; UI.open(new ShellGameUI(sc, this)); }) });
  }
  after(total) {
    this.state = 'after'; this.st = 0;
    this.bubble = { kind: total > 0 ? 'content' : 'ecstatic', t: 1.6 };
  }
  draw() {
    const x = Math.round(this.x), y = Math.round(this.y);
    shadow(x, y, 12);
    const moving = this.path.length > 0 && this.state !== 'wait';
    drawSpr(personSprite(this.look, this.dir, Math.floor(this.anim) % 4, moving ? 'walk' : 'idle'), x, y + 1);
    // juggling while he waits for a challenger
    if (this.state === 'wait' && !this.bubble) {
      for (let i = 0; i < 3; i++) {
        const a = Game.time * 5 + i * 2.09;
        const bx = x + Math.cos(a) * 7, by = y - 38 - Math.abs(Math.sin(a)) * 10;
        R(ctx, Math.round(bx) - 1, Math.round(by) - 1, 3, 3, '#1b1420'); P(ctx, Math.round(bx), Math.round(by), PIP_BALLS[i]);
      }
    }
  }
  drawBubble() {
    if (!this.bubble) return;
    const x = Math.round(this.x), y = Math.round(this.y) - 44;
    const a = this.bubble.age || 0, s = a < 0.22 ? easeOut(a / 0.22) * 1.15 - Math.max(0, a - 0.14) * 1.9 : 1;
    ctx.save(); ctx.translate(x, y + 8); ctx.scale(s, s); ctx.translate(-x, -(y + 8));
    if (this.bubble.kind === 'cups') {
      roundBubble(x - 15, y - 10, 30, 18, '#f7efd8', x);
      for (let i = 0; i < 3; i++) ctx.drawImage(cupSprite(true), x - 13 + i * 9, y - 7);
      if (Math.sin(Game.time * 6) > 0) ctx.drawImage(coinIcon(), x - 3, y + 1);
    } else { roundBubble(x - 11, y - 10, 22, 18, '#f7efd8', x); ctx.drawImage(faceIcon(this.bubble.kind), x - 7, y - 8); }
    ctx.restore();
  }
}

// clay cup, upside down (small = the icon in Pip's speech bubble)
function cupSprite(small = false) {
  return cached('cup' + small, () => {
    const w = small ? 7 : 22, h = small ? 8 : 22;
    return sprite(w, h, g => {
      const body = '#c0703e', dark = '#8a4626', lite = '#e8a060';
      for (let j = 0; j < h - (small ? 1 : 3); j++) {
        const k = j / (h - 1), ww = Math.round((small ? 5 : 14) + k * (small ? 2 : 7)), x0 = Math.round((w - ww) / 2);
        R(g, x0, j, ww, 1, body); P(g, x0 + ww - 1, j, dark); if (!small) { P(g, x0 + ww - 2, j, dark); P(g, x0 + 2, j, lite); }
      }
      if (small) { R(g, 0, h - 1, w, 1, dark); return; }
      R(g, 0, h - 3, w, 3, '#7a3a20'); R(g, 0, h - 3, w, 1, '#a85a30');
      R(g, 7, 0, 8, 2, '#a85a30'); R(g, 5, 7, 12, 1, dark); R(g, 5, 8, 12, 1, lite);
    });
  });
}

class ShellGameUI extends Overlay {
  constructor(sc, pip) {
    super(); this.sc = sc; this.pip = pip; this.round = 0; this.total = 0; this.parts = []; this.sel = 1;
    this.newRound();
  }
  slotX(i) { return W / 2 + (i - 1) * 62; }
  tipFor(r) { return Math.round((20 + S.day * 8 + S.rep * 0.4) / 5) * 5 * r; }
  newRound() {
    this.round++; this.phase = 'show'; this.pt = 0; this.win = null; this.pick = -1;
    this.coin = randi(0, 2);
    this.cups = [0, 1, 2].map(i => ({ slot: i, x: this.slotX(i), y: 0, lift: 0 }));
    this.swapsLeft = [5, 8, 11][this.round - 1]; this.swapDur = [0.38, 0.27, 0.19][this.round - 1]; this.swap = null;
    sfx('confirm');
  }
  cupAt(slot) { return this.cups.findIndex(c => c.slot === slot); }
  choose(slot) {
    if (this.phase !== 'pick') return;
    this.pick = slot; this.phase = 'reveal'; this.pt = 0; this.win = this.cupAt(slot) === this.coin; this.sel = slot;
    sfx('select');
  }
  update(dt) {
    super.update(dt); this.pt += dt;
    for (const p of this.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }
    this.parts = this.parts.filter(p => p.t < 1.2);
    if (this.phase === 'show') {
      const c = this.cups[this.coin];
      c.lift = this.pt < 0.3 ? easeOut(this.pt / 0.3) : this.pt < 1.4 ? 1 : Math.max(0, 1 - (this.pt - 1.4) / 0.25);
      if (this.pt > 1.7) { c.lift = 0; this.phase = 'shuffle'; this.pt = 0; }
    } else if (this.phase === 'shuffle') {
      if (!this.swap) {
        const a = randi(0, 2); let b = randi(0, 1); if (b >= a) b++;
        this.swap = { a: this.cupAt(a), b: this.cupAt(b), sa: a, sb: b, t: 0 }; sfx('move');
      }
      const sw = this.swap; sw.t += dt / this.swapDur;
      const e = ease(Math.min(1, sw.t)), A = this.cups[sw.a], B = this.cups[sw.b];
      A.x = lerp(this.slotX(sw.sa), this.slotX(sw.sb), e); A.y = -Math.sin(e * Math.PI) * 10;
      B.x = lerp(this.slotX(sw.sb), this.slotX(sw.sa), e); B.y = Math.sin(e * Math.PI) * 6;
      if (sw.t >= 1) {
        A.slot = sw.sb; B.slot = sw.sa; A.y = B.y = 0; this.swap = null;
        if (--this.swapsLeft <= 0) { this.phase = 'pick'; this.pt = 0; Input.clearAll(); }
      }
    } else if (this.phase === 'pick') {
      const d = Input.dir();
      if (d === 'L') { this.sel = (this.sel + 2) % 3; sfx('move'); }
      if (d === 'R') { this.sel = (this.sel + 1) % 3; sfx('move'); }
      for (let i = 0; i < 3; i++) if (Input.tapIn(this.slotX(i) - 16, 118, 32, 40)) { Input.eatTap(); this.choose(i); return; }
      if (Input.pressed('A')) this.choose(this.sel);
    } else if (this.phase === 'reveal') {
      const c = this.cups[this.cupAt(this.pick)];
      c.lift = easeOut(Math.min(1, this.pt / 0.25));
      if (!this.win && this.pt > 0.55) this.cups[this.coin].lift = easeOut(Math.min(1, (this.pt - 0.55) / 0.25));
      if (this.pt > (this.win ? 0.5 : 1.0)) {
        this.phase = 'result'; this.pt = 0;
        if (this.win) {
          const tip = this.tipFor(this.round); this.tip = tip; this.total += tip; S.gold += tip; sfx('cash'); HUD.goldPulse = 0.4;
          for (let i = 0; i < 16; i++) this.parts.push({ x: this.slotX(this.pick), y: 138, vx: rand(-70, 70), vy: -rand(90, 170), t: 0 });
        } else sfx('error');
      }
    } else if (this.phase === 'result' && this.pt > 0.4) {
      const more = this.win && this.round < 3;
      if (Input.pressed('A')) { if (more) this.newRound(); else this.finish(); }
      else if (Input.pressed('B') || (Input.tap() && !more)) this.finish();
    }
  }
  finish() {
    this.close(); sfx('confirm');
    if (this.total > 0) { toast(`Pip tipped you ${fmt(this.total)} gold!`, C.gold); S.rep = Math.min(100, S.rep + 1); }
    this.pip.after(this.total);
  }
  draw() {
    dimScreen(0.62);
    const cx = W / 2, x0 = cx - 118, y0 = 66, w = 236, h = 110;
    // title plate with Pip
    R(ctx, cx - 60, 14, 120, 16, '#1b1420'); R(ctx, cx - 59, 15, 118, 14, C.teal); R(ctx, cx - 59, 15, 118, 1, C.mint);
    txt('CUPS WITH PIP', cx, 25.5, { size: 8, align: 'center', color: '#f3eedb', fam: FONT_TITLE });
    txt(`Round ${this.round}/3`, cx - 58, 42, { size: 7, color: '#efe3c5', outline: '#1b1420' });
    txt(`Prize ${fmt(this.tipFor(this.round))}`, cx + 58, 42, { size: 7, align: 'right', color: C.gold, outline: '#1b1420' });
    ctx.drawImage(coinIcon(), cx + 60, 36);
    // Pip behind the table, arms busy
    const pf = this.phase === 'shuffle' ? Math.floor(this.t * 10) % 4 : 0;
    drawSpr(personSprite(PIP_LOOK, 0, pf, this.phase === 'shuffle' ? 'walk' : 'idle'), cx, y0 + 12);
    // felt table with a wooden rim
    R(ctx, x0 + 3, y0 + 5, w, h, 'rgba(0,0,0,0.4)');
    R(ctx, x0 + 2, y0, w - 4, h, '#4a2412'); R(ctx, x0, y0 + 2, w, h - 4, '#4a2412');
    R(ctx, x0 + 3, y0 + 2, w - 6, h - 4, '#8a4a28'); R(ctx, x0 + 3, y0 + 2, w - 6, 1, '#b8703e');
    R(ctx, x0 + 7, y0 + 6, w - 14, h - 12, '#1d3b23'); R(ctx, x0 + 8, y0 + 7, w - 16, h - 14, '#2d5e36');
    ell(ctx, cx - 90, y0 + 24, 180, 70, '#346a3e');
    for (let j = y0 + 10; j < y0 + h - 8; j += 5) for (let i = x0 + 12 + ((j / 5) & 1) * 3; i < x0 + w - 12; i += 6) P(ctx, i, j, '#2a5432');
    // coin under its cup (visible while lifted)
    const baseY = 152;
    const coinCup = this.cups[this.coin];
    { const x = Math.round(coinCup.x), y = baseY - 6; ell(ctx, x - 5, y - 2, 11, 8, '#1b1420'); ell(ctx, x - 4, y - 1, 9, 6, C.gold2); ell(ctx, x - 4, y - 1, 8, 5, C.gold); P(ctx, x - 2, y, '#fff6d0'); }
    // cups (back ones first)
    const order = [0, 1, 2].sort((a, b) => this.cups[a].y - this.cups[b].y);
    for (const i of order) {
      const c = this.cups[i], x = Math.round(c.x), y = Math.round(baseY + c.y * 0.6 - c.lift * 22);
      ctx.globalAlpha = 0.35; ell(ctx, x - 12, baseY + c.y * 0.6 - 3, 24, 6, '#000'); ctx.globalAlpha = 1;
      const img = cupSprite();
      ctx.drawImage(img, x - img.width / 2, y - img.height + 2);
    }
    // choice cursor
    if (this.phase === 'pick') {
      const x = this.slotX(this.sel), b = Math.round(Math.abs(Math.sin(this.t * 6)) * 3);
      R(ctx, x - 3, 110 - b, 7, 2, '#f3eedb'); R(ctx, x - 2, 112 - b, 5, 1, '#f3eedb'); R(ctx, x - 1, 113 - b, 3, 1, '#f3eedb'); P(ctx, x, 114 - b, '#f3eedb');
    }
    // coins bursting out on a win
    for (const p of this.parts) ctx.drawImage(coinIcon(), Math.round(p.x) - 3, Math.round(p.y) - 3);
    // what to do
    const msg = this.phase === 'show' ? 'Watch the coin...' : this.phase === 'shuffle' ? 'Shuffling!' : this.phase === 'pick' ? 'Which cup hides the coin?'
      : this.phase === 'reveal' ? '...' : this.win ? `Found it! +${fmt(this.tip)} gold` : 'Not that one! Better luck next time.';
    txt(msg, cx, y0 + h + 16, { size: 8, align: 'center', color: this.phase === 'result' ? (this.win ? C.gold : '#ff9a8a') : '#efe3c5', outline: '#1b1420' });
    if (this.phase === 'pick') promptBar([['◀▶', 'Choose'], ['A', 'This one!']], H - 6);
    if (this.phase === 'result' && this.pt > 0.4) promptBar(this.win && this.round < 3 ? [['A', 'Next round (faster)'], ['B', `Stop (+${fmt(this.total)})`]] : [['A', 'Done']], H - 6);
  }
}
