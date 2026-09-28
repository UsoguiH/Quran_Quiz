'use strict';
// ============================================================================
//  PIXEL UI KIT: tiny bitmap fonts, slate keycaps & round gamepad buttons,
//  green "pocket" panels with cream selection outlines and pixel icons.
//  (Original art in the style of classic pixel input-prompt sheets.)
// ============================================================================

const PK = {
  outline: '#161a28', face: '#3b4466', faceHi: '#4d5880', band: '#262b42', line: '#5b6892',
  cream: '#f3eedb', creamDim: '#cfc9b2', green: '#3f7c52', green2: '#356a46', greenDark: '#1d3b31', greenHi: '#58a06a',
  letter: '#f3eedb', xbA: '#5cc04a', xbB: '#e24a42', xbX: '#44c6ee', xbY: '#eab432',
};

// 3x5 font (uppercase, digits, a few symbols)
const PF3 = (() => {
  const d = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
    P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
    Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
    9: '111101111001110', '<': '001010100010001', '>': '100010001010100', '^': '010101000000000', v: '000000101101010',
    '/': '001001010100100', '-': '000000111000000', '+': '000010111010000', '.': '000000000000010', ':': '000010000010000',
    '%': '101001010100101', '!': '010010010000010', '?': '110001010000010', "'": '010010000000000', ',': '000000000010100',
    '|': '010010010010010', '(': '010100100100010', ')': '010001001001010', '#': '101111101111101', ' ': '000000000000000',
  };
  return d;
})();
// 5x5 bold letters for single-letter buttons
const PF5 = {
  A: '0111010001111111000110001', B: '1111010001111101000111110', X: '1000101010001000101010001', Y: '1000101010001000010000100',
  L: '1000010000100001000011111', R: '1111010001111101001010001', W: '1000110001101011010101010', S: '0111110000011100000111110',
  D: '1111010001100011000111110', E: '1111110000111101000011111', J: '0011100010000101001001100', K: '1001010100111001010010010',
  Q: '0111010001101011001001101', F: '1111110000111101000010000', I: '1111100100001000010011111', P: '1111010001111101000010000',
  Z: '1111100010001000100011111', C: '0111110000100001000001111',
};
function pTextW(s, scale = 1) { return String(s).length * 4 * scale - scale; }
function pText(g, s, x, y, col, scale = 1) {
  s = String(s).toUpperCase(); g.fillStyle = col;
  let cx = Math.round(x);
  for (const ch of s) {
    const bits = PF3[ch] || PF3['?'];
    for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(cx + (i % 3) * scale, Math.round(y) + ((i / 3) | 0) * scale, scale, scale);
    cx += 4 * scale;
  }
}
function pGlyph5(g, ch, x, y, col, scale = 1) {
  const bits = PF5[ch]; if (!bits) { pText(g, ch, x + scale, y, col, scale); return; }
  g.fillStyle = col;
  for (let i = 0; i < 25; i++) if (bits[i] === '1') g.fillRect(x + (i % 5) * scale, y + ((i / 5) | 0) * scale, scale, scale);
}

