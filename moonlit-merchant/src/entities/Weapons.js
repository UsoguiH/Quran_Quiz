import * as THREE from 'three';
import { WEAPONS } from '../game/Items.js';
import { mat, RoundedBoxGeometry } from '../render/Models.js';
import { Projectile, makeArrowMesh } from './Combat.js';

const SPEC = {
  sword: { dur: 0.36, range: 2.7, arc: 110, knock: 5, hitAt: 0.42, move: 0.75 },
  great: { dur: 0.78, range: 3.3, arc: 150, knock: 10, hitAt: 0.45, move: 0.45 },
  bow: { dur: 0.25, move: 0.55 },
};

const TIER_COLORS = {
  sword: [0xd8a060, 0x7fd8ff, 0xb9a2ff],
  great: [0x9aa2ae, 0xf2c14a, 0xff6a4a],
  bow: [0x9a6a3a, 0x6fd0ff, 0xffb040],
};

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function bladeShape(len, w, tipLen) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, len - tipLen);
  s.quadraticCurveTo(-w / 2, len - tipLen * 0.3, 0, len);
  s.quadraticCurveTo(w / 2, len - tipLen * 0.3, w / 2, len - tipLen);
  s.lineTo(w / 2, 0);
  s.closePath();
  return s;
}

function buildSword(tier, great = false) {
  const g = new THREE.Group();
  const len = great ? 1.25 : 0.85;
  const w = great ? 0.16 : 0.09;
  const col = TIER_COLORS[great ? 'great' : 'sword'][tier - 1];
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape(len, w, great ? 0.22 : 0.16), {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 8,
  });
  bladeGeo.translate(0, 0.12, -0.008);
  const bladeMat = new THREE.MeshStandardMaterial({
    color: tier === 1 && !great ? 0xe8c9a0 : 0xe6ebf2,
    metalness: 0.95,
    roughness: 0.34,
    emissive: tier > 1 ? col : 0x000000,
    emissiveIntensity: tier > 1 ? 0.35 + tier * 0.15 : 0,
  });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  // fuller groove
  const fuller = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.2, len * 0.6, 0.04),
    new THREE.MeshStandardMaterial({ color: col, metalness: 0.6, roughness: 0.3, emissive: col, emissiveIntensity: tier > 1 ? 1.5 : 0 }),
  );
  fuller.position.y = 0.12 + len * 0.38;
  const guard = new THREE.Mesh(
    new RoundedBoxGeometry(great ? 0.42 : 0.3, 0.05, 0.07, 2, 0.02),
    mat(0xd9a441, { metalness: 0.9, roughness: 0.3 }),
  );
  guard.position.y = 0.1;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, great ? 0.3 : 0.18, 10), mat(0x4a2a16, { roughness: 0.8 }));
  grip.position.y = great ? -0.06 : 0.0;
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), mat(0xd9a441, { metalness: 0.9, roughness: 0.3 }));
  pommel.position.y = great ? -0.23 : -0.1;
  g.add(blade, fuller, guard, grip, pommel);
  g.userData.tipLen = len + 0.12;
  g.userData.color = new THREE.Color(col);
  return g;
}

function buildShield() {
  const g = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.05, 28),
    mat(0x7a4a2a, { roughness: 0.7 }),
  );
  face.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 32), mat(0xb8bcc6, { metalness: 0.9, roughness: 0.3 }));
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), mat(0xd9a441, { metalness: 0.9, roughness: 0.3 }));
  boss.position.z = 0.03;
  boss.scale.z = 0.6;
  const moon = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.02, 6, 20, Math.PI * 1.2),
    new THREE.MeshStandardMaterial({ color: 0xc9b8ff, emissive: 0x8a70ff, emissiveIntensity: 0.8 }),
  );
  moon.position.z = 0.03;
  moon.rotation.z = 0.8;
  g.add(face, rim, boss, moon);
  return g;
}

