'use strict';
// ============================================================================
//  MENUS: title, save slots, options, pause, tips, dungeon key map,
//  death screen and end-of-day balance.
// ============================================================================

// ---------------------------------------------------------------- title logo
function drawDoorLogo(cx, y) {
  const img = cached('logoDoor', () => sprite(76, 60, g => {
    // stone arch
    ell(g, 6, 6, 64, 60, '#5a5850'); ell(g, 9, 9, 58, 54, '#7a786e');
    for (let j = 10; j < 60; j += 7) for (let i = 8 + (j % 14 ? 0 : 5); i < 68; i += 10) R(g, i, j, 1, 6, '#5a5850');
    ell(g, 18, 16, 40, 44, '#3a3830'); ell(g, 21, 19, 34, 40, '#1e1c18');
    // bars of the gate
    for (let i = 24; i < 54; i += 6) R(g, i, 22, 2, 34, '#4a4840');
    R(g, 20, 36, 36, 2, '#4a4840');
    // wooden beam & moss
    R(g, 0, 4, 76, 6, '#8a4a28'); R(g, 1, 5, 74, 2, '#b8693a'); R(g, 2, 10, 4, 4, '#8a4a28'); R(g, 70, 10, 4, 4, '#8a4a28');
    R(g, 12, 12, 8, 3, '#8a9a3a'); R(g, 54, 14, 10, 3, '#8a9a3a');
    // hero silhouette standing in the doorway
    R(g, 35, 30, 7, 7, '#f4f0e8'); R(g, 33, 37, 11, 12, '#f4f0e8'); R(g, 34, 49, 3, 7, '#f4f0e8'); R(g, 40, 49, 3, 7, '#f4f0e8'); R(g, 31, 26, 14, 6, '#f4f0e8');
  }));
  ctx.drawImage(img, cx - img.width / 2, y);
}
function drawTitleText(cx, y, size = 22) {
  txt(GAME_TITLE, cx, y + 2, { size, bold: true, fam: FONT_TITLE, align: 'center', color: '#1b1420' });
  txt(GAME_TITLE, cx, y, { size, bold: true, fam: FONT_TITLE, align: 'center', color: '#ffffff', outline: '#1b1420' });
  // a little patch of earth under the title, like the logo's hill
  ell(ctx, cx - 34, y + 4, 68, 9, '#a8742a'); ell(ctx, cx - 28, y + 4, 56, 5, '#c8903a');
}

