import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Textures, glowTexture, boxUV } from './Textures.js';

// Shared uniforms (time for wind / flicker shaders).
export const globalUniforms = {
  uTime: { value: 0 },
  uWind: { value: 1 },
};

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return matCache.get(key);
}

export { RoundedBoxGeometry };

// Vertex wind sway injected into a standard material.
export function addWind(material, strength = 0.15, heightScale = 1, instanced = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = globalUniforms.uTime;
    shader.uniforms.uWind = globalUniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         uniform float uWind;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         {
           vec4 wp = modelMatrix * ${instanced ? 'instanceMatrix *' : ''} vec4(position, 1.0);
           float h = max(position.y * ${heightScale.toFixed(3)}, 0.0);
           float w = sin(uTime * 1.7 + wp.x * 0.35 + wp.z * 0.21) * 0.6
                   + sin(uTime * 3.1 + wp.x * 0.9 - wp.z * 0.7) * 0.25;
           transformed.x += w * ${strength.toFixed(3)} * h * uWind;
           transformed.z += w * ${(strength * 0.6).toFixed(3)} * h * uWind;
         }`,
      );
  };
  material.customProgramCacheKey = () => 'wind' + strength + heightScale + instanced;
  return material;
}

// Displace vertices with smooth noise; vertices are welded first so the
// result shades smoothly (no faceted low-poly look).
function jitter(geo, amount, seed = 1) {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-4);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 3.1 + seed) * Math.cos(v.y * 2.7 + seed * 2) * Math.sin(v.z * 3.3 + seed * 3);
    v.multiplyScalar(1 + n * amount);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function colorize(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// ---------------------------------------------------------------- Trees

let leafMat = null;
let barkMat = null;
export function makeTree(rng = Math.random, kind = 'round') {
  if (!leafMat) {
    leafMat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), 0.05, 0.4);
    const bark = Textures.bark();
    barkMat = new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, roughness: 0.95 });
  }
  const g = new THREE.Group();
  const h = 2.4 + rng() * 1.6;
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, h, 10, 4);
  trunkGeo.translate(0, h / 2, 0);
  const trunk = new THREE.Mesh(trunkGeo, barkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);

  const parts = [];
  const hue = 0.24 + rng() * 0.08;
  if (kind === 'pine') {
    for (let i = 0; i < 4; i++) {
      const r = 1.9 - i * 0.4;
      let cg = new THREE.ConeGeometry(r, 1.8, 16, 3);
      cg = jitter(cg, 0.05, i + rng() * 10);
      cg.translate(0, h - 0.4 + i * 0.9, 0);
      colorize(cg, new THREE.Color().setHSL(0.36, 0.45, 0.2 + i * 0.04));
      parts.push(cg);
    }
  } else {
    const blobs = 4 + ((rng() * 3) | 0);
    for (let i = 0; i < blobs; i++) {
      const r = 1.0 + rng() * 0.7;
      let sg = new THREE.IcosahedronGeometry(r, 3);
      sg = jitter(sg, 0.12, rng() * 100);
      const a = (i / blobs) * Math.PI * 2 + rng();
      const d = i === 0 ? 0 : 0.9 + rng() * 0.4;
      sg.translate(Math.cos(a) * d, h + 0.6 + rng() * 1.2 - (i === 0 ? -0.5 : 0), Math.sin(a) * d);
      const l = 0.3 + rng() * 0.12;
      colorize(sg, new THREE.Color().setHSL(hue, 0.55, l));
      parts.push(sg);
    }
  }
  const leaves = new THREE.Mesh(mergeGeometries(parts), leafMat);
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  g.add(leaves);
  return g;
}

export function makeRock(rng = Math.random, size = 1) {
  let geo = new THREE.DodecahedronGeometry(size, 2);
  geo = jitter(geo, 0.22, rng() * 50);
  geo.scale(1, 0.6 + rng() * 0.3, 1);
  const m = new THREE.Mesh(geo, mat(0x8a8a90, { roughness: 0.9, flatShading: false }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeBush(rng = Math.random) {
  if (!leafMat) makeTree(rng);
  const parts = [];
  const n = 3 + ((rng() * 3) | 0);
  for (let i = 0; i < n; i++) {
    let sg = new THREE.IcosahedronGeometry(0.5 + rng() * 0.35, 2);
    sg = jitter(sg, 0.15, rng() * 100);
    sg.translate((rng() - 0.5) * 1.1, 0.35 + rng() * 0.3, (rng() - 0.5) * 1.1);
    colorize(sg, new THREE.Color().setHSL(0.27 + rng() * 0.05, 0.5, 0.26 + rng() * 0.1));
    parts.push(sg);
  }
  // a few flowers
  for (let i = 0; i < 4; i++) {
    let f = new THREE.IcosahedronGeometry(0.08, 0);
    f = jitter(f, 0, 0);
    f.translate((rng() - 0.5) * 1.2, 0.75 + rng() * 0.3, (rng() - 0.5) * 1.2);
    colorize(f, ['#ff8ab0', '#fff07a', '#ffffff', '#b98cff'][(rng() * 4) | 0]);
    parts.push(f);
  }
  const m = new THREE.Mesh(mergeGeometries(parts), leafMat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- Grass

export function makeGrassField({ count, area, height = 0.55, exclude, colorA = 0x2f5a1c, colorB = 0x9bd35a }) {
  // blade: 4-segment tapered strip
  const segs = 4;
  const w = 0.07;
  const positions = [];
  const colors = [];
  const normals = [];
  const idx = [];
  const ca = new THREE.Color(colorA);
  const cb = new THREE.Color(colorB);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const hw = w * (1 - t * 0.9);
    const bend = t * t * 0.12;
    positions.push(-hw, t, bend, hw, t, bend);
    const c = ca.clone().lerp(cb, Math.pow(t, 0.8));
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    normals.push(0, 1, 0, 0, 1, 0);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(idx);

  const m = addWind(
    new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }),
    0.35,
    1,
    true,
  );
  const mesh = new THREE.InstancedMesh(geo, m, count);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 4) {
    const p = area.sample();
    if (exclude && exclude(p.x, p.z)) continue;
    dummy.position.set(p.x, p.y - 0.02, p.z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    const s = height * (0.6 + Math.random() * 0.8);
    dummy.scale.set(1 + Math.random() * 0.5, s, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed++, dummy.matrix);
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.userData.noAO = true;
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------- Humanoids

export function makeHumanoid(o = {}) {
  const g = new THREE.Group();
  const skin = mat(o.skin ?? 0xf2c7a0, { roughness: 0.7 });
  const shirt = mat(o.shirt ?? 0x4d7bd1, { roughness: 0.85 });
  const pants = mat(o.pants ?? 0x3b3548, { roughness: 0.9 });
  const dark = mat(0x1a1420, { roughness: 0.4 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.45, 6, 14), shirt);
  body.position.y = 1.02;
  body.scale.set(1, 1, 0.8);
  g.add(body);
  if (o.apron) {
    const ap = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 10), mat(o.apron, { roughness: 0.9 }));
    ap.position.set(0, 0.95, 0.1);
    ap.scale.set(1, 1, 0.55);
    g.add(ap);
  }

  const head = new THREE.Group();
  head.position.y = 1.62;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), skin);
  head.add(skull);
  const eyeGeo = new THREE.SphereGeometry(0.035, 10, 8);
  [-0.08, 0.08].forEach((x) => {
    const e = new THREE.Mesh(eyeGeo, dark);
    e.position.set(x, 0.03, 0.21);
    head.add(e);
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), skin);
  nose.position.set(0, -0.02, 0.24);
  head.add(nose);
  if (o.hair !== null) {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.255, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mat(o.hair ?? 0x5a3a22, { roughness: 0.9 }),
    );
    hair.rotation.x = -0.25;
    hair.position.y = 0.02;
    head.add(hair);
  }
  if (o.beard) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(o.beard, { roughness: 1 }));
    b.position.set(0, -0.14, 0.13);
    b.scale.set(1.1, 1.1, 0.7);
    head.add(b);
  }
  if (o.hat === 'witch') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 24), mat(o.hatColor ?? 0x3a2458));
    brim.position.y = 0.15;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 20), mat(o.hatColor ?? 0x3a2458));
    cone.position.y = 0.45;
    cone.rotation.z = 0.2;
    head.add(brim, cone);
  } else if (o.hat === 'cap') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.265, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
      mat(o.hatColor ?? 0xc0392b),
    );
    cap.position.y = 0.04;
    head.add(cap);
  } else if (o.hat === 'straw') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.04, 24), mat(0xe8c36a));
    brim.position.y = 0.14;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.18, 20), mat(0xe8c36a));
    top.position.y = 0.24;
    head.add(brim, top);
  } else if (o.hat === 'hood') {
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      mat(o.hatColor ?? 0x2a2a3a),
    );
    hood.position.set(0, 0.02, -0.03);
    head.add(hood);
  }
  g.add(head);

  const limb = (r, len, m) => {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
    mesh.position.y = -len / 2 - r * 0.5;
    mesh.castShadow = true;
    pivot.add(mesh);
    return pivot;
  };
  const armL = limb(0.08, 0.45, shirt);
  armL.position.set(-0.36, 1.32, 0);
  const armR = limb(0.08, 0.45, shirt);
  armR.position.set(0.36, 1.32, 0);
  const handGeo = new THREE.SphereGeometry(0.09, 10, 8);
  [armL, armR].forEach((a) => {
    const hnd = new THREE.Mesh(handGeo, skin);
    hnd.position.y = -0.62;
    a.add(hnd);
  });
  const legL = limb(0.1, 0.42, pants);
  legL.position.set(-0.13, 0.68, 0);
  const legR = limb(0.1, 0.42, pants);
  legR.position.set(0.13, 0.68, 0);
  g.add(armL, armR, legL, legR);

  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  if (o.scale) g.scale.setScalar(o.scale);
  g.userData.rig = { head, armL, armR, legL, legR, body };
  return g;
}

export function animateHumanoid(h, t, walk, extra = {}) {
  const r = h.userData.rig;
  const s = Math.sin(t * 8) * walk;
  r.legL.rotation.x = s * 0.7;
  r.legR.rotation.x = -s * 0.7;
  r.armL.rotation.x = -s * 0.6 + (extra.armL ?? 0);
  r.armR.rotation.x = s * 0.6 + (extra.armR ?? 0);
  r.armL.rotation.z = 0.08;
  r.armR.rotation.z = -0.08;
  r.body.position.y = 1.02 + Math.abs(Math.cos(t * 8)) * 0.04 * walk + Math.sin(t * 2) * 0.01;
  r.head.position.y = r.body.position.y + 0.6;
  r.head.rotation.y = extra.look ?? Math.sin(t * 0.7) * 0.15 * (1 - walk);
  r.head.rotation.z = extra.tilt ?? 0;
}

// ---------------------------------------------------------------- Props

export function makeTorch(withFlame = true) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.6, 8), mat(0x5a3a22));
  stick.rotation.x = -0.35;
  stick.position.set(0, 0, 0.1);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.14, 10), mat(0x3a3a40, { metalness: 0.6, roughness: 0.4 }));
  cup.position.set(0, 0.3, 0.2);
  g.add(stick, cup);
  if (withFlame) {
    const flame = makeFlame(0.55);
    flame.position.set(0, 0.48, 0.21);
    g.add(flame);
    g.userData.flame = flame;
  }
  return g;
}

export function makeFlame(size = 0.5, color = 0xffa040) {
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: new THREE.Color(color).multiplyScalar(3.5),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  spr.scale.set(size * 0.7, size, 1);
  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: new THREE.Color(0xfff0c0).multiplyScalar(4),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  core.scale.set(size * 0.3, size * 0.45, 1);
  core.position.y = -size * 0.1;
  const g = new THREE.Group();
  g.add(spr, core);
  g.userData.base = size;
  g.userData.phase = Math.random() * 10;
  g.userData.flicker = (t) => {
    const f = 0.85 + Math.sin(t * 13 + g.userData.phase) * 0.08 + Math.sin(t * 23 + g.userData.phase * 2) * 0.07;
    spr.scale.set(size * 0.7 * f, size * f * 1.1, 1);
    core.scale.set(size * 0.3 * f, size * 0.45 * f, 1);
    return f;
  };
  return g;
}

export function makeLampPost() {
  const g = new THREE.Group();
  const iron = mat(0x2a2a30, { metalness: 0.7, roughness: 0.4 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 10), iron);
  post.position.y = 1.6;
  const arm = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 8, 16, Math.PI / 2), iron);
  arm.position.set(0.35, 3.1, 0);
  arm.rotation.z = Math.PI / 2;
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.35, 6), iron);
  cage.position.set(0.7, 2.85, 0);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffe6a8,
    emissive: 0xffb050,
    emissiveIntensity: 0,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.3, 6), glassMat);
  glass.position.copy(cage.position);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 6), iron);
  cap.position.set(0.7, 3.12, 0);
  g.add(post, arm, cage, glass, cap);
  g.traverse((c) => c.isMesh && (c.castShadow = true));
  glass.castShadow = false;
  g.userData.glass = glassMat;
  g.userData.lightPos = new THREE.Vector3(0.7, 2.8, 0);
  return g;
}

export function makeChest(color = 0x8a5a2e) {
  const g = new THREE.Group();
  const wood = Textures.wood();
  const woodMat = new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, color, roughness: 0.7 });
  const gold = mat(0xe0a93a, { metalness: 0.9, roughness: 0.3 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.6, 0.7, 3, 0.05), woodMat);
  base.position.y = 0.3;
  g.add(base);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.6, -0.35);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16, 1, false, 0, Math.PI), woodMat);
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI / 2;
  lid.position.set(0, 0, 0.35);
  lid.scale.set(1, 1, 0.55);
  lidPivot.add(lid);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.72), gold);
  band.position.set(-0.35, 0.3, 0);
  const band2 = band.clone();
  band2.position.x = 0.35;
  const lock = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.2, 0.06, 2, 0.02), gold);
  lock.position.set(0, 0.52, 0.37);
  g.add(band, band2, lock, lidPivot);
  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  g.userData.lid = lidPivot;
  return g;
}

export function makePedestal() {
  const g = new THREE.Group();
  const wood = Textures.wood();
  const woodMat = new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, roughness: 0.6, color: 0xc08a58 });
  const top = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.12, 1.1, 3, 0.04), woodMat);
  top.position.y = 0.9;
  const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.85, 8);
  [
    [-0.45, -0.45],
    [0.45, -0.45],
    [-0.45, 0.45],
    [0.45, 0.45],
  ].forEach(([x, z]) => {
    const l = new THREE.Mesh(legGeo, woodMat);
    l.position.set(x, 0.43, z);
    g.add(l);
  });
  const cloth = Textures.cloth(0.55, 0.12, 0.2);
  const clothMesh = new THREE.Mesh(
    new RoundedBoxGeometry(1.16, 0.2, 1.16, 3, 0.05),
    new THREE.MeshStandardMaterial({ map: cloth.map, normalMap: cloth.normalMap, roughness: 0.95 }),
  );
  clothMesh.position.y = 0.88;
  const cushion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.34, 0.08, 20),
    mat(0xe0a93a, { metalness: 0.6, roughness: 0.35 }),
  );
  cushion.position.y = 1.0;
  g.add(top, clothMesh, cushion);
  g.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return g;
}

export function makeBarrel() {
  const wood = Textures.wood();
  const m = new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, color: 0xb07a48, roughness: 0.7 });
  const geo = new THREE.CylinderGeometry(0.42, 0.42, 1.0, 18, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const k = 1 + 0.12 * Math.cos((y / 0.5) * Math.PI * 0.5);
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  const b = new THREE.Mesh(geo, m);
  b.position.y = 0.5;
  const hoop = mat(0x3a3a40, { metalness: 0.7, roughness: 0.4 });
  [0.2, 0.8].forEach((y) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.025, 6, 24), hoop);
    r.rotation.x = Math.PI / 2;
    r.position.y = y;
    g.add(r);
  });
  g.add(b);
  g.traverse((c) => c.isMesh && ((c.castShadow = true), (c.receiveShadow = true)));
  return g;
}

export function makeCrate(size = 0.9) {
  const wood = Textures.wood();
  const m = new THREE.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, color: 0xc89a68, roughness: 0.75 });
  const c = new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 2, 0.04), m);
  c.position.y = size / 2;
  c.castShadow = c.receiveShadow = true;
  const g = new THREE.Group();
  g.add(c);
  return g;
}

export function makePot(color = 0xb86a3a) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const r = 0.18 + Math.sin(t * Math.PI) * 0.22 - (t > 0.85 ? (t - 0.85) * 0.8 : 0);
    pts.push(new THREE.Vector2(Math.max(0.12, r), t * 0.8));
  }
  const geo = new THREE.LatheGeometry(pts, 20);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- Buildings

export function makeGableRoof(w, d, h, overhang, texMat) {
  // prism along X; texture scaled by dimensions
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const slope = Math.hypot(hd, h);
  const vertices = [
    // left slope (-z)
    -hw, 0, -hd, hw, 0, -hd, hw, h, 0, -hw, h, 0,
    // right slope (+z)
    hw, 0, hd, -hw, 0, hd, -hw, h, 0, hw, h, 0,
  ];
  const uvs = [0, 0, w, 0, w, slope, 0, slope, 0, 0, w, 0, w, slope, 0, slope].map((v) => v / 2.2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6]);
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, texMat);
  roof.castShadow = true;
  roof.receiveShadow = true;
  // thickness underside
  const under = new THREE.Mesh(geo, mat(0x4a3020, { side: THREE.BackSide }));
  under.position.y = -0.08;
  const g = new THREE.Group();
  g.add(roof, under);
  // gable triangles
  const tri = new THREE.Shape();
  tri.moveTo(-d / 2, 0);
  tri.lineTo(d / 2, 0);
  tri.lineTo(0, h * (d / 2 / hd));
  tri.closePath();
  const pl = Textures.plaster();
  const triGeo = new THREE.ShapeGeometry(tri);
  const triMat = new THREE.MeshStandardMaterial({ map: pl.map, color: 0xf0e6d6, side: THREE.DoubleSide });
  [-w / 2, w / 2].forEach((x) => {
    const t = new THREE.Mesh(triGeo, triMat);
    t.rotation.y = Math.PI / 2;
    t.position.x = x;
    t.castShadow = true;
    t.receiveShadow = true;
    g.add(t);
  });
  return g;
}

export function makeHouse({ w = 7, d = 6, h = 3.2, roofHue = 0, door = true, windowsMat }) {
  const g = new THREE.Group();
  const pl = Textures.plaster();
  const wallMat = new THREE.MeshStandardMaterial({ map: pl.map, normalMap: pl.normalMap, color: 0xf3e9d8, roughness: 0.95 });
  const wallGeo = boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, 3);
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = h / 2;
  walls.castShadow = walls.receiveShadow = true;
  g.add(walls);

  const wood = Textures.wood();
  const beamMat = new THREE.MeshStandardMaterial({ map: wood.map, color: 0x6a4428, roughness: 0.8 });
  const beam = (bw, bh, bd, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), beamMat);
    b.position.set(x, y, z);
    b.castShadow = true;
    g.add(b);
  };
  [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [-w / 2, d / 2],
    [w / 2, d / 2],
  ].forEach(([x, z]) => beam(0.3, h, 0.3, x, h / 2, z));
  beam(w + 0.3, 0.25, 0.3, 0, h - 0.1, d / 2);
  beam(w + 0.3, 0.25, 0.3, 0, h - 0.1, -d / 2);
  beam(w + 0.3, 0.2, 0.3, 0, 0.1, d / 2);

  const roofTex = Textures.roof(roofHue);
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex.map, normalMap: roofTex.normalMap, roughness: 0.75 });
  const roof = makeGableRoof(w, d, 2.2, 0.6, roofMat);
  roof.position.y = h;
  g.add(roof);

  // chimney
  const chim = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.8, 0.7, 2, 0.05), mat(0x8a6a5a, { roughness: 0.9 }));
  chim.position.set(w * 0.28, h + 1.5, -d * 0.2);
  chim.castShadow = true;
  g.add(chim);
  g.userData.chimney = new THREE.Vector3(w * 0.28, h + 2.5, -d * 0.2);

  if (door) {
    const doorMesh = new THREE.Mesh(new RoundedBoxGeometry(1.3, 2.2, 0.15, 2, 0.04), beamMat);
    doorMesh.position.set(0, 1.1, d / 2 + 0.02);
    g.add(doorMesh);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), mat(0xe0a93a, { metalness: 0.8, roughness: 0.3 }));
    knob.position.set(0.4, 1.1, d / 2 + 0.12);
    g.add(knob);
  }
  // windows
  const wm =
    windowsMat ??
    new THREE.MeshStandardMaterial({ color: 0x2a3548, emissive: 0xffb45a, emissiveIntensity: 0, roughness: 0.1, metalness: 0.2 });
  const winGeo = new RoundedBoxGeometry(1.0, 1.0, 0.1, 2, 0.03);
  const frameGeo = new THREE.BoxGeometry(1.2, 0.12, 0.2);
  const addWin = (x, y, z, ry) => {
    const win = new THREE.Mesh(winGeo, wm);
    win.position.set(x, y, z);
    win.rotation.y = ry;
    g.add(win);
    const sill = new THREE.Mesh(frameGeo, beamMat);
    sill.position.set(x, y - 0.56, z);
    sill.rotation.y = ry;
    g.add(sill);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.14), beamMat);
    cross.position.set(x, y, z);
    cross.rotation.y = ry;
    g.add(cross);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.14), beamMat);
    cross2.position.set(x, y, z);
    cross2.rotation.y = ry;
    g.add(cross2);
  };
  addWin(-w * 0.3, 1.7, d / 2 + 0.03, 0);
  addWin(w * 0.3, 1.7, d / 2 + 0.03, 0);
  addWin(w / 2 + 0.03, 1.7, 0, Math.PI / 2);
  addWin(-w / 2 - 0.03, 1.7, 0, Math.PI / 2);
  g.userData.windows = wm;
  return g;
}