// ---------------------------------------------------------------- keycaps & round buttons (cached canvases)
// keycap: slate key with darker bottom band; sel = cream outline like a highlighted key
function keyCap(label, sel = false, s = 1) {
  return cached(`kc_${label}_${sel}_${s}`, () => {
    label = String(label).toUpperCase();
    const single = label.length === 1 && PF5[label];
    const tw = single ? 5 : pTextW(label);
    const w = Math.max(11, tw + 6), h = 12, pad = 2; // pad always reserved so on/off images match
    const c = mkCanvas((w + pad * 2) * s, (h + pad * 2) * s), g = c.getContext('2d');
    g.scale(s, s);
    if (sel) { R(g, 1, 0, w + 2, h + 4, PK.cream); R(g, 0, 1, w + 4, h + 2, PK.cream); R(g, 1, 1, w + 2, h + 2, PK.outline); }
    g.translate(pad, pad);
    R(g, 1, 0, w - 2, h, PK.outline); R(g, 0, 1, w, h - 2, PK.outline);
    R(g, 1, 1, w - 2, h - 2, PK.face); R(g, 1, 1, w - 2, 1, PK.faceHi);
    R(g, 1, h - 4, w - 2, 1, PK.line); R(g, 1, h - 3, w - 2, 2, PK.band);
    if (single) pGlyph5(g, label, Math.floor((w - 5) / 2), 2, PK.letter);
    else pText(g, label, Math.floor((w - tw) / 2), 3, PK.letter);
    return c;
  });
}
function roundBtn(letter, col, sel = false, s = 1) {
  return cached(`rb_${letter}_${col}_${sel}_${s}`, () => {
    const d = 13, pad = 2;
    const c = mkCanvas((d + pad * 2) * s, (d + pad * 2) * s), g = c.getContext('2d');
    g.scale(s, s);
    if (sel) { ell(g, 0, 0, d + 4, d + 4, PK.cream); ell(g, 1, 1, d + 2, d + 2, PK.outline); }
    g.translate(pad, pad);
    ell(g, 0, 0, d, d, PK.outline); ell(g, 1, 1, d - 2, d - 2, PK.band);
    ell(g, 1, 1, d - 2, d - 4, PK.line); ell(g, 1, 1, d - 2, d - 5, PK.face);
    R(g, 4, 2, 5, 1, PK.faceHi);
    pGlyph5(g, letter, 4, 3, col || PK.letter);
    return c;
  });
}
const PAD_LETTER_COL = { A: PK.xbA, B: PK.xbB, X: PK.xbX, Y: PK.xbY };

