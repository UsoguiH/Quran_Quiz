import { PRODUCT_ORDER, SHARK_ORDER, SHARKS, type ProductId, type SharkId } from '../data';
import {
  INK,
  SHARK_H,
  SHARK_W,
  emblemSprite,
  producerSprite,
  productSprite,
  sharkSprite,
  type Mood,
} from './sprites';

export const W = 384;
export const H = 216;

export type SceneId = 'title' | 'workshop' | 'hallway' | 'tank';

export interface View {
  scene: SceneId;
  product: ProductId;
  selected: ProductId;
  focusOnly: boolean;
  sharks: Record<SharkId, { interest: number; out: boolean }>;
  speaking: string | null;
  doorStart: number | null;
  celebrate: boolean;
  dim: boolean;
  epilogue: boolean;
  boxes: number;
  dealShark: SharkId | null;
  reducedMotion: boolean;
}

/** Where each Shark's chair sits on the stage (top-left of the 2x sprite). */
export const SEATS: Record<SharkId, { x: number; top: number }> = {
  rex: { x: 64, top: 80 },
  goldfin: { x: 128, top: 72 },
  coral: { x: 192, top: 68 },
  tiger: { x: 256, top: 72 },
  nova: { x: 320, top: 80 },
};
export const SEAT_SCALE = 2;

export const STANDS: Record<ProductId, number> = { glow: 96, pup: 192, kelp: 288 };
export const DOOR = { x: 160, y: 70, w: 64, h: 80 };
export const PRODUCER_POS = { x: 300, y: 138 };

/* ---------- primitives ---------- */

type Ctx = CanvasRenderingContext2D;

const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function disc(c: Ctx, cx: number, cy: number, r: number, col: string) {
  c.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    c.fillRect(Math.round(cx - dx), Math.round(cy + dy), dx * 2 + 1, 1);
  }
}

function glow(c: Ctx, cx: number, cy: number, r: number, col: string, alpha: number, steps = 4) {
  c.save();
  c.globalAlpha = alpha;
  for (let i = 0; i < steps; i++) disc(c, cx, cy, Math.round(r * (1 - i / steps)), col);
  c.restore();
}

function dither(c: Ctx, x: number, y: number, w: number, h: number, col: string, parity = 0) {
  c.fillStyle = col;
  for (let j = 0; j < h; j++)
    for (let i = (j + parity) % 2; i < w; i += 2) c.fillRect(x + i, y + j, 1, 1);
}

function layer(draw: (c: Ctx) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  draw(c);
  return cv;
}

const layers = new Map<string, HTMLCanvasElement>();
function cached(key: string, draw: (c: Ctx) => void) {
  let l = layers.get(key);
  if (!l) {
    l = layer(draw);
    layers.set(key, l);
  }
  return l;
}

function blit(c: Ctx, img: HTMLCanvasElement, x: number, y: number, scale = 1) {
  c.drawImage(img, Math.round(x), Math.round(y), img.width * scale, img.height * scale);
}

function bunting(c: Ctx, t: number, y0: number, sag: number, still: boolean) {
  for (let x = 0; x < W; x++) {
    const k = (x / W) * 2 - 1;
    const y = y0 + sag * (1 - k * k);
    rect(c, x, y, 1, 1, '#e8dcc0');
  }
  for (let x = 10; x < W; x += 18) {
    const k = (x / W) * 2 - 1;
    const y = Math.round(y0 + sag * (1 - k * k)) + 1;
    const sway = still ? 0 : Math.round(Math.sin(t / 700 + x) * 1);
    const col = (x / 18) % 3 < 1 ? '#1f9e87' : '#178a75';
    c.fillStyle = col;
    for (let j = 0; j < 6; j++) {
      const w = Math.max(1, 5 - j);
      c.fillRect(x - Math.floor(w / 2) + (j > 2 ? sway : 0), y + j, w, 1);
    }
  }
}

function hangingBanner(c: Ctx, x: number, y: number, w: number, h: number, t: number, still: boolean) {
  // rod
  rect(c, x - 6, y - 3, w + 12, 4, INK);
  rect(c, x - 5, y - 2, w + 10, 2, '#8e5a36');
  rect(c, x - 7, y - 4, 3, 6, '#b07844');
  rect(c, x + w + 4, y - 4, 3, 6, '#b07844');
  for (let i = 0; i < w; i++) {
    const phase = still ? 0 : t / 900;
    const scallop = Math.round(4 * Math.abs(Math.sin(((i + 5) / 12) * Math.PI)) + Math.sin(phase + i / 9) * 1.2);
    const bottom = y + h - scallop;
    let col = '#1f9e87';
    if (i < 3) col = '#3cc0a3';
    else if (i > w - 5) col = '#13695b';
    else if (i === 5 || i === w - 7) col = '#178a75';
    rect(c, x + i, y, 1, bottom - y, col);
    rect(c, x + i, bottom, 1, 1, INK);
    if (i % 12 === 0) rect(c, x + i, y + 2, 1, bottom - y - 4, '#1a8c77');
  }
  rect(c, x - 1, y, 1, h - 3, INK);
  rect(c, x + w, y, 1, h - 3, INK);
  // inner trim like the reference banner
  rect(c, x + 5, y + 5, w - 10, 1, '#5fd0b3');
  const em = emblemSprite('#e9dcb5');
  const s = w > 60 ? 3 : 2;
  blit(c, em, x + w / 2 - (em.width * s) / 2, y + h / 2 - (em.height * s) / 2 - 2, s);
}

function lampGlow(c: Ctx, x: number, y: number, t: number, still: boolean, r = 26) {
  const flick = still ? 0.16 : 0.14 + Math.sin(t / 130 + x) * 0.015 + Math.sin(t / 47 + x * 3) * 0.01;
  glow(c, x, y, r, '#ffd66b', flick, 5);
}

