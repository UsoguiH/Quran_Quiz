import { SHARKS, type ProductId, type Shark, type SharkId } from '../data';

export type Palette = Record<string, string>;
export type Mood = 'neutral' | 'happy' | 'angry';

export const INK = '#2a1c17';

const BASE: Palette = {
  o: INK,
  e: INK,
  w: '#f4ead2',
  m: '#7a3326',
  M: '#3a1410',
  b: '#1a1a22',
  g: '#15151a',
  k: '#2a2a33',
};

const cache = new Map<string, HTMLCanvasElement>();

function greyOut(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const l = Math.round((r * 0.3 + g * 0.55 + b * 0.15) * 0.55);
  return `rgb(${l},${l + 4},${l + 12})`;
}

/** Paints a string-map sprite into a 1x canvas. '.' is transparent. */
export function sprite(key: string, rows: string[], pal: Palette, grey = false): HTMLCanvasElement {
  const k = key + (grey ? ':g' : '');
  const hit = cache.get(k);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = Math.max(...rows.map((r) => r.length));
  cv.height = rows.length;
  const c = cv.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch] ?? BASE[ch];
      if (!col) continue;
      c.fillStyle = grey ? greyOut(col) : col;
      c.fillRect(x, y, 1, 1);
    }
  });
  cache.set(k, cv);
  return cv;
}

/* ---------- characters ---------- */

const BODY = [
  '................',
  '................',
  '....oooooooo....',
  '...ohhhhhhhho...',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohsssssssSho..',
  '..ohsessssesho..',
  '..ohsessssesho..',
  '..oSssssssssSo..',
  '...oSssssssSo...',
  '....ocwttwco....',
  '..occcwttwccco..',
  '.occccwttwcccco.',
  '.occCcwttwcCcco.',
  '.osccccttccccso.',
  '..oppppppppppo..',
  '..oppppooppppo..',
  '...oppo..oppo...',
  '...oppo..oppo...',
  '..obbbo..obbbo..',
  '..ooooo..ooooo..',
];

type Grid = string[][];

const set = (g: Grid, x: number, y: number, ch: string) => {
  if (g[y] && x >= 0 && x < g[y].length) g[y][x] = ch;
};

function applyHair(g: Grid, hair: Shark['hair']) {
  if (hair === 'bald') {
    for (let y = 3; y <= 5; y++) for (let x = 3; x <= 12; x++) if (g[y][x] === 'h') set(g, x, y, 's');
    set(g, 12, 4, 'S');
    set(g, 12, 5, 'S');
    set(g, 5, 3, 'w');
    set(g, 6, 3, 'w');
  } else if (hair === 'long') {
    for (let y = 6; y <= 14; y++) {
      set(g, 1, y, 'o');
      set(g, 14, y, 'o');
      set(g, 2, y, 'h');
      set(g, 13, y, 'H');
      if (y >= 9) {
        set(g, 3, y, 'h');
        set(g, 12, y, 'H');
      }
    }
    set(g, 2, 15, 'o');
    set(g, 3, 15, 'o');
    set(g, 12, 15, 'o');
    set(g, 13, 15, 'o');
  } else if (hair === 'bun') {
    g[0] = [...'......oooo......'];
    g[1] = [...'.....ohhhho.....'];
    set(g, 7, 1, 'H');
  } else if (hair === 'spiky') {
    g[0] = [...'....o...o...o...'];
    g[1] = [...'...oho.oho.oho..'];
    g[2] = [...'...ohhhhhhhho...'];
  }
  // shade the crown
  for (let y = 3; y <= 5; y++) if (g[y][11] === 'h') set(g, 11, y, 'H');
}

function applyOutfit(g: Grid, s: Shark) {
  if (s.hoodie) {
    for (let y = 11; y <= 15; y++)
      for (let x = 0; x < 16; x++) {
        if (g[y][x] === 't') set(g, x, y, 'c');
        if (g[y][x] === 'w') set(g, x, y, 'C');
      }
    set(g, 6, 13, 'w');
    set(g, 9, 13, 'w');
  }
  if (s.glasses) {
    [4, 6, 7, 8, 9, 11].forEach((x) => set(g, x, 7, 'g'));
    set(g, 5, 7, 'e');
    set(g, 10, 7, 'e');
  }
}

function applyFace(g: Grid, mood: Mood, blink: boolean, talk: boolean) {
  if (blink) {
    set(g, 5, 7, g[7][4] === 'g' ? 'g' : 's');
    set(g, 10, 7, g[7][11] === 'g' ? 'g' : 's');
  }
  if (talk) {
    set(g, 7, 9, 'M');
    set(g, 8, 9, 'M');
    set(g, 7, 10, 'm');
    set(g, 8, 10, 'm');
    return;
  }
  if (mood === 'happy') {
    set(g, 6, 9, 'm');
    set(g, 9, 9, 'm');
    set(g, 7, 10, 'm');
    set(g, 8, 10, 'm');
  } else if (mood === 'angry') {
    set(g, 7, 9, 'm');
    set(g, 8, 9, 'm');
    set(g, 6, 10, 'm');
    set(g, 9, 10, 'm');
    set(g, 5, 6, 'e');
    set(g, 6, 6, 'e');
    set(g, 9, 6, 'e');
    set(g, 10, 6, 'e');
  } else {
    set(g, 7, 9, 'm');
    set(g, 8, 9, 'm');
  }
}