class TitleScene {
  constructor() {
    this.t = 0; this.sel = 0; this.items = ['Play', 'Options', 'Exit'];
    const r = mulberry32(8);
    this.blobs = [];
    for (let i = 0; i < 14; i++) this.blobs.push({ x: r() * W, y: r() * H, r: 10 + r() * 38, vx: (r() - 0.5) * 6, vy: (r() - 0.5) * 5, ph: r() * 6, light: r() < 0.65 });
    this.sparks = [];
    for (let i = 0; i < 30; i++) this.sparks.push({ x: r() < 0.5 ? r() * 30 : W - r() * 30, y: r() * H, ph: r() * 6 });
    AudioSys.music('title');
  }
  update(dt) {
    this.t += dt;
    for (const b of this.blobs) { b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < -60) b.x = W + 60; if (b.x > W + 60) b.x = -60; if (b.y < -60) b.y = H + 60; if (b.y > H + 60) b.y = -60; }
    const d = Input.dir();
    if (d === 'U') { this.sel = (this.sel + 2) % 3; sfx('move'); }
    if (d === 'D') { this.sel = (this.sel + 1) % 3; sfx('move'); }
    if (Input.pressed('A') || Input.pressed('X')) {
      sfx('confirm');
      if (this.sel === 0) Game.setScene(new SlotScene());
      if (this.sel === 1) UI.open(new OptionsUI());
      if (this.sel === 2) ask('Leave the game?', () => { location.href = '../'; });
    }
  }
  draw() {
    R(ctx, 0, 0, W, H, C.menuBg);
    for (const b of this.blobs) {
      const wob = Math.sin(this.t * 1.3 + b.ph) * 2;
      ell(ctx, b.x - b.r, b.y - b.r * 0.9 + wob, b.r * 2 + wob, b.r * 1.8, b.light ? C.menuBlob : C.menuBg2);
    }
    // dark mossy borders (as in the reference)
    for (const [x0, w] of [[0, 30], [W - 30, 30]]) {
      R(ctx, x0, 0, w, H, '#2c2818');
      const r = mulberry32(x0 + 1);
      for (let i = 0; i < 60; i++) R(ctx, x0 + r() * w, r() * H, 3 + r() * 6, 2 + r() * 4, r() < 0.5 ? '#3a3420' : '#4a4424');
    }
    R(ctx, 30, 0, 2, H, '#1b1420'); R(ctx, W - 32, 0, 2, H, '#1b1420');
    for (const s of this.sparks) if (Math.sin(this.t * 2 + s.ph) > 0.6) P(ctx, s.x, s.y, C.mint);
    drawDoorLogo(W / 2, 22);
    drawTitleText(W / 2, 100, 24);
    this.items.forEach((it, i) => {
      const y = 140 + i * 16, sel = i === this.sel;
      txt(it, W / 2, y, { size: 8, align: 'center', color: sel ? '#ffffff' : '#d8f4e0', outline: sel ? C.teal3 : undefined });
      if (sel) { const w = textW(it, 8) / 2 + 12; ctx.drawImage(swirlIcon(false), W / 2 - w - 4, y - 7); ctx.drawImage(swirlIcon(true), W / 2 + w - 3, y - 7); }
    });
    txt('1.0.0', 36, H - 5, { size: 6, color: '#d8f4e0' });
    txt('a tribute to the shopkeeper-adventurer genre', W - 36, H - 5, { size: 6, align: 'right', color: '#d8f4e0' });
  }
}

// ---------------------------------------------------------------- olive menu background + zigzags (options / slots)
function oliveBG(t) {
  R(ctx, 0, 0, W, H, C.optBg);
  const r = mulberry32(11);
  for (let i = 0; i < 700; i++) P(ctx, r() * W, r() * H, r() < 0.5 ? C.optBg2 : '#56503c');
}
function zigRow(y, x0 = 0, x1 = W) {
  for (let x = x0; x < x1; x += 16) {
    ctx.strokeStyle = '#8a8470'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 1, y); ctx.lineTo(x + 13, y); ctx.lineTo(x + 7, y + 7); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#8a8470'; ctx.beginPath(); ctx.moveTo(x + 9, y); ctx.lineTo(x + 15, y); ctx.lineTo(x + 12, y + 4); ctx.fill();
  }
}
class SlotScene {
  constructor() { this.t = 0; this.sel = 0; this.sum = [0, 1, 2, 3, 4].map(slotSummary); }
  update(dt) {
    this.t += dt;
    const d = Input.dir();
    if (d === 'U') { this.sel = (this.sel + 4) % 5; sfx('move'); }
    if (d === 'D') { this.sel = (this.sel + 1) % 5; sfx('move'); }
    if (Input.pressed('A') || Input.pressed('X')) {
      sfx('confirm');
      if (this.sum[this.sel]) loadSlot(this.sel); else newGame(this.sel);
    }
    if (Input.pressed('Y') && this.sum[this.sel]) ask(`Delete save slot ${this.sel + 1}? This cannot be undone.`, () => { deleteSlot(this.sel); this.sum = [0, 1, 2, 3, 4].map(slotSummary); });
    if (Input.pressed('B')) { sfx('cancel'); Game.setScene(new TitleScene()); }
  }
  draw() {
    oliveBG(this.t);
    zigRow(8, 0, 110); zigRow(8, W - 110, W);
    txt('LOAD / NEW GAME', W / 2, 16, { size: 8, align: 'center', color: '#e8e0c8', fam: FONT_TITLE });
    R(ctx, W / 2 - 50, 20, 100, 2, C.teal);
    txt('Choose a save slot to begin', W / 2, 32, { size: 7, align: 'center', color: '#b8b098' });
    for (let i = 0; i < 5; i++) {
      const y = 46 + i * 28, sel = i === this.sel, s = this.sum[i];
      if (sel) { R(ctx, 70, y - 3, W - 140, 1, C.teal); R(ctx, 70, y + 23, W - 140, 1, C.teal); ctx.drawImage(swirlIcon(false), 88, y + 6); ctx.drawImage(swirlIcon(true), W - 96, y + 6); }
      R(ctx, 104, y, 16, 20, sel ? C.teal : '#8a8470'); txt(i + 1, 112, y + 13, { size: 8, align: 'center', color: '#fff' });
      R(ctx, 122, y, 160, 20, sel ? '#8a8470' : '#6e6854');
      if (s) {
        txt(`Day ${s.day} · ${s.phase === 'night' ? 'Night' : 'Day'}`, 128, y + 9, { size: 7, color: '#f4ecd6' });
        txt(`${fmt(s.gold)} gold · ${s.bosses} / 4 guardians`, 128, y + 17, { size: 6, color: '#d8d0b8' });
      } else txt('New Game', 128, y + 13, { size: 7, color: '#f4ecd6' });
    }
    promptBar([['A', 'Select'], ['Y', 'Delete'], ['B', 'Back']], H - 6);
  }
}

