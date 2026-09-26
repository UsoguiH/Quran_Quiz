'use strict';
// ============================================================================
//  ENTITIES: player, enemies, boss, projectiles, pickups, particles, props
// ============================================================================

const DIRV = [[0, 1], [0, -1], [-1, 0], [1, 0]]; // down, up, left, right
const DIRA = [Math.PI / 2, -Math.PI / 2, Math.PI, 0];
function dirFromVec(x, y) { return Math.abs(x) > Math.abs(y) ? (x < 0 ? 2 : 3) : (y < 0 ? 1 : 0); }
function drawSpr(img, x, y, o = {}) {
  // bottom-centre anchor
  const dx = Math.round(x - img.width / 2), dy = Math.round(y - img.height);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.drawImage(img, dx, dy);
  ctx.globalAlpha = 1;
}
function shadow(x, y, w = 12, a = 0.3) { ctx.globalAlpha = a; ell(ctx, Math.round(x - w / 2), Math.round(y - 2), w, 4, '#000'); ctx.globalAlpha = 1; }

// ---------------------------------------------------------------- effects
const FX = {
  burst(sc, x, y, col, n = 8, spd = 60, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2), v = rand(spd * 0.3, spd);
      sc.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), life: rand(0.3, 0.6) * (o.life || 1), max: 0.6, col: Array.isArray(col) ? choice(col) : col, s: o.s || randi(1, 2), grav: o.grav || 0 });
    }
  },
  dust(sc, x, y, n = 4) { for (let i = 0; i < n; i++) sc.parts.push({ x: x + rand(-4, 4), y: y + rand(-2, 1), vx: rand(-20, 20), vy: rand(-18, -4), life: rand(0.25, 0.45), max: 0.45, col: 'rgba(230,220,200,0.7)', s: 2, grav: 0 }); },
  text(sc, x, y, s, col = '#fff', size = 8) { sc.texts.push({ x, y, s: String(s), col, life: 0.9, size }); },
  ring(sc, x, y, col, r0 = 4, r1 = 24, life = 0.35) { sc.rings.push({ x, y, col, r0, r1, life, max: life }); },
};
function updateFX(sc, dt) {
  for (const p of sc.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt; p.vx *= 0.94; p.vy *= p.grav ? 1 : 0.94; p.life -= dt; }
  sc.parts = sc.parts.filter(p => p.life > 0);
  for (const t of sc.texts) { t.y -= 18 * dt; t.life -= dt; }
  sc.texts = sc.texts.filter(t => t.life > 0);
  for (const r of sc.rings) r.life -= dt;
  sc.rings = sc.rings.filter(r => r.life > 0);
}
function drawFX(sc, ox, oy) {
  for (const p of sc.parts) { ctx.globalAlpha = clamp(p.life / 0.3, 0, 1); R(ctx, p.x - ox, p.y - oy, p.s, p.s, p.col); }
  ctx.globalAlpha = 1;
  for (const r of sc.rings) {
    const k = 1 - r.life / r.max;
    ctx.globalAlpha = r.life / r.max; ctx.strokeStyle = r.col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(r.x - ox, r.y - oy, lerp(r.r0, r.r1, k), lerp(r.r0, r.r1, k) * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const t of sc.texts) txt(t.s, t.x - ox, t.y - oy, { size: t.size, align: 'center', color: t.col, outline: '#1b1420', alpha: clamp(t.life / 0.3, 0, 1) });
}

// ---------------------------------------------------------------- collision helper
function moveBody(e, dx, dy, world, canPit = true) {
  const hw = e.hw, hh = e.hh;
  const blocked = (x, y) => {
    const pts = [[x - hw, y - hh], [x + hw, y - hh], [x - hw, y + hh], [x + hw, y + hh], [x, y - hh], [x, y + hh]];
    for (const [px, py] of pts) { if (world.solid(px, py)) return true; if (!canPit && world.pit && world.pit(px, py)) return true; }
    return false;
  };
  let hitX = false, hitY = false;
  const stepX = Math.ceil(Math.abs(dx) / 3) || 1, stepY = Math.ceil(Math.abs(dy) / 3) || 1;
  for (let i = 0; i < stepX; i++) { const nx = e.x + dx / stepX; if (!blocked(nx, e.y)) e.x = nx; else { hitX = true; break; } }
  for (let i = 0; i < stepY; i++) { const ny = e.y + dy / stepY; if (!blocked(e.x, ny)) e.y = ny; else { hitY = true; break; } }
  return { hitX, hitY };
}

// ---------------------------------------------------------------- weapons
const WK = {
  sword: { combo: 3, dur: [0.24, 0.24, 0.34], mul: [1, 1, 1.5], reach: 18, arc: 2.0, lunge: 60, kb: 70, big: false },
  big: { combo: 2, dur: [0.46, 0.56], mul: [1, 1.5], reach: 25, arc: 2.8, lunge: 40, kb: 150, big: true },
  spear: { combo: 3, dur: [0.28, 0.28, 0.38], mul: [1, 1, 1.5], reach: 31, arc: 0.7, lunge: 40, kb: 90 },
  gloves: { combo: 4, dur: [0.14, 0.14, 0.14, 0.32], mul: [1, 1, 1, 2.2], reach: 15, arc: 1.5, lunge: 40, kb: 40 },
  bow: { combo: 1, dur: [0.36], mul: [1], ranged: true },
};

class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.dir = 0; this.hw = 4; this.hh = 3;
    this.state = 'idle'; this.st = 0; this.anim = 0; this.inv = 0; this.combo = 0; this.queued = false;
    this.rollCd = 0; this.lastSafe = { x, y }; this.hitList = new Set(); this.charge = 0; this.flash = 0; this.stepT = 0;
    this.kx = 0; this.ky = 0; this.trail = []; this.trailT = 0;
  }
  get weapon() { const line = S.equip.w[S.equip.active] || S.equip.w[0]; return line; }
  update(dt, sc, mode) {
    const st = playerStats();
    this.inv = Math.max(0, this.inv - dt); this.rollCd = Math.max(0, this.rollCd - dt); this.flash = Math.max(0, this.flash - dt);
    this.st += dt;
    for (const t of this.trail) t.life -= dt; this.trail = this.trail.filter(t => t.life > 0);
    const ax = Input.axis();
    const moving = Math.hypot(ax.x, ax.y) > 0.2;
    const world = sc.world;
    const combat = mode === 'dungeon';
    // knockback decay
    if (this.kx || this.ky) { moveBody(this, this.kx * dt, this.ky * dt, world); this.kx *= 0.82; this.ky *= 0.82; if (Math.abs(this.kx) + Math.abs(this.ky) < 4) { this.kx = this.ky = 0; } }

    switch (this.state) {
      case 'dead': return;
      case 'fall':
        if (this.st > 0.6) {
          this.x = this.lastSafe.x; this.y = this.lastSafe.y; this.state = 'idle'; this.inv = 1;
          this.damage(Math.ceil(st.maxHp * 0.1), sc, null, true);
        }
        return;
      case 'roll': {
        // dash-roll: explosive start that eases out
        const k = clamp(this.st / 0.32, 0, 1);
        const sp = lerp(250, 120, k * k) * (1 + st.spd / 100);
        moveBody(this, this.rvx * sp * dt, this.rvy * sp * dt, world);
        this.anim += dt * 22;
        this.trailT -= dt;
        if (this.trailT <= 0) { this.trailT = 0.035; this.trail.push({ x: this.x, y: this.y, f: Math.floor(this.anim) % 6, life: 0.22 }); }
        if (this.st > 0.32) { this.state = 'idle'; this.rollCd = 0.12; FX.dust(sc, this.x, this.y, 3); }
        if (Math.random() < 0.5) FX.dust(sc, this.x, this.y, 1);
        if (Math.random() < 0.3) sc.parts.push({ x: this.x - this.rvx * 6 + rand(-3, 3), y: this.y - 8 + rand(-3, 3), vx: -this.rvx * 30, vy: -this.rvy * 30, life: 0.3, max: 0.3, col: PD.r, s: 1, grav: 0 });
        return;
      }
      case 'attack': {
        const k = WK[this.wkind];
        const dur = k.dur[this.combo];
        if (this.st < dur * 0.4 && !k.ranged) moveBody(this, DIRV[this.dir][0] * k.lunge * dt * (1 - this.st / dur), DIRV[this.dir][1] * k.lunge * dt * (1 - this.st / dur), world);
        if (!this.hitDone && this.st >= dur * (k.ranged ? 0.25 : 0.35)) { this.hitDone = true; this.doHit(sc, k.mul[this.combo]); }
        if (Input.pressed('X') && this.st > dur * 0.35) this.queued = true;
        if (Input.pressed('ROLL') && this.st > dur * 0.5) { this.startRoll(ax, sc); return; }
        if (this.st >= dur) {
          if (this.queued && this.combo < k.combo - 1) { this.combo++; this.beginAttack(sc); }
          else { this.state = 'idle'; this.combo = 0; this.atkCd = 0.08; }
        }
        return;
      }
      case 'block':
        if (!Input.down('Y')) { this.state = 'idle'; break; }
        if (moving) { moveBody(this, ax.x * st.speed * 0.35 * dt, ax.y * st.speed * 0.35 * dt, world); this.anim += dt * 5; }
        return;
      case 'charge': {
        this.charge = Math.min(1, this.charge + dt / (this.wkind === 'bow' ? 0.9 : 0.8));
        if (moving) { this.dir = dirFromVec(ax.x, ax.y); moveBody(this, ax.x * st.speed * 0.3 * dt, ax.y * st.speed * 0.3 * dt, world); }
        if (!Input.down('Y')) {
          if (this.charge >= 1) this.releaseCharge(sc); else this.state = 'idle';
          this.charge = 0;
        }
        return;
      }
      case 'special': {
        const dur = this.specDur;
        if (this.wkind === 'gloves') moveBody(this, DIRV[this.dir][0] * 210 * dt, DIRV[this.dir][1] * 210 * dt, world);
        if (this.wkind === 'gloves' || this.st > dur * 0.3) this.doSpecialHit(sc);
        if (this.st >= dur) this.state = 'idle';
        return;
      }
      case 'hurt':
        if (this.st > 0.25) this.state = 'idle';
        return;
    }
    // --- free movement
    if (moving) {
      this.dir = dirFromVec(ax.x, ax.y);
      const running = Input.runHeld();
      const sp = st.speed * (running ? 1.55 : 1);
      moveBody(this, ax.x * sp * dt, ax.y * sp * dt, world);
      if (this.state !== (running ? 'run' : 'walk')) this.anim = 0;
      this.anim += dt * (running ? 14 : 8); this.state = running ? 'run' : 'walk';
      this.stepT -= dt;
      if (this.stepT <= 0) { this.stepT = running ? 0.18 : 0.3; if (mode !== 'dungeon') sfx('step'); if (running) FX.dust(sc, this.x - ax.x * 4, this.y, 2); }
    } else { if (this.state !== 'idle') this.anim = 0; this.state = 'idle'; this.anim += dt * 2.2; }
    // pits & safe spots
    if (world.pit) {
      if (world.pit(this.x, this.y)) { this.state = 'fall'; this.st = 0; sfx('fall'); return; }
      const safe = !world.pit(this.x - 8, this.y) && !world.pit(this.x + 8, this.y) && !world.pit(this.x, this.y - 8) && !world.pit(this.x, this.y + 8);
      if (safe) this.lastSafe = { x: this.x, y: this.y };
    }
    if (Input.pressed('ROLL') && this.rollCd <= 0) { this.startRoll(ax, sc); return; }
    if (!combat) return;
    this.atkCd = Math.max(0, (this.atkCd || 0) - dt);
    if (Input.pressed('LB')) this.swapWeapon();
    if (Input.pressed('RB')) usePotion(sc);
    if (Input.pressed('X') && this.atkCd <= 0) { this.combo = 0; this.beginAttack(sc); return; }
    if (Input.pressed('Y')) this.beginSecondary(sc);
  }
  swapWeapon() {
    if (!S.equip.w[1]) { toast('No second weapon equipped'); return; }
    S.equip.active ^= 1; sfx('select');
    toast(WEAPON_LINES[this.weapon].names[S.gear[this.weapon]]);
  }
  startRoll(ax, sc) {
    let vx = ax.x, vy = ax.y;
    if (Math.hypot(vx, vy) < 0.2) { vx = DIRV[this.dir][0]; vy = DIRV[this.dir][1]; }
    const l = Math.hypot(vx, vy); this.rvx = vx / l; this.rvy = vy / l;
    this.dir = dirFromVec(vx, vy);
    this.state = 'roll'; this.st = 0; sfx('roll'); FX.dust(sc, this.x, this.y, 4);
  }
  beginAttack(sc) {
    this.wkind = WEAPON_LINES[this.weapon].kind;
    const ax = Input.axis(); if (Math.hypot(ax.x, ax.y) > 0.3) this.dir = dirFromVec(ax.x, ax.y);
    this.state = 'attack'; this.st = 0; this.hitDone = false; this.queued = false;
    const k = WK[this.wkind];
    if (!k.ranged) sfx(k.big ? 'swingBig' : 'swing');
  }
  beginSecondary(sc) {
    this.wkind = WEAPON_LINES[this.weapon].kind;
    const k = this.wkind; this.st = 0;
    if (k === 'sword') { this.state = 'block'; }
    else if (k === 'big' || k === 'bow') { this.state = 'charge'; this.charge = 0; }
    else if (k === 'spear') { this.state = 'special'; this.specDur = 0.4; this.hitList.clear(); sfx('swingBig'); }
    else if (k === 'gloves') { this.state = 'special'; this.specDur = 0.2; this.hitList.clear(); sfx('roll'); }
  }
  releaseCharge(sc) {
    const st = playerStats();
    const dmg = st.dmg(this.weapon);
    if (this.wkind === 'bow') {
      const [dx, dy] = DIRV[this.dir];
      sc.projs.push(new Projectile(this.x + dx * 8, this.y - 8 + dy * 6, dx * 320, dy * 320, { owner: 'player', dmg: dmg * 3, pierce: true, kind: 'arrow', life: 1.2, big: true }));
      sfx('arrow'); sc.shake(2);
      this.state = 'attack'; this.combo = 0; this.st = 0.2; this.hitDone = true;
    } else {
      // spin attack
      sfx('swingBig'); this.state = 'special'; this.specDur = 0.35; this.st = 0; this.hitList.clear(); this.spin = true;
      this.hitCircle(sc, 30, dmg * 2.2, 180, true);
      FX.ring(sc, this.x, this.y - 6, '#ffffff', 6, 32, 0.3);
    }
  }
  doSpecialHit(sc) {
    const st = playerStats(), dmg = st.dmg(this.weapon);
    if (this.wkind === 'spear') this.hitArc(sc, 28, Math.PI * 1.1, dmg * 1.3, 110, true);
    else if (this.wkind === 'gloves') this.hitCircle(sc, 14, dmg * 1.6, 160, true);
  }
  doHit(sc, mul) {
    const st = playerStats();
    const k = WK[this.wkind], dmg = st.dmg(this.weapon) * mul;
    if (k.ranged) {
      const [dx, dy] = DIRV[this.dir];
      sc.projs.push(new Projectile(this.x + dx * 8, this.y - 8 + dy * 6, dx * 260, dy * 260, { owner: 'player', dmg, kind: 'arrow', life: 0.9 }));
      sfx('arrow');
      return;
    }
    const kb = this.wkind === 'gloves' && this.combo === 3 ? 180 : k.kb;
    this.hitList.clear();
    this.hitArc(sc, k.reach, k.arc, dmg, kb, false);
  }
  hitArc(sc, reach, arc, dmg, kb, multi) {
    const a0 = DIRA[this.dir];
    const cx = this.x, cy = this.y - 7;
    let any = false;
    for (const e of sc.enemies) {
      if (e.dead || (multi && this.hitList.has(e))) continue;
      const d = dist(cx, cy, e.x, e.hy());
      if (d > reach + e.r) continue;
      let da = Math.atan2(e.hy() - cy, e.x - cx) - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > arc / 2 && d > e.r + 4) continue;
      this.hitList.add(e);
      e.hurt(dmg, Math.cos(a0) * kb, Math.sin(a0) * kb, sc); any = true;
    }
    this.hitBreakables(sc, cx + Math.cos(a0) * reach * 0.6, cy + Math.sin(a0) * reach * 0.6, reach * 0.7);
    if (any) { sc.hitstop = 0.05; sc.shake(1.5); }
  }
  hitCircle(sc, r, dmg, kb, multi) {
    let any = false;
    for (const e of sc.enemies) {
      if (e.dead || (multi && this.hitList.has(e))) continue;
      const d = dist(this.x, this.y - 6, e.x, e.hy());
      if (d > r + e.r) continue;
      this.hitList.add(e);
      const a = Math.atan2(e.hy() - this.y, e.x - this.x);
      e.hurt(dmg, Math.cos(a) * kb, Math.sin(a) * kb, sc); any = true;
    }
    this.hitBreakables(sc, this.x, this.y - 6, r);
    if (any) { sc.hitstop = 0.05; sc.shake(2); }
  }
  hitBreakables(sc, x, y, r) {
    if (!sc.props) return;
    for (const p of sc.props) if (p.breakable && !p.broken && dist(x, y, p.x, p.y - 5) < r + 7) p.smash(sc);
  }
  damage(amount, sc, from, force) {
    if (this.state === 'dead') return false;
    if (!force && (this.inv > 0 || this.state === 'roll' || this.state === 'fall')) return false;
    if (!force && this.state === 'block' && from) {
      const a = Math.atan2(from.y - this.y, from.x - this.x);
      let da = a - DIRA[this.dir]; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < 1.2) { sfx('block'); FX.burst(sc, this.x + Math.cos(a) * 8, this.y - 8 + Math.sin(a) * 8, '#fff', 5, 60); this.kx = -Math.cos(a) * 80; this.ky = -Math.sin(a) * 80; return false; }
    }
    const st = playerStats();
    const dmg = Math.max(1, Math.round(amount * (1 - st.def / 100)));
    S.hp -= dmg; this.inv = 0.8; this.flash = 0.2;
    FX.text(sc, this.x, this.y - 24, '-' + dmg, '#ff7a6a');
    sfx('hurt'); sc.shake(4); sc.hitstop = 0.06;
    if (OPTS.vibration && navigator.vibrate) navigator.vibrate(40);
    if (from) { const a = Math.atan2(this.y - from.y, this.x - from.x); this.kx = Math.cos(a) * 140; this.ky = Math.sin(a) * 140; }
    if (this.state !== 'fall') { this.state = 'hurt'; this.st = 0; }
    if (S.hp <= 0) { S.hp = 0; this.state = 'dead'; this.st = 0; sc.onPlayerDeath && sc.onPlayerDeath(from); }
    return true;
  }
  draw(ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    if (this.state === 'fall') {
      const k = clamp(1 - this.st / 0.6, 0, 1);
      const img = heroSprite(this.dir, 0, 'idle');
      ctx.drawImage(img, x - img.width * k / 2, y - img.height * k + (1 - k) * 6, img.width * k, img.height * k);
      return;
    }
    shadow(x, y, 12);
    if (this.inv > 0 && this.state !== 'roll' && Math.floor(this.inv * 20) % 2 === 0) return;
    if (this.state === 'dead') {
      const img = heroSprite(0, 0, 'idle');
      ctx.save(); ctx.translate(x, y - 4); ctx.rotate(Math.PI / 2); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
      return;
    }
    if (this.state === 'roll') {
      const rev = this.rvx < -0.1;
      for (const t of this.trail) { ctx.globalAlpha = clamp(t.life / 0.22, 0, 1) * 0.35; drawSpr(heroRoll(rev ? 5 - t.f : t.f), t.x - ox, t.y - oy + 1); }
      ctx.globalAlpha = 1;
      const f = Math.floor(this.anim) % 6;
      drawSpr(heroRoll(rev ? 5 - f : f), x, y + 1); return;
    }
    const atk = this.state === 'attack' || this.state === 'special';
    let pose = atk ? 'attack' : this.state === 'run' ? 'run' : this.state === 'walk' || this.state === 'block' ? 'walk' : 'idle';
    let frame = Math.floor(this.anim);
    if (atk) {
      const k = WK[this.wkind] || WK.sword, dur = this.state === 'special' ? this.specDur : k.dur[this.combo];
      const p = clamp(this.st / dur, 0, 1); frame = p < 0.25 ? 0 : p < 0.65 ? 1 : 2;
    }
    if (this.state === 'charge') { pose = 'attack'; frame = 0; }
    const drawWeaponFirst = this.dir === 1 || this.dir === 2 && false;
    if ((atk || this.state === 'block' || this.state === 'charge') && drawWeaponFirst) this.drawWeapon(x, y);
    const img = heroSprite(this.dir, frame, pose);
    drawSpr(img, x, y + 1);
    if (this.flash > 0) drawSpr(whiteOf(img), x, y + 1, { alpha: 0.7 });
    if ((atk || this.state === 'block' || this.state === 'charge') && !drawWeaponFirst) this.drawWeapon(x, y);
  }
  drawWeapon(x, y) {
    const line = this.weapon, tier = S.gear[line];
    const kind = WEAPON_LINES[line].kind;
    const ic = gearIcon(WEAPON_LINES[line].icon, tier);
    const a0 = DIRA[this.dir];
    const hx = x + DIRV[this.dir][0] * 6, hy = y - 13 + DIRV[this.dir][1] * 4;
    if (this.state === 'block') {
      ctx.save(); ctx.translate(hx + DIRV[this.dir][0] * 4, hy + DIRV[this.dir][1] * 4);
      R(ctx, -5, -6, 10, 12, '#1b1420'); R(ctx, -4, -5, 8, 10, '#8a8a9a'); R(ctx, -3, -4, 6, 8, '#c3c3d2'); R(ctx, -1, -3, 2, 6, C.teal);
      ctx.restore(); return;
    }
    if (this.state === 'charge') {
      const k = this.charge;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a0 + Math.PI / 4 + (kind === 'bow' ? -Math.PI / 4 : -0.6)); ctx.drawImage(ic, -2, -ic.height + 2); ctx.restore();
      if (k >= 1 && Math.sin(Game.time * 30) > 0) { ctx.globalAlpha = 0.6; ell(ctx, x - 10, y - 20, 20, 20, '#ffffff'); ctx.globalAlpha = 1; }
      hpBar(x - 8, y - 28, 16, 3, k, C.mint);
      return;
    }
    if (kind === 'bow') {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a0); ctx.drawImage(ic, -2, -7); ctx.restore(); return;
    }
    const k = WK[kind];
    const dur = this.state === 'special' ? this.specDur : k.dur[this.combo];
    const p = clamp(this.st / dur, 0, 1);
    if (kind === 'spear' && this.state !== 'special') {
      const ext = Math.sin(p * Math.PI) * 14;
      ctx.save(); ctx.translate(hx + Math.cos(a0) * ext, hy + Math.sin(a0) * ext); ctx.rotate(a0 + Math.PI / 4); ctx.drawImage(ic, -4, -ic.height + 4); ctx.restore();
      return;
    }
    if (kind === 'gloves') {
      const ext = Math.sin(p * Math.PI) * 10;
      const px = hx + Math.cos(a0) * (6 + ext), py = hy + Math.sin(a0) * (6 + ext);
      ctx.drawImage(ic, px - 7, py - 7);
      if (p > 0.3 && p < 0.7) { ctx.globalAlpha = 0.7; ell(ctx, px - 5 + Math.cos(a0) * 6, py - 5 + Math.sin(a0) * 6, 10, 10, '#ffffff'); ctx.globalAlpha = 1; }
      return;
    }
    // sword / big / spear-sweep / spin: arc swing
    let arc = kind === 'spear' ? Math.PI * 1.1 : k.arc;
    let from = a0 - arc / 2, to = a0 + arc / 2;
    if (this.combo % 2 === 1) [from, to] = [to, from];
    if (this.spin && this.state === 'special') { from = a0; to = a0 + Math.PI * 2; }
    const ang = lerp(from, to, easeOut(p));
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang + Math.PI / 4); ctx.drawImage(ic, -3, -ic.height + 3); ctx.restore();
    // slash trail
    if (p < 0.8) {
      const reach = (kind === 'spear' ? 26 : k.reach) + 2;
      ctx.globalAlpha = 0.55 * (1 - p); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = kind === 'big' ? 4 : 3;
      ctx.beginPath();
      const a1 = from, a2 = ang;
      ctx.arc(hx, hy, reach * 0.8, Math.min(a1, a2), Math.max(a1, a2));
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (this.state === 'special' && this.spin && this.st > this.specDur * 0.9) this.spin = false;
  }
}
function usePotion(sc) {
  const st = playerStats();
  let tier = -1; for (let t = 3; t >= 0; t--) if (S.potions[t] > 0) { tier = t; break; }
  if (tier < 0) { toast('No potions!', '#ff9a8a'); sfx('error'); return; }
  if (S.hp >= st.maxHp) { toast('Health is already full'); return; }
  S.potions[tier]--; const heal = POTIONS[tier].heal;
  S.hp = Math.min(st.maxHp, S.hp + heal);
  sfx('heal'); FX.text(sc, sc.player.x, sc.player.y - 26, '+' + heal, '#7de6ae');
  FX.burst(sc, sc.player.x, sc.player.y - 10, ['#7de6ae', '#ffffff', '#ff8a7a'], 12, 50);
}

