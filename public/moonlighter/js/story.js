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
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    if (this.alpha <= 0 && !this.emote) return;
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
const WHO_COL = { Keeper: '#ff7a6a', 'Elder Oren': '#8ad8a8', Aldric: '#f0c878', Guardian: '#c88ae8', Narrator: '#efe3c5' };
class Cutscene {
  constructor(stage, steps, o = {}) {
    this.stage = stage; this.steps = steps; this.o = o;
    stage.cinematic = true; stage.extra = stage.extra || [];
    this.actors = {}; this.movers = []; this.t = 0; this.st = 0; this.i = -1;
    this.bars = 0; this.fade = o.startBlack ? 1 : 0; this.flash = 0; this.flashCol = '#ffffff'; this.flash2 = 0;
    this.rain = []; this.raining = false; this.box = null; this.card = null; this.credits = null; this.skipT = 0; this.overlay = null; this.shakeT = 0;
    this.fog = false; this.fogA = 0; this.motes = Array.from({ length: 36 }, () => ({ x: rand(W), y: rand(H), v: rand(3, 9), ph: rand(6) }));
    const p = stage.player && stage.player.x > -500 ? stage.player : { x: W / 2, y: H / 2 };
    this.cam = { x: p.x, y: p.y - 12, z: 1 }; this.camT = { ...this.cam }; this.camRate = 2; this.follow = null;
    this.next();
  }
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
    if (s.spawn) this.add(new Actor(s.spawn, s.kind || 'person', s.x, s.y, s));
    if (s.face) this.actors[s.face].dir = s.dir;
    if (s.emote) { const a = this.actors[s.emote] || (s.emote === 'hero' ? null : null); if (a) a.emote = { e: s.e, t: 0 }; else if (s.emote === 'hero' && this.stage.player) this.stageEmote = { e: s.e, t: 0 }; }
    if (s.fade !== undefined) this.fadeFrom = this.fade;
    if (s.shot !== undefined) this.shot(s);
    if (s.follow) { this.follow = s.follow; this.camT.z = s.z ?? this.camT.z; this.camRate = s.rate ?? 2; }
    if (s.say || s.narrate) {
      const text = s.say || s.narrate, who = s.who || 'Narrator';
      this.box = { text, who, narr: !!s.narrate, chars: 0, hold: 0, t: 0, portrait: s.narrate ? null : portraitFor(who, s.g) };
      // shot / reverse-shot: frame whoever is talking, unless the step asks for a wide
      if (s.say && !s.wide && s.shot === undefined) {
        const id = WHO_ACTOR[who];
        const f = id && this.focusOf(id);
        if (f) { this.follow = id; this.camT.z = s.z || 1.75; this.camRate = 1.8; }
      }
      Voice.speak(text, who);
    }
    if (s.title) { this.card = { title: s.title, sub: s.sub || '', t: 0, dur: s.t || 3.6 }; sfx('boom'); }
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
    const next = this.o.next ? this.o.next() : this.stage;
    Game.setScene(next);
    if (this.o.onEnd) this.o.onEnd();
  }
  // ------------------------------------------------------------ drawing
  drawStage() {
    const st = this.stage, c = this.cam, z = Math.max(1, c.z);
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
    st.draw();
    if (this.overlay) this.overlay(this);
    if (this.stageEmote && st.player) { const pl = st.player, ox = st.cam ? st.cam.x : 0, oy = st.cam ? st.cam.y : CAM_Y; const a = new Actor('_', 'marker', pl.x, pl.y); a.emote = this.stageEmote; a.emoteH = 38; a.draw(ox, oy); }
    ctx.restore();
  }
  draw() {
    this.drawStage();
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
    // 2.35:1 letterbox
    const bh = Math.round(29 * ease(this.bars));
    if (bh) { R(ctx, 0, 0, W, bh, '#000'); R(ctx, 0, H - bh, W, bh, '#000'); }
    if (this.fade > 0) { ctx.globalAlpha = clamp(this.fade, 0, 1); R(ctx, 0, 0, W, H, '#000'); ctx.globalAlpha = 1; }
    if (this.box) this.drawSubtitle();
    if (this.card) this.drawCard();
    if (this.credits) this.drawCredits();
    if (this.flash > 0) { ctx.globalAlpha = this.flash; R(ctx, 0, 0, W, H, this.flashCol); ctx.globalAlpha = 1; }
    // skip hint (keyboard / pad); phones get a SKIP button
    if (Input.device() !== 'touch') {
      const a = 0.4 + (this.skipT > 0 ? 0.5 : 0);
      const bw = Input.device() === 'key' ? keyCap(KEY_LABEL.B).width - 4 : 13;
      const x0 = W - 8 - textW('skip', 6) - bw - textW('Hold', 6) - 8;
      ctx.globalAlpha = a; txt('Hold', x0, 12, { size: 6, color: '#efe3c5' }); ctx.globalAlpha = 1;
      btnGlyph(x0 + textW('Hold', 6) + 4, 14, 'B');
      ctx.globalAlpha = a; txt('skip', x0 + textW('Hold', 6) + bw + 8, 12, { size: 6, color: '#efe3c5' }); ctx.globalAlpha = 1;
      if (this.skipT > 0) R(ctx, x0, 17, (W - 8 - x0) * clamp(this.skipT / 0.9, 0, 1), 1, C.mint);
    }
  }
  drawSubtitle() {
    const b = this.box, a = clamp(b.t / 0.3, 0, 1);
    if (b.narr) {
      // narration: centred, each word fades in as it is spoken
      const full = wrapText(b.text, 300, 9);
      const shownN = b.chars | 0;
      let n = 0;
      const y0 = H * 0.6 - (full.length - 1) * 6;
      full.forEach((l, k) => {
        const lw = textW(l, 9); let x = W / 2 - lw / 2;
        for (const word of l.split(' ')) {
          const vis = clamp((shownN - n) / 6, 0, 1);
          if (vis > 0) txt(word, x, y0 + k * 13, { size: 9, color: '#efe3c5', outline: '#07050a', alpha: vis * a });
          x += textW(word + ' ', 9); n += word.length + 1;
        }
      });
      return;
    }
    // film subtitles in the lower letterbox, speaker name above, small portrait medallion
    const col = WHO_COL[b.who] || '#efe3c5';
    const lines = wrapText(b.text, 290, 8).slice(0, 2);
    const baseY = H - 29;
    ctx.globalAlpha = a;
    if (b.portrait) {
      const cx = 24, cy = baseY + 2, r = 15;
      ell(ctx, cx - r - 1, cy - r - 1, r * 2 + 2, r * 2 + 2, '#000'); ell(ctx, cx - r, cy - r, r * 2, r * 2, HP_COL.gold); ell(ctx, cx - r + 1, cy - r + 1, r * 2 - 2, r * 2 - 2, b.who === 'Guardian' ? '#1a1420' : '#2a2030');
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2); ctx.clip();
      const p = b.portrait, s = Math.min((r * 2 + 6) / p.height, (r * 2 + 6) / p.width);
      ctx.drawImage(p, cx - p.width * s / 2, cy - r - 2, p.width * s, p.height * s);
      ctx.restore();
    }
    pText(ctx, b.who.toUpperCase(), W / 2 - pTextW(b.who.toUpperCase()) / 2, baseY + 3, col);
    const talking = Voice.busy() || b.chars < b.text.length;
    if (talking) for (let k = 0; k < 3; k++) R(ctx, W / 2 + pTextW(b.who.toUpperCase()) / 2 + 3 + k * 3, baseY + 5 - (Math.floor(this.t * 8 + k) % 3 === 0 ? 1 : 0), 2, 1, col);
    lines.forEach((l, k) => txt(l, W / 2, baseY + 17 + k * 10, { size: 8, align: 'center', color: '#f4efe0' }));
    ctx.globalAlpha = 1;
    if (!talking && b.hold > 0.2 && Math.sin(this.t * 6) > -0.3) R(ctx, W - 14, H - 9, 4, 4, col);
  }
  drawCard() {
    const c = this.card, T = c.t, out = clamp((c.dur - T) / 0.8, 0, 1);
    R(ctx, 0, 0, W, H, '#050308');
    for (const m of this.motes) { ctx.globalAlpha = 0.3 * (Math.sin(this.t * 2 + m.ph) + 1) / 2 * out; P(ctx, m.x, m.y, '#fff4d0'); }
    ctx.globalAlpha = 1;
    // letters rise and fade in one by one
    const size = c.title.length > 12 ? 12 : 16, sp = size * 0.95;
    const tw = c.title.length * sp, x0 = W / 2 - tw / 2 + sp / 2;
    [...c.title].forEach((ch, i) => {
      const k = clamp((T - 0.3 - i * 0.07) / 0.5, 0, 1) * out;
      if (k <= 0) return;
      txt(ch, x0 + i * sp, H / 2 - 4 + (1 - k) * 6, { size, align: 'center', color: '#efe3c5', fam: FONT_TITLE, bold: true, alpha: k });
    });
    const lk = clamp((T - 0.6) / 1.2, 0, 1) * out;
    ctx.globalAlpha = lk; R(ctx, W / 2 - 70 * ease(lk), H / 2 + 4, 140 * ease(lk), 1, C.teal);
    ctx.globalCompositeOperation = 'lighter'; const sx = W / 2 - 70 + 140 * ((T * 0.6) % 1); R(ctx, sx - 6, H / 2 + 3, 12, 3, 'rgba(160,255,220,0.5)'); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = clamp((T - 1.1) / 0.8, 0, 1) * out;
    txt(c.sub, W / 2, H / 2 + 18, { size: 8, align: 'center', color: C.mint });
    ctx.globalAlpha = 1;
  }
  drawCredits() {
    const c = this.credits;
    R(ctx, 0, 0, W, H, '#050308');
    for (const f of c.flies) { const k = (Math.sin(c.t * 2 + f.ph) + 1) / 2; f.y -= 0.1; if (f.y < 0) f.y = H; ctx.globalAlpha = k; P(ctx, f.x + Math.sin(c.t + f.ph) * 6, f.y, '#e8f070'); }
    ctx.globalAlpha = 1;
    c.lines.forEach((l, k) => {
      const y = c.y + k * 18; if (y < -10 || y > H + 10) return;
      const big = k === 0, a = clamp(Math.min(y / 40, (H - y) / 40), 0, 1);
      txt(l, W / 2, y, { size: big ? 14 : 8, align: 'center', color: big ? '#efe3c5' : '#c8d8c8', fam: big ? FONT_TITLE : FONT, bold: big, alpha: a });
    });
  }
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
    { ambient: null, rain: false, fog: false, title: GAME_TITLE, sub: 'a story of doors and debts', t: 4.2 },
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
    { title: 'Chapter I', sub: CHAPTERS[0], t: 3.6 },
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
    i < 3 ? { title: 'Chapter ' + ['II', 'III', 'IV'][i], sub: CHAPTERS[i + 1] + ' is now open', t: 3.4 } : { title: 'Finale', sub: 'Return to the Fifth Door', t: 3.6 },
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