function sconce(c: Ctx, x: number, y: number) {
  rect(c, x - 3, y + 3, 7, 4, INK);
  rect(c, x - 2, y + 4, 5, 2, '#c98a1c');
  rect(c, x - 2, y - 3, 5, 6, INK);
  rect(c, x - 1, y - 2, 3, 4, '#ffe98a');
  rect(c, x, y - 2, 1, 1, '#fff8d8');
}

/* ---------- TANK ---------- */

function tankStatic(c: Ctx) {
  // wall bands, dithered between steps
  const bands = ['#0b222c', '#0e2a35', '#12333f', '#163d4a', '#1a4755'];
  bands.forEach((col, i) => {
    rect(c, 0, i * 18, W, 18, col);
    if (i > 0) dither(c, 0, i * 18, W, 2, bands[i - 1]);
  });
  // beams
  rect(c, 0, 0, W, 5, '#3d2317');
  rect(c, 0, 5, W, 1, INK);
  [0, 118, 260, 376].forEach((x) => {
    rect(c, x, 0, 8, 90, '#4a2c22');
    rect(c, x + 1, 0, 2, 90, '#6b3f2a');
    rect(c, x + 7, 0, 1, 90, INK);
  });
  // aquarium frames
  [18, 272].forEach((x) => {
    rect(c, x - 4, 14, 102, 74, INK);
    rect(c, x - 3, 15, 100, 72, '#6b3f2a');
    rect(c, x - 3, 15, 100, 2, '#8e5a36');
    rect(c, x - 1, 17, 96, 68, INK);
  });
  // wainscot
  rect(c, 0, 88, W, 18, '#4a2c22');
  rect(c, 0, 88, W, 2, '#8e5a36');
  rect(c, 0, 90, W, 1, INK);
  for (let x = 4; x < W; x += 32) {
    rect(c, x, 93, 26, 10, '#5a3526');
    rect(c, x, 93, 26, 1, '#3d2317');
    rect(c, x, 102, 26, 1, '#6b3f2a');
  }
  rect(c, 0, 105, W, 1, INK);
  // floor boards in perspective
  const vx = 192;
  const vy = 30;
  for (let y = 106; y < H; y++) {
    const d = (y - vy) / 100;
    for (let k = -40; k <= 40; k++) {
      const x1 = vx + k * 16 * d;
      const x2 = vx + (k + 1) * 16 * d;
      if (x2 < 0 || x1 > W) continue;
      const row = Math.floor(Math.log(y - vy) * 9);
      rect(c, x1, y, x2 - x1 + 1, 1, (k + row) % 2 === 0 ? '#6b3f2a' : '#76462e');
      rect(c, x1, y, 1, 1, '#4a2a1c');
    }
    const prev = Math.floor(Math.log(y - 1 - vy) * 9);
    if (prev !== Math.floor(Math.log(y - vy) * 9)) rect(c, 0, y, W, 1, '#5a3421');
  }
  // rug
  const top = 112;
  const bot = 174;
  for (let y = top; y <= bot; y++) {
    const f = (y - top) / (bot - top);
    const l = Math.round(56 - f * 40);
    const r = Math.round(328 + f * 40);
    const edge = y - top < 3 || bot - y < 3;
    rect(c, l - 1, y, r - l + 2, 1, INK);
    rect(c, l, y, r - l, 1, edge ? '#1f9e87' : '#a8452f');
    if (!edge) {
      rect(c, l, y, 3, 1, '#1f9e87');
      rect(c, r - 3, y, 3, 1, '#1f9e87');
      if (y - top === 5 || bot - y === 5) rect(c, l + 5, y, r - l - 10, 1, '#e8cf9a');
      rect(c, l + 5, y, 1, 1, '#e8cf9a');
      rect(c, r - 6, y, 1, 1, '#e8cf9a');
      if (y - top > 7 && bot - y > 7)
        for (let x = l + 9; x < r - 9; x++) {
          const dx = (x - 192) & 15;
          const dy = (y - top) & 15;
          if (Math.abs(dx - 8) + Math.abs(dy - 8) === 5) rect(c, x, y, 1, 1, '#d8704f');
          if (dx === 8 && dy === 8) rect(c, x, y, 1, 1, '#e8cf9a');
        }
    }
  }
  // side tables with water glasses
  [96, 160, 224, 288].forEach((x, i) => {
    const y = i === 0 || i === 3 ? 120 : 114;
    rect(c, x - 7, y - 1, 14, 5, INK);
    rect(c, x - 6, y, 12, 3, '#8e5a36');
    rect(c, x - 6, y, 12, 1, '#b07844');
    rect(c, x - 1, y + 4, 3, 14, INK);
    rect(c, x, y + 4, 1, 14, '#5a3421');
    rect(c, x - 4, y + 17, 9, 2, INK);
    rect(c, x - 2, y - 6, 4, 6, '#bfe3ea');
    rect(c, x - 2, y - 6, 1, 6, '#e9f7fa');
    rect(c, x - 2, y - 3, 4, 3, '#8cc9d6');
  });
  // pedestal with your product, bottom left, first person
  rect(c, 6, 180, 54, 36, INK);
  rect(c, 7, 181, 52, 35, '#8e5a36');
  rect(c, 7, 181, 52, 5, '#f4e6c4');
  rect(c, 7, 186, 52, 1, '#d9c49a');
  rect(c, 7, 190, 52, 1, '#6b3f2a');
  rect(c, 12, 196, 42, 14, '#76462e');
}

