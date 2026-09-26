'use strict';
// ============================================================================
//  TOWN: the village (shop, forge, potion shop, board, elder) and the dungeon
//  gates plaza at its northern edge. Ground is pre-rendered; buildings, trees
//  and characters are y-sorted sprites; night uses a light-mask overlay.
// ============================================================================

const TW = 60 * TILE, TH = 46 * TILE;

// ---------------------------------------------------------------- building art
function plankWall(g, x, y, w, h, col, col2) {
  R(g, x, y, w, h, col);
  for (let j = y + 4; j < y + h; j += 5) R(g, x, j, w, 1, col2);
  const r = mulberry32(x * 7 + y);
  for (let j = y; j < y + h; j += 5) for (let i = x + (r() * 12 | 0); i < x + w; i += 14 + (r() * 10 | 0)) R(g, i, j, 1, 4, col2);
}
// wooden plank roof (Moonlighter-style top-down planks with rivets); colours come from the old shingle palette
function shingleRoof(g, x, y, w, h, col, col2, col3) {
  const rng = mulberry32(x * 13 + y * 7 + w);
  R(g, x, y, w, h, col3);
  for (let i = 0; i < w; i += 10) {
    const pw = Math.min(9, w - i), c = rng() < 0.33 ? col2 : rng() < 0.5 ? shade(col, 0.08) : col;
    R(g, x + i, y, pw, h - 3, c); R(g, x + i, y, 1, h - 3, shade(c, 0.18));
    for (let j = 8 + (i / 10 % 2) * 12; j < h - 6; j += 24) { R(g, x + i, y + j, pw, 1, col3); P(g, x + i + 2, y + j + 2, col3); P(g, x + i + pw - 3, y + j + 2, col3); }
  }
  R(g, x, y + h - 4, w, 4, shade(col3, -0.3)); R(g, x, y + h - 4, w, 1, shade(col, 0.2));
}
function windowPx(g, x, y, w, h, lit) {
  R(g, x - 1, y - 1, w + 2, h + 2, '#3a2418'); R(g, x, y, w, h, lit ? '#ffd87a' : '#2a3a5a');
  R(g, x + (w >> 1), y, 1, h, '#3a2418'); R(g, x, y + (h >> 1), w, 1, '#3a2418');
  if (!lit) R(g, x + 1, y + 1, 2, 1, '#6a8ab8');
}
function buildingSprite(kind, lit) {
  return cached(`bld_${kind}_${lit}`, () => {
    if (kind === 'shop') return sprite(212, 156, g => {
      // big plank roof seen from above
      shingleRoof(g, 0, 0, 212, 112, '#86522f', '#744528', '#4a2a18');
      R(g, 0, 0, 212, 3, '#a8703e');
      R(g, 22, 4, 16, 18, '#8a8a92'); R(g, 22, 4, 16, 3, '#b0b0b8'); R(g, 24, 0, 12, 5, '#5a5a62');
      // front wall
      R(g, 6, 110, 200, 34, '#9c5e36'); for (let i = 6; i < 206; i += 14) R(g, i, 110, 1, 34, '#7a4424');
      R(g, 6, 110, 200, 3, '#5a3018'); R(g, 4, 142, 204, 12, '#8a8a92'); for (let i = 4; i < 208; i += 12) { R(g, i, 142, 11, 5, '#a2a2aa'); R(g, i + 6, 148, 11, 5, '#7a7a82'); }
      windowPx(g, 30, 118, 18, 14, lit); windowPx(g, 160, 118, 18, 14, lit);
      // cream arched door frame with the red door
      R(g, 84, 116, 40, 30, '#e8d8b4'); ell(g, 84, 104, 40, 26, '#e8d8b4'); R(g, 84, 116, 40, 2, '#fff4d8');
      R(g, 90, 120, 28, 26, '#6a1a1e'); ell(g, 90, 110, 28, 20, '#6a1a1e');
      R(g, 92, 121, 24, 25, '#c8323a'); ell(g, 92, 112, 24, 18, '#c8323a');
      for (let i = 94; i < 116; i += 5) R(g, i, 116, 1, 30, '#9a2028');
      R(g, 96, 124, 16, 2, '#f0c050'); R(g, 96, 132, 16, 2, '#f0c050'); P(g, 113, 134, '#fff0a0');
      R(g, 96, 112, 16, 5, lit ? '#ffd87a' : '#4a2a3a');
      // lantern and plant pots
      R(g, 128, 118, 5, 8, '#3a3440'); R(g, 129, 119, 3, 5, lit ? '#ffe28a' : '#e8c060');
      ell(g, 60, 132, 12, 10, '#b8603a'); ell(g, 59, 124, 14, 10, '#4a8030'); ell(g, 62, 125, 7, 5, '#6fa83c');
      g.drawImage(crateSprite(), 8, 128); g.drawImage(barrelSprite(), 24, 130);
      // teal banner hanging from a pole, with the shop emblem
      const bx = 128, bw = 46;
      R(g, bx + bw, 2, 5, 128, '#6a3a20'); R(g, bx + bw, 2, 2, 128, '#8a5230'); R(g, bx - 2, 8, bw + 8, 4, '#6a3a20');
      for (let j = 14; j < 118; j += 16) R(g, bx + bw - 1, j, 3, 3, '#3a2010');
      R(g, bx, 12, bw, 104, '#1e8474'); R(g, bx + 2, 12, bw - 4, 102, '#2aa08c'); R(g, bx + 2, 12, 3, 102, '#44c0a8');
      for (let i = 0; i < bw; i += 8) { R(g, bx + i, 116, 4, 6, '#2aa08c'); R(g, bx + i + 4, 116, 4, 3, '#2aa08c'); }
      R(g, bx + bw - 6, 12, 4, 104, '#1e8474');
      // emblem: crescent moon with leaves
      ell(g, bx + 9, 36, 28, 28, '#efe3c5'); ell(g, bx + 15, 32, 26, 26, '#2aa08c');
      ell(g, bx + 20, 62, 8, 14, '#efe3c5'); ell(g, bx + 13, 70, 12, 7, '#efe3c5'); ell(g, bx + 24, 72, 12, 7, '#efe3c5');
      P(g, bx + 32, 44, '#efe3c5'); P(g, bx + 31, 45, '#efe3c5'); P(g, bx + 33, 45, '#efe3c5'); P(g, bx + 32, 46, '#efe3c5');
    }, '#241208');
    if (kind === 'forge') return sprite(136, 112, g => {
      R(g, 6, 92, 124, 20, '#5a5868'); for (let i = 6; i < 130; i += 10) R(g, i, 92, 9, 9, '#6a6878');
      R(g, 10, 50, 116, 42, '#7a7888'); for (let j = 52; j < 92; j += 8) for (let i = 10 + (j % 16 ? 5 : 0); i < 124; i += 12) R(g, i, j, 11, 7, '#8a8898');
      shingleRoof(g, 0, 12, 136, 42, '#6a3a2a', '#4a2418', '#3a1a10');
      R(g, 100, 0, 18, 22, '#5a5868'); R(g, 98, 0, 22, 4, '#3a3848');
      // open forge front glowing
      R(g, 46, 60, 44, 32, '#1a1010'); R(g, 50, 64, 36, 28, lit ? '#e8702a' : '#c8501a'); R(g, 54, 72, 28, 20, lit ? '#ffb040' : '#f08a2a');
      g.drawImage(anvilSprite(), 57, 78);
      windowPx(g, 18, 62, 16, 14, lit); windowPx(g, 102, 62, 16, 14, lit);
      // hammer sign
      R(g, 56, 40, 24, 14, '#2a1a12'); R(g, 58, 42, 20, 10, '#e8dcc0'); R(g, 62, 44, 12, 3, '#5a5868'); R(g, 67, 47, 2, 4, C.wood2);
    });
    if (kind === 'witch') return sprite(128, 116, g => {
      R(g, 8, 94, 112, 22, '#5a4a4a'); for (let i = 8; i < 120; i += 10) R(g, i, 94, 9, 9, '#6a5a5a');
      plankWall(g, 12, 56, 104, 38, '#8a6a8a', '#6a4a6a');
      // crooked roof
      shingleRoof(g, 0, 18, 128, 42, '#4a7a5a', '#2e5a3e', '#1e4a2e');
      ell(g, 44, 0, 40, 30, '#4a7a5a'); R(g, 58, 0, 12, 10, '#2e5a3e');
      R(g, 90, 4, 12, 22, '#5a4a4a');
      windowPx(g, 22, 66, 18, 14, lit); windowPx(g, 88, 66, 18, 14, lit);
      R(g, 50, 64, 28, 30, '#2a1a22'); R(g, 53, 67, 22, 27, '#4a2a3a'); P(g, 71, 82, '#e8c060');
      // hat sign
      R(g, 48, 44, 32, 14, '#2a1a12'); R(g, 50, 46, 28, 10, '#e8dcc0'); R(g, 56, 52, 16, 2, '#5a3a6a'); R(g, 60, 48, 8, 4, '#5a3a6a');
      g.drawImage(cauldronSprite(), 90, 94);
    });
    if (kind.startsWith('house')) {
      const v = +kind.slice(5);
      const walls = [['#c8b890', '#a89870'], ['#9ab0c8', '#7a90a8'], ['#d8a878', '#b88858']][v % 3];
      const roofs = [['#8a3a2a', '#6a2418', '#4a1a10'], ['#3e5c7c', '#2a3e58', '#223246'], ['#5a6a3a', '#3a4a24', '#2a3a18']][v % 3];
      return sprite(112, 96, g => {
        R(g, 6, 80, 100, 16, '#6a6070');
        plankWall(g, 10, 44, 92, 36, walls[0], walls[1]);
        shingleRoof(g, 0, 8, 112, 40, ...roofs);
        R(g, 78, 0, 12, 18, '#6a6070');
        windowPx(g, 20, 54, 16, 13, lit); windowPx(g, 76, 54, 16, 13, lit);
        R(g, 46, 54, 20, 26, '#2a1a12'); R(g, 48, 56, 16, 24, '#6a3a22'); P(g, 61, 68, '#e8c060');
      });
    }
    if (kind === 'lot') return sprite(120, 70, g => {
      R(g, 4, 20, 112, 46, '#7a5a3a'); for (let i = 0; i < 40; i++) P(g, 6 + (i * 37) % 108, 22 + (i * 17) % 42, '#6a4a2a');
      for (let i = 0; i < 120; i += 16) g.drawImage(fenceSprite(), i, 8);
      for (let i = 0; i < 120; i += 16) g.drawImage(fenceSprite(), i, 58);
      R(g, 20, 30, 18, 10, '#8a8a9a'); R(g, 70, 36, 24, 6, C.wood); R(g, 72, 30, 20, 6, C.wood3);
    });
    return sprite(8, 8, g => R(g, 0, 0, 8, 8, '#f0f'));
  });
}
function gateDoorSprite(i, open) {
  return cached(`gate_${i}_${open}`, () => {
    const col = i < 4 ? DUNGEONS[i].color : '#e8e0d0';
    const big = i === 4;
    const w = big ? 76 : 56, h = big ? 84 : 66;
    return sprite(w, h, g => {
      ell(g, 0, 0, w, h * 0.7, '#5a5a6a'); R(g, 0, h * 0.35, w, h * 0.65, '#5a5a6a');
      ell(g, 3, 3, w - 6, h * 0.66, '#7a7a8a'); R(g, 3, h * 0.35, w - 6, h * 0.65 - 2, '#7a7a8a');
      for (let j = 8; j < h; j += 9) for (let k = (j % 18 ? 0 : 6); k < w; k += 12) R(g, k, j, 1, 8, '#5a5a6a');
      // doorway
      const dw = w - 20, dh = h - 22;
      ell(g, 10, 12, dw, dh * 0.6, '#1a1420'); R(g, 10, 12 + dh * 0.3, dw, dh * 0.7 + 10, '#1a1420');
      if (open) { ell(g, 13, 16, dw - 6, dh * 0.55, col); R(g, 13, 16 + dh * 0.27, dw - 6, dh * 0.7 + 6, shade(col, -0.35)); ell(g, 18, 22, dw - 16, dh * 0.35, shade(col, 0.4)); }
      else {
        R(g, 13, 16 + dh * 0.2, dw - 6, dh * 0.8 + 6, '#4a3a2a');
        for (let k = 15; k < dw + 8; k += 7) R(g, k, 16 + dh * 0.2, 2, dh * 0.8 + 6, '#3a2a1a');
        R(g, 10, h * 0.55, dw + 1, 3, '#8a8a9a'); R(g, w / 2 - 3, h * 0.52, 6, 8, '#c8a040');
      }
      // emblem keystone
      ell(g, w / 2 - 7, 0, 14, 14, '#1b1420'); ell(g, w / 2 - 6, 1, 12, 12, col); ell(g, w / 2 - 3, 4, 6, 6, '#1b1420');
      if (big) for (let k = 0; k < 6; k++) R(g, 8 + k * 11, h - 6, 6, 2, '#b8d8e8');
    });
  });
}