// ---------------------------------------------------------------- pocket panels
function pocketFrame(x, y, w, h, title) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  ctx.globalAlpha = 0.45; R(ctx, x + 3, y + 4, w, h, '#000'); ctx.globalAlpha = 1;
  R(ctx, x + 1, y, w - 2, h, PK.outline); R(ctx, x, y + 1, w, h - 2, PK.outline);
  R(ctx, x + 1, y + 1, w - 2, h - 2, PK.face); R(ctx, x + 1, y + 1, w - 2, 1, PK.faceHi);
  R(ctx, x + 3, y + 3, w - 6, h - 6, PK.outline);
  R(ctx, x + 4, y + 4, w - 8, h - 8, PK.green);
  // subtle dither texture
  for (let j = y + 6; j < y + h - 6; j += 4) for (let i = x + 6 + ((j >> 2) & 1) * 2; i < x + w - 6; i += 4) P(ctx, i, j, PK.green2);
  if (title) {
    R(ctx, x + 4, y + 4, w - 8, 13, PK.greenDark); R(ctx, x + 4, y + 17, w - 8, 1, PK.outline);
    pText(ctx, title, x + w / 2 - pTextW(title, 1) / 2, y + 8, PK.cream);
  }
}
// slate "slot" bar; sel draws cream outline like a highlighted key
function slateBar(x, y, w, h, sel, fill) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  if (sel) { R(ctx, x - 2, y - 2, w + 4, h + 4, PK.cream); R(ctx, x - 1, y - 1, w + 2, h + 2, PK.outline); }
  R(ctx, x + 1, y, w - 2, h, PK.outline); R(ctx, x, y + 1, w, h - 2, PK.outline);
  R(ctx, x + 1, y + 1, w - 2, h - 2, fill || PK.face); R(ctx, x + 1, y + 1, w - 2, 1, PK.faceHi);
  R(ctx, x + 1, y + h - 3, w - 2, 2, PK.band);
}
function pipBar(x, y, n, v, col = PK.greenHi) {
  for (let i = 0; i < n; i++) { R(ctx, x + i * 6, y, 5, 6, PK.outline); R(ctx, x + i * 6 + 1, y + 1, 3, 4, i < v ? col : PK.band); if (i < v) R(ctx, x + i * 6 + 1, y + 1, 3, 1, PK.cream); }
}
const PICON = {
  sword: ['......c', '.....cc', '....cc.', '.b.cc..', '..bc...', '.bab...', 'b..b...'],
  lock: ['.ccc.', 'c...c', 'c...c', 'yyyyy', 'yyoyy', 'yyoyy', 'yyyyy'],
  hand: ['..c....', '..cc...', '..cccc.', 'c.ccccc', 'ccccccc', '.cccccc', '..cccc.'],
  gear: ['.c.c.', 'ccccc', 'cc.cc', 'ccccc', '.c.c.'],
  heart: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'],
  coin: ['.yyy.', 'yyoyy', 'yyoyy', 'yyoyy', '.yyy.'],
  sound: ['..c.c', '.cc..', 'ccc.c', '.cc..', '..c.c'],
  eye: ['.ccc.', 'cc.cc', 'c.o.c', 'cc.cc', '.ccc.'],
  pad: ['ccccccc', 'c.cc.cc', 'ccccccc', '.cc.cc.'],
  shield: ['ccccc', 'cbbbc', 'cbbbc', '.cbc.', '..c..'],
  boot: ['cc...', 'cc...', 'cc...', 'ccccc', 'ccccc'],
  door: ['.ccc.', 'c...c', 'c...c', 'c..oc', 'c...c'],
  book: ['cccc.', 'c..cc', 'cccc.', 'c..cc', 'cccc.'],
  bag: ['.cc.', 'cccc', 'cyyc', 'cccc'],
};
function pIcon(name, scale = 1) {
  return cached(`picon_${name}_${scale}`, () => {
    const rows = PICON[name], pal = { c: PK.cream, b: '#8a6a4a', a: '#c8a060', y: '#eab432', o: PK.outline, r: '#e24a42' };
    const w = rows[0].length, h = rows.length;
    const c = mkCanvas(w * scale + 2, h * scale + 2), g = c.getContext('2d');
    rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] !== '.') { g.fillStyle = pal[row[i]]; g.fillRect(1 + i * scale, 1 + j * scale, scale, scale); } });
    return addOutline(c, PK.outline);
  });
}

