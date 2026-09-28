'use strict';
// ============================================================================
//  ART: every sprite is generated at runtime from small pixel primitives or
//  pixel templates, then auto-outlined. Style follows the reference shots:
//  chunky outlined pixels, cream/teal UI, purple stone dungeons, warm shop.
// ============================================================================

const C = {
  ink: '#1b1420', outline: '#1d1622',
  paper: '#efe3c5', paper2: '#e3d4ae', paper3: '#cbb88c', paperLine: '#d8c79e', paperInk: '#7a6848', paperDark: '#5a4a34',
  teal: '#43b193', teal2: '#2f8f74', teal3: '#1f6653', mint: '#7de6ae', mint2: '#b3f5cf', tealText: '#2a7a63',
  red: '#d84a3e', red2: '#a6302b', gold: '#f3c552', gold2: '#c98d2b', gold3: '#8a5a1a',
  wood: '#b8693a', wood2: '#87462a', wood3: '#d98b52', wood4: '#5e2f1d',
  menuBg: '#3f8f62', menuBg2: '#4ea570', menuBlob: '#79eea4', menuDark: '#2e2a1c',
  optBg: '#4b4533', optBg2: '#403b2b',
  hp: '#e2453e', hpBack: '#5a1a1e',
  night: '#101a3a',
  btnA: '#4fae52', btnB: '#d2463c', btnX: '#3f7fd0', btnY: '#e4b637',
};

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); }
function P(g, x, y, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); }
// filled ellipse in bounding box, pixel-exact (no anti-aliasing)
function ell(g, x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  g.fillStyle = c;
  for (let j = 0; j < h; j++) {
    const yy = (j + 0.5 - h / 2) / (h / 2);
    const half = (w / 2) * Math.sqrt(Math.max(0, 1 - yy * yy));
    const x0 = Math.round(x + w / 2 - half), x1 = Math.round(x + w / 2 + half);
    if (x1 > x0) g.fillRect(x0, y + j, x1 - x0, 1);
  }
}
function line(g, x0, y0, x1, y1, c) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy; g.fillStyle = c;
  for (;;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
function addOutline(c, col = C.outline) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  const id = g.getImageData(0, 0, w, h), d = id.data;
  const out = new Uint8ClampedArray(d);
  const [r, gg, b] = hexRgb(col);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] > 0) continue;
    let near = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (d[(ny * w + nx) * 4 + 3] > 0) { near = true; break; }
    }
    if (near) { out[i] = r; out[i + 1] = gg; out[i + 2] = b; out[i + 3] = 255; }
  }
  id.data.set(out); g.putImageData(id, 0, 0);
  return c;
}
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function shade(hex, k) { // k<0 darker, k>0 lighter
  const [r, g, b] = hexRgb(hex);
  const f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255);
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
// build sprite: draw fn gets (g) translated by pad; returns outlined canvas
function sprite(w, h, fn, outline = C.outline, pad = 1) {
  const c = mkCanvas(w + pad * 2, h + pad * 2), g = c.getContext('2d');
  g.translate(pad, pad); fn(g); g.setTransform(1, 0, 0, 1, 0, 0);
  if (outline) addOutline(c, outline);
  return c;
}
function flipH(src) { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c; }
function whiteOf(src, col = '#ffffff') { const c = mkCanvas(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; }
function fromRows(rows, pal, outline = C.outline) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  return sprite(w, h, g => {
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch !== '.' && ch !== ' ' && pal[ch]) P(g, x, y, pal[ch]); } });
  }, outline);
}
const SPR = {};
function cached(key, fn) { return SPR[key] || (SPR[key] = fn()); }

// ---------------------------------------------------------------- item icon templates (12x12)
// 1 dark, 2 mid, 3 light, 4 highlight, a/b/c secondary colours
const ICON_T = {
  jelly: ['............', '.....33.....', '....3442....', '....3432....', '...344322...', '...3432221..', '..33322221..', '..32222221..', '.3222222211.', '.3222222211.', '..22221111..', '............'],
  crystal: ['.....4......', '....342.....', '....3421....', '...34221....', '...342211...', '..3422211...', '..3422211...', '..342221....', '...32211....', '...3221.....', '....21......', '............'],
  orb: ['............', '....2222....', '...234322...', '..23443222..', '..23432221..', '..22322221..', '..22222211..', '..22222111..', '...221111...', '....1111....', '............', '............'],
  core: ['............', '....2222....', '...222222...', '..22133122..', '..21344312..', '..21344312..', '..22133122..', '..22211222..', '...222222...', '....2222....', '............', '............'],
  bar: ['............', '............', '............', '.....33333..', '....344442..', '...3444422..', '..33333322..', '..32222221..', '..22222211..', '..11111111..', '............', '............'],
  root: ['..........2.', '.........22.', '.....2..22..', '.....22221..', '......2221..', '.....22.21..', '....22..21..', '...22...2...', '..22...22...', '..2...22....', '.....2......', '............'],
  vine: ['.........33.', '........3431', '.....2..3321', '....232..21.', '....2321.2..', '.....22.2...', '.......2....', '..33..2.....', '.3432.2.....', '.33212......', '...12.......', '............'],
  stone: ['............', '............', '....333.....', '...34432....', '..3443222...', '..3432222...', '..22222221..', '..22222211..', '...221111...', '............', '............', '............'],
  tooth: ['............', '...333333...', '..34444432..', '..34444322..', '..34443222..', '...343222...', '...34.322...', '...32.322...', '...3...2....', '............', '............', '............'],
  lens: ['............', '.3333..3333.', '3444433444.3', '34..3223..43', '3...3..3...3', '3...3..3...3', '.3..3..3..3.', '..33....33..', '............', '............', '............', '............'],
  sword: ['..........3.', '.........34.', '........342.', '.......342..', '......342...', '.....32.....', '..a.32......', '...ab.......', '...ba.......', '..a..a......', '.a..........', '............'],
  pot: ['............', '....1111....', '....3332....', '...333322...', '..33432221..', '..34322221..', '..3a2a2a21..', '..32222211..', '...222211...', '....1111....', '............', '............'],
  scroll: ['............', '..33333333..', '.3444444432.', '.3422224432.', '.3444444432.', '.3424242432.', '.3444444432.', '.3422244432.', '.3444444432.', '..33333333..', '............', '............'],
  cloth: ['............', '..3333333...', '.344444432..', '.343333332..', '.344444432..', '.343333322..', '.344444322..', '..33333221..', '....22221...', '............', '............', '............'],
  log: ['............', '............', '..33333332..', '.3444444322.', '.34aaaa3224.', '.34abba3224.', '.34aaaa3224.', '..222222211.', '............', '............', '............', '............'],
  seed: ['............', '.....3......', '....342.....', '...34422....', '...34322....', '...33222....', '...32221....', '....2221....', '.....11.....', '............', '............', '............'],
  mushroom: ['............', '....3333....', '..33443333..', '.3442443332.', '.3333333332.', '..22222222..', '.....aa.....', '.....aa.....', '.....ab.....', '....aabb....', '............', '............'],
  leaf: ['............', '..........3.', '.......3332.', '.....33443..', '....34432...', '...34432....', '...3432.....', '..3432......', '..332.......', '.2..........', '2...........', '............'],
  amber: ['............', '.....33.....', '....3443....', '...344432...', '...342232...', '..34221322..', '..33211222..', '..32222221..', '...222221...', '....2211....', '............', '............'],
  bone: ['.33.........', '3443........', '.3443.......', '..3443......', '...3442.....', '....3442....', '.....3442...', '......3442..', '.......34423', '........2443', '.........33.', '............'],
  shell: ['............', '....2..2....', '...233332...', '..23444332..', '..34433432..', '..33322332..', '..32222222..', '..32211222..', '...221122...', '....1..1....', '............', '............'],
  scale: ['............', '....3333....', '...344443...', '..34433443..', '..34333343..', '..33222233..', '...322223...', '....3223....', '.....22.....', '............', '............', '............'],
  fang: ['............', '..33333333..', '..34444432..', '...344432...', '...34432....', '....3432....', '....342.....', '.....32.....', '.....2......', '............', '............', '............'],
  gem: ['............', '...333333...', '..34443322..', '.3444433222.', '.2222222222.', '..32222221..', '...322221...', '....3221....', '.....21.....', '............', '............', '............'],
  spool: ['............', '..aaaaaaaa..', '..abbbbbba..', '..23232322..', '..32323232..', '..23232322..', '..32323232..', '..abbbbbba..', '..aaaaaaaa..', '............', '............', '............'],
  plate: ['............', '.3333333333.', '.3444a44432.', '.34aaaaa432.', '.34a444a432.', '.34a4bba432.', '.34aaaaaa32.', '.3444a44422.', '.2222222222.', '............', '............', '............'],
  cell: ['............', '.....44.....', '....3333....', '....3442....', '....3aa2....', '....3aa2....', '....3aa2....', '....3aa2....', '....3222....', '....2221....', '............', '............'],
  gear: ['............', '....3..3....', '...344442...', '.3344..4422.', '..34....42..', '..34....42..', '.3344..4422.', '...324422...', '....2..2....', '............', '............', '............'],
  chip: ['............', '..a.a.a.a...', '.3333333333.', '..34444442..', '.334bbbb42..', '..34baab42..', '.334bbbb42..', '..34444442..', '.3222222222.', '..a.a.a.a...', '............', '............'],
  heart: ['............', '..33...33...', '.3443.3442..', '.34443442221', '.34444422221', '.3444422221.', '..34422221..', '...342221...', '....3221....', '.....21.....', '............', '............'],
  crown: ['............', '.3...3...3..', '.34..34..34.', '.344.344.34.', '.3444444442.', '.34a2a2a242.', '.3444444442.', '.2222222222.', '............', '............', '............', '............'],
  mask: ['............', '...333333...', '..34444442..', '.3444444442.', '.34aa44aa42.', '.34aa44aa42.', '.3444444442.', '..344b4442..', '...344442...', '....3222....', '............', '............'],
  key: ['............', '..333.......', '.34443......', '.34.43......', '.34443......', '..3223......', '...32.......', '...32.......', '...3222.....', '...32.......', '...322......', '............'],
  potion: ['.....bb.....', '.....bb.....', '....cccc....', '.....cc.....', '....c44c....', '...c3342c...', '..c332221c..', '..c322221c..', '..c322211c..', '...c22111c..', '....cccc....', '............'],
};
const GEAR_T = {
  sword: ['...........44.', '..........4432', '.........4432.', '........4432..', '.......4432...', '......4432....', '..c..4432.....', '...cc432......', '....cc2.......', '....bcc.......', '...bab.c......', '..bab.........', '.aa...........', '.a............'],
  big: ['..........444.', '.........44432', '........44432.', '.......44432..', '......44432...', '.....44432....', '....44432.....', '.cc.4432......', '..ccc32.......', '...bcc........', '..bab.c.......', '.bab..........', 'aa............', 'a.............'],
  spear: ['...........44.', '..........4432', '.........4432.', '........c32...', '.......bc.....', '......ba......', '.....ba.......', '....ba........', '...ba.........', '..ba..........', '.ba...........', 'ba............', 'a.............', '..............'],
  gloves: ['..............', '...3333.......', '..344443......', '..3434343.....', '..34343432....', '..32222222....', '..3222222223..', '..322222232...', '...2222222....', '...aaaaaa.....', '...abbbba.....', '...aaaaaa.....', '..............', '..............'],
  bow: ['.....bbb......', '...bba.4......', '..ba...4......', '.ba....4......', '.ba....4......', 'ba.....4......', 'ba.....4......', 'ba.....4......', 'ba.....4......', '.ba....4......', '.ba....4......', '..ba...4......', '...bba.4......', '.....bbb......'],
  helm: ['..............', '.....3333.....', '...33444433...', '..3444444443..', '..3433333343..', '..3432222343..', '..3322222233..', '..3222222223..', '..32..22..23..', '..32......23..', '..22......22..', '..............', '..............', '..............'],
  chest: ['..............', '..333....333..', '.34443333444..', '.34444444442..', '.34422222442..', '..342222243...', '..332222233...', '..322222223...', '..322222223...', '..3222c2223...', '..3222c2223...', '..222222222...', '..............', '..............'],
  boots: ['..............', '...3333.......', '...3442.......', '...3422.......', '...3422.......', '...3422.......', '...34222......', '...342222222..', '...3422222222.', '...2222222222.', '...aaaaaaaaaa.', '..............', '..............', '..............'],
};
function iconFromTemplate(tpl, pal) {
  // pal: [dark, mid, light, highlight] + {a,b,c}
  const p = { 1: pal[0], 2: pal[1], 3: pal[2], 4: pal[3], a: pal.a || '#5e3a22', b: pal.b || '#8a5a32', c: pal.c || '#d8b048' };
  return fromRows(tpl, p);
}
function itemIcon(id) {
  return cached('icon_' + id, () => {
    const it = ITEMS[id];
    if (!it) return iconFromTemplate(ICON_T.orb, ['#333', '#777', '#aaa', '#fff']);
    const pal = it.pal.slice(0, 4); Object.assign(pal, it.pal2 || {});
    return iconFromTemplate(ICON_T[it.icon] || ICON_T.orb, pal);
  });
}
const TIER_PAL = [
  ['#3e3e4c', '#83839a', '#c3c3d2', '#ffffff'],
  ['#2c4a66', '#5d8fb8', '#a8d0ec', '#ffffff'],
  ['#6a4a12', '#c99830', '#f2d470', '#fff6d0'],
  ['#1b5a4a', '#35b08a', '#86efc6', '#e8fff4'],
];
const ARMOR_PAL = [
  ['#5a4028', '#a57a4a', '#d8b07a', '#f4e0bc'],
  ['#3e3e4c', '#83839a', '#c3c3d2', '#ffffff'],
  ['#2c4a66', '#5d8fb8', '#a8d0ec', '#ffffff'],
  ['#1b5a4a', '#35b08a', '#86efc6', '#e8fff4'],
];
function gearIcon(kind, tier) {
  return cached(`gear_${kind}_${tier}`, () => {
    const armor = ['helm', 'chest', 'boots'].includes(kind);
    const pal = (armor ? ARMOR_PAL : TIER_PAL)[clamp(tier, 0, 3)].slice();
    if (kind === 'gloves') { pal.a = '#5e3a22'; pal.b = '#8a5a32'; }
    if (kind === 'bow') { pal.a = '#5e3a22'; pal.b = ['#8a5a32', '#6a8fb8', '#c99830', '#35b08a'][tier]; }
    return iconFromTemplate(GEAR_T[kind], pal);
  });
}
function potionIcon(tier) {
  return cached('potion_' + tier, () => {
    const cols = [['#7a1a22', '#d8403a', '#ff8a7a', '#ffffff'], ['#7a2a52', '#d84a9a', '#ff9ad0', '#fff'], ['#5a2a7a', '#9a5ad8', '#caa0ff', '#fff'], ['#1a5a5a', '#2ac0b0', '#9af8e8', '#fff']][tier];
    const p = cols.slice(); p.b = '#8a5a32'; p.c = '#d8e8f0';
    return iconFromTemplate(ICON_T.potion, p);
  });
}