// ---------------------------------------------------------------- options
class OptionsUI extends Overlay {
  constructor() {
    super(); this.tab = 0; this.sel = 0;
    this.tabs = ['GAME OPTIONS', 'GRAPHICS', 'SOUND', 'CONTROLS'];
  }
  items() {
    const pct = v => Math.round(v * 100) + '%';
    if (this.tab === 0) return [
      { name: 'Language', val: () => 'English', left() { }, right() { } },
      { name: 'Screenshake', slider: () => OPTS.shake, val: () => pct(OPTS.shake), left() { OPTS.shake = clamp(Math.round((OPTS.shake - 0.1) * 10) / 10, 0, 1); }, right() { OPTS.shake = clamp(Math.round((OPTS.shake + 0.1) * 10) / 10, 0, 1); } },
      { name: 'Vibration', val: () => OPTS.vibration ? 'On' : 'Off', left() { OPTS.vibration = !OPTS.vibration; }, right() { OPTS.vibration = !OPTS.vibration; } },
      { name: 'Text Speed', val: () => ['Slow', 'Normal', 'Fast'][OPTS.textSpeed], left() { OPTS.textSpeed = (OPTS.textSpeed + 2) % 3; }, right() { OPTS.textSpeed = (OPTS.textSpeed + 1) % 3; } },
    ];
    if (this.tab === 1) return [
      { name: 'Fullscreen', val: () => document.fullscreenElement ? 'On' : 'Off', left: toggleFS, right: toggleFS },
      { name: 'Touch Controls', val: () => document.body.classList.contains('touch') ? 'On' : 'Off', left: toggleTouch, right: toggleTouch },
    ];
    if (this.tab === 2) return [
      { name: 'Music', slider: () => OPTS.music, val: () => pct(OPTS.music), left() { OPTS.music = clamp(Math.round((OPTS.music - 0.1) * 10) / 10, 0, 1); AudioSys.applyVol(); }, right() { OPTS.music = clamp(Math.round((OPTS.music + 0.1) * 10) / 10, 0, 1); AudioSys.applyVol(); } },
      { name: 'Sound Effects', slider: () => OPTS.sfx, val: () => pct(OPTS.sfx), left() { OPTS.sfx = clamp(Math.round((OPTS.sfx - 0.1) * 10) / 10, 0, 1); AudioSys.applyVol(); sfx('coin'); }, right() { OPTS.sfx = clamp(Math.round((OPTS.sfx + 0.1) * 10) / 10, 0, 1); AudioSys.applyVol(); sfx('coin'); } },
    ];
    return [];
  }
  update(dt) {
    super.update(dt);
    if (Input.pressed('LB') || Input.pressed('LT')) { this.tab = (this.tab + 3) % 4; this.sel = 0; sfx('move'); }
    if (Input.pressed('RB') || Input.pressed('RT')) { this.tab = (this.tab + 1) % 4; this.sel = 0; sfx('move'); }
    const it = this.items(), d = Input.dir();
    if (it.length) {
      if (d === 'U') { this.sel = (this.sel + it.length - 1) % it.length; sfx('move'); }
      if (d === 'D') { this.sel = (this.sel + 1) % it.length; sfx('move'); }
      if (d === 'L') { it[this.sel].left(); sfx('select'); saveOpts(); }
      if (d === 'R' || Input.pressed('A')) { it[this.sel].right(); sfx('select'); saveOpts(); }
    }
    if (Input.pressed('B')) { sfx('cancel'); saveOpts(); this.close(); }
  }
  draw() {
    oliveBG(this.t);
    // tabs
    const tw = W / 4;
    this.tabs.forEach((t, i) => {
      txt(t, tw * i + tw / 2, 12, { size: 6, align: 'center', color: i === this.tab ? '#f4ecd6' : '#a8a088', fam: FONT_TITLE });
      if (i === this.tab) R(ctx, tw * i + 12, 16, tw - 24, 2, C.teal);
    });
    btnGlyph(4, 13, 'LB'); btnGlyph(W - 22, 13, 'RB');
    zigRow(22, 0, W);
    R(ctx, W - 50, 40, 2, 150, C.teal);
    const it = this.items();
    if (this.tab === 3) {
      const rows = [
        ['Move', 'WASD / Arrows', 'Stick / D-pad'], ['Interact / Confirm', 'E / Enter', 'A'], ['Attack', 'J', 'X'], ['Secondary / Block', 'K', 'Y'],
        ['Roll', 'Space', 'B'], ['Back', 'Esc', 'B'], ['Inventory', 'I / Tab', 'Select'], ['Swap weapon', 'Q', 'LB'], ['Potion', 'R', 'RB'],
        ['Pendant (hold)', 'F', 'L3'], ['Pause', 'P / Esc', 'Start'],
      ];
      txt('Action', 70, 42, { size: 7, color: C.mint }); txt('Keyboard', 170, 42, { size: 7, color: C.mint }); txt('Gamepad / Touch', 250, 42, { size: 7, color: C.mint });
      rows.forEach((r, i) => { txt(r[0], 70, 56 + i * 12, { size: 7, color: '#e8e0c8' }); txt(r[1], 170, 56 + i * 12, { size: 7, color: '#c8c0a8' }); txt(r[2], 250, 56 + i * 12, { size: 7, color: '#c8c0a8' }); });
    }
    it.forEach((o, i) => {
      const y = 50 + i * 36, sel = i === this.sel, cx = W / 2 - 20;
      txt(o.name, cx, y, { size: 7, align: 'center', color: sel ? '#f4ecd6' : '#b8b098' });
      if (sel) { const w = textW(o.name, 7) / 2 + 12; ctx.drawImage(swirlIcon(false), cx - w - 4, y - 7); ctx.drawImage(swirlIcon(true), cx + w - 3, y - 7); }
      txt('◀', cx - 50, y + 14, { size: 7, align: 'center', color: C.mint }); txt('▶', cx + 50, y + 14, { size: 7, align: 'center', color: C.mint });
      if (o.slider) {
        const v = o.slider();
        txt('[', cx - 38, y + 14, { size: 8, color: '#f4ecd6' }); txt(']', cx + 34, y + 14, { size: 8, color: '#f4ecd6' });
        for (let k = 0; k < 10; k++) R(ctx, cx - 32 + k * 6.6, y + 8, 5, 5, k < Math.round(v * 10) ? C.mint : '#6e6854');
        txt(o.val(), cx, y + 24, { size: 6, align: 'center', color: '#8a8470' });
      } else txt(o.val(), cx, y + 15, { size: 7, align: 'center', color: sel ? C.mint : '#a8a088' });
    });
    promptBar([['A', 'Change'], ['B', 'Back']], H - 6);
  }
}
function toggleFS() {
  try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ }
}
function toggleTouch() { document.body.classList.toggle('touch'); resize(); }

