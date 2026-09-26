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

// ---------------------------------------------------------------- hero
const HERO_COL = {
  hair: '#f1ece2', hair2: '#c7bdb2', skin: '#f1c49a', skin2: '#d49a70', eye: '#2a1c1c',
  shirt: '#4a7fc2', shirt2: '#34609a', scarf: '#d9543f', pants: '#5a4634', boot: '#3a2a22',
  pack: '#9a653b', pack2: '#6e4427', packL: '#c08650', roll: '#e8d8b2', roll2: '#c4b088', belt: '#6b4a2a', buckle: '#e8c060',
};
// dir: 0 down, 1 up, 2 left, 3 right. frame 0..3 walk. pose: 'idle'|'walk'|'attack'
function heroSprite(dir, frame, pose = 'walk') {
  const key = `hero_${dir}_${frame}_${pose}`;
  return cached(key, () => {
    if (dir === 3) return flipH(heroSprite(2, frame, pose));
    const K = HERO_COL;
    const leg = pose === 'walk' ? [0, 1, 0, -1][frame % 4] : 0;
    const bob = pose === 'walk' && (frame % 2 === 1) ? 1 : 0;
    return sprite(20, 24, g => {
      if (dir === 0) {
        // pack behind (sides visible)
        R(g, 3, 6 + bob, 14, 12, K.pack2); R(g, 4, 7 + bob, 12, 10, K.pack);
        R(g, 4, 1 + bob, 12, 4, K.roll); R(g, 4, 4 + bob, 12, 1, K.roll2); R(g, 6, 1 + bob, 1, 4, K.pack2); R(g, 13, 1 + bob, 1, 4, K.pack2);
        // legs
        R(g, 7, 18 - (leg > 0 ? 1 : 0), 2, 4, K.pants); R(g, 7, 21 - (leg > 0 ? 1 : 0), 2, 2, K.boot);
        R(g, 11, 18 - (leg < 0 ? 1 : 0), 2, 4, K.pants); R(g, 11, 21 - (leg < 0 ? 1 : 0), 2, 2, K.boot);
        // torso
        R(g, 6, 12 + bob, 8, 6, K.shirt); R(g, 6, 16 + bob, 8, 1, K.shirt2); R(g, 6, 17 + bob, 8, 1, K.belt); P(g, 10, 17 + bob, K.buckle);
        R(g, 6, 12 + bob, 8, 2, K.scarf); R(g, 12, 14 + bob, 1, 2, K.scarf);
        // arms
        const aL = pose === 'attack' ? -2 : leg, aR = pose === 'attack' ? 0 : -leg;
        R(g, 4, 12 + bob + (aL > 0 ? 1 : 0), 2, 5, K.shirt); R(g, 4, 17 + bob + (aL > 0 ? 1 : 0), 2, 1, K.skin);
        R(g, 14, 12 + bob + (aR > 0 ? 1 : 0), 2, 5, K.shirt); R(g, 14, 17 + bob + (aR > 0 ? 1 : 0), 2, 1, K.skin);
        // head
        R(g, 5, 7 + bob, 10, 5, K.skin); R(g, 5, 11 + bob, 10, 1, K.skin2);
        R(g, 5, 3 + bob, 10, 4, K.hair); P(g, 4, 5 + bob, K.hair); P(g, 4, 6 + bob, K.hair); P(g, 15, 5 + bob, K.hair); P(g, 15, 6 + bob, K.hair); P(g, 4, 7 + bob, K.hair); P(g, 15, 7 + bob, K.hair);
        P(g, 6, 2 + bob, K.hair); P(g, 8, 1 + bob, K.hair); P(g, 8, 2 + bob, K.hair); P(g, 11, 2 + bob, K.hair); P(g, 13, 2 + bob, K.hair);
        R(g, 5, 6 + bob, 10, 1, K.hair2);
        R(g, 6, 7 + bob, 2, 1, K.hair); R(g, 10, 7 + bob, 3, 1, K.hair); P(g, 5, 8 + bob, K.hair); P(g, 14, 8 + bob, K.hair);
        R(g, 7, 9 + bob, 1, 2, K.eye); R(g, 12, 9 + bob, 1, 2, K.eye);
        P(g, 6, 10 + bob, '#f0a090'); P(g, 13, 10 + bob, '#f0a090');
      } else if (dir === 1) {
        R(g, 7, 18 - (leg > 0 ? 1 : 0), 2, 4, K.pants); R(g, 7, 21 - (leg > 0 ? 1 : 0), 2, 2, K.boot);
        R(g, 11, 18 - (leg < 0 ? 1 : 0), 2, 4, K.pants); R(g, 11, 21 - (leg < 0 ? 1 : 0), 2, 2, K.boot);
        R(g, 3, 12 + bob + (leg > 0 ? 1 : 0), 2, 5, K.shirt); R(g, 15, 12 + bob + (leg < 0 ? 1 : 0), 2, 5, K.shirt);
        // head/hair behind the pack
        R(g, 5, 3 + bob, 10, 6, K.hair); P(g, 4, 5 + bob, K.hair); P(g, 15, 5 + bob, K.hair); P(g, 7, 2 + bob, K.hair); P(g, 10, 1 + bob, K.hair); P(g, 12, 2 + bob, K.hair);
        R(g, 5, 7 + bob, 10, 1, K.hair2);
        // the big pack
        R(g, 3, 7 + bob, 14, 12, K.pack); R(g, 3, 17 + bob, 14, 2, K.pack2); R(g, 15, 8 + bob, 2, 10, K.pack2);
        R(g, 5, 9 + bob, 10, 5, K.packL); R(g, 5, 14 + bob, 10, 1, K.pack2); R(g, 9, 13 + bob, 2, 2, K.buckle);
        R(g, 3, 4 + bob, 14, 4, K.roll); R(g, 3, 7 + bob, 14, 1, K.roll2); R(g, 6, 4 + bob, 1, 4, K.pack2); R(g, 13, 4 + bob, 1, 4, K.pack2);
      } else {
        // side (facing left); pack on the right side
        const s1 = leg, s2 = -leg;
        R(g, 7 + s1, 18, 2, 4, K.pants); R(g, 6 + s1, 21, 3, 2, K.boot);
        R(g, 10 + s2, 18, 2, 4, K.pants); R(g, 9 + s2, 21, 3, 2, K.boot);
        R(g, 11, 5 + bob, 7, 13, K.pack); R(g, 16, 6 + bob, 2, 11, K.pack2); R(g, 12, 9 + bob, 4, 5, K.packL); P(g, 13, 13 + bob, K.buckle);
        ell(g, 10, 1 + bob, 9, 6, K.roll); R(g, 11, 5 + bob, 7, 1, K.roll2);
        R(g, 6, 12 + bob, 6, 6, K.shirt); R(g, 6, 16 + bob, 6, 1, K.shirt2); R(g, 6, 17 + bob, 6, 1, K.belt);
        R(g, 6, 12 + bob, 6, 2, K.scarf); R(g, 11, 13 + bob, 2, 2, K.scarf);
        // head
        R(g, 4, 7 + bob, 8, 5, K.skin); P(g, 3, 9 + bob, K.skin); R(g, 4, 11 + bob, 8, 1, K.skin2);
        R(g, 4, 3 + bob, 9, 4, K.hair); R(g, 9, 5 + bob, 4, 5, K.hair); P(g, 3, 5 + bob, K.hair); P(g, 3, 6 + bob, K.hair); P(g, 3, 7 + bob, K.hair);
        P(g, 5, 2 + bob, K.hair); P(g, 8, 1 + bob, K.hair); P(g, 8, 2 + bob, K.hair); P(g, 11, 2 + bob, K.hair); R(g, 4, 6 + bob, 9, 1, K.hair2);
        R(g, 5, 9 + bob, 1, 2, K.eye); P(g, 4, 10 + bob, '#f0a090');
        // arm
        if (pose === 'attack') { R(g, 2, 13 + bob, 5, 2, K.shirt); R(g, 1, 13 + bob, 1, 2, K.skin); }
        else { const a = -leg; R(g, 7 + a, 13 + bob, 2, 4, K.shirt); R(g, 7 + a, 17 + bob, 2, 1, K.skin); }
      }
    });
  });
}
function heroRoll(frame) {
  return cached('heroroll_' + frame, () => {
    const K = HERO_COL;
    return sprite(18, 18, g => {
      ell(g, 1, 3, 16, 14, K.pack); ell(g, 3, 5, 12, 10, K.packL);
      const a = frame * Math.PI / 2;
      const hx = 9 + Math.cos(a) * 5, hy = 10 + Math.sin(a) * 5;
      ell(g, hx - 3, hy - 3, 6, 6, K.hair);
      const bx = 9 + Math.cos(a + Math.PI) * 5, by = 10 + Math.sin(a + Math.PI) * 5;
      R(g, bx - 2, by - 1, 4, 3, K.boot);
      const rx = 9 + Math.cos(a + Math.PI / 2) * 5, ry = 10 + Math.sin(a + Math.PI / 2) * 5;
      ell(g, rx - 3, ry - 2, 6, 4, K.roll);
    });
  });
}
// large hero portrait (inventory page)
function heroPortrait() {
  return cached('heroPortrait', () => {
    const K = HERO_COL;
    return sprite(40, 46, g => {
      // pack
      ell(g, 12, 6, 28, 30, K.pack2); ell(g, 13, 7, 25, 27, K.pack); ell(g, 17, 10, 16, 18, K.packL);
      ell(g, 14, 0, 24, 11, K.roll); R(g, 16, 8, 20, 2, K.roll2); R(g, 20, 1, 2, 9, K.pack2); R(g, 31, 1, 2, 9, K.pack2);
      R(g, 23, 20, 4, 3, K.buckle);
      // legs
      R(g, 12, 36, 5, 7, K.pants); R(g, 19, 36, 5, 7, K.pants); R(g, 11, 42, 7, 3, K.boot); R(g, 18, 42, 7, 3, K.boot);
      // body
      R(g, 9, 24, 17, 13, K.shirt); R(g, 9, 33, 17, 2, K.shirt2); R(g, 9, 35, 17, 2, K.belt); R(g, 16, 35, 3, 2, K.buckle);
      R(g, 9, 24, 17, 4, K.scarf); R(g, 20, 27, 3, 5, K.scarf);
      R(g, 5, 25, 4, 10, K.shirt); R(g, 5, 35, 4, 2, K.skin); R(g, 26, 25, 4, 10, K.shirt); R(g, 26, 35, 4, 2, K.skin);
      // head
      R(g, 7, 12, 20, 12, K.skin); R(g, 7, 22, 20, 2, K.skin2);
      R(g, 6, 5, 22, 8, K.hair); R(g, 4, 8, 3, 7, K.hair); R(g, 27, 8, 3, 7, K.hair); R(g, 6, 12, 22, 1, K.hair2);
      [[8, 3], [11, 2], [14, 1], [17, 2], [20, 1], [23, 3], [26, 4]].forEach(([x, y]) => R(g, x, y, 2, 3, K.hair));
      R(g, 8, 13, 4, 2, K.hair); R(g, 15, 13, 6, 2, K.hair); R(g, 24, 13, 3, 3, K.hair);
      R(g, 11, 16, 2, 4, K.eye); R(g, 22, 16, 2, 4, K.eye); P(g, 11, 16, '#ffffff'); P(g, 22, 16, '#ffffff');
      R(g, 9, 20, 2, 1, '#f0a090'); R(g, 24, 20, 2, 1, '#f0a090'); R(g, 16, 21, 3, 1, K.skin2);
    });
  });
}