export function characterRows(s: Shark, mood: Mood, blink: boolean, talk: boolean): string[] {
  const g: Grid = BODY.map((r) => [...r]);
  applyHair(g, s.hair);
  applyOutfit(g, s);
  applyFace(g, mood, blink, talk);
  return g.map((r) => r.join(''));
}

const CHAIR = {
  o: INK,
  l: '#6a2f24',
  L: '#8a4331',
  d: '#4a1e17',
  k: '#3a1611',
  f: '#2e2e36',
  F: '#4a4a55',
};

function chairLayer(c: CanvasRenderingContext2D, front: boolean) {
  const r = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  if (!front) {
    // high back
    r(2, 0, 18, 1, CHAIR.o);
    r(1, 1, 20, 19, CHAIR.o);
    r(2, 1, 18, 18, CHAIR.l);
    r(2, 1, 2, 18, CHAIR.L);
    r(17, 1, 3, 18, CHAIR.d);
    [5, 11, 16].forEach((x) => [5, 11].forEach((y) => r(x, y, 1, 1, CHAIR.k)));
    // seat
    r(1, 18, 20, 7, CHAIR.o);
    r(2, 19, 18, 5, CHAIR.l);
    r(2, 19, 18, 1, CHAIR.L);
    // pedestal
    r(9, 25, 4, 3, CHAIR.f);
    r(4, 27, 14, 3, CHAIR.o);
    r(5, 28, 12, 1, CHAIR.F);
  } else {
    // arms
    r(0, 13, 4, 11, CHAIR.o);
    r(1, 14, 2, 9, CHAIR.l);
    r(1, 14, 2, 1, CHAIR.L);
    r(18, 13, 4, 11, CHAIR.o);
    r(19, 14, 2, 9, CHAIR.d);
    r(19, 14, 2, 1, CHAIR.L);
  }
}

export const SHARK_W = 22;
export const SHARK_H = 30;

