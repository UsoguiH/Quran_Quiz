'use strict';
// ============================================================================
//  HEALTH HUD: round portrait medallion, hearts, segmented red health bar and
//  a blue stamina bar with a twinkle. Getting hit cuts claw slashes across it;
//  dying drains it to a cold, desaturated state.
// ============================================================================

const HUD = {
  hit: 0, dead: 0, shake: 0, goldPulse: 0, slashes: [], drips: [], lastHp: null, ghost: 1,
  onHit(amount) {
    this.hit = 1; this.shake = 0.3;
    const n = amount > 20 ? 3 : 2;
    this.slashes = [];
    for (let i = 0; i < n; i++) this.slashes.push({ x: rand(-6, 30), y: rand(-8, 4), len: rand(26, 40), a: rand(0.85, 1.1), w: i === 0 ? 3 : 2, red: i === n - 1 });
    for (let i = 0; i < 7; i++) this.drips.push({ x: rand(10, 70), y: rand(4, 20), vx: rand(-20, 20), vy: rand(-30, 5), life: rand(0.4, 0.8) });
  },
  onDeath() { this.dead = 1; this.onHit(99); this.hit = 1.6; },
  reset() { this.dead = 0; this.hit = 0; this.slashes = []; this.drips = []; },
  update(dt) {
    this.hit = Math.max(0, this.hit - dt * 1.8); this.shake = Math.max(0, this.shake - dt); this.goldPulse = Math.max(0, this.goldPulse - dt);
    for (const d of this.drips) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 140 * dt; d.life -= dt; }
    this.drips = this.drips.filter(d => d.life > 0);
    if (S) {
      const frac = S.hp / playerStats().maxHp;
      this.ghost = this.ghost > frac ? Math.max(frac, this.ghost - dt * 0.6) : frac;
      if (S.hp > 0 && this.dead) this.reset();
    }
  },
};

const HP_COL = { red: '#ec3a4c', redHi: '#ff8a98', redLo: '#b0162e', empty: '#3a1624', gold: '#d8a458', goldHi: '#f4d49a', goldLo: '#8a5a2a', rim: '#2a1a14', blue: '#5ab8f4', blueHi: '#c4ecff', blueLo: '#2a78c0' };