// ---------------------------------------------------------------- pause
class PauseUI extends Overlay {
  constructor() {
    super(); this.sel = 0;
    const inD = Game.scene instanceof DungeonScene;
    this.items = [
      ['Resume', () => this.close()],
      ['Inventory', () => { this.close(); UI.open(new InventoryUI({ inDungeon: inD, scene: Game.scene })); }],
      ['Notebook', () => { this.close(); UI.open(new NotebookUI()); }],
      ['Options', () => UI.open(new OptionsUI())],
      [inD ? 'Abandon run & quit' : 'Save & quit to title', () => ask(inD ? 'Quit to the title screen? Everything found on this run will be lost.' : 'Save and return to the title screen?', () => { if (!inD) saveGame(); UI.clear(); Game.setScene(new TitleScene()); })],
    ];
  }
  update(dt) {
    super.update(dt);
    const d = Input.dir();
    if (d === 'U') { this.sel = (this.sel + this.items.length - 1) % this.items.length; sfx('move'); }
    if (d === 'D') { this.sel = (this.sel + 1) % this.items.length; sfx('move'); }
    if (Input.pressed('A') || Input.pressed('X')) { sfx('confirm'); this.items[this.sel][1](); }
    if (Input.pressed('B') || Input.pressed('START')) { sfx('cancel'); this.close(); }
  }
  draw() {
    dimScreen(0.6);
    const w = 150, h = 22 + this.items.length * 16, x = (W - w) / 2, y = (H - h) / 2;
    paperPanel(x, y, w, h);
    banner(W / 2, y - 12, 90, 'PAUSED');
    this.items.forEach(([n], i) => {
      const yy = y + 22 + i * 16, sel = i === this.sel;
      if (sel) { R(ctx, x + 10, yy - 9, w - 20, 13, C.teal); }
      txt(n, W / 2, yy, { size: 8, align: 'center', color: sel ? '#fff' : C.paperDark });
    });
    txt(`Day ${S.day} · ${fmt(S.stats.earned)} gold earned · ${S.stats.kills} enemies defeated`, W / 2, y + h + 12, { size: 6, align: 'center', color: '#efe3c5' });
  }
}