// ---------------------------------------------------------------- hero: the plague-doctor merchant
// Black top hat, glowing red eyes, grey beak mask, long tattered cloak and a red scarf.
const PD = {
  k: '#141217', k2: '#26232c', k3: '#38343f', kd: '#060508',
  r: '#ff4d4a', r2: '#b82a2e', ed: '#6e1a1e', e: '#ff6a5e',
  b1: '#76767c', b2: '#4e4e56', b3: '#a2a2aa', glove: '#3e3946',
};
const HERO_ANIM = {
  idle: { n: 2, bob: [0, 1], feetS: [[9, 13], [9, 13]] },
  walk: { n: 4, bob: [0, 1, 0, 1], feetS: [[8, 14], [10, 12], [14, 8], [12, 10]] },
  run: { n: 6, bob: [0, 1, 2, 1, 0, 1], feetS: [[5, 17], [8, 15], [13, 10], [17, 5], [15, 8], [10, 13]] },
  attack: { n: 3, bob: [0, 0, 1], feetS: [[8, 14], [7, 16], [8, 14]] },
};
function pdCloak(g, cx, b, lean, flare, flareF, hemShift, hemRow = 29) {
  for (let y = 12; y <= hemRow; y++) {
    const t = (y - 12) / (hemRow - 12);
    const half = 3.5 + t * 6.5;
    const c = cx + lean * (1 - t);
    const yy = y + (t < 0.45 ? b : 0);
    const x0 = Math.round(c - half - flare * t * t), x1 = Math.round(c + half + flareF * t * t);
    if (y === hemRow) { for (let x = x0; x <= x1; x++) if ((x + hemShift) % 3 !== 0) P(g, x, yy, PD.k); }
    else R(g, x0, yy, x1 - x0 + 1, 1, PD.k);
    if (y === hemRow - 1) for (let x = x0; x <= x1; x++) if ((x + hemShift) % 5 === 0) P(g, x, hemRow + 1, PD.k);
  }
}
function pdHat(g, x, y) {
  R(g, x + 3, y, 8, 7, PD.k); R(g, x + 4, y + 1, 1, 5, PD.k3); R(g, x + 3, y + 5, 8, 1, PD.k2);
  R(g, x, y + 7, 14, 2, PD.k); R(g, x, y + 7, 3, 1, PD.k3);
}
function heroSprite(dir, frame, pose = 'walk') {
  const key = `pd_${dir}_${frame}_${pose}`;
  return cached(key, () => {
    if (dir === 2) return flipH(heroSprite(3, frame, pose));
    const A = HERO_ANIM[pose] || HERO_ANIM.walk, f = frame % A.n;
    const b = A.bob[f], hs = f;
    const run = pose === 'run', atk = pose === 'attack';
    const outline = '#050409';
    return sprite(28, 33, g => {
      if (dir === 3) {
        // ---- side view, facing right
        const lean = run ? 2 : atk ? [-1, 2, 1][f] : 0;
        const [bf, ff] = A.feetS[f];
        R(g, bf, 30, 3, 2, PD.kd); R(g, ff, 30, 3, 2, PD.kd); R(g, ff + 2, 31, 1, 1, PD.kd);
        // flowing scarf behind when running
        if (run) {
          const fl = f % 2;
          R(g, 1 + lean, 14 + b + fl, 7, 2, PD.r); R(g, 0 + lean, 15 + b + fl, 3, 2, PD.r2); R(g, 2 + lean, 18 + b - fl, 5, 1, PD.r);
        }
        pdCloak(g, 11, b, lean, run ? 3 : atk && f === 1 ? 1 : 0, atk && f === 1 ? 3 : 0, hs);
        // wide front fold band like the reference, plus a darker back crease
        const edge = (y, side) => { const t = (y - 12) / 17, half = 3.5 + t * 6.5, c = 11 + lean * (1 - t); return Math.round(side < 0 ? c - half - (run ? 3 : 0) * t * t : c + half); };
        for (let y = 16; y < 29; y++) { const ex = edge(y, 1); R(g, ex - 5, y, 2, 1, PD.k2); if (y > 18) P(g, ex - 4, y, PD.k3); }
        for (let y = 20; y < 28; y += 2) P(g, edge(y, -1) + 3, y, PD.kd);
        // red scarf running down the back edge of the cloak (part of the silhouette)
        if (!run) {
          R(g, 8 + lean, 12 + b, 2, 3, PD.r);
          for (let y = 14; y < 26; y++) { const ex = edge(y, -1) - (y < 18 ? 1 : 0); R(g, ex, y + (y < 20 ? b : 0), 2, 1, PD.r); P(g, ex, y + (y < 20 ? b : 0), y > 16 ? PD.r2 : PD.r); }
          P(g, edge(26, -1) + 1, 26, PD.r);
        } else R(g, 8 + lean, 13 + b, 2, 3, PD.r);
        // arms
        if (atk && f === 0) { R(g, 5 + lean, 10 + b, 3, 5, PD.k2); R(g, 5 + lean, 9 + b, 2, 2, PD.glove); }
        if (atk && f === 1) { R(g, 15 + lean, 15 + b, 6, 2, PD.k2); R(g, 21 + lean, 14 + b, 2, 3, PD.glove); }
        if (!atk) { const sw = pose === 'walk' || run ? [0, 1, 0, -1, 0, 1][f] : 0; R(g, 12 + lean + sw, 15 + b, 2, 6, PD.k2); R(g, 12 + lean + sw, 21 + b, 2, 1, PD.glove); }
        // head, hat, eyes, beak
        const hx = 5 + lean, hy = 1 + b;
        R(g, hx + 4, hy + 9, 7, 4, PD.k);
        pdHat(g, hx, hy);
        R(g, hx + 6, hy + 9, 5, 1, PD.ed); P(g, hx + 7, hy + 9, PD.e); P(g, hx + 9, hy + 9, PD.e);
        R(g, hx + 9, hy + 10, 5, 2, PD.b1); R(g, hx + 14, hy + 11, 1, 1, PD.b1); R(g, hx + 10, hy + 12, 4, 1, PD.b2); P(g, hx + 15, hy + 12, PD.b2);
        R(g, hx + 9, hy + 10, 3, 1, PD.b3);
      } else {
        // ---- front (dir 0) / back (dir 1)
        const cx = 12;
        const fy = [0, 1, 0, 1, 0, 1][f] ;
        const walkish = pose === 'walk' || run;
        const lf = walkish && f % 2 === 0 ? (f % 4 === 0 ? -1 : 0) : 0, rf = walkish && f % 2 === 0 ? (f % 4 === 2 ? -1 : 0) : 0;
        R(g, 9, 30 + lf, 2, 2 - lf, PD.kd); R(g, 14, 30 + rf, 2, 2 - rf, PD.kd);
        pdCloak(g, cx, b, 0, run ? 2 : 0, run ? 2 : 0, hs);
        for (let y = 19; y < 28; y++) { P(g, 9, y, PD.k2); P(g, 15, y, PD.k2); if (y > 21) P(g, 12, y, PD.k3); }
        const hy = 1 + b;
        if (dir === 0) {
          // scarf over the shoulder
          if (run) { R(g, 5, 13 + b, 3, 4, PD.r); R(g, 2 + (f % 2), 15 + b, 4, 2, PD.r); R(g, 2, 16 + b, 1, 1, PD.r2); }
          else { R(g, 6, 13 + b, 3, 8, PD.r); R(g, 6, 13 + b, 1, 8, PD.r2); P(g, 7, 21 + b, PD.r); }
          if (atk && f === 1) { R(g, 12, 15 + b, 2, 7, PD.k2); R(g, 12, 22 + b, 2, 2, PD.glove); }
          else if (atk && f === 0) { R(g, 16, 10 + b, 2, 5, PD.k2); R(g, 16, 9 + b, 2, 2, PD.glove); }
          else { R(g, 16, 16 + b, 2, 5, PD.k2); R(g, 16, 21 + b, 2, 1, PD.glove); }
          R(g, 9, hy + 9, 7, 4, PD.k);
          pdHat(g, 5, hy);
          R(g, 9, hy + 9, 6, 1, PD.ed); P(g, 10, hy + 9, PD.e); P(g, 13, hy + 9, PD.e);
          R(g, 10, hy + 11, 4, 2, PD.b1); R(g, 11, hy + 13, 2, 2, PD.b2); P(g, 11, hy + 15, PD.b2); R(g, 10, hy + 11, 2, 1, PD.b3);
        } else {
          R(g, 9, hy + 9, 7, 4, PD.k);
          pdHat(g, 5, hy);
          R(g, 5, hy + 7, 14, 1, PD.k2);
          if (run) { R(g, 10, 13 + b, 3, 5, PD.r); R(g, 13, 16 + b, 6, 2, PD.r); R(g, 17, 17 + b, 3, 1, PD.r2); }
          else { R(g, 10, 13 + b, 3, 13, PD.r); R(g, 10, 13 + b, 1, 13, PD.r2); P(g, 11, 26 + b, PD.r); P(g, 12, 27 + b, PD.r); }
          if (atk) { R(g, 16, 11 + b, 2, 5, PD.k2); R(g, 16, 10 + b, 2, 2, PD.glove); }
        }
      }
    }, outline);
  });
}
// dash-roll: the cloak tucks into a spinning ball with the red scarf whipping around
function heroRoll(frame) {
  return cached('pdroll_' + frame, () => sprite(24, 24, g => {
    const a = frame / 6 * Math.PI * 2;
    const cx = 12, cy = 13;
    ell(g, 3, 5, 18, 17, PD.k);
    for (let k = 0; k < 6; k++) { const t = a + 2 + k * 0.18; P(g, cx + Math.cos(t) * 6, cy + Math.sin(t) * 5.5, PD.k2); P(g, cx + Math.cos(t + 3) * 3, cy + Math.sin(t + 3) * 3, PD.k3); }
    // scarf whipping around behind the spin
    for (let k = 0; k < 7; k++) { const t = a + Math.PI + k * 0.22, rr = 8 + k * 0.5; P(g, cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.9, k > 4 ? PD.r2 : PD.r); P(g, cx + Math.cos(t) * (rr - 1), cy + Math.sin(t) * (rr - 1) * 0.9, PD.r); P(g, cx + Math.cos(t) * (rr + 1), cy + Math.sin(t) * (rr + 1) * 0.9, PD.r2); }
    // hat brim & beak & eyes rotating with the body
    const hx = cx + Math.cos(a) * 6, hy = cy + Math.sin(a) * 5.5;
    ell(g, hx - 3, hy - 3, 6, 6, PD.k); P(g, hx - 1, hy - 1, PD.k3); P(g, hx, hy - 2, PD.k3);
    const bx = cx + Math.cos(a + 0.9) * 5, by = cy + Math.sin(a + 0.9) * 4.5;
    for (let k = 0; k < 4; k++) P(g, bx + Math.cos(a + 0.9) * k, by + Math.sin(a + 0.9) * k, k < 2 ? PD.b1 : PD.b2);
    P(g, cx + Math.cos(a + 0.45) * 4, cy + Math.sin(a + 0.45) * 3.6, PD.e);
  }, '#050409'));
}
// portrait = the idle hero at 2x, framed from the knees up
function heroPortrait() {
  return cached('pdPortrait', () => {
    const src = heroSprite(3, 0, 'idle');
    const c = mkCanvas(src.width * 2, 26 * 2), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, src.width, 26, 0, 0, src.width * 2, 52);
    return c;
  });
}