// ---------------------------------------------------------------- projectile
class Projectile {
  constructor(x, y, vx, vy, o = {}) { Object.assign(this, { x, y, vx, vy, r: o.r || 3, dmg: o.dmg || 5, owner: o.owner || 'enemy', life: o.life || 3, kind: o.kind || 'rock', pierce: !!o.pierce, col: o.col || '#e8d070', big: o.big, hits: new Set() }); }
  update(dt, sc) {
    this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
    if (sc.world.solid(this.x, this.y + 4) && this.kind !== 'orb') { this.life = 0; FX.burst(sc, this.x, this.y, this.col, 4, 40); return; }
    if (this.kind === 'orb' && (this.x < 8 || this.x > W - 8 || this.y < 16 || this.y > 224)) this.life = 0;
    if (this.owner === 'enemy') {
      const p = sc.player;
      if (dist(this.x, this.y, p.x, p.y - 7) < this.r + 5) { if (p.damage(this.dmg, sc, this)) this.life = 0; else if (p.state === 'block') this.life = 0; }
    } else {
      for (const e of sc.enemies) {
        if (e.dead || this.hits.has(e)) continue;
        if (dist(this.x, this.y, e.x, e.hy()) < this.r + e.r) {
          this.hits.add(e);
          const l = Math.hypot(this.vx, this.vy);
          e.hurt(this.dmg, this.vx / l * 70, this.vy / l * 70, sc);
          if (!this.pierce) { this.life = 0; break; }
        }
      }
    }
  }
  draw(ox, oy) {
    const x = this.x - ox, y = this.y - oy;
    if (this.kind === 'arrow') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(this.vy, this.vx));
      R(ctx, -7, -1, 12, 2, '#6a4a2a'); R(ctx, 4, -2, 3, 4, this.big ? C.mint : '#d8d8e8'); R(ctx, -8, -2, 3, 4, '#e8e0d0');
      ctx.restore();
      return;
    }
    shadow(x, y + 8, 6, 0.25);
    ell(ctx, x - this.r - 1, y - this.r - 1, this.r * 2 + 2, this.r * 2 + 2, '#1b1420');
    ell(ctx, x - this.r, y - this.r, this.r * 2, this.r * 2, this.col);
    P(ctx, x - 1, y - 1, '#ffffff');
  }
}