// ---------------------------------------------------------------- tips (parchment strip with panels)
function parchment(x, y, w, h) {
  ctx.globalAlpha = 0.4; R(ctx, x + 4, y + 5, w, h, '#000'); ctx.globalAlpha = 1;
  R(ctx, x, y + 3, w, h - 6, '#d8c8a0'); R(ctx, x + 2, y, w - 4, h, '#e8dab4');
  R(ctx, x + 4, y + 2, w - 8, h - 4, '#efe3c5');
  // curled ends
  R(ctx, x - 4, y - 2, 8, h + 4, '#d8c8a0'); R(ctx, x + w - 4, y - 2, 8, h + 4, '#d8c8a0');
  R(ctx, x - 3, y - 1, 6, h + 2, '#e8dab4'); R(ctx, x + w - 3, y - 1, 6, h + 2, '#e8dab4');
  const rng = mulberry32(x + y);
  for (let i = 0; i < w; i += 4) if (rng() < 0.5) R(ctx, x + i, y + h - 1, 3, 2, '#d8c8a0');
}
class TipUI extends Overlay {
  constructor(kind) { super(); this.kind = kind; this.tip = TIPS[kind]; }
  update(dt) { super.update(dt); if (this.t > 0.4 && (Input.pressed('A') || Input.pressed('B') || Input.pressed('X'))) { sfx('confirm'); this.close(); } }
  draw() {
    dimScreen(0.55);
    const x = 50, y = 50, w = W - 100, h = 74;
    parchment(x, y, w, h);
    const pw = (w - 20) / 4;
    for (let i = 0; i < 4; i++) {
      const px = x + 10 + i * pw, py = y + 8;
      R(ctx, px + 2, py, pw - 4, h - 16, i === 3 ? '#e2d4ae' : '#e6d8b4');
      this.panel(i, px + pw / 2, py + (h - 16) / 2);
    }
    txt(this.tip.title, W / 2, y - 6, { size: 9, align: 'center', color: '#efe3c5', outline: '#1b1420', fam: FONT_TITLE });
    this.tip.lines.forEach((l, i) => txt(l, W / 2, y + h + 14 + i * 10, { size: 7, align: 'center', color: '#efe3c5', outline: '#1b1420' }));
    promptBar([['A', 'Continue']], H - 6);
  }
  panel(i, cx, cy) {
    const k = this.kind;
    if (k === 'pendant') {
      if (i === 0 || i === 1) {
        R(ctx, cx - 20, cy - 20, 40, 8, '#3a8a6a'); for (let j = 0; j < 5; j++) ctx.drawImage(coinIcon(), cx - 18 + j * 7, cy - 20);
        if (i === 0) R(ctx, cx - 18 + 3 * 7, cy - 20, 14, 7, '#6a6a5a');
        ell(ctx, cx - 11, cy - 5, 22, 22, '#e8dcc0'); ell(ctx, cx - 5, cy + 1, 10, 10, C.teal);
        if (i === 1) { ctx.strokeStyle = C.mint; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy + 6, 14, 0, Math.PI * 2); ctx.stroke(); }
        btnGlyph(cx + 10, cy + 18, 'PENDANT');
      } else if (i === 2) {
        ctx.strokeStyle = C.teal; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ((this.t * 0.8) % 1)); ctx.stroke();
        ell(ctx, cx - 8, cy - 8, 16, 16, '#e8dcc0'); ell(ctx, cx - 4, cy - 4, 8, 8, C.teal);
        btnGlyph(cx - 4, cy - 18, 'PENDANT');
      } else {
        ell(ctx, cx - 22, cy - 14, 22, 22, C.teal); drawSpr(heroSprite(0, 0, 'idle'), cx - 11, cy + 6);
        drawSpr(buildingSprite('shop', false), cx + 12, cy + 16, {});
      }
    } else {
      if (i === 0) { drawSpr(tableSprite(), cx, cy + 10); ctx.drawImage(itemIcon('golem_core'), cx - 7, cy - 10); R(ctx, cx - 10, cy - 24, 20, 9, '#1b1420'); R(ctx, cx - 9, cy - 23, 18, 7, '#f4ecd6'); txt('90', cx, cy - 17.5, { size: 6, align: 'center', color: '#3a2e20' }); }
      if (i === 1) { drawSpr(personSprite(LOOKS[20], 1, 0, 'idle'), cx, cy + 14); ctx.drawImage(faceIcon(['ecstatic', 'content', 'expensive', 'angry'][Math.floor(this.t * 1.2) % 4]), cx - 7, cy - 26); }
      if (i === 2) { ['ecstatic', 'content', 'expensive', 'angry'].forEach((f, j) => { ctx.drawImage(faceIcon(f), cx - 26 + j * 13, cy - 10); }); txt('Notebook', cx, cy + 14, { size: 6, align: 'center', color: C.paperDark }); }
      if (i === 3) { drawSpr(registerSprite(), cx, cy + 6); for (let j = 0; j < 3; j++) ctx.drawImage(coinIcon(), cx - 12 + j * 9, cy - 16 - Math.abs(Math.sin(this.t * 4 + j)) * 5); }
    }
  }
}

