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
  bag: ['...ddd...', '..d...d..', '.bbbbbbb.', 'bbbbbbbbb', 'bbbbybbbb', 'bdddydddb', 'bbbbbbbbb', '.bbbbbbb.'],
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
};
const TPAL = { c: PK.cream, w: '#f4f6f8', s: '#9aa8b8', g: '#e8b84a', b: '#8a5a34', t: '#5ad0c0', d: '#6a4424', y: '#eab432',
  n: '#8a6a4a', p: '#e24a5a', h: '#ffb0b8', m: '#bff4e0' };
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
// joystick: a dark ring with a gold bezel, and a gold knob
function stickBase(s = 1) {
  return cached('stickBase' + s, () => {
    const d = 44, c = mkCanvas(d * s, d * s), g = c.getContext('2d'); g.scale(s, s);
    ell(g, 0, 0, d, d, 'rgba(42,26,20,0.85)'); ell(g, 1, 1, d - 2, d - 2, 'rgba(138,90,42,0.75)'); ell(g, 1, 1, d - 2, d - 3, 'rgba(216,164,88,0.8)');
    ell(g, 3, 3, d - 6, d - 6, 'rgba(42,26,20,0.9)'); ell(g, 4, 4, d - 8, d - 8, 'rgba(22,20,34,0.45)');
    // direction notches
    const m = d / 2;
    [[m - 1, 6, 2, 3], [m - 1, d - 9, 2, 3], [6, m - 1, 3, 2], [d - 9, m - 1, 3, 2]].forEach(([x, y, w, h]) => R(g, x, y, w, h, 'rgba(244,212,154,0.55)'));
    return c;
  });
}
// the pressed/released image pair for each touch button
function touchSkins() {
  const S6 = 6;
  return {
    X: [medallion(32, 'attack', 'sword', false, S6), medallion(32, 'attack', 'sword', true, S6)],
    B: [medallion(24, 'dash', 'dash', false, S6), medallion(24, 'dash', 'dash', true, S6)],
    Y: [medallion(24, 'guard', 'shield', false, S6), medallion(24, 'guard', 'shield', true, S6)],
    A: [medallion(24, 'use', 'hand', false, S6), medallion(24, 'use', 'hand', true, S6), medallion(24, 'use', 'hand', false, S6, true)],
    // menus: A confirms, B goes back
    'A.ui': [medallion(28, 'use', 'check', false, S6), medallion(28, 'use', 'check', true, S6)],
    'B.ui': [medallion(24, 'back', 'back', false, S6), medallion(24, 'back', 'back', true, S6)],
    SELECT: [medallion(20, 'slate', 'bag', false, S6), medallion(20, 'slate', 'bag', true, S6)],
    RB: [medallion(20, 'slate', 'potion', false, S6), medallion(20, 'slate', 'potion', true, S6)],
    LB: [medallion(20, 'slate', 'swap', false, S6), medallion(20, 'slate', 'swap', true, S6)],
    START: [medallion(20, 'slate', 'pause', false, S6), medallion(20, 'slate', 'pause', true, S6)],
    PENDANT: [medallion(20, 'slate', 'pendant', false, S6), medallion(20, 'slate', 'pendant', true, S6)],
    FS: [medallion(20, 'slate', 'full', false, S6), medallion(20, 'slate', 'full', true, S6)],
    SKIP: [pillBtn('SKIP', 'skip', false, S6), pillBtn('SKIP', 'skip', true, S6)],
  };
}
function skinTouchButtons() {
  const sk = touchSkins(), url = c => `url(${c.toDataURL()})`;
  document.querySelectorAll('.tbtn').forEach(b => {
    const f = sk[b.dataset.b]; if (!f) return;
    b.textContent = '';
    b.classList.add('pix');
    b.style.setProperty('--img', url(f[0])); b.style.setProperty('--img-on', url(f[1]));
    if (f[2]) b.style.setProperty('--img-glow', url(f[2]));
    const u = sk[b.dataset.b + '.ui'];
    if (u) { b.style.setProperty('--img-ui', url(u[0])); b.style.setProperty('--img-ui-on', url(u[1])); }
  });
  const stick = document.getElementById('stick');
  if (stick) { stick.classList.add('pix'); stick.style.setProperty('--img', url(stickBase(6))); }
  const knob = document.getElementById('knob');
  if (knob) { knob.classList.add('pix'); knob.style.setProperty('--img', url(medallion(16, 'slate', null, false, 6))); }
}
// small version drawn inside in-game prompts on phones; returns the canvas
function miniAction(b) {
  const m = { A: ['use', 'mHand'], B: ['dash', 'mDash'], ROLL: ['dash', 'mDash'], X: ['attack', 'mSword'], Y: ['guard', 'mShield'] }[b];
  return m ? medallion(13, m[0], m[1]) : null;
}
