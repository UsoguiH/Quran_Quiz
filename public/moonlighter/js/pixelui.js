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

// ---------------------------------------------------------------- touch buttons skin (DOM)
function skinTouchButtons() {
  const map = {
    A: () => [roundBtn('A', PK.xbA, false, 6), roundBtn('A', PK.xbA, true, 6)],
    B: () => [roundBtn('B', PK.xbB, false, 6), roundBtn('B', PK.xbB, true, 6)],
    X: () => [roundBtn('X', PK.xbX, false, 6), roundBtn('X', PK.xbX, true, 6)],
    Y: () => [roundBtn('Y', PK.xbY, false, 6), roundBtn('Y', PK.xbY, true, 6)],
    SELECT: () => [keyCap('BAG', false, 6), keyCap('BAG', true, 6)],
    RB: () => [keyCap('POT', false, 6), keyCap('POT', true, 6)],
    LB: () => [keyCap('SWAP', false, 6), keyCap('SWAP', true, 6)],
    START: () => [keyCap('II', false, 6), keyCap('II', true, 6)],
    PENDANT: () => [keyCap('HOME', false, 6), keyCap('HOME', true, 6)],
  };
  document.querySelectorAll('.tbtn').forEach(b => {
    const f = map[b.dataset.b]; if (!f) return;
    const [off, on] = f();
    b.textContent = '';
    b.classList.add('pix');
    b.style.setProperty('--img', `url(${off.toDataURL()})`);
    b.style.setProperty('--img-on', `url(${on.toDataURL()})`);
  });
  const knob = document.getElementById('knob');
  if (knob) { knob.classList.add('pix'); knob.style.setProperty('--img', `url(${roundBtn(' ', PK.cream, false, 6).toDataURL()})`); }
}
