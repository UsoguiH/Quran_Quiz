import * as THREE from 'three';
import { Area } from './Area.js';
import { Particles } from '../render/Particles.js';
import { Sky, sunState } from '../render/Sky.js';
import { Textures, boxUV } from '../render/Textures.js';
import {
  makeTree,
  makeRock,
  makeBush,
  makeGrassField,
  makeHouse,
  makeHumanoid,
  animateHumanoid,
  makeLampPost,
  makeBarrel,
  makeCrate,
  makeFlame,
  makeGableRoof,
  mat,
  RoundedBoxGeometry,
} from '../render/Models.js';
import { makePortal, makeWaterMaterial, makeLightShaft } from '../render/Shaders.js';

const smoothstep = (x, a, b) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function rngFrom(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const PATHS = [
  // [x0,z0,x1,z1,width]
  [0, -11, 0, -2, 3.2], // shop -> plaza
  [0, 8, 0, 44, 3.4], // plaza -> dungeon gate
  [-8, 3, -13, 4, 3], // plaza -> forge
  [8, 3, 13, 4, 3], // plaza -> apothecary
  [-6, -6, -13, -11, 2.6], // plaza -> carpenter
  [6, -6, 18, -16, 2.4],
  [-6, 7, -20, 18, 2.4],
  [6, 7, 20, 20, 2.4],
];

function segDist(px, pz, x0, z0, x1, z1) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
}

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = Math.sin(x * 0.05) * Math.cos(z * 0.04) * 2.2 + Math.sin(x * 0.13 + z * 0.07) * 0.6 + Math.cos(z * 0.11 - x * 0.03) * 0.8;
  const flat = smoothstep(r, 34, 62);
  const ang = Math.atan2(z, x);
  h = h * (0.07 + 0.93 * flat) + flat * flat * 7 * (0.6 + 0.4 * Math.sin(ang * 3 + 1));
  // road to the gate stays walkable
  const road = Math.max(0, 1 - Math.abs(x) / 6) * smoothstep(z, 20, 50);
  return h * (1 - road * 0.8);
}

class Villager {
  constructor(area, look, points) {
    this.area = area;
    this.mesh = makeHumanoid(look);
    this.points = points;
    this.target = points[0].clone();
    this.pos = points[Math.floor(Math.random() * points.length)].clone();
    this.wait = Math.random() * 3;
    this.t = Math.random() * 10;
    area.scene.add(this.mesh);
  }

  update(dt, visible) {
    this.mesh.visible = visible;
    if (!visible) return;
    this.t += dt;
    const d = new THREE.Vector3().subVectors(this.target, this.pos).setY(0);
    const dist = d.length();
    let walk = 0;
    if (this.wait > 0) {
      this.wait -= dt;
    } else if (dist < 0.3) {
      this.wait = 2 + Math.random() * 5;
      this.target = this.points[Math.floor(Math.random() * this.points.length)].clone();
    } else {
      d.normalize();
      this.pos.addScaledVector(d, dt * 1.6);
      walk = 1;
      const yaw = Math.atan2(d.x, d.z);
      let diff = yaw - this.mesh.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.mesh.rotation.y += diff * Math.min(1, dt * 6);
    }
    this.area.collision.resolve(this.pos, 0.3);
    this.pos.y = terrainHeight(this.pos.x, this.pos.z);
    this.mesh.position.copy(this.pos);
    animateHumanoid(this.mesh, this.t, walk);
  }
}

export class Village extends Area {
  constructor(game) {
    super(game, 'village');
    this.outdoor = true;
    this.viewLight = { hemi: 1.1, sun: 1.6, fill: 0 };
    this.build();
  }

  groundHeight(x, z) {
    return terrainHeight(x, z);
  }

  isBlockedForProps(x, z) {
    for (const p of PATHS) if (segDist(x, z, p[0], p[1], p[2], p[3]) < p[4] / 2 + 1.2) return true;
    if (Math.hypot(x, z) < 11) return true;
    for (const b of this.footprints) if (x > b[0] - 1.5 && x < b[2] + 1.5 && z > b[1] - 1.5 && z < b[3] + 1.5) return true;
    return false;
  }

  build() {
    const scene = this.scene;
    const rng = rngFrom(1337);
    this.footprints = [];
    this.lamps = [];
    this.windowMats = [];
    this.chimneys = [];
    this.villagers = [];

    // ---- sky, lights, fog
    this.sky = new Sky();
    scene.add(this.sky.mesh);
    scene.fog = new THREE.FogExp2(0x9ab4d8, 0.011);
    this.hemi = new THREE.HemisphereLight(0xbcd4ff, 0x4a3c28, 1.0);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0dd, 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -38;
    sc.right = 38;
    sc.top = 38;
    sc.bottom = -38;
    sc.near = 1;
    sc.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun, this.sun.target);

