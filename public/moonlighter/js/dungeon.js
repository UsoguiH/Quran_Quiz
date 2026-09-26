'use strict';
// ============================================================================
//  DUNGEON: procedural floors of single-screen rooms, room art, the dungeon
//  scene (combat, doors, loot, pendant, death, boss) and its HUD.
// ============================================================================

const RC = 24, RR = 14;          // room tiles (cols x rows)
const T_FLOOR = 0, T_WALL = 1, T_PIT = 2, T_ROCK = 3;
const CAM_Y = 8;                  // vertical crop of the room
const DOOR_TILES = {
  U: [[11, 0], [12, 0], [11, 1], [12, 1]], D: [[11, 13], [12, 13]],
  L: [[0, 6], [0, 7]], R: [[23, 6], [23, 7]],
};
const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
const DXY = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const ENTRY = { D: [192, 194], U: [192, 46], L: [26, 114], R: [358, 114] }; // where you appear when entering through that door

// ---------------------------------------------------------------- floor generation
function genFloor(dIdx, floor, rng) {
  const rooms = {}, key = (x, y) => x + ',' + y;
  const N = 7;
  const target = 8 + floor * 2 + Math.min(dIdx, 2) + randInt(rng, 0, 2);
  const start = { x: 3, y: 6 };
  const add = (x, y) => { const r = { x, y, doors: {}, type: 'normal', visited: false, cleared: false }; rooms[key(x, y)] = r; return r; };
  add(start.x, start.y).type = 'start';
  let guard = 0;
  while (Object.keys(rooms).length < target && guard++ < 2000) {
    const list = Object.values(rooms);
    const r = list[Math.floor(rng() * list.length)];
    const d = ['U', 'L', 'R', 'U', 'D'][Math.floor(rng() * 5)];
    const nx = r.x + DXY[d][0], ny = r.y + DXY[d][1];
    if (nx < 0 || ny < 0 || nx >= N || ny >= N || rooms[key(nx, ny)]) continue;
    if (r.type === 'start' && d === 'D') continue;
    let neigh = 0; for (const dd in DXY) if (rooms[key(nx + DXY[dd][0], ny + DXY[dd][1])]) neigh++;
    if (neigh > 1 && rng() < 0.7) continue;
    const n = add(nx, ny);
    r.doors[d] = true; n.doors[OPP[d]] = true;
  }
  // occasional loops
  for (const r of Object.values(rooms)) for (const d of ['R', 'D']) {
    const n = rooms[key(r.x + DXY[d][0], r.y + DXY[d][1])];
    if (n && !r.doors[d] && rng() < 0.18 && r.type !== 'start') { r.doors[d] = true; n.doors[OPP[d]] = true; }
  }
  // BFS distances
  const s = rooms[key(start.x, start.y)];
  const q = [s]; s.dist = 0; const seen = new Set([s]);
  while (q.length) { const r = q.shift(); for (const d in r.doors) { const n = rooms[key(r.x + DXY[d][0], r.y + DXY[d][1])]; if (n && !seen.has(n)) { seen.add(n); n.dist = r.dist + 1; q.push(n); } } }
  const list = Object.values(rooms).filter(r => r !== s);
  const deg = r => Object.keys(r.doors).length;
  list.sort((a, b) => (b.dist - a.dist) || (deg(a) - deg(b)));
  list[0].type = 'stairs';
  const deadEnds = list.slice(1).filter(r => deg(r) === 1);
  const others = list.slice(1).filter(r => deg(r) > 1);
  const pick = arr => arr.splice(Math.floor(rng() * arr.length), 1)[0];
  const t1 = deadEnds.length ? pick(deadEnds) : others.length ? pick(others) : null; if (t1) t1.type = 'treasure';
  if (rng() < 0.55) { const t2 = deadEnds.length ? pick(deadEnds) : null; if (t2) t2.type = 'treasure'; }
  if (floor > 0 || rng() < 0.4) { const pl = [...deadEnds, ...others].filter(r => r.type === 'normal'); if (pl.length) pick(pl).type = 'pool'; }
  if (floor > 0) s.pool = true;
  if (floor === 0) s.doors.D = true; // exit to town
  for (const r of Object.values(rooms)) buildRoomTiles(r, rng, dIdx);
  return { rooms, start: s, key };
}
function randInt(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
function genBossFloor() {
  const r = { x: 3, y: 3, doors: {}, type: 'boss', visited: true, cleared: false };
  r.tiles = baseTiles(r);
  return { rooms: { '3,3': r }, start: r, key: (x, y) => x + ',' + y };
}
function baseTiles(r) {
  const t = [];
  for (let y = 0; y < RR; y++) { t.push([]); for (let x = 0; x < RC; x++) t[y].push(x === 0 || x === RC - 1 || y <= 1 || y === RR - 1 ? T_WALL : T_FLOOR); }
  for (const d in r.doors) for (const [x, y] of DOOR_TILES[d]) t[y][x] = T_FLOOR;
  return t;
}
const LAYOUTS = [
  (t, rng) => { const n = randInt(rng, 3, 7); for (let i = 0; i < n; i++) setT(t, randInt(rng, 3, 20), randInt(rng, 3, 11), T_ROCK); },
  (t) => { fillT(t, 8, 4, 8, 2, T_PIT); fillT(t, 10, 6, 4, 3, T_PIT); fillT(t, 8, 9, 8, 2, T_PIT); },
  (t) => { fillT(t, 3, 3, 4, 3, T_PIT); fillT(t, 17, 3, 4, 3, T_PIT); fillT(t, 3, 10, 4, 2, T_PIT); fillT(t, 17, 10, 4, 2, T_PIT); },
  (t) => { fillT(t, 6, 4, 12, 1, T_PIT); fillT(t, 6, 10, 12, 1, T_PIT); fillT(t, 6, 4, 1, 7, T_PIT); fillT(t, 17, 4, 1, 7, T_PIT); fillT(t, 11, 4, 2, 1, T_FLOOR); fillT(t, 11, 10, 2, 1, T_FLOOR); fillT(t, 6, 7, 1, 1, T_FLOOR); fillT(t, 17, 7, 1, 1, T_FLOOR); },
  (t) => { fillT(t, 5, 3, 2, 9, T_PIT); fillT(t, 17, 3, 2, 9, T_PIT); fillT(t, 5, 7, 2, 1, T_FLOOR); fillT(t, 17, 6, 2, 2, T_FLOOR); },
  (t) => { for (let x = 4; x <= 19; x += 5) for (let y = 4; y <= 10; y += 6) setT(t, x, y, T_ROCK); },
  (t) => { fillT(t, 2, 9, 20, 2, T_PIT); fillT(t, 5, 9, 2, 2, T_FLOOR); fillT(t, 11, 9, 2, 2, T_FLOOR); fillT(t, 17, 9, 2, 2, T_FLOOR); },
  (t) => { fillT(t, 8, 5, 8, 5, T_PIT); },
  (t, rng) => { for (let i = 0; i < 4; i++) { const cx = randInt(rng, 4, 19), cy = randInt(rng, 4, 10); fillT(t, cx - 1, cy - 1, randInt(rng, 2, 4), randInt(rng, 2, 3), T_PIT); } },
  (t) => { fillT(t, 4, 3, 3, 3, T_ROCK); fillT(t, 17, 9, 3, 3, T_ROCK); fillT(t, 10, 6, 4, 3, T_PIT); },
];
function setT(t, x, y, v) { if (y >= 2 && y <= 12 && x >= 1 && x <= 22) t[y][x] = v; }
function fillT(t, x, y, w, h, v) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setT(t, i, j, v); }
function clearDoorPaths(t, r) {
  if (r.doors.U) fillT(t, 10, 2, 4, 3, T_FLOOR);
  if (r.doors.D) fillT(t, 10, 10, 4, 3, T_FLOOR);
  if (r.doors.L) fillT(t, 1, 5, 3, 4, T_FLOOR);
  if (r.doors.R) fillT(t, 20, 5, 3, 4, T_FLOOR);
}
function connected(t, r) {
  const pts = [];
  if (r.doors.U) pts.push([11, 2]); if (r.doors.D) pts.push([11, 12]); if (r.doors.L) pts.push([1, 6]); if (r.doors.R) pts.push([22, 6]);
  pts.push([11, 7]);
  const ok = (x, y) => t[y] && t[y][x] === T_FLOOR;
  let startP = pts.find(p => ok(p[0], p[1])); if (!startP) return false;
  const seen = new Set([startP.join()]); const q = [startP];
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && ok(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); } } }
  // centre may be pit in some layouts: require only doors connected + some open floor
  return pts.slice(0, -1).every(p => seen.has(p.join())) && seen.size > 60;
}
function buildRoomTiles(r, rng) {
  let tries = 0;
  for (;;) {
    const t = baseTiles(r);
    if (r.type === 'normal' || r.type === 'stairs' || (r.type === 'treasure' && rng() < 0.5)) {
      const L = tries > 6 ? LAYOUTS[0] : LAYOUTS[Math.floor(rng() * LAYOUTS.length)];
      L(t, rng);
    }
    if (r.type === 'stairs' || r.type === 'treasure' || r.type === 'pool' || r.pool) fillT(t, 9, 5, 6, 5, T_FLOOR);
    clearDoorPaths(t, r);
    if (connected(t, r) || tries > 10) { r.tiles = t; break; }
    tries++;
  }
  r.seed = Math.floor(rng() * 1e9);
}