// ---------------------------------------------------------------- dungeon keys map
class KeysMapUI extends Overlay {
  update(dt) { super.update(dt); if (this.t > 0.3 && (Input.pressed('A') || Input.pressed('B'))) { sfx('confirm'); this.close(); } }
  draw() {
    dimScreen(0.6);
    const x = 50, y = 18, w = W - 100, h = 176;
    parchment(x, y, w, h);
    const cx = W / 2;
    // faint map lines
    ctx.strokeStyle = '#cdbb90'; ctx.lineWidth = 2;
    const nodes = [[cx - 100, 150], [cx - 45, 118], [cx + 45, 118], [cx + 100, 150]];
    nodes.forEach(([nx, ny]) => { ctx.beginPath(); ctx.moveTo(cx, 80); ctx.lineTo(cx, 100); ctx.lineTo(nx, 100); ctx.lineTo(nx, ny - 30); ctx.stroke(); });
    // the great door
    ell(ctx, cx - 26, 30, 52, 50, '#8a8068'); R(ctx, cx - 26, 55, 52, 30, '#8a8068'); ell(ctx, cx - 18, 38, 36, 40, '#6a6250'); R(ctx, cx - 18, 58, 36, 26, '#6a6250');
    R(ctx, cx - 30, 30, 60, 6, '#8a6a4a'); R(ctx, cx - 8, 64, 16, 20, S.bosses.every(Boolean) ? C.mint : C.teal);
    R(ctx, cx - 20, 150, 40, 30, '#b8a880'); R(ctx, cx - 14, 158, 12, 22, '#9a8a64'); R(ctx, cx + 2, 158, 12, 22, '#9a8a64');
    DUNGEONS.forEach((d, i) => {
      const [nx, ny] = nodes[i];
      const known = S.unlocked > i, beaten = S.bosses[i];
      const col = known ? d.color : '#b8aa88';
      // pedestal
      R(ctx, nx - 14, ny, 28, 6, '#8a7a5a'); R(ctx, nx - 10, ny + 6, 20, 12, '#9a8a6a'); R(ctx, nx - 6, ny + 8, 12, 8, beaten ? C.teal : '#6a6250');
      ctx.drawImage(skullIcon(col), nx - 4, ny - 14);
      if (beaten || (i > 0 && S.unlocked > i)) ctx.drawImage(keyIcon(col), nx - 5, ny - 26);
      txt(known ? d.name.replace(' Dungeon', '') : '???', nx, ny + 28, { size: 6, align: 'center', color: C.paperDark });
    });
    txt('The Gates', cx, y + h - 4, { size: 7, align: 'center', color: C.paperInk });
    promptBar([['A', 'Continue']], H - 6);
  }
}

