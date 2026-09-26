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

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let VIEW = { s: 1, left: 0, top: 0 };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const touch = document.body.classList.contains('touch');
  const portrait = innerHeight > innerWidth;
  document.body.classList.toggle('portrait', portrait);
  let availH = innerHeight;
  if (touch && portrait) availH = innerHeight * 0.58;
  const s = Math.min(innerWidth / W, availH / H);
  VIEW.s = s;
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
  cv.width = Math.round(W * s * dpr);
  cv.height = Math.round(H * s * dpr);
  const wrap = document.getElementById('wrap');
  if (touch && portrait) { wrap.style.alignItems = 'flex-start'; wrap.style.paddingTop = '28px'; }
  else { wrap.style.alignItems = 'center'; wrap.style.paddingTop = '0'; }
  resetCtx();
  if (typeof Input !== 'undefined') Input.layoutTouch();
}
function resetCtx() {
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = 'alphabetic';
}
window.addEventListener('resize', resize);

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
function setFont(size = 8, bold = false, fam = FONT) { ctx.font = `${bold ? 700 : 400} ${size}px ${fam}`; }
function textW(s, size = 8, bold = false, fam = FONT) {
  const k = size + '|' + bold + '|' + fam + '|' + s;
  let v = _mcache.get(k);
  if (v === undefined) { setFont(size, bold, fam); v = ctx.measureText(s).width; if (_mcache.size > 4000) _mcache.clear(); _mcache.set(k, v); }
  return v;
}
// draw text; o = {size, color, align, bold, shadow, outline, fam, alpha}
function txt(s, x, y, o = {}) {
  s = String(s);
  const size = o.size || 8;
  setFont(size, o.bold, o.fam || FONT);
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
function wrapText(s, maxW, size = 8) {
  const out = [];
  for (const para of String(s).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (textW(t, size) > maxW && line) { out.push(line); line = w; } else line = t;
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
const OPTS = Object.assign({ shake: 0.5, vibration: true, textSpeed: 1, music: 0.5, sfx: 0.7, lang: 'English', showTouch: 'auto', fullscreen: false },
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
    Space: ['ROLL'], ShiftLeft: ['ROLL'],
    KeyQ: ['LB'], KeyR: ['RB'], KeyI: ['SELECT'], Tab: ['SELECT'], KeyP: ['START'], KeyF: ['PENDANT'],
    KeyZ: ['LT'], KeyC: ['RT'],
  };
  const down = {}, prev = {}, src = { key: {}, pad: {}, touch: {} };
  let stick = { x: 0, y: 0 }, padStick = { x: 0, y: 0 };
  let lastDevice = 'key';
  const rep = { dir: null, t: 0 };
  let anyPressedFlag = false;

  window.addEventListener('keydown', e => {
    const m = KEYMAP[e.code];
    if (m) { m.forEach(b => src.key[b] = true); e.preventDefault(); }
    lastDevice = 'key'; anyPressedFlag = true;
    AudioSys.unlock();
  });
  window.addEventListener('keyup', e => { const m = KEYMAP[e.code]; if (m) m.forEach(b => src.key[b] = false); });
  window.addEventListener('blur', () => { src.key = {}; src.touch = {}; });

  // ---- touch
  const touchEl = document.getElementById('touch');
  const stickEl = document.getElementById('stick'), knob = document.getElementById('knob');
  let stickId = null, stickC = { x: 0, y: 0 }, stickR = 50;
  function enableTouch() {
    if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); resize(); }
    lastDevice = 'touch';
  }
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  window.addEventListener('touchstart', () => { enableTouch(); AudioSys.unlock(); }, { passive: true });
  stickEl.addEventListener('pointerdown', e => {
    stickId = e.pointerId; try { stickEl.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or stale pointer */ }
    const r = stickEl.getBoundingClientRect(); stickC = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; stickR = r.width / 2;
    moveStick(e); anyPressedFlag = true;
  });
  stickEl.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
  const endStick = e => { if (e.pointerId === stickId) { stickId = null; stick = { x: 0, y: 0 }; knob.style.transform = ''; } };
  stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    let dx = (e.clientX - stickC.x) / stickR, dy = (e.clientY - stickC.y) / stickR;
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    stick = { x: dx, y: dy };
    knob.style.transform = `translate(${dx * stickR * 0.6}px, ${dy * stickR * 0.6}px)`;
  }
  for (const b of touchEl.querySelectorAll('.tbtn')) {
    const name = b.dataset.b;
    const on = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } b.classList.add('on'); src.touch[name] = true; if (name === 'B') src.touch.ROLL = true; anyPressedFlag = true; AudioSys.unlock(); if (OPTS.vibration && navigator.vibrate) navigator.vibrate(8); };
    const off = e => { b.classList.remove('on'); src.touch[name] = false; if (name === 'B') src.touch.ROLL = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  }
  function layoutTouch() {
    const portrait = innerHeight > innerWidth;
    const btns = {}; touchEl.querySelectorAll('.tbtn').forEach(b => btns[b.dataset.b] = b);
    const u = Math.min(innerWidth, innerHeight);
    const size = portrait ? u * 0.17 : u * 0.15;
    const place = (el, x, y, w, h = w) => { Object.assign(el.style, { left: (x - w / 2) + 'px', top: (y - h / 2) + 'px', width: w + 'px', height: h + 'px' }); };
    let bx, by, sx, sy, sr;
    if (portrait) {
      const top = innerHeight * 0.58 + 28;
      const midY = top + (innerHeight - top) * 0.55;
      sr = Math.min(innerWidth * 0.36, (innerHeight - top) * 0.7);
      sx = innerWidth * 0.26; sy = midY; bx = innerWidth * 0.74; by = midY;
      const sm = size * 0.95;
      const rowY = top + 18;
      ['LB', 'RB', 'SELECT', 'PENDANT', 'START'].forEach((k, i) => place(btns[k], innerWidth * (0.12 + i * 0.19), rowY, sm * 1.1, sm * 0.52));
    } else {
      sr = u * 0.42; sx = sr * 0.62 + 14; sy = innerHeight - sr * 0.62 - 14;
      bx = innerWidth - size * 1.7 - 10; by = innerHeight - size * 1.7 - 10;
      const sm = size * 0.85;
      const side = (innerWidth - W * VIEW.s) / 2; // letterbox margin beside the canvas
      if (side >= 56) {
        // wide phones: stack the small buttons in the empty side bars, clear of the HUD
        const bw = Math.min(side - 10, sm * 1.2), bh = sm * 0.55;
        ['SELECT', 'RB', 'LB', 'PENDANT'].forEach((k, i) => place(btns[k], innerWidth - side / 2, 14 + bh / 2 + i * (bh + 8), bw, bh));
        place(btns.START, side / 2, 14 + bh / 2, bw * 0.8, bh);
      } else {
        ['LB', 'RB', 'SELECT', 'PENDANT'].forEach((k, i) => place(btns[k], innerWidth / 2 + 30 + i * (sm * 1.2 + 6), innerHeight - 20, sm * 1.2, sm * 0.55));
        place(btns.START, innerWidth / 2 - 40, innerHeight - 20, sm * 0.9, sm * 0.55);
      }
    }
    place(stickEl, sx, sy, sr);
    const d = size * 0.95;
    place(btns.A, bx, by + d, size); place(btns.B, bx + d, by, size);
    place(btns.X, bx - d, by, size); place(btns.Y, bx, by - d, size);
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
    for (const k in down) prev[k] = down[k];
    const names = new Set([...Object.keys(src.key), ...Object.keys(src.pad), ...Object.keys(src.touch), ...Object.keys(prev)]);
    for (const n of names) down[n] = !!(src.key[n] || src.pad[n] || src.touch[n]);
    // menu direction repeat
    const a = axis();
    let d = null;
    if (Math.abs(a.x) > 0.5 || Math.abs(a.y) > 0.5) d = Math.abs(a.x) > Math.abs(a.y) ? (a.x > 0 ? 'R' : 'L') : (a.y > 0 ? 'D' : 'U');
    rep.fire = null;
    if (d !== rep.dir) { rep.dir = d; rep.t = 0.32; rep.fire = d; }
    else if (d) { rep.t -= dt; if (rep.t <= 0) { rep.t = 0.09; rep.fire = d; } }
    const had = anyPressedFlag; anyPressedFlag = false; rep.any = had;
  }
  function axis() {
    let x = 0, y = 0;
    if (src.key.LEFT || src.pad.LEFT) x -= 1; if (src.key.RIGHT || src.pad.RIGHT) x += 1;
    if (src.key.UP || src.pad.UP) y -= 1; if (src.key.DOWN || src.pad.DOWN) y += 1;
    x += padStick.x + stick.x; y += padStick.y + stick.y;
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
  };
  return api;
})();

// ---------------------------------------------------------------- audio
const AudioSys = (() => {
  let ac = null, master, sfxG, musG, noiseBuf;
  let musicState = { name: null, step: 0, next: 0, timer: null, track: null };
  function unlock() {
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
  };
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
  return { unlock, sfx, music, applyVol, get ready() { return !!ac; } };
})();
const sfx = n => AudioSys.sfx(n);
