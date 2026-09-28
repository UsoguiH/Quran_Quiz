'use strict';
// ============================================================================
//  STORY: a small cutscene engine (letterbox, actors that walk and animate,
//  camera pans, narration & voiced dialogue, chapter cards, flashes, rain,
//  credits) and the scripted scenes of the Keeper's story.
// ============================================================================

// ---------------------------------------------------------------- portraits
function keeperPortrait() {
  return cached('keeperP', () => { const s = hudPortrait(false), c = mkCanvas(52, 52), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(s, 0, 0, 52, 52); return c; });
}
function aldricPortrait() {
  return cached('aldricP', () => sprite(40, 48, g => {
    const skin = '#e8b890', beard = '#e8e4dc', coat = '#6a4a8a';
    ell(g, 2, 26, 36, 24, coat); R(g, 16, 28, 8, 18, '#4a3060'); R(g, 30, 30, 6, 10, '#3a3440'); ell(g, 29, 32, 8, 8, '#ffd070');
    ell(g, 8, 6, 24, 22, skin); R(g, 5, 2, 30, 6, '#3a2a20'); R(g, 10, -2, 20, 6, '#3a2a20'); R(g, 5, 7, 30, 2, '#6a4a2a');
    R(g, 12, 13, 5, 2, beard); R(g, 23, 13, 5, 2, beard); R(g, 13, 16, 2, 2, '#2a1c1c'); R(g, 24, 16, 2, 2, '#2a1c1c');
    ell(g, 7, 19, 26, 20, beard); ell(g, 13, 19, 14, 5, skin); R(g, 16, 22, 8, 1, '#b8b0a0');
  }));
}
function guardianPortrait(i) { return hauntedTreeSprite(DUNGEONS[clamp(i, 0, 3)].foe, 1); }
function portraitFor(who, ctx2) {
  switch (who) {
    case 'Keeper': return keeperPortrait();
    case 'Elder Oren': return elderPortrait();
    case 'Aldric': return aldricPortrait();
    case 'Guardian': return guardianPortrait(ctx2 || 0);
    case 'Mayor Pell': return mayorPortrait();
    case 'Brom': return smithPortrait();
    case 'Mirabel': return witchPortrait();
  }
  return null;
}
const ALDRIC_LOOK = { id: 'aldric', skin: '#e8b890', hair: '#e8e4dc', hairStyle: 'bald', beard: '#e8e4dc', shirt: '#6a4a8a', pants: '#3a2a3a', hat: 'cap', hatCol: '#3a2a20' };

// ---------------------------------------------------------------- actors
class Actor {
  constructor(id, kind, x, y, o = {}) {
    Object.assign(this, { id, kind, x, y, dir: o.dir ?? 0, anim: 0, moving: false, alpha: o.alpha ?? 1, look: o.look, col: o.col, t: rand(3), z: 0, glow: o.glow, emote: null });
  }
  update(dt) {
    this.t += dt; this.anim += dt * (this.moving ? 8 : 2);
    if (this.emote) { this.emote.t += dt; if (this.emote.t > 1.6) this.emote = null; }
  }
  draw(ox, oy) {
    let x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    if (this.alpha <= 0 && !this.emote) return;
    const ex = x, ey = y, sc = this.scale && this.scale !== 1;
    if (sc) { ctx.save(); ctx.translate(x, y); ctx.scale(this.scale, this.scale); x = 0; y = 0; }
    ctx.globalAlpha = Math.max(0, this.alpha);
    if (this.kind === 'hero') {
      shadow(x, y, 12);
      const img = heroSprite(this.dir, Math.floor(this.anim), this.moving ? 'walk' : 'idle');
      if (sunOut()) castSprShadow(img, x, y);
      drawSpr(img, x, y + 1);
    } else if (this.kind === 'person') {
      shadow(x, y, 12);
      const img = personSprite(this.look, this.dir, Math.floor(this.anim) % 4, this.moving ? 'walk' : 'idle');
      if (sunOut()) castSprShadow(img, x, y);
      drawSpr(img, x, y + 1);
      if (this.glow) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x + 8, y - 12, 0, x + 8, y - 12, 26); g.addColorStop(0, 'rgba(255,200,110,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 22, y - 42, 60, 60); ctx.globalCompositeOperation = 'source-over';
        R(ctx, x + 6, y - 14, 4, 5, '#ffe28a');
      }
    } else if (this.kind === 'key') {
      const bob = Math.sin(this.t * 4) * 2, yy = y - this.z + bob;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, 20); g.addColorStop(0, this.col + 'dd'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 20, yy - 20, 40, 40); ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(keyIcon(this.col), x - 5, yy - 2);
      if (Math.random() < 0.35) { const a = rand(Math.PI * 2); P(ctx, x + Math.cos(a) * 9, yy + Math.sin(a) * 9, '#ffffff'); }
    } else if (this.kind === 'bird') {
      const f = Math.floor(this.t * 8) % 2;
      R(ctx, x - 3, y - (f ? 1 : 0), 3, 1, '#1b1420'); R(ctx, x + 1, y - (f ? 1 : 0), 3, 1, '#1b1420'); P(ctx, x, y + (f ? 0 : 1), '#1b1420');
    }
    ctx.globalAlpha = 1;
    if (sc) { ctx.restore(); x = ex; y = ey; }
    if (this.emote) {
      const e = this.emote, k = clamp(e.t / 0.15, 0, 1), up = Math.round((1 - k) * 4);
      const by = y - (this.emoteH || (this.kind === 'hero' ? 38 : 32)) + up;
      roundBubble(x - 7, by - 8, 14, 12, '#f7efd8', x);
      if (e.e === '!') txt('!', x, by + 1, { size: 9, align: 'center', color: C.red, bold: true });
      else if (e.e === '?') txt('?', x, by + 1, { size: 8, align: 'center', color: C.tealText, bold: true });
      else if (e.e === 'heart') tinyHeart(x - 2, by - 4, '#ff5a7a', '#ffc0cc');
      else txt('...', x, by - 1, { size: 7, align: 'center', color: C.paperDark });
    }
  }
}

