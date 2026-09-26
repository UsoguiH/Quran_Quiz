import * as THREE from 'three';

// Procedural, tileable, smooth textures. Every texture gets a height
// field that is turned into a normal map so lighting feels "shader-pack"
// rich while staying soft (linear filtering + mipmaps, no pixel art).

function hash(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function tileNoise(x, y, period, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const X0 = ((x0 % period) + period) % period;
  const Y0 = ((y0 % period) + period) % period;
  const X1 = (X0 + 1) % period;
  const Y1 = (Y0 + 1) % period;
  const a = hash(X0, Y0, seed);
  const b = hash(X1, Y0, seed);
  const c = hash(X0, Y1, seed);
  const d = hash(X1, Y1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export function fbm(u, v, period = 4, octaves = 4, seed = 1) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let p = period;
  for (let o = 0; o < octaves; o++) {
    sum += amp * tileNoise(u * p, v * p, p, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    p *= 2;
  }
  return sum / norm;
}

// Tileable Voronoi. Returns [f1, f2, cellHash]
function voronoi(u, v, cells, seed) {
  const x = u * cells;
  const y = v * cells;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i;
      const cy = iy + j;
      const wx = ((cx % cells) + cells) % cells;
      const wy = ((cy % cells) + cells) % cells;
      const px = cx + 0.15 + 0.7 * hash(wx, wy, seed);
      const py = cy + 0.15 + 0.7 * hash(wx, wy, seed + 7);
      const dx = px - x;
      const dy = py - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash(wx, wy, seed + 3);
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return [f1, f2, id];
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

let maxAniso = 8;
export function setMaxAnisotropy(n) {
  maxAniso = n;
}

function finalize(canvas, isColor) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// fn(u, v) -> [r, g, b, height, roughness]
function generate(size, fn, normalStrength = 2.0) {
  const color = document.createElement('canvas');
  color.width = color.height = size;
  const cctx = color.getContext('2d');
  const cimg = cctx.createImageData(size, size);
  const heights = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const out = [0, 0, 0, 0, 0.8];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      out[4] = 0.8;
      const r = fn(x / size, y / size, out);
      const i = y * size + x;
      cimg.data[i * 4] = Math.max(0, Math.min(255, r[0] * 255));
      cimg.data[i * 4 + 1] = Math.max(0, Math.min(255, r[1] * 255));
      cimg.data[i * 4 + 2] = Math.max(0, Math.min(255, r[2] * 255));
      cimg.data[i * 4 + 3] = 255;
      heights[i] = r[3];
      rough[i] = r[4];
    }
  }
  cctx.putImageData(cimg, 0, 0);

  const normal = document.createElement('canvas');
  normal.width = normal.height = size;
  const nctx = normal.getContext('2d');
  const nimg = nctx.createImageData(size, size);
  const rcv = document.createElement('canvas');
  rcv.width = rcv.height = size;
  const rctx = rcv.getContext('2d');
  const rimg = rctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = heights[y * size + ((x - 1 + size) % size)];
      const r = heights[y * size + ((x + 1) % size)];
      const u = heights[((y - 1 + size) % size) * size + x];
      const d = heights[((y + 1) % size) * size + x];
      let nx = (l - r) * normalStrength;
      let ny = (d - u) * normalStrength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      nimg.data[i] = (nx * 0.5 + 0.5) * 255;
      nimg.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      nimg.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      nimg.data[i + 3] = 255;
      const rv = rough[y * size + x] * 255;
      rimg.data[i] = rv;
      rimg.data[i + 1] = rv;
      rimg.data[i + 2] = rv;
      rimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  return {
    map: finalize(color, true),
    normalMap: finalize(normal, false),
    roughnessMap: finalize(rcv, false),
  };
}

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export const Textures = {
  stoneBricks: () =>
    cached('stoneBricks', () =>
      generate(512, (u, v, o) => {
        const rows = 4;
        const row = Math.floor(v * rows);
        const off = row % 2 ? 0.25 : 0;
        const cols = 2;
        const bu = (u * cols + off) % 1;
        const col = Math.floor((u * cols + off) % cols);
        const lv = v * rows - row;
        const edge = Math.min(bu, 1 - bu, lv * 0.5, (1 - lv) * 0.5);
        const n = fbm(u, v, 8, 5, 3);
        const bevel = sstep(0.0, 0.035 + n * 0.02, edge);
        const id = hash(col, row, 11);
        const tone = 0.34 + id * 0.12 + (n - 0.5) * 0.18;
        const moss = sstep(0.55, 0.75, fbm(u, v, 4, 4, 9)) * (1 - bevel * 0.6);
        let r = tone * 0.95;
        let g = tone * 0.97;
        let b = tone * 1.05;
        r = mix(r, 0.22, moss * 0.6);
        g = mix(g, 0.36, moss * 0.6);
        b = mix(b, 0.18, moss * 0.6);
        const mortar = 1 - bevel;
        r = mix(r, 0.12, mortar);
        g = mix(g, 0.11, mortar);
        b = mix(b, 0.12, mortar);
        const crack = sstep(0.02, 0.0, Math.abs(fbm(u, v, 6, 3, 21) - 0.5)) * 0.5;
        o[0] = r * (1 - crack);
        o[1] = g * (1 - crack);
        o[2] = b * (1 - crack);
        o[3] = bevel * 0.8 + n * 0.25 - crack * 0.3;
        o[4] = 0.85 - moss * 0.1;
        return o;
      }, 3.0),
    ),

  dungeonFloor: () =>
    cached('dungeonFloor', () =>
      generate(512, (u, v, o) => {
        const tiles = 2;
        const tu = (u * tiles) % 1;
        const tv = (v * tiles) % 1;
        const edge = Math.min(tu, 1 - tu, tv, 1 - tv);
        const n = fbm(u, v, 8, 5, 5);
        const bevel = sstep(0.0, 0.05, edge);
        const id = hash(Math.floor(u * tiles), Math.floor(v * tiles), 4);
        const tone = 0.28 + id * 0.08 + (n - 0.5) * 0.14;
        const moss = sstep(0.6, 0.8, fbm(u, v, 3, 4, 12));
        let r = mix(tone, 0.2, moss * 0.5);
        let g = mix(tone * 1.02, 0.3, moss * 0.5);
        let b = mix(tone * 1.1, 0.16, moss * 0.5);
        r = mix(0.08, r, bevel);
        g = mix(0.08, g, bevel);
        b = mix(0.09, b, bevel);
        o[0] = r;
        o[1] = g;
        o[2] = b;
        o[3] = bevel * 0.7 + n * 0.3;
        o[4] = 0.75 - bevel * 0.1;
        return o;
      }, 2.5),
    ),

  cobble: () =>
    cached('cobble', () =>
      generate(512, (u, v, o) => {
        const [f1, f2, id] = voronoi(u, v, 7, 31);
        const edge = f2 - f1;
        const n = fbm(u, v, 8, 4, 2);
        const stone = sstep(0.02, 0.14, edge);
        const tone = 0.42 + id * 0.18 + (n - 0.5) * 0.15;
        const r = mix(0.2, tone * 1.0, stone);
        const g = mix(0.17, tone * 0.96, stone);
        const b = mix(0.13, tone * 0.9, stone);
        o[0] = r;
        o[1] = g;
        o[2] = b;
        o[3] = Math.sqrt(stone) * 0.9 + n * 0.2;
        o[4] = 0.8;
        return o;
      }, 3.0),
    ),

  wood: () =>
    cached('wood', () =>
      generate(512, (u, v, o) => {
        const planks = 4;
        const pu = u * planks;
        const pi = Math.floor(pu);
        const lu = pu - pi;
        const segLen = 0.5 + hash(pi, 0, 8) * 0.5;
        const vOff = hash(pi, 1, 8);
        const pv = (v + vOff) / segLen;
        const seg = Math.floor(pv);
        const lv = pv - seg;
        const id = hash(pi, seg, 13);
        const n = fbm(u, v, 4, 4, 6);
        const grain = Math.sin((lu * 18 + n * 6 + id * 10) * Math.PI) * 0.5 + 0.5;
        const ring = sstep(0.6, 1.0, grain) * 0.18;
        const edgeU = Math.min(lu, 1 - lu);
        const edgeV = Math.min(lv, 1 - lv) * segLen * 0.5;
        const gap = sstep(0.0, 0.03, Math.min(edgeU, edgeV));
        const base = 0.5 + id * 0.15 + (n - 0.5) * 0.2;
        let r = base * 0.72 - ring * 0.5;
        let g = base * 0.48 - ring * 0.4;
        let b = base * 0.28 - ring * 0.25;
        r = mix(0.1, r, gap);
        g = mix(0.06, g, gap);
        b = mix(0.04, b, gap);
        o[0] = r;
        o[1] = g;
        o[2] = b;
        o[3] = gap * 0.6 + grain * 0.08;
        o[4] = 0.62 + ring;
        return o;
      }, 2.2),
    ),

  plaster: () =>
    cached('plaster', () =>
      generate(256, (u, v, o) => {
        const n = fbm(u, v, 4, 5, 41);
        const n2 = fbm(u, v, 16, 3, 43);
        const t = 0.82 + (n - 0.5) * 0.12 + (n2 - 0.5) * 0.05;
        o[0] = t * 0.98;
        o[1] = t * 0.92;
        o[2] = t * 0.82;
        o[3] = n * 0.5 + n2 * 0.3;
        o[4] = 0.92;
        return o;
      }, 1.5),
    ),

  roof: (hue = 0) =>
    cached('roof' + hue, () =>
      generate(256, (u, v, o) => {
        const rows = 6;
        const cols = 5;
        const row = Math.floor(v * rows);
        const off = row % 2 ? 0.5 : 0;
        const cu = (u * cols + off) % 1;
        const lv = v * rows - row;
        // scalloped shingle: rounded bottom
        const dx = cu - 0.5;
        const scallop = lv - (1 - Math.sqrt(Math.max(0, 0.25 - dx * dx)) * 0.9);
        const inside = sstep(0.0, 0.06, -scallop + 0.35) * sstep(0.0, 0.04, Math.min(cu, 1 - cu) + 0.02);
        const n = fbm(u, v, 8, 4, 51);
        const id = hash(Math.floor(u * cols + off), row, 52);
        const shade = 0.45 + lv * 0.45 + id * 0.12 + (n - 0.5) * 0.15;
        const palettes = [
          [0.72, 0.3, 0.2],
          [0.28, 0.36, 0.56],
          [0.35, 0.45, 0.28],
        ];
        const p = palettes[hue % palettes.length];
        o[0] = p[0] * shade * (0.55 + inside * 0.45);
        o[1] = p[1] * shade * (0.55 + inside * 0.45);
        o[2] = p[2] * shade * (0.55 + inside * 0.45);
        o[3] = lv * 0.6 * inside + n * 0.2;
        o[4] = 0.7;
        return o;
      }, 3.0),
    ),

  grass: () =>
    cached('grass', () =>
      generate(512, (u, v, o) => {
        const n = fbm(u, v, 6, 5, 61);
        const n2 = fbm(u, v, 32, 2, 62);
        const t = 0.8 + (n - 0.5) * 0.5 + (n2 - 0.5) * 0.25;
        o[0] = 0.32 * t;
        o[1] = 0.55 * t;
        o[2] = 0.2 * t;
        o[3] = n2 * 0.6 + n * 0.2;
        o[4] = 0.95;
        return o;
      }, 1.4),
    ),

  dirt: () =>
    cached('dirt', () =>
      generate(256, (u, v, o) => {
        const n = fbm(u, v, 6, 5, 71);
        const [f1, f2] = voronoi(u, v, 12, 72);
        const pebble = sstep(0.1, 0.02, f1) * 0.5;
        const t = 0.75 + (n - 0.5) * 0.4 + pebble * 0.3;
        o[0] = 0.48 * t;
        o[1] = 0.36 * t;
        o[2] = 0.24 * t;
        o[3] = n * 0.4 + pebble + (f2 - f1) * 0.1;
        o[4] = 0.9;
        return o;
      }, 2.0),
    ),

  bark: () =>
    cached('bark', () =>
      generate(256, (u, v, o) => {
        const n = fbm(u * 1, v, 4, 5, 81);
        const ridges = Math.abs(Math.sin((u * 10 + n * 2.5) * Math.PI));
        const t = 0.45 + ridges * 0.25 + (n - 0.5) * 0.2;
        o[0] = 0.42 * t;
        o[1] = 0.3 * t;
        o[2] = 0.2 * t;
        o[3] = ridges * 0.8;
        o[4] = 0.95;
        return o;
      }, 3.0),
    ),

  cloth: (r0 = 0.6, g0 = 0.15, b0 = 0.2) =>
    cached(`cloth${r0}${g0}${b0}`, () =>
      generate(256, (u, v, o) => {
        const weave = (Math.sin(u * 256 * Math.PI) * Math.sin(v * 256 * Math.PI)) * 0.5 + 0.5;
        const n = fbm(u, v, 4, 3, 91);
        const t = 0.85 + weave * 0.12 + (n - 0.5) * 0.15;
        o[0] = r0 * t;
        o[1] = g0 * t;
        o[2] = b0 * t;
        o[3] = weave * 0.3;
        o[4] = 0.95;
        return o;
      }, 1.2),
    ),
};

// Soft round particle / glow sprite texture.
export function glowTexture() {
  return cached('glow', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Scale a BoxGeometry's UVs so textures tile at a constant world density.
export function boxUV(geo, w, h, d, scale = 1) {
  const uv = geo.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / scale, (uv.getY(i) * dims[f][1]) / scale);
    }
  }
  uv.needsUpdate = true;
  return geo;
}