function tankWater(c: Ctx, t: number, still: boolean) {
  [18, 272].forEach((x0, w) => {
    for (let j = 0; j < 68; j++) {
      const col = j < 20 ? '#2b8a93' : j < 40 ? '#227782' : j < 56 ? '#1b6570' : '#15545e';
      rect(c, x0 - 1, 17 + j, 96, 1, col);
    }
    // caustic shimmer
    for (let i = 0; i < 14; i++) {
      const cx = x0 + ((i * 29 + (still ? 0 : t / 60) * (i % 2 ? 1 : -1)) % 96 + 96) % 96;
      const cy = 20 + ((i * 17) % 30);
      rect(c, cx - 1, cy, Math.min(6, x0 + 95 - cx), 1, '#5fc4c4');
    }
    // sand and kelp
    rect(c, x0 - 1, 78, 96, 7, '#c9a86a');
    dither(c, x0 - 1, 78, 96, 2, '#1b6570', 1);
    for (let k = 0; k < 6; k++) {
      const kx = x0 + 8 + k * 15 + w * 5;
      const hgt = 16 + ((k * 7) % 14);
      for (let j = 0; j < hgt; j++) {
        const sway = still ? 0 : Math.round(Math.sin(t / 600 + j / 4 + k) * (j / 8));
        rect(c, kx + sway, 78 - j, 2, 1, j % 5 === 0 ? '#3fae6a' : '#2f8f5a');
      }
    }
    // fish
    const fx = x0 + ((((still ? 20 : t / 40) + w * 50) % 120) - 12);
    const fy = 40 + Math.round(Math.sin(t / 700 + w) * 4) + w * 10;
    const dir = w === 0 ? 1 : -1;
    const fishX = dir === 1 ? fx : x0 + 96 - (fx - x0);
    if (fishX > x0 && fishX < x0 + 88) {
      rect(c, fishX, fy, 6, 3, '#f2b134');
      rect(c, fishX + (dir === 1 ? -2 : 6), fy - 1, 2, 5, '#e8793a');
      rect(c, fishX + (dir === 1 ? 4 : 1), fy, 1, 1, INK);
    }
    // bubbles
    for (let b = 0; b < 5; b++) {
      const bx = x0 + 10 + b * 19;
      const by = 78 - (((still ? 30 : t / 30) + b * 23) % 60);
      rect(c, bx + Math.round(Math.sin(by / 6)), by, 2, 2, '#bfeef0');
    }
    // glass glare
    for (let g = 0; g < 10; g++) rect(c, x0 + 70 + g, 20 + g * 2, 2, 2, 'rgba(255,255,255,0.18)');
  });
}

function sharkMood(interest: number): Mood {
  if (interest >= 65) return 'happy';
  if (interest < 35) return 'angry';
  return 'neutral';
}

function paintTank(c: Ctx, t: number, v: View) {
  const still = v.reducedMotion;
  c.drawImage(cached('tank', tankStatic), 0, 0);
  tankWater(c, t, still);
  hangingBanner(c, 152, 12, 80, 62, t, still);
  sconce(c, 136, 40);
  sconce(c, 248, 40);
  lampGlow(c, 136, 40, t, still);
  lampGlow(c, 248, 40, t, still);

  // light cones over chairs
  c.save();
  c.globalAlpha = 0.06;
  SHARK_ORDER.forEach((id) => {
    const s = SEATS[id];
    c.fillStyle = v.sharks[id].out ? '#6b8a9a' : '#ffe7a0';
    for (let y = 0; y < s.top + 60; y++) {
      const w = 10 + (y / (s.top + 60)) * 40;
      c.fillRect(Math.round(s.x - w / 2), y, Math.round(w), 1);
    }
  });
  c.restore();

  SHARK_ORDER.forEach((id, i) => {
    const s = SEATS[id];
    const st = v.sharks[id];
    const talking = v.speaking === id;
    const talkFrame = talking && !still && Math.floor(t / 140) % 2 === 0;
    const blink = !still && (t + i * 1370) % 4200 < 130;
    const bob = still ? 0 : talking ? (Math.floor(t / 200) % 2) : Math.floor((t + i * 400) / 900) % 2;
    const mood: Mood = st.out ? 'neutral' : v.dealShark === id ? 'happy' : sharkMood(st.interest);
    const img = sharkSprite(id, mood, blink, talkFrame, st.out);
    const x = s.x - (SHARK_W * SEAT_SCALE) / 2;
    // shadow
    c.save();
    c.globalAlpha = 0.3;
    disc(c, s.x, s.top + SHARK_H * SEAT_SCALE - 2, 3, '#1a0f0b');
    rect(c, s.x - 22, s.top + SHARK_H * SEAT_SCALE - 3, 44, 4, '#1a0f0b');
    c.restore();
    c.drawImage(img, 0, 0, SHARK_W, 20, Math.round(x), s.top + bob, SHARK_W * 2, 40);
    c.drawImage(img, 0, 20, SHARK_W, SHARK_H - 20, Math.round(x), s.top + 40, SHARK_W * 2, (SHARK_H - 20) * 2);
    if (talking) {
      rect(c, s.x - 1, s.top - 6 + bob, 2, 2, '#ffe98a');
    }
  });

  // product on the pedestal
  const p = productSprite(v.product);
  const bob = still ? 0 : Math.floor(t / 600) % 2;
  glow(c, 33, 170, 18, '#ffd66b', 0.12, 3);
  blit(c, p, 15, 145 + bob, 3);

  // first-person hand holding cue cards
  const hb = still ? 0 : Math.round(Math.sin(t / 500) * 1.5);
  const hx = 330;
  const hy = 176 + hb;
  rect(c, hx - 1, hy - 1, 44, 32, INK);
  rect(c, hx, hy, 42, 30, '#f4ead2');
  rect(c, hx + 4, hy - 4, 42, 30, INK);
  rect(c, hx + 5, hy - 3, 40, 28, '#fbf3dc');
  for (let l = 0; l < 4; l++) rect(c, hx + 9, hy + 3 + l * 5, 24 - l * 4, 1, '#9a8a70');
  rect(c, hx + 9, hy + 3, 3, 1, '#c8452f');
  // thumb and hand
  rect(c, hx + 16, hy + 18, 20, 30, INK);
  rect(c, hx + 17, hy + 19, 18, 30, '#e0a878');
  rect(c, hx + 12, hy + 16, 10, 8, INK);
  rect(c, hx + 13, hy + 17, 8, 6, '#f0c29a');
  rect(c, hx + 17, hy + 19, 18, 2, '#f0c29a');
  rect(c, hx + 17, hy + 36, 18, 12, '#2c4a7a');
  rect(c, hx + 17, hy + 36, 18, 2, '#e8dcc0');

  // floating dust in the light
  if (!still) {
    c.save();
    c.globalAlpha = 0.6;
    for (let i = 0; i < 24; i++) {
      const x = (hash(i) * W + t / (40 + i * 3)) % W;
      const y = 20 + ((hash(i + 50) * 120 + Math.sin(t / 900 + i) * 6 + H) % 120);
      rect(c, x, y, 1, 1, '#ffe7a0');
    }
    c.restore();
  }

  if (v.celebrate) confetti(c, t, still);
  if (v.dim) {
    c.fillStyle = 'rgba(8,14,22,0.5)';
    c.fillRect(0, 0, W, H);
  }
}