// ---------------------------------------------------------------- death screen
class DeathUI extends Overlay {
  constructor(sc) { super(); this.sc = sc; this.killer = sc.lastHitBy; }
  update(dt) {
    super.update(dt);
    if (this.t > 0.8 && (Input.pressed('A') || Input.pressed('B'))) {
      sfx('confirm'); this.close();
      for (let i = 5; i < 20; i++) S.bag[i] = null;
      Game.fade(() => returnFromDungeon(this.sc, 'death'));
    }
  }
  draw() {
    dimScreen(0.7);
    // banner scroll
    R(ctx, W / 2 - 70, 8, 140, 12, C.paper3); R(ctx, W / 2 - 68, 9, 136, 10, C.paper);
    txt('DEATH BY MISADVENTURE', W / 2, 17, { size: 7, align: 'center', color: C.paperDark, fam: FONT_TITLE });
    // floor track
    const tx = W / 2 - 60;
    R(ctx, tx, 30, 120, 2, '#e8dcc0');
    for (let i = 0; i < 4; i++) {
      const x = tx + i * 40, done = i < this.sc.floor || (i === this.sc.floor);
      ell(ctx, x - 5, 26, 10, 10, '#1b1420'); ell(ctx, x - 4, 27, 8, 8, i === 3 ? '#8a8a9a' : done ? '#efe3c5' : '#5a5a66');
      if (i === 3) ctx.drawImage(skullIcon('#efe3c5'), x - 4, 26);
    }
    // hero fallen
    ell(ctx, W / 2 + 20, 42, 60, 30, '#2a4a4a');
    const img = heroSprite(0, 0, 'idle');
    ctx.save(); ctx.translate(W / 2 + 50, 60); ctx.rotate(Math.PI / 2); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
    // bag with lost items
    paperPanel(40, 64, 128, 110);
    drawBagGrid(58, 72, 18, 2, { lost: true });
    txt('Only the top row survives.', 104, 166, { size: 6, align: 'center', color: C.paperInk });
    // stats
    tealPanel(196, 84, 150, 70);
    txt(this.sc.d.name, 206, 98, { size: 8, color: '#fff', bold: true });
    txt(`Floor reached: ${this.sc.floor >= 3 ? 'Guardian' : ['I', 'II', 'III'][this.sc.floor]}`, 206, 112, { size: 7, color: '#e8fff4' });
    txt(`Enemies defeated: ${this.sc.kills}`, 206, 124, { size: 7, color: '#e8fff4' });
    txt(`Gold kept: ${fmt(S.gold)}`, 206, 136, { size: 7, color: '#e8fff4' });
    if (this.t > 0.8) promptBar([['A', 'Go to Town']], H - 8);
  }
}

