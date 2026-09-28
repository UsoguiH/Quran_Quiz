'use strict';
// ============================================================================
//  ENGINE: canvas, math helpers, input (keyboard / gamepad / touch), audio,
//  storage. Everything lives in globals so the game runs from file:// too.
// ============================================================================

const GAME_TITLE = 'MOONKEEPER';
const W = 384, H = 216;           // logical resolution (16:9, 16px tiles)
const TILE = 16;
const FONT = '"Pixelify Sans", "Silkscreen", monospace';
const FONT_TITLE = '"Silkscreen", "Pixelify Sans", monospace';
// cinematic lettering (cutscenes): the game's own pixel fonts
const SERIF = FONT;
const DISPLAY = FONT_TITLE;

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let VIEW = { s: 1, left: 0, top: 0 };

// Phones held upright (and embedded previews that can't rotate): the whole game is
// turned sideways to fill the screen; turn the phone to play. VP is the stage size.
const VP = {
  rot: false, w: innerWidth, h: innerHeight,
  // screen (client) coords -> stage coords
  toStage(x, y) { return this.rot ? { x: y, y: innerWidth - x } : { x, y }; },
};
function updateVP() {
  const touch = document.body.classList.contains('touch');
  VP.rot = touch && innerHeight > innerWidth && (typeof OPTS === 'undefined' || OPTS.sideways !== false);
  VP.w = VP.rot ? innerHeight : innerWidth; VP.h = VP.rot ? innerWidth : innerHeight;
  const st = document.getElementById('stage');
  if (st) Object.assign(st.style, { width: VP.w + 'px', height: VP.h + 'px', transform: VP.rot ? `translate(${innerWidth}px, 0) rotate(90deg)` : 'none' });
  document.body.classList.toggle('sideways', VP.rot);
}
function resize() {
  updateVP();
  let dpr = Math.min(window.devicePixelRatio || 1, 3);
  const touch = document.body.classList.contains('touch');
  const portrait = VP.h > VP.w;
  document.body.classList.toggle('portrait', portrait);
  let availH = VP.h;
  if (touch && portrait) availH = VP.h * 0.58;
  const s = Math.min(VP.w / W, availH / H);
  VIEW.s = s;
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
  // with post-processing on, cap the backing store (~1.6 MP) so the per-frame GPU upload stays cheap
  if (typeof PostFX !== 'undefined' && PostFX.active()) { const px = W * s * dpr * H * s * dpr; if (px > 1.6e6) dpr *= Math.sqrt(1.6e6 / px); }
  cv.width = Math.round(W * s * dpr);
  cv.height = Math.round(H * s * dpr);
  const wrap = document.getElementById('wrap');
  if (touch && portrait) { wrap.style.alignItems = 'flex-start'; wrap.style.paddingTop = '28px'; VIEW.bottom = 28 + Math.floor(H * s); }
  else { wrap.style.alignItems = 'center'; wrap.style.paddingTop = '0'; }
  resetCtx();
  if (typeof Input !== 'undefined') Input.layoutTouch();
  if (typeof PostFX !== 'undefined') PostFX.resize();
}
function resetCtx() {
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = 'alphabetic';
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- fullscreen
// Browsers only allow fullscreen from a real tap/click (pointerup / touchend / keydown),
// so on phones every tap on the game re-enters fullscreen until the player turns it off.
const FS = {
  auto: false, pending: false, hinted: false,
  supported: () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
  active: () => !!(document.fullscreenElement || document.webkitFullscreenElement),
  enter() {
    if (this.active() || this.pending || !this.supported()) return;
    const el = document.documentElement;
    let p = null;
    try { p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null; } catch (e) { return; }
    this.pending = true;
    Promise.resolve(p).then(() => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) { /* not allowed */ } })
      .catch(() => {}).then(() => { this.pending = false; });
  },
  exit() {
    try { const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
  },
  toggle() { if (this.active()) this.exit(); else this.enter(); },
  sync() {
    document.body.classList.toggle('fs', this.active());
    document.body.classList.toggle('nofs', !this.supported());
    if (typeof Input !== 'undefined') Input.layoutTouch();
  },
};
FS.auto = matchMedia('(pointer: coarse)').matches;
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => FS.sync());
for (const ev of ['pointerup', 'touchend']) document.addEventListener(ev, e => {
  if (!document.body.classList.contains('touch') || e.target && e.target.id === 'fsBtn') return;
  if (FS.auto && FS.supported()) FS.enter();
  else if (!FS.supported() && !FS.hinted && typeof toast === 'function' && typeof Game !== 'undefined' && Game.scene && !(Game.scene instanceof TitleScene)) {
    // iPhone Safari / embedded previews cannot go fullscreen from a web page
    FS.hinted = true;
    const ios = /iPhone|iPod/.test(navigator.userAgent) && !navigator.standalone;
    toast(ios ? 'Fullscreen: Share > Add to Home Screen' : window.self !== window.top ? 'Open the game in its own tab for fullscreen' : 'Fullscreen is not available here', '#efe3c5');
  }
}, true);

// ---------------------------------------------------------------- math utils
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const choice = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
const ease = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - (1 - t) * (1 - t);
function shuffle(a, r = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function weighted(list, wkey = 'w', r = Math.random) {
  let tot = 0; for (const o of list) tot += o[wkey];
  let x = r() * tot;
  for (const o of list) { x -= o[wkey]; if (x <= 0) return o; }
  return list[list.length - 1];
}
function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }

// ---------------------------------------------------------------- text
const _mcache = new Map();
function setFont(size = 8, bold = false, fam = FONT, italic = false) { if (/Pixelify|Silkscreen/.test(fam)) italic = false; ctx.font = `${italic ? 'italic ' : ''}${bold ? 700 : 400} ${size}px ${fam}`; }
function textW(s, size = 8, bold = false, fam = FONT, italic = false) {
  const k = size + '|' + bold + '|' + fam + '|' + italic + '|' + s;
  let v = _mcache.get(k);
  if (v === undefined) { setFont(size, bold, fam, italic); v = ctx.measureText(s).width; if (_mcache.size > 4000) _mcache.clear(); _mcache.set(k, v); }
  return v;
}
// draw text; o = {size, color, align, bold, shadow, outline, fam, alpha}
function txt(s, x, y, o = {}) {
  s = String(s);
  const size = o.size || 8;
  setFont(size, o.bold, o.fam || FONT, o.italic);
  ctx.textAlign = o.align || 'left';
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.outline) {
    ctx.fillStyle = o.outline;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) ctx.fillText(s, x + dx * 0.75, y + dy * 0.75);
  }
  if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(s, x, y + 1); }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(s, x, y);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}
// word wrap -> lines
function wrapText(s, maxW, size = 8, fam = FONT, italic = false) {
  const out = [];
  for (const para of String(s).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (textW(t, size, false, fam, italic) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------- storage
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
const OPTS = Object.assign({ voice: 'speech', voiceVol: 0.9, fx: true, shake: 0.5, vibration: true, textSpeed: 1, music: 0.5, sfx: 0.7, lang: 'English', showTouch: 'auto', fullscreen: false, tutorial: true, sideways: true },
  Store.get('mk_opts', {}));
function saveOpts() { Store.set('mk_opts', OPTS); }

// ---------------------------------------------------------------- input
const Input = (() => {
  const KEYMAP = {
    ArrowUp: ['UP'], KeyW: ['UP'], ArrowDown: ['DOWN'], KeyS: ['DOWN'],
    ArrowLeft: ['LEFT'], KeyA: ['LEFT'], ArrowRight: ['RIGHT'], KeyD: ['RIGHT'],
    KeyE: ['A'], Enter: ['A'], NumpadEnter: ['A'],
    Escape: ['B', 'START'], Backspace: ['B'],
    KeyJ: ['X'], KeyK: ['Y'], KeyL: ['A'],
    Space: ['ROLL'], ShiftLeft: ['RUN'], ShiftRight: ['RUN'],
    KeyQ: ['LB'], KeyR: ['RB'], KeyI: ['SELECT'], Tab: ['SELECT'], KeyP: ['START'], KeyF: ['PENDANT'],
    KeyZ: ['LT'], KeyC: ['RT'],
  };
  const down = {}, prev = {}, src = { key: {}, pad: {}, touch: {} }, latch = new Set(); // latch: presses shorter than a frame still count
  let stick = { x: 0, y: 0 }, stickRaw = 0, rimT = 0, padStick = { x: 0, y: 0 }, analogMag = 0;
  let lastDevice = 'key';
  const rep = { dir: null, t: 0 };
  let anyPressedFlag = false;

  window.addEventListener('keydown', e => {
    const m = KEYMAP[e.code];
    if (m) { m.forEach(b => { src.key[b] = true; latch.add(b); }); e.preventDefault(); }
    lastDevice = 'key'; anyPressedFlag = true;
    AudioSys.unlock();
  });
  window.addEventListener('keyup', e => { const m = KEYMAP[e.code]; if (m) m.forEach(b => src.key[b] = false); });
  window.addEventListener('blur', () => { src.key = {}; src.touch = {}; });

  // ---- touch: floating joystick, on-screen buttons, taps on the canvas
  const touchEl = document.getElementById('touch');
  const stickEl = document.getElementById('stick'), knob = document.getElementById('knob'), zone = document.getElementById('stickZone');
  let stickId = null, stickC = { x: 0, y: 0 }, stickR = 50, stickHome = { x: 0, y: 0 }, tapQ = null, tapNow = null, floating = false;
  function enableTouch() {
    if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); resize(); }
    lastDevice = 'touch';
  }
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  window.addEventListener('touchstart', () => { enableTouch(); AudioSys.unlock(); }, { passive: true });
  function grabStick(e, fl) {
    stickId = e.pointerId; floating = fl;
    try { (floating ? zone : stickEl).setPointerCapture(e.pointerId); } catch (err) { /* synthetic or stale pointer */ }
    stickR = stickEl.offsetWidth / 2;
    if (floating) {
      // the stick jumps under the thumb
      stickC = VP.toStage(e.clientX, e.clientY);
      stickEl.style.left = (stickC.x - stickR) + 'px'; stickEl.style.top = (stickC.y - stickR) + 'px';
    } else stickC = { x: stickEl.offsetLeft + stickR, y: stickEl.offsetTop + stickR };
    stickEl.classList.add('active');
    moveStick(e); anyPressedFlag = true; AudioSys.unlock();
  }
  stickEl.addEventListener('pointerdown', e => grabStick(e, false));
  zone.addEventListener('pointerdown', e => grabStick(e, true));
  const onMove = e => { if (e.pointerId === stickId) moveStick(e); };
  stickEl.addEventListener('pointermove', onMove); zone.addEventListener('pointermove', onMove);
  const endStick = e => {
    if (e.pointerId !== stickId) return;
    stickId = null; stick = { x: 0, y: 0 }; stickRaw = 0; knob.style.transform = '';
    stickEl.classList.remove('active');
    stickEl.style.left = (stickHome.x - stickR) + 'px'; stickEl.style.top = (stickHome.y - stickR) + 'px';
  };
  for (const el of [stickEl, zone]) { el.addEventListener('pointerup', endStick); el.addEventListener('pointercancel', endStick); }
  function moveStick(e) {
    // short thumb travel: full tilt at 55% of the ring, so small drags are enough
    const travel = stickR * 0.55;
    const q = VP.toStage(e.clientX, e.clientY);
    let dx = (q.x - stickC.x) / travel, dy = (q.y - stickC.y) / travel;
    const l = Math.hypot(dx, dy);
    if (l > 1) {
      // drag the base along when the thumb slides past the rim (dynamic joystick)
      if (floating) {
        stickC.x += (dx / l) * (l - 1) * travel; stickC.y += (dy / l) * (l - 1) * travel;
        stickEl.style.left = (stickC.x - stickR) + 'px'; stickEl.style.top = (stickC.y - stickR) + 'px';
      }
      dx /= l; dy /= l;
    }
    knob.style.transform = `translate(${dx * travel}px, ${dy * travel}px)`;
    // response curve: small dead zone, then quickly up to full walking speed
    const m = Math.min(1, Math.hypot(dx, dy)); stickRaw = m;
    if (m < 0.12) { stick = { x: 0, y: 0 }; return; }
    let a = Math.atan2(dy, dx);
    // gently snap to the 8 directions so straight lines and diagonals are easy to hold
    const oct = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
    if (Math.abs(a - oct) < 0.2) a = oct;
    const k = Math.min(1, (m - 0.12) / 0.6 + 0.3);
    stick = { x: Math.cos(a) * k, y: Math.sin(a) * k };
  }
  for (const b of touchEl.querySelectorAll('.tbtn')) {
    const name = b.dataset.b;
    if (name === 'FS') {
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('on'); haptic(8); });
      b.addEventListener('pointerup', e => { b.classList.remove('on'); FS.auto = !FS.active(); FS.toggle(); });
      b.addEventListener('pointercancel', () => b.classList.remove('on'));
      continue;
    }
    const on = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } b.classList.add('on'); src.touch[name] = true; latch.add(name); if (name === 'B') { src.touch.ROLL = true; latch.add('ROLL'); } anyPressedFlag = true; AudioSys.unlock(); haptic(8); };
    const off = e => { b.classList.remove('on'); src.touch[name] = false; if (name === 'B') src.touch.ROLL = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  }
  // taps / clicks on the game canvas, in logical coordinates
  const ptr = { x: 0, y: 0, down: false, id: null };
  // canvas position is measured in stage coords, so taps work when the stage is turned sideways
  const toLogical = e => { const q = VP.toStage(e.clientX, e.clientY); return { x: (q.x - cv.offsetLeft) / cv.offsetWidth * W, y: (q.y - cv.offsetTop) / cv.offsetHeight * H }; };
  window.addEventListener('pointermove', e => { if (ptr.down && e.pointerId === ptr.id) Object.assign(ptr, toLogical(e)); });
  for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, e => { if (e.pointerId === ptr.id) ptr.down = false; });
  cv.addEventListener('pointerdown', e => {
    tapQ = toLogical(e);
    Object.assign(ptr, tapQ, { down: true, id: e.pointerId });
    anyPressedFlag = true; AudioSys.unlock();
    if (e.pointerType === 'touch') lastDevice = 'touch';
  });
  function layoutTouch() {
    const portrait = VP.h > VP.w, cl = document.body.classList;
    const mode = cl.contains('ui') ? 'ui' : cl.contains('peace') ? 'peace' : 'fight';
    const btns = {}; touchEl.querySelectorAll('.tbtn').forEach(b => btns[b.dataset.b] = b);
    const u = Math.min(VP.w, VP.h);
    const k = clamp(u / 150, 2, 3.2); // css px per art pixel of the button skins
    // medallion skins are (d+6) x (d+7) art pixels including their drop shadow
    const place = (el, x, y, w, h = w) => { if (el) Object.assign(el.style, { left: (x - w / 2) + 'px', top: (y - h / 2) + 'px', width: w + 'px', height: h + 'px' }); };
    // glass buttons: d art pixels across; the icon is scaled by a whole number so it stays crisp
    const med = (el, x, y, d, kk = k) => {
      if (!el) return;
      const cap = el.classList.contains('cap'), w = Math.round(d * kk * (cap ? 1.08 : 0.94)); place(el, x, y, w);
      const iw = +el.dataset.iw || 0;
      if (iw) el.style.setProperty('--ics', iw * Math.max(2, Math.round(w * (cap ? 0.46 : 0.5) / iw)) + 'px');
      el.style.setProperty('--lbs', Math.max(8, Math.round(w * 0.1)) + 'px');
    };
    const fsShown = !cl.contains('fs') && !cl.contains('nofs');
    let bx, by, sx, sy, sr, sm = 20;
    const big = 32 * k, sat = 24 * k;
    if (portrait) {
      // controls sit under the game view
      const top = (VIEW.bottom || VP.h * 0.58 + 28) + 10;
      const row = ['START', 'SELECT', 'LB', 'RB', 'PENDANT'].concat(fsShown ? ['FS'] : []);
      const rowY = top + (sm + 7) * k / 2;
      row.forEach((n, i) => med(btns[n], VP.w * (i + 0.5) / row.length, rowY, sm));
      const areaT = rowY + (sm + 7) * k / 2 + 8, midY = (areaT + VP.h - 12) / 2;
      sr = Math.min(VP.w * 0.42, (VP.h - areaT) * 0.8);
      sx = VP.w * 0.26; sy = midY;
      bx = VP.w - big / 2 - 20; by = midY + sat * 0.45;
    } else {
      sr = u * 0.42; sx = sr * 0.62 + 14; sy = VP.h - sr * 0.62 - 14;
      bx = VP.w - big / 2 - 22; by = VP.h - big / 2 - 14;
      const side = (VP.w - W * VIEW.s) / 2; // letterbox bars beside the game view
      const step = (sm + 5) * k;
      if (side >= (sm + 8) * k) {
        // wide phones: small buttons live in the empty side bars, clear of the HUD
        ['SELECT', 'RB', 'LB'].forEach((n, i) => med(btns[n], VP.w - side / 2, 10 + step / 2 + i * step, sm));
        ['START', 'PENDANT', 'FS'].forEach((n, i) => med(btns[n], side / 2, 10 + step / 2 + i * step, sm));
      } else {
        // 16:9 screens: a compact row between the stick and the action buttons, pause + fullscreen up top
        const kk = k * 0.8, row = ['SELECT', 'LB', 'RB', 'PENDANT'], st = (sm + 8) * kk;
        const cx = (sx + sr / 2 + bx - big / 2 - sat - 8) / 2;
        row.forEach((n, i) => med(btns[n], cx + (i - (row.length - 1) / 2) * st, VP.h - (sm + 7) * kk / 2 - 4, sm, kk));
        med(btns.START, VP.w / 2 - st * 0.6, (sm + 7) * kk / 2 + 4, sm, kk);
        med(btns.FS, VP.w / 2 + st * 0.6, (sm + 7) * kk / 2 + 4, sm, kk);
      }
    }
    place(stickEl, sx, sy, sr); stickHome = { x: sx, y: sy };
    // the floating-stick zone covers the lower-left of the screen
    if (portrait) { const zt = (VIEW.bottom || VP.h * 0.58) + 50; Object.assign(zone.style, { left: '0px', top: zt + 'px', width: (VP.w * 0.5) + 'px', height: (VP.h - zt) + 'px' }); }
    else Object.assign(zone.style, { left: '0px', top: (VP.h * 0.22) + 'px', width: (VP.w * 0.5) + 'px', height: (VP.h * 0.78) + 'px' });
    // action buttons: one big thumb button in the corner, the others fanned around it
    const Rr = (big + sat) / 2 * 1.08 + 9;
    const at = deg => [bx + Math.cos(deg * Math.PI / 180) * Rr, by + Math.sin(deg * Math.PI / 180) * Rr];
    let aPos;
    if (mode === 'fight') {
      med(btns.X, bx, by, 32);
      med(btns.B, ...at(185), 24); med(btns.Y, ...at(230), 24);
      aPos = at(275); med(btns.A, ...aPos, 28, k * 24 / 28);
    } else if (mode === 'ui') {
      // menus are tapped directly; OK/BACK stay small and out of the way
      aPos = [bx + 4, by + 4]; med(btns.A, ...aPos, 22);
      med(btns.B, bx - 22 * k * 1.08 - 8, by + 8, 18);
    } else {
      aPos = [bx, by]; med(btns.A, bx, by, 28, k * 32 / 28 * 0.94);
      med(btns.B, ...at(190), 24);
    }
    const hint = document.getElementById('aHint');
    if (hint) {
      const r = Math.min(VP.w - 6, aPos[0] + sat * 0.6), hb = aPos[1] - (mode === 'fight' ? sat : big) / 2 - 4;
      Object.assign(hint.style, { left: (r - 300) + 'px', width: '300px', top: (hb - 30) + 'px', height: '30px' });
    }
    const sk = document.getElementById('skipBtn'); if (sk) { const kk = k * 0.9; place(sk, VP.w - 16 - 40 * kk / 2, 12 + 16 * kk / 2, 40 * kk, 16 * kk); sk.style.setProperty('--ics', (+sk.dataset.iw || 10) * Math.max(2, Math.floor(16 * kk * 0.5 / (+sk.dataset.iw || 10))) + 'px'); sk.style.setProperty('--lbs', Math.max(9, Math.round(16 * kk * 0.34)) + 'px'); }
    if (cl.contains('cine')) med(btns.FS, 16 + (sm + 6) * k * 0.4, 12 + (sm + 7) * k * 0.4, sm, k * 0.8);
  }

  // ---- gamepad
  const PADMAP = { 0: ['A'], 1: ['B', 'ROLL'], 2: ['X'], 3: ['Y'], 4: ['LB'], 5: ['RB'], 6: ['LT'], 7: ['RT'], 8: ['SELECT'], 9: ['START'], 12: ['UP'], 13: ['DOWN'], 14: ['LEFT'], 15: ['RIGHT'], 10: ['PENDANT'] };
  function pollPad() {
    src.pad = {}; padStick = { x: 0, y: 0 };
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      p.buttons.forEach((b, i) => { if (b.pressed && PADMAP[i]) { PADMAP[i].forEach(n => src.pad[n] = true); lastDevice = 'pad'; anyPressedFlag = true; } });
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.25) { padStick = { x: ax, y: ay }; lastDevice = 'pad'; }
      break;
    }
  }

  function update(dt) {
    pollPad();
    if (tapQ && typeof PROMPT_HITS !== 'undefined') {
      // a tap on an on-screen prompt chip presses that button
      const h = PROMPT_HITS.find(h => tapQ.x >= h.x && tapQ.x < h.x + h.w && tapQ.y >= h.y && tapQ.y < h.y + h.h);
      if (h) { latch.add(h.b); if (h.b === 'B') latch.add('ROLL'); if (h.b === 'ROLL') latch.add('B'); tapQ = null; haptic(8); }
    }
    if (typeof PROMPT_HITS !== 'undefined') PROMPT_HITS.length = 0;
    tapNow = tapQ; tapQ = null;
    for (const k in down) prev[k] = down[k];
    const names = new Set([...Object.keys(src.key), ...Object.keys(src.pad), ...Object.keys(src.touch), ...Object.keys(prev)]);
    for (const n of latch) names.add(n);
    for (const n of names) down[n] = !!(src.key[n] || src.pad[n] || src.touch[n] || latch.has(n));
    latch.clear();
    // menu direction repeat
    const a = axis();
    let d = null;
    if (Math.abs(a.x) > 0.5 || Math.abs(a.y) > 0.5) d = Math.abs(a.x) > Math.abs(a.y) ? (a.x > 0 ? 'R' : 'L') : (a.y > 0 ? 'D' : 'U');
    rep.fire = null;
    if (d !== rep.dir) { rep.dir = d; rep.t = 0.32; rep.fire = d; }
    else if (d) { rep.t -= dt; if (rep.t <= 0) { rep.t = 0.09; rep.fire = d; } }
    const had = anyPressedFlag; anyPressedFlag = false; rep.any = had;
    rimT = stickRaw >= 0.97 ? rimT + dt : 0;
  }
  function axis() {
    let x = 0, y = 0;
    if (src.key.LEFT || src.pad.LEFT) x -= 1; if (src.key.RIGHT || src.pad.RIGHT) x += 1;
    if (src.key.UP || src.pad.UP) y -= 1; if (src.key.DOWN || src.pad.DOWN) y += 1;
    x += padStick.x + stick.x; y += padStick.y + stick.y;
    analogMag = Math.max(Math.hypot(padStick.x, padStick.y), stickRaw >= 0.97 && rimT > 0.3 ? 1 : 0);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    if (l < 0.18) { x = 0; y = 0; }
    return { x, y };
  }
  const api = {
    down: b => !!down[b],
    pressed: b => !!down[b] && !prev[b],
    released: b => !down[b] && !!prev[b],
    axis, update, layoutTouch,
    dir: () => rep.fire, // 'U','D','L','R' with repeat (menus)
    any: () => rep.any,
    consume(b) { prev[b] = true; down[b] = true; },
    clearAll() { for (const k in down) { prev[k] = true; } },
    device: () => lastDevice,
    tap: () => tapNow,
    // finger / mouse currently held on the game view (logical coords), for hold-to-repeat
    pointer: () => ptr,
    tapIn: (x, y, w, h) => !!tapNow && tapNow.x >= x && tapNow.x < x + w && tapNow.y >= y && tapNow.y < y + h,
    eatTap() { tapNow = null; },
    // run: hold Shift / RT, or push the analog stick (pad or touch) all the way
    runHeld: () => !!down.RUN || !!down.RT || analogMag > 0.97,
  };
  return api;
})();