// ---------------------------------------------------------------- people
// ---------------------------------------------------------------- townsfolk sheets
// Two hand-drawn sheets, eight characters each. Every cell row is one facing:
// row 0 down, row 1 up, row 2 left, row 3 right. Refs 0-7 come from sheet A, 8-15 from sheet B.
// Sheet B is drawn at a finer pixel size, so its sprites carry a draw scale.
const TOWNSFOLK = {
  ready: false,
  sheets: [
    { src: 'img/townsfolk_a.png', CW: 34, CH: 46, scale: 1, img: null },
    { src: 'img/townsfolk_b.png', CW: 44, CH: 64, scale: 0.72, img: null },
  ],
};
function loadTownsfolk() {
  return Promise.all(TOWNSFOLK.sheets.map(sh => new Promise(res => {
    const im = new Image();
    im.onload = () => { sh.img = im; res(true); };
    im.onerror = () => res(false);
    im.src = sh.src;
  }))).then(ok => { TOWNSFOLK.ready = ok.every(Boolean); });
}
function townsfolkBase(k, dir) {
  return cached(`tf_${k}_${dir}`, () => {
    const sh = TOWNSFOLK.sheets[k >> 3], col = k & 7;
    const c = mkCanvas(sh.CW, sh.CH);
    c.getContext('2d').drawImage(sh.img, col * sh.CW, dir * sh.CH, sh.CW, sh.CH, 0, 0, sh.CW, sh.CH);
    c.scale = sh.scale;
    return c;
  });
}
function townsfolkSprite(k, dir, frame, pose) {
  const f = pose === 'walk' ? frame % 4 : 0;
  return cached(`tfs_${k}_${dir}_${f}`, () => {
    const src = townsfolkBase(k, dir);
    if (!f || f === 2) return src;
    // walking: a small bob, and one foot lifted
    const sh = TOWNSFOLK.sheets[k >> 3], u = Math.round(1 / sh.scale);
    const c = mkCanvas(src.width, src.height), g = c.getContext('2d'), w = src.width, h = src.height, legs = Math.round(5 / sh.scale);
    g.drawImage(src, 0, 0, w, h - legs, 0, -u, w, h - legs);
    const half = w / 2, lift = f === 1 ? 0 : 1;
    g.drawImage(src, 0, h - legs, half, legs, 0, h - legs - (lift === 0 ? 2 : 1) * u, half, legs);
    g.drawImage(src, half, h - legs, w - half, legs, half, h - legs - (lift === 1 ? 2 : 1) * u, w - half, legs);
    c.scale = sh.scale;
    return c;
  });
}
// head-and-shoulders crop of a character's front view, for dialogue boxes
function refPortrait(k) {
  return cached('tfp_' + k, () => {
    const src = townsfolkBase(k, 0), g0 = src.getContext('2d'), d = g0.getImageData(0, 0, src.width, src.height).data;
    let top = src.height, bot = 0;
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (d[(y * src.width + x) * 4 + 3] > 40) { top = Math.min(top, y); bot = Math.max(bot, y); }
    const h = Math.min(src.width, Math.round((bot - top + 1) * 0.62)), c = mkCanvas(src.width, h);
    c.getContext('2d').drawImage(src, 0, top, src.width, h, 0, 0, src.width, h);
    c.fill = true;
    return c;
  });
}
// the whole front view, for the forge and potion counters
function refStanding(k) { return cached('tfst_' + k, () => { const src = townsfolkBase(k, 0), c = mkCanvas(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); c.tall = 84; return c; }); }
// o: {skin, hair, hairStyle, eyes, shirt, pants, boots, dress, outfit, metal, coat, hat, hatCol, beard, kid, wide, apron, scarf, mask}
// Townsfolk in a chibi RPG style: large round heads with full hair, bright eyes, layered outfits
// (tunic, dress, armour with pauldrons, long coat), boots. 22x32 art. dir 0 down, 1 up, 2 left, 3 right.
function personSprite(o, dir, frame, pose = 'walk') {
  if (o.ref !== undefined && TOWNSFOLK.ready) return townsfolkSprite(o.ref, dir, frame, pose);
  const key = 'p3_' + o.id + '_' + dir + '_' + frame + '_' + pose;
  return cached(key, () => {
    if (dir === 3) return flipH(personSprite(o, 2, frame, pose));
    const walk = pose === 'walk', leg = walk ? [0, 1, 0, -1][frame % 4] : 0;
    const bob = walk && frame % 2 === 1 ? 1 : 0;
    const kid = !!o.kid, wd = o.wide ? 1 : 0, side = dir === 2, back = dir === 1;
    const sh = (c, k) => shade(c, k);
    const skin = o.skin || '#f2c8a0', skinD = sh(skin, -0.16), skinL = sh(skin, 0.22);
    const hair = o.hair || '#6a4028', hairD = sh(hair, -0.34), hairL = sh(hair, 0.32), hairLL = sh(hair, 0.55);
    const shirt = o.shirt || '#8aa860', shirtD = sh(shirt, -0.3), shirtL = sh(shirt, 0.22);
    const pants = o.pants || '#5a4634', pantsD = sh(pants, -0.3);
    const boot = o.boots || '#4a3024', bootD = sh(boot, -0.35), bootL = sh(boot, 0.25);
    const metal = o.metal || '#b8c2d0', metalD = sh(metal, -0.3), metalL = sh(metal, 0.4);
    const eye = o.eyes || '#2a1a24', blush = '#f2968c', belt = '#4a2e1e';
    const outfit = o.dress ? 'dress' : o.outfit || 'tunic';
    return sprite(22, 43, g => {
      const hy = (kid ? 16 : 12) + bob;         // top of the head box (headroom above for hats)
      const by = hy + 13;                        // torso top
      const th = kid ? 6 : 9;                    // torso height
      const ly = by + th;                        // legs start
      const G = 42;                              // ground
      const tx = side ? 7 - wd : 5 - wd, tw = side ? 8 + wd * 2 : 12 + wd * 2;
      // ---- legs and boots
      if (outfit === 'dress') {
        const top = by + 4;
        for (let j = top; j < G - 2; j++) { const k = Math.min(3, ((j - top) / 2.2) | 0); R(g, tx - k, j, tw + k * 2, 1, o.dress); }
        const hemY = G - 3;
        R(g, tx - 3, hemY, tw + 6, 1, sh(o.dress, -0.3)); R(g, tx + tw - 1, top, 2, hemY - top, sh(o.dress, -0.18)); R(g, tx + 1, top + 1, 1, hemY - top - 2, sh(o.dress, 0.2));
        if (o.apron) { R(g, tx + 2, top, tw - 4, hemY - top - 1, o.apron); R(g, tx + 2, top, tw - 4, 1, sh(o.apron, 0.2)); }
        R(g, 7 - (side ? leg : 0), G - 2 - (leg > 0 && !side ? 1 : 0), 3, 2, boot); R(g, 12 + (side ? leg : 0), G - 2 - (leg < 0 && !side ? 1 : 0), 3, 2, boot);
      } else if (side) {
        const l1 = 9 + leg * 2, l2 = 10 - leg * 2;
        R(g, l2, ly, 3, G - 3 - ly, pantsD); R(g, l2 - 1, G - 3, 4, 3, bootD);
        R(g, l1, ly, 3, G - 3 - ly, pants); R(g, l1 - 1, G - 3, 4, 3, boot); R(g, l1 - 1, G - 3, 4, 1, bootL);
      } else {
        const f1 = leg > 0 ? 1 : 0, f2 = leg < 0 ? 1 : 0;
        R(g, 7, ly, 3, G - 3 - ly - f1, pants); R(g, 7, G - 4 - f1, 3, 4, boot); R(g, 7, G - 4 - f1, 3, 1, bootL);
        R(g, 12, ly, 3, G - 3 - ly - f2, pants); R(g, 12, G - 4 - f2, 3, 4, boot); R(g, 12, G - 4 - f2, 3, 1, bootL);
        R(g, 14, ly, 1, G - 4 - ly - f2, pantsD); R(g, 9, G - 1 - f1, 1, 1, bootD); R(g, 14, G - 1 - f2, 1, 1, bootD);
      }
      // ---- long hair behind the body
      const hs = o.hairStyle || 'short', hood = o.hat === 'hood';
      if (!hood && hs === 'long' && back) { R(g, 3, hy + 6, 16, 13, hair); R(g, 4, hy + 18, 14, 2, hairD); for (let x = 5; x < 18; x += 3) R(g, x, hy + 8, 1, 10, hairD); }
      if (!hood && hs === 'long' && side) { R(g, 12, hy + 5, 6, 14, hair); R(g, 13, hy + 18, 4, 1, hairD); R(g, 16, hy + 6, 2, 12, hairD); }
      // ---- the far arm (side view)
      const armL = th - 2;
      if (side && pose !== 'grab') { const ax = 13 + leg; R(g, ax, by + 1, 3, armL, outfit === 'armor' ? metalD : shirtD); R(g, ax, by + armL, 3, 2, skinD); }
      // ---- torso
      const shirtC = outfit === 'dress' ? (o.shirt || sh(o.dress, 0.3)) : shirt;
      R(g, tx + 1, by, tw - 2, 1, shirtC); R(g, tx, by + 1, tw, th - 1, shirtC);
      R(g, tx + tw - 1, by + 1, 1, th - 1, sh(shirtC, -0.3)); R(g, tx + 1, by + 1, 1, th - 2, sh(shirtC, 0.22));
      if (outfit === 'armor') {
        // breastplate, belt and a tabard below
        R(g, tx + 1, by + 1, tw - 2, th - 3, metal); R(g, tx + 2, by + 2, tw - 4, 1, metalL); R(g, tx + tw - 2, by + 1, 1, th - 3, metalD);
        if (!side && !back) { R(g, 10, by + 2, 2, th - 4, metalD); P(g, 10, by + 2, metalL); }
        R(g, tx, by + th - 2, tw, 1, belt); if (!back) P(g, tx + (tw >> 1), by + th - 2, '#e8c060');
        if (!side) { R(g, tx + 3, by + th - 1, tw - 6, 3, shirt); R(g, tx + 3, by + th + 1, tw - 6, 1, shirtD); }
      } else if (outfit === 'coat') {
        const coat = o.coat || '#3a3042', coatD = sh(coat, -0.3), coatL = sh(coat, 0.2);
        R(g, tx, by + 1, tw, th + 4, coat); R(g, tx + 1, by, tw - 2, 1, coat); R(g, tx + tw - 1, by + 1, 1, th + 4, coatD); R(g, tx + 1, by + 1, 1, th + 2, coatL);
        if (!side && !back) { R(g, 9, by + 1, 4, th - 2, shirt); P(g, 10, by + 3, '#e8c060'); P(g, 10, by + 5, '#e8c060'); R(g, 8, by, 1, 4, coatL); R(g, 13, by, 1, 4, coatL); }
        if (side) R(g, tx, by + 2, 2, th - 2, shirt);
        R(g, tx, by + th + 3, tw, 1, coatD);
      } else if (outfit === 'dress') {
        R(g, tx, by + 4, tw, 1, o.sash || sh(o.dress, -0.25));
        if (!side && !back) { R(g, 9, by, 4, 1, skin); P(g, 10, by + 1, skin); P(g, 11, by + 1, skin); R(g, 8, by + 1, 1, 2, '#fff4e8'); R(g, 13, by + 1, 1, 2, '#fff4e8'); }
      } else {
        // tunic with a collar, belt and trousers peeking below
        if (!side && !back) { P(g, 10, by, skin); P(g, 11, by, skin); P(g, 10, by + 1, skinD); P(g, 11, by + 1, skinD); R(g, 8, by, 2, 1, shirtL); R(g, 12, by, 2, 1, shirtL); }
        if (!kid) { R(g, tx, by + th - 3, tw, 1, belt); if (!back) R(g, tx + (tw >> 1) - (side ? 1 : 1), by + th - 3, 2, 1, '#e8c060'); R(g, tx + 1, by + th - 2, tw - 2, 2, pants); }
      }
      if (o.apron && outfit !== 'dress' && !back) { const ax = side ? tx : tx + 2, aw = side ? 3 : tw - 4; R(g, ax, by + 2, aw, th + 3, o.apron); R(g, ax, by + 2, aw, 1, sh(o.apron, 0.25)); if (!side) { P(g, tx + 2, by, o.apron); P(g, tx + tw - 3, by, o.apron); } }
      if (o.scarf) { R(g, tx, by, tw, 2, o.scarf); R(g, tx, by + 1, tw, 1, sh(o.scarf, -0.25)); if (!back) R(g, side ? tx + tw - 2 : tx + 3, by + 2, 2, 4, o.scarf); }
      // ---- pauldrons
      if (outfit === 'armor') {
        if (side) { ell(g, tx - 1, by - 1, 7, 5, metal); R(g, tx, by, 4, 1, metalL); R(g, tx - 1, by + 3, 7, 1, metalD); }
        else { for (const px of [tx - 3, tx + tw - 3]) { ell(g, px, by - 1, 7, 5, metal); R(g, px + 1, by, 4, 1, metalL); R(g, px, by + 3, 7, 1, metalD); } }
      }
      // ---- arms
      const sleeve = outfit === 'armor' ? metal : outfit === 'coat' ? (o.coat || '#3a3042') : shirtC;
      if (side) {
        if (pose === 'grab') { R(g, 2, by + 3, 9, 3, sleeve); R(g, 2, by + 5, 9, 1, sh(sleeve, -0.3)); R(g, 0, by + 3, 2, 3, skin); }
        else { const ax = 10 - leg; R(g, ax, by + 1, 3, armL, sleeve); R(g, ax + 2, by + 1, 1, armL, sh(sleeve, -0.3)); R(g, ax, by + armL, 3, 2, skin); }
      } else {
        const s1 = leg < 0 ? 1 : 0, s2 = leg > 0 ? 1 : 0, hand = back ? skinD : skin;
        R(g, tx - 2, by + 1 + s1, 2, armL, sleeve); R(g, tx - 2, by + 1 + s1, 1, armL, sh(sleeve, -0.3)); R(g, tx - 2, by + armL + 1 + s1, 2, 2, hand);
        R(g, tx + tw, by + 1 + s2, 2, armL, sleeve); R(g, tx + tw + 1, by + 1 + s2, 1, armL, sh(sleeve, -0.3)); R(g, tx + tw, by + armL + 1 + s2, 2, 2, hand);
      }
      // ---- head
      if (side) { ell(g, 5, hy + 1, 12, 12, skinD); ell(g, 5, hy + 1, 12, 11, skin); P(g, 4, hy + 8, skin); P(g, 4, hy + 9, skinD); R(g, 13, hy + 7, 1, 2, skinD); }
      else { ell(g, 5, hy + 1, 12, 12, skinD); ell(g, 5, hy + 1, 12, 11, skin); if (!back) { P(g, 4, hy + 7, skin); P(g, 17, hy + 7, skin); P(g, 4, hy + 8, skinD); P(g, 17, hy + 8, skinD); } }
      const face = () => {
        if (back) return;
        if (side) { R(g, 6, hy + 7, 2, 2, eye); P(g, 6, hy + 7, '#ffffff'); R(g, 6, hy + 10, 2, 1, blush); if (!o.beard) P(g, 5, hy + 11, skinD); }
        else {
          R(g, 7, hy + 7, 2, 2, eye); R(g, 13, hy + 7, 2, 2, eye); P(g, 7, hy + 7, '#ffffff'); P(g, 13, hy + 7, '#ffffff');
          R(g, 6, hy + 10, 2, 1, blush); R(g, 14, hy + 10, 2, 1, blush);
          if (!o.beard) { P(g, 10, hy + 11, skinD); P(g, 11, hy + 11, skinD); }
        }
      };
      // ---- hair (full and voluminous)
      if (!hood) {
        if (hs === 'bald') {
          if (back) R(g, 5, hy + 7, 12, 4, hair); else if (side) R(g, 12, hy + 6, 4, 5, hair); else { R(g, 4, hy + 6, 2, 5, hair); R(g, 16, hy + 6, 2, 5, hair); }
          R(g, 8, hy + 2, 4, 1, skinL); P(g, 7, hy + 3, skinL);
          face();
        } else if (back) {
          ell(g, 3, hy - 1, 16, 15, hair); R(g, 6, hy, 7, 1, hairL); R(g, 5, hy + 1, 3, 1, hairL); R(g, 4, hy + 11, 14, 2, hairD);
          for (let x = 6; x < 17; x += 4) R(g, x, hy + 4, 1, 7, hairD);
          if (hs === 'bun') { ell(g, 8, hy - 4, 6, 6, hair); R(g, 9, hy - 3, 2, 1, hairLL); R(g, 8, hy + 1, 6, 1, hairD); }
          if (hs === 'ponytail') { R(g, 10, hy + 10, 3, 9, hair); R(g, 11, hy + 12, 1, 6, hairD); R(g, 9, hy + 9, 5, 2, o.ribbon || '#c8384a'); }
        } else if (side) {
          ell(g, 6, hy - 1, 14, 11, hair); R(g, 12, hy + 3, 6, 7, hair); R(g, 4, hy + 1, 5, 3, hair); P(g, 4, hy + 4, hair); P(g, 6, hy + 4, hair);
          R(g, 8, hy, 6, 1, hairL); R(g, 7, hy + 1, 2, 1, hairL); R(g, 16, hy + 5, 2, 5, hairD); R(g, 12, hy + 9, 4, 1, hairD);
          if (hs === 'bun') { ell(g, 13, hy - 4, 6, 6, hair); R(g, 14, hy - 3, 2, 1, hairLL); }
          if (hs === 'ponytail') { R(g, 17, hy + 4, 3, 9, hair); R(g, 18, hy + 6, 1, 6, hairD); R(g, 16, hy + 3, 3, 2, o.ribbon || '#c8384a'); }
          if (hs === 'curly') for (const [x, y] of [[6, hy - 1], [10, hy - 2], [15, hy - 1], [18, hy + 3], [18, hy + 7]]) ell(g, x, y, 4, 4, hair);
          face();
        } else {
          // crown, bangs with a jagged fringe, locks framing the face
          ell(g, 3, hy - 1, 16, 11, hair);
          R(g, 4, hy + 3, 14, 3, hair);
          for (const x of [5, 6, 9, 10, 11, 14, 15, 16]) P(g, x, hy + 6, hair);
          R(g, 3, hy + 4, 3, 7, hair); R(g, 16, hy + 4, 3, 7, hair);
          R(g, 3, hy + 9, 3, 2, hairD); R(g, 16, hy + 9, 3, 2, hairD); P(g, 7, hy + 6, hairD); P(g, 12, hy + 6, hairD); P(g, 13, hy + 6, hairD);
          R(g, 6, hy, 6, 1, hairL); R(g, 5, hy + 1, 2, 1, hairL); R(g, 12, hy + 1, 2, 1, hairL); P(g, 7, hy + 1, hairLL);
          if (hs === 'long') { R(g, 2, hy + 5, 4, 14, hair); R(g, 16, hy + 5, 4, 14, hair); R(g, 2, hy + 17, 4, 2, hairD); R(g, 16, hy + 17, 4, 2, hairD); R(g, 5, hy + 6, 1, 11, hairD); R(g, 16, hy + 6, 1, 11, hairD); R(g, 3, hy + 6, 1, 8, hairL); }
          if (hs === 'bun') { ell(g, 8, hy - 5, 6, 6, hair); R(g, 9, hy - 4, 2, 1, hairLL); R(g, 8, hy, 6, 1, hairD); }
          if (hs === 'ponytail') { R(g, 18, hy + 5, 3, 10, hair); R(g, 19, hy + 7, 1, 7, hairD); R(g, 17, hy + 4, 3, 2, o.ribbon || '#c8384a'); }
          if (hs === 'curly') { for (const [x, y] of [[2, hy + 2], [15, hy + 2], [2, hy + 7], [16, hy + 7]]) ell(g, x, y, 4, 4, hair); P(g, 3, hy + 3, hairL); P(g, 17, hy + 3, hairL); }
          face();
        }
      }
      // ---- beard
      if (o.beard && !back) {
        const bd = o.beard, bdD = sh(bd, -0.28), bdL = sh(bd, 0.25);
        if (side) { R(g, 4, hy + 11, 8, 2, bd); R(g, 5, hy + 13, 5, 2, bd); R(g, 5, hy + 14, 4, 1, bdD); P(g, 6, hy + 11, bdL); }
        else { R(g, 8, hy + 10, 6, 1, bd); R(g, 5, hy + 11, 12, 2, bd); R(g, 6, hy + 13, 10, 2, bd); R(g, 8, hy + 15, 6, 1, bdD); P(g, 10, hy + 11, bdD); P(g, 11, hy + 11, bdD); P(g, 7, hy + 12, bdL); P(g, 14, hy + 12, bdL); }
      }
      // ---- hats
      const hc = o.hatCol, hcD = hc ? sh(hc, -0.32) : null, hcL = hc ? sh(hc, 0.28) : null;
      if (o.hat === 'tophat') {
        R(g, 6, hy - 8, 10, 8, hc); R(g, 7, hy - 8, 2, 7, hcL); R(g, 14, hy - 8, 2, 8, hcD); R(g, 6, hy - 3, 10, 2, o.band || '#8a3a2a');
        ell(g, 2, hy - 2, 18, 4, hcD); ell(g, 2, hy - 3, 18, 4, hc);
      }
      if (o.hat === 'witch') {
        ell(g, 0, hy - 1, 22, 6, hcD); ell(g, 0, hy - 2, 22, 6, hc);
        R(g, 5, hy - 6, 12, 5, hc); R(g, 7, hy - 9, 9, 3, hc); R(g, 9, hy - 11, 6, 2, hc); R(g, 12, hy - 12, 4, 1, hc); R(g, 15, hy - 12, 2, 1, hc);
        R(g, 5, hy - 2, 12, 1, '#e0c060'); R(g, 7, hy - 8, 2, 5, hcL);
      }
      if (o.hat === 'cap') { R(g, 4, hy - 4, 14, 6, hc); R(g, 5, hy - 4, 12, 1, hcL); R(g, 4, hy, 14, 1, o.band || '#c84a4a'); R(g, side ? 1 : 2, hy + 2, side ? 17 : 18, 1, hcD); }
      if (o.hat === 'feather') {
        ell(g, 2, hy - 3, 18, 7, hc); R(g, 4, hy - 3, 12, 1, hcL); R(g, 2, hy + 2, 18, 1, hcD);
        R(g, side ? 15 : 16, hy - 9, 2, 7, '#f4f0e0'); R(g, side ? 16 : 17, hy - 11, 2, 4, '#f4f0e0'); P(g, side ? 15 : 16, hy - 6, '#c8c0a8');
      }
      if (o.hat === 'bandana') {
        R(g, 3, hy + 1, 16, 4, hc); R(g, 3, hy + 4, 16, 1, hcD); P(g, 6, hy + 2, hcL); P(g, 12, hy + 2, hcL);
        if (!side && !back) { R(g, 18, hy + 4, 2, 3, hc); P(g, 20, hy + 7, hcD); } else if (side) { R(g, 17, hy + 4, 3, 2, hc); R(g, 19, hy + 6, 2, 2, hcD); }
      }
      if (hood) {
        if (back) { ell(g, 2, hy - 2, 18, 17, hc); R(g, 6, hy + 12, 10, 3, hcD); }
        else if (side) { ell(g, 3, hy - 2, 17, 17, hc); ell(g, 3, hy + 3, 9, 10, skin); R(g, 16, hy + 3, 3, 10, hcD); }
        else { ell(g, 2, hy - 2, 18, 17, hc); ell(g, 5, hy + 3, 12, 10, skinD); ell(g, 5, hy + 3, 12, 9, skin); R(g, 3, hy + 10, 2, 6, hcD); R(g, 17, hy + 10, 2, 6, hcD); }
        face();
        if (o.mask && !back) { if (side) R(g, 3, hy + 8, 8, 4, o.mask); else R(g, 5, hy + 8, 12, 4, o.mask); }
      }
    }, o.outline || '#2a1a14');
  });
}