function confetti(c: Ctx, t: number, still: boolean) {
  const cols = ['#1f9e87', '#f2b134', '#c8452f', '#f4e6c4', '#5fd0b3'];
  for (let i = 0; i < 90; i++) {
    const sp = 20 + hash(i) * 30;
    const x = hash(i + 3) * W + Math.sin(t / 400 + i) * 6;
    const y = still ? hash(i + 9) * H : ((t / sp + hash(i + 9) * 260) % 260) - 30;
    const flip = Math.floor(t / 150 + i) % 2;
    rect(c, x, y, flip ? 3 : 1, 2, cols[i % cols.length]);
  }
}

/* ---------- HALLWAY ---------- */

const HW = { l: 124, r: 260, top: 40, bot: 150 };
const slope = 66 / 164;

function hallStatic(c: Ctx) {
  rect(c, 0, 0, W, H, '#241510');
  // side walls by column
  for (let x = 0; x < W; x++) {
    const inLeft = x < HW.l;
    const inRight = x >= HW.r;
    if (!inLeft && !inRight) continue;
    const dist = inLeft ? HW.l - x : x - HW.r + 1;
    const yT = Math.max(0, HW.top - dist * slope);
    const yB = HW.bot + dist * slope;
    const depth = Math.floor(Math.log(dist + 12) * 7);
    const base = depth % 2 === 0 ? '#5a3526' : '#633b2a';
    rect(c, x, yT, 1, yB - yT, base);
    const rail = yT + (yB - yT) * 0.6;
    rect(c, x, rail, 1, 2, '#8e5a36');
    rect(c, x, rail + 2, 1, 1, INK);
    rect(c, x, rail + 3, 1, yB - rail - 3, '#4a2c22');
    const prev = Math.floor(Math.log(dist - 1 + 12) * 7);
    if (prev !== depth) rect(c, x, yT, 1, yB - yT, '#3d2317');
    rect(c, x, yB - 1, 1, 1, INK);
  }
  // ceiling beams
  for (let d = 4; d < 170; d = Math.round(d * 1.45 + 2)) {
    const yT = HW.top - d * slope;
    if (yT < 0) break;
    rect(c, HW.l - d, Math.round(yT), HW.r - HW.l + d * 2, 2, '#3d2317');
  }
  // floor boards
  const vx = 192;
  const vy = 92;
  for (let y = HW.bot; y < H; y++) {
    const d = (y - vy) / 58;
    const xl = HW.l - (y - HW.bot) / slope;
    const xr = HW.r + (y - HW.bot) / slope;
    for (let k = -12; k < 12; k++) {
      const x1 = Math.max(xl, vx + k * 12 * d);
      const x2 = Math.min(xr, vx + (k + 1) * 12 * d);
      if (x2 <= x1) continue;
      rect(c, x1, y, x2 - x1 + 1, 1, k % 2 === 0 ? '#76462e' : '#6b3f2a');
      rect(c, x1, y, 1, 1, '#4a2a1c');
    }
  }
  // back wall and arch
  rect(c, HW.l, HW.top, HW.r - HW.l, HW.bot - HW.top, '#5a3526');
  for (let x = HW.l; x < HW.r; x += 9) rect(c, x, HW.top, 1, HW.bot - HW.top, '#4a2c22');
  rect(c, HW.l, HW.top, HW.r - HW.l, 3, '#3d2317');
  const ax = DOOR.x - 8;
  const aw = DOOR.w + 16;
  for (let j = 0; j < 16; j++) {
    const inset = Math.round(10 - Math.sqrt(Math.max(0, 100 - (16 - j) * (16 - j) * 0.4)));
    rect(c, ax + inset, DOOR.y - 14 + j, aw - inset * 2, 1, j < 2 ? INK : '#e8dcc0');
  }
  rect(c, ax, DOOR.y, aw, DOOR.h, INK);
  rect(c, ax + 1, DOOR.y, 6, DOOR.h, '#e8dcc0');
  rect(c, ax + aw - 7, DOOR.y, 6, DOOR.h, '#d9c49a');
  for (let y = DOOR.y + 6; y < DOOR.y + DOOR.h; y += 10) {
    rect(c, ax + 1, y, 6, 1, '#b8a888');
    rect(c, ax + aw - 7, y, 6, 1, '#b8a888');
  }
  // side-wall banners
  [
    { x0: 30, x1: 62, left: true },
    { x0: 322, x1: 354, left: false },
  ].forEach(({ x0, x1, left }) => {
    for (let x = x0; x < x1; x++) {
      const dist = left ? HW.l - x : x - HW.r + 1;
      const yT = Math.max(0, HW.top - dist * slope) + 12;
      const hgt = (HW.bot - HW.top + dist * slope * 2) * 0.42;
      const i = x - x0;
      const scal = Math.round(3 * Math.abs(Math.sin((i / 8) * Math.PI)));
      const col = i < 2 ? '#3cc0a3' : i > x1 - x0 - 3 ? '#13695b' : '#1f9e87';
      rect(c, x, yT, 1, hgt - scal, col);
      rect(c, x, yT + hgt - scal, 1, 1, INK);
      if (Math.abs(i - (x1 - x0) / 2) < 4) rect(c, x, yT + hgt * 0.35, 1, 6, '#e9dcb5');
    }
  });
  // rope posts, like the wooden sign posts in front of the hall
  [96, 288].forEach((x) => {
    rect(c, x - 3, 150, 7, 32, INK);
    rect(c, x - 2, 151, 5, 30, '#b07844');
    rect(c, x - 2, 151, 2, 30, '#d9a064');
    rect(c, x - 4, 148, 9, 4, '#e8dcc0');
    rect(c, x - 4, 181, 9, 3, INK);
  });
}