/** Shark seated in a leather chair, 22x30 at 1x. */
export function sharkSprite(id: SharkId, mood: Mood, blink: boolean, talk: boolean, out: boolean): HTMLCanvasElement {
  const key = `shark:${id}:${mood}:${blink}:${talk}:${out}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = SHARKS[id];
  const body = sprite(`body:${id}:${mood}:${blink}:${talk}`, characterRows(s, mood, blink, talk), s.palette, out);
  const cv = document.createElement('canvas');
  cv.width = SHARK_W;
  cv.height = SHARK_H;
  const c = cv.getContext('2d')!;
  chairLayer(c, false);
  c.drawImage(body, 3, 1);
  chairLayer(c, true);
  if (out) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(12,20,30,0.45)';
    c.fillRect(0, 0, SHARK_W, SHARK_H);
  }
  cache.set(key, cv);
  return cv;
}

/** Head-and-shoulders crop for HUD portraits. */
export function portrait(id: SharkId, mood: Mood = 'neutral'): HTMLCanvasElement {
  const s = SHARKS[id];
  const rows = characterRows(s, mood, false, false).slice(0, 15);
  return sprite(`portrait:${id}:${mood}`, rows, s.palette);
}

export const PRODUCER: Shark = {
  ...SHARKS.coral,
  id: 'coral',
  name: 'Pia',
  hair: 'short',
  palette: {
    h: '#2fb39a', H: '#1f7f6d', s: '#f6d0ae', S: '#dcae8a',
    c: '#f2b134', C: '#c98a1c', t: '#2a1c17', p: '#4a3a5a',
  },
};

export function producerSprite(talk: boolean, blink: boolean): HTMLCanvasElement {
  const rows = characterRows(PRODUCER, 'happy', blink, talk);
  const g = rows.map((r) => [...r]);
  // headset
  [5, 6, 7, 8].forEach((y) => set(g, 13, y, 'k'));
  set(g, 12, 9, 'k');
  set(g, 11, 9, 'k');
  // clipboard
  for (let y = 13; y <= 16; y++) for (let x = 11; x <= 14; x++) set(g, x, y, y === 13 ? 'o' : 'w');
  return sprite(`producer:${talk}:${blink}`, g.map((r) => r.join('')), PRODUCER.palette);
}

/* ---------- products ---------- */

const PRODUCT_ART: Record<ProductId, { rows: string[]; pal: Palette }> = {
  glow: {
    rows: [
      '...oooooo...',
      '...occcco...',
      '..oooooooo..',
      '.ogglyylgGo.',
      '.oglLyyLlGo.',
      '.ogglLLlgGo.',
      '.ogggLlggGo.',
      '.oggglLggGo.',
      '.oddddddddo.',
      '.oDddddddDo.',
      '..oooooooo..',
      '............',
    ],
    pal: {
      g: '#c7ece3', G: '#8cc9c0', l: '#5fd0b3', L: '#1f9e87',
      y: '#ffe98a', d: '#8a5a36', D: '#6b3f2a', c: '#b07844',
    },
  },
  pup: {
    rows: [
      '...oooooo...',
      '..owwwwwwo..',
      '.owwwwwwwwo.',
      '.owwokkowWo.',
      '.owokbkkoWo.',
      '.owokkkkoWo.',
      '.owwokkowWo.',
      '.owwwwwwWWo.',
      '.oaaaaaaaao.',
      '..oWWWWWWo..',
      '..oooooooo..',
      '............',
    ],
    pal: { w: '#f4ead2', W: '#cdbf9f', k: '#1b2a33', b: '#5fd0b3', a: '#e8793a' },
  },
  kelp: {
    rows: [
      '..oooooooo..',
      '..oNnNnNno..',
      '.onnnnnnnno.',
      '.oneeeeeeno.',
      '.onerrrreno.',
      '.oneeeeeeno.',
      '.oneyyyyeno.',
      '.onnnnnnnno.',
      '.onNnnnnNno.',
      '.onnnnnnnno.',
      '.oNNNNNNNNo.',
      '..oooooooo..',
    ],
    pal: { n: '#2f8f6a', N: '#1d5e45', e: '#f4e6c4', r: '#c8452f', y: '#f2b134' },
  },
};

export function productSprite(id: ProductId): HTMLCanvasElement {
  const a = PRODUCT_ART[id];
  return sprite(`product:${id}`, a.rows, a.pal);
}

/* ---------- icons ---------- */

const FACE_ROWS: Record<'happy' | 'love' | 'meh' | 'angry', string[]> = {
  happy: [
    '..ooooo..',
    '.offfffo.',
    'offfffffo',
    'ofefffefo',
    'offfffffo',
    'ofmfffmfo',
    'offmmmffo',
    '.offfffo.',
    '..ooooo..',
  ],
  love: [
    '..ooooo..',
    '.offfffo.',
    'ohhfffhho',
    'ohhfffhho',
    'offfffffo',
    'offmmmffo',
    'offmmmffo',
    '.offfffo.',
    '..ooooo..',
  ],
  meh: [
    '..ooooo..',
    '.offfffo.',
    'offfffffo',
    'ofefffefo',
    'offfffffo',
    'offfffffo',
    'ofmmmmmfo',
    '.offfffo.',
    '..ooooo..',
  ],
  angry: [
    '..ooooo..',
    '.offfffo.',
    'ofkfffkfo',
    'ofekfkefo',
    'offfffffo',
    'offmmmffo',
    'ofmfffmfo',
    '.offfffo.',
    '..ooooo..',
  ],
};

const FACE_PAL: Record<string, Palette> = {
  happy: { f: '#f7d774', e: '#e8793a', m: '#1f9e87' },
  love: { f: '#f7d774', h: '#e04b4b', m: '#1f9e87' },
  meh: { f: '#e8dcae', e: '#6b5a4a', m: '#6b5a4a' },
  angry: { f: '#f08a5d', e: '#2a1c17', k: '#2a1c17', m: '#2a1c17' },
};

export function faceSprite(kind: 'happy' | 'love' | 'meh' | 'angry'): HTMLCanvasElement {
  return sprite(`face:${kind}`, FACE_ROWS[kind], FACE_PAL[kind]);
}

export function finSprite(on: boolean): HTMLCanvasElement {
  return sprite(
    `fin:${on}`,
    ['....o..', '...oto.', '..ottto', '.otttto', 'ottttto', 'ooooooo'],
    { t: on ? '#1f9e87' : '#cdbf9f' },
  );
}

export function coinSprite(): HTMLCanvasElement {
  return sprite(
    'coin',
    ['..ooo..', '.oyyyo.', 'oyYYyyo', 'oyYyyDo', 'oyyyyDo', '.oyDDo.', '..ooo..'],
    { y: '#f2b134', Y: '#ffe98a', D: '#c98a1c' },
  );
}

export const EMBLEM_ROWS = [
  '.........c......',
  '........cc......',
  '.......ccc......',
  '......cccc......',
  '.....ccccc......',
  '....cccccc......',
  '...ccccccc......',
  '..cccccccc......',
  '.cccccccccc.....',
  'cccccccccccc....',
  '................',
  '.cc..ccc...ccc..',
  'c..cc...ccc...cc',
];

export function emblemSprite(col: string): HTMLCanvasElement {
  return sprite(`emblem:${col}`, EMBLEM_ROWS, { c: col });
}