// ---------------------------------------------------------------- pickups
class Pickup {
  constructor(x, y, stack, o = {}) { this.x = x; this.y = y; this.z = 0; this.vz = 70; this.vx = rand(-30, 30); this.vy = rand(-20, 20); this.stack = stack; this.t = 0; this.gold = o.gold || 0; this.delay = 0.45; this.warned = 0; }
  update(dt, sc) {
    this.t += dt; this.delay -= dt; this.warned -= dt;
    if (this.z > 0 || this.vz > 0) { this.z += this.vz * dt; this.vz -= 260 * dt; if (this.z <= 0) { this.z = 0; this.vz = this.vz < -40 ? -this.vz * 0.35 : 0; } }
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    if (!sc.world.solid(nx, ny) && !(sc.world.pit && sc.world.pit(nx, ny))) { this.x = nx; this.y = ny; }
    this.vx *= 0.9; this.vy *= 0.9;
    if (this.delay > 0) return;
    const p = sc.player; if (p.state === 'dead') return;
    const d = dist(this.x, this.y, p.x, p.y);
    if (d < 26) {
      if (this.gold) { this.x = lerp(this.x, p.x, 0.25); this.y = lerp(this.y, p.y, 0.25); }
      else if (bagCanTake(this.stack)) { this.x = lerp(this.x, p.x, 0.2); this.y = lerp(this.y, p.y, 0.2); }
    }
    if (d < 9) {
      if (this.gold) { S.gold += this.gold; sfx('coin'); FX.text(sc, p.x, p.y - 26, '+' + this.gold, C.gold); this.dead = true; return; }
      const left = bagAdd(this.stack);
      if (left < this.stack.n) {
        sfx('pickup'); FX.text(sc, p.x, p.y - 26, ITEMS[this.stack.id].name, this.stack.curse ? CURSE_COL[this.stack.curse] : '#fff', 7);
        noteSeen(this.stack.id);
      }
      if (left <= 0) this.dead = true;
      else { this.stack.n = left; if (this.warned <= 0) { toast('Your bag is full!', '#ffb0a0'); this.warned = 3; } }
    }
  }
  draw(ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    shadow(x, y, 8, 0.25);
    const bob = Math.sin(this.t * 4) * 1.5;
    if (this.gold) { ctx.drawImage(coinIcon(), x - 3, y - 8 - this.z + bob); return; }
    const ic = itemIcon(this.stack.id);
    if (this.stack.curse && Math.sin(this.t * 5) > 0) { ctx.globalAlpha = 0.5; ell(ctx, x - 8, y - 16 - this.z + bob, 16, 16, CURSE_COL[this.stack.curse]); ctx.globalAlpha = 1; }
    ctx.drawImage(ic, x - ic.width / 2 | 0, y - ic.height - 2 - this.z + bob | 0);
  }
}

// ---------------------------------------------------------------- enemies
class Enemy {
  constructor(type, x, y, sc, o = {}) {
    const d = DUNGEONS[sc.dIdx];
    const b = ENEMY_BASE[type];
    const fmul = 1 + sc.floor * 0.18;
    const nmul = S.phase === 'night' ? 1.15 : 1;
    this.type = type; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0;
    this.maxHp = this.hp = Math.round(b.hp * d.hpMul * fmul * (o.hpMul || 1));
    this.dmg = Math.round(b.dmg * d.dmgMul * fmul * nmul);
    this.r = b.r; this.spd = b.spd; this.hw = 4; this.hh = 3;
    this.t = rand(0, 1); this.st = 0; this.state = 'idle'; this.flash = 0; this.dead = false; this.anim = rand(4);
    this.f = d.foe;
    const fxc = { slime: [d.foe.fur, d.foe.fur2, d.foe.eye], bigslime: [d.foe.fur, d.foe.fur2, d.foe.eye], wisp: [d.foe.blob, d.foe.blob2, '#f4ecdc'], golem: [d.foe.brute, d.foe.brute2, d.foe.axe], turret: [d.foe.stone, d.foe.stone2, d.foe.rune] }[type];
    this.pal = { body: fxc[0], dark: fxc[1], moss: fxc[2], light: fxc[2], eye: d.foe.rune };
    this.name = d.enemyNames[type];
    this.cd = rand(0.5, 1.5); this.spawnT = 0.5; this.z = 0; this.facing = 1;
    if (type === 'bigslime') { this.hw = 7; this.hh = 5; }
    if (type === 'wisp') this.fly = true;
  }
  hy() { return this.y - (this.type === 'bigslime' ? 9 : this.type === 'golem' ? 10 : this.type === 'wisp' ? 12 : 6); }
  hurt(dmg, kx, ky, sc) {
    if (this.dead) return;
    dmg = Math.round(dmg * rand(0.92, 1.08));
    this.hp -= dmg; this.flash = 0.12;
    const heavy = this.type === 'turret' ? 0 : this.type === 'bigslime' || this.type === 'golem' ? 0.5 : 1;
    this.kx += kx * heavy; this.ky += ky * heavy;
    FX.text(sc, this.x + rand(-4, 4), this.hy() - 12, dmg, '#ffffff');
    FX.burst(sc, this.x, this.hy(), [this.pal.body, '#ffffff'], 5, 70);
    sfx('hit');
    if (this.state === 'wind' && this.type === 'golem' && heavy) { /* no interrupt: golems are stubborn */ }
    if (this.hp <= 0) this.die(sc);
  }
  die(sc) {
    this.dead = true; sfx('die');
    FX.burst(sc, this.x, this.hy(), [this.pal.body, this.pal.dark || '#333', this.pal.moss || this.pal.light, '#ffffff'], 16, 90);
    FX.ring(sc, this.x, this.y - 4, '#ffffff', 4, 20);
    sc.kills = (sc.kills || 0) + 1;
    if (this.type === 'bigslime') { for (let i = 0; i < 2; i++) { const e = new Enemy('slime', this.x + (i ? 8 : -8), this.y, sc); e.spawnT = 0.2; sc.enemies.push(e); } }
    if (!this.noLoot) sc.dropLoot(this.x, this.y, this.type === 'bigslime' || this.type === 'golem' ? 0.75 : 0.55);
  }
  update(dt, sc) {
    if (this.dead) return;
    this.t += dt; this.st += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.spawnT > 0) { this.spawnT -= dt; return; }
    const p = sc.player, world = sc.world;
    if (this.kx || this.ky) { moveBody(this, this.kx * dt, this.ky * dt, world, this.fly); this.kx *= 0.85; this.ky *= 0.85; if (Math.abs(this.kx) + Math.abs(this.ky) < 3) this.kx = this.ky = 0; }
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    const alive = p.state !== 'dead';
    this.facing = dx < 0 ? -1 : 1;
    switch (this.type) {
      case 'slime': case 'bigslime': {
        const big = this.type === 'bigslime';
        if (this.state === 'idle') {
          this.cd -= dt;
          if (this.cd <= 0 && alive) { this.state = 'hop'; this.st = 0; const sp = big ? 55 : 80; this.vx = dx / d * sp; this.vy = dy / d * sp; }
        } else if (this.state === 'hop') {
          const dur = big ? 0.6 : 0.45;
          this.z = Math.sin(clamp(this.st / dur, 0, 1) * Math.PI) * (big ? 8 : 10);
          moveBody(this, this.vx * dt, this.vy * dt, world, false);
          if (this.st >= dur) { this.state = 'idle'; this.z = 0; this.cd = rand(0.5, 1.1) * (big ? 1.4 : 1); if (big) { sc.shake(1); FX.dust(sc, this.x, this.y, 5); } }
        }
        break;
      }
      case 'golem': {
        if (this.state === 'idle' || this.state === 'walk') {
          if (alive && d < 26) { this.state = 'wind'; this.st = 0; this.atkDir = Math.atan2(dy, dx); break; }
          if (alive) { this.state = 'walk'; moveBody(this, dx / d * this.spd * dt, dy / d * this.spd * dt, world, false); this.anim += dt * 6; }
        } else if (this.state === 'wind') {
          if (this.st > 0.55) { this.state = 'slash'; this.st = 0; sfx('swingBig');
            const hx = this.x + Math.cos(this.atkDir) * 14, hy = this.y - 6 + Math.sin(this.atkDir) * 12;
            if (dist(hx, hy, p.x, p.y - 6) < 20) p.damage(this.dmg, sc, this);
            FX.ring(sc, hx, hy, '#ffffff', 4, 16, 0.2);
          }
        } else if (this.state === 'slash') { if (this.st > 0.6) { this.state = 'idle'; } }
        break;
      }
      case 'turret': {
        this.cd -= dt;
        if (this.cd < 0.4) this.state = 'charge';
        if (this.cd <= 0 && alive) {
          this.cd = rand(1.8, 2.6); this.state = 'idle';
          const sp = 95; const a = Math.atan2(p.y - 7 - (this.y - 10), dx);
          sc.projs.push(new Projectile(this.x, this.y - 10, Math.cos(a) * sp, Math.sin(a) * sp, { dmg: this.dmg, col: this.f.rune, r: 3 }));
          sfx('shoot');
        }
        break;
      }
      case 'wisp': {
        if (this.state === 'idle') {
          const a = this.t * 1.5;
          const tx = p.x + Math.cos(a) * 40, ty = p.y - 10 + Math.sin(a) * 30;
          moveBody(this, clamp(tx - this.x, -1, 1) * this.spd * dt, clamp(ty - this.y, -1, 1) * this.spd * dt, world, true);
          this.cd -= dt;
          if (this.cd <= 0 && alive) { this.state = 'aim'; this.st = 0; }
        } else if (this.state === 'aim') {
          if (this.st > 0.5) { this.state = 'dash'; this.st = 0; this.vx = dx / d * 190; this.vy = dy / d * 190; }
        } else if (this.state === 'dash') {
          const r = moveBody(this, this.vx * dt, this.vy * dt, world, true);
          if (this.st > 0.4 || r.hitX || r.hitY) { this.state = 'idle'; this.cd = rand(1.4, 2.4); }
        }
        break;
      }
    }
    // contact damage
    if (alive && this.type !== 'turret' && this.z < 4 && dist(this.x, this.hy(), p.x, p.y - 6) < this.r + 5) p.damage(this.dmg, sc, this);
  }
  sprite() {
    switch (this.type) {
      case 'slime': return critterSprite(this.f, this.state === 'hop' ? 2 : Math.floor(this.t * 3) % 2, 1);
      case 'bigslime': return critterSprite(this.f, this.state === 'hop' ? 2 : Math.floor(this.t * 2) % 2, 2);
      case 'golem': return bruteSprite(this.f, Math.floor(this.anim) % 4, this.state === 'wind' ? 'wind' : this.state === 'slash' ? 'slash' : 'walk');
      case 'turret': return runeStoneSprite(this.f, this.state === 'charge' ? 1 : 0);
      case 'wisp': return eyeBlobSprite(this.f, Math.floor(this.t * 6) % 4);
    }
  }
  draw(ox, oy) {
    if (this.dead) return;
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    let img = this.sprite();
    if (this.facing < 0 && (this.type === 'golem' || this.type === 'wisp')) img = cached(img.__flipKey || (img.__flipKey = 'flip' + Math.random()), () => flipH(img));
    const fy = this.fly ? -6 + Math.sin(this.t * 4) * 2 : 0;
    shadow(x, y, this.type === 'bigslime' ? 22 : 12, 0.3);
    if (this.spawnT > 0) { ctx.globalAlpha = 1 - this.spawnT / 0.5; }
    drawSpr(img, x, y + 1 - this.z + fy);
    if (this.flash > 0) drawSpr(whiteOf(img), x, y + 1 - this.z + fy);
    if (this.state === 'wind' || this.state === 'aim' || (this.type === 'turret' && this.state === 'charge')) {
      if (Math.sin(this.t * 30) > 0) txt('!', x, y - img.height - 2 + fy, { size: 9, align: 'center', color: '#ff5a4a', outline: '#1b1420', bold: true });
    }
    ctx.globalAlpha = 1;
    if (this.hp < this.maxHp) hpBar(x - 8, y - img.height - 3 + fy, 16, 3, this.hp / this.maxHp);
  }
}