// ---------------------------------------------------------------- town layout
function isRoad(px, py) {
  for (const r of TOWN_ROADS) if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) return true;
  return false;
}
const TOWN_ROADS = [
  { x: 64, y: 352, w: 832, h: 32 },   // road A
  { x: 64, y: 608, w: 832, h: 32 },   // road B
  { x: 464, y: 196, w: 32, h: 444 },  // main north-south road
  { x: 184, y: 344, w: 24, h: 16 },   // witch path
  { x: 752, y: 344, w: 24, h: 16 },   // forge path
  { x: 188, y: 580, w: 24, h: 32 },   // shop path
  { x: 680, y: 580, w: 20, h: 32 }, { x: 832, y: 580, w: 20, h: 32 },
];
const PLAZA = { x: 160, y: 40, w: 640, h: 170 };
const COMPASS = { x: 480, y: 480, r: 46 };
const WATER = { x: 0, y: 672, w: TW, h: 64 };

function renderTownGround() {
  const c = mkCanvas(TW, TH), g = c.getContext('2d'), rng = mulberry32(42);
  // sunny autumn grass
  R(g, 0, 0, TW, TH, '#a4bb3c');
  for (let i = 0; i < 420; i++) { g.globalAlpha = 0.55; ell(g, rng() * TW, rng() * TH, 24 + rng() * 70, 12 + rng() * 30, rng() < 0.5 ? '#b2c84a' : '#92ac34'); }
  g.globalAlpha = 1;
  // grass tufts (little "v" blades) with highlights
  for (let i = 0; i < 2200; i++) { const x = rng() * TW | 0, y = rng() * TH | 0, dk = rng() < 0.6; const c1 = dk ? '#7c9828' : '#c4d85a'; P(g, x, y, c1); P(g, x - 1, y - 1, c1); P(g, x + 1, y - 1, c1); if (!dk) P(g, x, y - 2, '#d8e878'); }
  for (let i = 0; i < 240; i++) { const x = rng() * TW, y = rng() * TH; P(g, x, y, choice(['#fff8e0', '#ffe070', '#f0a0a0', '#e89040'])); }
  // fallen leaves
  for (let i = 0; i < 300; i++) { const x = rng() * TW, y = rng() * TH; R(g, x, y, 2, 1, choice(['#e8842c', '#c0521a', '#eebc3a'])); }
  // cliff at the top behind the gates
  R(g, 0, 0, TW, 40, '#3a3446');
  for (let i = 0; i < 90; i++) { ell(g, rng() * TW, rng() * 30, 20 + rng() * 40, 14 + rng() * 16, rng() < 0.5 ? '#4a4458' : '#2e2a3a'); }
  R(g, 0, 36, TW, 6, '#241f2e');
  // gates plaza: stone tiles
  const pz = PLAZA;
  R(g, pz.x - 4, pz.y, pz.w + 8, pz.h + 4, '#8a806c');
  for (let y = pz.y; y < pz.y + pz.h; y += 12) for (let x = pz.x + ((y / 12) % 2) * 8; x < pz.x + pz.w; x += 16) {
    R(g, x, y, 15, 11, rng() < 0.2 ? '#b4a88e' : '#c4b89c'); R(g, x, y, 15, 1, '#dcd0b4'); R(g, x, y + 10, 15, 1, '#948a74');
  }
  // plaza wall with gate gap
  for (let x = pz.x - 8; x < pz.x + pz.w + 8; x += 16) {
    if (x > 440 && x < 504) continue;
    R(g, x, pz.y + pz.h, 16, 14, '#5a5a6a'); R(g, x + 1, pz.y + pz.h + 1, 14, 6, '#7a7a8a');
  }
  // roads (cobblestone)
  for (const r of TOWN_ROADS) {
    R(g, r.x - 2, r.y - 1, r.w + 4, r.h + 3, '#c8ae6c');
    R(g, r.x, r.y, r.w, r.h, '#e2cf96');
  }
  for (const r of TOWN_ROADS) for (let y = r.y + 1; y < r.y + r.h - 2; y += 5) for (let x = r.x + 1 + ((y / 5 | 0) % 2) * 3; x < r.x + r.w - 3; x += 7) {
    if (rng() < 0.35) { R(g, x, y, 4, 3, rng() < 0.4 ? '#f0e2b4' : '#d4be84'); R(g, x, y + 2, 4, 1, '#c0a86c'); }
  }
  // grass creeping over the road edges
  for (const r of TOWN_ROADS) {
    for (let x = r.x - 2; x < r.x + r.w + 2; x += 2) { if (rng() < 0.6) { P(g, x, r.y - 1 + (rng() * 3 | 0), '#92ac34'); } if (rng() < 0.6) P(g, x, r.y + r.h - (rng() * 3 | 0), '#92ac34'); }
    for (let y = r.y; y < r.y + r.h; y += 2) { if (rng() < 0.6) P(g, r.x - 1 + (rng() * 3 | 0), y, '#92ac34'); if (rng() < 0.6) P(g, r.x + r.w - (rng() * 3 | 0), y, '#92ac34'); }
  }
  // compass rose plaza
  const cp = COMPASS;
  ell(g, cp.x - cp.r - 3, cp.y - cp.r * 0.8 - 3, cp.r * 2 + 6, cp.r * 1.6 + 6, '#8e7e62');
  ell(g, cp.x - cp.r, cp.y - cp.r * 0.8, cp.r * 2, cp.r * 1.6, '#b4a484');
  ell(g, cp.x - cp.r + 8, cp.y - cp.r * 0.8 + 6, cp.r * 2 - 16, cp.r * 1.6 - 12, '#a89878');
  g.fillStyle = '#3f8f8a';
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, L = k % 2 ? cp.r * 0.45 : cp.r * 0.85;
    g.beginPath(); g.moveTo(cp.x + Math.cos(a) * L, cp.y + Math.sin(a) * L * 0.8);
    g.lineTo(cp.x + Math.cos(a + 0.35) * 8, cp.y + Math.sin(a + 0.35) * 8 * 0.8);
    g.lineTo(cp.x + Math.cos(a - 0.35) * 8, cp.y + Math.sin(a - 0.35) * 8 * 0.8); g.fill();
  }
  ell(g, cp.x - 7, cp.y - 6, 14, 12, '#e8dcc0');
  // water canal at the bottom
  R(g, WATER.x, WATER.y - 6, WATER.w, 6, '#7a7a8a'); R(g, WATER.x, WATER.y - 6, WATER.w, 2, '#9a9aa8');
  R(g, WATER.x, WATER.y, WATER.w, WATER.h, '#2f6ab8');
  for (let i = 0; i < 160; i++) R(g, rng() * TW, WATER.y + 4 + rng() * (WATER.h - 8), 6 + rng() * 10, 1, '#5a9ae0');
  // bridge
  R(g, 456, WATER.y - 8, 48, WATER.h + 8, C.wood2); for (let j = WATER.y - 8; j < WATER.y + WATER.h; j += 5) R(g, 458, j, 44, 4, C.wood);
  // dirt patches around the buildings
  return c;
}