    // ---- terrain
    const size = 260;
    const seg = 160;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const uv = geo.attributes.uv;
    const cGrass = new THREE.Color(0x7fb54a);
    const cGrass2 = new THREE.Color(0x5e9a3a);
    const cDirt = new THREE.Color(0xa0805a);
    const cHill = new THREE.Color(0x6a9a4a);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
      let pathD = 99;
      for (const p of PATHS) pathD = Math.min(pathD, segDist(x, z, p[0], p[1], p[2], p[3]) - p[4] / 2);
      pathD = Math.min(pathD, Math.hypot(x, z) - 10);
      const n = Math.sin(x * 0.3) * Math.cos(z * 0.27) * 0.5 + 0.5;
      const c = cGrass.clone().lerp(cGrass2, n);
      c.lerp(cHill, smoothstep(Math.hypot(x, z), 40, 80) * 0.6);
      c.lerp(cDirt, 1 - smoothstep(pathD, 0.2, 1.6));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      uv.setXY(i, (x / 4) % 1e4, (z / 4) % 1e4);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const gt = Textures.grass();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: gt.map,
      normalMap: gt.normalMap,
      vertexColors: true,
      roughness: 0.95,
      color: 0xffffff,
    });
    // brighten map (texture is dark green); vertex colours do the tint
    terrainMat.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
           vec4 texelColor = texture2D( map, vMapUv );
           float lum = dot(texelColor.rgb, vec3(0.299, 0.587, 0.114));
           diffuseColor.rgb *= mix(vec3(1.0), vec3(lum * 2.4), 0.55);
         #endif`,
      );
    };
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // ---- cobblestone paths & plaza
    const cob = Textures.cobble();
    const cobMat = new THREE.MeshStandardMaterial({
      map: cob.map,
      normalMap: cob.normalMap,
      roughnessMap: cob.roughnessMap,
      color: 0xd8d0c4,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    for (const [x0, z0, x1, z1, w] of PATHS) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const g = new THREE.PlaneGeometry(w, len, 2, Math.max(2, Math.ceil(len)));
      g.rotateX(-Math.PI / 2);
      const ang = Math.atan2(x1 - x0, z1 - z0);
      g.rotateY(ang);
      g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      const p = g.attributes.position;
      const u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        p.setY(i, terrainHeight(p.getX(i), p.getZ(i)) + 0.04);
        u.setXY(i, (u.getX(i) * w) / 3, (u.getY(i) * len) / 3);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, cobMat);
      m.receiveShadow = true;
      scene.add(m);
    }
    const plazaGeo = new THREE.CircleGeometry(10.5, 64, 0, Math.PI * 2);
    plazaGeo.rotateX(-Math.PI / 2);
    {
      const p = plazaGeo.attributes.position;
      const u = plazaGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        p.setY(i, terrainHeight(p.getX(i), p.getZ(i)) + 0.05);
        u.setXY(i, p.getX(i) / 3, p.getZ(i) / 3);
      }
      plazaGeo.computeVertexNormals();
    }
    const plaza = new THREE.Mesh(plazaGeo, cobMat);
    plaza.receiveShadow = true;
    scene.add(plaza);

    this.buildPlazaFountain();
    this.buildShop();
    this.buildForge();
    this.buildApothecary();
    this.buildCarpenter();
    this.buildGate();
    this.buildPond(-34, 30);

    // decorative houses
    const houses = [
      [-26, -24, 0.4, 1],
      [24, -26, -0.5, 2],
      [-30, 14, 1.3, 0],
      [30, 16, -1.4, 1],
      [-16, 30, 2.6, 2],
      [18, 32, -2.4, 0],
    ];
    for (const [x, z, ry, hue] of houses) {
      const h = makeHouse({ w: 7, d: 6, roofHue: hue });
      const y = terrainHeight(x, z);
      h.position.set(x, y - 0.05, z);
      h.rotation.y = ry;
      scene.add(h);
      h.updateMatrixWorld(true);
      this.addPlinth(x, z, 7, 6, ry, y);
      this.windowMats.push(h.userData.windows);
      this.chimneys.push(h.localToWorld(h.userData.chimney.clone()));
      this.addRotatedBox(x, z, 7, 6, ry);
      this.footprints.push([x - 4.5, z - 4.5, x + 4.5, z + 4.5]);
      // props
      const b = makeBarrel();
      const off = new THREE.Vector3(3.9, 0, 2.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      b.position.set(x + off.x, terrainHeight(x + off.x, z + off.z), z + off.z);
      scene.add(b);
      this.collision.addCircle(b.position.x, b.position.z, 0.5);
    }

    // lamp posts along the paths
    const lampSpots = [
      [3.4, -6.5],
      [-2.6, 12],
      [2.6, 22],
      [-2.6, 32],
      [11, 7],
      [-11, 7],
      [-9, -9],
      [9, -9],
    ];
    lampSpots.forEach(([x, z], i) => {
      const l = makeLampPost();
      l.position.set(x, terrainHeight(x, z), z);
      l.rotation.y = x > 0 ? Math.PI : 0;
      scene.add(l);
      l.updateMatrixWorld(true);
      this.collision.addCircle(x, z, 0.2);
      const lightPos = l.localToWorld(l.userData.lightPos.clone());
      let light = null;
      if (i < 6) {
        light = new THREE.PointLight(0xffb060, 0, 16, 1.7);
        light.position.copy(lightPos);
        scene.add(light);
      }
      const glow = makeFlame(0.9, 0xffb060);
      glow.position.copy(lightPos);
      glow.visible = false;
      scene.add(glow);
      this.lamps.push({ mat: l.userData.glass, light, glow });
    });

    // trees, rocks, bushes
    for (let i = 0; i < 110; i++) {
      const a = rng() * Math.PI * 2;
      const r = i < 25 ? 14 + rng() * 22 : 36 + rng() * 60;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (this.isBlockedForProps(x, z)) continue;
      const t = makeTree(rng, rng() < 0.3 ? 'pine' : 'round');
      t.position.set(x, terrainHeight(x, z) - 0.1, z);
      t.rotation.y = rng() * Math.PI * 2;
      t.scale.setScalar(0.9 + rng() * 0.6);
      scene.add(t);
      if (r < 70) this.collision.addCircle(x, z, 0.45);
    }
    for (let i = 0; i < 40; i++) {
      const a = rng() * Math.PI * 2;
      const r = 12 + rng() * 55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (this.isBlockedForProps(x, z)) continue;
      const rock = makeRock(rng, 0.4 + rng() * 0.9);
      rock.position.set(x, terrainHeight(x, z) + 0.1, z);
      rock.rotation.y = rng() * 6;
      scene.add(rock);
      if (rock.geometry.boundingSphere === null) rock.geometry.computeBoundingSphere();
      this.collision.addCircle(x, z, rock.geometry.boundingSphere.radius * 0.8);
    }
    for (let i = 0; i < 70; i++) {
      const a = rng() * Math.PI * 2;
      const r = 11 + rng() * 50;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (this.isBlockedForProps(x, z)) continue;
      const b = makeBush(rng);
      b.position.set(x, terrainHeight(x, z), z);
      b.rotation.y = rng() * 6;
      scene.add(b);
    }

    // distant hills silhouettes
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x4a6a5a, roughness: 1, flatShading: false });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rng() * 0.3;
      const r = 150 + rng() * 40;
      const h = 25 + rng() * 35;
      const g = new THREE.ConeGeometry(40 + rng() * 30, h, 24, 4);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const y = p.getY(k);
        const f = 1 + Math.sin(k * 1.7) * 0.06;
        p.setX(k, p.getX(k) * f);
        p.setZ(k, p.getZ(k) * f);
        p.setY(k, y);
      }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, hillMat);
      m.position.set(Math.cos(a) * r, h / 2 - 6, Math.sin(a) * r);
      scene.add(m);
    }

    // boundary: soft invisible fence ring
    this.boundary = 62;

    // grass
    this.grassArea = {
      sample: () => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 60;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        return { x, z, y: terrainHeight(x, z) };
      },
    };
    this.rebuildGrass(1);

    // wandering villagers
    const pts = [
      [4, 4],
      [-5, 3],
      [6, -5],
      [-4, -6],
      [0, 14],
      [8, 12],
      [-9, 12],
      [14, -4],
    ].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const looks = [
      { shirt: 0xc05a5a, pants: 0x3a3048, hair: 0x2a1a10, hat: 'straw' },
      { shirt: 0x5ab08a, pants: 0x4a3a2a, hair: 0xd8b060 },
      { shirt: 0x8a6ad0, pants: 0x2a2a3a, hair: 0x6a3a1a, hat: 'cap', hatColor: 0x3a6ad0 },
    ];
    looks.forEach((l) => this.villagers.push(new Villager(this, l, pts)));

    // fireflies & chimney smoke systems
    this.fireflies = new Particles(300, true);
    scene.add(this.fireflies.points);
    this.smokeTimer = 0;
    this.flyTimer = 0;

    // environment reflections
    this.spawn.set(0, 0, -9.5);
    this.spawnYaw = Math.PI; // facing south toward the plaza
  }

  rebuildGrass(mult) {
    if (this.grass) {
      this.scene.remove(this.grass);
      this.grass.geometry.dispose();
    }
    this.grass = makeGrassField({
      count: Math.floor(26000 * mult),
      area: this.grassArea,
      height: 0.6,
      exclude: (x, z) => this.isBlockedForProps(x, z) && Math.hypot(x, z) < 64,
    });
    this.scene.add(this.grass);
  }

  addPlinth(x, z, w, d, ry, y) {
    const st = Textures.stoneBricks();
    const g = boxUV(new THREE.BoxGeometry(w + 0.4, 1.2, d + 0.4), w + 0.4, 1.2, d + 0.4, 2.5);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: st.map, normalMap: st.normalMap, color: 0xc0b8a8 }));
    m.position.set(x, y - 0.5, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    this.scene.add(m);
  }

  addRotatedBox(x, z, w, d, ry) {
    // approximate rotated footprint by an AABB of the rotated rectangle (slightly shrunk)
    const c = Math.abs(Math.cos(ry));
    const s = Math.abs(Math.sin(ry));
    const hw = (w * c + d * s) / 2;
    const hd = (w * s + d * c) / 2;
    const shrink = 0.85 + 0.15 * Math.max(c, s) ** 4;
    this.collision.addBox(x - hw * shrink, z - hd * shrink, x + hw * shrink, z + hd * shrink);
  }

  buildPlazaFountain() {
    const scene = this.scene;
    const y = terrainHeight(0, 0);
    const st = Textures.stoneBricks();
    const stone = new THREE.MeshStandardMaterial({ map: st.map, normalMap: st.normalMap, color: 0xd8d0c0, roughness: 0.85 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.8, 48, 1, true), stone);
    basin.position.set(0, y + 0.4, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.25, 12, 64), stone);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, y + 0.8, 0);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(3.5, 48),
      makeWaterMaterial({ sunDir: this.sky.uniforms.uSunDir, sky: (this.waterSky = { value: new THREE.Color(0.5, 0.7, 0.95) }) }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, y + 0.6, 0);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.4, 20), stone);
    pillar.position.set(0, y + 1.2, 0);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), stone);
    bowl.position.set(0, y + 2.4, 0);
    const moon = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.12, 12, 32, Math.PI * 1.35),
      new THREE.MeshStandardMaterial({ color: 0xe8e0ff, emissive: 0x9a88ff, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.3 }),
    );
    moon.position.set(0, y + 3.2, 0);
    moon.rotation.z = 0.8;
    this.fountainMoon = moon;
    [basin, rim, pillar, bowl].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    scene.add(basin, rim, water, pillar, bowl, moon);
    this.collision.addCircle(0, 0, 3.9);
    this.addInteract({
      pos: new THREE.Vector3(0, 0, 0),
      radius: 5.2,
      label: 'Toss a coin into the fountain',
      sub: '1 gold',
      action: () => this.game.tossCoin(),
    });
    // water jets as particles
    this.fountainY = y;
  }

  buildShop() {
    const scene = this.scene;
    const x = 0;
    const z = -17;
    const y = terrainHeight(x, z);
    const h = makeHouse({ w: 11, d: 9, h: 3.8, roofHue: 1, door: true });
    h.position.set(x, y - 0.05, z);
    scene.add(h);
    h.updateMatrixWorld(true);
    this.addPlinth(x, z, 11, 9, 0, y);
    this.windowMats.push(h.userData.windows);
    this.chimneys.push(h.localToWorld(h.userData.chimney.clone()));
    this.collision.addBox(x - 5.6, z - 4.6, x + 5.6, z + 4.6);
    this.footprints.push([x - 6, z - 5, x + 6, z + 5]);

    // hanging sign with moon emblem
    const signBoard = new THREE.Mesh(
      new RoundedBoxGeometry(2.6, 0.9, 0.1, 2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x3a2a4a, roughness: 0.6 }),
    );
    signBoard.position.set(x + 2.6, y + 3.1, z + 4.9);
    const emblemMat = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffc860, emissiveIntensity: 0.3 });
    this.shopEmblem = emblemMat;
    const emblem = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 10, 28, Math.PI * 1.35), emblemMat);
    emblem.position.set(x + 2.6, y + 3.1, z + 4.97);
    emblem.rotation.z = 0.8;
    scene.add(signBoard, emblem);
    // awning over door
    const cloth = Textures.cloth(0.6, 0.2, 0.55);
    const aw = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.06, 1.4),
      new THREE.MeshStandardMaterial({ map: cloth.map, color: 0xffffff, roughness: 0.95 }),
    );
    aw.position.set(x, y + 2.7, z + 5.1);
    aw.rotation.x = 0.35;
    aw.castShadow = true;
    scene.add(aw);
    // crates by the door
    const c1 = makeCrate(0.8);
    c1.position.set(x - 3.2, y, z + 5.2);
    const c2 = makeCrate(0.6);
    c2.position.set(x - 3.1, y + 0.8, z + 5.2);
    c2.rotation.y = 0.4;
    const b = makeBarrel();
    b.position.set(x + 4.2, y, z + 5.3);
    scene.add(c1, c2, b);
    this.collision.addCircle(x - 3.2, z + 5.2, 0.6);
    this.collision.addCircle(x + 4.2, z + 5.3, 0.5);

    this.addInteract({
      pos: new THREE.Vector3(x, 0, z + 4.9),
      radius: 2.4,
      label: 'Enter your shop',
      sub: '“Moonlit Merchant”',
      action: () => this.game.changeArea('shop', { spawn: 'door' }),
    });
  }

  buildStall(x, z, ry, clothColor) {
    const scene = this.scene;
    const y = terrainHeight(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    const wood = Textures.wood();
    const woodMat = new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, color: 0x9a6a42, roughness: 0.8 });
    // floor deck
    const deck = new THREE.Mesh(boxUV(new THREE.BoxGeometry(7, 0.3, 6), 7, 0.3, 6, 3), woodMat);
    deck.position.y = 0.05;
    deck.receiveShadow = true;
    g.add(deck);
    // posts
    [
      [-3.2, -2.7],
      [3.2, -2.7],
      [-3.2, 2.7],
      [3.2, 2.7],
    ].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 10), woodMat);
      p.position.set(px, 1.7, pz);
      p.castShadow = true;
      g.add(p);
    });
    // roof
    const rt = Textures.roof(ry > 0 ? 2 : 0);
    const roof = makeGableRoof(7, 6, 1.6, 0.5, new THREE.MeshStandardMaterial({ map: rt.map, normalMap: rt.normalMap }));
    roof.position.y = 3.4;
    g.add(roof);
    // back wall
    const pl = Textures.plaster();
    const back = new THREE.Mesh(
      boxUV(new THREE.BoxGeometry(7, 3.4, 0.25), 7, 3.4, 0.25, 3),
      new THREE.MeshStandardMaterial({ map: pl.map, normalMap: pl.normalMap, color: 0xefe4d0 }),
    );
    back.position.set(0, 1.7, -2.8);
    back.castShadow = back.receiveShadow = true;
    g.add(back);
    // counter
    const counter = new THREE.Mesh(new RoundedBoxGeometry(5, 1.1, 0.9, 2, 0.06), woodMat);
    counter.position.set(0, 0.75, 1.6);
    counter.castShadow = counter.receiveShadow = true;
    g.add(counter);
    const cloth = new THREE.Color(clothColor);
    const ct = Textures.cloth(cloth.r, cloth.g, cloth.b);
    const runner = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.04, 1.0), new THREE.MeshStandardMaterial({ map: ct.map }));
    runner.position.set(0, 1.32, 1.6);
    g.add(runner);
    scene.add(g);
    // colliders (world space)
    const toWorld = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(x, 0, z));
    const cw = toWorld(0, 1.6);
    const along = Math.abs(Math.cos(ry)) > 0.5;
    if (along) this.collision.addBoxCentered(cw.x, cw.z, 5, 0.9);
    else this.collision.addBoxCentered(cw.x, cw.z, 0.9, 5);
    const bw = toWorld(0, -2.8);
    if (along) this.collision.addBoxCentered(bw.x, bw.z, 7, 0.4);
    else this.collision.addBoxCentered(bw.x, bw.z, 0.4, 7);
    [
      [-3.2, -2.7],
      [3.2, -2.7],
      [-3.2, 2.7],
      [3.2, 2.7],
    ].forEach(([px, pz]) => {
      const w = toWorld(px, pz);
      this.collision.addCircle(w.x, w.z, 0.2);
    });
    // side walls behind counter area so the NPC space is closed
    [-3.3, 3.3].forEach((sx) => {
      const a = toWorld(sx, -1.0);
      if (along) this.collision.addBoxCentered(a.x, a.z, 0.3, 3.8);
      else this.collision.addBoxCentered(a.x, a.z, 3.8, 0.3);
    });
    this.footprints.push([x - 4, z - 4, x + 4, z + 4]);
    return { group: g, toWorld, y };
  }

  buildForge() {
    const { group, toWorld } = this.buildStall(-17, 4, Math.PI / 2, 0x7a3a2a);
    // anvil
    const iron = mat(0x2e3036, { metalness: 0.85, roughness: 0.35 });
    const anvil = new THREE.Group();
    const top = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.25, 0.45, 2, 0.05), iron);
    top.position.y = 0.95;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 12), iron);
    horn.rotation.z = Math.PI / 2;
    horn.position.set(0.75, 0.97, 0);
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.7, 0.4, 2, 0.05), iron);
    base.position.y = 0.45;
    anvil.add(top, horn, base);
    anvil.position.set(-1.5, 0.2, -0.4);
    anvil.traverse((c) => c.isMesh && (c.castShadow = true));
    group.add(anvil);
    // furnace
    const brick = Textures.stoneBricks();
    const furnace = new THREE.Mesh(
      new RoundedBoxGeometry(1.8, 2.2, 1.2, 3, 0.15),
      new THREE.MeshStandardMaterial({ map: brick.map, normalMap: brick.normalMap, color: 0xb07060 }),
    );
    furnace.position.set(1.8, 1.25, -2.0);
    furnace.castShadow = true;
    const mouth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.4, 0.3) }),
    );
    mouth.position.set(1.8, 0.9, -1.39);
    group.add(furnace, mouth);
    const fl = makeFlame(0.9, 0xff7020);
    fl.position.set(1.8, 1.0, -1.5);
    group.add(fl);
    this.flames.push(fl);
    const fireLight = new THREE.PointLight(0xff7a30, 12, 9, 1.6);
    fireLight.position.set(1.8, 1.3, -1.0);
    group.add(fireLight);
    this.forgeLight = fireLight;
    this.forgeSparkPos = toWorld(1.8, -1.4);
    // weapons rack
    for (let i = 0; i < 3; i++) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.02), mat(0xd6dae0, { metalness: 0.9, roughness: 0.25 }));
      sw.position.set(-2.6 + i * 0.35, 1.9, -2.6);
      sw.rotation.z = 0.08;
      group.add(sw);
    }
    // smith NPC
    const smith = makeHumanoid({ shirt: 0x6a4a3a, pants: 0x2a2226, apron: 0x3a2a1e, hair: null, beard: 0x8a4a22, scale: 1.12 });
    smith.position.set(0, 0.2, 0.2);
    smith.rotation.y = 0;
    group.add(smith);
    this.smith = smith;
    const p = toWorld(0, 3.2);
    this.addInteract({
      pos: p,
      radius: 3,
      label: 'Talk to Brom',
      sub: 'Blacksmith — forge weapons & armor',
      action: () => this.game.ui.openForge(),
    });
  }

  buildApothecary() {
    const { group, toWorld } = this.buildStall(17, 4, -Math.PI / 2, 0x3a2a6a);
    // cauldron
    const iron = mat(0x1e1e24, { metalness: 0.7, roughness: 0.45 });
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7), iron);
    pot.position.set(-1.8, 0.95, -1.2);
    pot.castShadow = true;
    const brew = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 32),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.6, 0.9) }),
    );
    brew.rotation.x = -Math.PI / 2;
    brew.position.set(-1.8, 1.35, -1.2);
    group.add(pot, brew);
    const fl = makeFlame(0.6, 0xff8030);
    fl.position.set(-1.8, 0.35, -1.2);
    group.add(fl);
    this.flames.push(fl);
    this.brewPos = toWorld(-1.8, -1.2);
    const glow = new THREE.PointLight(0x70ff90, 5, 7, 1.8);
    glow.position.set(-1.8, 1.8, -1.2);
    group.add(glow);
    // shelves with potions
    const wood = mat(0x7a5236);
    for (let s = 0; s < 2; s++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.4), wood);
      shelf.position.set(1.2, 1.4 + s * 0.8, -2.5);
      group.add(shelf);
      for (let i = 0; i < 6; i++) {
        const col = new THREE.Color().setHSL(Math.random(), 0.7, 0.55);
        const b = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 12, 10),
          new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.85 }),
        );
        b.position.set(0 + i * 0.45, 1.58 + s * 0.8, -2.5);
        group.add(b);
      }
    }
    const witch = makeHumanoid({ shirt: 0x4a2a6a, pants: 0x2a1a3a, hair: 0xd0d0e0, hat: 'witch', hatColor: 0x2a1a4a, skin: 0xe0c0b0 });
    witch.position.set(0, 0.2, 0.2);
    group.add(witch);
    this.witch = witch;
    const p = toWorld(0, 3.2);
    this.addInteract({
      pos: p,
      radius: 3,
      label: 'Talk to Mirelle',
      sub: 'Apothecary — brew potions',
      action: () => this.game.ui.openPotions(),
    });
  }

  buildCarpenter() {
    const scene = this.scene;
    const x = -15;
    const z = -15;
    const y = terrainHeight(x, z);
    const h = makeHouse({ w: 7, d: 6, roofHue: 2 });
    h.position.set(x, y - 0.05, z);
    h.rotation.y = 0.5;
    scene.add(h);
    h.updateMatrixWorld(true);
    this.addPlinth(x, z, 7, 6, 0.5, y);
    this.windowMats.push(h.userData.windows);
    this.chimneys.push(h.localToWorld(h.userData.chimney.clone()));
    this.addRotatedBox(x, z, 7, 6, 0.5);
    this.footprints.push([x - 4.5, z - 4.5, x + 4.5, z + 4.5]);
    // workbench + NPC in front
    const f = new THREE.Vector3(0, 0, 4.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5).add(new THREE.Vector3(x, 0, z));
    const wood = Textures.wood();
    const bench = new THREE.Mesh(
      new RoundedBoxGeometry(2.2, 0.9, 0.9, 2, 0.05),
      new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, color: 0xb08050 }),
    );
    bench.position.set(f.x + 1.5, terrainHeight(f.x + 1.5, f.z) + 0.45, f.z);
    bench.rotation.y = 0.5;
    bench.castShadow = true;
    scene.add(bench);
    this.collision.addCircle(bench.position.x, bench.position.z, 0.9);
    const npc = makeHumanoid({ shirt: 0x3a6a4a, pants: 0x4a3a2a, hair: 0x3a2a1a, hat: 'cap', hatColor: 0xd0a040, apron: 0x8a6a4a });
    npc.position.set(f.x - 0.5, terrainHeight(f.x - 0.5, f.z), f.z);
    npc.rotation.y = 0.5;
    scene.add(npc);
    this.carpenter = npc;
    this.collision.addCircle(f.x - 0.5, f.z, 0.4);
    // notice board
    const nb = new THREE.Group();
    const bw = mat(0x6a4a2a);
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), bw);
    post1.position.set(-0.9, 1.2, 0);
    const post2 = post1.clone();
    post2.position.x = 0.9;
    const board = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.3, 0.12, 2, 0.04), mat(0x9a7a52));
    board.position.y = 1.7;
    nb.add(post1, post2, board);
    for (let i = 0; i < 4; i++) {
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.55), mat(0xf4ecd8, { side: THREE.DoubleSide }));
      paper.position.set(-0.7 + i * 0.47, 1.7 + (i % 2) * 0.1, 0.07);
      paper.rotation.z = (Math.random() - 0.5) * 0.2;
      nb.add(paper);
    }
    nb.position.set(6, terrainHeight(6, -4.5), -11);
    nb.rotation.y = -0.4;
    nb.traverse((c) => c.isMesh && (c.castShadow = true));
    scene.add(nb);
    this.collision.addBoxCentered(6, -11, 2.2, 0.4);
    this.addInteract({
      pos: new THREE.Vector3(6, 0, -10),
      radius: 2.4,
      label: 'Read the notice board',
      action: () => this.game.ui.openNotice(),
    });
    this.addInteract({
      pos: new THREE.Vector3(f.x - 0.5, 0, f.z),
      radius: 2.8,
      label: 'Talk to Tomo',
      sub: 'Carpenter — upgrade your shop',
      action: () => this.game.ui.openUpgrades(),
    });
  }

  buildGate() {
    const scene = this.scene;
    const x = 0;
    const z = 48;
    const y = terrainHeight(x, z);
    const st = Textures.stoneBricks();
    const stone = new THREE.MeshStandardMaterial({ map: st.map, normalMap: st.normalMap, color: 0x9a94a4, roughness: 0.9 });
    const g = new THREE.Group();
    g.position.set(x, y, z);
    // pillars
    [-3.2, 3.2].forEach((px) => {
      const p = new THREE.Mesh(boxUV(new THREE.BoxGeometry(1.6, 7, 1.6), 1.6, 7, 1.6, 2.5), stone);
      p.position.set(px, 3.5, 0);
      p.castShadow = p.receiveShadow = true;
      g.add(p);
      const cap = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.5, 2.0, 2, 0.08), stone);
      cap.position.set(px, 7.2, 0);
      g.add(cap);
      this.collision.addBoxCentered(x + px, z, 1.6, 1.6);
    });
    // arch
    const arch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.7, 14, 32, Math.PI), stone);
    arch.position.set(0, 7, 0);
    arch.castShadow = true;
    g.add(arch);
    // cliff behind
    for (let i = 0; i < 9; i++) {
      const r = makeRock(Math.random, 3 + Math.random() * 2.5);
      r.position.set(-14 + i * 3.5, 1.5 + Math.random() * 2, 4 + Math.random() * 2);
      r.scale.y = 1.6 + Math.random();
      r.material = mat(0x6a6474, { roughness: 0.95 });
      g.add(r);
    }
    this.collision.addBox(x - 16, z + 1.5, x + 16, z + 9);
    const portal = makePortal(2.9, [0.35, 0.2, 1.2], [1.4, 0.6, 2.4]);
    portal.position.set(0, 3.3, 0.1);
    g.add(portal);
    this.gatePortal = portal;
    const light = new THREE.PointLight(0x9a70ff, 10, 14, 1.6);
    light.position.set(0, 3, 2);
    g.add(light);
    // braziers
    [-5.5, 5.5].forEach((bx) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 1.2, 12), mat(0x2e2e34, { metalness: 0.7, roughness: 0.4 }));
      b.position.set(bx, 0.6, -1.5);
      g.add(b);
      const f = makeFlame(1.3, 0xff8a30);
      f.position.set(bx, 1.7, -1.5);
      g.add(f);
      this.flames.push(f);
      this.collision.addCircle(x + bx, z - 1.5, 0.55);
    });
    scene.add(g);
    this.addInteract({
      pos: new THREE.Vector3(x, 0, z - 1.5),
      radius: 3.2,
      label: 'Enter the Hollow Ruins',
      sub: 'Dungeon — gather loot to sell',
      action: () => this.game.enterDungeon(1),
    });
  }

  buildPond(x, z) {
    const y = terrainHeight(x, z);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 12, 1, 1),
      makeWaterMaterial({ sunDir: this.sky.uniforms.uSunDir, sky: this.waterSky }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, y + 0.25, z);
    this.scene.add(water);
    // reeds
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const rx = x + Math.cos(a) * (7.5 + Math.random());
      const rz = z + Math.sin(a) * (5.5 + Math.random());
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.2, 5), mat(0x5a7a3a));
      reed.position.set(rx, terrainHeight(rx, rz) + 0.6, rz);
      reed.rotation.z = (Math.random() - 0.5) * 0.3;
      this.scene.add(reed);
    }
    this.collision.addBoxCentered(x, z, 14, 10);
    this.footprints.push([x - 8, z - 6, x + 8, z + 6]);
    this.pondPos = new THREE.Vector3(x, y, z);
  }

  enter() {
    const s = this.game.state;
    this.game.audio.setMusic(s.minutes > 19 * 60 || s.minutes < 6 * 60 ? 'night' : 'day');
    this.updateLighting(0);
  }

  updateLighting() {
    const game = this.game;
    const s = sunState(game.state.minutes);
    const u = this.sky.uniforms;
    u.uSunDir.value.copy(s.sunDir);
    u.uMoonDir.value.copy(s.moonDir);
    u.uDay.value = s.day;
    u.uSunset.value = s.sunset;
    u.uTime.value = game.time;
    const player = game.player.pos;
    const useSun = s.sunDir.y > -0.02;
    const dir = useSun ? s.sunDir : s.moonDir;
    // snap shadow camera to texel grid to avoid shimmering
    const texel = 76 / this.sun.shadow.mapSize.x;
    const cx = Math.round(player.x / texel) * texel;
    const cz = Math.round(player.z / texel) * texel;
    this.sun.target.position.set(cx, 0, cz);
    this.sun.position.set(cx + dir.x * 70, dir.y * 70, cz + dir.z * 70);
    const dayI = THREE.MathUtils.smoothstep(s.sunDir.y, -0.02, 0.25);
    const nightI = THREE.MathUtils.smoothstep(s.moonDir.y, 0.0, 0.3) * (1 - dayI);
    this.sun.intensity = useSun ? 3.4 * dayI : 0.55 * nightI;
    this.sun.color.setRGB(1, 0.9 - s.sunset * 0.3, 0.8 - s.sunset * 0.45);
    if (!useSun) this.sun.color.setRGB(0.6, 0.7, 1.0);
    this.hemi.intensity = 0.25 + 0.95 * s.day;
    this.hemi.color.setRGB(0.4 + 0.35 * s.day, 0.45 + 0.4 * s.day, 0.7 + 0.3 * s.day);
    this.hemi.groundColor.setRGB(0.12 + 0.2 * s.day, 0.1 + 0.15 * s.day, 0.1 + 0.08 * s.day);
    this.sky.horizonColor(this.scene.fog.color);
    this.scene.fog.density = 0.0055 + (1 - s.day) * 0.006;
    this.scene.environmentIntensity = 0.15 + 0.6 * s.day;
    this.waterSky.value.copy(this.scene.fog.color).lerp(new THREE.Color(0.5, 0.7, 1.0), s.day * 0.4);

    const night = 1 - s.day;
    const lampOn = night > 0.35;
    for (const l of this.lamps) {
      l.mat.emissiveIntensity = lampOn ? 3.5 : 0.0;
      if (l.light) l.light.intensity = lampOn ? 14 * Math.min(1, (night - 0.35) * 3) : 0;
      l.glow.visible = lampOn;
    }
    for (const w of this.windowMats) w.emissiveIntensity = night > 0.3 ? 1.6 : 0.05;
    this.shopEmblem.emissiveIntensity = game.shop?.open ? 3 : 0.3;
    this.fountainMoon.material.emissiveIntensity = 0.4 + night * 2.5;

    const gr = game.engine.grade.uniforms;
    gr.uExposure.value = 1.0 + night * 0.35;
    gr.uSaturation.value = 1.12 - night * 0.2;
    gr.uTint.value.setRGB(1 - night * 0.08, 1 - night * 0.04, 1 + night * 0.08);
    game.engine.updateSunScreen(s.sunDir, useSun ? dayI * 0.8 : 0);
    this.viewLight.hemi = 0.35 + 0.8 * s.day;
    this.viewLight.sun = 0.3 + 1.3 * dayI;
    this.lightState = s;
  }

  update(dt, t) {
    super.update(dt, t);
    const game = this.game;
    this.updateLighting();
    this.sky.mesh.position.copy(game.engine.camera.position);

    const p = game.player.pos;
    const r = Math.hypot(p.x, p.z);
    if (r > this.boundary) {
      p.x *= this.boundary / r;
      p.z *= this.boundary / r;
    }

    const s = this.lightState;
    const dayTime = s.day > 0.4;
    this.villagers.forEach((v) => v.update(dt, dayTime));
    animateHumanoid(this.smith, t, 0, { armR: Math.max(0, Math.sin(t * 5)) * -1.4 });
    animateHumanoid(this.witch, t, 0, { armL: Math.sin(t * 1.5) * 0.3 - 0.8 });
    animateHumanoid(this.carpenter, t, 0, { armR: Math.sin(t * 7) * 0.4 - 0.6 });
    this.forgeLight.intensity = 10 + Math.sin(t * 13) * 2 + Math.sin(t * 29) * 1.5;
    if (Math.sin(t * 5) > 0.95 && Math.random() < 0.5) {
      const sp = this.forgeSparkPos;
      this.sparks.burst(new THREE.Vector3(sp.x, terrainHeight(sp.x, sp.z) + 1.2, sp.z), 5, {
        color: [3, 1.4, 0.4],
        speed: 3,
        size: 0.04,
        life: 0.6,
        up: 2,
      });
    }

    // chimney smoke
    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.12;
      for (const c of this.chimneys) {
        if (Math.random() < 0.5)
          this.dust.emit({
            x: c.x + (Math.random() - 0.5) * 0.3,
            y: c.y,
            z: c.z + (Math.random() - 0.5) * 0.3,
            vx: 0.3 + Math.random() * 0.2,
            vy: 0.8 + Math.random() * 0.4,
            vz: 0.1,
            color: [0.75, 0.75, 0.78],
            size: 0.6,
            grow: 1.2,
            life: 4,
            alpha: 0.28,
            drag: 0.2,
          });
      }
      // cauldron bubbles
      const bp = this.brewPos;
      this.sparks.emit({
        x: bp.x + (Math.random() - 0.5) * 0.8,
        y: terrainHeight(bp.x, bp.z) + 1.6,
        z: bp.z + (Math.random() - 0.5) * 0.8,
        vy: 0.6,
        color: [0.3, 1.6, 0.5],
        size: 0.12,
        life: 1,
        gravity: -0.3,
      });
      // fountain spray
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this.sparks.emit({
          x: Math.cos(a) * 0.9,
          y: this.fountainY + 2.5,
          z: Math.sin(a) * 0.9,
          vx: Math.cos(a) * 1.2,
          vy: 1.4,
          vz: Math.sin(a) * 1.2,
          color: s.day > 0.5 ? [0.7, 0.85, 1.0] : [0.25, 0.3, 0.6],
          size: 0.09,
          life: 1.0,
          gravity: 5,
          alpha: 0.6,
        });
      }
    }

    // fireflies at night
    const night = 1 - s.day;
    this.flyTimer -= dt;
    if (night > 0.5 && this.flyTimer <= 0) {
      this.flyTimer = 0.08;
      const a = Math.random() * Math.PI * 2;
      const rr = 6 + Math.random() * 25;
      const fx = p.x + Math.cos(a) * rr;
      const fz = p.z + Math.sin(a) * rr;
      this.fireflies.emit({
        x: fx,
        y: terrainHeight(fx, fz) + 0.4 + Math.random() * 1.8,
        z: fz,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.6,
        color: [1.6, 2.4, 0.6],
        size: 0.08,
        life: 4 + Math.random() * 3,
        drag: 0,
      });
    }
    this.fireflies.update(dt);
    this.gatePortal.rotation.z = t * 0.3;
  }
}
