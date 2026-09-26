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
    Object.assign(this, { id, kind, x, y, dir: o.dir ?? 0, anim: 0, moving: false, alpha: o.alpha ?? 1, look: o.look, col: o.col, t: 0, z: 0, glow: o.glow });
  }
  update(dt) { this.t += dt; this.anim += dt * (this.moving ? 8 : 2); }
  draw(ox, oy) {
    const x = Math.round(this.x - ox), y = Math.round(this.y - oy);
    if (this.alpha <= 0) return;
    ctx.globalAlpha = this.alpha;
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
      if (this.glow) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x + 8, y - 12, 0, x + 8, y - 12, 24); g.addColorStop(0, 'rgba(255,200,110,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 20, y - 40, 56, 56); ctx.globalCompositeOperation = 'source-over'; R(ctx, x + 6, y - 14, 4, 5, '#ffe28a'); }
    } else if (this.kind === 'key') {
      const bob = Math.sin(this.t * 4) * 2, yy = y - this.z + bob;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, 18); g.addColorStop(0, this.col + 'cc'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 18, yy - 18, 36, 36); ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(keyIcon(this.col), x - 5, yy - 2);
      if (Math.random() < 0.3) { const a = rand(Math.PI * 2); P(ctx, x + Math.cos(a) * 8, yy + Math.sin(a) * 8, '#ffffff'); }
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- cutscene engine
class Cutscene {
  constructor(stage, steps, o = {}) {
    this.stage = stage; this.steps = steps; this.o = o;
    stage.cinematic = true; stage.extra = stage.extra || [];
    this.actors = {}; this.movers = []; this.t = 0; this.st = 0; this.i = -1;
    this.bars = 0; this.fade = o.startBlack ? 1 : 0; this.fadeTo = null; this.flash = 0; this.flashCol = '#ffffff';
    this.rain = []; this.raining = false; this.box = null; this.card = null; this.credits = null; this.skipT = 0; this.overlay = null; this.shakeT = 0;
    this.next();
  }
  add(a) { this.actors[a.id] = a; if (!this.stage.extra.includes(a)) this.stage.extra.push(a); return a; }
  actor(id) { return this.actors[id]; }
  next() {
    this.i++; this.st = 0;
    const s = this.steps[this.i];
    if (!s) { this.end(); return; }
    this.cur = s;
    if (s.music) AudioSys.music(s.music);
    if (s.sfx) sfx(s.sfx);
    if (s.flash) { this.flash = 1; this.flashCol = s.flash === true ? '#ffffff' : s.flash; }
    if (s.shake) this.shakeT = s.shake;
    if (s.rain !== undefined) this.raining = s.rain;
    if (s.spawn) this.add(new Actor(s.spawn, s.kind || 'person', s.x, s.y, s));
    if (s.face) this.actors[s.face].dir = s.dir;
    if (s.cam) this.camFrom = { x: this.stage.cam.x, y: this.stage.cam.y };
    if (s.fade !== undefined) { this.fadeFrom = this.fade; }
    if (s.say || s.narrate) {
      const text = s.say || s.narrate, who = s.who || 'Narrator';
      this.box = { text, who, narr: !!s.narrate, chars: 0, hold: 0, portrait: s.narrate ? null : portraitFor(who, s.g) };
      Voice.speak(text, who);
    }
    if (s.title) this.card = { title: s.title, sub: s.sub || '', t: 0, dur: s.t || 3.2 };
    if (s.credits) this.credits = { lines: s.credits, y: H + 10, t: 0, flies: Array.from({ length: 30 }, () => ({ x: rand(W), y: rand(H), ph: rand(6) })) };
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
    if (this.box) {
      const b = this.box, speed = [30, 45, 80][OPTS.textSpeed] || 45;
      const before = b.chars | 0;
      b.chars = Math.min(b.text.length, b.chars + dt * speed);
      for (let k = before; k < (b.chars | 0); k++) Voice.blip(b.text[k], k);
      const full = b.chars >= b.text.length;
      if (Input.pressed('A') || Input.pressed('X')) { if (!full) b.chars = b.text.length; else return true; }
      if (full && !Voice.busy()) { b.hold += dt; if (b.hold > (Voice.mode === 'off' ? 1.4 + b.text.length * 0.02 : 1.0)) return true; }
      return false;
    }
    if (this.card) { this.card.t += dt; return this.card.t >= this.card.dur || (this.card.t > 0.8 && Input.pressed('A')); }
    if (this.credits) { const c = this.credits; c.t += dt; c.y -= dt * 18; return c.y + c.lines.length * 16 < -10 || (c.t > 1 && Input.pressed('A')); }
    if (s.move && !s.async) return !this.movers.some(m => m.a.id === s.move);
    if (s.wait) return this.st >= s.wait;
    if (s.cam) {
      const k = ease(clamp(this.st / (s.t || 1.5), 0, 1));
      this.stage.cam.x = lerp(this.camFrom.x, s.cam[0], k); this.stage.cam.y = lerp(this.camFrom.y, s.cam[1], k);
      return k >= 1;
    }
    if (s.fade !== undefined) { const k = clamp(this.st / (s.t || 1), 0, 1); this.fade = lerp(this.fadeFrom, s.fade, k); return k >= 1; }
    if (s.until) return s.until(this, dt);
    return true;
  }
  update(dt) {
    this.t += dt; this.st += dt;
    this.bars = approach(this.bars, this.o.noBars ? 0 : 1, dt * 2.5);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.shakeT = Math.max(0, this.shakeT - dt);
    for (const a of Object.values(this.actors)) a.update(dt);
    for (const m of this.movers) {
      const dx = m.tx - m.a.x, dy = m.ty - m.a.y, d = Math.hypot(dx, dy);
      if (d < 1) { m.a.x = m.tx; m.a.y = m.ty; m.a.moving = false; m.done = true; continue; }
      const st = Math.min(d, m.sp * dt); m.a.x += dx / d * st; m.a.y += dy / d * st; m.a.moving = true;
      if (m.a.kind !== 'key') m.a.dir = dirFromVec(dx, dy);
    }
    this.movers = this.movers.filter(m => !m.done);
    if (this.stage.parts) updateFX(this.stage, dt);
    if (this.raining && this.rain.length < 90) for (let k = 0; k < 4; k++) this.rain.push({ x: rand(W + 80), y: rand(-20, H), v: rand(200, 280) });
    for (const r of this.rain) { r.y += r.v * dt; r.x -= r.v * 0.3 * dt; if (r.y > H) { if (this.raining) { r.y = -8; r.x = rand(W + 80); } else r.dead = true; } }
    this.rain = this.rain.filter(r => !r.dead);
    if (this.cur && this.cur.every) this.cur.every(this, dt);
    // hold B / START to skip the whole scene
    if (Input.down('B') || Input.down('START')) { this.skipT += dt; if (this.skipT > 0.9) { this.skip(); return; } } else this.skipT = 0;
    if (this.stepDone(dt)) { if (this.box) { Voice.stop(); this.box = null; } this.card = null; this.credits = null; this.next(); }
  }
  skip() { Voice.stop(); this.box = null; if (this.o.onSkip) this.o.onSkip(this); this.end(); }
  end() {
    if (this.ended) return; this.ended = true;
    Voice.stop();
    this.stage.cinematic = false; this.stage.extra = [];
    const next = this.o.next ? this.o.next() : this.stage;
    Game.setScene(next);
    if (this.o.onEnd) this.o.onEnd();
  }
  draw() {
    const sh = this.shakeT > 0;
    if (sh) { ctx.save(); ctx.translate(rand(-2, 2), rand(-2, 2)); }
    this.stage.draw();
    if (this.overlay) this.overlay(this);
    if (sh) ctx.restore();
    for (const r of this.rain) { ctx.globalAlpha = 0.5; R(ctx, r.x, r.y, 1, 3, '#9ac8e8'); R(ctx, r.x - 1, r.y + 3, 1, 3, '#9ac8e8'); }
    ctx.globalAlpha = 1;
    // letterbox
    const bh = Math.round(20 * ease(this.bars));
    if (bh) { R(ctx, 0, 0, W, bh, '#000'); R(ctx, 0, H - bh, W, bh, '#000'); }
    if (this.fade > 0) { ctx.globalAlpha = clamp(this.fade, 0, 1); R(ctx, 0, 0, W, H, '#000'); ctx.globalAlpha = 1; }
    if (this.box) this.drawBox();
    if (this.card) this.drawCard();
    if (this.credits) this.drawCredits();
    if (this.flash > 0) { ctx.globalAlpha = this.flash; R(ctx, 0, 0, W, H, this.flashCol); ctx.globalAlpha = 1; }
    // skip hint
    const a = 0.45 + (this.skipT > 0 ? 0.5 : 0);
    const bw = Input.device() === 'key' ? keyCap(KEY_LABEL.B).width - 4 : 13;
    const x0 = W - 8 - textW('skip', 6) - bw - textW('Hold', 6) - 8;
    ctx.globalAlpha = a; txt('Hold', x0, 13, { size: 6, color: '#efe3c5' }); ctx.globalAlpha = 1;
    btnGlyph(x0 + textW('Hold', 6) + 4, 15, 'B');
    ctx.globalAlpha = a; txt('skip', x0 + textW('Hold', 6) + bw + 8, 13, { size: 6, color: '#efe3c5' }); ctx.globalAlpha = 1;
    if (this.skipT > 0) R(ctx, x0, 18, (W - 8 - x0) * clamp(this.skipT / 0.9, 0, 1), 1, C.mint);
  }
  drawBox() {
    const b = this.box, shown = b.text.slice(0, b.chars | 0);
    if (b.narr) {
      const lines = wrapText(shown, 300, 8);
      const full = wrapText(b.text, 300, 8);
      const y0 = H - 34 - full.length * 11;
      ctx.globalAlpha = 0.55; R(ctx, 0, y0 - 12, W, full.length * 11 + 16, '#000'); ctx.globalAlpha = 1;
      lines.forEach((l, k) => txt(l, W / 2, y0 + k * 11, { size: 8, align: 'center', color: '#efe3c5', outline: '#1b1420' }));
      return;
    }
    const w = 280, h = 50, x = (W - w) / 2 | 0, y = H - 24 - h;
    paperPanel(x, y, w, h);
    let tx = x + 8;
    if (b.portrait) {
      const p = b.portrait, s = Math.min(44 / p.height, 44 / p.width);
      R(ctx, x + 4, y + 3, 44, 44, b.who === 'Guardian' ? '#2a2430' : C.paper2);
      ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 3, 44, 44); ctx.clip();
      ctx.drawImage(p, x + 4 + (44 - p.width * s) / 2, y + 3 + (44 - p.height * s), p.width * s, p.height * s);
      ctx.restore();
      tx = x + 54;
    }
    const talking = Voice.busy() || b.chars < b.text.length;
    txt(b.who + ':', tx, y + 11, { size: 8, color: b.who === 'Guardian' ? '#7a3a8a' : C.tealText, bold: true });
    if (talking) for (let k = 0; k < 3; k++) R(ctx, tx + textW(b.who + ':', 8, true) + 4 + k * 3, y + 8 - (Math.floor(this.t * 8 + k) % 3 === 0 ? 1 : 0), 2, 2, C.teal);
    wrapText(shown, x + w - tx - 8, 8).forEach((l, k) => txt(l, tx, y + 22 + k * 9, { size: 8, color: C.paperDark }));
    if (!talking && Math.sin(this.t * 6) > -0.3) btnGlyph(x + w - 14, y + h - 2, 'A');
  }
  drawCard() {
    const c = this.card, a = clamp(Math.min(c.t / 0.6, (c.dur - c.t) / 0.6), 0, 1);
    R(ctx, 0, 0, W, H, '#07050a');
    ctx.globalAlpha = a;
    txt(c.title, W / 2, H / 2 - 6, { size: 14, align: 'center', color: '#efe3c5', fam: FONT_TITLE, bold: true });
    R(ctx, W / 2 - 50 * a, H / 2 + 1, 100 * a, 1, C.teal);
    txt(c.sub, W / 2, H / 2 + 15, { size: 8, align: 'center', color: C.mint });
    ctx.globalAlpha = 1;
  }
  drawCredits() {
    const c = this.credits;
    R(ctx, 0, 0, W, H, '#07050a');
    for (const f of c.flies) { const k = (Math.sin(c.t * 2 + f.ph) + 1) / 2; f.y -= 0.1; if (f.y < 0) f.y = H; ctx.globalAlpha = k; P(ctx, f.x + Math.sin(c.t + f.ph) * 6, f.y, '#e8f070'); }
    ctx.globalAlpha = 1;
    c.lines.forEach((l, k) => {
      const y = c.y + k * 16; if (y < -10 || y > H + 10) return;
      const big = k === 0;
      txt(l, W / 2, y, { size: big ? 14 : 8, align: 'center', color: big ? '#efe3c5' : '#c8d8c8', fam: big ? FONT_TITLE : FONT, bold: big });
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
  stage.cam.x = 480 - W / 2; stage.cam.y = 0;
  const shopCam = [clamp(200 - W / 2, 0, TW - W), clamp(612 - H / 2 - 10, 0, TH - H)];
  const steps = [
    { music: 'night', rain: true },
    { fade: 0, t: 1.6 },
    { narrate: 'Long ago, five doors rose from the earth north of the town of Vellmoor.' },
    { flash: '#dfe8ff', sfx: 'slam', shake: 0.4, wait: 0.5 },
    { narrate: 'Four of them open every night, breathing treasure... and the Hollow, a grey sickness that eats the careless.' },
    { cam: [480 - W / 2, 40], t: 2 },
    { narrate: 'The fifth has never opened. The last man who tried was Aldric, keeper of the Moonkeeper shop.' },
    { narrate: 'That was ten years ago. He never came back.' },
    { fade: 1, t: 1.2 },
    { run: cs => { cs.raining = false; cs.rain = []; stage.night = false; stage.cam.x = shopCam[0]; stage.cam.y = shopCam[1]; cs.add(new Actor('elder', 'person', 228, 606, { look: NPC_LOOKS.elder, dir: 0 })); cs.add(new Actor('hero', 'hero', 420, 626, { dir: 2 })); }, music: 'town' },
    { fade: 0, t: 1.2 },
    { move: 'hero', to: [214, 626], speed: 40 },
    { move: 'hero', to: [200, 612], speed: 30 },
    { face: 'hero', dir: 3 }, { face: 'elder', dir: 2 },
    { say: 'So the letter found you. You have his walk, you know... and his stubbornness, I hope.', who: 'Elder Oren' },
    { say: 'The mask stays on, old man. The Hollow followed me all the way from the coast.', who: 'Keeper' },
    { say: 'Good. You will need it where you are going.', who: 'Elder Oren' },
    { say: 'Your grandfather\'s shop is yours now. Dusty tables, an empty chest... and a debt to the whole town.', who: 'Elder Oren' },
    { say: 'Sell what the dungeons give you. Grow strong. And perhaps one day that fifth door will answer to a Moonkeeper again.', who: 'Elder Oren' },
    { face: 'hero', dir: 1 },
    { say: 'Then I\'ll open it. One key at a time.', who: 'Keeper' },
    { move: 'elder', to: [300, 626], speed: 24, async: true },
    { wait: 1.2 },
    { fade: 1, t: 1 },
    { title: 'Chapter I', sub: CHAPTERS[0], t: 3.2 },
  ];
  return new Cutscene(stage, steps, {
    startBlack: true,
    next: () => new TownScene('shop'),
    onEnd: () => { S.flags.prologue = true; saveGame(); setTimeout(() => toast('Head north through the plaza to reach the Gates.', C.mint), 600); },
  });
}
function storyDungeonIntro(sc) {
  const L = GUARDIAN_LINES[sc.dIdx].pre;
  const steps = [
    { wait: 0.6 },
    { say: L[0], who: 'Keeper' },
    { flash: '#3a1a3a', sfx: 'bossRoar', shake: 0.3 },
    { say: L[1], who: 'Guardian', g: sc.dIdx },
    { say: L[2], who: 'Keeper' },
  ];
  return new Cutscene(sc, steps, {});
}
function storyGuardianFalls(sc) {
  const i = sc.dIdx, L = GUARDIAN_LINES[i].post, col = DUNGEONS[i].color, p = sc.player;
  const steps = [
    { wait: 0.4 },
    { spawn: 'key', kind: 'key', x: sc.boss.x, y: sc.boss.y - 10, col, sfx: 'teleport' },
    { run: cs => { cs.actor('key').z = 0; }, until: (cs, dt) => { const k = cs.actor('key'); k.z = Math.min(26, k.z + dt * 20); if (Math.random() < 0.4) FX.burst(sc, k.x, k.y - k.z, [col, '#ffffff'], 2, 30); return k.z >= 26; } },
    { say: L[0], who: 'Guardian', g: i },
    { say: L[1], who: 'Keeper' },
    { say: L[2], who: 'Guardian', g: i },
    { move: 'key', to: [p.x, p.y + 26], speed: 70 },
    { run: cs => { cs.actor('key').alpha = 0; FX.burst(sc, p.x, p.y - 12, [col, '#ffffff', C.gold], 24, 70); FX.ring(sc, p.x, p.y - 8, col, 4, 30, 0.5); }, sfx: 'open', flash: col },
    { wait: 0.8 },
    { fade: 1, t: 0.8 },
    i < 3 ? { title: 'Chapter ' + ['II', 'III', 'IV'][i], sub: CHAPTERS[i + 1] + ' is now open', t: 3 } : { title: 'Finale', sub: 'Return to the Fifth Door', t: 3.2 },
    { fade: 0, t: 0.6 },
  ];
  return new Cutscene(sc, steps, {});
}
function storyFinale() {
  const stage = new TownScene('gates', { night: true });
  stage.npcs = []; stage.player.x = -999; stage.player.y = -999;
  stage.cam.x = 480 - W / 2; stage.cam.y = 20;
  let glow = 0, open = 0;
  const door = { x: 480, y: 76 };
  const steps = [
    { music: 'night', run: cs => { cs.add(new Actor('hero', 'hero', 480, 178, { dir: 1 })); cs.overlay = drawDoor; } },
    { fade: 0, t: 1.4 },
    { say: 'Four keys. Four guardians. Let\'s see who answers.', who: 'Keeper' },
    { run: cs => { DUNGEONS.forEach((d, k) => { const a = cs.add(new Actor('k' + k, 'key', 480 + (k - 1.5) * 18, 166, { col: d.color })); a.z = 10; cs.movers.push({ a, tx: door.x + (k - 1.5) * 8, ty: door.y + 16, sp: 26 + k * 4 }); }); }, sfx: 'teleport' },
    { wait: 2.6 },
    { run: cs => DUNGEONS.forEach((d, k) => { cs.actor('k' + k).alpha = 0; }), sfx: 'bossRoar', shake: 1.2 },
    { until: (cs, dt) => { glow = Math.min(1, glow + dt * 0.6); return glow >= 1; } },
    { flash: '#ffffff', sfx: 'slam', run: () => { open = 1; } },
    { wait: 0.8 },
    { spawn: 'aldric', kind: 'person', x: 480, y: 112, look: ALDRIC_LOOK, dir: 0, alpha: 0, glow: true },
    { until: (cs, dt) => { const a = cs.actor('aldric'); a.alpha = Math.min(1, a.alpha + dt * 0.7); return a.alpha >= 1; } },
    { move: 'aldric', to: [480, 150], speed: 18 },
    { say: 'Ten years of knocking... and it is a doctor who answers.', who: 'Aldric' },
    { say: 'Grandfather. The shop kept your seat warm. More or less.', who: 'Keeper' },
    { say: 'Behind this door the Hollow is born. I held it shut from the other side for as long as I could.', who: 'Aldric' },
    { say: 'Four keys to open it... and one Keeper to close it for good. That part, we do together.', who: 'Aldric' },
    { say: 'Together, then.', who: 'Keeper' },
    { face: 'aldric', dir: 1 },
    { move: 'aldric', to: [468, 118], speed: 16, async: true },
    { move: 'hero', to: [492, 124], speed: 18 },
    { run: () => { open = 2; }, sfx: 'teleport', flash: '#e8fff4' },
    { fade: 1, t: 1.6 },
    { narrate: 'That night, the fifth door closed forever. The Hollow thinned into a morning mist.' },
    { narrate: 'And in Vellmoor, the lamps of the Moonkeeper shop burned until dawn... for two keepers now.' },
    { music: 'title', credits: [GAME_TITLE, 'A tribute to the shopkeeper-adventurers', '', 'Story, code and pixel art', 'made with Claude Code', '', 'Fonts: Pixelify Sans and Silkscreen', '(SIL Open Font License)', '', 'Thank you for playing!'] },
  ];
  function drawDoor(cs) {
    const ox = stage.cam.x, oy = stage.cam.y, x = door.x - ox, y = door.y - oy;
    if (glow <= 0) return;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30 + glow * 50);
    g.addColorStop(0, `rgba(160,255,220,${0.6 * glow})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 90, y - 90, 180, 180);
    if (open === 1) {
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.28 + Math.sin(cs.t * 0.8 + k) * 0.05;
        ctx.fillStyle = 'rgba(200,255,235,0.12)';
        ctx.beginPath(); ctx.moveTo(x - 4, y + 10); ctx.lineTo(x + Math.cos(a - 0.06) * 200, y + Math.sin(a - 0.06) * 200); ctx.lineTo(x + Math.cos(a + 0.06) * 200, y + Math.sin(a + 0.06) * 200); ctx.lineTo(x + 4, y + 10); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (open === 1) { ell(ctx, x - 20, y - 26, 40, 30, '#e8fff4'); R(ctx, x - 20, y - 11, 40, 36, '#e8fff4'); ell(ctx, x - 14, y - 20, 28, 20, '#ffffff'); }
  }
  return new Cutscene(stage, steps, {
    startBlack: true,
    next: () => new TownScene('gates'),
    onEnd: () => { S.flags.finale = true; saveGame(); toast('Aldric now helps out in your shop. Thank you for playing!', C.mint); },
  });
}
