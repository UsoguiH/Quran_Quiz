import { SHARKS, type ProductId, type SharkId } from '../data';
import { H, W, blit, confetti, disc, dither, glow, hash, paintScene, rect, type View } from './scenes';
import { INK, emblemSprite, envelopeSprite, productSprite } from './sprites';

type Ctx = CanvasRenderingContext2D;

let buffer: HTMLCanvasElement | null = null;
function buf(): Ctx {
  if (!buffer) {
    buffer = document.createElement('canvas');
    buffer.width = W;
    buffer.height = H;
  }
  const c = buffer.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  return c;
}

export const ease = (k: number) => k * k * (3 - 2 * k);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp01 = (k: number) => Math.max(0, Math.min(1, k));

/** Paints a scene into a buffer, then blows it up around (cx, cy) with hard pixels. */
export function zoomed(c: Ctx, t: number, v: View, zoom: number, cx: number, cy: number, extra?: (b: Ctx) => void) {
  const b = buf();
  b.clearRect(0, 0, W, H);
  paintScene(b, t, v);
  extra?.(b);
  const sw = W / zoom;
  const sh = H / zoom;
  const sx = Math.max(0, Math.min(W - sw, cx - sw / 2));
  const sy = Math.max(0, Math.min(H - sh, cy - sh / 2));
  c.imageSmoothingEnabled = false;
  c.drawImage(buffer!, sx, sy, sw, sh, 0, 0, W, H);
}

export function fill(c: Ctx, col: string, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = col;
  c.fillRect(0, 0, W, H);
  c.restore();
}

export function sparks(c: Ctx, t: number, x: number, y: number) {
  for (let i = 0; i < 10; i++) {
    const life = ((t / 7 + i * 37) % 60) / 60;
    const a = hash(i + Math.floor((t / 7 + i * 37) / 60)) * Math.PI - Math.PI;
    const r = life * 22;
    rect(c, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7 + life * life * 18, 1, 1, life < 0.5 ? '#fff8d8' : '#f2b134');
  }
}

export function envelope(c: Ctx, x: number, y: number, scale: number) {
  blit(c, envelopeSprite(), x - 7 * scale, y - 5 * scale, scale);
}

/** The invitation, filling the frame. */
export function letter(c: Ctx, t: number) {
  rect(c, 0, 0, W, H, '#3d2317');
  for (let y = 0; y < H; y += 12) rect(c, 0, y, W, 1, '#4a2c22');
  const x = 92;
  const y = 18;
  rect(c, x - 2, y - 2, 204, 184, INK);
  rect(c, x, y, 200, 180, '#f4e6c4');
  rect(c, x, y, 200, 3, '#fbf3dc');
  rect(c, x + 8, y + 8, 184, 1, '#d9c49a');
  rect(c, x + 8, y + 171, 184, 1, '#d9c49a');
  blit(c, emblemSprite('#1f9e87'), 192 - 24, y + 16, 3);
  // wax seal
  disc(c, 192, y + 150, 11, INK);
  disc(c, 192, y + 150, 10, '#c8452f');
  disc(c, 190, y + 147, 3, '#e06a52');
  glow(c, 192, 110, 110, '#ffe7a0', 0.05 + Math.sin(t / 300) * 0.01, 3);
}

/** Thick pixel stroke with an ink outline, used for arms. */
function limb(c: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, col: string, shade: string) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (const pass of [0, 1, 2]) {
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      if (pass === 0) rect(c, x - w / 2 - 1, y - w / 2 - 1, w + 2, w + 2, INK);
      else if (pass === 1) rect(c, x - w / 2, y - w / 2, w, w, col);
      else rect(c, x - w / 2, y + w / 2 - 4, w, 4, shade);
    }
  }
}

const YOU = { sleeve: '#c98a1c', shade: '#a06a10', cuff: '#f4ead2', skin: '#f0c29a', skinShade: '#d49a73' };

function palm(c: Ctx, x: number, y: number, skin: string, shade: string, flip: boolean) {
  rect(c, x - 17, y - 13, 34, 26, INK);
  rect(c, x - 16, y - 12, 32, 24, skin);
  rect(c, x - 16, y + 7, 32, 5, shade);
  // knuckle creases on the far side of the palm
  for (let i = 0; i < 3; i++) rect(c, flip ? x - 14 : x + 8, y - 7 + i * 6, 6, 1, shade);
}