// ---------------------------------------------------------------- audio
const AudioSys = (() => {
  let ac = null, master, sfxG, musG, noiseBuf;
  let musicState = { name: null, step: 0, next: 0, timer: null, track: null };
  function unlock() {
    if (typeof Voice !== 'undefined') Voice.prime();
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
      sfxG = ac.createGain(); sfxG.connect(master);
      musG = ac.createGain(); musG.connect(master);
      applyVol();
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (musicState.name) { const n = musicState.name; musicState.name = null; music(n); }
      if (pendingAmb) { const a = pendingAmb; pendingAmb = null; setTimeout(() => ambient(a), 0); }
    } catch (e) { ac = null; }
  }
  function applyVol() { if (!ac) return; sfxG.gain.value = OPTS.sfx * 0.6; musG.gain.value = OPTS.music * 0.32; }
  function tone(type, f0, f1, dur, vol = 0.3, t0 = 0, dest) {
    if (!ac) return;
    const t = ac.currentTime + t0;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.3, f0 = 1000, f1 = 300, t0 = 0, q = 1, type = 'bandpass') {
    if (!ac) return;
    const t = ac.currentTime + t0;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxG); s.start(t); s.stop(t + dur + 0.02);
  }
  const SFX = {
    swing: () => noise(0.09, 0.35, 2600, 500, 0, 0.8),
    swingBig: () => { noise(0.16, 0.45, 1600, 200, 0, 0.7); },
    hit: () => { tone('square', 220, 70, 0.1, 0.25); noise(0.08, 0.35, 1800, 400); },
    hurt: () => { tone('sawtooth', 320, 90, 0.22, 0.25); noise(0.1, 0.25, 900, 200); },
    roll: () => noise(0.18, 0.25, 700, 150, 0, 0.6, 'lowpass'),
    coin: () => { tone('square', 988, 988, 0.07, 0.12); tone('square', 1319, 1319, 0.18, 0.12, 0.06); },
    pickup: () => { tone('triangle', 660, 990, 0.1, 0.25); tone('triangle', 990, 1320, 0.1, 0.15, 0.07); },
    select: () => tone('square', 880, 880, 0.035, 0.07),
    move: () => tone('triangle', 700, 700, 0.03, 0.12),
    confirm: () => { tone('square', 660, 660, 0.05, 0.1); tone('square', 990, 990, 0.08, 0.1, 0.05); },
    cancel: () => { tone('square', 500, 330, 0.09, 0.1); },
    door: () => { noise(0.35, 0.3, 400, 80, 0, 0.8, 'lowpass'); tone('sine', 110, 70, 0.3, 0.2); },
    open: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.14, 0.18, i * 0.06)),
    bell: () => { tone('sine', 1568, 1568, 0.7, 0.18); tone('sine', 2093, 2093, 0.6, 0.1, 0.04); },
    die: () => { tone('square', 420, 50, 0.3, 0.18); noise(0.3, 0.3, 1200, 100); },
    shoot: () => tone('square', 700, 250, 0.1, 0.12),
    arrow: () => noise(0.1, 0.25, 3000, 1200, 0, 2),
    slam: () => { noise(0.5, 0.55, 500, 40, 0, 0.7, 'lowpass'); tone('sine', 70, 35, 0.4, 0.45); },
    heal: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone('sine', f, f, 0.2, 0.15, i * 0.05)),
    error: () => { tone('square', 160, 140, 0.15, 0.15); tone('square', 120, 110, 0.15, 0.12, 0.08); },
    toll: () => { tone('sine', 196, 194, 3.4, 0.26); tone('sine', 392, 389, 2.4, 0.08); tone('sine', 523, 519, 1.7, 0.045); tone('sine', 98, 97, 3.8, 0.12); },
    pop: () => { noise(0.18, 0.1, 1800, 300); tone('triangle', 900, 260, 0.25, 0.04); },
    heart: () => { tone('sine', 72, 38, 0.14, 0.55); tone('sine', 66, 36, 0.12, 0.42, 0.24); },
    chime: () => { tone('sine', 1568, 1568, 1.6, 0.06); tone('sine', 2349, 2349, 1.8, 0.035, 0.12); tone('sine', 1175, 1175, 2, 0.05, 0.25); },
    cash: () => { noise(0.08, 0.3, 4000, 3000, 0, 2); tone('square', 1318, 1318, 0.1, 0.12, 0.05); tone('square', 1760, 1760, 0.3, 0.12, 0.12); },
    alarm: () => { for (let i = 0; i < 4; i++) tone('square', i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.1, 0.1, i * 0.11); },
    death: () => [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * 0.98, 0.35, 0.22, i * 0.22)),
    anvil: () => { tone('square', 1250, 1200, 0.25, 0.12); tone('sine', 2500, 2500, 0.4, 0.08); noise(0.06, 0.4, 5000, 2000, 0, 1.5); },
    craft: () => { SFX.anvil(); [659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.2, 0.15, 0.25 + i * 0.08)); },
    stairs: () => [784, 659, 523, 392, 330].forEach((f, i) => tone('triangle', f, f, 0.12, 0.15, i * 0.07)),
    block: () => { tone('square', 900, 700, 0.06, 0.12); noise(0.05, 0.3, 3000, 1500); },
    fall: () => tone('sine', 600, 80, 0.5, 0.25),
    splash: () => noise(0.4, 0.3, 2000, 300, 0, 0.5),
    step: () => noise(0.04, 0.06, 600, 300),
    teleport: () => { for (let i = 0; i < 8; i++) tone('sine', 300 + i * 120, 300 + i * 160, 0.12, 0.08, i * 0.05); },
    bossRoar: () => { tone('sawtooth', 110, 55, 1.0, 0.35); noise(1.0, 0.35, 300, 60, 0, 0.5, 'lowpass'); },
    text: () => tone('square', 520 + Math.random() * 80, 520, 0.02, 0.03),
    thunder: () => { noise(0.12, 0.6, 3000, 800, 0, 0.7); noise(2.4, 0.55, 380, 40, 0.1, 0.5, 'lowpass'); tone('sine', 55, 32, 2.0, 0.35, 0.1); },
    boom: () => { tone('sine', 90, 28, 1.6, 0.5); noise(1.2, 0.4, 300, 30, 0, 0.6, 'lowpass'); },
    whoosh: () => noise(0.9, 0.3, 300, 2400, 0, 1.2),
    rumble: () => { noise(2.5, 0.35, 160, 60, 0, 0.5, 'lowpass'); tone('sine', 45, 38, 2.5, 0.25); },
  };
  // looping ambience (rain), faded in and out
  let amb = null;
  function ambient(name) {
    if (!ac) { pendingAmb = name; return; }
    if (amb) { const a = amb; a.g.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 1.2); setTimeout(() => { try { a.s.stop(); } catch (e) { /* ignore */ } }, 1400); amb = null; }
    if (name !== 'rain') return;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    const f2 = ac.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 300;
    const g = ac.createGain(); g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.16 * OPTS.sfx, ac.currentTime + 1.5);
    s.connect(f); f.connect(f2); f2.connect(g); g.connect(master); s.start();
    amb = { s, g };
  }
  let pendingAmb = null;
  function sfx(name) { if (!ac || !SFX[name]) return; try { SFX[name](); } catch (e) { /* ignore */ } }

  // ---- music: tiny tracker. tokens "C4", ".", "-" (hold)
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const midi = n => { const m = n.match(/^([A-G]#?)(\d)$/); return m ? 12 * (+m[2] + 1) + NOTE[m[1]] : null; };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const parse = s => s.trim().split(/\s+/).map(t => t === '.' ? null : t === '-' ? '-' : midi(t));
  const TRACKS = {};
  function defTrack(name, bpm, parts) {
    TRACKS[name] = { bpm, parts: parts.map(p => ({ ...p, notes: parse(p.seq) })) };
  }
  // title: gentle, hopeful (C major / A minor)
  defTrack('title', 84, [
    { inst: 'lead', vol: 0.22, seq: 'E5 - - G5 - - A5 - - - G5 - E5 - - - D5 - - E5 - - C5 - - - - - - - - - E5 - - G5 - - A5 - - - C6 - B5 - - - G5 - - A5 - - E5 - - - - - - - - -' },
    { inst: 'bass', vol: 0.3, seq: 'A2 - - - - - - - E3 - - - - - - - F2 - - - - - - - C3 - - - - - - - A2 - - - - - - - E3 - - - - - - - F2 - - - - - - - G2 - - - - - - -' },
    { inst: 'arp', vol: 0.07, seq: 'A3 C4 E4 A4 E4 C4 A3 C4 E3 G3 B3 E4 B3 G3 E3 G3 F3 A3 C4 F4 C4 A3 F3 A3 C4 E4 G4 C5 G4 E4 C4 E4 A3 C4 E4 A4 E4 C4 A3 C4 E3 G3 B3 E4 B3 G3 E3 G3 F3 A3 C4 F4 C4 A3 F3 A3 G3 B3 D4 G4 D4 B3 G3 B3' },
  ]);
  defTrack('town', 104, [
    { inst: 'lead', vol: 0.2, seq: 'G4 - B4 - D5 - - B4 C5 - A4 - - - - - A4 - C5 - E5 - - C5 D5 - B4 - - - - - G4 - B4 - D5 - G5 - F#5 - E5 - D5 - C5 - B4 - C5 - A4 - F#4 - A4 - G4 - - - - - - -' },
    { inst: 'bass', vol: 0.28, seq: 'G2 - . G3 D3 - . D3 C3 - . C3 G2 - . G2 A2 - . A3 E3 - . E3 D3 - . D3 G2 - . G2 G2 - . G3 D3 - . D3 E3 - . E3 C3 - . C3 D3 - . D3 D3 - . F#3 G2 - . D3 G2 - . .' },
    { inst: 'arp', vol: 0.05, seq: 'G4 . D5 . B4 . D5 . C5 . E5 . G4 . B4 . A4 . E5 . C5 . E5 . D5 . F#5 . B4 . D5 . G4 . D5 . B4 . G5 . E5 . G5 . C5 . E5 . D5 . A4 . F#4 . A4 . G4 . D5 . B4 . G4 .' },
  ]);
  defTrack('night', 72, [
    { inst: 'lead', vol: 0.18, seq: 'E5 - - - B4 - - - C5 - - D5 - - B4 - A4 - - - - - - - . . . . . . . . G4 - - - A4 - - - B4 - - C5 - - D5 - E5 - - - - - - - . . . . . . . .' },
    { inst: 'bass', vol: 0.25, seq: 'E2 - - - - - - - C3 - - - - - - - A2 - - - - - - - B2 - - - - - - - E2 - - - - - - - C3 - - - - - - - D3 - - - - - - - B2 - - - - - - -' },
    { inst: 'arp', vol: 0.05, seq: 'E4 G4 B4 G4 E4 G4 B4 G4 C4 E4 G4 E4 C4 E4 G4 E4 A3 C4 E4 C4 A3 C4 E4 C4 B3 D#4 F#4 D#4 B3 D#4 F#4 D#4 E4 G4 B4 G4 E4 G4 B4 G4 C4 E4 G4 E4 C4 E4 G4 E4 D4 F#4 A4 F#4 D4 F#4 A4 F#4 B3 D#4 F#4 D#4 B3 D#4 F#4 D#4' },
  ]);
  defTrack('shop', 96, [
    { inst: 'lead', vol: 0.2, seq: 'C5 - E5 - G5 - E5 - F5 - A5 - G5 - - - E5 - D5 - C5 - D5 - E5 - - - - - . . C5 - E5 - G5 - C6 - B5 - A5 - G5 - F5 - E5 - D5 - C5 - - - - - . .' },
    { inst: 'bass', vol: 0.28, seq: 'C3 . G2 . C3 . G2 . F2 . C3 . F2 . C3 . A2 . E3 . A2 . E3 . G2 . D3 . G2 . D3 . C3 . G2 . C3 . G2 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . B2 . C3 . G2 . C3 . . .' },
  ]);
  defTrack('dungeon', 88, [
    { inst: 'lead', vol: 0.16, seq: 'A4 - - - C5 - B4 - - - G4 - - - - - A4 - - - E5 - D5 - - - C5 - B4 - - - A4 - - - C5 - B4 - - - G4 - - - E4 - F4 - - - E4 - - - - - - - . . . .' },
    { inst: 'bass', vol: 0.3, seq: 'A2 . . A2 . . A2 . G2 . . G2 . . G2 . F2 . . F2 . . F2 . E2 . . E2 . . E2 . A2 . . A2 . . A2 . G2 . . G2 . . G2 . F2 . . F2 . . E2 . E2 . . . . . . .' },
    { inst: 'arp', vol: 0.045, seq: 'A3 E4 A4 E4 C4 E4 A4 E4 G3 D4 G4 D4 B3 D4 G4 D4 F3 C4 F4 C4 A3 C4 F4 C4 E3 B3 E4 B3 G#3 B3 E4 B3 A3 E4 A4 E4 C4 E4 A4 E4 G3 D4 G4 D4 B3 D4 G4 D4 F3 C4 F4 C4 A3 C4 F4 C4 E3 B3 E4 B3 G#3 B3 E4 B3' },
  ]);
  defTrack('boss', 150, [
    { inst: 'lead', vol: 0.15, seq: 'A4 . A4 C5 . A4 D5 . C5 . A4 . G4 . E4 . A4 . A4 C5 . A4 E5 . D5 . C5 . B4 . G#4 . A4 . A4 C5 . A4 D5 . C5 . A4 . G4 . E4 . F4 . F4 E4 . D4 E4 - - - - - - - . .' },
    { inst: 'bass', vol: 0.32, seq: 'A2 A2 . A2 A2 . A2 A2 G2 G2 . G2 G2 . G2 G2 F2 F2 . F2 F2 . F2 F2 E2 E2 . E2 E2 . E2 E2 A2 A2 . A2 A2 . A2 A2 G2 G2 . G2 G2 . G2 G2 F2 F2 . F2 F2 . F2 F2 E2 E2 . E2 G#2 . B2 E2' },
  ]);
  // the Keeper's theme: slow pads, a bell motif and a low pulse
  defTrack('story', 64, [
    { inst: 'pad', vol: 0.09, seq: 'A3 - - - - - - - - - - - - - - - F3 - - - - - - - - - - - - - - - C4 - - - - - - - - - - - - - - - G3 - - - - - - - - - - - - - - -' },
    { inst: 'pad', vol: 0.07, seq: 'E4 - - - - - - - - - - - - - - - C4 - - - - - - - - - - - - - - - G4 - - - - - - - - - - - - - - - D4 - - - - - - - - - - - - - - -' },
    { inst: 'pad', vol: 0.06, seq: 'C5 - - - - - - - - - - - - - - - A4 - - - - - - - - - - - - - - - E5 - - - - - - - - - - - - - - - B4 - - - - - - - - - - - - - - -' },
    { inst: 'bell', vol: 0.12, seq: 'E5 . . . . . . . A5 . . . G5 . . . . . . . . . . . E5 . . . . . . . G5 . . . . . . . C6 . . . B5 . . . . . . . . . . . D5 . . . . . . .' },
    { inst: 'bass', vol: 0.18, seq: 'A1 - - - . . . . A1 - - - . . . . F1 - - - . . . . F1 - - - . . . . C2 - - - . . . . C2 - - - . . . . G1 - - - . . . . G1 - - - . . . .' },
  ]);
  // the letter: a music box in D minor over soft pads
  const held = arr => arr.map(n => n + ' -'.repeat(15)).join(' ');
  defTrack('lament', 54, [
    { inst: 'bell', vol: 0.13, seq: 'D5 . . . F5 . . . A5 . . . G5 . F5 . E5 . . . . . . . C5 . . . D5 . E5 . F5 . . . E5 . D5 . C#5 . . . A4 . . . D5 . . . . . . . . . . . . . . . A5 . . . G5 . F5 . E5 . . . F5 . G5 . A5 . . . D6 . . . C6 . A5 . . . . . A#5 . . . A5 . G5 . F5 . . . E5 . . . D5 . . . . . . . . . . . . . . .' },
    { inst: 'pad', vol: 0.07, seq: held(['D4', 'C4', 'A#3', 'D4', 'F4', 'D4', 'A#3', 'A3']) },
    { inst: 'pad', vol: 0.055, seq: held(['F4', 'E4', 'D4', 'F4', 'A4', 'F4', 'D4', 'C#4']) },
    { inst: 'bass', vol: 0.15, seq: held(['D2', 'A1', 'G1', 'D2', 'F2', 'A#1', 'G1', 'A1']) },
  ]);
  // the Lantern Tide: a seaside waltz in D (12 steps per bar)
  const bars = (roots, f) => roots.map(f).join(' ');
  defTrack('festival', 138, [
    { inst: 'lead', vol: 0.17, seq: 'D5 - - F#5 - - A5 - - F#5 - - G5 - - B5 - - A5 - - F#5 - - E5 - - G5 - - F#5 - - D5 - - E5 - - - - - A4 - - - - - D5 - - F#5 - - A5 - - D6 - - C#6 - - B5 - - A5 - - G5 - - F#5 - - E5 - - D5 - - C#5 - - D5 - - - - - - - - . . .' },
    { inst: 'bass', vol: 0.24, seq: bars(['D2', 'G2', 'A2', 'A2', 'D2', 'A2', 'D2', 'D2'], r => r + ' - - . . . . . . . . .') },
    { inst: 'arp', vol: 0.05, seq: bars(['F#4', 'B4', 'C#5', 'C#5', 'F#4', 'E4', 'F#4', 'F#4'], c => `. . . . ${c} . . . ${c} . . .`) },
    { inst: 'bell', vol: 0.05, seq: bars(['A5', 'D6', 'E6', 'C#6', 'A5', 'E6', 'F#6', 'D6'], c => `${c} . . . . . . . . . . .`) },
  ]);
  defTrack('death', 60, [
    { inst: 'lead', vol: 0.18, seq: 'A4 - - - - - G4 - E4 - - - - - - - F4 - - - E4 - D4 - E4 - - - - - - - . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .' },
    { inst: 'bass', vol: 0.25, seq: 'A2 - - - - - - - - - - - - - - - D2 - - - - - - - E2 - - - - - - - . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .' },
  ]);

  function playNote(inst, m, t, dur, vol) {
    const f = hz(m);
    const o = ac.createOscillator(), g = ac.createGain();
    let type = 'triangle', att = 0.02, rel = dur;
    if (inst === 'bass') { type = 'triangle'; att = 0.01; }
    if (inst === 'arp') { type = 'square'; att = 0.005; rel = Math.min(dur, 0.15); }
    if (inst === 'lead') { type = 'triangle'; att = 0.03; }
    if (inst === 'pad') { type = 'sine'; att = Math.min(0.9, dur * 0.4); rel = dur * 1.1; }
    if (inst === 'bell') { type = 'sine'; att = 0.005; rel = Math.max(dur, 1.2); }
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (inst === 'lead') { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5; lg.gain.value = f * 0.006; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + rel + 0.1); }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + att);
    g.gain.setValueAtTime(vol, t + Math.max(att, rel * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + rel + 0.05);
    o.connect(g); g.connect(musG); o.start(t); o.stop(t + rel + 0.1);
  }
  function schedule() {
    if (!ac || !musicState.track) return;
    const tr = musicState.track, stepDur = 60 / tr.bpm / 4;
    while (musicState.next < ac.currentTime + 0.15) {
      const st = musicState.step;
      for (const p of tr.parts) {
        const n = p.notes[st % p.notes.length];
        if (typeof n === 'number') {
          let len = 1; while (p.notes[(st + len) % p.notes.length] === '-' && len < 16) len++;
          playNote(p.inst, n, musicState.next, len * stepDur * 0.95, p.vol);
        }
      }
      musicState.step++;
      musicState.next += stepDur;
    }
  }
  function music(name) {
    if (musicState.name === name) return;
    musicState.name = name;
    musicState.track = TRACKS[name] || null;
    musicState.step = 0;
    if (!ac) return;
    // quick fade
    musG.gain.cancelScheduledValues(ac.currentTime);
    musG.gain.setValueAtTime(0.0001, ac.currentTime);
    musG.gain.linearRampToValueAtTime(OPTS.music * 0.32, ac.currentTime + 0.8);
    musicState.next = ac.currentTime + 0.1;
    if (!musicState.timer) musicState.timer = setInterval(schedule, 40);
  }
  function blip(f, v = 1) { tone('triangle', f, f * 0.93, 0.055, 0.1 * v); tone('square', f * 2, f * 2, 0.025, 0.018 * v); }
  return { unlock, sfx, music, applyVol, blip, ambient, get ready() { return !!ac; } };
})();
const sfx = n => AudioSys.sfx(n);
function haptic(ms) { if (OPTS.vibration && navigator.vibrate && Input.device() === 'touch') { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } }
