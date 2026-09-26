'use strict';
// ============================================================================
//  MAIN: save state, inventory helpers, the day/night loop, scene switching
//  and the game loop.
// ============================================================================

let S = null; // the current save (global game state)

function freshState(slot) {
  return {
    v: 1, slot, day: 1, phase: 'day', gold: 120, hp: 100,
    bag: Array(20).fill(null),
    chest: [{ id: 'rich_jelly', n: 4 }, { id: 'vine', n: 3 }, { id: 'root', n: 2 }, { id: 'teeth_stone', n: 2 }].concat(Array(36).fill(null)),
    shelves: Array(8).fill(0).map(() => ({ item: null, price: 10 })),
    gear: { sword: 0, big: -1, spear: -1, gloves: -1, bow: -1, helm: -1, chest: -1, boots: -1 },
    equip: { w: ['sword', null], active: 0 },
    potions: [2, 0, 0, 0],
    notes: {}, pop: {}, lastPrice: {}, rep: 20,
    invest: { forge: 0, witch: 0, shop: 0, decor: 0, bank: 0 },
    unlocked: 1, bosses: [false, false, false, false],
    shopOpenedToday: false,
    flags: { elder: 0 },
    stats: { sold: 0, earned: 0, kills: 0, runs: 0, deaths: 0, best: 0 },
  };
}
function mergeDefaults(s, d) {
  for (const k in d) {
    if (s[k] === undefined) s[k] = d[k];
    else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && typeof s[k] === 'object') mergeDefaults(s[k], d[k]);
  }
  return s;
}
function saveGame() { if (!S) return; S.savedAt = Date.now(); Store.set('mk_save_' + S.slot, S); }
function slotSummary(i) {
  const s = Store.get('mk_save_' + i, null);
  return s ? { day: s.day, phase: s.phase, gold: s.gold, bosses: (s.bosses || []).filter(Boolean).length } : null;
}
function deleteSlot(i) { Store.del('mk_save_' + i); }
function loadSlot(i) {
  S = mergeDefaults(Store.get('mk_save_' + i, freshState(i)), freshState(i));
  S.slot = i;
  S.hp = playerStats().maxHp;
  Game.fade(() => { Game.setScene(new ShopScene()); const p = Game.scene.player; p.x = BED_POS.x + 12; p.y = BED_POS.y + 14; p.dir = 0; showDayCard(); });
}
function newGame(i) {
  S = freshState(i);
  saveGame();
  Game.fade(() => Game.setScene(storyPrologue()));
}

// ---------------------------------------------------------------- stats & items
function playerStats() {
  let hp = 100, def = 0, spd = 0;
  for (const k of ['helm', 'chest', 'boots']) { const t = S.gear[k]; if (t >= 0) { hp += ARMOR_LINES[k].hp[t]; def += ARMOR_LINES[k].def[t]; spd += ARMOR_LINES[k].spd[t]; } }
  return {
    maxHp: hp, def, spd, speed: 74 * (1 + spd / 100),
    dmg: line => { const L = WEAPON_LINES[line]; return L && S.gear[line] >= 0 ? L.dmg[S.gear[line]] : 10; },
  };
}
function stackFits(arr, i, st, cols) {
  const s = arr[i];
  if (!s) return canPlaceAt(arr, i, st, cols);
  return s.id === st.id && (s.curse || null) === (st.curse || null) && s.n < ITEMS[s.id].stack;
}
function addTo(arr, st, cols) {
  let left = st.n;
  for (let i = 0; i < arr.length && left > 0; i++) {
    const s = arr[i];
    if (s && s.id === st.id && (s.curse || null) === (st.curse || null)) { const mv = Math.min(left, ITEMS[s.id].stack - s.n); s.n += mv; left -= mv; }
  }
  for (let i = 0; i < arr.length && left > 0; i++) {
    if (!arr[i] && canPlaceAt(arr, i, st, cols)) { const mv = Math.min(left, ITEMS[st.id].stack); arr[i] = { id: st.id, n: mv, curse: st.curse || null }; left -= mv; }
  }
  return left;
}
function bagCanTake(st) { return S.bag.some((_, i) => stackFits(S.bag, i, st, 5)); }
function bagAdd(st) { return addTo(S.bag, st, 5); }
function chestAdd(st) { return addTo(S.chest, st, 8); }
function noteSeen(id) { return S.notes[id] || (S.notes[id] = { r: {}, sold: 0 }); }