// ---------------------------------------------------------------- cutscene engine (cinematic)
const WHO_ACTOR = { Keeper: 'hero', 'Elder Oren': 'elder', Aldric: 'aldric' };
const WHO_COL = { Keeper: '#ec9a86', 'Elder Oren': '#b4dcb4', Aldric: '#ecd49a', Guardian: '#c8a4ec', Narrator: '#d9b86a', Pip: '#f0b070', 'Little Keeper': '#f4c8b8' };
const WHO_ACTOR_EXTRA = { 'Little Keeper': 'child' };
class Cutscene {
  constructor(stage, steps, o = {}) {
    this.stage = stage; this.steps = steps; this.o = o;
    stage.cinematic = true; stage.extra = stage.extra || [];
    this.actors = {}; this.movers = []; this.t = 0; this.st = 0; this.i = -1;
    this.bars = 0; this.fade = o.startBlack ? 1 : 0; this.flash = 0; this.flashCol = '#ffffff'; this.flash2 = 0;
    this.rain = []; this.raining = false; this.box = null; this.card = null; this.credits = null; this.skipT = 0; this.overlay = null; this.shakeT = 0;
    this.fog = false; this.fogA = 0; this.motes = Array.from({ length: 36 }, () => ({ x: rand(W), y: rand(H), v: rand(3, 9), ph: rand(6) }));
    this.petals = Array.from({ length: 34 }, () => newPetal(true)); this.petalsOn = o.petals !== false; this.petalA = 0;
    this.gp = []; this.grade = null; this.gk = { night: 0, memory: 0 }; this.ins = null; this.insT = 0; this.xf = { fsx: W / 2, fsy: H / 2, z: 1 };
    const p = stage.player && stage.player.x > -500 ? stage.player : { x: W / 2, y: H / 2 };
    this.cam = { x: p.x, y: p.y - 12, z: 1 }; this.camT = { ...this.cam }; this.camRate = 2; this.follow = null;
    this.next();
  }
  // world point -> screen point (for lights and effects drawn over the stage)
  w2s(x, y) { const f = this.xf, ox = f.town ? this.stage.cam.x : 0, oy = f.town ? this.stage.cam.y : 0; return [(x - ox - f.fsx) * f.z + W / 2, (y - oy - f.fsy) * f.z + H / 2]; }
  add(a) { this.actors[a.id] = a; if (!this.stage.extra.includes(a)) this.stage.extra.push(a); return a; }
  actor(id) { return this.actors[id]; }
  focusOf(id) {
    const a = this.actors[id] || (id === 'hero' ? this.stage.player : null);
    return a ? { x: a.x, y: a.y - 14 - (a.z || 0) } : null;
  }
  setCam(x, y, z = 1, cut = false) { this.camT = { x, y, z }; if (cut) this.cam = { x, y, z }; }
  shot(s) {
    const z = s.z ?? this.camT.z;
    if (typeof s.shot === 'string') { this.follow = s.shot; const f = this.focusOf(s.shot); if (f) this.setCam(f.x, f.y, z, !!s.cut); }
    else { this.follow = null; this.setCam(s.shot[0], s.shot[1], z, !!s.cut); }
    this.camRate = s.rate ?? 1.6;
  }
  next() {
    this.i++; this.st = 0;
    const s = this.steps[this.i];
    if (!s) { this.end(); return; }
    this.cur = s;
    if (s.music) AudioSys.music(s.music);
    if (s.ambient !== undefined) AudioSys.ambient(s.ambient);
    if (s.sfx) sfx(s.sfx);
    if (s.flash) { this.flash = 1; this.flashCol = s.flash === true ? '#ffffff' : s.flash; }
    if (s.lightning) { this.flash = 0.9; this.flashCol = '#dfe8ff'; this.flash2 = 0.18; setTimeout(() => sfx('thunder'), 350); this.shakeT = 0.5; }
    if (s.shake) this.shakeT = s.shake;
    if (s.rain !== undefined) this.raining = s.rain;
    if (s.fog !== undefined) this.fog = s.fog;
    if (s.petals !== undefined) this.petalsOn = s.petals;
    if (s.grade !== undefined) this.grade = s.grade;
    if (s.insert !== undefined) { this.ins = s.insert; this.insT = 0; }
    if (s.spawn) this.add(new Actor(s.spawn, s.kind || 'person', s.x, s.y, s));
    if (s.face) this.actors[s.face].dir = s.dir;
    if (s.emote) { const a = this.actors[s.emote] || (s.emote === 'hero' ? null : null); if (a) a.emote = { e: s.e, t: 0 }; else if (s.emote === 'hero' && this.stage.player) this.stageEmote = { e: s.e, t: 0 }; }
    if (s.fade !== undefined) this.fadeFrom = this.fade;
    if (s.shot !== undefined) this.shot(s);
    if (s.follow) { this.follow = s.follow; this.camT.z = s.z ?? this.camT.z; this.camRate = s.rate ?? 2; }
    if (s.say || s.narrate) {
      const text = s.say || s.narrate, who = s.who || 'Narrator';
      this.box = { text, who, narr: !!s.narrate, letter: !!s.letter, chars: 0, hold: 0, t: 0, portrait: s.narrate ? null : portraitFor(who, s.g) };
      // shot / reverse-shot: frame whoever is talking, unless the step asks for a wide
      if (s.say && !s.wide && s.shot === undefined) {
        const id = WHO_ACTOR[who] || WHO_ACTOR_EXTRA[who];
        const f = id && this.focusOf(id);
        if (f) { this.follow = id; this.camT.z = s.z || 1.75; this.camRate = 1.8; }
      }
      Voice.speak(text, who);
    }
    if (s.title) { this.card = { title: s.title, sub: s.sub || '', kicker: s.kicker || '', t: 0, dur: s.t || 7, g: new Gommage(s.title, s.title.length > 14 ? 18 : 24), spawnP: 0, spawnD: 0, gone: false }; sfx('boom'); }
    if (s.credits) this.credits = { lines: s.credits, y: H + 10, t: 0, flies: Array.from({ length: 34 }, () => ({ x: rand(W), y: rand(H), ph: rand(6) })) };
    if (s.run) s.run(this);
    if (s.move) {
      const a = this.actors[s.move];
      this.movers.push({ a, tx: s.to[0], ty: s.to[1], sp: s.speed || 36 });
      if (s.async) { this.next(); return; }
    }
    if (s.async) this.next();
  }
  stepDone(dt) {
    const s = this.cur;
    const adv = Input.pressed('A') || Input.pressed('X') || Input.tap();
    if (this.box) {
      const b = this.box, speed = [30, 45, 80][OPTS.textSpeed] || 45;
      b.t += dt;
      const before = b.chars | 0;
      b.chars = Math.min(b.text.length, b.chars + dt * speed);
      for (let k = before; k < (b.chars | 0); k++) Voice.blip(b.text[k], k);
      const full = b.chars >= b.text.length;
      if (adv) { if (!full) b.chars = b.text.length; else return true; }
      if (full && !Voice.busy()) { b.hold += dt; if (b.hold > (Voice.mode === 'off' ? 1.4 + b.text.length * 0.02 : 1.1)) return true; }
      return false;
    }
    if (this.card) { this.card.t += dt; return this.card.t >= this.card.dur || (this.card.t > 1 && adv); }
    if (this.credits) { const c = this.credits; c.t += dt; c.y -= dt * 17; return c.y + c.lines.length * 18 < -10 || (c.t > 1.5 && adv); }
    if (s.move && !s.async) return !this.movers.some(m => m.a.id === s.move);
    if (s.wait) return this.st >= s.wait;
    if (s.fade !== undefined) { const k = clamp(this.st / (s.t || 1), 0, 1); this.fade = lerp(this.fadeFrom, s.fade, ease(k)); return k >= 1; }
    if (s.until) return s.until(this, dt);
    return true;
  }
  update(dt) {
    this.t += dt; this.st += dt;
    this.bars = approach(this.bars, this.o.noBars ? 0 : 1, dt * 1.6);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    if (this.flash2 > 0) { this.flash2 -= dt; if (this.flash2 <= 0) { this.flash = 0.7; this.flashCol = '#dfe8ff'; } }
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.fogA = approach(this.fogA, this.fog ? 1 : 0, dt * 0.5);
    for (const a of Object.values(this.actors)) a.update(dt);
    if (this.stageEmote) { this.stageEmote.t += dt; if (this.stageEmote.t > 1.6) this.stageEmote = null; }
    for (const m of this.movers) {
      const dx = m.tx - m.a.x, dy = m.ty - m.a.y, d = Math.hypot(dx, dy);
      if (d < 1) { m.a.x = m.tx; m.a.y = m.ty; m.a.moving = false; m.done = true; continue; }
      const st = Math.min(d, m.sp * dt); m.a.x += dx / d * st; m.a.y += dy / d * st; m.a.moving = true;
      if (m.a.kind === 'hero' || m.a.kind === 'person') m.a.dir = dirFromVec(dx, dy);
    }
    this.movers = this.movers.filter(m => !m.done);
    // camera: follow a subject, ease towards the target with a slow critically-damped glide
    if (this.follow) { const f = this.focusOf(this.follow); if (f) { this.camT.x = f.x; this.camT.y = f.y; } }
    const k = 1 - Math.exp(-dt * this.camRate);
    this.cam.x += (this.camT.x - this.cam.x) * k; this.cam.y += (this.camT.y - this.cam.y) * k; this.cam.z += (this.camT.z - this.cam.z) * k;
    if (this.stage.parts) updateFX(this.stage, dt);
    if (this.raining && this.rain.length < 110) for (let n = 0; n < 5; n++) this.rain.push({ x: rand(W + 80), y: rand(-20, H), v: rand(220, 300) });
    for (const r of this.rain) { r.y += r.v * dt; r.x -= r.v * 0.3 * dt; if (r.y > H) { if (this.raining) { r.y = -8; r.x = rand(W + 80); } else r.dead = true; } }
    this.rain = this.rain.filter(r => !r.dead);
    for (const m of this.motes) { m.y -= m.v * dt; m.x += Math.sin(this.t * 0.6 + m.ph) * 4 * dt; if (m.y < -4) { m.y = H + 4; m.x = rand(W); } }
    this.petalA = approach(this.petalA, this.petalsOn && !this.raining && !this.grade ? 1 : 0, dt * 0.6);
    for (const k in this.gk) this.gk[k] = approach(this.gk[k], this.grade === k ? 1 : 0, dt * (k === 'memory' ? 1.4 : 0.8));
    if (this.ins) this.insT += dt;
    if (this.card) this.cardParticles(dt);
    updateGP(this.gp, dt);
    if (this.o.tick) this.o.tick(dt, this);
    for (const pt of this.petals) { pt.x += (pt.vx + Math.sin(this.t * pt.sw + pt.ph) * 6) * dt; pt.y += pt.vy * dt; pt.rot += pt.spin * dt; if (pt.y > H + 8 || pt.x < -10) Object.assign(pt, newPetal(false)); }
    if (this.cur && this.cur.every) this.cur.every(this, dt);
    if (Input.pressed('SKIP')) { this.skip(); return; }
    if (Input.down('B') || Input.down('START')) { this.skipT += dt; if (this.skipT > 0.9) { this.skip(); return; } } else this.skipT = 0;
    if (this.stepDone(dt)) { if (this.box) { Voice.stop(); this.box = null; } this.card = null; this.credits = null; this.next(); }
  }
  skip() { Voice.stop(); this.box = null; AudioSys.ambient(null); if (this.o.onSkip) this.o.onSkip(this); this.end(); }
  end() {
    if (this.ended) return; this.ended = true;
    Voice.stop(); AudioSys.ambient(null);
    this.stage.cinematic = false; this.stage.extra = [];
    if (Game.theater) {
      // watched from the title screen: nothing is saved, back to the menu
      S = Game.theater.prev; Game.theater = null;
      const t = new TitleScene(); t.awake = true; t.sel = 1; Game.setScene(t);
      return;
    }
    const next = this.o.next ? this.o.next() : this.stage;
    Game.setScene(next);
    if (this.o.onEnd) this.o.onEnd();
  }
  // ------------------------------------------------------------ drawing
  drawStage() {
    // a slow, constant dolly breath keeps every shot alive
    const st = this.stage, c = this.cam, z = Math.max(1, c.z) * (1 + 0.014 * (1 + Math.sin(this.t * 0.21)));
    const sway = { x: Math.sin(this.t * 0.7) * 0.9 + Math.sin(this.t * 1.9) * 0.3, y: Math.cos(this.t * 0.55) * 0.7 };
    let fsx, fsy;
    if (st instanceof TownScene) {
      st.cam.x = clamp(c.x - W / 2, 0, TW - W); st.cam.y = clamp(c.y - H / 2, 0, TH - H);
      fsx = c.x - st.cam.x; fsy = c.y - st.cam.y;
    } else { fsx = c.x; fsy = c.y - CAM_Y; }
    const hw = W / (2 * z), hh = H / (2 * z);
    fsx = clamp(fsx + sway.x, hw, W - hw); fsy = clamp(fsy + sway.y, hh, H - hh);
    const shk = this.shakeT > 0 ? this.shakeT * 3 : 0;
    ctx.save();
    ctx.translate(W / 2 + rand(-shk, shk), H / 2 + rand(-shk, shk)); ctx.scale(z, z); ctx.translate(-fsx, -fsy);
    this.xf = { fsx, fsy, z, town: st instanceof TownScene };
    st.draw();
    if (this.overlay) this.overlay(this);
    if (this.stageEmote && st.player) { const pl = st.player, ox = st.cam ? st.cam.x : 0, oy = st.cam ? st.cam.y : CAM_Y; const a = new Actor('_', 'marker', pl.x, pl.y); a.emote = this.stageEmote; a.emoteH = 38; a.draw(ox, oy); }
    ctx.restore();
  }
  draw() {
    this.drawStage();
    if (this.gk.night > 0) this.drawNightGrade(this.gk.night);
    if (this.gk.memory > 0) this.drawMemoryGrade(this.gk.memory);
    const warmDay = this.stage instanceof TownScene && !this.stage.night && !this.grade;
    // light shafts on warm days, slowly breathing
    if (warmDay && !this.card) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        const x0 = 40 + k * 90 + Math.sin(this.t * 0.25 + k) * 12, a = 0.05 + 0.03 * Math.sin(this.t * 0.6 + k * 1.7);
        const g = ctx.createLinearGradient(x0, 0, x0 - 60, H); g.addColorStop(0, `rgba(255,226,160,${a})`); g.addColorStop(1, 'rgba(255,226,160,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 22 + k * 4, 0); ctx.lineTo(x0 - 50, H); ctx.lineTo(x0 - 90, H); ctx.fill();
      }
      ctx.restore();
    }
    // atmosphere: drifting fog banks and dust motes in the light
    if (this.fogA > 0) {
      for (let k = 0; k < 7; k++) {
        const fx = ((k * 97 + this.t * (6 + k * 2)) % (W + 200)) - 100, fy = 40 + (k * 53) % (H - 60);
        ctx.globalAlpha = 0.07 * this.fogA; ell(ctx, fx - 70, fy - 18, 140 + k * 10, 36 + (k % 3) * 8, '#c8d4e8');
      }
      ctx.globalAlpha = 1;
    }
    for (const m of this.motes) { const a = (Math.sin(this.t * 2 + m.ph) + 1) / 2; ctx.globalAlpha = 0.25 * a; P(ctx, m.x, m.y, '#fff4d0'); }
    ctx.globalAlpha = 1;
    for (const r of this.rain) { ctx.globalAlpha = 0.45; R(ctx, r.x, r.y, 1, 3, '#9ac8e8'); R(ctx, r.x - 1, r.y + 3, 1, 3, '#9ac8e8'); }
    ctx.globalAlpha = 1;
    if (this.petalA > 0) drawPetals(this.petals, this.petalA);
    // painterly vignette (also when shaders are off)
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    vg.addColorStop(0, 'rgba(8,4,6,0)'); vg.addColorStop(1, 'rgba(8,4,6,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // 2.35:1 letterbox with gold hairlines
    const bh = Math.round(26 * ease(this.bars));
    if (bh) {
      R(ctx, 0, 0, W, bh, '#040203'); R(ctx, 0, H - bh, W, bh, '#040203');
      ctx.globalAlpha = 0.45 * this.bars; ctx.fillStyle = CINE.gold; ctx.fillRect(0, bh - 0.5, W, 0.5); ctx.fillRect(0, H - bh, W, 0.5); ctx.globalAlpha = 1;
    }
    // fades close like an iris of ink rather than a flat dimmer
    if (this.ins) this.ins(this, this.insT);
    if (this.fade > 0) inkIris(this.fade);
    if (this.gp.length && !this.card) drawGP(this.gp);
    if (this.box) this.drawSubtitle(bh);
    if (this.card) this.drawCard();
    if (this.credits) this.drawCredits();
    if (this.flash > 0) { ctx.globalAlpha = this.flash; R(ctx, 0, 0, W, H, this.flashCol); ctx.globalAlpha = 1; }
    // skip hint (keyboard / pad); phones get a SKIP button
    if (Input.device() !== 'touch' && !this.credits) {
      const a = 0.45 + (this.skipT > 0 ? 0.5 : 0), bw = Input.device() === 'key' ? keyCap(KEY_LABEL.B).width - 4 : 13;
      const x1 = W - 10, tw = textW('hold to skip', 7, false, SERIF, true);
      txt('hold to skip', x1, 15, { size: 7, align: 'right', color: CINE.cream, fam: SERIF, italic: true, alpha: a });
      btnGlyph(x1 - tw - bw - 4, 17, 'B');
      if (this.skipT > 0) { ctx.globalAlpha = 0.9; ctx.fillStyle = CINE.gold; ctx.fillRect(x1 - tw, 18, tw * clamp(this.skipT / 0.9, 0, 1), 0.6); ctx.globalAlpha = 1; }
    }
  }
  drawSubtitle(bh) {
    const b = this.box, a = clamp(b.t / 0.35, 0, 1);
    const shown = b.chars | 0;
    if (b.narr) {
      // narration: an italic serif line in the middle of the frame, words bleeding in like ink
      const size = 10, lines = balancedWrap(b.text, 300, size, SERIF, true);
      const y0 = (b.letter ? H * 0.7 : H * 0.56) - (lines.length - 1) * 7.5;
      if (b.letter) spaced("FROM ALDRIC'S LETTER", W / 2, y0 - 16, 6, DISPLAY, CINE.gold, 1, 0.8 * a);
      const band = ctx.createLinearGradient(0, y0 - 30, 0, y0 + lines.length * 15 + 16);
      band.addColorStop(0, 'rgba(6,3,5,0)'); band.addColorStop(0.5, `rgba(6,3,5,${0.45 * a})`); band.addColorStop(1, 'rgba(6,3,5,0)');
      ctx.fillStyle = band; ctx.fillRect(0, y0 - 30, W, lines.length * 15 + 46);
      inkWords(lines, W / 2, y0, 15, size, SERIF, true, CINE.cream, shown, a);
      const lw = Math.min(90, 20 + this.t * 60) * a;
      ctx.globalAlpha = 0.55 * a; ctx.fillStyle = CINE.gold; ctx.fillRect(W / 2 - lw / 2, y0 + (lines.length - 1) * 15 + 8, lw, 0.5); ctx.globalAlpha = 1;
      diamond(W / 2, y0 + (lines.length - 1) * 15 + 8.25, 1.6, CINE.gold, 0.8 * a);
      return;
    }
    // dialogue: film subtitles above the lower bar, the speaker's name in gold capitals between hairlines
    const size = 9, lines = balancedWrap(b.text, 310, size, SERIF, false).slice(0, 3);
    const lastY = H - Math.max(bh, 12) - 9, y0 = lastY - (lines.length - 1) * 12;
    const top = y0 - 26;
    const g = ctx.createLinearGradient(0, top, 0, H - bh);
    g.addColorStop(0, 'rgba(4,2,3,0)'); g.addColorStop(0.45, `rgba(4,2,3,${0.5 * a})`); g.addColorStop(1, `rgba(4,2,3,${0.72 * a})`);
    ctx.fillStyle = g; ctx.fillRect(0, top, W, H - bh - top);
    const name = b.who.toUpperCase(), ny = y0 - 13;
    const nw = spacedW(name, 7, DISPLAY, 1);
    spaced(name, W / 2, ny, 7, DISPLAY, WHO_COL[b.who] || CINE.gold, 1, a);
    const lw = 26 * a;
    ctx.globalAlpha = 0.7 * a; ctx.fillStyle = CINE.gold;
    ctx.fillRect(W / 2 - nw / 2 - 6 - lw, ny - 2.5, lw, 0.5); ctx.fillRect(W / 2 + nw / 2 + 6, ny - 2.5, lw, 0.5); ctx.globalAlpha = 1;
    diamond(W / 2 - nw / 2 - 6 - lw, ny - 2.25, 1.3, CINE.gold, a); diamond(W / 2 + nw / 2 + 6 + lw, ny - 2.25, 1.3, CINE.gold, a);
    inkWords(lines, W / 2, y0, 12, size, SERIF, false, CINE.cream, shown, a);
    const talking = Voice.busy() || b.chars < b.text.length;
    if (!talking && b.hold > 0.2) diamond(W / 2 + textW(lines[lines.length - 1], size, false, SERIF) / 2 + 7, lastY - 3, 1.8, CINE.gold, 0.5 + 0.5 * Math.sin(this.t * 5));
  }
  // chapter card: the title appears in pale gold, then withers away into petals and dust
  gommageT(c) { return { start: Math.min(2.2, c.dur * 0.3), len: Math.max(2.6, c.dur - Math.min(2.2, c.dur * 0.3) - 1.6) }; }
  cardParticles(dt) {
    const c = this.card, T = c.t, g = c.g, { start, len } = this.gommageT(c);
    const p = clamp((T - start) / len, 0, 1);
    if (p > 0 && p < 1) {
      c.spawnP -= dt; c.spawnD -= dt;
      while (c.spawnP <= 0) { c.spawnP += 0.03; const q = g.spawnPoint(p); if (q) this.gp.push(newGPetal(q[0], q[1])); }
      while (c.spawnD <= 0) { c.spawnD += 0.08; const q = g.spawnPoint(p); if (q) this.gp.push(newGDust(q[0], q[1])); }
      if (!c.gone) { c.gone = true; sfx('whoosh'); }
    }
  }
  drawCard() {
    const c = this.card, T = c.t, g = c.g, { start, len } = this.gommageT(c);
    const p = clamp((T - start) / len, 0, 1);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.65);
    bg.addColorStop(0, '#141112'); bg.addColorStop(1, '#040304');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const inA = clamp(T / 1.2, 0, 1), sideA = inA * (1 - clamp(p / 0.35, 0, 1));
    if (c.kicker) spaced(c.kicker.toUpperCase(), W / 2, H / 2 - 24, 7, DISPLAY, '#b9a27a', 2, sideA * 0.9);
    // the title raster, eaten away by noise as p grows
    const cy = H / 2 + 2;
    const img = g.render(p);
    const dw = g.w, dh = g.h, dx = W / 2 - dw / 2, dy = cy - dh * 0.72;
    ctx.save(); ctx.globalAlpha = ease(inA);
    ctx.drawImage(img, dx, dy + (1 - ease(inA)) * 3, dw, dh);
    // soft bloom around the letters
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 * ease(inA) * (1 - p);
    ctx.filter = 'blur(3px)'; ctx.drawImage(img, dx, dy, dw, dh); ctx.filter = 'none';
    ctx.restore();
    if (c.sub) txt(c.sub, W / 2, H / 2 + 26, { size: 9, align: 'center', color: '#cbbd9e', fam: SERIF, alpha: clamp((T - 0.7) / 0.9, 0, 1) * (1 - clamp(p / 0.3, 0, 1)) });
    drawGP(this.gp);
    const out = clamp((c.dur - T) / 0.8, 0, 1);
    if (out < 1) { ctx.globalAlpha = 1 - out; R(ctx, 0, 0, W, H, '#000'); ctx.globalAlpha = 1; }
  }
  // cold moonlight with the candle as the only warmth
  drawNightGrade(k) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.9 * k; ctx.fillStyle = '#3c4670'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
    const lights = this.nightLights ? this.nightLights(this) : [];
    for (const [x, y, r, col] of lights) { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    ctx.restore();
  }
  // a faded photograph: sepia, glowing edges, flicker and scratches
  drawMemoryGrade(k) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = 0.9 * k; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.7 * k; ctx.fillStyle = '#e8c89a'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = k;
    const gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.6);
    gr.addColorStop(0, 'rgba(255,236,200,0)'); gr.addColorStop(1, `rgba(255,236,200,${0.55 + Math.sin(this.t * 9) * 0.03})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const r = mulberry32(Math.floor(this.t * 12));
    ctx.globalAlpha = 0.18 * k;
    for (let i = 0; i < 2; i++) if (r() < 0.5) R(ctx, r() * W, 0, 0.6, H, '#fff4e0');
    for (let i = 0; i < 40; i++) P(ctx, r() * W, r() * H, r() < 0.5 ? '#fff4e0' : '#3a2a1a');
    ctx.globalAlpha = 1;
  }
  // scatter the whole frame into petals (a memory ending)
  petalBurst(n = 140) {
    for (let i = 0; i < n; i++) { const q = newGPetal(rand(W), rand(H * 0.15, H * 0.9)); q.age = -rand(0, 0.9); q.life = rand(3, 5); this.gp.push(q); }
    for (let i = 0; i < 50; i++) { const q = newGDust(rand(W), rand(H * 0.2, H * 0.9)); q.age = -rand(0, 1); this.gp.push(q); }
  }
  drawCredits() {
    const c = this.credits;
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b0608'); bg.addColorStop(1, '#170d12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    drawPetals(this.petals, 0.8);
    for (const f of c.flies) { const k = (Math.sin(c.t * 2 + f.ph) + 1) / 2; f.y -= 0.1; if (f.y < 0) f.y = H; ctx.globalAlpha = k * 0.7; P(ctx, f.x + Math.sin(c.t + f.ph) * 6, f.y, '#f0d890'); }
    ctx.globalAlpha = 1;
    c.lines.forEach((l, k) => {
      const y = c.y + k * 18; if (y < -10 || y > H + 10) return;
      const big = k === 0, a = clamp(Math.min(y / 40, (H - y) / 40), 0, 1);
      if (big) spaced(l.toUpperCase(), W / 2, y, 14, DISPLAY, '#ecd49a', 2, a);
      else txt(l, W / 2, y, { size: 9, align: 'center', color: CINE.cream, fam: SERIF, italic: !l.includes(':'), alpha: a });
    });
  }
}
// ---------------------------------------------------------------- cinematic lettering & paint
const CINE = { gold: '#d9b86a', cream: '#f3ead6' };
// wrap into the fewest lines, then even them out so no word is left alone on the last line
function balancedWrap(s, maxW, size, fam, italic) {
  const base = wrapText(s, maxW, size, fam, italic);
  if (base.length < 2) return base;
  let lo = maxW * 0.4, hi = maxW;
  for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapText(s, mid, size, fam, italic).length > base.length) lo = mid; else hi = mid; }
  return wrapText(s, hi + 1, size, fam, italic);
}
function spacedW(s, size, fam, spc) { let w = 0; for (const ch of s) w += textW(ch, size, true, fam) + spc; return w - spc; }
function spaced(s, cx, y, size, fam, col, spc, alpha = 1) {
  let x = cx - spacedW(s, size, fam, spc) / 2;
  setFont(size, true, fam); ctx.globalAlpha = alpha;
  for (const ch of s) { ctx.fillStyle = '#000'; ctx.fillText(ch, x + 0.5, y + 0.6); ctx.fillStyle = col; ctx.fillText(ch, x, y); x += textW(ch, size, true, fam) + spc; }
  ctx.globalAlpha = 1;
}
function diamond(x, y, r, col, alpha = 1) {
  ctx.globalAlpha = alpha; ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.fill(); ctx.globalAlpha = 1;
}
// centred lines whose words fade in (with a small rise) as they are spoken
function inkWords(lines, cx, y0, lh, size, fam, italic, col, shown, alpha) {
  let n = 0;
  lines.forEach((l, k) => {
    let x = cx - textW(l, size, false, fam, italic) / 2;
    for (const word of l.split(' ')) {
      const vis = clamp((shown - n + 2) / 5, 0, 1);
      if (vis > 0) {
        const yy = y0 + k * lh + (1 - vis) * 2;
        txt(word, x + 0.5, yy + 0.7, { size, fam, italic, color: '#000', alpha: vis * alpha * 0.8 });
        txt(word, x, yy, { size, fam, italic, color: col, alpha: vis * alpha });
      }
      x += textW(word + ' ', size, false, fam, italic); n += word.length + 1;
    }
  });
}
function newPetal(anywhere) {
  const near = Math.random() < 0.25;
  return {
    x: anywhere ? rand(W) : rand(W * 0.2, W + 40), y: anywhere ? rand(H) : rand(-30, -4),
    vx: -rand(6, 16) * (near ? 1.6 : 1), vy: rand(9, 20) * (near ? 1.7 : 1), rot: rand(6.28), spin: rand(-2.5, 2.5),
    sw: rand(0.6, 1.4), ph: rand(6.28), s: near ? rand(2.2, 3.2) : rand(1, 1.8), a: near ? 0.55 : 0.8,
    col: choice(['#b8324a', '#c8485a', '#8e2436', '#f0e2c0', '#d9b86a']),
  };
}
function drawPetals(list, alpha) {
  for (const pt of list) {
    const flip = Math.abs(Math.cos(pt.rot * 0.7));
    ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot);
    ctx.globalAlpha = alpha * pt.a; ctx.fillStyle = pt.col;
    ctx.beginPath(); ctx.ellipse(0, 0, pt.s, pt.s * 0.5 * (0.35 + flip * 0.65), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
// ---------------------------------------------------------------- the gommage (letters withering into petals)
function hash2(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
class Gommage {
  constructor(text, size) {
    const k = this.k = clamp(Math.round(cv.width / W), 2, 4);
    const measure = sz => { let w = 0; for (const ch of text) w += textW(ch, sz, true, DISPLAY) + sz * 0.08; return w; };
    // pixel capitals are wide: shrink long titles to fit the frame
    if (measure(size) > W - 44) size = Math.floor(size * (W - 44) / measure(size));
    setFont(size, true, DISPLAY);
    let tw = measure(size); const spc = size * 0.08;
    this.w = Math.ceil(tw + 8); this.h = Math.ceil(size * 1.5);
    const c = this.cv = mkCanvas(this.w * k, this.h * k), g = c.getContext('2d');
    g.font = `700 ${size * k}px ${DISPLAY}`; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
    let x = 4 * k; for (const ch of text) { g.fillText(ch, x, size * 1.08 * k); x += (textW(ch, size, true, DISPLAY) + spc) * k; }
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data, cw = c.width;
    // noise per lit pixel, then ranked so progress p erases exactly a fraction p of the ink
    const idx = [], nz = [];
    const f = size * k * 0.28;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 8) {
      const px = (i >> 2) % cw, py = ((i >> 2) / cw) | 0;
      idx.push(i >> 2); nz.push(vnoise(px / f, py / f) * 0.6 + vnoise(px / f * 2.3 + 7, py / f * 2.3 + 3) * 0.3 + vnoise(px / f * 5 + 11, py / f * 5) * 0.1);
    }
    const order = idx.map((_, j) => j).sort((a, b) => nz[a] - nz[b]);
    this.rank = new Float32Array(idx.length); order.forEach((j, r) => { this.rank[j] = r / order.length; });
    this.idx = Int32Array.from(idx); this.alpha = new Uint8Array(idx.length); for (let j = 0; j < idx.length; j++) this.alpha[j] = d[idx[j] * 4 + 3];
    this.cw = cw; this.img = g.createImageData(c.width, c.height); this.g = g; this.lastP = -1;
  }
  render(p) {
    if (Math.abs(p - this.lastP) < 0.002) return this.cv;
    this.lastP = p;
    const d = this.img.data, desat = clamp(p / 0.45, 0, 1), s = desat * desat * (3 - 2 * desat);
    const r0 = 236 + (94 - 236) * s, g0 = 207 + (94 - 207) * s, b0 = 163 + (94 - 163) * s;
    for (let j = 0; j < this.idx.length; j++) {
      const o = this.idx[j] * 4, n = this.rank[j];
      if (p > 0 && n <= p) { d[o + 3] = 0; continue; }
      const e = p > 0 && n - p < 0.025 ? 1 - (n - p) / 0.025 : 0;
      d[o] = r0 + (255 - r0) * e; d[o + 1] = g0 + (236 - g0) * e; d[o + 2] = b0 + (205 - b0) * e; d[o + 3] = this.alpha[j];
    }
    this.g.putImageData(this.img, 0, 0);
    return this.cv;
  }
  // a point on the edge that is dissolving right now (logical coords, relative to the card centre)
  spawnPoint(p) {
    const n = this.idx.length; if (!n) return null;
    let best = -1;
    for (let t = 0; t < 24; t++) { const j = (Math.random() * n) | 0, r = this.rank[j]; if (r > p - 0.04 && r <= p + 0.01) { best = j; break; } if (best < 0 && r > p) best = j; }
    if (best < 0) return null;
    const i = this.idx[best], x = (i % this.cw) / this.k, y = ((i / this.cw) | 0) / this.k;
    return [W / 2 - this.w / 2 + x, H / 2 + 2 - this.h * 0.72 + y];
  }
}
// petals and dust carried off by the wind (red and white petals, as in a rose garden in autumn)
function newGPetal(x, y) {
  const white = Math.random() < 0.34;
  return { kind: 'petal', x, y, age: 0, life: rand(4.5, 6.5), vx: -rand(8, 22), vy: -rand(2, 10), sw: rand(0.8, 1.8), ph: rand(6.28), amp: rand(10, 26),
    rx: rand(6.28), rz: rand(6.28), srx: rand(1.5, 4), srz: rand(-2, 2), s: rand(1.6, 2.8), white };
}
function newGDust(x, y) { return { kind: 'dust', x, y, age: 0, life: rand(3, 4.5), vx: -rand(6, 16), vy: -rand(3, 9), sw: rand(1, 2), ph: rand(6.28), amp: rand(8, 20), s: rand(0.35, 0.8) }; }
function updateGP(list, dt) {
  for (const q of list) {
    q.age += dt; if (q.age < 0) continue;
    const lk = clamp(q.age / q.life, 0, 1);
    q.x += (q.vx + Math.cos(q.age * q.sw + q.ph) * q.amp * lk) * dt;
    q.y += (q.vy + Math.sin(q.age * q.sw * 1.3 + q.ph) * q.amp * 0.6 * lk) * dt;
    if (q.kind === 'petal') { q.rx += q.srx * dt; q.rz += q.srz * dt; }
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].age > list[i].life) list.splice(i, 1);
  if (list.length > 420) list.splice(0, list.length - 420);
}
function glowSprite(col) {
  return cached('glow_' + col, () => { const c = mkCanvas(32, 32), g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c; });
}
function drawGP(list) {
  const redG = glowSprite('rgba(255,40,40,0.9)'), whiteG = glowSprite('rgba(255,250,240,1)'), dustG = glowSprite('rgba(200,200,200,0.8)');
  for (const q of list) {
    if (q.age < 0) continue;
    const lk = q.age / q.life, fade = 1 - clamp((lk - 0.8) / 0.2, 0, 1), grow = clamp(lk / 0.05, 0, 1);
    if (q.kind === 'dust') {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 * fade; ctx.drawImage(dustG, q.x - 2.5, q.y - 2.5, 5, 5);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade; ctx.fillStyle = '#9a9a9a'; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * grow, 0, 6.283); ctx.fill();
      continue;
    }
    const face = Math.abs(Math.cos(q.rx)), s = q.s * grow, shade = 0.4 + 0.6 * face;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (q.white ? 0.45 : 0.35) * fade;
    ctx.drawImage(q.white ? whiteG : redG, q.x - s * 3, q.y - s * 3, s * 6, s * 6);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade;
    const c = q.white ? Math.round(238 * shade) : 0;
    ctx.fillStyle = q.white ? `rgb(${c},${c},${Math.round(c * 0.97)})` : `rgb(${Math.round(175 * shade + 20)},${Math.round(6 * shade)},${Math.round(10 * shade)})`;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rz); ctx.scale(1, Math.max(0.18, face));
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.95, -s * 0.15, 0, s * 0.8); ctx.quadraticCurveTo(-s * 0.95, -s * 0.15, 0, -s); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// a soft iris of darkness closing on the centre
function inkIris(f) {
  f = clamp(f, 0, 1);
  if (f >= 0.999) { R(ctx, 0, 0, W, H, '#000'); return; }
  const r = (1 - f) * W * 0.75;
  const g = ctx.createRadialGradient(W / 2, H / 2, r * 0.55, W / 2, H / 2, r + 40);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${Math.min(1, 0.35 + f)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = f * 0.85; R(ctx, 0, 0, W, H, '#000'); ctx.globalAlpha = 1;
}
function isCine() { return Game.scene instanceof Cutscene; }

// ---------------------------------------------------------------- the story
const CHAPTERS = ['The Hollow Graveyard', 'The Forest Dungeon', 'The Desert Dungeon', 'The Void Temple'];
const GUARDIAN_LINES = [
  { pre: ['Candles... someone still mourns down here.', 'Turn back, little doctor. The dead keep what they take.', 'Then the dead can send me the bill.'],
    post: ['The bark remembers him... Aldric. He carved his name in me before he went below.', 'My grandfather was here.', 'Take the key, Keeper. The fifth door is hungry.'] },
  { pre: ['The trees are breathing. That can\'t be good.', 'Rot is patient, Keeper. We have all the time you lack.', 'Then I\'ll be quick.'],
    post: ['You smell of rain and graves. He smelled of pipe smoke and apples.', 'Then I\'m close.', 'Three locks are broken now. Listen... you can hear him breathing.'] },
  { pre: ['Sand in a cave. Sun with no sky. Of course.', 'Every grain here was once a traveller like you.', 'I travel light.'],
    post: ['The sands kept his footprints for ten years. I watched them every night.', 'Light, then. I\'m ready.', 'The last lock is not stone. It is light. Go.'] },
  { pre: ['Stars under my feet... I can hear the fifth door from here.', 'You are close enough to be afraid now.', 'I\'ve been afraid since the first door. I came anyway.'],
    post: ['No one returns from the fifth door unchanged. Not even me.', 'Whatever waits, I\'ve already paid its price.', 'The four keys sing now. Go to the gates, Moonkeeper.'] },
];

function storyPrologue() {
  const stage = new TownScene('gates', { night: true });
  stage.npcs = []; stage.player.x = -999; stage.player.y = -999;
  let pulse = 0;
  const steps = [
    { music: 'story', rain: true, ambient: 'rain', fog: true, run: cs => { cs.setCam(480, 64, 1.45, true); cs.overlay = fifthDoorPulse; } },
    { fade: 0, t: 3 },
    { shot: [480, 100], z: 1.0, rate: 0.22 },
    { narrate: 'Long ago, five doors rose from the earth, north of the town of Vellmoor.' },
    { lightning: true, wait: 1.1 },
    { shot: [224, 76], z: 1.35, rate: 0.45 },
    { narrate: 'Four of them open every night... breathing treasure, and the Hollow: a grey sickness that eats the careless.' },
    { shot: [480, 66], z: 1.8, rate: 0.3, run: () => { pulse = 1; } },
    { narrate: 'The fifth has never opened. The last man who tried was Aldric, keeper of the Moonkeeper shop.' },
    { lightning: true, wait: 0.7 },
    { narrate: 'That was ten years ago. He never came back.' },
    { wait: 1 },
    { fade: 1, t: 1.8 },
    { ambient: null, rain: false, fog: false, kicker: 'A tale of the five doors', title: GAME_TITLE, sub: 'a story of doors and debts', t: 7.5 },
    { music: 'town', run: cs => {
      pulse = 0; stage.night = false; cs.overlay = null;
      cs.add(new Actor('elder', 'person', 228, 606, { look: NPC_LOOKS.elder, dir: 0 }));
      cs.add(new Actor('hero', 'hero', 440, 626, { dir: 2 }));
      for (let k = 0; k < 3; k++) { const b = cs.add(new Actor('bird' + k, 'bird', 60 + k * 14, 520 - k * 6)); cs.movers.push({ a: b, tx: 420 + k * 20, ty: 470 - k * 10, sp: 34 }); }
      cs.setCam(200, 560, 1.0, true);
    } },
    { fade: 0, t: 2.2 },
    { shot: [214, 590], z: 1.2, rate: 0.35 },
    { wait: 1.2 },
    { follow: 'hero', z: 1.35, rate: 1.4 },
    { move: 'hero', to: [214, 626], speed: 40 },
    { move: 'hero', to: [200, 612], speed: 30 },
    { emote: 'elder', e: '!', sfx: 'select' },
    { face: 'elder', dir: 2 }, { face: 'hero', dir: 3 },
    { shot: [214, 592], z: 1.55, rate: 1.4 },
    { wait: 0.6 },
    { say: 'So the letter found you. You have his walk, you know... and his stubbornness, I hope.', who: 'Elder Oren' },
    { emote: 'hero', e: '...', wait: 0.7 },
    { say: 'The mask stays on, old man. The Hollow followed me all the way from the coast.', who: 'Keeper' },
    { say: 'Good. You will need it where you are going.', who: 'Elder Oren' },
    { say: 'Your grandfather\'s shop is yours now. Dusty tables, an empty chest... and a debt to the whole town.', who: 'Elder Oren' },
    { say: 'Sell what the dungeons give you. Grow strong. And perhaps one day that fifth door will answer to a Moonkeeper again.', who: 'Elder Oren' },
    { face: 'hero', dir: 1 },
    { shot: [200, 560], z: 1.15, rate: 0.8 },
    { wait: 0.8 },
    { say: 'Then I\'ll open it. One key at a time.', who: 'Keeper', wide: true },
    { move: 'elder', to: [300, 626], speed: 22, async: true },
    { shot: [205, 540], z: 1.0, rate: 0.3 },
    { wait: 1.8 },
    { fade: 1, t: 1.4 },
    { kicker: 'Chapter I', title: CHAPTERS[0], sub: 'where the candles still burn', t: 7 },
  ];
  function fifthDoorPulse(cs) {
    if (!pulse) return;
    const x = 480 - stage.cam.x, y = 76 - stage.cam.y, a = 0.25 + Math.sin(cs.t * 2) * 0.12;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 60); g.addColorStop(0, `rgba(120,255,200,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 60, y - 60, 120, 120); ctx.globalCompositeOperation = 'source-over';
  }
  return new Cutscene(stage, steps, {
    startBlack: true,
    next: () => new TownScene('shop'),
    onEnd: () => { S.flags.prologue = true; saveGame(); },
  });
}
function storyDungeonIntro(sc) {
  const L = GUARDIAN_LINES[sc.dIdx].pre, p = sc.player;
  const steps = [
    { run: cs => cs.setCam(192, 120, 1.0, true) },
    { shot: 'hero', z: 1.8, rate: 0.9 },
    { wait: 1.2 },
    { say: L[0], who: 'Keeper' },
    { sfx: 'boom', flash: '#2a0a2a', shake: 0.8, shot: [192, 110], z: 1.05, rate: 3 },
    { wait: 0.6 },
    { say: L[1], who: 'Guardian', g: sc.dIdx, wide: true },
    { emote: 'hero', e: '!', wait: 0.5 },
    { say: L[2], who: 'Keeper' },
    { shot: [192, 120], z: 1.0, rate: 1.6 },
    { wait: 0.8 },
  ];
  return new Cutscene(sc, steps, {});
}
function storyGuardianFalls(sc) {
  const i = sc.dIdx, L = GUARDIAN_LINES[i].post, col = DUNGEONS[i].color, p = sc.player, bx = sc.boss.x, by = sc.boss.y;
  const steps = [
    { run: cs => cs.setCam(192, 120, 1.0, true) },
    { shot: [bx, by - 20], z: 1.6, rate: 0.7, sfx: 'rumble' },
    { wait: 0.8 },
    { spawn: 'key', kind: 'key', x: bx, y: by - 4, col, sfx: 'teleport' },
    { follow: 'key', z: 2.0, rate: 1.2 },
    { until: (cs, dt) => { const k = cs.actor('key'); k.z = Math.min(26, k.z + dt * 14); if (Math.random() < 0.5) FX.burst(sc, k.x, k.y - k.z, [col, '#ffffff'], 2, 30); return k.z >= 26; } },
    { say: L[0], who: 'Guardian', g: i, wide: true },
    { say: L[1], who: 'Keeper' },
    { say: L[2], who: 'Guardian', g: i, wide: true, shot: 'key', z: 1.9, rate: 1.4 },
    { follow: 'key', z: 1.5, rate: 2 },
    { move: 'key', to: [p.x, p.y + 26], speed: 60 },
    { run: cs => { cs.actor('key').alpha = 0; FX.burst(sc, p.x, p.y - 12, [col, '#ffffff', C.gold], 26, 80); FX.ring(sc, p.x, p.y - 8, col, 4, 34, 0.6); }, sfx: 'open', flash: col, shot: 'hero', z: 2.1, rate: 5 },
    { emote: 'hero', e: '!', wait: 1.2 },
    { fade: 1, t: 1 },
    i < 3 ? { kicker: 'Chapter ' + ['II', 'III', 'IV'][i], title: CHAPTERS[i + 1], sub: 'the way below is open', t: 6.5 } : { kicker: 'Finale', title: 'The Fifth Door', sub: 'the last lock is light', t: 7 },
    { run: cs => cs.setCam(192, 120, 1.0, true) },
    { fade: 0, t: 0.8 },
  ];
  return new Cutscene(sc, steps, {});
}
function storyFinale() {
  const stage = new TownScene('gates', { night: true });
  stage.npcs = []; stage.player.x = -999; stage.player.y = -999;
  let glow = 0, open = 0;
  const door = { x: 480, y: 76 };
  const steps = [
    { music: 'story', fog: true, run: cs => { cs.add(new Actor('hero', 'hero', 480, 236, { dir: 1 })); cs.overlay = drawDoor; cs.setCam(480, 60, 1.5, true); } },
    { fade: 0, t: 2.4 },
    { shot: [480, 150], z: 1.1, rate: 0.35 },
    { wait: 2 },
    { follow: 'hero', z: 1.4, rate: 1 },
    { move: 'hero', to: [480, 178], speed: 24 },
    { shot: [480, 118], z: 1.3, rate: 0.7 },
    { wait: 1 },
    { say: 'Four keys. Four guardians. Let\'s see who answers.', who: 'Keeper', wide: true },
    { sfx: 'teleport', shot: [480, 96], z: 1.7, rate: 0.45, run: cs => { DUNGEONS.forEach((d, k) => { const a = cs.add(new Actor('k' + k, 'key', 480 + (k - 1.5) * 18, 172, { col: d.color })); a.z = 10; cs.movers.push({ a, tx: door.x + (k - 1.5) * 8, ty: door.y + 16, sp: 24 + k * 4 }); }); } },
    { wait: 3 },
    { sfx: 'rumble', shake: 2.5, run: cs => DUNGEONS.forEach((d, k) => { cs.actor('k' + k).alpha = 0; }) },
    { until: (cs, dt) => { glow = Math.min(1, glow + dt * 0.45); cs.shakeT = Math.max(cs.shakeT, 0.3); return glow >= 1; } },
    { flash: '#ffffff', sfx: 'boom', run: () => { open = 1; }, shot: [480, 120], z: 1.15, rate: 2 },
    { wait: 1.4 },
    { spawn: 'aldric', kind: 'person', x: 480, y: 112, look: ALDRIC_LOOK, dir: 0, alpha: 0, glow: true },
    { follow: 'aldric', z: 1.9, rate: 0.6 },
    { until: (cs, dt) => { const a = cs.actor('aldric'); a.alpha = Math.min(1, a.alpha + dt * 0.5); return a.alpha >= 1; } },
    { move: 'aldric', to: [466, 156], speed: 14 },
    { move: 'hero', to: [496, 172], speed: 20 },
    { face: 'hero', dir: 2 }, { face: 'aldric', dir: 3 },
    { emote: 'hero', e: '?', wait: 0.8 },
    { say: 'Ten years of knocking... and it is a doctor who answers.', who: 'Aldric' },
    { say: 'Grandfather. The shop kept your seat warm. More or less.', who: 'Keeper' },
    { say: 'Behind this door the Hollow is born. I held it shut from the other side for as long as I could.', who: 'Aldric' },
    { say: 'Four keys to open it... and one Keeper to close it for good. That part, we do together.', who: 'Aldric' },
    { emote: 'hero', e: 'heart', wait: 0.8 },
    { say: 'Together, then.', who: 'Keeper' },
    { face: 'aldric', dir: 1 },
    { shot: [480, 110], z: 1.35, rate: 0.5 },
    { move: 'aldric', to: [468, 118], speed: 14, async: true },
    { move: 'hero', to: [492, 124], speed: 16 },
    { run: () => { open = 2; }, sfx: 'teleport', flash: '#e8fff4', shot: [480, 80], z: 2.2, rate: 0.35 },
    { fade: 1, t: 2.4 },
    { fog: false, narrate: 'That night, the fifth door closed forever. The Hollow thinned into a morning mist.' },
    { narrate: 'And the grey left the Keeper\'s hand, the way frost leaves a window in spring.' },
    { narrate: 'And in Vellmoor, the lamps of the Moonkeeper shop burned until dawn... for two keepers now.' },
    { music: 'title', credits: [GAME_TITLE, 'A tribute to the shopkeeper-adventurers', '', 'Story, code and pixel art', 'made with Claude Code', '', 'Fonts: Pixelify Sans and Silkscreen', '(SIL Open Font License)', '', 'Thank you for playing!'] },
  ];
  function drawDoor(cs) {
    const x = door.x - stage.cam.x, y = door.y - stage.cam.y;
    if (glow <= 0) return;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30 + glow * 60);
    g.addColorStop(0, `rgba(160,255,220,${0.6 * glow})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 100, y - 100, 200, 200);
    if (open >= 1) {
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + (k - 4) * 0.24 + Math.sin(cs.t * 0.8 + k) * 0.05;
        ctx.fillStyle = `rgba(200,255,235,${open === 2 ? 0.2 : 0.12})`;
        ctx.beginPath(); ctx.moveTo(x - 4, y + 10); ctx.lineTo(x + Math.cos(a - 0.06) * 220, y + Math.sin(a - 0.06) * 220); ctx.lineTo(x + Math.cos(a + 0.06) * 220, y + Math.sin(a + 0.06) * 220); ctx.lineTo(x + 4, y + 10); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (open >= 1) { ell(ctx, x - 20, y - 26, 40, 30, '#e8fff4'); R(ctx, x - 20, y - 11, 40, 36, '#e8fff4'); ell(ctx, x - 14, y - 20, 28, 20, '#ffffff'); }
  }
  return new Cutscene(stage, steps, {
    startBlack: true,
    next: () => new TownScene('gates'),
    onEnd: () => { S.flags.finale = true; saveGame(); toast('Aldric now helps out in your shop. Thank you for playing!', C.mint); },
  });
}

// ---------------------------------------------------------------- interlude: the last letter
// After the first guardian falls, the Keeper finds Aldric's letter hidden in the shop chest.
// A memory, a confession, and the thing the Keeper has been hiding under the gloves.
const CHILD_LOOK = { id: 'child', kid: true, skin: '#f0c49a', hair: '#2a2020', hairStyle: 'short', shirt: '#3a3446', pants: '#2a2630', scarf: '#c83a3a' };
function storyLastLetter() {
  const stage = new ShopScene();
  stage.player.x = -999; stage.player.y = -999;
  stage.cat.x = 150; stage.cat.y = 176; stage.cat.state = 'sleep';
  const chest = { x: CHEST_POS.x, y: CHEST_POS.y + 14 };
  let heartT = 0, heartOn = false;
  const steps = [
    { music: 'none', ambient: 'rain', grade: 'night', petals: false, run: cs => {
      cs.add(new Actor('hero', 'hero', 192, 206, { dir: 1 }));
      cs.setCam(192, 118, 1.05, true);
      cs.nightLights = cs2 => { const h = cs2.actor('hero'), c = cs2.w2s(244, 136), p = h ? cs2.w2s(h.x, h.y - 12) : [0, 0];
        const fl = 1 + Math.sin(cs2.t * 11) * 0.05 + Math.sin(cs2.t * 23) * 0.03;
        return [[c[0], c[1], 70 * fl * cs2.xf.z, 'rgba(255,170,80,0.5)'], [p[0], p[1], 34 * cs2.xf.z, 'rgba(255,190,120,0.18)'], [cs2.w2s(99, 30)[0], cs2.w2s(99, 30)[1], 60 * cs2.xf.z, 'rgba(120,150,255,0.25)']]; };
    } },
    { fade: 0, t: 3 },
    { wait: 1.2 },
    { follow: 'hero', z: 1.35, rate: 0.6 },
    { move: 'hero', to: [192, 160], speed: 20 },
    { move: 'hero', to: [chest.x - 2, chest.y + 2], speed: 18 },
    { face: 'hero', dir: 1 },
    { wait: 0.9 },
    { sfx: 'open', shot: [chest.x - 34, chest.y - 4], z: 2.1, rate: 0.7 },
    { wait: 0.8 },
    { emote: 'hero', e: '!', wait: 1 },
    { say: 'A false bottom... Grandfather, you old fox.', who: 'Keeper' },
    { say: 'A letter. My name on it, in your handwriting.', who: 'Keeper' },
    { wait: 0.6 },
    { music: 'lament', shot: [chest.x - 40, chest.y - 8], z: 2.5, rate: 0.25 },
    { narrate: 'If you are reading this, little lantern, then the shop found its way back to you.', who: 'Aldric', letter: true },
    // the memory
    { sfx: 'chime', flash: '#fff4e0', grade: 'memory', run: cs => {
      cs.actor('hero').alpha = 0;
      cs.add(new Actor('child', 'person', 248, 184, { look: CHILD_LOOK, dir: 1 }));
      cs.add(new Actor('aldric', 'person', 246, 139, { look: ALDRIC_LOOK, dir: 0 }));
      cs.setCam(250, 176, 2.0, true);
    } },
    { shot: [250, 178], z: 1.8, rate: 0.2 },
    { narrate: 'Do you remember the winter your mother fell ill? You asked me why I always wore gloves at the counter.', who: 'Aldric', letter: true },
    { say: 'Grandpa, why do you always wear gloves?', who: 'Little Keeper' },
    { say: 'Because my hands get cold, little lantern. Now hold still. This mask was mine when I was your age.', who: 'Aldric' },
    { move: 'child', to: [248, 168], speed: 14 },
    { sfx: 'chime', flash: '#fff4e0', run: cs => { const c = cs.actor('child'); c.kind = 'hero'; c.scale = 0.72; c.dir = 1; } },
    { wait: 0.8 },
    { say: 'As long as you wear it, the Hollow will never find you. Promise me you\'ll keep it on.', who: 'Aldric' },
    { emote: 'child', e: 'heart', wait: 1.2 },
    { narrate: 'I lied to you that day. The gloves were never for the cold.', who: 'Aldric', letter: true },
    // the memory crumbles into petals
    { sfx: 'whoosh', run: cs => { cs.petalBurst(170); } },
    { until: (cs, dt) => { for (const id of ['child', 'aldric']) { const a = cs.actor(id); a.alpha = Math.max(0, a.alpha - dt * 0.7); } return cs.actor('child').alpha <= 0; } },
    { grade: 'night', run: cs => { cs.actor('hero').alpha = 1; cs.setCam(chest.x - 40, chest.y - 6, 2.2, true); } },
    { wait: 0.8 },
    { narrate: 'The Hollow does not kill. It forgets. First the colour... then the warmth... then you are petals on the wind, and no one remembers your name.', who: 'Aldric', letter: true },
    { narrate: 'I am going through the fifth door, so that it forgets me instead of you.', who: 'Aldric', letter: true },
    { narrate: 'Keep the mask on. Keep the lamps lit. And if one day you hear me knocking... do not open the door.', who: 'Aldric', letter: true },
    { narrate: 'Your grandfather, who loved you more than the whole world.', who: 'Aldric', letter: true },
    // silence
    { music: 'none', wait: 2.2 },
    { face: 'hero', dir: 0, shot: 'hero', z: 2.8, rate: 0.35 },
    { wait: 1.4 },
    { say: '...You were too late, grandfather.', who: 'Keeper' },
    // the hand
    { insert: drawHandInsert, sfx: 'rumble', run: () => { heartOn = true; } },
    { wait: 2.6 },
    { say: 'It found me on the coast, three winters ago.', who: 'Keeper' },
    { wait: 1.6 },
    { say: 'I kept the mask on, just like I promised. I just never told anyone about the gloves.', who: 'Keeper' },
    { music: 'lament', wait: 3.2 },
    { insert: null, run: () => { heartOn = false; } },
    // the cat comes to sit with the Keeper
    { shot: [chest.x - 20, chest.y + 2], z: 2.1, rate: 0.4, run: () => { stage.cat.state = 'walk'; } },
    { until: (cs, dt) => { const c = stage.cat, h = cs.actor('hero'), tx = h.x - 12, ty = h.y + 3, dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { c.state = 'sit'; c.flip = true; return true; } const m = Math.min(d, 26 * dt); c.x += dx / d * m; c.y += dy / d * m; c.flip = dx > 0; c.anim += dt * 8; return false; } },
    { run: () => { for (let i = 0; i < 4; i++) stage.amb.hearts.push({ x: stage.cat.x + rand(-4, 4), y: stage.cat.y - 14, vy: -rand(10, 16), t: -i * 0.25, life: 1.4 }); }, wait: 1.4 },
    { face: 'hero', dir: 2, wait: 0.8 },
    { say: 'I know. I know... I\'ll hurry.', who: 'Keeper' },
    { shot: [192, 120], z: 1.05, rate: 0.18 },
    { wait: 2.6 },
    { fade: 1, t: 2.6 },
    { grade: null, ambient: null, kicker: 'Interlude', title: 'The Last Letter', sub: 'what the Hollow forgets', t: 8 },
  ];
  return new Cutscene(stage, steps, {
    startBlack: true, petals: false,
    tick: (dt, cs) => {
      updateShopAmbient(stage, dt);
      if (stage.cat.state !== 'walk') stage.cat.anim += dt * 2;
      if (heartOn) { heartT -= dt; if (heartT <= 0) { heartT = 1.15; sfx('heart'); } }
    },
    next: () => new ShopScene(),
    onEnd: () => { S.flags.letter = true; saveGame(); },
  });
}
// close-up: the glove comes off, and the hand underneath is turning to petals
function drawHandInsert(cs, T) {
  const st = cs._hand || (cs._hand = {
    cracks: Array.from({ length: 16 }, () => { let x = rand(160, 226), y = rand(58, 170); const pts = [[x, y]]; for (let i = 0; i < 5; i++) { x += rand(-5, 5); y += rand(-7, 3); pts.push([x, y]); } return pts; }),
    spawn: 0,
  });
  const inA = clamp(T / 1.4, 0, 1);
  // dark room, candle light from the right
  R(ctx, 0, 0, W, H, '#0a0706');
  const glow = ctx.createRadialGradient(310, 160, 0, 310, 160, 260); glow.addColorStop(0, `rgba(120,60,24,${0.55 * inA})`); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  const zoom = 1 + T * 0.01;
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = inA;
  const grey = clamp((T - 2.2) / 9, 0, 1), erode = clamp((T - 4.2) / 10, 0, 1);
  const yF = 52 + ease(grey) * 118;
  // fingers: [base x, base y, length, width, angle]
  const F = [[172, 112, 36, 11, -0.3], [185, 104, 43, 11.5, -0.1], [199, 104, 41, 11, 0.07], [212, 110, 33, 10, 0.25]];
  const hand = new Path2D();
  const tips = [];
  const cap = (bx, by, len, w, ang) => {
    const p = new Path2D(); p.roundRect(-w / 2, -len, w, len + 6, w / 2);
    hand.addPath(p, new DOMMatrix().translate(bx, by).rotate(ang * 57.2958));
    tips.push([bx + Math.sin(ang) * len, by - Math.cos(ang) * len, bx, by]);
  };
  F.forEach(([bx, by, len, w, ang], i) => cap(bx, by, len * (1 - erode * (0.28 + i * 0.04)), w, ang));
  cap(222, 142, 30 * (1 - erode * 0.2), 12, 1.05);
  const palm = new Path2D(); palm.ellipse(194, 138, 32, 30, 0, 0, Math.PI * 2); hand.addPath(palm);
  const wrist = new Path2D(); wrist.roundRect(174, 150, 42, 40, 10); hand.addPath(wrist);
  // sleeve
  ctx.fillStyle = '#141018'; ctx.beginPath(); ctx.roundRect(160, 176, 70, 60, 8); ctx.fill();
  ctx.fillStyle = '#2a1a24'; ctx.fillRect(160, 176, 70, 5);
  // skin with warm light from the right and shadow on the left
  ctx.fillStyle = '#d6a488'; ctx.fill(hand);
  ctx.save(); ctx.clip(hand);
  const sh = ctx.createLinearGradient(150, 0, 240, 0); sh.addColorStop(0, 'rgba(40,18,12,0.55)'); sh.addColorStop(0.55, 'rgba(40,18,12,0)'); sh.addColorStop(1, 'rgba(255,190,120,0.25)');
  ctx.fillStyle = sh; ctx.fillRect(140, 40, 110, 160);
  // the grey spreading down from the fingertips
  const gg = ctx.createLinearGradient(0, 40, 0, yF + 16); gg.addColorStop(0, 'rgba(126,130,138,0.97)'); gg.addColorStop(Math.max(0.01, (yF - 40) / (yF + 16 - 40)), 'rgba(126,130,138,0.9)'); gg.addColorStop(1, 'rgba(126,130,138,0)');
  ctx.fillStyle = gg; ctx.fillRect(140, 40, 110, yF - 24);
  ctx.save(); ctx.beginPath(); ctx.rect(140, 40, 110, yF - 40); ctx.clip();
  ctx.strokeStyle = 'rgba(40,40,52,0.8)'; ctx.lineWidth = 0.5;
  for (const pts of st.cracks) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  // warm rim light on the side facing the candle, and a soft shadow under the hand
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(0.8, 0); ctx.strokeStyle = 'rgba(255,170,100,0.35)'; ctx.lineWidth = 1; ctx.stroke(hand); ctx.restore();
  // palm lines
  ctx.strokeStyle = 'rgba(90,50,38,0.5)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(172, 132); ctx.quadraticCurveTo(192, 124, 214, 134); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(176, 142); ctx.quadraticCurveTo(196, 150, 206, 164); ctx.stroke();
  // the glove sliding off
  const gk = clamp(T / 1.8, 0, 1);
  if (gk < 1) {
    ctx.save(); ctx.globalAlpha = inA * (1 - ease(gk)); ctx.translate(0, ease(gk) * 90);
    ctx.fillStyle = '#231a1e'; ctx.fill(hand); ctx.strokeStyle = '#3a2c30'; ctx.lineWidth = 0.6; ctx.stroke(hand);
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // petals peel away from the crumbling fingertips
  if (grey > 0.05) {
    st.spawn -= 1 / 60;
    while (st.spawn <= 0) {
      st.spawn += 0.09 - erode * 0.05;
      const [tx, ty, bx, by] = choice(tips), k = rand(0.75, 1.02), x = bx + (tx - bx) * k, y = by + (ty - by) * k;
      if (y < yF) { const q = newGPetal(W / 2 + (x - W / 2) * zoom, H / 2 + (y - H / 2) * zoom); q.vy = -rand(6, 16); q.vx = -rand(6, 18); cs.gp.push(q); if (Math.random() < 0.4) cs.gp.push(newGDust(q.x, q.y)); }
    }
  }
}

// ---------------------------------------------------------------- theater: watch the story scenes from the title screen
class TheaterUI extends Overlay {
  constructor() { super(); this.sel = 0; this.items = [['Prologue', 'The five doors'], ['The Last Letter', 'An interlude'], ['The Fifth Door', 'Finale']]; }
  play(i) {
    this.close(); sfx('confirm');
    const prev = S; Game.theater = { prev };
    S = freshState(9); S.tut = { done: true }; S.flags.prologue = true;
    const cs = [storyPrologue, storyLastLetter, storyFinale][i]();
    Game.fade(() => Game.setScene(cs));
  }
  update(dt) {
    super.update(dt);
    const d = Input.dir();
    if (d === 'U') { this.sel = (this.sel + 2) % 3; sfx('move'); }
    if (d === 'D') { this.sel = (this.sel + 1) % 3; sfx('move'); }
    if (tapHits(this)) return;
    if (Input.pressed('A')) this.play(this.sel);
    if (Input.pressed('B')) { sfx('cancel'); this.close(); }
  }
  draw() {
    this.hits = [];
    ctx.globalAlpha = 0.86; R(ctx, 0, 0, W, H, '#07050a'); ctx.globalAlpha = 1;
    spaced('THEATER', W / 2, 44, 11, DISPLAY, '#ecd49a', 3, 1);
    ctx.globalAlpha = 0.7; ctx.fillStyle = CINE.gold; ctx.fillRect(W / 2 - 70, 52, 140, 0.5); ctx.globalAlpha = 1; diamond(W / 2, 52.25, 2, CINE.gold);
    this.items.forEach(([t, sub], i) => {
      const y = 82 + i * 34, sel = i === this.sel;
      hit(this, W / 2 - 90, y - 14, 180, 28, () => { this.sel = i; this.play(i); });
      if (sel) { ctx.globalAlpha = 0.12; R(ctx, W / 2 - 90, y - 14, 180, 28, '#d9b86a'); ctx.globalAlpha = 1; diamond(W / 2 - 84, y - 3, 2.2, CINE.gold); diamond(W / 2 + 84, y - 3, 2.2, CINE.gold); }
      txt(t, W / 2, y, { size: 11, align: 'center', color: sel ? '#fff3d6' : '#cbbd9e', fam: SERIF, bold: true });
      txt(sub, W / 2, y + 10, { size: 7, align: 'center', color: '#9a8c70', fam: SERIF, italic: true });
    });
    promptBar([['A', 'Watch'], ['B', 'Back']], H - 8);
  }
}