// ---------------------------------------------------------------- enemies
function slimeSprite(pal, frame, size = 1) {
  return cached(`slime_${pal.id}_${frame}_${size}`, () => {
    const s = size;
    const w = 14 * s, h = 12 * s;
    return sprite(w, h, g => {
      const f = frame % 3;
      let ex = 1 * s, ey = 3 * s, ew = 12 * s, eh = 9 * s;
      if (f === 1) { ex = 0; ey = 5 * s; ew = 14 * s; eh = 7 * s; }
      if (f === 2) { ex = 2 * s; ey = 0; ew = 10 * s; eh = 12 * s; }
      ell(g, ex, ey, ew, eh, pal.body);
      ell(g, ex, ey + eh * 0.45, ew, eh * 0.55, pal.dark);
      ell(g, ex + 1, ey, ew - 2, eh * 0.75, pal.body);
      ell(g, ex + ew * 0.18, ey + eh * 0.12, ew * 0.3, eh * 0.28, pal.light);
      P(g, ex + ew * 0.25, ey + eh * 0.2, '#ffffff');
      const cy = ey + eh * 0.5;
      R(g, ex + ew * 0.32, cy, s, 2 * s, pal.eye); R(g, ex + ew * 0.62, cy, s, 2 * s, pal.eye);
      if (pal.core) ell(g, ex + ew * 0.42, ey + eh * 0.7, ew * 0.18, eh * 0.18, pal.core);
    });
  });
}
function golemSprite(pal, frame, pose = 'walk') {
  return cached(`golem_${pal.id}_${frame}_${pose}`, () => {
    const leg = pose === 'walk' ? [0, 1, 0, -1][frame % 4] : 0;
    return sprite(22, 26, g => {
      // legs
      R(g, 6, 20 - (leg > 0 ? 1 : 0), 4, 5, pal.dark); R(g, 12, 20 - (leg < 0 ? 1 : 0), 4, 5, pal.dark);
      // body
      ell(g, 2, 7, 18, 16, pal.dark); ell(g, 3, 7, 16, 14, pal.body);
      R(g, 6, 15, 10, 1, pal.dark); R(g, 8, 17, 6, 1, pal.dark);
      // moss cap with drips
      ell(g, 2, 3, 18, 9, pal.moss); ell(g, 4, 3, 12, 5, pal.moss2);
      R(g, 4, 10, 2, 3, pal.moss); R(g, 9, 11, 2, 2, pal.moss); R(g, 15, 10, 2, 4, pal.moss);
      // eye
      R(g, 9, 12, 4, 2, '#140e18'); R(g, 10, 12, 2, 2, pal.eye);
      // arms + sword
      if (pose === 'wind') {
        R(g, 0, 7, 3, 8, pal.dark); R(g, 19, 3, 3, 9, pal.dark);
        R(g, 20, 0, 2, 3, pal.dark); R(g, 18, -1, 6, 1, '#cfcfe0');
      } else if (pose === 'slash') {
        R(g, 0, 11, 3, 7, pal.dark); R(g, 19, 13, 3, 6, pal.dark);
      } else {
        R(g, 0, 11 + (leg > 0 ? 1 : 0), 3, 7, pal.dark); R(g, 19, 11 + (leg < 0 ? 1 : 0), 3, 7, pal.dark);
        R(g, 20, 4 + (leg < 0 ? 1 : 0), 2, 9, '#b8b8cc'); R(g, 19, 12 + (leg < 0 ? 1 : 0), 4, 1, '#6a5a3a');
      }
    });
  });
}
function turretSprite(pal, frame) {
  return cached(`turret_${pal.id}_${frame}`, () => sprite(16, 20, g => {
    R(g, 2, 9, 12, 11, pal.dark); R(g, 3, 9, 10, 10, pal.body); R(g, 3, 13, 10, 1, pal.dark); R(g, 3, 16, 10, 1, pal.dark);
    ell(g, 0, 0, 16, 12, pal.moss); ell(g, 2, 1, 10, 5, pal.moss2);
    ell(g, 4, 4, 8, 6, '#120c16');
    if (frame === 1) { ell(g, 5, 5, 6, 4, pal.eye); P(g, 7, 6, '#ffffff'); }
    else { R(g, 6, 6, 4, 2, shade(pal.eye, -0.4)); }
  }));
}
function wispSprite(pal, frame) {
  return cached(`wisp_${pal.id}_${frame}`, () => sprite(16, 14, g => {
    ell(g, 1, 2, 14, 11, pal.dark); ell(g, 2, 2, 12, 9, pal.body);
    ell(g, 3, 1, 9, 5, pal.moss);
    R(g, 5, 6, 6, 3, '#140e18'); R(g, 6 + (frame % 2), 6, 3, 3, pal.eye);
    // little wings / shards
    if (frame % 2) { R(g, 0, 4, 2, 2, pal.moss2); R(g, 14, 4, 2, 2, pal.moss2); }
    else { R(g, 0, 6, 2, 2, pal.moss2); R(g, 14, 6, 2, 2, pal.moss2); }
  }));
}
function bossSprite(pal, frame, hurt) {
  return cached(`boss_${pal.id}_${frame}`, () => sprite(72, 60, g => {
    // shoulders / base
    ell(g, 2, 22, 68, 38, pal.dark); ell(g, 5, 22, 62, 34, pal.body);
    for (let i = 0; i < 6; i++) R(g, 10 + i * 9, 40 + (i % 2) * 3, 6, 2, pal.dark);
    // head
    ell(g, 14, 4, 44, 36, pal.dark); ell(g, 16, 4, 40, 33, pal.body);
    // moss cap and drips
    ell(g, 10, 0, 52, 20, pal.moss); ell(g, 16, 1, 30, 8, pal.moss2);
    [[14, 15, 4], [20, 16, 7], [30, 17, 4], [44, 16, 6], [53, 14, 5], [8, 22, 8], [60, 24, 10], [4, 30, 6]].forEach(([x, y, h]) => R(g, x, y, 3, h, pal.moss));
    // eye socket
    ell(g, 26, 18, 20, 12, '#120b16');
    const open = frame === 1;
    if (open) { ell(g, 29, 20, 14, 8, pal.eye); ell(g, 33, 22, 6, 4, '#ffffff'); }
    else { R(g, 29, 24, 14, 2, shade(pal.eye, -0.3)); }
    // mouth crack
    R(g, 28, 33, 16, 2, '#120b16'); for (let i = 0; i < 4; i++) R(g, 29 + i * 4, 31, 2, 2, pal.dark);
  }));
}
function fistSprite(pal) {
  return cached(`fist_${pal.id}`, () => sprite(22, 20, g => {
    ell(g, 0, 2, 22, 18, pal.dark); ell(g, 1, 2, 20, 15, pal.body);
    ell(g, 2, 0, 18, 8, pal.moss); R(g, 5, 7, 2, 3, pal.moss); R(g, 13, 7, 2, 4, pal.moss);
    for (let i = 0; i < 3; i++) R(g, 5 + i * 5, 14, 3, 2, pal.dark);
  }));
}