// ---------------------------------------------------------------- balance (end of shop day)
class BalanceUI extends Overlay {
  constructor(sales, thefts, repDelta, onDone) {
    super(); this.rows = Object.entries(sales).map(([id, r]) => ({ id, ...r })); this.thefts = thefts; this.repDelta = repDelta; this.onDone = onDone; this.scroll = 0;
    this.total = this.rows.reduce((a, r) => a + r.gold, 0);
    S.stats.best = Math.max(S.stats.best || 0, this.total);
  }
  update(dt) {
    super.update(dt);
    const d = Input.dir();
    if (d === 'D') this.scroll = Math.min(Math.max(0, this.rows.length - 6), this.scroll + 1);
    if (d === 'U') this.scroll = Math.max(0, this.scroll - 1);
    if (this.t > 0.6 && (Input.pressed('A') || Input.pressed('B'))) { sfx('confirm'); this.close(); if (this.onDone) this.onDone(); }
  }
  draw() {
    dimScreen(0.7);
    const x = 96, w = 192, y = 12;
    // teal header block
    R(ctx, x - 4, y, w + 8, 40, C.teal3); R(ctx, x - 3, y + 1, w + 6, 38, C.teal);
    R(ctx, x + 40, y + 5, w - 80, 9, C.paper); txt('BALANCE', W / 2, y + 12, { size: 7, align: 'center', color: C.paperDark, fam: FONT_TITLE });
    btnGlyph(x + 26, y + 13, 'LB'); btnGlyph(x + w - 38, y + 13, 'RB');
    ell(ctx, x + 6, y + 23, 8, 8, C.gold); R(ctx, x + 18, y + 24, w - 36, 6, C.paper2); R(ctx, x + 18, y + 24, w - 36, 6, C.mint);
    ell(ctx, x + w - 14, y + 23, 8, 8, '#e8e0c0'); ell(ctx, x + w - 12, y + 22, 7, 7, C.teal);
    zigzag(x - 3, y + 39, w + 6, C.teal, 3);
    paperPanel(x, y + 44, w, 146);
    const rows = this.rows.slice(this.scroll, this.scroll + 6);
    if (!rows.length) txt('Nothing sold today.', W / 2, y + 80, { size: 7, align: 'center', color: C.paperInk });
    rows.forEach((r, i) => {
      const yy = y + 52 + i * 17;
      ctx.drawImage(itemIcon(r.id), x + 8, yy);
      txt(ITEMS[r.id].name, x + 26, yy + 10, { size: 7, color: C.tealText });
      ell(ctx, x + w - 64, yy + 1, 12, 12, C.teal); txt(r.n, x + w - 58, yy + 10, { size: 6, align: 'center', color: '#fff' });
      txt('x', x + w - 70, yy + 10, { size: 6, color: C.paperInk });
      R(ctx, x + w - 46, yy - 2, 1, 16, C.paper3);
      txt(fmt(r.gold), x + w - 14, yy + 10, { size: 7, align: 'right', color: C.paperDark }); ctx.drawImage(coinIcon(), x + w - 12, yy + 3);
      R(ctx, x + 6, yy + 15, w - 12, 1, C.paperLine);
    });
    let yy = y + 158;
    if (this.thefts.length) { txt(`Stolen: ${this.thefts.map(t => ITEMS[t.id].name).join(', ')}`, x + 8, yy, { size: 6, color: C.red }); }
    yy += 11;
    txt(`Popularity ${this.repDelta >= 0 ? '+' : ''}${this.repDelta.toFixed(1)}`, x + 8, yy + 4, { size: 7, color: this.repDelta >= 0 ? C.tealText : C.red });
    txt(`Total: ${fmt(this.total)}`, x + w - 14, yy + 4, { size: 8, align: 'right', color: C.paperDark, bold: true }); ctx.drawImage(coinIcon(), x + w - 12, yy - 3);
    if (this.t > 0.6) worldPrompt(W - 40, H - 10, [['A', 'Skip']]);
  }
}