function buildBow(tier) {
  const g = new THREE.Group();
  const col = TIER_COLORS.bow[tier - 1];
  const limbMat = new THREE.MeshStandardMaterial({
    color: col,
    roughness: 0.5,
    metalness: tier > 1 ? 0.4 : 0,
    emissive: tier > 1 ? col : 0,
    emissiveIntensity: tier > 1 ? 0.5 : 0,
  });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.022, 8, 40, Math.PI * 0.72), limbMat);
  arc.rotation.z = Math.PI - Math.PI * 0.36;
  arc.position.x = 0.45;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 10), mat(0x3a2414));
  grip.position.x = -0.1;
  g.add(arc, grip);
  // string (two segments meeting at nock)
  const top = new THREE.Vector3(0.45 + Math.cos(Math.PI * 0.64) * 0.55, Math.sin(Math.PI * 0.64) * 0.55, 0);
  const bot = new THREE.Vector3(top.x, -top.y, 0);
  const stringMat = new THREE.LineBasicMaterial({ color: 0xf5f0e6 });
  const sgeo = new THREE.BufferGeometry().setFromPoints([top, new THREE.Vector3(top.x, 0, 0), bot]);
  const str = new THREE.Line(sgeo, stringMat);
  g.add(str);
  const arrow = makeArrowMesh([1, 0.8, 0.5], tier > 1);
  arrow.rotation.y = -Math.PI / 2;
  arrow.position.set(top.x - 0.3, 0, 0);
  g.add(arrow);
  const outer = new THREE.Group();
  g.rotation.y = -Math.PI / 2;
  outer.add(g);
  outer.userData = { string: sgeo, top, bot, arrow, restX: top.x, color: new THREE.Color(col) };
  return outer;
}

function buildHand() {
  const g = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 6, 12), mat(0x3d63b0, { roughness: 0.9 }));
  arm.rotation.x = Math.PI / 2;
  arm.position.z = 0.22;
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), mat(0xc99a78, { roughness: 0.75 }));
  hand.scale.set(1, 0.8, 1.25);
  g.add(arm, hand);
  return g;
}