// ---------------------------------------------------------------- props
function tableSprite() {
  // wooden display table with a lace-edged cream cloth
  return cached('table', () => sprite(26, 18, g => {
    R(g, 2, 10, 3, 8, '#5a2a18'); R(g, 21, 10, 3, 8, '#5a2a18'); R(g, 3, 10, 1, 8, '#7a3e22');
    R(g, 0, 3, 26, 9, '#8a4226'); R(g, 0, 3, 26, 2, '#b8663a'); R(g, 0, 11, 26, 2, '#5a2a18');
    R(g, 2, 3, 22, 7, '#f0e2c0'); R(g, 2, 3, 22, 1, '#fff6e0'); R(g, 2, 9, 22, 1, '#d8c498');
    for (let i = 2; i < 24; i += 3) { P(g, i, 10, '#f0e2c0'); P(g, i + 1, 11, '#f0e2c0'); }
  }, '#2a1208'));
}
function chestSprite(open, fancy) {
  return cached(`chest_${open}_${fancy}`, () => sprite(20, 16, g => {
    const body = fancy ? '#5a6a4a' : C.wood, dark = fancy ? '#3a4a30' : C.wood2, band = fancy ? '#e0b848' : '#6a6070';
    R(g, 0, 6, 20, 10, dark); R(g, 1, 6, 18, 9, body);
    if (open) { R(g, 0, 0, 20, 5, dark); R(g, 1, 1, 18, 3, body); R(g, 2, 5, 16, 3, '#140c10'); R(g, 5, 6, 10, 2, '#f8e070'); }
    else { R(g, 0, 1, 20, 6, dark); R(g, 1, 1, 18, 5, body); R(g, 1, 1, 18, 1, shade(body, 0.25)); }
    R(g, 3, open ? 0 : 1, 2, 15, band); R(g, 15, open ? 0 : 1, 2, 15, band);
    R(g, 8, 7, 4, 4, band); P(g, 9, 8, '#140c10');
  }));
}
function barrelSprite() {
  return cached('barrel', () => sprite(12, 14, g => {
    R(g, 0, 1, 12, 13, C.wood2); R(g, 1, 0, 10, 14, C.wood); R(g, 3, 0, 2, 14, C.wood3);
    R(g, 0, 3, 12, 1, '#5a4a52'); R(g, 0, 10, 12, 1, '#5a4a52'); ell(g, 1, 0, 10, 3, C.wood4);
  }));
}
function crateSprite() {
  return cached('crate', () => sprite(14, 14, g => {
    R(g, 0, 0, 14, 14, C.wood2); R(g, 1, 1, 12, 12, C.wood); R(g, 1, 1, 12, 2, C.wood3);
    line(g, 2, 3, 11, 12, C.wood2); line(g, 11, 3, 2, 12, C.wood2);
  }));
}
function lampSprite(lit) {
  return cached('lamp' + lit, () => sprite(8, 30, g => {
    R(g, 3, 6, 2, 22, '#3a3440'); R(g, 1, 27, 6, 3, '#3a3440');
    R(g, 1, 0, 6, 7, '#3a3440'); R(g, 2, 1, 4, 5, lit ? '#ffe28a' : '#6a6a50'); R(g, 0, 0, 8, 1, '#3a3440');
  }));
}
// autumn trees (orange / gold / green / rust), lit from the top-left
const TREE_PALS = [
  ['#7a2c10', '#c0521a', '#e8842c', '#ffbe58'],
  ['#8a5a0c', '#c8901a', '#eebc3a', '#fff08a'],
  ['#264a1e', '#3e7428', '#5e9a34', '#98c850'],
  ['#6a2412', '#a8381a', '#d85a26', '#ff9448'],
];
function treeSprite(v) {
  return cached(`tree_${v}`, () => {
    const P4 = TREE_PALS[v % 4], rng = mulberry32(31 + v * 7);
    return sprite(50, 60, g => {
      // trunk and roots
      R(g, 21, 36, 8, 22, '#5a3220'); R(g, 21, 36, 2, 22, '#7c4a2c'); R(g, 27, 38, 2, 20, '#452616');
      R(g, 16, 56, 18, 3, '#5a3220'); R(g, 13, 57, 5, 2, '#4a2a18'); R(g, 32, 57, 5, 2, '#4a2a18');
      thickLine(g, 25, 40, 14, 30, 3, '#5a3220'); thickLine(g, 25, 38, 36, 28, 3, '#5a3220');
      const cl = [[25, 26, 21], [11, 28, 11], [39, 28, 11], [17, 15, 13], [33, 15, 13], [25, 8, 12], [25, 32, 13]];
      for (const [x, y, r] of cl) ell(g, x - r, y - r * 0.85 + 3, r * 2, r * 1.7, P4[0]);
      for (const [x, y, r] of cl) ell(g, x - r + 1, y - r * 0.85 + 1, r * 2 - 3, r * 1.7 - 4, P4[1]);
      for (const [x, y, r] of cl) ell(g, x - r + 2, y - r * 0.85 + 1, r * 1.35, r * 1.05, P4[2]);
      for (const [x, y, r] of cl.slice(3)) ell(g, x - r + 4, y - r * 0.85 + 2, r * 0.7, r * 0.45, P4[3]);
      // leaf texture
      for (let i = 0; i < 90; i++) { const x = 4 + rng() * 42, y = 2 + rng() * 38; P(g, x, y, rng() < 0.55 ? P4[0] : P4[2]); }
      for (let i = 0; i < 25; i++) { const x = 8 + rng() * 26, y = 3 + rng() * 18; P(g, x, y, P4[3]); }
    }, '#2a1408');
  });
}
function bushSprite(v) {
  return cached('bush' + v, () => sprite(18, 13, g => {
    const P4 = v === 1 ? TREE_PALS[0] : TREE_PALS[2];
    ell(g, 0, 3, 18, 10, P4[0]); ell(g, 1, 1, 15, 9, P4[1]); ell(g, 3, 1, 8, 5, P4[2]); P(g, 5, 2, P4[3]); P(g, 6, 2, P4[3]);
    if (v === 1) { P(g, 4, 6, '#ffe070'); P(g, 11, 5, '#ffe070'); P(g, 8, 8, '#ffe070'); }
  }, '#2a1408'));
}
// tall golden grass patch you can walk through
function tallGrassSprite(v) {
  return cached('tgrass' + v, () => sprite(44, 22, g => {
    const rng = mulberry32(5 + v * 13);
    const hs = []; for (let x = 0; x < 44; x++) hs.push(10 + Math.round(Math.sin(x * 0.35 + v) * 3 + rng() * 5 - (x < 3 || x > 40 ? 6 : 0)));
    for (let x = 0; x < 44; x++) {
      const h = Math.max(2, hs[x]);
      R(g, x, 22 - h, 1, h, '#e2a82a');
      R(g, x, 22 - Math.min(h, 5), 1, Math.min(h, 5), '#b8781a');
      if (rng() < 0.45) R(g, x, 22 - h, 1, 3, '#f8d860');
      if (rng() < 0.12) R(g, x, 22 - h - 2, 1, 2, '#fff0a0');
      if (rng() < 0.15) R(g, x, 22 - h + 4, 1, 5, '#c88a20');
    }
  }, '#6a4210'));
}
function stumpSprite() {
  return cached('stump', () => sprite(18, 14, g => {
    R(g, 2, 5, 14, 8, '#6a3e22'); R(g, 2, 5, 3, 8, '#865232'); R(g, 13, 6, 3, 7, '#4a2a16');
    ell(g, 1, 1, 16, 8, '#c8905a'); ell(g, 4, 3, 10, 4, '#a86e3c'); ell(g, 6, 4, 6, 2, '#c8905a'); P(g, 9, 4, '#8a5a2e');
    R(g, 0, 11, 4, 2, '#6a3e22'); R(g, 14, 12, 4, 1, '#6a3e22');
  }, '#2a1408'));
}
function rockSprite(pal, v = 0) {
  return cached(`rock_${pal.id}_${v}`, () => sprite(16, 15, g => {
    ell(g, 0, 3, 16, 12, pal.rock2); ell(g, 1, 2, 14, 10, pal.rock); ell(g, 3, 3, 7, 4, pal.rock3);
    if (v === 1) { R(g, 2, 2, 3, 4, pal.moss || pal.rock3); }
  }));
}
function potSprite(pal) {
  return cached(`pot_${pal.id}`, () => sprite(12, 13, g => {
    ell(g, 0, 3, 12, 10, pal.pot2); ell(g, 1, 3, 10, 8, pal.pot); R(g, 3, 0, 6, 3, pal.pot2); R(g, 4, 0, 4, 2, '#140c10'); R(g, 2, 3, 2, 3, shade(pal.pot, 0.3));
  }));
}
function registerSprite() {
  return cached('register', () => sprite(20, 16, g => {
    R(g, 2, 6, 16, 10, '#6a5a50'); R(g, 3, 7, 14, 8, '#8a7a6a'); R(g, 4, 0, 12, 7, '#b09060'); R(g, 5, 1, 10, 3, '#2a3a2a');
    R(g, 6, 2, 8, 1, '#7de6ae'); for (let i = 0; i < 4; i++) R(g, 5 + i * 3, 9, 2, 2, '#e8dcc0');
  }));
}
function bedSprite() {
  return cached('bed', () => sprite(22, 30, g => {
    R(g, 0, 0, 22, 30, C.wood2); R(g, 1, 1, 20, 28, C.wood);
    R(g, 2, 3, 18, 6, '#f0ead8'); R(g, 2, 10, 18, 18, '#3fae8f'); R(g, 2, 10, 18, 2, '#7de6ae');
    for (let i = 0; i < 3; i++) R(g, 3 + i * 6, 14, 4, 12, '#2f8f74');
  }));
}
function cauldronSprite(pal) {
  return cached('cauldron', () => sprite(26, 20, g => {
    ell(g, 0, 3, 26, 17, '#3a2a3a'); ell(g, 1, 3, 24, 15, '#5a3a5a'); ell(g, 3, 1, 20, 6, '#2a1a2a'); ell(g, 4, 2, 18, 4, '#d86a4a');
    R(g, 3, 10, 20, 2, '#8a5a8a');
  }));
}
function anvilSprite() {
  return cached('anvil', () => sprite(22, 14, g => {
    R(g, 0, 0, 22, 4, '#4a4a58'); R(g, 1, 0, 20, 2, '#8a8a9a'); R(g, 6, 4, 10, 4, '#3a3a48'); R(g, 3, 8, 16, 6, '#3a3a48'); R(g, 3, 8, 16, 1, '#6a6a7a');
  }));
}
function signSprite(col = C.wood) {
  return cached('sign' + col, () => sprite(16, 18, g => {
    R(g, 7, 8, 2, 10, C.wood2); R(g, 0, 0, 16, 10, C.wood2); R(g, 1, 1, 14, 8, col); R(g, 3, 3, 10, 1, C.wood2); R(g, 3, 6, 8, 1, C.wood2);
  }));
}
function wellSprite() {
  return cached('well', () => sprite(26, 30, g => {
    R(g, 3, 4, 2, 16, C.wood2); R(g, 21, 4, 2, 16, C.wood2); R(g, 0, 0, 26, 6, '#8a3a2a'); R(g, 1, 1, 24, 3, '#b04a38');
    ell(g, 1, 14, 24, 16, '#6a6a78'); ell(g, 3, 15, 20, 9, '#3a3a48'); ell(g, 5, 16, 16, 6, '#2a4a8a');
    R(g, 12, 6, 2, 10, '#c8b890');
  }));
}
function fenceSprite() {
  return cached('fence', () => sprite(16, 12, g => {
    R(g, 1, 0, 3, 12, C.wood2); R(g, 12, 0, 3, 12, C.wood2); R(g, 0, 3, 16, 2, C.wood); R(g, 0, 8, 16, 2, C.wood);
  }));
}