// ---------------------------------------------------------------- people
// o: {skin, hair, hairStyle, shirt, shirt2, pants, dress, hat, beard, kid, wide, hood, apron}
function personSprite(o, dir, frame, pose = 'walk') {
  const key = 'p_' + o.id + '_' + dir + '_' + frame + '_' + pose;
  return cached(key, () => {
    if (dir === 3) return flipH(personSprite(o, 2, frame, pose));
    const leg = pose === 'walk' ? [0, 1, 0, -1][frame % 4] : 0;
    const bob = pose === 'walk' && frame % 2 === 1 ? 1 : 0;
    const ky = o.kid ? 5 : 0; // kids are shorter
    const skin = o.skin || '#f0c49a', skin2 = shade(skin, -0.18);
    const hair = o.hair || '#6a4028', shirt = o.shirt || '#8aa860', shirt2 = shade(shirt, -0.25), pants = o.pants || '#5a4634';
    const wd = o.wide ? 1 : 0;
    return sprite(20, 24, g => {
      const y0 = ky + bob;
      // legs / dress
      if (o.dress) {
        R(g, 5 - wd, 14 + y0, 10 + wd * 2, 7 - ky * 0.4, o.dress); R(g, 5 - wd, 19 + y0 - ky * 0.4, 10 + wd * 2, 1, shade(o.dress, -0.25));
        R(g, 7, 21 - (leg > 0 ? 1 : 0), 2, 2, '#3a2a22'); R(g, 11, 21 - (leg < 0 ? 1 : 0), 2, 2, '#3a2a22');
      } else if (dir === 2) {
        R(g, 7 + leg, 18 + (o.kid ? 1 : 0), 2, 4 - (o.kid ? 1 : 0), pants); R(g, 6 + leg, 21, 3, 2, '#3a2a22');
        R(g, 10 - leg, 18 + (o.kid ? 1 : 0), 2, 4 - (o.kid ? 1 : 0), pants); R(g, 9 - leg, 21, 3, 2, '#3a2a22');
      } else {
        R(g, 7, 18 - (leg > 0 ? 1 : 0) + (o.kid ? 1 : 0), 2, 4, pants); R(g, 7, 21 - (leg > 0 ? 1 : 0), 2, 2, '#3a2a22');
        R(g, 11, 18 - (leg < 0 ? 1 : 0) + (o.kid ? 1 : 0), 2, 4, pants); R(g, 11, 21 - (leg < 0 ? 1 : 0), 2, 2, '#3a2a22');
      }
      // torso
      const tw = 8 + wd * 2, tx = 6 - wd;
      const th = o.kid ? 4 : 6;
      if (dir === 2) R(g, 6 - wd, 12 + y0, 7 + wd * 2, th, shirt); else R(g, tx, 12 + y0, tw, th, shirt);
      R(g, dir === 2 ? 6 - wd : tx, 12 + y0 + th - 1, dir === 2 ? 7 + wd * 2 : tw, 1, shirt2);
      if (o.apron) R(g, dir === 2 ? 6 : tx + 1, 13 + y0, dir === 2 ? 3 : tw - 2, th, o.apron);
      if (o.scarf) R(g, dir === 2 ? 6 : tx, 12 + y0, dir === 2 ? 7 : tw, 2, o.scarf);
      // arms
      if (dir !== 2) {
        R(g, tx - 2, 12 + y0 + (leg > 0 ? 1 : 0), 2, th - 1, shirt); R(g, tx - 2, 11 + th + y0 + (leg > 0 ? 1 : 0), 2, 1, skin);
        R(g, tx + tw, 12 + y0 + (leg < 0 ? 1 : 0), 2, th - 1, shirt); R(g, tx + tw, 11 + th + y0 + (leg < 0 ? 1 : 0), 2, 1, skin);
      } else {
        const a = pose === 'grab' ? -2 : -leg;
        if (pose === 'grab') { R(g, 2, 13 + y0, 6, 2, shirt); R(g, 1, 13 + y0, 1, 2, skin); }
        else { R(g, 8 + a, 13 + y0, 2, th - 2, shirt); R(g, 8 + a, 11 + th + y0, 2, 1, skin); }
      }
      // head
      const hy = 4 + y0;
      if (dir === 1) {
        R(g, 5, hy + 2, 10, 6, skin);
      } else if (dir === 2) {
        R(g, 4, hy + 3, 8, 5, skin); P(g, 3, hy + 5, skin); R(g, 4, hy + 7, 8, 1, skin2);
        R(g, 5, hy + 5, 1, 2, '#2a1c1c');
      } else {
        R(g, 5, hy + 3, 10, 5, skin); R(g, 5, hy + 7, 10, 1, skin2);
        R(g, 7, hy + 5, 1, 2, '#2a1c1c'); R(g, 12, hy + 5, 1, 2, '#2a1c1c');
      }
      // hair
      const hs = o.hairStyle || 'short';
      if (hs !== 'bald') {
        if (dir === 1) { R(g, 5, hy, 10, 7, hair); if (hs === 'long') R(g, 4, hy + 2, 12, 9, hair); if (hs === 'bun') ell(g, 7, hy - 3, 6, 5, hair); }
        else if (dir === 2) {
          R(g, 4, hy, 9, 3, hair); R(g, 9, hy + 1, 4, 5, hair); P(g, 3, hy + 2, hair);
          if (hs === 'long') R(g, 9, hy + 1, 5, 9, hair);
          if (hs === 'bun') ell(g, 10, hy - 3, 5, 5, hair);
        } else {
          R(g, 5, hy, 10, 3, hair); P(g, 4, hy + 2, hair); P(g, 15, hy + 2, hair);
          if (hs === 'long') { R(g, 4, hy + 2, 2, 8, hair); R(g, 14, hy + 2, 2, 8, hair); }
          if (hs === 'bun') ell(g, 7, hy - 3, 6, 5, hair);
        }
      } else if (dir !== 1) R(g, 5, hy + 1, 10, 2, skin);
      if (o.beard && dir !== 1) {
        if (dir === 2) R(g, 3, hy + 6, 7, 4, o.beard); else { R(g, 5, hy + 6, 10, 4, o.beard); R(g, 7, hy + 10, 6, 2, o.beard); }
      }
      // hats
      if (o.hat === 'witch') { R(g, 2, hy, 16, 2, o.hatCol); R(g, 5, hy - 4, 10, 4, o.hatCol); R(g, 7, hy - 7, 6, 3, o.hatCol); R(g, 9, hy - 9, 3, 2, o.hatCol); R(g, 5, hy - 1, 10, 1, '#e0c060'); }
      if (o.hat === 'cap') { R(g, 4, hy - 1, 12, 3, o.hatCol); if (dir === 0) R(g, 4, hy + 2, 12, 1, shade(o.hatCol, -0.3)); if (dir === 2) R(g, 1, hy + 1, 4, 1, shade(o.hatCol, -0.3)); }
      if (o.hat === 'hood') {
        const hc = o.hatCol;
        if (dir === 1) R(g, 4, hy - 1, 12, 10, hc);
        else if (dir === 2) { R(g, 3, hy - 1, 11, 4, hc); R(g, 9, hy, 5, 9, hc); }
        else { R(g, 4, hy - 1, 12, 4, hc); R(g, 4, hy, 2, 8, hc); R(g, 14, hy, 2, 8, hc); }
        if (o.mask && dir !== 1) { if (dir === 2) R(g, 3, hy + 6, 7, 2, o.mask); else R(g, 5, hy + 6, 10, 2, o.mask); }
      }
      if (o.hat === 'bandana') { R(g, 4, hy, 12, 2, o.hatCol); }
    });
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
  return cached('table', () => sprite(24, 16, g => {
    R(g, 2, 9, 3, 7, C.wood2); R(g, 19, 9, 3, 7, C.wood2);
    R(g, 0, 2, 24, 8, C.wood); R(g, 0, 2, 24, 2, C.wood3); R(g, 0, 9, 24, 2, C.wood2);
    R(g, 7, 4, 1, 5, C.wood2); R(g, 16, 4, 1, 5, C.wood2);
    R(g, 3, 3, 18, 6, '#e8dcc0'); R(g, 3, 8, 18, 1, '#c8b890'); // cloth
  }));
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
function treeSprite(v, night) {
  return cached(`tree_${v}`, () => {
    const pals = [['#2f6a3a', '#3f8a46', '#5aac56', '#86d06a'], ['#2a5a3a', '#347a48', '#4a9a5a', '#72c07a'], ['#3a5a2a', '#4f7a34', '#6b9a40', '#96c25a']][v % 3];
    return sprite(36, 44, g => {
      R(g, 15, 28, 6, 15, '#5a3a22'); R(g, 15, 28, 2, 15, '#7a5232'); R(g, 12, 41, 12, 3, '#5a3a22');
      ell(g, 2, 8, 32, 26, pals[0]); ell(g, 4, 4, 28, 26, pals[1]); ell(g, 7, 2, 20, 18, pals[2]);
      ell(g, 10, 4, 10, 7, pals[3]);
      for (let i = 0; i < 6; i++) { const a = i * 1.1; ell(g, 16 + Math.cos(a) * 10, 14 + Math.sin(a) * 8, 6, 5, pals[i % 2 ? 1 : 2]); }
    });
  });
}
function bushSprite(v) {
  return cached('bush' + v, () => sprite(16, 12, g => {
    ell(g, 0, 2, 16, 10, '#2f6a3a'); ell(g, 2, 1, 12, 8, '#3f8a46'); ell(g, 4, 1, 6, 4, '#5aac56');
    if (v === 1) { P(g, 4, 5, '#e05050'); P(g, 10, 4, '#e05050'); P(g, 7, 7, '#e05050'); }
  }));
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
  return cached('elderP', () => sprite(40, 48, g => {
    const skin = '#f0c8a0', beard = '#f4f0e8', coat = '#5e7a3e';
    ell(g, 2, 26, 36, 24, coat); R(g, 30, 4, 3, 44, '#6a4a2a'); ell(g, 27, 0, 9, 7, '#3fae8f');
    ell(g, 8, 4, 22, 24, skin); ell(g, 7, 2, 24, 10, beard); R(g, 7, 6, 3, 10, beard); R(g, 28, 6, 3, 10, beard);
    R(g, 12, 12, 5, 2, beard); R(g, 21, 12, 5, 2, beard); R(g, 13, 15, 2, 2, '#2a1c1c'); R(g, 22, 15, 2, 2, '#2a1c1c');
    ell(g, 6, 18, 26, 22, beard); ell(g, 12, 18, 14, 5, skin); R(g, 15, 21, 8, 1, '#b8b0a0');
  }));
}
function mayorPortrait() {
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
    if (kind === 'ecstatic') { R(g, 3, 4, 2, 1, d); R(g, 7, 4, 2, 1, d); P(g, 2, 5, d); P(g, 9, 5, d); R(g, 3, 7, 6, 2, d); R(g, 4, 9, 4, 1, '#d84a3e'); }
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