function paintHallway(c: Ctx, t: number, v: View) {
  const still = v.reducedMotion;
  c.drawImage(cached('hall', hallStatic), 0, 0);
  const open = v.doorStart === null ? 0 : Math.min(1, (t - v.doorStart) / 1200);
  const ease = open * open * (3 - 2 * open);

  // door
  const { x, y, w, h } = DOOR;
  rect(c, x, y, w, h, '#fff4c8');
  const half = w / 2;
  const pw = Math.round(half * (1 - ease));
  [0, 1].forEach((side) => {
    if (pw <= 0) return;
    const px = side === 0 ? x : x + w - pw;
    rect(c, px, y, pw, h, INK);
    rect(c, px + 1, y + 1, Math.max(0, pw - 2), h - 1, '#b8322a');
    if (pw > 8) {
      rect(c, px + 4, y + 5, pw - 8, 14, '#ffd66b');
      rect(c, px + 4, y + 5, pw - 8, 1, INK);
      rect(c, px + 4 + Math.floor((pw - 8) / 2), y + 5, 1, 14, INK);
      rect(c, px + 4, y + 24, pw - 8, h - 30, '#8c2420');
      rect(c, px + 5, y + 25, pw - 10, h - 32, '#a02a24');
      for (let sy = y + 28; sy < y + h - 6; sy += 10) {
        rect(c, px + 6, sy, 2, 2, '#f2b134');
        rect(c, px + pw - 8, sy, 2, 2, '#f2b134');
      }
      rect(c, side === 0 ? px + pw - 4 : px + 2, y + 50, 2, 5, '#f2b134');
    }
  });
  // lamp above the door
  rect(c, 190, 44, 5, 8, INK);
  rect(c, 191, 45, 3, 6, '#ffe98a');
  lampGlow(c, 192, 48, t, still, 22);

  // light path toward the camera
  c.save();
  c.globalAlpha = 0.22 + ease * 0.35;
  for (let yy = y + h; yy < H; yy++) {
    const f = (yy - (y + h)) / (H - y - h);
    const l = x + 4 - f * 56;
    const r = x + w - 4 + f * 56;
    rect(c, l, yy, r - l, 1, '#ffe7a0');
    if (yy % 2 === 0) {
      rect(c, l - 2, yy, 2, 1, '#ffe7a0');
      rect(c, r, yy, 2, 1, '#ffe7a0');
    }
  }
  c.globalAlpha = 0.18 + ease * 0.3;
  for (let yy = y + h; yy < H; yy++) {
    const f = (yy - (y + h)) / (H - y - h);
    rect(c, x + 20 - f * 20, yy, w - 40 + f * 40, 1, '#fff8d8');
  }
  c.restore();
  if (ease > 0) glow(c, 192, 110, 70, '#fff4c8', ease * 0.35, 5);

  sconce(c, 100, 70);
  sconce(c, 284, 70);
  lampGlow(c, 100, 70, t, still);
  lampGlow(c, 284, 70, t, still);
  bunting(c, t, 8, 16, still);

  // producer
  const talking = v.speaking === 'producer';
  const blink = !still && t % 3900 < 130;
  const pImg = producerSprite(talking && !still && Math.floor(t / 140) % 2 === 0, blink);
  const pb = still ? 0 : Math.floor(t / 800) % 2;
  c.save();
  c.globalAlpha = 0.3;
  rect(c, PRODUCER_POS.x - 12, PRODUCER_POS.y + 42, 24, 4, '#1a0f0b');
  c.restore();
  blit(c, pImg, PRODUCER_POS.x - 16, PRODUCER_POS.y + pb, 2);

  if (!still) dustInLight(c, t);
}