// ---------------------------------------------------------------- touch controls (phones)
// Gold-rimmed medallions with action icons (same metal as the health medallion),
// instead of gamepad letters.
const TB = {
  rim: '#2a1a14', gold: '#d8a458', goldHi: '#f4d49a', goldLo: '#8a5a2a', rivet: '#fff0c0',
  // accent wells: [dark, mid, light]
  attack: ['#4a1620', '#7a2432', '#a8384a'], dash: ['#12383a', '#1d5a58', '#2f8a80'],
  guard: ['#18244a', '#27397a', '#3f58a8'], use: ['#1d3b23', '#2d5e36', '#46884e'],
  slate: ['#1b1f30', '#2c3350', '#414b72'], back: ['#3a1e18', '#5e3226', '#86503a'],
};
const TICON = {
  // big action icons (drawn 1:1 inside the medallion; outline added automatically)
  sword: (() => { // 13x13 blade pointing up-right
    const r = Array.from({ length: 13 }, () => Array(13).fill('.'));
    for (let i = 0; i < 7; i++) { r[7 - i][5 + i] = 'w'; r[7 - i][6 + i] = 's'; }
    r[1][12] = '.'; r[0][12] = 'w';
    [[2, 6], [3, 7], [4, 8], [5, 9], [6, 10]].forEach(([x, y]) => r[y][x] = 'g');
    r[9][3] = 'b'; r[10][2] = 'b'; r[11][1] = 'g'; r[12][0] = 'g'; r[11][0] = 'g'; r[12][1] = 'g';
    return r.map(a => a.join(''));
  })(),
  dash: ['....ccc...', '....ccc...', '.tt.ccc...', '....ccc...', 'tt..cccc..', '....cccccc', '.tt.cccccc', '....bbbbbb'],
  shield: ['ggggggggg', 'gbbbcbbbg', 'gbbbcbbbg', 'gcccccccg', 'gbbbcbbbg', '.gbbcbbg.', '.gbbcbbg.', '..gbcbg..', '...gcg...', '....g....'],
  hand: ['..c.c.c..', '..c.c.c.c', '..c.c.c.c', '..ccccccc', 'c.ccccccc', 'cc.cccccc', '.cccccccc', '..cccccc.', '...cccc..'],
  check: ['........c', '.......cc', '......cc.', 'c....cc..', 'cc..cc...', '.cccc....', '..cc.....'],
  back: ['...c.....', '..cc.....', '.ccccccc.', 'cccccccc.', '.ccccccc.', '..cc.....', '...c.....'],
  // small buttons
  bag: ['...LLLL...', '..L....L..', '.bbbbbbbb.', 'bLLLLLLLLb', 'bllllllllb', 'bdddyydddb', 'bllllylllb', 'bllllllllb', '.bbbbbbbb.'],
  potion: ['..nnn..', '..www..', '..w.w..', '.wpppw.', 'wpppppw', 'wphpppw', 'wpppppw', '.wwwww.'],
  swap: ['.....c...', '.....cc..', 'ccccccccc', '.....cc..', '.....c...', '.........', '...c.....', '..cc.....', 'ccccccccc', '..cc.....', '...c.....'],
  pause: ['cc..cc', 'cc..cc', 'cc..cc', 'cc..cc', 'cc..cc', 'cc..cc', 'cc..cc'],
  pendant: ['.c...c.', '..c.c..', '...g...', '..ggg..', '.gtttg.', 'gtmmmtg', '.gtttg.', '..ggg..'],
  full: ['ccc...ccc', 'c.......c', 'c.......c', '.........', '.........', '.........', 'c.......c', 'c.......c', 'ccc...ccc'],
  unfull: ['..c...c..', '..c...c..', 'ccc...ccc', '.........', '.........', '.........', 'ccc...ccc', '..c...c..', '..c...c..'],
  skip: ['c...c...', 'cc..cc..', 'ccc.ccc.', 'cccccccc', 'ccc.ccc.', 'cc..cc..', 'c...c...'],
  // mini (7px) versions for in-game prompts
  mSword: ['......w', '.....ws', '....ws.', '.g.ws..', '..gs...', '.bgg...', 'g..g...'],
  mDash: ['...cc..', '...cc..', 't..cc..', '...ccc.', 'tt.cccc', '...bbbb'],
  mShield: ['ggggg', 'gbcbg', 'gcccg', '.gcg.', '..g..'],
  mHand: PICON.hand,
  mPendant: ['.c.c.', '..g..', '.ggg.', 'gtmtg', '.ggg.'],
};
const TPAL = { c: PK.cream, w: '#f4f6f8', s: '#9aa8b8', g: '#e8b84a', b: '#8a5a34', t: '#5ad0c0', d: '#6a4424', y: '#eab432',
  n: '#8a6a4a', p: '#e24a5a', h: '#ffb0b8', m: '#bff4e0', l: '#c8905a', L: '#ecc084' };