function yourHand(c: Ctx, x: number, y: number) {
  limb(c, x - 150, y + 110, x - 22, y + 6, 30, YOU.sleeve, YOU.shade);
  rect(c, x - 30, y - 6, 8, 26, YOU.cuff);
  palm(c, x - 4, y + 4, YOU.skin, YOU.skinShade, false);
  // thumb over the top
  rect(c, x - 2, y - 15, 16, 9, INK);
  rect(c, x - 1, y - 14, 14, 7, '#f6d0ae');
}

function sharkHand(c: Ctx, x: number, y: number, id: SharkId) {
  const pal = SHARKS[id].palette;
  limb(c, x + 170, y - 70, x + 24, y + 2, 30, pal.c, pal.C);
  rect(c, x + 20, y - 10, 8, 26, '#f4ead2');
  palm(c, x + 4, y + 2, pal.s, pal.S, true);
}

/** First-person handshake over the dimmed Tank. k runs 0..1 across the shot. */
export function handshake(c: Ctx, t: number, k: number, v: View, id: SharkId) {
  paintScene(c, t, v);
  fill(c, '#0a0706', 0.55);
  glow(c, 192, 120, 90, '#ffd66b', 0.12, 4);
  const reach = ease(clamp01(k / 0.35));
  const shake = k > 0.35 ? Math.round(Math.sin((k - 0.35) * 40) * 4 * (1 - k)) : 0;
  const yx = lerp(60, 186, reach);
  const sx = lerp(340, 198, reach);
  yourHand(c, yx, 126 + shake);
  sharkHand(c, sx, 124 + shake, id);
  if (k > 0.35) confetti(c, t, false);
}

/** Store shelves filling up with your product. */
export function shelves(c: Ctx, t: number, k: number, product: ProductId) {
  rect(c, 0, 0, W, H, '#e8dcc0');
  for (let x = 0; x < W; x += 24) rect(c, x, 0, 1, H, '#ddcfae');
  rect(c, 0, 0, W, 22, '#1f9e87');
  rect(c, 0, 22, W, 2, INK);
  for (let x = 12; x < W; x += 48) blit(c, emblemSprite('#e9dcb5'), x, 4, 1);
  const img = productSprite(product);
  const rows = [70, 124, 178];
  const total = rows.length * 11;
  const shown = Math.floor(ease(clamp01(k * 1.3)) * total);
  rows.forEach((y, r) => {
    rect(c, 8, y, W - 16, 6, INK);
    rect(c, 9, y + 1, W - 18, 4, '#b07844');
    for (let i = 0; i < 11; i++) {
      if (r * 11 + i >= shown) continue;
      blit(c, img, 18 + i * 33, y - 24, 2);
    }
    for (let i = 0; i < 11; i += 3) {
      rect(c, 22 + i * 33, y + 6, 14, 7, '#f2b134');
      rect(c, 22 + i * 33, y + 6, 14, 1, INK);
    }
  });
  if (!(hash(Math.floor(t / 200)) > 0.5)) glow(c, 60 + hash(Math.floor(t / 400)) * 260, 90, 10, '#fff8d8', 0.4, 2);
}

/** A garage laptop with orders pouring in. */
export function orders(c: Ctx, k: number) {
  rect(c, 0, 0, W, H, '#241510');
  dither(c, 0, 150, W, 66, '#3d2317');
  glow(c, 192, 100, 120, '#5fd0b3', 0.08, 4);
  rect(c, 96, 30, 192, 124, INK);
  rect(c, 100, 34, 184, 116, '#13695b');
  rect(c, 100, 34, 184, 10, '#1f9e87');
  // bar chart racing upward
  for (let i = 0; i < 10; i++) {
    const hgt = Math.max(2, Math.round(ease(clamp01(k * 1.4 - i * 0.06)) * (20 + i * 7)));
    rect(c, 112 + i * 16, 140 - hgt, 10, hgt, i === 9 ? '#f2b134' : '#5fd0b3');
  }
  rect(c, 70, 154, 244, 10, INK);
  rect(c, 72, 155, 240, 8, '#8e8676');
  for (let i = 0; i < 20; i++) rect(c, 80 + i * 11, 157, 8, 3, '#6b6456');
}

/** Workshop in daylight with boxes piling up. */
export function boxes(c: Ctx, t: number, k: number, v: View, max: number) {
  paintScene(c, t, { ...v, scene: 'workshop', epilogue: true, boxes: Math.round(ease(k) * max), celebrate: false });
}