function dustInLight(c: Ctx, t: number) {
  c.save();
  c.globalAlpha = 0.7;
  for (let i = 0; i < 18; i++) {
    const f = hash(i + 7);
    const yy = 150 + ((hash(i) * 60 + t / (60 + i * 5)) % 66);
    const span = 64 + ((yy - 150) / 66) * 112;
    const xx = 192 - span / 2 + f * span + Math.sin(t / 800 + i) * 3;
    rect(c, xx, H - (yy - 150) - 1, 1, 1, '#fff8d8');
  }
  c.restore();
}

/* ---------- WORKSHOP ---------- */

function workshopStatic(c: Ctx, day: boolean) {
  // pegboard wall
  rect(c, 0, 0, W, 120, day ? '#d2a670' : '#b58a58');
  for (let y = 10; y < 116; y += 6) for (let x = 12; x < W - 8; x += 6) rect(c, x, y, 1, 1, day ? '#a57a4a' : '#8a6238');
  rect(c, 0, 0, W, 6, '#3d2317');
  rect(c, 0, 6, W, 1, INK);
  [0, 376].forEach((x) => {
    rect(c, x, 0, 8, 120, '#4a2c22');
    rect(c, x + 1, 0, 2, 120, '#6b3f2a');
  });
  // window
  rect(c, 294, 14, 64, 50, INK);
  rect(c, 296, 16, 60, 46, day ? '#9fd6e0' : '#1a2a4a');
  if (day) {
    rect(c, 302, 26, 16, 4, '#f4f8f0');
    rect(c, 306, 23, 9, 3, '#f4f8f0');
    rect(c, 332, 40, 18, 4, '#f4f8f0');
    disc(c, 344, 26, 5, '#ffe98a');
  } else {
    disc(c, 340, 28, 6, '#f4e6c4');
    disc(c, 343, 26, 5, '#1a2a4a');
    [
      [304, 22], [318, 40], [326, 20], [308, 50], [350, 48], [332, 54],
    ].forEach(([sx, sy]) => rect(c, sx, sy, 1, 1, '#f4e6c4'));
  }
  rect(c, 325, 16, 2, 46, INK);
  rect(c, 296, 38, 60, 2, INK);
  rect(c, 292, 62, 68, 4, '#8e5a36');
  rect(c, 292, 66, 68, 1, INK);
  // blueprint
  rect(c, 150, 18, 58, 44, INK);
  rect(c, 151, 19, 56, 42, '#2c5a8a');
  for (let i = 0; i < 6; i++) rect(c, 155, 24 + i * 6, 20 + ((i * 13) % 26), 1, '#9cc4e8');
  rect(c, 184, 26, 16, 16, '#9cc4e8');
  rect(c, 185, 27, 14, 14, '#2c5a8a');
  disc(c, 192, 34, 4, '#9cc4e8');
  disc(c, 192, 34, 3, '#2c5a8a');
  rect(c, 176, 16, 4, 4, '#c8452f');
  // tools
  rect(c, 26, 22, 3, 30, '#8e5a36');
  rect(c, 20, 18, 15, 7, '#7d8a96');
  rect(c, 20, 18, 15, 1, '#b8c4ce');
  rect(c, 46, 20, 4, 34, '#9aa6b0');
  disc(c, 48, 20, 5, '#9aa6b0');
  disc(c, 48, 18, 2, '#b58a58');
  rect(c, 62, 22, 26, 12, '#b8c4ce');
  for (let x = 62; x < 88; x += 2) rect(c, x, 34, 1, 2, '#b8c4ce');
  rect(c, 86, 20, 10, 14, '#8e5a36');
  rect(c, 104, 24, 30, 5, '#f2b134');
  for (let x = 106; x < 134; x += 4) rect(c, x, 24, 1, 2, INK);
  // shelf
  rect(c, 220, 70, 64, 4, '#8e5a36');
  rect(c, 220, 74, 64, 1, INK);
  rect(c, 226, 58, 12, 12, '#c9a06a');
  rect(c, 226, 58, 12, 2, '#a57a4a');
  rect(c, 244, 60, 8, 10, '#5fd0b3');
  rect(c, 244, 60, 8, 2, INK);
  rect(c, 258, 54, 16, 16, '#c8452f');
  rect(c, 260, 58, 12, 3, '#f4e6c4');
  // workbench
  rect(c, 0, 118, W, 2, INK);
  rect(c, 0, 120, W, 8, '#b07844');
  for (let x = 20; x < W; x += 46) rect(c, x, 120, 1, 8, '#8e5a36');
  rect(c, 0, 120, W, 1, '#d9a064');
  rect(c, 0, 128, W, 1, INK);
  rect(c, 0, 129, W, 24, '#6b3f2a');
  [40, 150, 234, 344].forEach((x) => {
    rect(c, x - 22, 133, 44, 16, '#5a3421');
    rect(c, x - 22, 133, 44, 1, INK);
    rect(c, x - 4, 139, 8, 2, '#f2b134');
  });
  rect(c, 0, 153, W, 1, INK);
  // floor
  for (let y = 154; y < H; y++) {
    const band = Math.floor((y - 154) / 9);
    rect(c, 0, y, W, 1, band % 2 === 0 ? '#7a4a2c' : '#83502f');
    if ((y - 154) % 9 === 0) rect(c, 0, y, W, 1, '#5a3421');
  }
  for (let y = 154; y < H; y += 9)
    for (let x = ((y / 9) % 2) * 40 + 10; x < W; x += 80) rect(c, x, y, 1, 9, '#5a3421');
  // rug
  rect(c, 60, 172, 264, 44, INK);
  rect(c, 61, 173, 262, 43, '#1f9e87');
  rect(c, 65, 177, 254, 39, '#a8452f');
  rect(c, 69, 181, 246, 1, '#e8cf9a');
  for (let x = 75; x < 310; x += 10) rect(c, x, 186, 4, 4, '#d8704f');
}