// ---------------------------------------------------------------- boss
class Boss {
  constructor(sc) {
    const d = DUNGEONS[sc.dIdx];
    this.d = d; this.f = d.foe; this.type = 'boss'; this.name = d.boss;
    this.pal = { id: 'b' + d.id, body: d.foe.tree2, dark: d.foe.tree, moss: d.foe.rune, eye: d.foe.rune };
    this.x = W / 2; this.y = 84; this.r = 30;
    this.maxHp = this.hp = Math.round(900 * d.hpMul);
    this.dmg = Math.round(18 * d.dmgMul * (S.phase === 'night' ? 1.15 : 1));
    this.t = 0; this.cd = 2.5; this.flash = 0; this.dead = false; this.attack = null; this.atkT = 0; this.shadows = [];
    this.fists = [{ x: this.x - 50, y: this.y + 10, z: 0, hx: -50 }, { x: this.x + 50, y: this.y + 10, z: 0, hx: 50 }];
    this.intro = 2.2; this.eyeOpen = 0; this.deathT = 0; this.atkIdx = 0;
  }
  hy() { return this.y - 16; }
  hurt(dmg, kx, ky, sc) {
    if (this.dead || this.intro > 0) return;
    dmg = Math.round(dmg * rand(0.92, 1.08));
    this.hp -= dmg; this.flash = 0.1;
    FX.text(sc, this.x + rand(-14, 14), this.y - 40, dmg, '#fff');
    FX.burst(sc, this.x + rand(-10, 10), this.y - 20, [this.pal.body, this.pal.moss, '#fff'], 5, 70);
    sfx('hit');
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.deathT = 0; sc.onBossDeath(this); }
  }
  update(dt, sc) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.dead) { this.deathT += dt; if (Math.random() < 0.5) FX.burst(sc, this.x + rand(-30, 30), this.y - rand(0, 50), [this.pal.body, this.pal.moss, '#fff'], 4, 80); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    const p = sc.player;
    const phase2 = this.hp < this.maxHp / 2;
    // fists idle bob
    this.fists.forEach((f, i) => {
      if (f.busy) return;
      f.x = lerp(f.x, this.x + f.hx, 0.05); f.y = lerp(f.y, this.y + 12 + Math.sin(this.t * 2 + i) * 3, 0.05); f.z = lerp(f.z, 6, 0.1);
    });
    // contact with body
    if (dist(this.x, this.y - 14, p.x, p.y - 6) < 24) p.damage(this.dmg * 0.6, sc, { x: this.x, y: this.y - 14 });
    if (!this.attack) {
      this.cd -= dt * (phase2 ? 1.4 : 1);
      if (this.cd <= 0) {
        const opts = this.d.attacks;
        this.attack = opts[this.atkIdx % opts.length]; this.atkIdx++;
        if (Math.random() < 0.3) this.attack = choice(opts);
        if (this.attack === 'summon' && sc.enemies.filter(e => !e.dead && e !== this).length > 3) this.attack = 'spray';
        this.atkT = 0; this.stage = 0;
      }
      return;
    }
    this.atkT += dt;
    const A = this.attack;
    if (A === 'fist') {
      const f = this.fists[this.stage % 2];
      if (!f.busy) { f.busy = true; f.tx = p.x; f.ty = p.y; f.t = 0; sfx('select'); }
      f.t += dt;
      if (f.t < 0.9) { f.x = lerp(f.x, f.tx, 0.12); f.y = lerp(f.y, f.ty, 0.12); f.z = lerp(f.z, 44, 0.1); }
      else if (f.t < 1.02) { f.z = Math.max(0, f.z - dt * 500); }
      else if (!f.slammed) {
        f.slammed = true; f.z = 0; sfx('slam'); sc.shake(6);
        FX.ring(sc, f.x, f.y, '#ffffff', 6, 44, 0.45); FX.dust(sc, f.x, f.y, 10);
        if (dist(f.x, f.y, p.x, p.y) < 26) p.damage(this.dmg, sc, f);
        f.ringT = 0;
      } else {
        f.ringT += dt;
        if (f.t > 1.8) { f.busy = false; f.slammed = false; this.stage++; if (this.stage >= (phase2 ? 4 : 2)) this.end(); }
      }
    } else if (A === 'rain') {
      if (this.stage === 0) {
        sfx('bossRoar'); sc.shake(4);
        const n = phase2 ? 12 : 8;
        for (let i = 0; i < n; i++) this.shadows.push({ x: i === 0 ? p.x : rand(40, W - 40), y: i === 0 ? p.y : rand(110, 200), t: -i * 0.12, r: 11 });
        this.stage = 1;
      }
      for (const s of this.shadows) {
        s.t += dt;
        if (s.t > 1.1 && !s.done) {
          s.done = true; sfx('slam'); sc.shake(2); FX.burst(sc, s.x, s.y, [this.pal.body, this.pal.dark, '#fff'], 8, 70); FX.ring(sc, s.x, s.y, '#ffffff', 3, 16, 0.25);
          if (dist(s.x, s.y, p.x, p.y) < s.r + 3) p.damage(this.dmg * 0.8, sc, s);
        }
      }
      this.shadows = this.shadows.filter(s => s.t < 1.3);
      if (this.shadows.length === 0 && this.atkT > 0.5) this.end();
    } else if (A === 'spray') {
      this.eyeOpen = 1;
      const volleys = phase2 ? 5 : 3;
      if (this.atkT > 0.6 + this.stage * 0.55 && this.stage < volleys) {
        const n = phase2 ? 14 : 10, off = this.stage * 0.3;
        for (let i = 0; i < n; i++) {
          const a = off + i / n * Math.PI * 2;
          sc.projs.push(new Projectile(this.x, this.y - 28, Math.cos(a) * 80, Math.sin(a) * 80, { dmg: this.dmg * 0.6, col: this.pal.eye, r: 3, kind: 'orb', life: 5 }));
        }
        sfx('shoot'); this.stage++;
      }
      if (this.stage >= volleys && this.atkT > 0.6 + volleys * 0.55 + 0.4) { this.eyeOpen = 0; this.end(); }
    } else if (A === 'summon') {
      if (this.stage === 0) {
        sfx('bossRoar');
        const kinds = ['slime', 'wisp', 'slime'];
        for (let i = 0; i < (phase2 ? 3 : 2); i++) {
          const e = new Enemy(kinds[i], this.x + (i - 1) * 50, this.y + 40, sc, { hpMul: 0.8 }); e.noLoot = Math.random() < 0.6; sc.enemies.push(e);
          FX.burst(sc, e.x, e.y - 6, ['#fff', this.pal.moss], 10, 60);
        }
        this.stage = 1;
      }
      if (this.atkT > 1.2) this.end();
    }
  }
  end() { this.attack = null; this.cd = rand(1.2, 2.0); this.fists.forEach(f => { f.busy = false; f.slammed = false; }); }
  drawShadows(ox, oy) {
    for (const s of this.shadows) {
      const k = clamp(s.t / 1.1, 0, 1);
      if (s.t < 0) continue;
      ctx.globalAlpha = 0.25 + k * 0.35; ell(ctx, s.x - s.r * k - ox, s.y - s.r * 0.6 * k - oy, s.r * 2 * k, s.r * 1.2 * k, '#000'); ctx.globalAlpha = 1;
      if (!s.done && k > 0.55) { const rk = (k - 0.55) / 0.45; const rh = (1 - rk) * 120; ctx.drawImage(rockSprite({ id: 'boss' + this.pal.id, rock: this.pal.body, rock2: this.pal.dark, rock3: shade(this.pal.body, 0.3), moss: this.pal.moss }, 1), s.x - 8 - ox, s.y - 14 - rh - oy); }
    }
    for (const f of this.fists) {
      if (f.busy && !f.slammed) { const k = clamp(f.t / 0.9, 0, 1); ctx.globalAlpha = 0.2 + 0.35 * k; ell(ctx, f.x - 13 - ox, f.y - 5 - oy, 26, 10, '#000'); ctx.globalAlpha = 1; }
    }
  }
  draw(ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    let img = hauntedTreeSprite(this.f, this.eyeOpen || this.intro > 0.3 && this.intro < 1.4 || Math.sin(this.t * 1.7) > 0.6 ? 1 : 0);
    const rise = this.intro > 0 ? clamp(this.intro - 1.2, 0, 1) * 40 : 0;
    if (this.dead) {
      const k = clamp(this.deathT / 1.6, 0, 1);
      ctx.globalAlpha = 1 - k; drawSpr(img, x + rand(-2, 2), y + k * 20); ctx.globalAlpha = 1;
      return;
    }
    shadow(x, y, 70, 0.35);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 60, y - 80, 120, 80 + 2); ctx.clip();
    drawSpr(img, x, y + rise);
    if (this.flash > 0) drawSpr(whiteOf(img), x, y + rise, { alpha: 0.8 });
    ctx.restore();
    if (this.intro <= 0) for (const f of this.fists) {
      const fi = rootClawSprite(this.f);
      shadow(f.x - ox, f.y - oy, 20, 0.3);
      drawSpr(fi, f.x - ox, f.y - oy - f.z);
    }
  }
}