// ---------------------------------------------------------------- portraits (bigger art for shop UIs & dialogue)
function smithPortrait() {
  if (TOWNSFOLK.ready) return refPortrait(13);
  return cached('smithP', () => sprite(64, 84, g => {
    const skin = '#e8b88a', skin2 = '#c8906a', beard = '#6a4028', beard2 = '#4a2a18', shirt = '#d8723a', apron = '#5e7a3e', apron2 = '#4a6030';
    // legs & boots
    R(g, 18, 66, 10, 12, '#4a3a4a'); R(g, 36, 66, 10, 12, '#4a3a4a'); R(g, 15, 76, 15, 7, '#3a2a22'); R(g, 34, 76, 15, 7, '#3a2a22');
    // body
    ell(g, 6, 28, 52, 44, shirt); ell(g, 10, 30, 44, 40, shade(shirt, 0.1));
    R(g, 16, 38, 32, 32, apron); R(g, 16, 38, 32, 3, apron2); R(g, 20, 50, 24, 10, apron2); R(g, 22, 52, 20, 6, '#b8a070');
    // arms
    ell(g, 0, 34, 14, 30, shirt); ell(g, 50, 34, 14, 30, shirt); ell(g, 0, 58, 13, 11, skin); ell(g, 51, 56, 13, 11, skin);
    R(g, 2, 50, 10, 3, '#8a4a28'); R(g, 52, 50, 10, 3, '#8a4a28');
    // head
    ell(g, 16, 4, 32, 30, skin); R(g, 16, 8, 32, 6, '#3a2a28'); ell(g, 18, 0, 28, 10, '#3a2a28');
    R(g, 23, 16, 4, 3, '#1a1010'); R(g, 37, 16, 4, 3, '#1a1010'); R(g, 21, 13, 8, 2, beard2); R(g, 35, 13, 8, 2, beard2);
    ell(g, 29, 18, 7, 6, skin2);
    // beard
    ell(g, 14, 20, 36, 26, beard); ell(g, 20, 36, 24, 16, beard); ell(g, 24, 22, 16, 6, beard2); R(g, 28, 26, 8, 2, '#8a3a2a');
    R(g, 28, 48, 3, 5, beard2); R(g, 33, 48, 3, 5, beard2);
  }));
}
function witchPortrait() {
  if (TOWNSFOLK.ready) return refPortrait(14);
  return cached('witchP', () => sprite(60, 84, g => {
    const skin = '#f0c8a0', hair = '#6ad8a8', hair2 = '#46b088', cloak = '#b8485a', cloak2 = '#8a3044', dress = '#e0a040';
    // cloak back
    ell(g, 4, 20, 50, 60, cloak2); R(g, 6, 50, 46, 30, cloak2);
    // legs striped
    for (let i = 0; i < 6; i++) { R(g, 20, 64 + i * 3, 7, 2, '#3a8a9a'); R(g, 20, 66 + i * 3, 7, 1, '#e8e0d0'); R(g, 32, 64 + i * 3, 7, 2, '#3a8a9a'); R(g, 32, 66 + i * 3, 7, 1, '#e8e0d0'); }
    R(g, 17, 80, 11, 4, '#8a3a6a'); R(g, 31, 80, 11, 4, '#8a3a6a');
    // body
    R(g, 14, 36, 30, 30, dress); R(g, 14, 50, 30, 4, '#c87830'); R(g, 10, 34, 8, 30, cloak); R(g, 40, 34, 8, 30, cloak);
    // book
    R(g, 20, 42, 20, 12, '#6a3a2a'); R(g, 21, 42, 18, 10, '#f0e6d0'); R(g, 30, 42, 1, 10, '#b8a888');
    ell(g, 16, 46, 7, 6, skin); ell(g, 37, 46, 7, 6, skin);
    // head & hair
    ell(g, 8, 2, 42, 40, hair2); ell(g, 10, 0, 38, 34, hair);
    ell(g, 16, 10, 26, 24, skin);
    R(g, 14, 6, 30, 8, hair); R(g, 12, 12, 6, 20, hair); R(g, 40, 12, 6, 20, hair);
    // glasses
    R(g, 19, 18, 8, 6, '#3a2a2a'); R(g, 20, 19, 6, 4, '#c8e8f0'); R(g, 31, 18, 8, 6, '#3a2a2a'); R(g, 32, 19, 6, 4, '#c8e8f0'); R(g, 27, 20, 4, 1, '#3a2a2a');
    R(g, 22, 20, 2, 2, '#2a1a1a'); R(g, 34, 20, 2, 2, '#2a1a1a');
    R(g, 26, 28, 6, 1, '#b86a5a');
    // cat
    ell(g, 40, 66, 18, 12, '#5a5a66'); ell(g, 46, 58, 12, 11, '#5a5a66'); R(g, 47, 55, 3, 4, '#5a5a66'); R(g, 54, 55, 3, 4, '#5a5a66');
    R(g, 49, 62, 2, 2, '#e8d040'); R(g, 54, 62, 2, 2, '#e8d040'); R(g, 36, 70, 6, 3, '#5a5a66');
  }));
}
function elderPortrait() {
  if (TOWNSFOLK.ready) return refPortrait(8);
  return cached('elderP', () => sprite(40, 48, g => {
    const skin = '#f0c8a0', beard = '#f4f0e8', coat = '#5e7a3e';
    ell(g, 2, 26, 36, 24, coat); R(g, 30, 4, 3, 44, '#6a4a2a'); ell(g, 27, 0, 9, 7, '#3fae8f');
    ell(g, 8, 4, 22, 24, skin); ell(g, 7, 2, 24, 10, beard); R(g, 7, 6, 3, 10, beard); R(g, 28, 6, 3, 10, beard);
    R(g, 12, 12, 5, 2, beard); R(g, 21, 12, 5, 2, beard); R(g, 13, 15, 2, 2, '#2a1c1c'); R(g, 22, 15, 2, 2, '#2a1c1c');
    ell(g, 6, 18, 26, 22, beard); ell(g, 12, 18, 14, 5, skin); R(g, 15, 21, 8, 1, '#b8b0a0');
  }));
}
function mayorPortrait() {
  if (TOWNSFOLK.ready) return refPortrait(2);
  return cached('mayorP', () => sprite(40, 48, g => {
    ell(g, 2, 26, 36, 24, '#3a4a7a'); R(g, 16, 28, 8, 18, '#e8e0d0'); R(g, 18, 30, 4, 6, '#b8303a');
    ell(g, 8, 4, 24, 24, '#e8b890'); R(g, 6, 2, 28, 8, '#2a2a3a'); R(g, 10, -2, 20, 6, '#2a2a3a'); R(g, 6, 8, 28, 2, '#b8303a');
    R(g, 13, 15, 2, 2, '#2a1c1c'); R(g, 25, 15, 2, 2, '#2a1c1c'); R(g, 11, 20, 18, 3, '#7a5a3a'); R(g, 16, 24, 8, 1, '#a86a5a');
  }));
}