// ---------------------------------------------------------------- room art
// ---------------------------------------------------------------- themed rooms (graveyard / void temple)
function roomDoorOpenings(g, r, P2) {
  const arch = (x, y, w, h) => { R(g, x - 3, y, w + 6, h, P2.brickHi); R(g, x, y, w, h, '#050408'); R(g, x - 5, y, 4, h, shade(P2.brickHi, 0.1)); R(g, x + w + 1, y, 4, h, shade(P2.brickHi, 0.1)); };
  if (r.doors.U) arch(176, 0, 32, 32);
  if (r.doors.D) arch(176, 208, 32, 16);
  if (r.doors.L) { R(g, 0, 94, 16, 36, P2.brickHi); R(g, 0, 96, 14, 32, '#050408'); }
  if (r.doors.R) { R(g, 368, 94, 16, 36, P2.brickHi); R(g, 370, 96, 14, 32, '#050408'); }
}
function pitTiles(g, t, P2, rng, voidStyle) {
  for (let y = 0; y < RR; y++) for (let x = 0; x < RC; x++) {
    if (t[y][x] !== T_PIT) continue;
    const px = x * TILE, py = y * TILE;
    if (!voidStyle) R(g, px, py, TILE, TILE, P2.pit);
    const up = t[y - 1] && t[y - 1][x] !== T_PIT;
    if (up && !voidStyle) { R(g, px, py, TILE, 6, P2.edge); for (let i = 0; i < TILE; i += 2) if (rng() < 0.5) P(g, px + i, py + 6, P2.edge); }
  }
}
function renderGraveRoom(r, d) {
  const P2 = d.room, f = d.foe, t = r.tiles;
  const c = mkCanvas(RC * TILE, RR * TILE), g = c.getContext('2d'), rng = mulberry32(r.seed || 7);
  const lights = [], flames = [];
  R(g, 0, 0, c.width, c.height, P2.floor);
  for (let i = 0; i < 30; i++) { g.globalAlpha = 0.6; ell(g, rng() * 384, 30 + rng() * 180, 24 + rng() * 70, 12 + rng() * 30, rng() < 0.5 ? P2.floor2 : P2.floor3); }
  g.globalAlpha = 1;
  // cracked earth
  for (let i = 0; i < 38; i++) { let x = rng() * 384, y = 34 + rng() * 170; for (let k = 0; k < 12; k++) { P(g, x, y, '#241b15'); x += rng() < 0.5 ? 1 : 0; y += rng() < 0.6 ? 1 : 0; if (rng() < 0.2) x -= 2; } }
  // worn flagstones
  for (let i = 0; i < 18; i++) { const x = 20 + rng() * 340, y = 40 + rng() * 160, w = 8 + rng() * 10 | 0, h = 5 + rng() * 5 | 0; R(g, x, y, w, h, '#4a3c30'); R(g, x, y, w, 1, '#5a4a3a'); R(g, x, y + h, w, 1, '#221a14'); }
  // grass tufts and fallen leaves
  for (let i = 0; i < 46; i++) { const x = 18 + rng() * 348, y = 36 + rng() * 168; const gcol = rng() < 0.5 ? '#3a7a3a' : '#57a24a'; P(g, x, y, gcol); P(g, x - 1, y - 1, gcol); P(g, x + 1, y - 2, gcol); P(g, x + 2, y, gcol); }
  for (let i = 0; i < 40; i++) P(g, 18 + rng() * 348, 36 + rng() * 168, rng() < 0.5 ? '#c8702a' : '#a8502a');
  pitTiles(g, t, P2, rng);
  // rounded cobble walls
  const cobble = (x0, y0, w, h) => {
    R(g, x0, y0, w, h, P2.brickDark);
    for (let y = y0; y < y0 + h; y += 7) for (let x = x0 - ((y / 7) % 2) * 5; x < x0 + w; x += 10) {
      const sx = Math.max(x0, x), sw = Math.min(10, x0 + w - sx, x + 10 - x0);
      if (sw < 3) continue;
      ell(g, sx, y, sw, 7, rng() < 0.2 ? P2.brickHi : P2.brick); R(g, sx + 2, y + 1, Math.max(1, sw - 5), 1, P2.brickHi);
    }
  };
  cobble(0, 0, 384, 32); cobble(0, 32, 16, 176); cobble(368, 32, 16, 176); cobble(0, 208, 384, 16);
  g.globalAlpha = 0.4; R(g, 16, 32, 352, 6, '#000'); R(g, 16, 32, 5, 176, '#000'); R(g, 363, 32, 5, 176, '#000'); g.globalAlpha = 1;
  roomDoorOpenings(g, r, P2);
  // dead trees leaning over the walls
  for (const [x, y, s] of [[30, 30, 1], [354, 34, -1], [26, 206, 1], [360, 204, -1]]) {
    thickLine(g, x, y, x + 6 * s, y - 20, 5, f.tree); thickLine(g, x + 3 * s, y - 12, x + 18 * s, y - 22, 3, f.tree); thickLine(g, x + 4 * s, y - 16, x - 6 * s, y - 28, 2, f.tree); thickLine(g, x, y, x + 14 * s, y + 4, 3, f.tree);
  }
  // obstacles become graves with candles, rune pillars or dead shrubs
  for (let y = 0; y < RR; y++) for (let x = 0; x < RC; x++) {
    if (t[y][x] !== T_ROCK) continue;
    const cx = x * TILE + 8, by = y * TILE + 15, k = rng();
    if (k < 0.55) { candleGrave(g, cx, by, f, rng() < 0.6 ? 0 : 1); flames.push([cx, by - 4]); lights.push([cx, by - 6, 46, '#ffb050']); }
    else if (k < 0.8) { R(g, cx - 4, by - 15, 8, 15, f.stone); R(g, cx + 2, by - 15, 2, 15, f.stone2); R(g, cx - 5, by - 1, 10, 2, f.stone2); R(g, cx - 1, by - 12, 2, 8, f.rune); R(g, cx - 3, by - 10, 6, 1, f.rune); lights.push([cx, by - 8, 30, f.rune]); }
    else { thickLine(g, cx, by, cx - 5, by - 12, 3, f.tree); thickLine(g, cx, by, cx + 6, by - 10, 3, f.tree); thickLine(g, cx, by, cx + 1, by - 14, 2, f.tree); }
  }
  // wall candles
  for (const lx of [80, 304]) { R(g, lx - 3, 16, 7, 10, f.stone2); R(g, lx - 1, 18, 3, 4, '#e8e0c8'); flames.push([lx, 18]); lights.push([lx, 20, 50, '#ffb050']); }
  r.lights = lights; r.flames = flames;
  return c;
}
function renderVoidRoom(r, d) {
  const P2 = d.room, f = d.foe, t = r.tiles;
  const c = mkCanvas(RC * TILE, RR * TILE), g = c.getContext('2d'), rng = mulberry32(r.seed || 7);
  const lights = [], flames = [];
  R(g, 0, 0, c.width, c.height, '#140a22');
  for (let i = 0; i < 26; i++) { g.globalAlpha = 0.5; ell(g, rng() * 384, rng() * 224, 30 + rng() * 90, 20 + rng() * 50, rng() < 0.5 ? '#24123a' : '#2e1648'); }
  g.globalAlpha = 1;
  for (let i = 0; i < 120; i++) P(g, rng() * 384, rng() * 224, rng() < 0.7 ? '#8a7aa8' : '#ffffff');
  const floorAt = (x, y) => t[y] && t[y][x] !== undefined && (t[y][x] === T_FLOOR || t[y][x] === T_ROCK);
  // platform side faces then tiles
  for (let y = 0; y < RR; y++) for (let x = 0; x < RC; x++) {
    if (!floorAt(x, y)) continue;
    const px = x * TILE, py = y * TILE;
    if (!floorAt(x, y + 1)) { R(g, px, py + TILE, TILE, 6, P2.floor3); R(g, px, py + TILE + 6, TILE, 2, '#2a1e38'); for (let i = 2; i < TILE; i += 5) R(g, px + i, py + TILE, 1, 6, '#3e4444'); }
  }
  for (let y = 0; y < RR; y++) for (let x = 0; x < RC; x++) {
    if (!floorAt(x, y)) continue;
    const px = x * TILE, py = y * TILE, v = rng();
    R(g, px, py, TILE, TILE, '#2e3236');
    R(g, px + 1, py + 1, TILE - 2, TILE - 2, v < 0.15 ? P2.floor2 : P2.floor);
    R(g, px + 1, py + 1, TILE - 2, 1, '#8e9696'); R(g, px + 1, py + 1, 1, TILE - 2, '#8e9696');
    R(g, px + 1, py + TILE - 2, TILE - 2, 1, P2.floor3); R(g, px + TILE - 2, py + 1, 1, TILE - 2, P2.floor3);
    if (v > 0.85) { P(g, px + 5, py + 6, P2.floor3); P(g, px + 6, py + 7, P2.floor3); P(g, px + 7, py + 7, P2.floor3); }
  }
  // crimson arches with horns along the top, braziers between them
  for (let i = 0; i < 4; i++) {
    const ax = 40 + i * 101;
    if (Math.abs(ax - 192) < 30 && r.doors.U) continue;
    ell(g, ax - 11, 4, 22, 30, '#3a3e44'); ell(g, ax - 8, 7, 16, 26, P2.deco); R(g, ax - 8, 20, 16, 12, P2.deco);
    thickLine(g, ax - 12, 30, ax - 4, 0, 3, '#4a4e56'); thickLine(g, ax + 12, 30, ax + 4, 0, 3, '#4a4e56');
    R(g, ax - 12, 28, 24, 4, '#3a3e44');
  }
  for (const bx of [92, 292]) { R(g, bx - 4, 18, 9, 10, '#5a6068'); R(g, bx - 5, 17, 11, 2, '#7a8088'); flames.push([bx, 16]); lights.push([bx, 16, 52, '#ff8a3a']); }
  // obstacles become pillars with fire bowls
  for (let y = 0; y < RR; y++) for (let x = 0; x < RC; x++) {
    if (t[y][x] !== T_ROCK) continue;
    const cx = x * TILE + 8, by = y * TILE + 15;
    R(g, cx - 5, by - 12, 10, 12, '#5a6068'); R(g, cx - 5, by - 12, 10, 2, '#8a9098'); R(g, cx + 3, by - 10, 2, 10, '#3e4248'); R(g, cx - 6, by - 1, 12, 2, '#3e4248');
    flames.push([cx, by - 13]); lights.push([cx, by - 14, 44, '#ff8a3a']);
  }
  r.lights = lights; r.flames = flames;
  return c;
}
function drawFlames(sc, ox, oy) {
  const fl = sc.room.flames; if (!fl) return;
  for (const [x, y] of fl) {
    const k = Math.sin(sc.t * 13 + x) > 0 ? 1 : 0, h = 3 + ((Math.sin(sc.t * 9 + y) + 1) * 1.2 | 0);
    R(ctx, x - 1 - ox, y - h - oy, 3, h, '#f0602a'); R(ctx, x - ox, y - h - 1 - k - oy, 1, h, '#ffc040'); P(ctx, x - ox, y - 2 - oy, '#fff4c0');
  }
}
function renderRoomBG(r, d) {
  if (d.style === 'grave') return renderGraveRoom(r, d);
  if (d.style === 'void') return renderVoidRoom(r, d);
  const P2 = d.room, rp = d.rock;
  const c = mkCanvas(RC * TILE, RR * TILE), g = c.getContext('2d');
  const rng = mulberry32(r.seed || 7);
  const t = r.tiles;
  R(g, 0, 0, c.width, c.height, P2.floor);
  // floor mottling
  for (let i = 0; i < 26; i++) { const x = rng() * 384, y = 30 + rng() * 180, w = 20 + rng() * 60, h = 10 + rng() * 26; g.globalAlpha = 0.55; ell(g, x, y, w, h, P2.floor2); g.globalAlpha = 1; }
  for (let i = 0; i < 16; i++) { const x = rng() * 384, y = 30 + rng() * 180; g.globalAlpha = 0.5; ell(g, x, y, 10 + rng() * 30, 6 + rng() * 14, shade(P2.floor, -0.12)); g.globalAlpha = 1; }
  // stepping stones (square tiles in the ref)
  for (let i = 0; i < 60; i++) {
    const x = 16 + rng() * 352, y = 34 + rng() * 170, s = 3 + Math.floor(rng() * 4);
    R(g, x, y, s, s - 1, P2.floor3); R(g, x, y, s, 1, shade(P2.floor3, 0.15));
  }
  // grass / debris tufts
  for (let i = 0; i < 30; i++) { const x = 16 + rng() * 352, y = 34 + rng() * 170; P(g, x, y, shade(P2.floor2, 0.25)); P(g, x + 1, y - 1, shade(P2.floor2, 0.25)); P(g, x + 2, y, shade(P2.floor2, 0.25)); }
  if (d.id === 'tech') for (let i = 0; i < 8; i++) { const y = 40 + rng() * 160 | 0; R(g, 20, y, 344, 1, 'rgba(58,216,224,0.10)'); }
  // pits
  for (let y = 0; y < RR; y++) for (let x = 0; x < RC; x++) {
    if (t[y][x] !== T_PIT) continue;
    const px = x * TILE, py = y * TILE;
    R(g, px, py, TILE, TILE, P2.pit);
    const up = t[y - 1] && t[y - 1][x] !== T_PIT;
    if (up) { R(g, px, py, TILE, 5, P2.edge); R(g, px, py, TILE, 1, shade(P2.floor3, -0.1)); for (let i = 0; i < TILE; i += 2) if (rng() < 0.5) P(g, px + i, py + 5, P2.edge); }
    const isP = (xx, yy) => t[yy] && t[yy][xx] === T_PIT;
    if (!isP(x - 1, y)) for (let j = 0; j < TILE; j += 2) if (rng() < 0.6) P(g, px, py + j, P2.floor3);
    if (!isP(x + 1, y)) for (let j = 0; j < TILE; j += 2) if (rng() < 0.6) P(g, px + TILE - 1, py + j, P2.floor3);
    if (!isP(x, y + 1)) R(g, px, py + TILE - 1, TILE, 1, shade(P2.floor, 0.1));
  }
  // walls: top (two rows), sides, bottom
  const brick = (x, y, w, h) => {
    R(g, x, y, w, h, P2.wall);
    for (let j = 0; j < h; j += 8) {
      const off = ((j / 8) % 2) * 6;
      for (let i = -off; i < w; i += 12) {
        const bx = x + Math.max(0, i), bw = Math.min(11, w - Math.max(0, i), i < 0 ? 11 + i : 11);
        if (bw <= 0) continue;
        R(g, bx, y + j, bw, 7, rng() < 0.15 ? P2.brickHi : P2.brick);
        R(g, bx, y + j, bw, 1, P2.brickHi); R(g, bx, y + j + 6, bw, 1, P2.brickDark);
      }
    }
  };
  brick(0, 0, 384, 32); brick(0, 32, 16, 176); brick(368, 32, 16, 176); brick(0, 208, 384, 16);
  // wall base shadow onto floor
  g.globalAlpha = 0.35; R(g, 16, 32, 352, 5, '#000'); R(g, 16, 32, 4, 176, '#000'); R(g, 364, 32, 4, 176, '#000'); g.globalAlpha = 1;
  R(g, 0, 30, 384, 2, P2.brickDark);
  // creeping roots / vines on the walls (dark tendrils as in the reference)
  for (let i = 0; i < 7; i++) {
    let x = rng() * 384, y = rng() < 0.5 ? 2 : 210, dx = rng() - 0.5, dy = y < 100 ? 1 : -1;
    for (let k = 0; k < 40; k++) {
      R(g, x, y, 3, 3, P2.deco); x += dx * 2 + (rng() - 0.5) * 2; y += dy * (0.6 + rng() * 0.5);
      if ((dy > 0 && y > 40) || (dy < 0 && y < 200)) break;
    }
  }
  // doors: dark arches
  const arch = (x, y, w, h, vertical) => {
    R(g, x - 3, y, w + 6, h, P2.brickHi); R(g, x, y, w, h, '#050408');
    if (!vertical) { R(g, x - 5, y, 4, h, shade(P2.brickHi, 0.1)); R(g, x + w + 1, y, 4, h, shade(P2.brickHi, 0.1)); }
  };
  if (r.doors.U) arch(176, 0, 32, 32);
  if (r.doors.D) arch(176, 208, 32, 16);
  if (r.doors.L) { R(g, 0, 94, 16, 36, P2.brickHi); R(g, 0, 96, 14, 32, '#050408'); }
  if (r.doors.R) { R(g, 368, 94, 16, 36, P2.brickHi); R(g, 370, 96, 14, 32, '#050408'); }
  // rocks
  for (let y = 0; y < RR; y++) for (let x = 0; x < RC; x++) if (t[y][x] === T_ROCK) g.drawImage(rockSprite(rp, rng() < 0.4 ? 1 : 0), x * TILE - 1, y * TILE - 1);
  // wall lamps
  for (const lx of [80, 304]) { R(g, lx - 2, 14, 5, 8, '#2a2030'); R(g, lx - 1, 15, 3, 4, d.color); g.globalAlpha = 0.25; ell(g, lx - 12, 6, 25, 22, d.color); g.globalAlpha = 1; }
  return c;
}