function tIcon(name) {
  return cached('ticon_' + name, () => {
    const rows = TICON[name], w = rows[0].length, h = rows.length;
    const c = mkCanvas(w + 2, h + 2), g = c.getContext('2d');
    rows.forEach((row, j) => { for (let i = 0; i < w; i++) if (row[i] !== '.') P(g, 1 + i, 1 + j, TPAL[row[i]] || PK.cream); });
    return addOutline(c, PK.outline);
  });
}
// round gold-rimmed button; d = diameter in art pixels. Canvas has 2px padding + drop shadow.
function medallion(d, well, icon, on = false, s = 1, glow = false) {
  return cached(`med_${d}_${well}_${icon}_${on}_${s}_${glow}`, () => {
    const pad = 3, c = mkCanvas((d + pad * 2) * s, (d + pad * 2 + 1) * s), g = c.getContext('2d');
    g.scale(s, s);
    const W3 = TB[well], oy = on ? 1 : 0, t = d >= 28 ? 3 : d >= 16 ? 2 : 1;
    g.globalAlpha = 0.45; ell(g, pad, pad + 2, d, d, '#000'); g.globalAlpha = 1;
    if (on || glow) { ell(g, pad - 2, pad - 2 + oy, d + 4, d + 4, on ? PK.cream : '#f4d49a'); }
    g.translate(pad, pad + oy);
    ell(g, 0, 0, d, d, TB.rim);
    ell(g, 1, 1, d - 2, d - 2, TB.goldLo); ell(g, 1, 1, d - 2, d - 3, TB.goldHi); ell(g, 1, 2, d - 2, d - 4, on ? TB.goldHi : TB.gold);
    // rivets on the rim
    if (d >= 22) { const m = (d / 2) | 0; [[m - 1, 1], [m - 1, d - 3], [1, m - 1], [d - 3, m - 1]].forEach(([x, y]) => { P(g, x, y, TB.rivet); P(g, x + 1, y + 1, TB.goldLo); }); }
    const iw = d - 2 - t * 2;
    ell(g, 1 + t, 1 + t, iw, iw, TB.rim);
    ell(g, 2 + t, 2 + t, iw - 2, iw - 2, W3[0]);
    ell(g, 2 + t, 3 + t, iw - 2, iw - 3, on ? W3[2] : W3[1]);
    // soft glint
    ell(g, 3 + t + iw * 0.12, 3 + t + iw * 0.5, iw * 0.55, iw * 0.35, 'rgba(255,255,255,0.06)');
    R(g, 3 + t + (iw * 0.18 | 0), 3 + t + (iw * 0.12 | 0), 2, 1, 'rgba(255,255,255,0.35)');
    if (icon) { const ic = tIcon(icon); g.drawImage(ic, Math.round((d - ic.width) / 2), Math.round((d - ic.height) / 2) + 1); }
    return c;
  });
}
// slate pill with an icon and/or label (skip, prompt chips)
function pillBtn(label, icon, on = false, s = 1) {
  return cached(`pill_${label}_${icon}_${on}_${s}`, () => {
    const ic = icon ? tIcon(icon) : null, tw = label ? pTextW(label) : 0;
    const w = 8 + (ic ? ic.width : 0) + (ic && label ? 3 : 0) + tw, h = 13, pad = 2;
    const c = mkCanvas((w + pad * 2) * s, (h + pad * 2 + 1) * s), g = c.getContext('2d');
    g.scale(s, s);
    g.globalAlpha = 0.45; R(g, pad + 1, pad + 2, w - 2, h, '#000'); g.globalAlpha = 1;
    g.translate(pad, pad + (on ? 1 : 0));
    R(g, 2, 0, w - 4, h, TB.rim); R(g, 1, 1, w - 2, h - 2, TB.rim); R(g, 0, 2, w, h - 4, TB.rim);
    R(g, 2, 1, w - 4, h - 2, TB.goldLo); R(g, 1, 2, w - 2, h - 4, TB.goldLo); R(g, 2, 1, w - 4, 1, TB.goldHi);
    R(g, 2, 2, w - 4, h - 4, on ? TB.slate[2] : TB.slate[1]); R(g, 2, h - 4, w - 4, 1, TB.slate[0]);
    let x = 4;
    if (ic) { g.drawImage(ic, x - 1, Math.round((h - ic.height) / 2)); x += ic.width + 1; }
    if (label) pText(g, label, x, 4, PK.cream);
    return c;
  });
}
// how each touch button looks: size in art pixels, icon, caption plate, accent colours [light, deep];
// icu/lu = icon/caption in menus
const TOUCH_LOOK = {
  X: { d: 40, ic: 'sword', l: 'ATTACK', acc: ['#e0485c', '#5a1a26'] },
  B: { d: 30, ic: 'dash', l: 'ROLL', acc: ['#34b8a8', '#10403e'], icu: 'back', lu: 'BACK', accu: ['#d8844e', '#4a2418'] },
  Y: { d: 30, ic: 'shield', l: 'GUARD', acc: ['#5a7ee0', '#1c2a58'] },
  A: { d: 30, ic: 'hand', l: 'USE', acc: ['#5cc06a', '#1d4426'], icu: 'check', lu: 'OK' },
  SELECT: { d: 20, ic: 'bag', sq: true, acc: ['#c8904a', '#3a2412'] },
  RB: { d: 20, ic: 'potion', sq: true, acc: ['#e24a5a', '#4a1620'] },
  LB: { d: 20, ic: 'swap', sq: true, acc: ['#8a96c8', '#262c48'] },
  START: { d: 20, ic: 'pause', sq: true, acc: ['#8a96c8', '#262c48'] },
  PENDANT: { d: 20, ic: 'pendant', sq: true, acc: ['#5ad0c0', '#10403e'] },
  FS: { d: 20, ic: 'full', sq: true, acc: ['#8a96c8', '#262c48'] },
  SKIP: { d: 16, w: 40, ic: 'skip', l: 'SKIP', pill: true, acc: ['#8a96c8', '#262c48'] },
};
const PXB_PAD = 2;
// fill a rounded shape row by row (r = w/2 gives a circle) so every edge sits on whole pixels
function pxShape(g, x, y, w, h, r, col) {
  r = Math.max(0, Math.min(r, w / 2, h / 2)); g.fillStyle = col;
  for (let j = 0; j < h; j++) {
    const dy = j < r ? r - j - 0.5 : j >= h - r ? j - (h - r) + 0.5 : 0;
    const inset = dy > 0 ? Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy))) : 0;
    g.fillRect(x + inset, y + j, w - inset * 2, 1);
  }
}
// a touch button as pixel art, 1 canvas pixel = 1 art pixel. state: 0 idle, 1 pressed, 2 ready (glowing)
function pixelBtn(L, state = 0, ui = false) {
  const icon = ui && L.icu ? L.icu : L.ic, label = ui && L.lu ? L.lu : L.l, acc = ui && L.accu ? L.accu : L.acc;
  return cached(`pxb_${L.d}_${L.w}_${icon}_${label}_${acc[0]}_${!!L.sq}_${!!L.pill}_${state}`, () => {
    const pad = PXB_PAD, w = L.w || L.d, h = L.d, plate = label && !L.pill;
    const c = mkCanvas(w + pad * 2, h + pad * 2 + 1 + (plate ? 4 : 0)), g = c.getContext('2d');
    const r = L.pill ? h / 2 : L.sq ? Math.round(w * 0.3) : w / 2;
    // drop shadow, and a coloured halo when pressed or ready
    g.globalAlpha = 0.45; pxShape(g, pad, pad + 2, w, h, r, '#000'); g.globalAlpha = 1;
    if (state) { g.globalAlpha = state === 2 ? 0.6 : 0.45; pxShape(g, pad - 2, pad - 2, w + 4, h + 4, r + 2, acc[0]); g.globalAlpha = 1; }
    const ox = pad, oy = pad + (state === 1 ? 1 : 0);
    pxShape(g, ox, oy, w, h, r, TB.rim);
    pxShape(g, ox + 1, oy + 1, w - 2, h - 2, r - 1, state ? '#c8903e' : '#98682e');   // rim, shaded underside
    pxShape(g, ox + 1, oy + 1, w - 2, h - 3, r - 1, state ? '#fff0c0' : '#e8be6e');  // rim, lit top
    pxShape(g, ox + 2, oy + 2, w - 4, h - 4, r - 2, '#0c0a14');
    // the glass, painted in bands on its own canvas so they stay inside the shape
    const bw = w - 6, bh = h - 6, bc = mkCanvas(bw, bh), bg = bc.getContext('2d');
    pxShape(bg, 0, 0, bw, bh, r - 3, '#fff');
    bg.globalCompositeOperation = 'source-in';
    if (state === 1) {
      R(bg, 0, 0, bw, bh, acc[1]); R(bg, 0, 0, bw, Math.round(bh * 0.45), shade(acc[1], 0.18));
      R(bg, 0, bh - 3, bw, 3, acc[0]);
    } else {
      R(bg, 0, 0, bw, bh, '#14111e'); R(bg, 0, 0, bw, Math.round(bh * 0.5), '#1f1a2e');
      // coloured moon-glow along the bottom, with a dithered edge
      R(bg, 0, bh - 3, bw, 3, acc[1]); R(bg, 0, bh - 1, bw, 1, shade(acc[0], -0.1));
      for (let x = (bh & 1); x < bw; x += 2) R(bg, x, bh - 4, 1, 1, acc[1]);
    }
    // glint on the upper left
    const gx = Math.max(1, Math.round(bw * 0.2));
    R(bg, gx, 1, Math.max(2, Math.round(bw * 0.2)), 1, 'rgba(255,255,255,0.32)'); R(bg, gx - 1, 2, 1, 1, 'rgba(255,255,255,0.2)');
    g.globalAlpha = 0.92; g.drawImage(bc, ox + 3, oy + 3); g.globalAlpha = 1;
    // icon (and caption)
    const ic = tIcon(icon);
    if (L.pill) {
      g.drawImage(ic, ox + 4, oy + Math.round((h - ic.height) / 2));
      const tx = ox + 4 + ic.width + 2;
      pText(g, label, tx, oy + Math.round((h - 5) / 2) + 1, '#0c0a14'); pText(g, label, tx, oy + Math.round((h - 5) / 2), PK.cream);
    } else {
      g.drawImage(ic, ox + Math.round((w - ic.width) / 2), oy + Math.round((h - ic.height) / 2) - (plate ? 2 : 0));
    }
    if (plate) {
      // a small parchment plate across the bottom of the rim names the action
      const tw = pTextW(label), pw = tw + 6, px = ox + Math.round((w - pw) / 2), py = oy + h - 5;
      R(g, px + 1, py, pw - 2, 9, TB.rim); R(g, px, py + 1, pw, 7, TB.rim);
      R(g, px + 1, py + 1, pw - 2, 7, '#efe3c5'); R(g, px + 1, py + 6, pw - 2, 1, '#d8c9a0');
      pText(g, label, px + 3, py + 2, '#3a2a1e');
    }
    return c;
  });
}
// joystick: a thin gold ring with diamond ticks, and a jewelled knob
function stickArt() {
  return cached('pxStick', () => {
    const d = 48, c = mkCanvas(d, d), g = c.getContext('2d'), m = d / 2;
    pxShape(g, 0, 0, d, d, m, TB.rim); pxShape(g, 1, 1, d - 2, d - 2, m - 1, '#e8be6e'); pxShape(g, 2, 2, d - 4, d - 4, m - 2, TB.rim);
    g.globalCompositeOperation = 'destination-out'; pxShape(g, 3, 3, d - 6, d - 6, m - 3, '#000');
    g.globalCompositeOperation = 'source-over'; pxShape(g, 3, 3, d - 6, d - 6, m - 3, 'rgba(12,10,20,0.35)');
    const dia = (x, y, col) => { R(g, x - 1, y, 3, 1, col); R(g, x, y - 1, 1, 3, col); };
    dia(m, 7, '#f4d49a'); dia(m - 1, d - 8, '#f4d49a'); dia(7, m - 1, '#f4d49a'); dia(d - 8, m, '#f4d49a');
    [[13, 13], [d - 14, 13], [13, d - 14], [d - 14, d - 14]].forEach(([x, y]) => R(g, x, y, 1, 1, 'rgba(244,212,154,0.6)'));
    return c;
  });
}
function knobArt() {
  return cached('pxKnob', () => {
    const d = 20, c = mkCanvas(d, d + 1), g = c.getContext('2d');
    g.globalAlpha = 0.45; pxShape(g, 0, 1, d, d, d / 2, '#000'); g.globalAlpha = 1;
    pxShape(g, 0, 0, d, d, d / 2, TB.rim); pxShape(g, 1, 1, d - 2, d - 2, d / 2 - 1, '#98682e'); pxShape(g, 1, 1, d - 2, d - 3, d / 2 - 1, '#e8be6e');
    pxShape(g, 2, 2, d - 4, d - 4, d / 2 - 2, '#0c0a14'); pxShape(g, 3, 3, d - 6, d - 6, d / 2 - 3, '#1f1a2e');
    pxShape(g, 6, 6, 8, 8, 4, '#98682e'); pxShape(g, 6, 6, 8, 7, 4, '#e8b84a'); R(g, 8, 7, 2, 1, '#fff0c0');
    return c;
  });
}
function skinTouchButtons() {
  const url = c => `url(${c.toDataURL()})`;
  document.querySelectorAll('.tbtn').forEach(b => {
    const L = TOUCH_LOOK[b.dataset.b]; if (!L) return;
    b.textContent = '';
    b.classList.add('px');
    const idle = pixelBtn(L, 0);
    b.style.setProperty('--img', url(idle)); b.style.setProperty('--img-on', url(pixelBtn(L, 1)));
    if (b.dataset.b === 'A') b.style.setProperty('--img-glow', url(pixelBtn(L, 2)));
    if (L.icu) { b.style.setProperty('--img-ui', url(pixelBtn(L, 0, true))); b.style.setProperty('--img-ui-on', url(pixelBtn(L, 1, true))); }
    // art size: the button face (d) and the whole canvas, used to scale it by a whole number
    Object.assign(b.dataset, { ad: L.d, aw: idle.width, ah: idle.height });
  });
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  if (stick) { stick.classList.add('px'); stick.style.setProperty('--img', url(stickArt())); }
  if (knob) { knob.classList.add('px'); knob.style.setProperty('--img', url(knobArt())); }
}
// small version drawn inside in-game prompts on phones; returns the canvas
function miniAction(b) {
  const m = { A: ['use', 'mHand'], B: ['dash', 'mDash'], ROLL: ['dash', 'mDash'], X: ['attack', 'mSword'], Y: ['guard', 'mShield'], PENDANT: ['slate', 'mPendant'] }[b];
  if (!m) return null;
  // a tiny version of the glass buttons: dark disc, gold rim, coloured glow along the bottom
  return cached('miniGlass_' + b, () => {
    const d = 15, c = mkCanvas(d, d + 1), g = c.getContext('2d'), acc = TB[m[0]];
    ell(g, 0, 1, d, d, 'rgba(0,0,0,0.4)');
    ell(g, 0, 0, d, d, TB.rim); ell(g, 1, 1, d - 2, d - 2, '#e8be6e');
    ell(g, 2, 2, d - 4, d - 4, '#141220'); ell(g, 3, 6, d - 6, d - 7, acc[1]); ell(g, 3, 3, d - 6, d - 7, '#1e1a2e');
    const ic = tIcon(m[1]); g.drawImage(ic, Math.round((d - ic.width) / 2), Math.round((d - ic.height) / 2));
    return c;
  });
}