// Trail ribbon: additive arc (in the XY plane around the swing pivot) that
// fades out behind the blade.
function buildTrail() {
  const geo = new THREE.RingGeometry(0.3, 1.0, 64, 1, 0, Math.PI * 2);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uHead: { value: 0 },
      uDir: { value: 1 },
      uLen: { value: 1.3 },
      uColor: { value: new THREE.Color(2.2, 2.0, 1.6) },
      uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vP;
      void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uHead, uDir, uLen, uOpacity;
      uniform vec3 uColor;
      varying vec3 vP;
      void main() {
        float a = atan(-vP.x, vP.y);
        float d = (a - uHead) * uDir;
        if (d < 0.0 || d > uLen) discard;
        float t = 1.0 - d / uLen;
        float r = length(vP.xy);
        float rt = clamp((r - 0.5) / 0.5, 0.0, 1.0);
        float edge = smoothstep(0.0, 0.35, rt) * smoothstep(1.0, 0.85, rt);
        float alpha = t * t * edge * uOpacity * (0.2 + 0.8 * rt) * 0.75;
        gl_FragColor = vec4(uColor * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = 10;
  mesh.frustumCulled = false;
  return mesh;
}

// Swing geometry per weapon type (camera space). The blade sweeps like a
// windshield wiper around a pivot below the view, so the whole slash arc is
// visible on screen.
const SWING = {
  sword: { pivot: new THREE.Vector3(0.08, -0.72, -0.95), offset: 0.2, radius: 1.0 },
  great: { pivot: new THREE.Vector3(0.1, -0.85, -1.15), offset: 0.26, radius: 1.4 },
};

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

export class Weapons {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Group();
    this.holder = new THREE.Group();
    this.root.add(this.holder);
    this.trailGroup = new THREE.Group();
    this.trail = buildTrail();
    this.trailGroup.add(this.trail);
    this.root.add(this.trailGroup);
    game.engine.viewScene.add(this.root);

    this.shield = buildShield();
    this.root.add(this.shield);
    this.hand = buildHand();
    this.root.add(this.hand);

    this.models = {};
    this.currentId = undefined;
    this.state = 'idle';
    this.t = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.hitDone = false;
    this.draw = 0;
    this.blockAmt = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.swapAnim = 0;
    this.punch = 0;
    this.swingFrom = 0;
    this.swingTo = 0;
    this.swingTilt = 0;
    this.swingRoll = 0;
  }

  get weaponId() {
    const s = this.game.state;
    return s.equipped[s.activeWeapon] ?? s.equipped[0];
  }

  get spec() {
    const w = WEAPONS[this.weaponId];
    return w ? SPEC[w.type] : null;
  }

  model(id) {
    if (!this.models[id]) {
      const w = WEAPONS[id];
      let m;
      if (w.type === 'bow') m = buildBow(w.tier);
      else m = buildSword(w.tier, w.type === 'great');
      m.visible = false;
      m.scale.setScalar(w.type === 'bow' ? 0.78 : 0.72);
      this.holder.add(m);
      this.models[id] = m;
    }
    return this.models[id];
  }

  refresh() {
    const combat = this.game.area?.combat;
    const id = combat ? this.weaponId : null;
    if (id === this.currentId) return;
    Object.values(this.models).forEach((m) => (m.visible = false));
    this.currentId = id;
    if (id) this.model(id).visible = true;
    this.state = 'idle';
    this.swapAnim = 1;
  }

  swap() {
    const s = this.game.state;
    if (!s.equipped[1] || !s.equipped[0]) return;
    s.activeWeapon = 1 - s.activeWeapon;
    this.game.audio.play('click');
    this.refresh();
    this.game.ui.updateWeapons();
  }

  cancel() {
    if (this.state === 'draw') this.draw = 0;
    this.state = 'idle';
    this.trail.material.uniforms.uOpacity.value = 0;
  }

  moveMul() {
    if (this.state === 'swing') return this.spec?.move ?? 1;
    if (this.state === 'draw') return 0.55;
    return 1;
  }

  fovOffset() {
    if (this.state === 'draw') return -this.draw * 12;
    return 0;
  }

  update(dt) {
    const game = this.game;
    const input = game.input;
    const player = game.player;
    this.refresh();
    const combat = game.area?.combat;
    const w = WEAPONS[this.currentId];
    const type = w?.type;
    const canAct = game.canControl() && !player.dead && player.rollTime <= 0;

    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;

    // --------------------------------------------------------- input
    if (combat && w && canAct) {
      if (input.hit('KeyQ')) this.swap();
      const blockHeld = input.mouse.buttons.has(2) && type !== 'bow';
      player.blocking = blockHeld && this.state !== 'swing';
      if (type === 'bow') {
        if (input.mouse.pressed.has(0) && this.state === 'idle') {
          this.state = 'draw';
          this.draw = 0;
          game.audio.play('bowDraw');
        }
        if (this.state === 'draw') {
          this.draw = Math.min(1, this.draw + dt / 0.75);
          if (!input.mouse.buttons.has(0)) this.fireArrow(w);
        }
      } else if (input.mouse.pressed.has(0) || (input.mouse.buttons.has(0) && this.state === 'idle')) {
        if (this.state === 'idle' || (this.state === 'swing' && this.t > 0.72)) this.startSwing(type);
      }
    } else {
      player.blocking = false;
      if (this.state === 'draw') this.cancel();
      if (!combat && canAct && input.mouse.pressed.has(0)) this.punch = 1;
    }

    // --------------------------------------------------------- sway & bob
    const md = game.canControl() ? input.mouse : { dx: 0, dy: 0 };
    this.swayX += (-md.dx * 0.0006 - this.swayX) * Math.min(1, dt * 10);
    this.swayY += (md.dy * 0.0006 - this.swayY) * Math.min(1, dt * 10);
    const bob = player.bob;
    const ba = player.bobAmt;
    this.blockAmt += ((player.blocking ? 1 : 0) - this.blockAmt) * Math.min(1, dt * 14);
    this.swapAnim = Math.max(0, this.swapAnim - dt * 3.5);
    const off = new THREE.Vector3(
      Math.cos(bob) * 0.012 * ba + this.swayX,
      Math.abs(Math.sin(bob)) * 0.018 * ba + this.swayY - this.swapAnim * 0.5 - (player.rollTime > 0 ? 0.2 : 0),
      0,
    );
    this.root.position.copy(off);

    // --------------------------------------------------------- melee
    const u = this.trail.material.uniforms;
    if (type === 'sword' || type === 'great') {
      const spec = SPEC[type];
      const sw = SWING[type];
      // idle pose
      const idlePos = type === 'great' ? new THREE.Vector3(0.46, -0.52, -0.7) : new THREE.Vector3(0.42, -0.44, -0.66);
      const b = this.blockAmt;
      if (type === 'great') idlePos.x -= b * 0.35;
      _e.set(-0.5 - b * 0.9, 0, (type === 'great' ? 0.8 : 0.32) + (type === 'great' ? b * 0.8 : 0));
      const idleQ = new THREE.Quaternion().setFromEuler(_e);
      let pos = idlePos;
      let quat = idleQ;
      let swingW = 0;
      if (this.state === 'swing') {
        this.t += dt / spec.dur;
        const t = this.t;
        if (!this.hitDone && t >= spec.hitAt) {
          this.hitDone = true;
          this.doMelee(w, spec);
        }
        if (t >= 1) {
          this.state = 'idle';
          u.uOpacity.value = 0;
        }
        swingW = t < 0.2 ? easeOut(t / 0.2) : t > 0.72 ? 1 - easeInOut(Math.min(1, (t - 0.72) / 0.28)) : 1;
        const strikeT = Math.min(1, Math.max(0, (t - 0.16) / 0.4));
        const ang = this.swingFrom + (this.swingTo - this.swingFrom) * easeInOut(strikeT);
        // camera-space swing transform: pivot * tilt * wiper * offset
        _m.makeTranslation(sw.pivot.x, sw.pivot.y, sw.pivot.z);
        _m.multiply(_m2.makeRotationX(this.swingTilt));
        _m.multiply(_m2.makeRotationY(this.swingRoll));
        this.trailGroup.position.set(0, 0, 0);
        this.trailGroup.quaternion.identity();
        this.trailGroup.matrixAutoUpdate = false;
        this.trailGroup.matrix.copy(_m).scale(_s.set(sw.radius, sw.radius, sw.radius));
        _m.multiply(_m2.makeRotationZ(ang));
        _m.multiply(_m2.makeTranslation(0, sw.offset, 0));
        _m.multiply(_m2.makeRotationX(-0.25)); // blade leans away from the camera
        _m.decompose(_p, _q, _s);
        pos = idlePos.clone().lerp(_p, swingW);
        quat = idleQ.clone().slerp(_q, swingW);
        u.uHead.value = ang;
        u.uDir.value = Math.sign(this.swingFrom - this.swingTo);
        u.uOpacity.value = strikeT > 0.02 && strikeT < 1 ? 1 : Math.max(0, u.uOpacity.value - dt * 10);
      } else {
        u.uOpacity.value = 0;
      }
      this.holder.position.copy(pos);
      this.holder.quaternion.copy(quat);
    } else {
      u.uOpacity.value = 0;
    }

    // --------------------------------------------------------- bow
    if (type === 'bow') {
      this.holder.position.set(0.2, -0.2, -0.72);
      const bw = this.models[this.currentId];
      const d = this.state === 'draw' ? easeOut(this.draw) : 0;
      this.holder.rotation.set(0, 0.1, 0.35 - d * 0.25);
      if (bw) {
        const ud = bw.userData;
        const nockX = ud.restX + d * 0.32;
        const arr = ud.string.attributes.position;
        arr.setXYZ(1, nockX, 0, 0);
        arr.needsUpdate = true;
        ud.arrow.position.x = nockX - 0.42;
        ud.arrow.visible = this.state !== 'recover';
        this.holder.position.z += d * 0.08;
        this.holder.position.x -= d * 0.06;
      }
      if (this.state === 'recover') {
        this.t += dt / SPEC.bow.dur;
        if (this.t >= 1) this.state = 'idle';
      }
    }

    // shield for swords
    const showShield = type === 'sword';
    this.shield.visible = showShield;
    if (showShield) {
      const b = this.blockAmt;
      this.shield.position.set(-0.66 + b * 0.5, -0.66 + b * 0.44, -0.8 + b * 0.22);
      this.shield.rotation.set(0.2 - b * 0.2, 0.8 - b * 0.8, 0);
      this.shield.scale.setScalar(0.7);
    }

    // bare hand in town
    this.hand.visible = !type;
    if (!type) {
      this.punch = Math.max(0, this.punch - dt * 4);
      const p = Math.sin(this.punch * Math.PI);
      this.hand.position.set(0.3, -0.3 + p * 0.08, -0.55 - p * 0.3);
      this.hand.rotation.set(-0.2, -0.3, 0.1);
    }

    // light the viewmodel like the environment
    const eng = game.engine;
    const env = game.area?.viewLight ?? { hemi: 1.0, sun: 1.4, fill: 0 };
    eng.viewAmbient.intensity = env.hemi;
    eng.viewSun.intensity = env.sun;
    eng.viewFill.intensity = env.fill;
    eng.viewScene.environmentIntensity = env.env ?? 0.3;
  }

  startSwing(type) {
    this.state = 'swing';
    this.t = 0;
    this.hitDone = false;
    const c = this.combo;
    // [from, to, tilt (lean away), roll (diagonal)]
    const patterns =
      type === 'great'
        ? [
            [-1.15, 1.15, -0.35, 0.15],
            [1.15, -1.15, -0.35, -0.15],
          ]
        : [
            [-1.1, 1.05, -0.3, 0.25],
            [1.05, -1.1, -0.3, -0.25],
            [-0.8, 1.2, -0.75, 0.45],
          ];
    const p = patterns[c % patterns.length];
    this.swingFrom = p[0];
    this.swingTo = p[1];
    this.swingTilt = p[2];
    this.swingRoll = p[3];
    this.combo = (c + 1) % patterns.length;
    this.comboTimer = SPEC[type].dur + 0.35;
    const col = this.models[this.currentId]?.userData.color ?? new THREE.Color(1, 1, 1);
    this.trail.material.uniforms.uColor.value.copy(col).lerp(new THREE.Color(1, 1, 1), 0.55).multiplyScalar(1.2);
    this.game.audio.play(type === 'great' ? 'heavySwing' : 'swing');
    this.lastComboIndex = c;
  }

  doMelee(w, spec) {
    const game = this.game;
    const player = game.player;
    const finisher = w.type === 'sword' && this.lastComboIndex === 2;
    let hits = 0;
    const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    for (const e of game.area.targets()) {
      if (e.dead) continue;
      const d = new THREE.Vector3(e.pos.x - player.pos.x, 0, e.pos.z - player.pos.z);
      const dist = d.length();
      if (dist - e.radius > spec.range) continue;
      d.normalize();
      const ang = (Math.acos(Math.max(-1, Math.min(1, d.dot(fwd)))) * 180) / Math.PI;
      if (ang > spec.arc / 2 && dist > e.radius + 0.6) continue;
      const crit = Math.random() < 0.12;
      let dmg = w.dmg * (finisher ? 1.5 : 1) * (crit ? 1.6 : 1);
      dmg = Math.round(dmg * (0.9 + Math.random() * 0.2));
      e.hurt(dmg, d, spec.knock * (finisher ? 1.6 : 1), crit);
      game.onHitEnemy(e, crit);
      hits++;
    }
    if (hits) {
      player.addShake(w.type === 'great' ? 0.35 : 0.18);
      game.hitStop(w.type === 'great' ? 0.07 : 0.04);
    }
  }

  fireArrow(w) {
    const game = this.game;
    const player = game.player;
    const cam = game.engine.camera;
    const d = this.draw;
    this.state = 'recover';
    this.t = 0;
    this.draw = 0;
    if (d < 0.15) return;
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const start = cam.position.clone().addScaledVector(dir, 0.6);
    start.y -= 0.08;
    const full = d >= 0.99;
    const color = w.tier === 1 ? [1.2, 1.0, 0.7] : w.tier === 2 ? [0.6, 1.6, 3] : [3, 1.6, 0.5];
    const p = new Projectile(game.area, {
      pos: start,
      vel: dir.multiplyScalar(20 + 30 * d),
      radius: 0.22,
      dmg: Math.round(w.dmg * (0.35 + 0.65 * d) * (full ? 1.3 : 1)),
      owner: 'player',
      gravity: 5 * (1 - d * 0.7),
      mesh: makeArrowMesh(color, w.tier > 1),
      color,
      crit: full,
      pierce: w.tier >= 3 ? 2 : w.tier === 2 ? 1 : 0,
      knock: 3 + d * 3,
      life: 3,
    });
    game.area.projectiles.push(p);
    game.audio.play('bowShoot');
    player.addShake(0.1);
  }
}