// ---------------------------------------------------------------- dungeon props
class Chest {
  constructor(x, y, fancy) { this.x = x; this.y = y; this.fancy = fancy; this.open = false; this.solid = true; this.interact = 'Open'; }
  use(sc) {
    if (this.open) return;
    this.open = true; sfx('open'); FX.burst(sc, this.x, this.y - 10, ['#f8e070', '#ffffff'], 14, 60);
    const n = this.fancy ? randi(3, 4) : randi(2, 3);
    for (let i = 0; i < n; i++) sc.dropLoot(this.x, this.y + 6, 1, this.fancy ? 2.2 : 1.4, true);
    if (Math.random() < 0.6) { const g = Math.round(rand(10, 30) * DUNGEONS[sc.dIdx].hpMul * (1 + sc.floor)); sc.pickups.push(new Pickup(this.x, this.y + 6, null, { gold: g })); }
    this.interact = null;
  }
  draw(ox, oy) { shadow(this.x - ox, this.y - oy, 20, 0.3); drawSpr(chestSprite(this.open, this.fancy), this.x - ox, this.y - oy + 2); }
}
class Breakable {
  constructor(x, y, pal) { this.x = x; this.y = y; this.pal = pal; this.breakable = true; this.broken = false; }
  smash(sc) {
    this.broken = true; sfx('hit'); FX.burst(sc, this.x, this.y - 6, [this.pal.pot, this.pal.pot2, '#fff'], 10, 70);
    if (Math.random() < 0.25) sc.dropLoot(this.x, this.y, 1, 0.8);
  }
  draw(ox, oy) { if (this.broken) return; shadow(this.x - ox, this.y - oy, 10, 0.3); drawSpr(potSprite(this.pal), this.x - ox, this.y - oy + 1); }
}
class Pool {
  constructor(x, y) { this.x = x; this.y = y; this.used = false; this.t = 0; }
  update(dt, sc) {
    this.t += dt;
    const p = sc.player;
    if (!this.used && dist(p.x, p.y, this.x, this.y) < 20) {
      const st = playerStats();
      if (S.hp < st.maxHp) { this.used = true; S.hp = st.maxHp; sfx('heal'); FX.burst(sc, p.x, p.y - 10, ['#7de6ae', '#ffffff', '#8ad0ff'], 20, 60); toast('Your wounds close. Health restored!', '#7de6ae'); }
    }
  }
  draw(ox, oy) {
    const x = this.x - ox, y = this.y - oy;
    ell(ctx, x - 24, y - 12, 48, 26, '#4a4a60'); ell(ctx, x - 22, y - 11, 44, 22, '#6a6a84');
    ell(ctx, x - 19, y - 9, 38, 18, this.used ? '#2a4a6a' : '#3a8ae0'); ell(ctx, x - 14, y - 7, 22, 8, this.used ? '#3a5a7a' : '#8ad0ff');
    if (!this.used) for (let i = 0; i < 4; i++) { const a = this.t * 2 + i * 1.6; P(ctx, x + Math.cos(a) * 12, y + Math.sin(a * 1.3) * 5, '#ffffff'); }
  }
}
class Stairs {
  constructor(x, y, kind) { this.x = x; this.y = y; this.kind = kind; this.t = 0; this.interact = kind === 'portal' ? 'Return to town' : kind === 'boss' ? 'Face the guardian' : 'Descend'; }
  update(dt) { this.t += dt; }
  use(sc) { sc.useStairs(this); }
  draw(ox, oy) {
    const x = this.x - ox, y = this.y - oy;
    if (this.kind === 'portal') {
      for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5 - i * 0.12; ell(ctx, x - 16 - i * 3, y - 10 - i * 2 + Math.sin(this.t * 3 + i) * 1, 32 + i * 6, 18 + i * 4, i ? C.mint : C.teal); }
      ctx.globalAlpha = 1; ell(ctx, x - 10, y - 6, 20, 10, '#e8fff4');
      return;
    }
    // hole with ladder / big door for boss
    ell(ctx, x - 16, y - 10, 32, 20, '#1a1422'); ell(ctx, x - 14, y - 9, 28, 16, '#07070c');
    R(ctx, x - 5, y - 9, 2, 14, '#8a6a4a'); R(ctx, x + 3, y - 9, 2, 14, '#8a6a4a');
    for (let i = 0; i < 3; i++) R(ctx, x - 4, y - 6 + i * 4, 8, 1, '#8a6a4a');
    if (this.kind === 'boss') { ctx.globalAlpha = 0.4 + Math.sin(this.t * 3) * 0.2; ell(ctx, x - 18, y - 12, 36, 24, '#e0453a'); ctx.globalAlpha = 1; }
  }
}