function paintWorkshop(c: Ctx, t: number, v: View) {
  const still = v.reducedMotion;
  c.drawImage(cached(v.epilogue ? 'shop-day' : 'shop-night', (cc) => workshopStatic(cc, v.epilogue)), 0, 0);
  // hanging bulb
  rect(c, 192, 7, 1, 20, INK);
  rect(c, 189, 26, 7, 3, INK);
  rect(c, 189, 29, 7, 6, '#ffe98a');
  rect(c, 190, 30, 2, 2, '#fff8d8');
  lampGlow(c, 192, 34, t, still, 60);
  bunting(c, t, 8, 12, still);

  const list: ProductId[] = v.epilogue ? [v.product] : PRODUCT_ORDER;
  list.forEach((id) => {
    const x = v.epilogue ? 192 : STANDS[id];
    const chosen = id === v.selected;
    const dimmed = v.focusOnly && !chosen;
    // stand with cloth
    rect(c, x - 19, 105, 38, 15, INK);
    rect(c, x - 18, 106, 36, 14, '#8e5a36');
    rect(c, x - 18, 106, 36, 5, '#f4e6c4');
    rect(c, x - 18, 111, 36, 1, '#d9c49a');
    rect(c, x - 16, 114, 32, 6, '#6b3f2a');
    if (chosen && !dimmed) glow(c, x, 98, 20, '#ffd66b', 0.16, 3);
    const bob = chosen && !still ? Math.floor(t / 400) % 2 : 0;
    c.save();
    if (dimmed) c.globalAlpha = 0.35;
    blit(c, productSprite(id), x - 12, 82 - bob, 2);
    c.restore();
    if (chosen && !v.epilogue) {
      const ay = 70 + (still ? 0 : Math.round(Math.sin(t / 180) * 2));
      c.fillStyle = INK;
      for (let j = 0; j < 6; j++) c.fillRect(x - 6 + j, ay + j, 13 - j * 2, 1);
      c.fillStyle = '#f4e6c4';
      for (let j = 0; j < 4; j++) c.fillRect(x - 4 + j, ay + 1 + j, 9 - j * 2, 1);
    }
  });

  if (v.epilogue) {
    // stacked shipping boxes
    const n = Math.min(14, v.boxes);
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0;
      const k = Math.floor(i / 2);
      const row = k < 4 ? 0 : k < 6 ? 1 : 2;
      const col = k < 4 ? k : k < 6 ? k - 4 : 0;
      const bx = left ? 10 + col * 22 + row * 11 : W - 30 - col * 22 - row * 11;
      const by = 196 - row * 17;
      rect(c, bx, by, 20, 17, INK);
      rect(c, bx + 1, by + 1, 18, 15, '#c9a06a');
      rect(c, bx + 1, by + 1, 18, 3, '#d9b27a');
      rect(c, bx + 8, by + 1, 4, 15, '#e8dcc0');
      rect(c, bx + 3, by + 9, 4, 3, '#1f9e87');
    }
    if (v.dealShark) {
      // framed photo with your Shark
      rect(c, 104, 40, 30, 30, INK);
      rect(c, 106, 42, 26, 26, '#f2b134');
      rect(c, 108, 44, 22, 22, '#9fd6e0');
      const s = SHARKS[v.dealShark];
      disc(c, 119, 52, 5, s.palette.s);
      rect(c, 114, 46, 11, 3, s.palette.h);
      rect(c, 112, 58, 14, 8, s.palette.c);
    }
    if (v.celebrate) confetti(c, t, still);
  }
  if (!still) {
    c.save();
    c.globalAlpha = 0.5;
    for (let i = 0; i < 14; i++) {
      const x = 150 + hash(i) * 84 + Math.sin(t / 700 + i) * 4;
      const y = 30 + ((hash(i + 20) * 80 + t / (70 + i * 4)) % 80);
      rect(c, x, y, 1, 1, '#fff8d8');
    }
    c.restore();
  }
}

/* ---------- TITLE ---------- */