// ---------------------------------------------------------------- day cycle
function advanceDay() {
  S.day++; S.phase = 'day'; S.shopOpenedToday = false;
  if (S.invest.bank) { const g = Math.min(1000, Math.floor(S.gold * 0.02)); if (g > 0) { S.gold += g; setTimeout(() => toast(`The banker added ${fmt(g)} gold of interest.`, C.gold), 1200); } }
  for (const id in S.pop) S.pop[id] = approach(S.pop[id], 0, 0.2);
  const known = Object.keys(S.notes).filter(id => !ITEMS[id].boss);
  if (known.length && Math.random() < 0.6) {
    const id = choice(known); S.pop[id] = 1;
    setTimeout(() => toast(`Town gossip: everyone wants ${ITEMS[id].name}!`, C.mint), 2400);
  }
}
function showDayCard() { UI.open(new DayCardUI()); }
class DayCardUI extends Overlay {
  update(dt) { super.update(dt); if (this.t > 2 || (this.t > 0.4 && Input.any())) this.close(); }
  draw() {
    const a = clamp(Math.min(this.t / 0.3, (2 - this.t) / 0.4), 0, 1);
    ctx.globalAlpha = a * 0.75; R(ctx, 0, 80, W, 44, '#07050a'); ctx.globalAlpha = a;
    txt(`Day ${S.day}`, W / 2, 104, { size: 16, align: 'center', color: '#efe3c5', fam: FONT_TITLE, bold: true });
    txt(S.phase === 'day' ? 'The shop awaits its customers' : 'Night falls over the town', W / 2, 117, { size: 7, align: 'center', color: C.mint });
    ctx.globalAlpha = 1;
  }
}
function returnFromDungeon(sc, how) {
  const died = how === 'death';
  const msgs = [];
  if (!died) {
    // curses resolve when you bring items home
    for (let i = 0; i < 20; i++) {
      const s = S.bag[i]; if (!s || !s.curse) continue;
      if (s.curse === 'destroy') { const j = i + 1; if (j % 5 !== 0 && S.bag[j]) { msgs.push(`A curse destroyed your ${ITEMS[S.bag[j].id].name}!`); S.bag[j] = null; } }
      if (s.curse === 'transform') { const nid = choice(DUNGEONS[ITEMS[s.id].dungeon].loot); msgs.push(`Your ${ITEMS[s.id].name} transformed into ${ITEMS[nid].name}!`); S.bag[i] = { id: nid, n: 1, curse: null }; noteSeen(nid); continue; }
      s.curse = null;
    }
  } else {
    S.stats.deaths++;
    for (const s of S.bag) if (s) s.curse = null;
  }
  S.stats.kills += sc.kills || 0;
  S.hp = playerStats().maxHp;
  if (S.phase === 'day') { S.phase = 'night'; S.shopOpenedToday = true; }
  else advanceDay();
  Game.setScene(new TownScene('gates'));
  saveGame();
  if (died) say(['You wake up at the gates, bruised and lighter. The dungeon kept most of your loot.', 'Only the items in the top row of your bag made it back.'], { name: 'Elder Oren', portrait: elderPortrait() });
  else toast(how === 'pendant' ? 'The pendant carried you home safely.' : 'Back in town!', C.mint);
  msgs.forEach((m, i) => setTimeout(() => toast(m, '#c8a0ff'), 800 + i * 900));
  setTimeout(() => toast(S.phase === 'day' ? `Morning of day ${S.day}. Time to open the shop!` : 'Night has fallen. Rest in your bed or brave another dungeon.', '#efe3c5'), 400);
}