// ---------------------------------------------------------------- scene
class DungeonScene {
  constructor(dIdx) {
    this.dIdx = dIdx; this.d = DUNGEONS[dIdx]; this.floor = 0; this.kills = 0;
    this.player = new Player(192, 190);
    this.parts = []; this.texts = []; this.rings = []; this.projs = []; this.pickups = []; this.enemies = []; this.props = [];
    this.shakeT = 0; this.shakeA = 0; this.hitstop = 0; this.pendantT = 0; this.bannerT = 0; this.slide = null; this.t = 0;
    this.darkCv = mkCanvas(W, H);
    this.rain = this.d.style === 'grave' ? Array.from({ length: 70 }, () => ({ x: rand(W + 60), y: rand(H), v: rand(180, 260) })) : [];
    this.music = 'dungeon';
    HUD.reset();
    this.startFloor(0);
    this.showBanner();
    if (!S.flags.tipPendant) { S.flags.tipPendant = true; setTimeout(() => UI.open(new TipUI('pendant')), 400); }
  }
  get world() { return this; }
  startFloor(f) {
    this.floor = f;
    this.map = f >= 3 ? genBossFloor() : genFloor(this.dIdx, f, mulberry32(Math.floor(Math.random() * 1e9)));
    this.enterRoom(this.map.start, null);
    if (f >= 3) this.music = 'boss';
    AudioSys.music(this.music);
  }
  showBanner() { this.bannerT = 3; }
  enterRoom(r, fromDir) {
    this.room = r; r.visited = true;
    this.bg = r.bg || (r.bg = renderRoomBG(r, this.d));
    this.enemies = []; this.projs = []; this.pickups = r.pickups || []; this.props = r.props || [];
    const p = this.player;
    if (fromDir) { const e = ENTRY[OPP[fromDir]]; p.x = e[0]; p.y = e[1]; }
    else if (r.type === 'boss') { p.x = 192; p.y = 190; }
    else { p.x = 192; p.y = r.doors.D && this.floor === 0 ? 180 : 150; }
    p.lastSafe = { x: p.x, y: p.y }; p.state = 'idle'; p.kx = p.ky = 0;
    if (!r.init) {
      r.init = true;
      const rng = mulberry32(r.seed + 99);
      const props = [];
      if (r.type === 'treasure') props.push(new Chest(192, 122, true));
      if (r.type === 'pool' || r.pool) props.push(new Pool(192, 124));
      if (r.type === 'stairs') props.push(new Stairs(192, 120, this.floor === 2 ? 'boss' : 'stairs'));
      // breakable pots along walls
      const nPots = randInt(rng, 0, 3);
      for (let i = 0; i < nPots; i++) {
        const tx = rng() < 0.5 ? randInt(rng, 2, 8) : randInt(rng, 15, 21), ty = rng() < 0.5 ? 2 : 12;
        if (r.tiles[ty][tx] === T_FLOOR) props.push(new Breakable(tx * 16 + 8, ty * 16 + 14, this.d.rock));
      }
      r.props = props; this.props = props;
      if (r.type === 'normal' || r.type === 'stairs' || (r.type === 'treasure' && rng() < 0.4)) r.spawnList = this.makeSpawns(r, rng);
      r.pickups = []; this.pickups = r.pickups;
      if (r.type === 'boss') {
        this.boss = new Boss(this); this.enemies.push(this.boss); r.closed = true;
        sfx('bossRoar'); this.shake(5);
      }
    }
    if (!r.cleared && r.spawnList && r.spawnList.length) {
      for (const s of r.spawnList) {
        if (dist(s.x, s.y, p.x, p.y) < 70) { s.x = 384 - s.x; s.y = clamp(240 - s.y, 44, 196); }
        const e = new Enemy(s.type, s.x, s.y, this); this.enemies.push(e);
      }
      r.closed = true; sfx('door');
    } else if (r.type !== 'boss') { r.cleared = true; r.closed = false; }
  }
  makeSpawns(r, rng) {
    const pool = [['slime', 3], ['golem', 2], ['turret', 1.4], ['wisp', 1.4]];
    if (this.floor >= 1) pool.push(['bigslime', 1.1]);
    const n = randInt(rng, 2, 4) + this.floor + (S.phase === 'night' ? 1 : 0);
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const tx = randInt(rng, 2, 21), ty = randInt(rng, 3, 11);
      if (r.tiles[ty][tx] !== T_FLOOR) continue;
      if (Math.abs(tx - 11.5) < 3 && Math.abs(ty - 7) < 2 && r.type === 'stairs') continue;
      const tot = pool.reduce((a, b) => a + b[1], 0); let x = rng() * tot, type = 'slime';
      for (const [k, w] of pool) { x -= w; if (x <= 0) { type = k; break; } }
      out.push({ type, x: tx * 16 + 8, y: ty * 16 + 12 });
    }
    return out;
  }
  tileAt(px, py) { const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE); if (tx < 0 || ty < 0 || tx >= RC || ty >= RR) return T_FLOOR; return this.room.tiles[ty][tx]; }
  solid(px, py) {
    const t = this.tileAt(px, py);
    if (t === T_WALL || t === T_ROCK) return true;
    if (this.room.closed) {
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      if (ty <= 1 || ty >= 13 || tx <= 0 || tx >= 23) return true;
    }
    for (const pr of this.props) if ((pr instanceof Chest) && Math.abs(px - pr.x) < 10 && py > pr.y - 8 && py < pr.y + 2) return true;
    if (this.boss && !this.boss.dead) { const dx = (px - this.boss.x) / 34, dy = (py - (this.boss.y - 22)) / 20; if (dx * dx + dy * dy < 1) return true; }
    return false;
  }
  pit(px, py) { return this.tileAt(px, py) === T_PIT; }
  shake(a) { this.shakeA = Math.max(this.shakeA, a * OPTS.shake * 2); this.shakeT = 0.25; }
  dropLoot(x, y, chance = 0.5, boost = 1, force = false) {
    if (!force && Math.random() > chance) return;
    const d = this.d;
    const k = (1 + this.floor * 0.35) * boost * (S.phase === 'night' ? 1.35 : 1);
    const list = d.loot.map(id => ({ id, w: Math.pow(ITEMS[id].w, 1 / k) }));
    const it = weighted(list);
    const def = ITEMS[it.id];
    const n = def.stack >= 10 ? randi(1, 3) : 1;
    let curse = null;
    if (Math.random() < 0.05 + this.floor * 0.03 + (S.phase === 'night' ? 0.05 : 0)) curse = choice(['destroy', 'transform', 'edge']);
    this.pickups.push(new Pickup(x, y, { id: it.id, n, curse }));
  }
  update(dt) {
    this.t += dt;
    for (const d of this.rain) { d.y += d.v * dt; d.x -= d.v * 0.35 * dt; if (d.y > H) { d.y = -6; d.x = rand(W + 60); } }
    if (this.slide) { this.slide.t += dt; if (this.slide.t >= this.slide.dur) this.slide = null; return; }
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.bannerT = Math.max(0, this.bannerT - dt);
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeA = 0; }
    const p = this.player;
    if (Input.pressed('START')) { UI.open(new PauseUI()); return; }
    if (Input.pressed('SELECT') && p.state !== 'dead') { UI.open(new InventoryUI({ inDungeon: true, scene: this })); return; }
    p.update(dt, this, 'dungeon');
    // interactables
    this.near = null;
    for (const pr of this.props) {
      if (pr.update) pr.update(dt, this);
      if (pr.interact && dist(p.x, p.y, pr.x, pr.y + 4) < 22 && (!this.room.closed || pr instanceof Chest)) this.near = pr;
    }
    if (this.near && Input.pressed('A') && p.state !== 'dead') this.near.use(this);
    for (const e of this.enemies) e.update(dt, this);
    for (const pr of this.projs) pr.update(dt, this);
    this.projs = this.projs.filter(pr => pr.life > 0);
    for (const pk of this.pickups) pk.update(dt, this);
    this.room.pickups = this.pickups = this.pickups.filter(pk => !pk.dead);
    this.enemies = this.enemies.filter(e => !e.dead || e === this.boss);
    updateFX(this, dt);
    // room cleared
    if (this.room.closed && this.room.type !== 'boss' && this.enemies.every(e => e.dead)) {
      this.room.closed = false; this.room.cleared = true; sfx('door'); this.shake(2);
    }
    // pendant (hold)
    if (Input.down('PENDANT') && p.state !== 'dead') {
      this.pendantT += dt;
      if (this.pendantT >= 1.2) { this.pendantT = 0; Input.consume('PENDANT'); this.usePendant(); }
    } else this.pendantT = Math.max(0, this.pendantT - dt * 3);
    // door transitions
    if (p.state !== 'dead' && p.state !== 'fall' && !this.room.closed) {
      let dir = null;
      if (p.y < 26 && this.room.doors.U) dir = 'U';
      else if (p.y > 214 && this.room.doors.D) dir = 'D';
      else if (p.x < 6 && this.room.doors.L) dir = 'L';
      else if (p.x > 378 && this.room.doors.R) dir = 'R';
      if (dir === 'D' && this.room.type === 'start' && this.floor === 0) {
        p.y = 200; p.state = 'idle'; Input.clearAll();
        ask('Leave the dungeon and return to town?', () => this.exitToTown('walk'));
      } else if (dir) this.goRoom(dir);
    }
    // death sequence
    if (p.state === 'dead' && !this.deathShown) {
      p.st += 0;
      this.deathT = (this.deathT || 0) + dt;
      if (this.deathT > 1.6) { this.deathShown = true; UI.open(new DeathUI(this)); }
    }
  }
  goRoom(dir) {
    const r = this.room;
    const n = this.map.rooms[this.map.key(r.x + DXY[dir][0], r.y + DXY[dir][1])];
    if (!n) return;
    const snap = mkCanvas(W, H); const g = snap.getContext('2d');
    g.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, W, H);
    this.slide = { img: snap, dir, t: 0, dur: 0.32 };
    this.enterRoom(n, dir);
  }
  useStairs(s) {
    if (this.room.closed) return;
    if (s.kind === 'portal') { this.exitToTown('portal'); return; }
    sfx('stairs');
    Game.fade(() => { this.startFloor(this.floor + 1); this.showBanner(); });
  }
  usePendant() {
    const cost = this.d.pendantCost * (S.phase === 'night' ? 1 : 1);
    if (this.room.type === 'boss' && this.boss && !this.boss.dead) { toast('The guardian\'s power blocks the pendant!', '#ffb0a0'); sfx('error'); return; }
    if (S.gold < cost) { toast(`The pendant needs ${fmt(cost)} gold to activate`, '#ffb0a0'); sfx('error'); return; }
    S.gold -= cost; sfx('teleport');
    FX.burst(this, this.player.x, this.player.y - 10, [C.mint, '#fff', C.teal], 30, 80);
    this.exitToTown('pendant');
  }
  exitToTown(how) {
    Game.fade(() => { returnFromDungeon(this, how); });
  }
  onPlayerDeath() { sfx('death'); AudioSys.music('death'); }
  onBossDeath(b) {
    sfx('bossRoar'); this.shake(8);
    setTimeout(() => {
      this.room.closed = false; this.room.cleared = true;
      this.pickups.push(new Pickup(b.x, b.y + 20, { id: BOSS_ITEM[this.dIdx], n: 1 }));
      for (let i = 0; i < 4; i++) this.dropLoot(b.x + rand(-30, 30), b.y + 20, 1, 3, true);
      this.pickups.push(new Pickup(b.x, b.y + 24, null, { gold: Math.round(400 * this.d.hpMul) }));
      this.props.push(new Stairs(192, 170, 'portal'));
      const first = !S.bosses[this.dIdx];
      S.bosses[this.dIdx] = true;
      if (first) {
        if (this.dIdx < 3) { S.unlocked = Math.max(S.unlocked, this.dIdx + 2); toast(`You found the ${DUNGEONS[this.dIdx + 1].name} key!`, C.gold); }
        else toast('All four guardians have fallen!', C.gold);
      }
      AudioSys.music('dungeon');
      if (first && Game.scene === this) Game.setScene(storyGuardianFalls(this));
    }, 1600);
  }
  // ------------------------------------------------------------ draw
  draw() {
    const sx = this.shakeT > 0 ? rand(-this.shakeA, this.shakeA) : 0, sy = this.shakeT > 0 ? rand(-this.shakeA, this.shakeA) : 0;
    const ox = Math.round(sx), oy = Math.round(CAM_Y + sy);
    R(ctx, 0, 0, W, H, '#000');
    if (this.slide) {
      const k = ease(this.slide.t / this.slide.dur), [dx, dy] = DXY[this.slide.dir];
      ctx.drawImage(this.slide.img, -dx * k * W, -dy * k * H);
      ctx.save(); ctx.translate(dx * (1 - k) * W, dy * (1 - k) * H);
      ctx.drawImage(this.bg, 0, -CAM_Y);
      ctx.restore();
      return;
    }
    ctx.drawImage(this.bg, -ox, -oy);
    this.drawDoors(ox, oy);
    // shadows of boss attacks under everything
    if (this.boss && !this.boss.dead) this.boss.drawShadows(ox, oy);
    for (const pr of this.props) if (pr instanceof Pool || pr instanceof Stairs) pr.draw(ox, oy);
    const list = [...this.props.filter(pr => !(pr instanceof Pool || pr instanceof Stairs)), ...this.pickups, ...this.enemies, this.player, ...(this.extra || [])];
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.draw(ox, oy);
    for (const pr of this.projs) pr.draw(ox, oy);
    drawFX(this, ox, oy);
    if (this.d.dark) this.drawDark(ox, oy);
    drawFlames(this, ox, oy);
    for (const d of this.rain) { ctx.globalAlpha = 0.45; R(ctx, d.x, d.y, 1, 2, '#7ad8c0'); R(ctx, d.x - 1, d.y + 2, 1, 2, '#7ad8c0'); ctx.globalAlpha = 1; }
    // interaction prompt
    if (this.cinematic) return;
    if (this.near && this.player.state !== 'dead') worldPrompt(this.near.x - ox, this.near.y - oy - 26, [['A', this.near.interact]]);
    this.drawHUD();
  }
  drawDark(ox, oy) {
    const g = this.darkCv.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    g.fillStyle = `rgba(6,4,14,${this.d.dark})`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a = 1) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    const flick = 1 + Math.sin(this.t * 8) * 0.04;
    hole(this.player.x - ox, this.player.y - 10 - oy, 78);
    for (const [x, y, r] of this.room.lights || []) hole(x - ox, y - oy, r * flick, 0.95);
    for (const p of this.projs) hole(p.x - ox, p.y - oy, 18, 0.8);
    if (this.boss && !this.boss.dead) hole(this.boss.x - ox, this.boss.y - 40 - oy, 40, 0.6);
    for (const pr of this.props) if (pr instanceof Pool || (pr instanceof Stairs && pr.kind === 'portal')) hole(pr.x - ox, pr.y - oy, 40, 0.8);
    ctx.drawImage(this.darkCv, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, col] of this.room.lights || []) {
      const sx = x - ox, sy = y - oy, gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.6 * flick);
      gr.addColorStop(0, (col || '#ffb050') + '38'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  drawDoors(ox, oy) {
    const closed = this.room.closed, P2 = this.d.room;
    if (!closed) return;
    const bars = (x, y, w, h, vert) => {
      R(ctx, x - ox, y - oy, w, h, P2.brickDark);
      if (vert) for (let j = 0; j < h; j += 5) R(ctx, x - ox, y - oy + j, w, 2, '#8a8a9a');
      else for (let i = 0; i < w; i += 5) R(ctx, x - ox + i, y - oy, 2, h, '#8a8a9a');
    };
    if (this.room.doors.U) bars(176, 6, 32, 26, false);
    if (this.room.doors.D) bars(176, 208, 32, 12, false);
    if (this.room.doors.L) bars(2, 96, 12, 32, true);
    if (this.room.doors.R) bars(370, 96, 12, 32, true);
  }
  drawHUD() {
    drawCombatHUD(this);
    // minimap
    const mx = 6, my = H - 40;
    ctx.globalAlpha = 0.75; R(ctx, mx - 2, my - 2, 58, 38, '#120e16'); ctx.globalAlpha = 1;
    const cur = this.room;
    for (const r of Object.values(this.map.rooms)) {
      const known = r.visited || Object.keys(r.doors).some(d => { const n = this.map.rooms[this.map.key(r.x + DXY[d][0], r.y + DXY[d][1])]; return n && n.visited; });
      if (!known) continue;
      const x = mx + (r.x - cur.x) * 9 + 24, y = my + (r.y - cur.y) * 6 + 15;
      if (x < mx - 2 || x > mx + 50 || y < my - 2 || y > my + 32) continue;
      R(ctx, x, y, 7, 4, r === cur ? C.mint : r.visited ? '#8a8aa0' : '#3a3a4a');
      if (r.visited) {
        if (r.type === 'stairs') R(ctx, x + 2, y + 1, 3, 2, '#e0453a');
        if (r.type === 'treasure') R(ctx, x + 2, y + 1, 3, 2, C.gold);
        if (r.type === 'pool' || r.pool) R(ctx, x + 2, y + 1, 3, 2, '#3a8ae0');
      }
    }
    txt('Map', mx + 40, my + 34, { size: 6, color: '#8a8aa0' });
    // floor banner
    if (this.bannerT > 0 && this.floor < 3) {
      const a = clamp(Math.min(this.bannerT, 3 - this.bannerT) / 0.4, 0, 1);
      ctx.globalAlpha = a;
      floorScroll(W / 2, H - 58, this.floor >= 3 ? this.d.boss : `${this.d.name} ${['I', 'II', 'III'][this.floor]}`, this.d.color, this.floor);
      ctx.globalAlpha = 1;
    }
    // boss bar
    if (this.boss && !this.boss.dead && this.boss.intro <= 0) {
      const b = this.boss;
      floorScroll(W / 2, H - 46, b.name, this.d.color, -1, true);
      hpBar(70, H - 9, W - 116, 5, b.hp / b.maxHp, '#c8453a');
    }
  }
}
function floorScroll(cx, y, text, col, floor, small) {
  const w = small ? 110 : 120, x = cx - w / 2;
  R(ctx, x - 4, y, w + 8, 22, C.paper3); R(ctx, x, y + 1, w, 20, C.paper);
  R(ctx, x - 6, y - 2, 6, 26, C.paper2); R(ctx, x + w, y - 2, 6, 26, C.paper2);
  R(ctx, x - 6, y - 2, 6, 2, C.paper3); R(ctx, x + w, y + 22, 6, 2, C.paper3);
  // emblem
  ell(ctx, cx - 8, y + 2, 16, 16, col); ell(ctx, cx - 5, y + 5, 10, 10, '#1b1420'); ell(ctx, cx - 2, y + 8, 4, 4, col);
  for (let i = 0; i < 3; i++) { P(ctx, cx - 16 - i * 4, y + 10, col); P(ctx, cx + 15 + i * 4, y + 10, col); }
  txt(text, cx, y + 31, { size: 7, align: 'center', color: '#efe3c5', outline: '#1b1420' });
  if (floor >= 0 && floor <= 2) for (let i = 0; i < 3; i++) ell(ctx, cx - 10 + i * 8, y + 34, 4, 4, i <= floor ? C.mint : '#3a3a4a');
}
function worldPrompt(x, y, list) {
  // cream rounded pill with a pixel button, like the in-world prompts of the genre
  let w = 8; list.forEach(([b, l]) => w += 18 + textW(l, 7));
  x = Math.round(clamp(x, w / 2 + 2, W - w / 2 - 2)); y = Math.round(y);
  const x0 = x - w / 2, y0 = y - 11, h = 16;
  ctx.globalAlpha = 0.35; R(ctx, x0 + 2, y0 + 3, w, h, '#000'); ctx.globalAlpha = 1;
  R(ctx, x0 + 2, y0, w - 4, h, PK.outline); R(ctx, x0, y0 + 2, w, h - 4, PK.outline); R(ctx, x0 + 1, y0 + 1, w - 2, h - 2, PK.outline);
  R(ctx, x0 + 2, y0 + 1, w - 4, h - 2, '#efe3c5'); R(ctx, x0 + 1, y0 + 2, w - 2, h - 4, '#efe3c5'); R(ctx, x0 + 2, y0 + h - 3, w - 4, 2, '#d8c9a0');
  let xx = x0 + 4;
  list.forEach(([b, l]) => { const bw = btnGlyph(xx, y + 1, b); txt(l, xx + bw + 4, y, { size: 7, color: '#4a3b28' }); promptHit(xx - 4, y0 - 4, bw + 8 + textW(l, 7), h + 8, b); xx += bw + 8 + textW(l, 7); });
}
function drawCombatHUD(sc) {
  const st = playerStats();
  drawHealthHUD(5, 5);
  // weapon circles top-right
  const wx = W - 26, wy = 6;
  const circ = (x, y, r, fill) => { ell(ctx, x, y, r, r, '#1b1420'); ell(ctx, x + 1, y + 1, r - 2, r - 2, fill); };
  circ(wx, wy, 22, '#e8dcc0');
  const line = S.equip.w[S.equip.active] || S.equip.w[0];
  ctx.drawImage(gearIcon(WEAPON_LINES[line].icon, S.gear[line]), wx + 3, wy + 3);
  const other = S.equip.w[S.equip.active ^ 1];
  if (other) { circ(wx - 14, wy + 2, 14, '#a8a090'); const ic = gearIcon(WEAPON_LINES[other].icon, S.gear[other]); ctx.drawImage(ic, wx - 14 + 1, wy + 2 + 1, 12, 12); }
  if (Input.device() !== 'touch') btnGlyph(wx - 14, wy + 22, 'LB');
  // potion
  const px = W - 26, py = 32;
  circ(px, py, 18, '#e8dcc0');
  let tier = -1, count = 0; for (let t = 3; t >= 0; t--) { if (S.potions[t] > 0 && tier < 0) tier = t; count += S.potions[t]; }
  if (tier >= 0) ctx.drawImage(potionIcon(tier), px + 2, py + 2, 14, 14);
  txt(count, px + 18, py + 17, { size: 7, align: 'right', color: '#fff', outline: '#1b1420' });
  if (Input.device() !== 'touch') btnGlyph(px - 12, py + 14, 'RB');
  // bag count
  const used = S.bag.filter(Boolean).length;
  txt(`${used}/20`, W - 8, 62, { size: 6, align: 'right', color: used >= 20 ? '#ff8a7a' : '#fff', outline: '#1b1420' });
  // pendant bottom-right
  // (phones: the pendant has its own button, so the ring only appears above the hero while held)
  const touch = Input.device() === 'touch';
  if (sc && sc.pendantT !== undefined && (!touch || sc.pendantT > 0)) {
    const cx = touch ? Math.round(sc.player.x) : W - 16, cy = touch ? Math.max(14, Math.round(sc.player.y) - 40) : H - 16;
    ell(ctx, cx - 11, cy - 11, 22, 22, '#1b1420'); ell(ctx, cx - 10, cy - 10, 20, 20, '#e8dcc0');
    R(ctx, cx - 1, cy - 7, 2, 4, '#8a6a4a'); ell(ctx, cx - 5, cy - 4, 10, 10, C.teal); ell(ctx, cx - 3, cy - 2, 6, 6, C.mint);
    if (sc.pendantT > 0) {
      ctx.strokeStyle = C.mint; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sc.pendantT / 1.2); ctx.stroke();
    }
    if (Input.device() !== 'touch') btnGlyph(cx - 22, cy + 6, 'PENDANT');
  }
}