class TownScene {
  constructor(spawn = 'shop') {
    this.parts = []; this.texts = []; this.rings = []; this.projs = []; this.pickups = []; this.enemies = [];
    this.player = new Player(0, 0);
    this.cam = { x: 0, y: 0 };
    this.build();
    this.spawnAt(spawn);
    this.nightCv = mkCanvas(W, H);
    this.t = 0;
    this.shakeA = 0;
    this.music = S.phase === 'night' ? 'night' : 'town';
    AudioSys.music(this.music);
  }
  get world() { return this; }
  shake() { }
  spawnAt(where) {
    const P0 = { shop: [200, 600], gates: [480, 150], start: [200, 600], forge: [764, 372], witch: [196, 372] }[where] || [200, 600];
    this.player.x = P0[0]; this.player.y = P0[1]; this.player.dir = where === 'gates' ? 0 : 0;
    this.snapCam();
  }
  build() {
    const objs = [], solids = [], inter = [], lights = [], casts = [];
    const lit = S.phase === 'night';
    const addB = (kind, cx, baseY, depth, o = {}) => {
      const img = buildingSprite(kind, lit);
      casts.push([img, cx, baseY]);
      objs.push({ y: baseY, draw: (ox, oy) => ctx.drawImage(img, Math.round(cx - img.width / 2 - ox), Math.round(baseY - img.height - oy)) });
      solids.push({ x: cx - img.width / 2 + 6, y: baseY - depth, w: img.width - 12, h: depth - 2 });
      return img;
    };
    // player's shop (with its name painted on the sign board)
    addB('shop', 200, 580, 70);
    inter.push({ x: 200, y: 588, r: 18, label: 'Enter shop', fn: () => Game.goShop() });
    lights.push([200, 540, 70], [160, 530, 30], [240, 530, 30]);
    // forge
    if (S.invest.forge) { addB('forge', 764, 352, 52); inter.push({ x: 764, y: 360, r: 20, label: "Brom's Anvil", fn: () => UI.open(new ForgeUI()) }); lights.push([764, 330, 60]); this.npcSmith = true; }
    else { addB('lot', 764, 352, 44); inter.push({ x: 764, y: 360, r: 26, label: 'Read sign', fn: () => say(['An empty lot. A blacksmith would set up shop here if the town invested in it.', 'Visit the Town Board near the plaza.']) }); }
    // witch
    if (S.invest.witch) { addB('witch', 196, 352, 50); inter.push({ x: 196, y: 360, r: 20, label: 'Copper Cauldron', fn: () => UI.open(new WitchUI()) }); lights.push([196, 330, 55]); }
    else { addB('lot', 196, 352, 44); inter.push({ x: 196, y: 360, r: 26, label: 'Read sign', fn: () => say(['An empty lot. A potion maker would settle here if the town invested in it.', 'Visit the Town Board near the plaza.']) }); }
    // houses
    addB('house0', 690, 590, 40); addB('house1', 842, 590, 40); addB('house2', 360, 330, 38);
    lights.push([690, 560, 40], [842, 560, 40], [360, 305, 40]);
    // town board
    const boardImg = cached('board', () => sprite(40, 34, g => {
      R(g, 4, 14, 3, 20, C.wood2); R(g, 33, 14, 3, 20, C.wood2); R(g, 0, 0, 40, 22, C.wood4); R(g, 2, 2, 36, 18, C.wood);
      R(g, 5, 4, 10, 12, C.paper); R(g, 18, 5, 8, 10, C.paper2); R(g, 28, 4, 8, 8, C.paper); R(g, 8, 6, 5, 1, C.paperInk); R(g, 8, 9, 4, 1, C.paperInk);
    }));
    objs.push({ y: 470, draw: (ox, oy) => ctx.drawImage(boardImg, 566 - ox, 436 - oy) });
    casts.push([boardImg, 587, 472]);
    solids.push({ x: 566, y: 462, w: 40, h: 8 });
    inter.push({ x: 586, y: 478, r: 20, label: 'Town Board', fn: () => UI.open(new BoardUI()) });
    // well
    objs.push({ y: 470, draw: (ox, oy) => ctx.drawImage(wellSprite(), 370 - ox, 440 - oy) });
    casts.push([wellSprite(), 384, 472]);
    solids.push({ x: 372, y: 456, w: 24, h: 14 });
    // gates: four dungeon doors + the fifth door
    const doorX = [224, 352, 608, 736];
    doorX.forEach((x, i) => {
      const open = S.unlocked > i;
      const img = gateDoorSprite(i, open);
      objs.push({ y: 106, draw: (ox, oy) => ctx.drawImage(img, x - img.width / 2 - ox, 106 - img.height - oy) });
      casts.push([img, x, 106]);
      solids.push({ x: x - img.width / 2, y: 40, w: img.width, h: 62 });
      inter.push({ x, y: 116, r: 20, label: open ? DUNGEONS[i].name : 'Locked', fn: () => this.enterGate(i) });
      if (open) lights.push([x, 90, 40, DUNGEONS[i].color]);
    });
    const fifth = gateDoorSprite(4, false);
    objs.push({ y: 112, draw: (ox, oy) => ctx.drawImage(fifth, 480 - fifth.width / 2 - ox, 112 - fifth.height - oy) });
    solids.push({ x: 480 - fifth.width / 2, y: 40, w: fifth.width, h: 68 });
    inter.push({ x: 480, y: 122, r: 22, label: 'Fifth Door', fn: () => this.fifthDoor() });
    // keys map sign
    objs.push({ y: 196, draw: (ox, oy) => drawSpr(signSprite(), 540 - ox, 196 - oy) });
    solids.push({ x: 534, y: 190, w: 12, h: 6 });
    inter.push({ x: 540, y: 204, r: 16, label: 'Dungeon map', fn: () => UI.open(new KeysMapUI()) });
    // lamps along roads
    const lampPos = [[130, 348], [330, 348], [620, 348], [860, 348], [130, 604], [330, 604], [560, 604], [860, 604], [456, 250], [508, 250], [456, 520], [508, 520], [200, 196], [760, 196]];
    lampPos.forEach(([x, y]) => { casts.push([lampSprite(lit), x, y]); objs.push({ y, draw: (ox, oy) => drawSpr(lampSprite(lit), x - ox, y - oy) }); solids.push({ x: x - 3, y: y - 4, w: 6, h: 4 }); lights.push([x, y - 26, 44]); });
    // trees and bushes around the edges
    const rng = mulberry32(99);
    const treeSpots = [];
    for (let i = 0; i < 70; i++) {
      let x = rng() * TW, y = 220 + rng() * 440;
      if (i < 24) { x = rng() < 0.5 ? 10 + rng() * 50 : TW - 60 + rng() * 50; }
      if (i >= 60) { x = 60 + rng() * 840; y = 400 + rng() * 60; if (Math.abs(x - COMPASS.x) < 90) continue; }
      if (isRoad(x, y) || isRoad(x, y - 20) || isRoad(x + 16, y) || isRoad(x - 16, y)) continue;
      if (solids.some(s => x > s.x - 26 && x < s.x + s.w + 26 && y > s.y - 10 && y < s.y + s.h + 60)) continue;
      if (Math.abs(x - COMPASS.x) < 70 && Math.abs(y - COMPASS.y) < 60) continue;
      if (treeSpots.some(([tx, ty]) => Math.abs(tx - x) < 26 && Math.abs(ty - y) < 18)) continue;
      treeSpots.push([x, y]);
      const v = i % 4, img = treeSprite(v);
      objs.push({ y, draw: (ox, oy) => drawSpr(img, x - ox, y - oy) });
      casts.push([img, x, y]);
      solids.push({ x: x - 6, y: y - 6, w: 12, h: 6 });
    }
    // golden tall grass patches (walk-through) and old stumps
    for (let i = 0; i < 46; i++) {
      const x = 40 + rng() * 880, y = 226 + rng() * 430;
      if (isRoad(x, y) || isRoad(x - 22, y) || isRoad(x + 22, y) || isRoad(x, y - 18)) continue;
      if (solids.some(s => x > s.x - 26 && x < s.x + s.w + 26 && y > s.y - 4 && y < s.y + s.h + 24)) continue;
      if (Math.abs(x - COMPASS.x) < 80 && Math.abs(y - COMPASS.y) < 64) continue;
      if (i % 5 === 0) { const img = stumpSprite(); objs.push({ y, draw: (ox, oy) => drawSpr(img, x - ox, y - oy) }); casts.push([img, x, y]); solids.push({ x: x - 7, y: y - 7, w: 14, h: 6 }); continue; }
      const img = tallGrassSprite(i % 3);
      objs.push({ y, draw: (ox, oy) => drawSpr(img, x - ox, y - oy) });
    }
    for (let i = 0; i < 40; i++) {
      const x = 40 + rng() * 880, y = 230 + rng() * 420;
      if (isRoad(x, y) || solids.some(s => x > s.x - 8 && x < s.x + s.w + 8 && y > s.y - 8 && y < s.y + s.h + 30)) continue;
      const img = bushSprite(i % 2);
      objs.push({ y, draw: (ox, oy) => drawSpr(img, x - ox, y - oy) });
    }
    // fences along the canal
    for (let x = 0; x < TW; x += 16) { if (x >= 448 && x < 512) continue; const xx = x; objs.push({ y: WATER.y - 6, draw: (ox, oy) => ctx.drawImage(fenceSprite(), xx - ox, WATER.y - 18 - oy) }); }
    solids.push({ x: 0, y: WATER.y - 10, w: 452, h: 80 }, { x: 508, y: WATER.y - 10, w: TW, h: 80 });
    // NPCs
    this.npcs = [];
    this.npcs.push(new TownNPC(NPC_LOOKS.elder, 410, 492, { name: 'Elder Oren', portrait: elderPortrait(), lines: () => ELDER_LINES[S.flags.elder++ % ELDER_LINES.length], still: true }));
    this.npcs.push(new TownNPC(NPC_LOOKS.mayor, 620, 486, { name: 'Mayor Pell', portrait: mayorPortrait(), lines: () => ['Welcome, shopkeeper! The Town Board is the heart of our little town.', 'Invest there and new shops will open. A town grows with its merchants!'], still: true }));
    if (S.invest.forge) this.npcs.push(new TownNPC(NPC_LOOKS.smith, 800, 372, { name: 'Brom', portrait: smithPortrait(), lines: () => ['Need something forged? Step up to the anvil.'], still: true, fn: () => UI.open(new ForgeUI()) }));
    if (S.invest.witch) this.npcs.push(new TownNPC(NPC_LOOKS.witch, 160, 372, { name: 'Mirabel', portrait: witchPortrait(), lines: () => ['Potions, dear? Come, come.'], still: true, fn: () => UI.open(new WitchUI()) }));
    const nV = 4 + Math.min(4, S.day / 2 | 0);
    for (let i = 0; i < nV; i++) {
      const look = LOOKS[(i * 7 + S.day * 3) % LOOKS.length];
      const r = choice([TOWN_ROADS[0], TOWN_ROADS[1], TOWN_ROADS[2]]);
      this.npcs.push(new TownNPC(look, r.x + rand(r.w), r.y + rand(r.h), { name: 'Villager', lines: () => [choice(VILLAGER_LINES)] }));
    }
    this.objs = objs; this.solids = solids; this.inter = inter; this.lights = lights;
    // bake long sun-cast shadows (skewed silhouettes) into the ground
    this.ground = renderTownGround();
    const shc = mkCanvas(TW, TH), sg = shc.getContext('2d');
    for (const [img, cx, by] of casts) {
      const sil = cached('sil_' + (img.__sid || (img.__sid = Math.random())), () => whiteOf(img, '#000'));
      sg.setTransform(1, 0, -0.62, -0.34, cx, by - 1);
      sg.drawImage(sil, -img.width / 2, -img.height);
    }
    sg.setTransform(1, 0, 0, 1, 0, 0);
    const gg = this.ground.getContext('2d');
    gg.globalAlpha = lit ? 0.18 : 0.3; gg.drawImage(shc, 0, 0); gg.globalAlpha = 1;
    // collision grid 8px
    this.cg = new Uint8Array((TW / 8) * (TH / 8));
    for (const s of solids) for (let y = Math.floor(s.y / 8); y < Math.ceil((s.y + s.h) / 8); y++) for (let x = Math.floor(s.x / 8); x < Math.ceil((s.x + s.w) / 8); x++) if (x >= 0 && y >= 0 && x < TW / 8 && y < TH / 8) this.cg[y * (TW / 8) + x] = 1;
  }
  solid(px, py) {
    if (px < 4 || py < 44 || px > TW - 4 || py > TH - 4) return true;
    if (py < PLAZA.y + PLAZA.h + 14 && py > PLAZA.y + PLAZA.h - 2 && !(px > 448 && px < 512)) return true; // plaza wall
    return !!this.cg[Math.floor(py / 8) * (TW / 8) + Math.floor(px / 8)];
  }
  enterGate(i) {
    if (S.unlocked <= i) { say(i === 0 ? ['Locked.'] : [`The ${DUNGEONS[i].name} is sealed.`, `Defeat the guardian of the ${DUNGEONS[i - 1].name} to find its key.`]); return; }
    const night = S.phase === 'night';
    const q = `Enter the ${DUNGEONS[i].name}?` + (night ? ' It is night: enemies are fiercer, but treasures richer.' : '');
    ask(q, () => Game.goDungeon(i));
  }
  fifthDoor() {
    if (S.bosses.every(Boolean)) say(['The fifth door trembles. Four keys glow in your pack...', 'Whatever lies beyond will have to wait for another night. For now, you are the greatest merchant-hero this town has ever known.', 'Thank you for playing ' + GAME_TITLE + '!']);
    else say(['An ancient door, larger than the others. It does not budge.', 'Perhaps the guardians of the four dungeons hold the answer.']);
  }
  snapCam() { this.cam.x = clamp(this.player.x - W / 2, 0, TW - W); this.cam.y = clamp(this.player.y - H / 2 - 10, 0, TH - H); }
  update(dt) {
    this.t += dt;
    const p = this.player;
    if (Input.pressed('START')) { UI.open(new PauseUI()); return; }
    if (Input.pressed('SELECT')) { UI.open(new InventoryUI({})); return; }
    p.update(dt, this, 'town');
    for (const n of this.npcs) n.update(dt, this);
    updateFX(this, dt);
    // interactions
    this.near = null; let best = 1e9;
    for (const it of this.inter) { const d = dist(p.x, p.y, it.x, it.y); if (d < it.r && d < best) { best = d; this.near = it; } }
    for (const n of this.npcs) { const d = dist(p.x, p.y, n.x, n.y); if (d < 18 && d < best) { best = d; this.near = { x: n.x, y: n.y - 10, label: n.o.fn ? n.o.name : 'Talk', fn: () => n.talk(this) }; } }
    if (this.near && Input.pressed('A')) { sfx('select'); this.near.fn(); }
    // camera
    const tx = clamp(p.x - W / 2, 0, TW - W), ty = clamp(p.y - H / 2 - 10, 0, TH - H);
    this.cam.x = lerp(this.cam.x, tx, 0.15); this.cam.y = lerp(this.cam.y, ty, 0.15);
  }
  draw() {
    const ox = Math.round(this.cam.x), oy = Math.round(this.cam.y);
    ctx.drawImage(this.ground, ox, oy, W, H, 0, 0, W, H);
    const list = [...this.objs, ...this.npcs, this.player];
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.y < oy - 40 || o.y > oy + H + 160) continue;
      o.draw(ox, oy);
    }
    drawFX(this, ox, oy);
    if (S.phase === 'night') this.drawNight(ox, oy);
    if (this.near) worldPrompt(this.near.x - ox, this.near.y - oy - 22, [['A', this.near.label]]);
    drawTownHUD();
  }
  drawNight(ox, oy) {
    const g = this.nightCv.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(14,22,70,0.62)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    const flick = 1 + Math.sin(this.t * 7) * 0.03;
    for (const [x, y, r] of this.lights) {
      const sx = x - ox, sy = y - oy; if (sx < -r || sx > W + r || sy < -r || sy > H + r) continue;
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, r * flick);
      gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, r * flick, 0, Math.PI * 2); g.fill();
    }
    // the player carries a little light
    const px = this.player.x - ox, py = this.player.y - oy - 10;
    const gp = g.createRadialGradient(px, py, 0, px, py, 34); gp.addColorStop(0, 'rgba(0,0,0,0.6)'); gp.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gp; g.beginPath(); g.arc(px, py, 34, 0, Math.PI * 2); g.fill();
    ctx.drawImage(this.nightCv, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, col] of this.lights) {
      const sx = x - ox, sy = y - oy; if (sx < -r || sx > W + r || sy < -r || sy > H + r) continue;
      const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.6);
      gr.addColorStop(0, col ? col + '40' : 'rgba(255,190,110,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
class TownNPC {
  constructor(look, x, y, o) { this.look = look; this.x = x; this.y = y; this.o = o; this.dir = 0; this.anim = 0; this.tx = x; this.ty = y; this.wait = rand(1, 4); this.hw = 4; this.hh = 3; }
  update(dt, sc) {
    if (this.o.still) { const p = sc.player; if (dist(p.x, p.y, this.x, this.y) < 50) this.dir = dirFromVec(p.x - this.x, p.y - this.y); return; }
    this.wait -= dt;
    if (this.wait > 0) { this.anim = 0; return; }
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
    if (d < 3) {
      this.wait = rand(1.5, 5);
      const r = choice([TOWN_ROADS[0], TOWN_ROADS[1], TOWN_ROADS[2]]);
      this.tx = r.x + 8 + rand(r.w - 16); this.ty = r.y + 8 + rand(r.h - 16);
      if (Math.abs(this.tx - this.x) > 200) this.tx = this.x + sign(this.tx - this.x) * 200;
      return;
    }
    const sp = 26;
    const r = moveBody(this, dx / d * sp * dt, dy / d * sp * dt, sc);
    if (r.hitX && r.hitY) this.wait = 0.5, this.tx = this.x, this.ty = this.y;
    this.dir = dirFromVec(dx, dy); this.anim += dt * 7;
  }
  talk(sc) {
    this.dir = dirFromVec(sc.player.x - this.x, sc.player.y - this.y);
    const lines = this.o.lines();
    say(lines, { name: this.o.name, portrait: this.o.portrait, onDone: this.o.fn });
  }
  draw(ox, oy) {
    shadow(this.x - ox, this.y - oy, 12);
    const img = personSprite(this.look, this.dir, Math.floor(this.anim) % 4, this.wait > 0 || this.o.still ? 'idle' : 'walk');
    if (sunOut()) castSprShadow(img, this.x - ox, this.y - oy);
    drawSpr(img, this.x - ox, this.y - oy + 1);
  }
}
function drawTownHUD() {
  drawHealthHUD(5, 5);
  // day/time chip
  const night = S.phase === 'night';
  const label = `Day ${S.day} · ${night ? 'Night' : 'Day'}`;
  const w = textW(label, 7) + 24, x = W / 2 - w / 2;
  ctx.globalAlpha = 0.8; R(ctx, x, 5, w, 13, '#1b1420'); ctx.globalAlpha = 1;
  if (night) { ell(ctx, x + 4, 7, 9, 9, '#e8e0c0'); ell(ctx, x + 7, 6, 8, 8, '#1b1420'); }
  else { ell(ctx, x + 4, 7, 9, 9, C.gold); }
  txt(label, x + 17, 14.5, { size: 7, color: '#efe3c5' });
}
