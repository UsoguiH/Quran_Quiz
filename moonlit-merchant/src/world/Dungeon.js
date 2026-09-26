import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Area } from './Area.js';
import { Particles } from '../render/Particles.js';
import { Textures, boxUV } from '../render/Textures.js';
import { makeTorch, makeChest, makeRock, makePot, makeBarrel, makeCrate, mat, RoundedBoxGeometry } from '../render/Models.js';
import { makePortal, makeWaterMaterial, makeLightShaft } from '../render/Shaders.js';
import { Slime, Golem, Wisp, Rootling, Breakable, Colossus } from '../entities/Enemies.js';
import { LOOT_TABLES, pickWeighted } from '../game/Items.js';

export const ROOM = 20;
const HALF = 9;
const WALL_H = 5;
const DOOR_W = 3.4;
const DIRS = {
  n: [0, 1],
  s: [0, -1],
  e: [1, 0],
  w: [-1, 0],
};
const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const FLOOR_ROOMS = { 1: 8, 2: 10, 3: 12 };
const LIGHT_POOL = 6;

function mulberry(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Dungeon extends Area {
  constructor(game) {
    super(game, 'dungeon');
    this.combat = true;
    this.floor = 1;
    this.viewLight = { hemi: 0.45, sun: 0.35, fill: 0.5, env: 0.12 };
    const st = Textures.stoneBricks();
    this.wallMat = new THREE.MeshStandardMaterial({
      map: st.map,
      normalMap: st.normalMap,
      roughnessMap: st.roughnessMap,
      color: 0xb8b0c8,
      normalScale: new THREE.Vector2(1.4, 1.4),
    });
    const fl = Textures.dungeonFloor();
    this.floorMat = new THREE.MeshStandardMaterial({
      map: fl.map,
      normalMap: fl.normalMap,
      roughnessMap: fl.roughnessMap,
      color: 0xb0a8b8,
      normalScale: new THREE.Vector2(1.2, 1.2),
    });
    this.ceilMat = new THREE.MeshStandardMaterial({ map: st.map, normalMap: st.normalMap, color: 0x4a4458, roughness: 1 });
  }

  // ------------------------------------------------------------- generation

  generate(floor, seed) {
    const rng = mulberry(seed);
    this.rng = rng;
    const target = FLOOR_ROOMS[floor] ?? 10;
    const rooms = new Map();
    const key = (x, y) => `${x},${y}`;
    const mk = (x, y) => {
      const r = { gx: x, gy: y, doors: {}, type: 'combat', visited: false, seen: false, cleared: false, active: false };
      rooms.set(key(x, y), r);
      return r;
    };
    const start = mk(0, 0);
    start.type = 'start';
    start.cleared = true;
    const list = [start];
    let guard = 0;
    while (list.length < target && guard++ < 2000) {
      const from = rng() < 0.55 ? list[list.length - 1 - Math.floor(rng() * Math.min(3, list.length))] : list[Math.floor(rng() * list.length)];
      const dirs = Object.keys(DIRS);
      const d = dirs[Math.floor(rng() * 4)];
      const nx = from.gx + DIRS[d][0];
      const ny = from.gy + DIRS[d][1];
      if (ny < 0 || Math.abs(nx) > 3 || ny > 6) continue;
      if (rooms.has(key(nx, ny))) continue;
      // avoid over-connected rooms for more corridor-like layouts
      const neighbours = Object.values(DIRS).filter(([dx, dy]) => rooms.has(key(nx + dx, ny + dy))).length;
      if (neighbours > 1 && rng() < 0.7) continue;
      const r = mk(nx, ny);
      from.doors[d] = true;
      r.doors[OPP[d]] = true;
      list.push(r);
    }
    // occasional loops
    for (const r of list) {
      for (const [d, [dx, dy]] of Object.entries(DIRS)) {
        const n = rooms.get(key(r.gx + dx, r.gy + dy));
        if (n && !r.doors[d] && rng() < 0.12 && n.type !== 'start' && r.type !== 'start') {
          r.doors[d] = true;
          n.doors[OPP[d]] = true;
        }
      }
    }
    // BFS distance
    const dist = new Map([[start, 0]]);
    const q = [start];
    while (q.length) {
      const r = q.shift();
      for (const [d, [dx, dy]] of Object.entries(DIRS)) {
        if (!r.doors[d]) continue;
        const n = rooms.get(key(r.gx + dx, r.gy + dy));
        if (n && !dist.has(n)) {
          dist.set(n, dist.get(r) + 1);
          q.push(n);
        }
      }
    }
    list.forEach((r) => (r.dist = dist.get(r) ?? 0));
    const sorted = [...list].sort((a, b) => b.dist - a.dist);
    const far = sorted[0];
    far.type = floor >= 3 ? 'boss' : 'stairs';
    // boss room: make sure it has a single entrance
    if (far.type === 'boss') {
      const doorsList = Object.keys(far.doors);
      if (doorsList.length > 1) {
        // keep the door towards the closest-to-start neighbour
        let keep = null;
        let best = 1e9;
        for (const d of doorsList) {
          const n = rooms.get(key(far.gx + DIRS[d][0], far.gy + DIRS[d][1]));
          if (n && n.dist < best) {
            best = n.dist;
            keep = d;
          }
        }
        for (const d of doorsList) {
          if (d === keep) continue;
          const n = rooms.get(key(far.gx + DIRS[d][0], far.gy + DIRS[d][1]));
          const ends = Object.keys(n.doors).length;
          if (ends > 1) {
            delete far.doors[d];
            delete n.doors[OPP[d]];
          }
        }
      }
    }
    const candidates = list.filter((r) => r.type === 'combat');
    const deadEnds = candidates.filter((r) => Object.keys(r.doors).length === 1);
    const pick = (arr) => arr.splice(Math.floor(rng() * arr.length), 1)[0];
    const treasure = deadEnds.length ? pick(deadEnds) : pick(candidates);
    if (treasure) {
      treasure.type = 'treasure';
      const i = candidates.indexOf(treasure);
      if (i >= 0) candidates.splice(i, 1);
    }
    const fountainPool = candidates.filter((r) => r.dist >= 2);
    if (fountainPool.length) {
      const f = pick(fountainPool);
      f.type = 'fountain';
      candidates.splice(candidates.indexOf(f), 1);
    }
    list.forEach((r) => {
      if (r.type !== 'combat') r.cleared = true;
      if (r.type === 'boss') r.cleared = false;
    });
    this.rooms = list;
    this.roomMap = rooms;
    this.roomKey = key;
    return list;
  }

  roomCenter(r) {
    return new THREE.Vector3(r.gx * ROOM, 0, -r.gy * ROOM);
  }

  // ------------------------------------------------------------- building

  reset() {
    // dispose previous floor
    this.enemies.forEach((e) => e.dispose?.());
    this.projectiles.forEach((p) => p.kill());
    this.loot.forEach((l) => l.dispose());
    this.scene.traverse((o) => {
      if (o.geometry && o.userData.owned) o.geometry.dispose();
    });
    this.scene = new THREE.Scene();
    this.sparks = new Particles(2000, true);
    this.dust = new Particles(800, false);
    this.scene.add(this.sparks.points, this.dust.points);
    this.collision.clear();
    this.interactables = [];
    this.enemies = [];
    this.loot = [];
    this.projectiles = [];
    this.breakables = [];
    this.flames = [];
    this.torchPositions = [];
    this.bars = [];
    this.animated = [];
    this.bossRoomActive = false;
  }

  build(floor) {
    this.reset();
    this.floor = floor;
    const seed = (Date.now() ^ (floor * 7919)) >>> 0;
    const rooms = this.generate(floor, seed);
    const rng = this.rng;
    const scene = this.scene;
    scene.fog = new THREE.FogExp2(0x0a0812, 0.032);
    scene.background = new THREE.Color(0x05040a);

    const hemi = new THREE.HemisphereLight(0x4a5a8a, 0x1a1210, 0.28);
    const amb = new THREE.AmbientLight(0x30284a, 0.18);
    scene.add(hemi, amb);

    // pooled torch lights
    this.lightPool = [];
    for (let i = 0; i < LIGHT_POOL; i++) {
      const l = new THREE.PointLight(0xff9a4a, 0, 13, 1.6);
      scene.add(l);
      this.lightPool.push(l);
    }
    // moonbeam spot light (one shadow caster, follows current room)
    this.moon = new THREE.SpotLight(0x9ab4ff, 0, 18, 0.55, 0.6, 1.2);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    this.moon.shadow.bias = -0.0005;
    this.moon.shadow.camera.near = 0.5;
    this.moon.shadow.camera.far = 20;
    scene.add(this.moon, this.moon.target);

    const wallGeos = [];
    const floorGeos = [];
    const ceilGeos = [];
    const addBox = (arr, x, y, z, w, h, d, scale = 4) => {
      const g = boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, scale);
      g.translate(x, y, z);
      arr.push(g);
    };
    const addPlane = (arr, x, z, w, d, y, flip) => {
      const g = new THREE.PlaneGeometry(w, d);
      g.rotateX(flip ? Math.PI / 2 : -Math.PI / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 4, (uv.getY(i) * d) / 4);
      g.translate(x, y, z);
      arr.push(g);
    };

    for (const r of rooms) {
      const c = this.roomCenter(r);
      r.center = c;
      addPlane(floorGeos, c.x, c.z, HALF * 2, HALF * 2, 0);
      addPlane(ceilGeos, c.x, c.z, HALF * 2 + 2, HALF * 2 + 2, WALL_H, true);

      // walls on each side
      for (const side of ['n', 's', 'e', 'w']) {
        const door = !!r.doors[side];
        const horizontal = side === 'n' || side === 's';
        const sign = side === 'n' || side === 'e' ? 1 : -1;
        // wall runs along X for n/s (at z = c.z -/+ ...). north = -z
        const wallPos = horizontal ? c.z - sign * (HALF + 0.5) : c.x + sign * (HALF + 0.5);
        const segs = door
          ? [
              [-HALF - 1, -DOOR_W / 2],
              [DOOR_W / 2, HALF + 1],
            ]
          : [[-HALF - 1, HALF + 1]];
        for (const [a, b] of segs) {
          const len = b - a;
          const mid = (a + b) / 2;
          if (horizontal) {
            addBox(wallGeos, c.x + mid, WALL_H / 2, wallPos, len, WALL_H, 1);
            this.collision.addBox(c.x + a, wallPos - 0.5, c.x + b, wallPos + 0.5);
          } else {
            addBox(wallGeos, wallPos, WALL_H / 2, c.z + mid, 1, WALL_H, len);
            this.collision.addBox(wallPos - 0.5, c.z + a, wallPos + 0.5, c.z + b);
          }
        }
        if (door) {
          // lintel
          const lh = WALL_H - 3.3;
          if (horizontal) addBox(wallGeos, c.x, 3.3 + lh / 2, wallPos, DOOR_W, lh, 1);
          else addBox(wallGeos, wallPos, 3.3 + lh / 2, c.z, 1, lh, DOOR_W);
          // doorway floor (gap between rooms): only add from n/e side to avoid duplicates
          if (side === 'n') addPlane(floorGeos, c.x, c.z - HALF - 1, DOOR_W, 2, 0);
          if (side === 'e') addPlane(floorGeos, c.x + HALF + 1, c.z, 2, DOOR_W, 0);
          // door bars (raised when the room locks)
          this.makeBars(r, side, horizontal, horizontal ? c.x : wallPos - sign * 0.55, horizontal ? wallPos + sign * 0.55 : c.z);
        } else if (rng() < 0.5) {
          // wall banner
          this.addBanner(c, side, rng);
        }
        // torches (2 per wall, away from the door)
        const offs = door ? [-5.5, 5.5] : rng() < 0.5 ? [-4, 4] : [0];
        for (const o of offs) {
          const t = makeTorch();
          const inset = HALF - 0.05;
          if (horizontal) {
            t.position.set(c.x + o, 2.6, c.z - sign * inset);
            t.rotation.y = side === 'n' ? 0 : Math.PI;
          } else {
            t.position.set(c.x + sign * inset, 2.6, c.z + o);
            t.rotation.y = side === 'e' ? -Math.PI / 2 : Math.PI / 2;
          }
          scene.add(t);
          this.flames.push(t.userData.flame);
          const lp = new THREE.Vector3();
          t.userData.flame.getWorldPosition(lp);
          t.updateMatrixWorld(true);
          t.userData.flame.getWorldPosition(lp);
          this.torchPositions.push({ pos: lp, room: r });
        }
      }

      this.decorateRoom(r, rng);
    }

    const walls = new THREE.Mesh(mergeGeometries(wallGeos), this.wallMat);
    walls.castShadow = true;
    walls.receiveShadow = true;
    const floorMesh = new THREE.Mesh(mergeGeometries(floorGeos), this.floorMat);
    floorMesh.receiveShadow = true;
    const ceil = new THREE.Mesh(mergeGeometries(ceilGeos), this.ceilMat);
    [walls, floorMesh, ceil].forEach((m) => (m.userData.owned = true));
    scene.add(walls, floorMesh, ceil);

    // floating dust motes
    this.motes = new Particles(400, true);
    scene.add(this.motes.points);
    this.moteTimer = 0;

    this.currentRoom = null;
    this.lightTimer = 0;
    const start = rooms[0];
    this.spawn.copy(start.center).add(new THREE.Vector3(0, 0, 4));
    this.spawnYaw = 0;
  }

  makeBars(room, side, horizontal, x, z) {
    const g = new THREE.Group();
    const iron = mat(0x3a3a44, { metalness: 0.8, roughness: 0.35 });
    const n = 6;
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.3, 8), iron);
      const o = (i / (n - 1) - 0.5) * (DOOR_W - 0.4);
      b.position.set(horizontal ? o : 0, 1.65, horizontal ? 0 : o);
      b.castShadow = true;
      g.add(b);
    }
    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(horizontal ? DOOR_W : 0.1, 0.12, horizontal ? 0.1 : DOOR_W),
      iron,
    );
    cross.position.y = 2.4;
    g.add(cross);
    g.position.set(x, -3.4, z);
    this.scene.add(g);
    const col = horizontal
      ? this.collision.addBox(x - DOOR_W / 2, z - 0.2, x + DOOR_W / 2, z + 0.2)
      : this.collision.addBox(x - 0.2, z - DOOR_W / 2, x + 0.2, z + DOOR_W / 2);
    col.active = false;
    const bar = { room, group: g, col, target: -3.4 };
    this.bars.push(bar);
    return bar;
  }

  setBars(room, closed) {
    for (const b of this.bars) {
      if (b.room !== room) continue;
      b.target = closed ? 0 : -3.4;
      b.col.active = closed;
    }
    this.game.audio.play('door');
  }

  addBanner(c, side, rng) {
    const colors = [0x7a2a3a, 0x2a3a7a, 0x3a6a3a, 0x5a2a7a];
    const cl = new THREE.Color(colors[Math.floor(rng() * colors.length)]);
    const cloth = Textures.cloth(cl.r, cl.g, cl.b);
    const geo = new THREE.PlaneGeometry(1.4, 2.6, 1, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < -1.1) pos.setX(i, pos.getX(i) * (Math.abs(pos.getX(i)) < 0.1 ? 1 : 1));
    }
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: cloth.map, side: THREE.DoubleSide, roughness: 1 }));
    const emblem = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.05, 8, 24, Math.PI * 1.3),
      new THREE.MeshStandardMaterial({ color: 0xe0c070, metalness: 0.6, roughness: 0.4 }),
    );
    emblem.position.z = 0.02;
    emblem.rotation.z = 0.9;
    m.add(emblem);
    const inset = HALF - 0.02;
    const horizontal = side === 'n' || side === 's';
    const sign = side === 'n' || side === 'e' ? 1 : -1;
    if (horizontal) {
      m.position.set(c.x, 3.1, c.z - sign * inset);
      m.rotation.y = side === 'n' ? 0 : Math.PI;
    } else {
      m.position.set(c.x + sign * inset, 3.1, c.z);
      m.rotation.y = side === 'e' ? -Math.PI / 2 : Math.PI / 2;
    }
    m.receiveShadow = true;
    this.scene.add(m);
  }

  decorateRoom(r, rng) {
    const c = r.center;
    const scene = this.scene;
    const stone = new THREE.MeshStandardMaterial({
      map: this.wallMat.map,
      normalMap: this.wallMat.normalMap,
      color: 0xa8a0b8,
      roughness: 0.9,
    });

    // pillars
    if (r.type !== 'boss' && r.type !== 'fountain' && rng() < 0.55) {
      const pts = [
        [-5, -5],
        [5, -5],
        [-5, 5],
        [5, 5],
      ];
      for (const [px, pz] of pts) {
        const g = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, WALL_H, 16), stone);
        shaft.position.y = WALL_H / 2;
        const base = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.5, 1.5, 2, 0.08), stone);
        base.position.y = 0.25;
        const cap = base.clone();
        cap.position.y = WALL_H - 0.25;
        g.add(shaft, base, cap);
        g.position.set(c.x + px, 0, c.z + pz);
        g.traverse((o) => o.isMesh && ((o.castShadow = true), (o.receiveShadow = true)));
        scene.add(g);
        this.collision.addBox(c.x + px - 0.75, c.z + pz - 0.75, c.x + px + 0.75, c.z + pz + 0.75);
      }
      r.pillars = true;
    }

    // rubble along walls
    for (let i = 0; i < 6; i++) {
      const rock = makeRock(rng, 0.2 + rng() * 0.35);
      const edge = rng() < 0.5;
      const along = (rng() - 0.5) * 16;
      const across = (HALF - 0.6 - rng() * 0.8) * (rng() < 0.5 ? -1 : 1);
      rock.position.set(c.x + (edge ? along : across), 0.05, c.z + (edge ? across : along));
      rock.material = mat(0x6a6474, { roughness: 0.95 });
      scene.add(rock);
    }

    // moonbeam shaft through a crack in the ceiling
    if (rng() < 0.6 || r.type === 'fountain' || r.type === 'treasure' || r.type === 'boss') {
      const off = r.pillars || r.type !== 'combat' ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3((rng() - 0.5) * 6, 0, (rng() - 0.5) * 6);
      const shaft = makeLightShaft(0.9, 2.8, WALL_H, [0.45, 0.6, 1.0], 0.28);
      shaft.position.set(c.x + off.x, WALL_H, c.z + off.z);
      scene.add(shaft);
      const crack = new THREE.Mesh(
        new THREE.CircleGeometry(1.0, 24),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.9, 3.0) }),
      );
      crack.rotation.x = Math.PI / 2;
      crack.position.set(c.x + off.x, WALL_H - 0.02, c.z + off.z);
      scene.add(crack);
      r.beam = new THREE.Vector3(c.x + off.x, WALL_H - 0.1, c.z + off.z);
    }

    // breakables
    if (r.type !== 'boss') {
      const n = 2 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const corner = [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ][Math.floor(rng() * 4)];
        const p = new THREE.Vector3(
          c.x + corner[0] * (HALF - 1 - rng() * 2.5),
          0,
          c.z + corner[1] * (HALF - 1 - rng() * 2.5),
        );
        const kind = rng();
        let mesh;
        if (kind < 0.5) mesh = makePot([0xb86a3a, 0x9a7a5a, 0x7a5a8a][Math.floor(rng() * 3)]);
        else if (kind < 0.8) mesh = makeBarrel();
        else mesh = makeCrate(0.8);
        mesh.rotation.y = rng() * Math.PI;
        const b = new Breakable(this, p, mesh, { floor: this.floor });
        this.breakables.push(b);
      }
    }

    switch (r.type) {
      case 'start':
        this.decorateStart(r);
        break;
      case 'stairs':
        this.addPortal(r, 'down');
        break;
      case 'treasure':
        this.addChest(r);
        break;
      case 'fountain':
        this.addFountain(r);
        break;
      default:
        break;
    }
  }

  decorateStart(r) {
    const c = r.center;
    if (this.floor === 1) {
      const p = makePortal(1.3, [0.9, 0.7, 0.3], [2.4, 1.8, 0.6]);
      p.position.set(c.x, 1.7, c.z + HALF - 0.6);
      this.scene.add(p);
      this.addInteract({
        pos: new THREE.Vector3(c.x, 0, c.z + HALF - 1),
        radius: 2.6,
        label: 'Return to the village',
        sub: 'Free on floor 1',
        action: () => this.game.returnHome('exit'),
      });
    }
  }

  addPortal(r, kind) {
    const c = r.center;
    const p = makePortal(1.6);
    p.rotation.x = -Math.PI / 2;
    p.position.set(c.x, 0.05, c.z);
    this.scene.add(p);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.12, 10, 48), mat(0x6a6474, { roughness: 0.6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(c.x, 0.08, c.z);
    this.scene.add(ring);
    const shaft = makeLightShaft(1.6, 1.6, 3.5, [0.6, 0.4, 1.4], 0.35);
    shaft.position.set(c.x, 3.5, c.z);
    this.scene.add(shaft);
    this.torchPositions.push({ pos: new THREE.Vector3(c.x, 1.2, c.z), room: r, color: 0x9a70ff });
    const next = this.floor + 1;
    this.addInteract({
      pos: new THREE.Vector3(c.x, 0, c.z),
      radius: 2.4,
      label: kind === 'home' ? 'Return to the village' : `Descend to Floor ${next}`,
      sub: kind === 'home' ? 'Keep all your loot' : 'Enemies grow stronger',
      action: () => (kind === 'home' ? this.game.returnHome('victory') : this.game.enterDungeon(next)),
    });
    this.animated.push((t) => {
      p.rotation.z = t * 0.5;
      if (Math.random() < 0.3)
        this.sparks.emit({
          x: c.x + (Math.random() - 0.5) * 2.5,
          y: 0.2,
          z: c.z + (Math.random() - 0.5) * 2.5,
          vy: 1.5 + Math.random(),
          color: [1.2, 0.7, 2.4],
          size: 0.1,
          life: 1.2,
          gravity: -0.5,
        });
    });
  }

  addChest(r, pos) {
    const c = pos ?? r.center;
    const chest = makeChest(0x7a4a26);
    chest.position.set(c.x, 0, c.z);
    chest.rotation.y = Math.PI;
    this.scene.add(chest);
    this.collision.addBoxCentered(c.x, c.z, 1.2, 0.8);
    const glow = makeLightShaft(0.6, 1.1, 2.2, [1.4, 1.1, 0.5], 0.25);
    glow.position.set(c.x, 2.2, c.z);
    this.scene.add(glow);
    let opened = false;
    const it = this.addInteract({
      pos: new THREE.Vector3(c.x, 0, c.z),
      radius: 2.2,
      label: 'Open chest',
      action: () => {
        if (opened) return;
        opened = true;
        this.removeInteract(it);
        this.scene.remove(glow);
        this.game.audio.play('chest');
        const lid = chest.userData.lid;
        let t = 0;
        this.animated.push((time, dt) => {
          if (t < 1) {
            t = Math.min(1, t + dt * 3);
            lid.rotation.x = -t * 1.9;
          }
        });
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const id = pickWeighted(LOOT_TABLES[Math.min(3, this.floor + (Math.random() < 0.25 ? 1 : 0))]);
          this.game.spawnLoot(this, id, 1, new THREE.Vector3(c.x, 1.0, c.z));
        }
        this.game.addGold(20 + Math.floor(Math.random() * 40 * this.floor), new THREE.Vector3(c.x, 1.2, c.z));
        this.sparks.burst(new THREE.Vector3(c.x, 0.8, c.z), 40, { color: [2.5, 2, 0.8], speed: 5, size: 0.08, life: 0.8 });
      },
    });
  }

  addFountain(r) {
    const c = r.center;
    const stone = mat(0x8a8494, { roughness: 0.85 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.3, 12, 48), stone);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(c.x, 0.35, c.z);
    rim.castShadow = rim.receiveShadow = true;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.4, 48), stone);
    base.position.set(c.x, 0.1, c.z);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 48),
      makeWaterMaterial({ deep: 0x0a4a5a, shallow: 0x3ae0d0, glow: 0.8, sky: { value: new THREE.Color(0.3, 0.5, 0.9) } }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(c.x, 0.42, c.z);
    const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 16), stone);
    statue.position.set(c.x, 1.0, c.z);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 2.8, 2.4) }));
    orb.position.set(c.x, 2.1, c.z);
    this.scene.add(rim, base, water, statue, orb);
    this.collision.addCircle(c.x, c.z, 2.5);
    this.torchPositions.push({ pos: new THREE.Vector3(c.x, 2.1, c.z), room: r, color: 0x60ffe0 });
    let used = false;
    const it = this.addInteract({
      pos: new THREE.Vector3(c.x, 0, c.z),
      radius: 3.6,
      label: 'Drink from the Moonwell',
      sub: 'Fully restores health',
      action: () => {
        if (used) return;
        used = true;
        this.removeInteract(it);
        this.game.player.hp = this.game.player.maxHp;
        this.game.audio.play('drink');
        this.game.ui.message('The Moonwell restores you completely.');
        orb.material.color.setRGB(0.3, 0.6, 0.6);
        this.sparks.burst(this.game.player.pos.clone().setY(1.2), 40, { color: [0.6, 2.5, 2.2], speed: 3, size: 0.1, life: 1, gravity: -2 });
      },
    });
    this.animated.push((t) => {
      orb.position.y = 2.1 + Math.sin(t * 2) * 0.1;
      if (!used && Math.random() < 0.25)
        this.sparks.emit({
          x: c.x + (Math.random() - 0.5) * 3.5,
          y: 0.5,
          z: c.z + (Math.random() - 0.5) * 3.5,
          vy: 0.8,
          color: [0.4, 2, 1.8],
          size: 0.08,
          life: 1.5,
          gravity: -0.2,
        });
    });
  }

  // ------------------------------------------------------------- runtime

  enter(opts = {}) {
    const floor = opts.floor ?? 1;
    this.build(floor);
    this.game.state.deepestFloor = Math.max(this.game.state.deepestFloor, floor);
    const start = this.rooms[0];
    start.visited = start.seen = true;
    this.markSeen(start);
    this.game.audio.setMusic('dungeon');
  }

  exit() {
    this.game.ui.updateBoss(null);
  }

  markSeen(r) {
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      if (!r.doors[d]) continue;
      const n = this.roomMap.get(this.roomKey(r.gx + dx, r.gy + dy));
      if (n) n.seen = true;
    }
  }

  roomAt(pos, inset = 0) {
    const gx = Math.round(pos.x / ROOM);
    const gy = Math.round(-pos.z / ROOM);
    const r = this.roomMap.get(this.roomKey(gx, gy));
    if (!r) return null;
    if (Math.abs(pos.x - gx * ROOM) > HALF - inset || Math.abs(pos.z + gy * ROOM) > HALF - inset) return null;
    return r;
  }

  difficulty() {
    const clears = this.game.state.dungeonClears;
    return {
      hp: 1 + (this.floor - 1) * 0.55 + clears * 0.6,
      dmg: 1 + (this.floor - 1) * 0.3 + clears * 0.35,
    };
  }

  activateRoom(r) {
    r.active = true;
    const c = r.center;
    const diff = this.difficulty();
    const opts = { floor: this.floor, mult: diff.hp, dmgMult: diff.dmg, room: r };
    const player = this.game.player.pos;
    const randPos = () => {
      for (let i = 0; i < 30; i++) {
        const p = new THREE.Vector3(c.x + (Math.random() - 0.5) * 14, 0, c.z + (Math.random() - 0.5) * 14);
        if (p.distanceTo(player) < 6) continue;
        if (this.collision.pointBlocked(p.x, p.z, 1)) continue;
        return p;
      }
      return c.clone();
    };
    if (r.type === 'boss') {
      const b = new Colossus(this, c.clone().add(new THREE.Vector3(0, 0, 0)), { ...opts, mult: diff.hp, dmgMult: diff.dmg });
      b.active = true;
      this.enemies.push(b);
      this.boss = b;
      this.game.ui.updateBoss(b);
      this.game.ui.toast('The Hollow Colossus', 'Guardian of the Ruins');
      this.game.audio.setMusic('boss');
      this.setBars(r, true);
      return;
    }
    const pool = {
      1: [
        [Slime, 5],
        [Rootling, 2],
      ],
      2: [
        [Slime, 3],
        [Golem, 2],
        [Wisp, 2],
        [Rootling, 1],
      ],
      3: [
        [Slime, 2],
        [Golem, 3],
        [Wisp, 3],
        [Rootling, 2],
      ],
    }[Math.min(3, this.floor)];
    const n = 2 + Math.floor(Math.random() * 2) + this.floor;
    for (let i = 0; i < n; i++) {
      let total = 0;
      pool.forEach(([, w]) => (total += w));
      let pick = Math.random() * total;
      let Cls = pool[0][0];
      for (const [C, w] of pool) {
        pick -= w;
        if (pick <= 0) {
          Cls = C;
          break;
        }
      }
      const o = { ...opts };
      if (Cls === Slime && this.floor >= 2 && Math.random() < 0.35) o.big = true;
      const e = new Cls(this, randPos(), o);
      e.active = true;
      this.enemies.push(e);
      this.sparks.burst(e.pos.clone().setY(0.6), 16, { color: [1.5, 0.8, 2.5], speed: 3, size: 0.1, life: 0.6 });
    }
    this.setBars(r, true);
  }

  targets() {
    return this.enemies.concat(this.breakables.filter((b) => !b.dead));
  }

  update(dt, t) {
    super.update(dt, t);
    const game = this.game;
    const player = game.player;

    // room tracking
    const r = this.roomAt(player.pos, 1.2);
    if (r && r !== this.currentRoom) {
      this.currentRoom = r;
      if (!r.visited) {
        r.visited = true;
        this.markSeen(r);
      }
      if (!r.cleared && !r.active) this.activateRoom(r);
      this.placeMoon(r);
      game.ui.minimapDirty = true;
    }

    // enemies
    for (const e of this.enemies) e.update(dt);
    // separation
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.dead || a.flying) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.dead || b.flying) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const rr = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (rr - d) * 0.5;
          const wa = b.isBoss ? 1 : 0.5;
          const wb = a.isBoss ? 1 : 0.5;
          a.pos.x -= (dx / d) * push * wa * 2;
          a.pos.z -= (dz / d) * push * wa * 2;
          b.pos.x += (dx / d) * push * wb * 2;
          b.pos.z += (dz / d) * push * wb * 2;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.removed);

    // room cleared?
    if (this.currentRoom && this.currentRoom.active && !this.currentRoom.cleared) {
      const alive = this.enemies.some((e) => !e.dead && e.room === this.currentRoom);
      if (!alive) this.clearRoom(this.currentRoom);
    }

    for (const p of this.projectiles) p.update(dt, game);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    for (const l of this.loot) l.update(dt);

    // bars animation
    for (const b of this.bars) {
      b.group.position.y += (b.target - b.group.position.y) * Math.min(1, dt * 10);
    }

    for (const fn of this.animated) fn(t, dt);

    // torch light pool
    this.lightTimer -= dt;
    if (this.lightTimer <= 0) {
      this.lightTimer = 0.15;
      const pp = player.pos;
      const sorted = this.torchPositions
        .map((tp) => ({ tp, d: tp.pos.distanceToSquared(pp) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, LIGHT_POOL);
      this.lightPool.forEach((l, i) => {
        const s = sorted[i];
        if (!s) {
          l.intensity = 0;
          return;
        }
        l.position.copy(s.tp.pos);
        l.color.set(s.tp.color ?? 0xff9a4a);
        l.userData.base = s.tp.color ? 14 : 28;
      });
    }
    this.lightPool.forEach((l, i) => {
      const f = 0.85 + Math.sin(t * 11 + i * 1.7) * 0.08 + Math.sin(t * 23 + i) * 0.06;
      l.intensity = (l.userData.base ?? 0) * f;
    });

    // dust motes in light
    this.moteTimer -= dt;
    if (this.moteTimer <= 0) {
      this.moteTimer = 0.05;
      this.motes.emit({
        x: player.pos.x + (Math.random() - 0.5) * 14,
        y: Math.random() * 4.5,
        z: player.pos.z + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.3) * 0.08,
        vz: (Math.random() - 0.5) * 0.1,
        color: [0.9, 0.85, 1.0],
        size: 0.035,
        life: 5,
        alpha: 0.6,
      });
    }
    this.motes.update(dt);
  }

  placeMoon(r) {
    if (r.beam) {
      this.moon.position.copy(r.beam);
      this.moon.target.position.set(r.beam.x, 0, r.beam.z);
      this.moon.intensity = 45;
    } else {
      this.moon.intensity = 0;
    }
  }

  clearRoom(r) {
    r.cleared = true;
    r.active = false;
    this.setBars(r, false);
    this.game.audio.play('levelup');
    this.game.ui.minimapDirty = true;
    if (r.type === 'boss') return;
    // occasional reward chest
    if (Math.random() < 0.25) {
      const p = r.center.clone();
      if (r.pillars) p.z += 0;
      this.addChest(r, p);
      this.game.ui.message('A treasure chest appears!');
    }
  }

  onBossDefeated(boss) {
    const r = boss.room;
    this.game.audio.setMusic('dungeon');
    setTimeout(() => {
      this.addPortal(r, 'home');
      this.game.ui.message('A portal home has opened.');
    }, 1500);
  }
}