function titleStatic(c: Ctx) {
  const sky = ['#8fcfc4', '#9dd6c6', '#acdcc6', '#bfe2c6'];
  sky.forEach((col, i) => {
    rect(c, 0, i * 20, W, 20, col);
    if (i) dither(c, 0, i * 20, W, 2, sky[i - 1]);
  });
  [
    [30, 18, 40], [120, 10, 28], [300, 24, 44],
  ].forEach(([x, y, w]) => {
    rect(c, x, y, w, 5, '#f4f8ec');
    rect(c, x + 6, y - 4, w - 16, 4, '#f4f8ec');
    rect(c, x, y + 5, w, 1, '#d6ebe0');
  });
  // far trees
  for (let x = 0; x < W; x++) {
    const h = 14 + Math.round(Math.abs(Math.sin(x / 11)) * 8 + Math.sin(x / 5) * 2);
    rect(c, x, 86 - h, 1, h, '#3f7a3a');
    rect(c, x, 86 - h, 1, 1, '#2e5e2c');
  }
  // grass
  rect(c, 0, 86, W, 130, '#a4c63c');
  for (let i = 0; i < 400; i++) {
    const x = Math.floor(hash(i) * W);
    const y = 90 + Math.floor(hash(i + 400) * 124);
    rect(c, x, y, 1, 2, '#8bb535');
    if (i % 3 === 0) rect(c, x + 1, y, 1, 1, '#c4dc5a');
  }
  // hall
  const bx = 48;
  const bw = 256;
  rect(c, bx - 6, 30, bw + 12, 10, INK);
  rect(c, bx - 5, 31, bw + 10, 8, '#3d2317');
  for (let x = bx - 4; x < bx + bw + 4; x += 6) rect(c, x, 36, 3, 3, '#2a1712');
  rect(c, bx, 40, bw, 118, INK);
  for (let x = bx + 1; x < bx + bw - 1; x++) {
    const plank = Math.floor((x - bx) / 7);
    rect(c, x, 41, 1, 116, plank % 2 === 0 ? '#6b3a2a' : '#5e3224');
    if ((x - bx) % 7 === 0) rect(c, x, 41, 1, 116, '#3d2317');
  }
  for (let y = 60; y < 150; y += 30) rect(c, bx + 1, y, bw - 2, 2, '#3d2317');
  [bx, bx + bw - 6].forEach((x) => {
    rect(c, x, 40, 6, 118, '#4a2c22');
    rect(c, x + 1, 40, 2, 118, '#8e5a36');
  });
  // base stones and hedges
  rect(c, bx - 4, 150, bw + 8, 10, '#8e8676');
  for (let x = bx - 4; x < bx + bw + 4; x += 10) rect(c, x, 150, 1, 10, '#6b6456');
  rect(c, bx - 4, 150, bw + 8, 1, INK);
  for (let x = bx - 6; x < bx + bw + 6; x += 7) disc(c, x, 160, 5, '#6fa33a');
  for (let x = bx - 4; x < bx + bw + 6; x += 7) disc(c, x, 158, 2, '#8bc04a');
  // door with arch
  const dx = 104;
  for (let j = 0; j < 12; j++) {
    const inset = Math.round(12 - Math.sqrt(Math.max(0, 144 - (12 - j) * (12 - j))));
    rect(c, dx - 8 + inset, 104 + j, 56 - inset * 2, 1, j < 1 ? INK : '#e8dcc0');
  }
  rect(c, dx - 8, 116, 56, 42, INK);
  rect(c, dx - 7, 116, 6, 42, '#e8dcc0');
  rect(c, dx + 41, 116, 6, 42, '#d9c49a');
  rect(c, dx, 116, 40, 42, '#b8322a');
  rect(c, dx + 3, 119, 34, 9, '#ffd66b');
  [dx + 11, dx + 19, dx + 27].forEach((x) => rect(c, x, 119, 1, 9, INK));
  rect(c, dx + 19, 128, 2, 30, INK);
  for (let y = 132; y < 156; y += 6) {
    rect(c, dx + 4, y, 2, 2, '#f2b134');
    rect(c, dx + 34, y, 2, 2, '#f2b134');
  }
  // light path from the door
  c.save();
  c.globalAlpha = 0.45;
  for (let y = 160; y < H; y++) {
    const f = (y - 160) / (H - 160);
    rect(c, dx - 2 - f * 10, y, 44 + f * 20, 1, '#f7f0b0');
  }
  c.restore();
  // sign posts
  rect(c, 168, 176, 4, 16, INK);
  rect(c, 196, 176, 4, 16, INK);
  rect(c, 164, 176, 40, 8, INK);
  rect(c, 165, 177, 38, 6, '#8e5a36');
  rect(c, 172, 179, 22, 2, '#3d2317');
  // wheat
  for (let x = 250; x < 372; x++) {
    const h = 34 + Math.round(Math.sin(x / 7) * 5);
    rect(c, x, 196 - h, 1, h, x % 3 === 0 ? '#e39a1f' : '#f2b134');
    if (x % 4 === 0) rect(c, x, 196 - h - 2, 1, 3, '#ffd66b');
  }
  rect(c, 250, 196, 122, 1, '#c98a1c');
  // tree
  rect(c, 346, 96, 10, 60, INK);
  rect(c, 347, 96, 8, 60, '#6b3f2a');
  disc(c, 350, 70, 32, INK);
  disc(c, 350, 70, 31, '#e8793a');
  disc(c, 342, 62, 18, '#f29a4a');
  disc(c, 360, 82, 14, '#c95f28');
  // stump
  rect(c, 222, 184, 20, 12, INK);
  rect(c, 223, 185, 18, 10, '#8e5a36');
  rect(c, 223, 185, 18, 3, '#c9a06a');
  rect(c, 230, 186, 4, 1, '#8e5a36');
}

function paintTitle(c: Ctx, t: number, v: View) {
  const still = v.reducedMotion;
  c.drawImage(cached('title', titleStatic), 0, 0);
  hangingBanner(c, 176, 42, 76, 100, t, still);
  lampGlow(c, 124, 112, t, still, 20);
  if (!still) {
    for (let i = 0; i < 10; i++) {
      const x = (hash(i) * W + t / 30) % W;
      const y = 100 + hash(i + 5) * 100 + Math.sin(t / 500 + i) * 4;
      rect(c, x, y, 1, 1, '#fff8d8');
    }
  }
}

export function paint(c: Ctx, t: number, v: View) {
  c.imageSmoothingEnabled = false;
  if (v.scene === 'tank') paintTank(c, t, v);
  else if (v.scene === 'hallway') paintHallway(c, t, v);
  else if (v.scene === 'workshop') paintWorkshop(c, t, v);
  else paintTitle(c, t, v);
  vignette(c);
}

function vignette(c: Ctx) {
  c.drawImage(
    cached('vignette', (cc) => {
      cc.fillStyle = '#0a0706';
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const dx = (x - W / 2) / (W / 2);
          const dy = (y - H / 2) / (H / 2);
          const d = dx * dx * 0.7 + dy * dy * 0.8;
          if (d > 1.12 && (x + y) % 2 === 0 && (x % 4 < 2 || d > 1.3)) cc.fillRect(x, y, 1, 1);
          if (d > 1.45) cc.fillRect(x, y, 1, 1);
        }
    }),
    0,
    0,
  );
}