// ---------------------------------------------------------------- UI glyphs
function faceIcon(kind) { // 'ecstatic','content','expensive','angry','thinking'
  return cached('face_' + kind, () => sprite(12, 12, g => {
    const col = { ecstatic: '#7de6ae', content: '#a8e6c0', expensive: '#e8c870', angry: '#e86a5a', thinking: '#e8dcc0' }[kind];
    ell(g, 0, 0, 12, 12, col); ell(g, 2, 1, 5, 3, shade(col, 0.4));
    const d = '#2a1c1c';
    if (kind === 'ecstatic') { ell(g, 2, 3, 4, 4, '#f3c552'); ell(g, 7, 3, 4, 4, '#f3c552'); P(g, 3, 4, '#fff6d0'); P(g, 8, 4, '#fff6d0'); P(g, 3, 5, '#c98d2b'); P(g, 8, 5, '#c98d2b'); R(g, 3, 8, 6, 2, d); R(g, 4, 9, 4, 1, '#d84a3e'); }
    else if (kind === 'content') { R(g, 3, 4, 2, 2, d); R(g, 7, 4, 2, 2, d); P(g, 3, 7, d); R(g, 4, 8, 4, 1, d); P(g, 8, 7, d); }
    else if (kind === 'expensive') { R(g, 3, 4, 2, 2, d); R(g, 7, 4, 2, 2, d); R(g, 3, 8, 6, 1, d); P(g, 9, 3, '#5aa0e0'); P(g, 9, 4, '#5aa0e0'); }
    else if (kind === 'angry') { P(g, 2, 3, d); P(g, 3, 4, d); P(g, 9, 3, d); P(g, 8, 4, d); R(g, 3, 5, 2, 1, d); R(g, 7, 5, 2, 1, d); R(g, 4, 8, 4, 1, d); P(g, 3, 9, d); P(g, 8, 9, d); }
    else { R(g, 2, 5, 2, 2, d); R(g, 5, 5, 2, 2, d); R(g, 8, 5, 2, 2, d); }
  }));
}
function coinIcon() { return cached('coin', () => sprite(7, 7, g => { ell(g, 0, 0, 7, 7, C.gold2); ell(g, 0, 0, 6, 6, C.gold); R(g, 2, 1, 1, 3, '#fff6d0'); })); }
function heartIcon() { return cached('heart', () => fromRows(['.11.11.', '1221221', '1222221', '.12221.', '..121..', '...1...'], { 1: '#8a1a22', 2: '#e2453e' })); }
function statIcon(kind) {
  return cached('stat_' + kind, () => {
    if (kind === 'hp') return fromRows(['.44.44.', '4334334', '4333334', '.43334.', '..434..', '...4...'], { 3: '#fff', 4: '#fff' }, null);
    if (kind === 'dmg') return fromRows(['.....44', '....444', '...444.', '4.444..', '.444...', '.44....', '4..4...'], { 4: '#fff' }, null);
    if (kind === 'def') return fromRows(['4444444', '4444444', '4444444', '.44444.', '.44444.', '..444..', '...4...'], { 4: '#fff' }, null);
    return fromRows(['..44...', '..44...', '..44...', '..4444.', '444444.', '4444444', '.......'], { 4: '#fff' }, null);
  });
}
function bagBadge() {
  return cached('bagBadge', () => sprite(20, 20, g => {
    ell(g, 0, 0, 20, 20, '#e8dcc0'); ell(g, 1, 1, 18, 18, '#f4ecd6');
    R(g, 6, 6, 8, 9, '#7a4a2a'); R(g, 5, 8, 10, 6, '#9a653b'); R(g, 7, 4, 6, 3, '#7a4a2a'); R(g, 8, 10, 4, 2, '#e8c060');
  }));
}
function swirlIcon(flip) {
  return cached('swirl' + flip, () => {
    const c = fromRows(['.2222..', '2....2.', '2.22..2', '2.2.2.2', '2..2..2', '.2...2.', '..222..'], { 2: C.mint }, null);
    return flip ? flipH(c) : c;
  });
}
function skullIcon(col) {
  return cached('skull' + col, () => fromRows(['..2222..', '.222222.', '22222222', '21122112', '21122112', '22222222', '.22..22.', '.2.22.2.', '..2..2..'], { 1: '#2a1c1c', 2: col }));
}
function keyIcon(col) {
  return cached('key' + col, () => fromRows(['.222......', '2..2222222', '2..2...2.2', '.222......'], { 2: col }));
}