// ---------------------------------------------------------------- game object & loop
const Game = {
  scene: null, time: 0, fadeT: 0, fadeDir: 0, fadeCb: null,
  setScene(sc) { this.scene = sc; Input.clearAll(); },
  fade(cb) { if (this.fadeDir) return; this.fadeDir = 1; this.fadeT = 0; this.fadeCb = cb; },
  goShop() { sfx('door'); this.fade(() => this.setScene(new ShopScene())); },
  goTown(spawn) { sfx('door'); this.fade(() => this.setScene(new TownScene(spawn))); },
  goDungeon(i) {
    sfx('door');
    this.fade(() => {
      S.hp = playerStats().maxHp;
      const d = new DungeonScene(i);
      this.setScene(d);
      if (!S.flags['intro' + i]) { S.flags['intro' + i] = true; this.setScene(storyDungeonIntro(d)); }
    });
  },
  sleep() {
    this.fade(() => {
      advanceDay(); S.hp = playerStats().maxHp; saveGame();
      if (this.scene instanceof ShopScene) { const p = this.scene.player; p.x = BED_POS.x + 12; p.y = BED_POS.y + 14; p.dir = 0; }
      showDayCard(); AudioSys.music('shop');
    });
  },
};
function drawError(msg) {
  resetCtx(); R(ctx, 0, 0, W, 40, '#400'); txt('Error: ' + msg, 4, 12, { size: 7, color: '#fff' });
}
// touch layout follows what is on screen: cutscene (tap to advance), menus (tap targets), or play
let _touchMode = '', _touchLayout = '';
function syncTouchMode() {
  const sc = Game.scene, cine = sc instanceof Cutscene;
  const ui = !cine && (UI.blocking() || sc instanceof TitleScene || sc instanceof SlotScene);
  const peace = !cine && !ui && !(sc instanceof DungeonScene);
  const near = !cine && !ui && sc && sc.near;
  const hint = near ? (near.label || near.interact || '') : '';
  const key = cine + '|' + ui + '|' + hint + '|' + (sc && sc.constructor.name);
  if (key === _touchMode) return;
  _touchMode = key;
  const cl = document.body.classList;
  cl.toggle('cine', cine); cl.toggle('ui', ui); cl.toggle('peace', peace);
  cl.toggle('menu', sc instanceof TitleScene || sc instanceof SlotScene);
  const h = document.getElementById('aHint');
  if (h) { h.replaceChildren(); if (hint) { const sp = document.createElement('span'); sp.textContent = hint; h.appendChild(sp); } }
  const a = document.querySelector('.tbtn[data-b="A"]');
  if (a) { a.classList.toggle('ready', !!hint); a.classList.toggle('idle', !hint && !ui && !cine); }
  const lay = cine + '|' + ui + '|' + peace;
  if (lay !== _touchLayout) { _touchLayout = lay; Input.layoutTouch(); }
}
// on phones: fullscreen + landscape (the browser needs a tap, see FS in engine.js)
function goImmersive() { FS.auto = true; FS.enter(); }
let lastT = performance.now(), crashed = null;
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  try {
    Game.time += dt;
    Input.update(dt);
    if (Game.fadeDir) {
      Game.fadeT += dt / 0.25;
      if (Game.fadeDir === 1 && Game.fadeT >= 1) { Game.fadeDir = -1; Game.fadeT = 0; const cb = Game.fadeCb; Game.fadeCb = null; if (cb) cb(); }
      else if (Game.fadeDir === -1 && Game.fadeT >= 1) { Game.fadeDir = 0; }
    } else if (UI.blocking()) UI.update(dt);
    else Game.scene.update(dt);
    Toasts.update(dt);
    if (S) HUD.update(dt);
    syncTouchMode();
    resetCtx();
    Game.scene.draw();
    UI.draw();
    Toasts.draw();
    if (Game.fadeDir) { const a = Game.fadeDir === 1 ? Game.fadeT : 1 - Game.fadeT; ctx.globalAlpha = clamp(a, 0, 1); R(ctx, 0, 0, W, H, '#000'); ctx.globalAlpha = 1; }
    Game.fxHit = Math.max(0, (Game.fxHit || 0) - dt * 3);
    PostFX.render(fxParams(), dt);
  } catch (e) {
    console.error(e); crashed = (e && e.message) || String(e); drawError(crashed);
  }
  requestAnimationFrame(frame);
}
async function boot() {
  resize();
  R(ctx, 0, 0, W, H, '#000');
  try {
    await Promise.race([
      Promise.all([document.fonts.load('8px "Pixelify Sans"'), document.fonts.load('700 8px "Pixelify Sans"'), document.fonts.load('700 8px "Silkscreen"'), document.fonts.load('8px "Silkscreen"')]),
      new Promise(r => setTimeout(r, 2500)),
    ]);
  } catch (e) { /* offline: fall back to monospace */ }
  _mcache.clear();
  skinTouchButtons();
  FS.sync();
  PostFX.init();
  Voice.init();
  resize();
  Game.setScene(new TitleScene());
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  window.__game = { Game, get S() { return S; }, UI, Input };
  requestAnimationFrame(frame);
}
boot();