// close-up of the plague doctor for the medallion
function hudPortrait(cold) {
  return cached('hudPortrait' + (cold ? 'C' : ''), () => {
    const c = mkCanvas(26, 26), g = c.getContext('2d');
    const bg = cold ? '#9aa4c0' : '#e8c49a', bg2 = cold ? '#7a84a4' : '#d8a878';
    ell(g, 0, 0, 26, 26, bg); ell(g, 2, 14, 24, 14, bg2);
    const k = cold ? '#2a2c3a' : '#141217', k2 = cold ? '#3e4254' : '#2a262e';
    // cloak shoulders + red scarf
    ell(g, 2, 17, 22, 14, k); R(g, 5, 18, 4, 8, cold ? '#b04050' : '#ff4d4a'); R(g, 5, 18, 1, 8, cold ? '#80303c' : '#b82a2e');
    // head, hat
    R(g, 8, 10, 10, 8, k);
    R(g, 7, 1, 11, 8, k); R(g, 8, 2, 1, 6, k2); R(g, 7, 7, 11, 1, k2);
    R(g, 3, 8, 19, 3, k); R(g, 3, 8, 4, 1, k2);
    // eyes & beak
    R(g, 10, 12, 7, 2, cold ? '#402030' : '#6e1a1e'); R(g, 11, 12, 2, 1, cold ? '#e0a0b0' : '#ff6a5e'); R(g, 14, 12, 2, 1, cold ? '#e0a0b0' : '#ff6a5e');
    R(g, 15, 14, 8, 3, cold ? '#8a8ea0' : '#86868c'); R(g, 23, 15, 2, 2, cold ? '#6a6e80' : '#5e5e66'); R(g, 15, 14, 5, 1, cold ? '#b8bcd0' : '#b2b2ba'); R(g, 16, 17, 6, 1, '#4e4e56');
    // circular mask
    const m = mkCanvas(26, 26); ell(m.getContext('2d'), 0, 0, 26, 26, '#fff');
    g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0);
    return c;
  });
}
function tinyHeart(x, y, col, hi) {
  R(ctx, x, y + 1, 5, 2, col); R(ctx, x + 1, y, 1, 1, col); R(ctx, x + 3, y, 1, 1, col); R(ctx, x + 1, y + 3, 3, 1, col); P(ctx, x + 2, y + 4, col); P(ctx, x + 1, y + 1, hi);
}
function roundBar(x, y, w, h, frac, cols, segs, ghost) {
  // gold-rimmed pill with rounded ends
  const r = h / 2;
  const pill = (xx, yy, ww, hh, c) => { R(ctx, xx + 1, yy, ww - 2, hh, c); R(ctx, xx, yy + 1, ww, hh - 2, c); };
  pill(x - 2, y - 2, w + 4, h + 4, HP_COL.rim);
  pill(x - 1, y - 1, w + 2, h + 2, HP_COL.gold);
  R(ctx, x, y - 1, w, 1, HP_COL.goldHi); R(ctx, x, y + h, w, 1, HP_COL.goldLo);
  pill(x, y, w, h, cols.empty);
  if (ghost > frac) { const gw = Math.round(w * ghost); pill(x, y, Math.max(2, gw), h, '#f4f0e0'); }
  const fw = Math.round(w * clamp(frac, 0, 1));
  if (fw > 0) {
    pill(x, y, Math.max(2, fw), h, cols.fill);
    R(ctx, x + 1, y + 1, Math.max(0, fw - 2), Math.max(1, h / 3 | 0), cols.hi);
    R(ctx, x + 1, y + h - Math.max(1, h / 4 | 0) - 0, Math.max(0, fw - 2), Math.max(1, h / 4 | 0), cols.lo);
  }
  for (let i = 1; i < segs; i++) R(ctx, x + Math.round(w * i / segs), y, 1, h, HP_COL.rim);
}
function drawHealthHUD(x = 4, y = 4) {
  const st = playerStats();
  const hp = S.hp, frac = hp / st.maxHp;
  const sc = Game.scene, pl = sc && sc.player;
  const stam = pl && pl.stam !== undefined ? pl.stam / 100 : 1;
  const sx = HUD.shake > 0 ? Math.round(rand(-2, 2)) : 0, sy = HUD.shake > 0 ? Math.round(rand(-1, 1)) : 0;
  x += sx; y += sy;
  const cold = HUD.dead > 0 || hp <= 0;
  // bars first (the medallion overlaps their left ends)
  const bx = x + 28, by = y + 9, bw = 66;
  roundBar(bx, by, bw, 8, frac, cold ? { fill: '#8a8ea4', hi: '#b8bcd0', lo: '#6a6e84', empty: '#2a2c3a' } : { fill: HP_COL.red, hi: HP_COL.redHi, lo: HP_COL.redLo, empty: HP_COL.empty }, 3, cold ? 0 : HUD.ghost);
  roundBar(bx + 2, by + 13, bw - 14, 3, stam, cold ? { fill: '#6a6e84', hi: '#9a9eb4', lo: '#4a4e64', empty: '#1a1c2a' } : { fill: HP_COL.blue, hi: HP_COL.blueHi, lo: HP_COL.blueLo, empty: '#16233a' }, 1, 0);
  // twinkle star at the end of the stamina bar
  const tw = (Math.sin(Game.time * 5) + 1) / 2;
  const stx = bx + bw - 8, sty = by + 14;
  const starC = cold ? '#9aa0b8' : '#dff4ff';
  R(ctx, stx - 1, sty - 3 - Math.round(tw), 1, 7 + Math.round(tw) * 2, starC); R(ctx, stx - 4 - Math.round(tw), sty, 7 + Math.round(tw) * 2, 1, starC); P(ctx, stx - 1, sty, '#ffffff');
  R(ctx, stx + 4, sty - 3, 1, 3, starC); R(ctx, stx + 3, sty - 2, 3, 1, starC);
  // little green-gold swoosh under the joint
  R(ctx, x + 24, y + 28, 3, 1, '#8ac048'); R(ctx, x + 26, y + 27, 3, 1, '#c8d048'); R(ctx, x + 28, y + 26, 2, 1, '#e8b030');
  // hearts
  const low = frac < 0.3 && !cold;
  const hb = low ? Math.sin(Game.time * 10) > 0 ? 1 : 0 : 0;
  tinyHeart(x + 22, y - 1 - hb, cold ? '#6a6e84' : '#ff5a7a', '#ffc0cc'); tinyHeart(x + 27, y + 2, cold ? '#6a6e84' : '#ff6a8a', '#ffc0cc'); tinyHeart(x + 20, y + 4 + hb, cold ? '#5a5e74' : '#e84a6a', '#ffc0cc');
  // medallion
  ell(ctx, x - 1, y - 1, 32, 32, HP_COL.rim); ell(ctx, x, y, 30, 30, HP_COL.gold); ell(ctx, x + 1, y + 1, 28, 28, HP_COL.goldLo); ell(ctx, x + 1, y + 1, 28, 27, HP_COL.goldHi);
  ell(ctx, x + 2, y + 2, 26, 26, HP_COL.rim);
  ctx.drawImage(hudPortrait(cold), x + 2, y + 2);
  // damage slashes & blood
  if (HUD.hit > 0 || cold) {
    const a = cold ? 1 : clamp(HUD.hit, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    for (const s of HUD.slashes) {
      const x0 = x + s.x, y0 = y + s.y + s.len, x1 = x0 + Math.cos(-s.a) * s.len, y1 = y0 + Math.sin(-s.a) * s.len;
      line(ctx, x0 + 1, y0 + 1, x1 + 1, y1 + 1, '#1a0810');
      for (let k = 0; k < s.w; k++) line(ctx, x0 + k, y0, x1 + k, y1, s.red ? '#d8102a' : '#ffffff');
      if (!s.red) { line(ctx, x1, y1, x1 + 3, y1 - 4, '#ffffff'); line(ctx, x1, y1, x1 - 2, y1 - 4, '#ffffff'); }
    }
    ctx.restore();
  }
  for (const d of HUD.drips) { ctx.globalAlpha = clamp(d.life / 0.3, 0, 1); R(ctx, x + d.x, y + d.y, 2, 2, '#d8102a'); }
  ctx.globalAlpha = 1;
  // gold under the medallion
  const gs = fmt(S.gold);
  const pul = HUD.goldPulse > 0 ? 1 : 0;
  ctx.drawImage(coinIcon(), x + 4, y + 33 - pul);
  txt(gs, x + 13, y + 39.5 - pul, { size: 7, color: pul ? '#ffe89a' : '#fff', outline: '#1b1420' });
}