// ---------------------------------------------------------------- dark-fantasy foes (critters, eyes, brutes, rune stones, haunted tree)
function thickLine(g, x0, y0, x1, y1, w, c) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  g.fillStyle = c;
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, ww = Math.max(1, Math.round(w * (1 - t * 0.6))); g.fillRect(Math.round(x - ww / 2), Math.round(y - ww / 2), ww, ww); }
}
// furry black blob with glowing eyes and a toothy grin
function critterSprite(f, frame, size = 1) {
  return cached(`critter_${f.id}_${frame}_${size}`, () => {
    const s = size;
    return sprite(16 * s + 2, 15 * s + 2, g => {
      g.translate(1, 1);
      const k = frame % 3;
      let ex = s, ey = 2 * s, ew = 14 * s, eh = 12 * s;
      if (k === 1) { ex = 0; ey = 4 * s; ew = 16 * s; eh = 10 * s; }
      if (k === 2) { ex = 2 * s; ey = 0; ew = 12 * s; eh = 14 * s; }
      ell(g, ex, ey, ew, eh, f.fur);
      const r = mulberry32(11 + s * 7 + k);
      const n = 26 * s;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, len = 0.5 + r() * 1.6 * s;
        const px = ex + ew / 2 + Math.cos(a) * (ew / 2 + len), py = ey + eh / 2 + Math.sin(a) * (eh / 2 + len);
        if (r() < 0.7) P(g, px, py, f.fur);
      }
      for (let i = 0; i < 10 * s; i++) { const a = -Math.PI * (0.25 + r() * 0.5), d = r() * 0.8; P(g, ex + ew / 2 + Math.cos(a) * ew / 2 * d - 2 * s, ey + eh / 2 + Math.sin(a) * eh / 2 * d, f.fur2); }
      const cy = Math.round(ey + eh * 0.36);
      R(g, ex + ew * 0.26, cy, 2 * s, 2 * s, f.eye); R(g, ex + ew * 0.62, cy, 2 * s, 2 * s, f.eye);
      const my = Math.round(ey + eh * 0.6), mx = Math.round(ex + ew * 0.24), mw = Math.round(ew * 0.52);
      R(g, mx, my, mw, 3 * s, '#07050a');
      for (let i = 0; i < mw; i += 2 * s) { R(g, mx + i, my, s, s, f.teeth); R(g, mx + i + s, my + 2 * s, s, s, f.teeth); }
    }, '#07050a');
  });
}
// floating one-eyed blood blob with little horns
function eyeBlobSprite(f, frame) {
  return cached(`eyeblob_${f.id}_${frame}`, () => sprite(14, 17, g => {
    R(g, 2, 1, 2, 3, f.blob2); P(g, 1, 0, f.blob2); R(g, 10, 1, 2, 3, f.blob2); P(g, 12, 0, f.blob2);
    ell(g, 0, 2, 14, 12, f.blob2); ell(g, 1, 2, 12, 10, f.blob); ell(g, 3, 3, 4, 3, shade(f.blob, 0.3));
    R(g, 5, 13, 2, 2 + (frame % 2), f.blob2); R(g, 8, 13, 1, 1 + ((frame + 1) % 2), f.blob2);
    ell(g, 4, 5, 6, 6, '#f4ecdc'); R(g, 5 + (frame >> 1) % 2, 7, 3, 3, '#1a0a10'); P(g, 6 + (frame >> 1) % 2, 7, '#ffffff');
  }, '#1a0610'));
}
// horned hooded brute carrying a double axe
function bruteSprite(f, frame, pose = 'walk') {
  return cached(`brute_${f.id}_${frame}_${pose}`, () => {
    const leg = pose === 'walk' ? [0, 1, 0, -1][frame % 4] : 0;
    return sprite(24, 26, g => {
      g.translate(1, 1);
      R(g, 7, 19 - (leg > 0 ? 1 : 0), 3, 5, f.brute2); R(g, 12, 19 - (leg < 0 ? 1 : 0), 3, 5, f.brute2);
      R(g, 6, 22 - (leg > 0 ? 1 : 0), 4, 2, '#1a0e0a'); R(g, 12, 22 - (leg < 0 ? 1 : 0), 4, 2, '#1a0e0a');
      ell(g, 2, 8, 18, 14, f.brute2); ell(g, 3, 8, 16, 12, f.brute); ell(g, 7, 12, 8, 7, shade(f.brute, 0.12));
      R(g, 4, 17, 14, 2, '#2a1a10'); P(g, 10, 17, '#c8a040');
      // hood + face + horns
      ell(g, 6, 1, 10, 10, f.brute2); ell(g, 7, 1, 8, 9, f.brute);
      R(g, 8, 5, 6, 4, f.skin); R(g, 8, 5, 6, 1, shade(f.skin, -0.3)); P(g, 9, 6, '#1a0a0a'); P(g, 12, 6, '#1a0a0a'); R(g, 9, 8, 4, 1, shade(f.skin, -0.35));
      R(g, 5, 0, 2, 3, '#e8e0d0'); P(g, 4, -1, '#e8e0d0'); R(g, 15, 0, 2, 3, '#e8e0d0'); P(g, 17, -1, '#e8e0d0');
      const axe = (hx, hy, vert, flip) => {
        if (vert) { R(g, hx, hy, 1, 14, '#6a4a2a'); ell(g, hx - 5, hy, 5, 7, f.axe); ell(g, hx + 1, hy, 5, 7, f.axe); R(g, hx - 4, hy + 3, 10, 1, shade(f.axe, -0.3)); }
        else { R(g, hx, hy, 14, 1, '#6a4a2a'); ell(g, hx + (flip ? 0 : 9), hy - 5, 7, 5, f.axe); ell(g, hx + (flip ? 0 : 9), hy + 1, 7, 5, f.axe); }
      };
      if (pose === 'wind') { R(g, 0, 5, 3, 8, f.brute); R(g, 19, 3, 3, 8, f.brute); axe(3, -1, false, false); }
      else if (pose === 'slash') { R(g, 2, 12, 3, 7, f.brute); R(g, 17, 13, 3, 7, f.brute); axe(10, 18, true); }
      else { R(g, 0, 11 + (leg > 0 ? 1 : 0), 3, 7, f.brute); R(g, 19, 11 + (leg < 0 ? 1 : 0), 3, 7, f.brute); axe(21, 3 + (leg < 0 ? 1 : 0), true); }
    }, '#140a08');
  });
}
// tombstone / obelisk with a glowing rune that fires bolts
function runeStoneSprite(f, frame) {
  return cached(`runestone_${f.id}_${frame}`, () => sprite(14, 20, g => {
    R(g, 0, 17, 14, 3, f.stone2); ell(g, 1, 0, 12, 9, f.stone); R(g, 1, 4, 12, 14, f.stone);
    R(g, 11, 4, 2, 14, f.stone2); R(g, 2, 2, 3, 1, shade(f.stone, 0.25)); R(g, 3, 10, 2, 1, f.stone2); R(g, 8, 14, 3, 1, f.stone2);
    const c = frame === 1 ? '#ffffff' : f.rune;
    R(g, 6, 4, 2, 9, c); R(g, 4, 6, 6, 1, c); R(g, 4, 10, 2, 1, c); R(g, 8, 10, 2, 1, c);
    if (frame === 1) { R(g, 5, 3, 4, 1, f.rune); R(g, 3, 7, 1, 3, f.rune); R(g, 10, 7, 1, 3, f.rune); }
  }, '#120e14'));
}
// the haunted tree guardian: gnarled branches, glowing slit eyes
function hauntedTreeSprite(f, frame) {
  return cached(`htree_${f.id}_${frame}`, () => sprite(80, 70, g => {
    const T = f.tree, T2 = f.tree2;
    [[40, 30, 6, 6], [40, 28, 18, 2], [40, 30, 74, 10], [40, 32, 2, 18], [40, 26, 56, 0], [40, 26, 24, 0], [40, 34, 78, 26]].forEach(([a, b, c, d]) => thickLine(g, a, b, c, d, 5, T));
    [[18, 5, 12, 0], [60, 3, 66, 0], [10, 12, 4, 8], [70, 12, 78, 4], [26, 2, 30, -2], [8, 18, 0, 20]].forEach(([a, b, c, d]) => thickLine(g, a, b, c, d, 2, T));
    thickLine(g, 32, 60, 10, 68, 5, T); thickLine(g, 48, 60, 70, 68, 5, T); thickLine(g, 40, 62, 40, 70, 4, T); thickLine(g, 36, 60, 22, 70, 3, T);
    ell(g, 26, 18, 28, 36, T); R(g, 28, 34, 24, 28, T);
    for (let i = 0; i < 6; i++) R(g, 29 + i * 4, 22 + (i % 2) * 6, 1, 30, T2);
    ell(g, 30, 20, 8, 6, T2);
    const e = f.rune;
    if (frame === 1) { R(g, 30, 34, 7, 2, e); P(g, 31, 33, e); P(g, 36, 36, e); R(g, 43, 34, 7, 2, e); P(g, 49, 33, e); P(g, 43, 36, e); }
    else { R(g, 31, 35, 5, 1, shade(e, -0.4)); R(g, 44, 35, 5, 1, shade(e, -0.4)); }
    ell(g, 34, 42, 12, 10, '#07050a'); for (let i = 0; i < 3; i++) P(g, 36 + i * 3, 42, '#c8c0b0');
  }, '#07050a'));
}
function rootClawSprite(f) {
  return cached(`rootclaw_${f.id}`, () => sprite(24, 22, g => {
    thickLine(g, 12, 0, 12, 12, 6, f.tree);
    [[12, 10, 3, 20], [12, 10, 12, 21], [12, 10, 21, 20]].forEach(([a, b, c, d]) => thickLine(g, a, b, c, d, 4, f.tree));
    R(g, 2, 19, 3, 2, f.rune); R(g, 11, 20, 3, 2, f.rune); R(g, 20, 19, 3, 2, f.rune);
    R(g, 10, 2, 1, 8, f.tree2);
  }, '#07050a'));
}
function candleGrave(g, x, y, f, v) {
  // small tombstone with a candle (static part); flame drawn live
  if (v === 0) { ell(g, x - 6, y - 16, 12, 8, f.stone); R(g, x - 6, y - 12, 12, 12, f.stone); R(g, x + 4, y - 12, 2, 12, f.stone2); R(g, x - 3, y - 10, 6, 1, f.stone2); R(g, x - 3, y - 7, 5, 1, f.stone2); R(g, x - 7, y, 14, 2, f.stone2); }
  else { R(g, x - 1, y - 16, 2, 16, f.stone); R(g, x - 5, y - 12, 10, 2, f.stone); R(g, x - 4, y, 8, 2, f.stone2); }
  R(g, x - 1, y - 3, 3, 4, '#e8e0c8');
}
