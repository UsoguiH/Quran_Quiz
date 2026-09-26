import * as THREE from 'three';
import { RoundedBoxGeometry, mat } from '../render/Models.js';
import { glowTexture } from '../render/Textures.js';
import { Projectile } from './Combat.js';
import { ENEMY_DROPS, LOOT_TABLES, pickWeighted } from '../game/Items.js';

const _d = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

function hpBar() {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.09),
    new THREE.MeshBasicMaterial({ color: 0x120a14, transparent: true, opacity: 0.75, depthWrite: false }),
  );
  const fillGeo = new THREE.PlaneGeometry(1, 0.09);
  fillGeo.translate(0.5, 0, 0);
  const fill = new THREE.Mesh(
    fillGeo,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.35, 0.45), depthWrite: false, transparent: true }),
  );
  fill.position.set(-0.5, 0, 0.001);
  g.add(bg, fill);
  g.userData.fill = fill;
  g.visible = false;
  g.renderOrder = 20;
  g.userData.noAO = true;
  return g;
}

function glowSprite(color, size) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  s.scale.setScalar(size);
  return s;
}

function telegraphRing(radius, color = 0xff3040) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.92, radius, 64),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(2),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  fill.position.z = 0.001;
  m.add(fill);
  m.userData.fill = fill;
  m.renderOrder = 3;
  return m;
}

export class Enemy {
  constructor(area, pos, o) {
    this.area = area;
    this.game = area.game;
    this.pos = pos.clone();
    this.vel = new THREE.Vector3();
    this.knockV = new THREE.Vector3();
    this.hp = this.maxHp = Math.round(o.hp * (o.mult ?? 1));
    this.dmg = Math.round(o.dmg * (o.dmgMult ?? o.mult ?? 1));
    this.radius = o.radius ?? 0.5;
    this.height = o.height ?? 1.2;
    this.kind = o.kind;
    this.floor = o.floor ?? 1;
    this.floorMult = o.mult ?? 1;
    this.heavy = o.heavy ?? 1; // knockback resistance
    this.dead = false;
    this.deathT = 0;
    this.flash = 0;
    this.t = Math.random() * 10;
    this.active = false;
    this.contactDmg = 0;
    this.contactCd = 0;
    this.flying = false;
    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    this.bar = hpBar();
    this.bar.position.y = this.height + 0.35;
    this.bar.scale.setScalar(Math.max(0.8, this.radius * 1.4));
    this.group.add(this.bar);
    this.flashMats = [];
    area.scene.add(this.group);
    this.room = o.room ?? null;
    this.isBoss = false;
  }

  registerFlash(m) {
    m.userData.baseEmissive = m.emissive.clone();
    m.userData.baseIntensity = m.emissiveIntensity;
    this.flashMats.push(m);
    return m;
  }

  get player() {
    return this.game.player;
  }

  toPlayer(out = _d) {
    out.set(this.player.pos.x - this.pos.x, 0, this.player.pos.z - this.pos.z);
    return out;
  }

  hurt(dmg, dir, knock = 4, crit = false) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 1;
    this.active = true;
    if (dir) this.knockV.addScaledVector(dir, knock / this.heavy);
    this.game.ui.damageNumber(this.pos.clone().setY(this.pos.y + this.height + 0.2), dmg, crit ? 'crit' : '');
    this.area.sparks.burst(this.pos.clone().setY(this.pos.y + this.height * 0.55), crit ? 22 : 12, {
      color: this.hitColor ?? [2.5, 2, 1.5],
      speed: 5,
      size: 0.07,
      life: 0.35,
      gravity: 8,
    });
    this.game.audio.play(crit ? 'crit' : 'hit');
    this.onHurt?.();
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.deathT = 0;
    this.bar.visible = false;
    this.game.state.stats.kills++;
    this.game.audio.play('die');
    this.area.sparks.burst(this.pos.clone().setY(this.pos.y + this.height * 0.5), 40, {
      color: this.hitColor ?? [2, 2, 2],
      speed: 6,
      size: 0.1,
      life: 0.7,
      gravity: 4,
    });
    this.area.dust.burst(this.pos.clone().setY(this.pos.y + 0.3), 16, {
      color: [0.4, 0.38, 0.36],
      speed: 2,
      size: 0.5,
      life: 1,
      gravity: -0.5,
      grow: 0.6,
      alpha: 0.4,
    });
    this.dropLoot();
    this.onDeath?.();
  }

  dropLoot() {
    const table = ENEMY_DROPS[this.kind];
    if (!table) return;
    const rolls = 1 + (Math.random() < 0.25 ? 1 : 0);
    for (let i = 0; i < rolls; i++) {
      if (Math.random() < 0.7) {
        const id = Math.random() < 0.75 ? pickWeighted(table) : pickWeighted(LOOT_TABLES[Math.min(3, this.floor)]);
        this.game.spawnLoot(this.area, id, 1, this.pos.clone().setY(this.pos.y + 0.8));
      }
    }
  }

  ai() {}

  update(dt) {
    this.t += dt;
    if (this.dead) {
      this.deathT += dt;
      const k = Math.max(0, 1 - this.deathT / 0.5);
      this.body.scale.setScalar(Math.max(0.001, k));
      this.body.position.y = (1 - k) * 0.3;
      if (this.deathT > 0.55) {
        this.area.scene.remove(this.group);
        this.removed = true;
      }
      return;
    }
    if (this.active) this.ai(dt);
    this.contactCd -= dt;

    this.pos.x += (this.vel.x + this.knockV.x) * dt;
    this.pos.z += (this.vel.z + this.knockV.z) * dt;
    this.knockV.multiplyScalar(Math.exp(-dt * 7));
    this.area.collision.resolve(this.pos, this.radius);
    if (!this.flying && !this.airborne) this.pos.y = this.area.groundHeight(this.pos.x, this.pos.z);

    // contact damage
    if (this.contactDmg && this.active && this.contactCd <= 0) {
      const d = this.toPlayer();
      if (d.length() < this.radius + this.player.radius + 0.1 && this.player.pos.y < this.pos.y + this.height) {
        if (this.player.damage(this.contactDmg, this.pos)) this.contactCd = 0.8;
      }
    }

    // hit flash
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 6);
      for (const m of this.flashMats) {
        m.emissive.copy(m.userData.baseEmissive).lerp(new THREE.Color(1, 1, 1), this.flash);
        m.emissiveIntensity = m.userData.baseIntensity + this.flash * 2;
      }
    }

    this.group.position.copy(this.pos);
    // hp bar
    if (this.hp < this.maxHp && !this.isBoss) {
      this.bar.visible = true;
      this.bar.userData.fill.scale.x = Math.max(0.001, this.hp / this.maxHp);
      this.bar.quaternion.copy(this.game.engine.camera.quaternion);
    }
  }

  faceYaw(dir, dt, speed = 8) {
    const target = Math.atan2(dir.x, dir.z);
    let diff = target - this.body.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.body.rotation.y += diff * Math.min(1, dt * speed);
  }

  dispose() {
    this.area.scene.remove(this.group);
  }
}

// ------------------------------------------------------------------ Slime

export class Slime extends Enemy {
  constructor(area, pos, o = {}) {
    const big = o.big ?? false;
    super(area, pos, { kind: 'slime', hp: big ? 70 : 30, dmg: big ? 14 : 9, radius: big ? 0.75 : 0.5, height: big ? 1.2 : 0.8, ...o });
    this.big = big;
    const s = big ? 1.5 : 1;
    const hue = o.hue ?? (Math.random() < 0.8 ? 0.33 : 0.52);
    const col = new THREE.Color().setHSL(hue, 0.75, 0.5);
    this.hitColor = [col.r * 3, col.g * 3, col.b * 3];
    const m = this.registerFlash(
      new THREE.MeshStandardMaterial({
        color: col,
        emissive: col.clone().multiplyScalar(0.35),
        emissiveIntensity: 1,
        roughness: 0.15,
        metalness: 0,
        transparent: true,
        opacity: 0.88,
      }),
    );
    const geo = new THREE.SphereGeometry(0.55 * s, 28, 20);
    geo.translate(0, 0.5 * s, 0);
    const blob = new THREE.Mesh(geo, m);
    blob.castShadow = true;
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.2 * s, 16, 12),
      new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2) }),
    );
    core.position.y = 0.45 * s;
    const eyeMat = mat(0x10141a, { roughness: 0.2 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.17, 0.17].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.075 * s, 12, 10), eyeMat);
      e.position.set(x * s, 0.7 * s, 0.45 * s);
      e.scale.set(1, 1.3, 0.6);
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.025 * s, 8, 6), whiteMat);
      w.position.set(0.02, 0.03, 0.05);
      e.add(w);
      this.body.add(e);
    });
    this.body.add(blob, core);
    this.blob = blob;
    this.jumpCd = 0.6 + Math.random();
    this.airborne = false;
    this.vy = 0;
    this.squash = 0;
    this.contactDmg = this.dmg;
  }

  ai(dt) {
    const d = this.toPlayer();
    const dist = d.length();
    d.normalize();
    this.faceYaw(d, dt);
    if (!this.airborne) {
      this.vel.multiplyScalar(Math.exp(-dt * 10));
      this.jumpCd -= dt;
      if (this.jumpCd <= 0) {
        this.airborne = true;
        this.vy = 5.5;
        const sp = Math.min(5, dist * 1.4) * (this.big ? 0.8 : 1);
        this.vel.set(d.x * sp, 0, d.z * sp);
        this.jumpCd = 0.9 + Math.random() * 0.7;
        this.squash = -0.6;
        if (dist < 12) this.game.audio.play('slime');
      }
    } else {
      this.vy -= 18 * dt;
      this.pos.y += this.vy * dt;
      const g = this.area.groundHeight(this.pos.x, this.pos.z);
      if (this.pos.y <= g) {
        this.pos.y = g;
        this.airborne = false;
        this.squash = 0.8;
        this.area.dust.burst(this.pos.clone().setY(g + 0.1), 5, {
          color: [0.4, 0.5, 0.4],
          speed: 1.5,
          size: 0.3,
          life: 0.5,
          gravity: 0,
          grow: 0.5,
          alpha: 0.3,
        });
      }
    }
  }

  update(dt) {
    super.update(dt);
    if (this.dead) return;
    this.squash += (0 - this.squash) * Math.min(1, dt * 8);
    const wob = Math.sin(this.t * 6) * 0.04;
    const sq = this.squash + wob;
    this.blob.scale.set(1 + sq * 0.35, 1 - sq * 0.4, 1 + sq * 0.35);
  }

  onDeath() {
    if (this.big) {
      for (let i = 0; i < 2; i++) {
        const p = this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2));
        const s = new Slime(this.area, p, { floor: this.floor, mult: this.floorMult, room: this.room });
        s.active = true;
        s.jumpCd = 0.5;
        this.area.enemies.push(s);
      }
    }
  }
}

// ------------------------------------------------------------ Stone Warden

export class Golem extends Enemy {
  constructor(area, pos, o = {}) {
    super(area, pos, { kind: 'golem', hp: 115, dmg: 26, radius: 0.8, height: 2.3, heavy: 3, ...o });
    this.hitColor = [2.4, 2.0, 1.4];
    const stone = this.registerFlash(
      new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.85, emissive: 0x000000, emissiveIntensity: 1 }),
    );
    const moss = mat(0x4f7a38, { roughness: 1 });
    const runeCol = new THREE.Color(0x6ae0ff);
    const rune = new THREE.MeshBasicMaterial({ color: runeCol.clone().multiplyScalar(3) });
    this.runeMat = rune;

    const torso = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.2, 0.85, 3, 0.2), stone);
    torso.position.y = 1.35;
    const hips = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.5, 0.65, 3, 0.15), stone);
    hips.position.y = 0.75;
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.5, 0.55, 3, 0.15), stone);
    head.position.set(0, 2.15, 0.05);
    const eye = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.08, 0.05, 1, 0.02), rune);
    eye.position.set(0, 2.18, 0.33);
    const chest = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), rune);
    chest.position.set(0, 1.45, 0.43);
    const mossCap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), moss);
    mossCap.position.set(-0.2, 1.9, -0.05);
    mossCap.scale.set(1, 0.35, 0.8);
    this.body.add(torso, hips, head, eye, chest, mossCap);
    const arm = (x) => {
      const p = new THREE.Group();
      p.position.set(x, 1.75, 0);
      const a = new THREE.Mesh(new RoundedBoxGeometry(0.42, 1.1, 0.42, 3, 0.14), stone);
      a.position.y = -0.55;
      const fist = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.5, 0.55, 3, 0.16), stone);
      fist.position.y = -1.15;
      p.add(a, fist);
      this.body.add(p);
      return p;
    };
    this.armL = arm(-0.85);
    this.armR = arm(0.85);
    const leg = (x) => {
      const l = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.6, 0.42, 3, 0.12), stone);
      l.position.set(x, 0.3, 0);
      this.body.add(l);
      return l;
    };
    this.legL = leg(-0.28);
    this.legR = leg(0.28);
    this.body.traverse((c) => c.isMesh && ((c.castShadow = true), (c.receiveShadow = true)));

    this.ring = telegraphRing(3.2);
    area.scene.add(this.ring);
    this.state = 'walk';
    this.stateT = 0;
    this.cd = 1;
  }

  ai(dt) {
    const d = this.toPlayer();
    const dist = d.length();
    d.normalize();
    this.stateT += dt;
    this.cd -= dt;
    if (this.state === 'walk') {
      this.faceYaw(d, dt, 4);
      const sp = dist > 2.2 ? 1.9 : 0;
      this.vel.set(d.x * sp, 0, d.z * sp);
      const w = Math.sin(this.t * 5) * (sp > 0 ? 1 : 0);
      this.legL.position.z = w * 0.15;
      this.legR.position.z = -w * 0.15;
      this.armL.rotation.x = -w * 0.3;
      this.armR.rotation.x = w * 0.3;
      if (dist < 3.2 && this.cd <= 0) {
        this.state = 'wind';
        this.stateT = 0;
        this.vel.set(0, 0, 0);
      }
    } else if (this.state === 'wind') {
      const k = Math.min(1, this.stateT / 0.9);
      this.armL.rotation.x = this.armR.rotation.x = -k * 2.8;
      this.body.position.y = k * 0.15;
      this.ring.position.set(this.pos.x, this.pos.y + 0.04, this.pos.z);
      this.ring.material.opacity = 0.5 + k * 0.5;
      this.ring.userData.fill.material.opacity = k * 0.35;
      this.ring.scale.setScalar(0.3 + k * 0.7);
      this.runeMat.color.setRGB(3 + k * 3, 0.8, 0.6);
      if (this.stateT >= 0.9) {
        this.state = 'slam';
        this.stateT = 0;
        this.game.audio.play('slam');
        this.player.addShake(0.5);
        this.area.dust.burst(this.pos.clone().setY(this.pos.y + 0.1), 30, {
          color: [0.5, 0.45, 0.4],
          speed: 6,
          size: 0.6,
          life: 0.9,
          gravity: -0.3,
          grow: 1,
          alpha: 0.45,
          drag: 3,
        });
        if (dist < 3.3) this.player.damage(this.dmg, this.pos);
      }
    } else if (this.state === 'slam') {
      const k = Math.min(1, this.stateT / 0.15);
      this.armL.rotation.x = this.armR.rotation.x = -2.8 + k * 2.4;
      this.body.position.y = 0.15 - k * 0.15;
      this.ring.material.opacity *= 0.8;
      this.ring.userData.fill.material.opacity *= 0.8;
      if (this.stateT > 0.8) {
        this.state = 'walk';
        this.cd = 1.6;
        this.runeMat.color.setRGB(0.4 * 3, 0.88 * 3, 3);
      }
    }
  }

  onHurt() {
    if (this.state !== 'wind') this.cd = Math.max(this.cd, 0.2);
  }

  die() {
    super.die();
    this.area.scene.remove(this.ring);
  }

  dispose() {
    super.dispose();
    this.area.scene.remove(this.ring);
  }
}

// -------------------------------------------------------------------- Wisp

export class Wisp extends Enemy {
  constructor(area, pos, o = {}) {
    super(area, pos, { kind: 'wisp', hp: 34, dmg: 12, radius: 0.45, height: 2.0, ...o });
    this.flying = true;
    const hue = o.hue ?? 0.78;
    const col = new THREE.Color().setHSL(hue, 0.8, 0.6);
    this.col = col;
    this.hitColor = [col.r * 3, col.g * 3, col.b * 3];
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: col, emissiveIntensity: 3 });
    this.registerFlash(coreMat);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), coreMat);
    core.position.y = 1.7;
    const halo = glowSprite(col.clone().multiplyScalar(2.5), 2.2);
    halo.position.y = 1.7;
    this.body.add(core, halo);
    // orbiting motes
    this.motes = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(3) }));
      this.body.add(m);
      this.motes.push(m);
    }
    // tail
    const tailMat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.5), transparent: true, opacity: 0.5 });
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 16, 1, true), tailMat);
    tail.position.y = 1.2;
    tail.rotation.x = Math.PI;
    this.body.add(tail);
    this.core = core;
    this.shootCd = 1.5 + Math.random();
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.spread = this.floor >= 3 ? 3 : 1;
  }

  ai(dt) {
    const d = this.toPlayer();
    const dist = d.length();
    d.normalize();
    const side = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(this.strafe);
    let want = 0;
    if (dist > 8) want = 1;
    else if (dist < 5) want = -1;
    const v = d.clone().multiplyScalar(want * 2.6).addScaledVector(side, 1.6);
    this.vel.lerp(v, Math.min(1, dt * 2));
    if (Math.random() < dt * 0.3) this.strafe *= -1;
    this.shootCd -= dt;
    if (this.shootCd <= 0 && dist < 16) {
      this.shootCd = 2.1 + Math.random() * 0.8;
      this.shoot();
    }
  }

  shoot() {
    const origin = this.pos.clone().setY(this.pos.y + 1.7);
    const target = this.player.pos.clone().setY(this.player.pos.y + 1.2);
    const base = target.sub(origin).normalize();
    const n = this.spread;
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.22;
      const dir = base.clone().applyAxisAngle(up, a);
      this.area.projectiles.push(
        new Projectile(this.area, {
          pos: origin,
          vel: dir.multiplyScalar(7.5),
          radius: 0.2,
          dmg: this.dmg,
          owner: 'enemy',
          color: [this.col.r * 3, this.col.g * 3, this.col.b * 3],
          life: 4,
        }),
      );
    }
    this.game.audio.play('shoot');
  }

  update(dt) {
    super.update(dt);
    if (this.dead) return;
    const bob = Math.sin(this.t * 2.2) * 0.2;
    this.body.position.y = bob;
    this.motes.forEach((m, i) => {
      const a = this.t * 3 + (i * Math.PI) / 2;
      m.position.set(Math.cos(a) * 0.55, 1.7 + Math.sin(a * 1.3) * 0.2, Math.sin(a) * 0.55);
    });
    if (Math.random() < dt * 20)
      this.area.sparks.emit({
        x: this.pos.x + (Math.random() - 0.5) * 0.3,
        y: this.pos.y + 1.5 + bob,
        z: this.pos.z + (Math.random() - 0.5) * 0.3,
        vy: -0.6,
        color: [this.col.r * 1.5, this.col.g * 1.5, this.col.b * 1.5],
        size: 0.12,
        life: 0.7,
        grow: -0.1,
      });
  }
}

// ----------------------------------------------------------------- Rootling

export class Rootling extends Enemy {
  constructor(area, pos, o = {}) {
    super(area, pos, { kind: 'rootling', hp: 48, dmg: 10, radius: 0.6, height: 1.5, heavy: 100, ...o });
    this.hitColor = [1.5, 2.5, 0.8];
    const bulbMat = this.registerFlash(new THREE.MeshStandardMaterial({ color: 0x6aa84a, roughness: 0.6, emissive: 0x000000, emissiveIntensity: 1 }));
    const petalMat = mat(0x3f7a2e, { roughness: 0.7, side: THREE.DoubleSide });
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * 0.5 + 0.05, t * 1.2));
    }
    const bulb = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), bulbMat);
    const mouth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.2, 16),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 1.2, 0.3) }),
    );
    mouth.position.y = 1.2;
    this.mouth = mouth;
    this.body.add(bulb, mouth);
    for (let i = 0; i < 6; i++) {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI), petalMat);
      const a = (i / 6) * Math.PI * 2;
      petal.position.set(Math.cos(a) * 0.5, 0.15, Math.sin(a) * 0.5);
      petal.scale.set(0.6, 0.2, 1.3);
      petal.rotation.y = -a + Math.PI / 2;
      petal.rotation.x = -0.3;
      this.body.add(petal);
    }
    this.body.traverse((c) => c.isMesh && (c.castShadow = true));
    this.shootCd = 1.2 + Math.random();
    this.rise = 0;
  }

  ai(dt) {
    const d = this.toPlayer();
    const dist = d.length();
    d.normalize();
    this.rise = Math.min(1, this.rise + dt * 2);
    this.faceYaw(d, dt, 3);
    this.shootCd -= dt;
    const charge = Math.max(0, 1 - this.shootCd / 0.6);
    this.body.scale.set(1 + charge * 0.15, this.rise * (1 - charge * 0.1), 1 + charge * 0.15);
    if (this.shootCd <= 0 && dist < 18) {
      this.shootCd = 2.2 + Math.random() * 0.6;
      const origin = this.pos.clone().setY(this.pos.y + 1.25);
      const base = this.player.pos.clone().setY(this.player.pos.y + 1.0).sub(origin).normalize();
      for (let i = -1; i <= 1; i++) {
        this.area.projectiles.push(
          new Projectile(this.area, {
            pos: origin,
            vel: base.clone().applyAxisAngle(up, i * 0.28).multiplyScalar(8),
            radius: 0.17,
            dmg: this.dmg,
            owner: 'enemy',
            color: [2.4, 1.6, 0.3],
            life: 3,
          }),
        );
      }
      this.game.audio.play('shoot');
    }
  }

  update(dt) {
    super.update(dt);
    if (!this.active && !this.dead) this.body.scale.set(1, 0.05, 1);
  }
}

// -------------------------------------------------------- Breakable props

export class Breakable {
  constructor(area, pos, mesh, o = {}) {
    this.area = area;
    this.game = area.game;
    this.pos = pos.clone();
    this.radius = o.radius ?? 0.45;
    this.height = o.height ?? 0.9;
    this.hp = 1;
    this.dead = false;
    this.mesh = mesh;
    this.floor = o.floor ?? 1;
    mesh.position.copy(pos);
    area.scene.add(mesh);
    this.collider = area.collision.addCircle(pos.x, pos.z, this.radius * 0.8);
  }

  hurt() {
    if (this.dead) return;
    this.dead = true;
    this.area.scene.remove(this.mesh);
    this.collider.active = false;
    this.game.audio.play('hit');
    this.area.dust.burst(this.pos.clone().setY(0.5), 14, {
      color: [0.6, 0.4, 0.25],
      speed: 3,
      size: 0.3,
      life: 0.7,
      gravity: 5,
      alpha: 0.6,
    });
    this.area.sparks.burst(this.pos.clone().setY(0.5), 8, { color: [1.6, 1.0, 0.5], speed: 4, size: 0.05, life: 0.4 });
    const r = Math.random();
    if (r < 0.45) {
      const g = 4 + Math.floor(Math.random() * 10 * this.floor);
      this.game.addGold(g, this.pos.clone().setY(1.0));
    } else if (r < 0.6) {
      this.game.spawnLoot(this.area, pickWeighted(LOOT_TABLES[this.floor]), 1, this.pos.clone().setY(0.8));
    }
  }

  update() {}
}

// ----------------------------------------------------------- Colossus boss

export class Colossus extends Enemy {
  constructor(area, pos, o = {}) {
    super(area, pos, { kind: 'boss', hp: 1500, dmg: 30, radius: 1.9, height: 5.2, heavy: 20, ...o });
    this.isBoss = true;
    this.name = 'The Hollow Colossus';
    this.hitColor = [3, 1.6, 0.8];
    const stone = this.registerFlash(new THREE.MeshStandardMaterial({ color: 0x6f6a78, roughness: 0.8, emissive: 0, emissiveIntensity: 1 }));
    const dark = mat(0x3a3642, { roughness: 0.9 });
    const gold = mat(0xe0a93a, { metalness: 0.9, roughness: 0.3 });
    this.coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.2, 2.2) });
    const S = 2.3;
    const torso = new THREE.Mesh(new RoundedBoxGeometry(1.4 * S, 1.3 * S, 0.95 * S, 4, 0.25 * S), stone);
    torso.position.y = 1.6 * S;
    const belly = new THREE.Mesh(new RoundedBoxGeometry(1.0 * S, 0.6 * S, 0.75 * S, 3, 0.15 * S), dark);
    belly.position.y = 0.85 * S;
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.7 * S, 0.6 * S, 0.65 * S, 3, 0.18 * S), stone);
    head.position.set(0, 2.55 * S, 0.1 * S);
    const eyes = new THREE.Mesh(new RoundedBoxGeometry(0.45 * S, 0.08 * S, 0.05 * S, 1, 0.02 * S), this.coreMat);
    eyes.position.set(0, 2.58 * S, 0.44 * S);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 * S, 1), this.coreMat);
    core.position.set(0, 1.65 * S, 0.48 * S);
    const coreGlow = glowSprite(new THREE.Color(1.6, 0.4, 0.9), 1.1 * S);
    coreGlow.position.copy(core.position);
    this.coreGlow = coreGlow;
    // crown
    const crown = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07 * S, 0.3 * S, 6), gold);
      spike.position.set(Math.cos(a) * 0.28 * S, 0.15 * S, Math.sin(a) * 0.28 * S);
      crown.add(spike);
    }
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.3 * S, 0.04 * S, 8, 24), gold);
    band.rotation.x = Math.PI / 2;
    crown.add(band);
    crown.position.set(0, 2.9 * S, 0.1 * S);
    this.body.add(torso, belly, head, eyes, core, coreGlow, crown);
    const arm = (x) => {
      const p = new THREE.Group();
      p.position.set(x * S, 2.05 * S, 0);
      const up = new THREE.Mesh(new RoundedBoxGeometry(0.45 * S, 1.0 * S, 0.45 * S, 3, 0.15 * S), stone);
      up.position.y = -0.5 * S;
      const fist = new THREE.Mesh(new RoundedBoxGeometry(0.7 * S, 0.65 * S, 0.7 * S, 3, 0.2 * S), stone);
      fist.position.y = -1.2 * S;
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.28 * S, 0.05 * S, 8, 20), gold);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.85 * S;
      p.add(up, fist, cuff);
      this.body.add(p);
      return p;
    };
    this.armL = arm(-0.98);
    this.armR = arm(0.98);
    const leg = (x) => {
      const l = new THREE.Mesh(new RoundedBoxGeometry(0.5 * S, 0.7 * S, 0.55 * S, 3, 0.15 * S), stone);
      l.position.set(x * S, 0.35 * S, 0);
      this.body.add(l);
      return l;
    };
    this.legL = leg(-0.35);
    this.legR = leg(0.35);
    this.body.traverse((c) => c.isMesh && ((c.castShadow = true), (c.receiveShadow = true)));

    this.ring = telegraphRing(4.5);
    area.scene.add(this.ring);
    // shockwave
    this.wave = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.12, 8, 96),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 1.0, 2.0), transparent: true, opacity: 0.9 }),
    );
    this.wave.rotation.x = Math.PI / 2;
    this.wave.visible = false;
    area.scene.add(this.wave);
    this.waveR = 0;
    this.waveHit = false;

    this.state = 'idle';
    this.stateT = 0;
    this.pattern = 0;
    this.phase2 = false;
    this.summoned = false;
    this.chargeDir = new THREE.Vector3();
    this.stunned = 0;
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
  }

  ai(dt) {
    const d = this.toPlayer();
    const dist = d.length();
    d.normalize();
    this.stateT += dt;
    const spd = this.phase2 ? 1.3 : 1;
    if (!this.phase2 && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      this.game.ui.toast('The Colossus is enraged!', 'Its core burns brighter…');
      this.coreMat.color.setRGB(6, 1.2, 0.8);
      if (!this.summoned) {
        this.summoned = true;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const p = this.pos.clone().add(new THREE.Vector3(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5));
          const s = new Slime(this.area, p, { floor: 3, mult: this.floorMult ?? 1.6, room: this.room, hue: 0.9 });
          s.active = true;
          this.area.enemies.push(s);
        }
      }
    }

    switch (this.state) {
      case 'idle': {
        this.faceYaw(d, dt, 3);
        const sp = dist > 5 ? 2.2 * spd : 0;
        this.vel.set(d.x * sp, 0, d.z * sp);
        const w = Math.sin(this.t * 4) * (sp > 0 ? 1 : 0);
        this.legL.position.z = w * 0.3;
        this.legR.position.z = -w * 0.3;
        if (this.stateT > 1.4 / spd) {
          const seq = ['slam', 'volley', 'charge', 'volley', 'slam', 'charge'];
          this.setState(seq[this.pattern++ % seq.length] + 'Wind');
          this.vel.set(0, 0, 0);
        }
        break;
      }
      case 'slamWind': {
        const k = Math.min(1, this.stateT / (1.1 / spd));
        this.armL.rotation.x = this.armR.rotation.x = -k * 3.0;
        this.ring.position.set(this.pos.x, this.pos.y + 0.05, this.pos.z);
        this.ring.material.opacity = 0.4 + k * 0.6;
        this.ring.userData.fill.material.opacity = k * 0.3;
        this.ring.scale.setScalar(0.4 + k * 0.6);
        if (k >= 1) {
          this.setState('slam');
          this.game.audio.play('slam');
          this.player.addShake(0.9);
          this.ring.material.opacity = 0;
          this.ring.userData.fill.material.opacity = 0;
          if (dist < 4.5 + this.player.radius) this.player.damage(this.dmg * 1.2, this.pos);
          this.wave.visible = true;
          this.waveR = 1;
          this.waveHit = false;
          this.area.dust.burst(this.pos.clone().setY(0.3), 50, {
            color: [0.5, 0.45, 0.5],
            speed: 9,
            size: 0.9,
            life: 1.2,
            gravity: -0.2,
            grow: 1.4,
            alpha: 0.4,
            drag: 2.5,
          });
        }
        break;
      }
      case 'slam': {
        const k = Math.min(1, this.stateT / 0.2);
        this.armL.rotation.x = this.armR.rotation.x = -3.0 + k * 2.8;
        if (this.stateT > 1.0) this.setState('idle');
        break;
      }
      case 'volleyWind': {
        this.faceYaw(d, dt, 5);
        const k = Math.min(1, this.stateT / 0.7);
        this.coreGlow.scale.setScalar(2.5 * (1 + k * 0.8));
        if (k >= 1) {
          this.setState('volley');
          this.volleyCount = 0;
          this.volleyT = 0;
        }
        break;
      }
      case 'volley': {
        this.faceYaw(d, dt, 5);
        this.volleyT -= dt;
        const waves = this.phase2 ? 4 : 3;
        if (this.volleyT <= 0 && this.volleyCount < waves) {
          this.volleyT = 0.42 / spd;
          this.volleyCount++;
          const origin = this.pos.clone().setY(this.pos.y + 3.8);
          const target = this.player.pos.clone().setY(this.player.pos.y + 1.0);
          const base = target.sub(origin).normalize();
          const n = this.phase2 ? 9 : 7;
          const off = this.volleyCount % 2 ? 0.09 : 0;
          for (let i = 0; i < n; i++) {
            const a = (i - (n - 1) / 2) * 0.18 + off;
            this.area.projectiles.push(
              new Projectile(this.area, {
                pos: origin,
                vel: base.clone().applyAxisAngle(up, a).multiplyScalar(9),
                radius: 0.28,
                dmg: Math.round(this.dmg * 0.6),
                owner: 'enemy',
                color: [3.5, 1.0, 2.2],
                life: 5,
              }),
            );
          }
          this.game.audio.play('shoot');
        }
        if (this.volleyCount >= waves && this.volleyT <= 0) {
          this.coreGlow.scale.setScalar(2.5);
          this.setState('idle');
        }
        break;
      }
      case 'chargeWind': {
        this.faceYaw(d, dt, 6);
        this.chargeDir.copy(d);
        const k = Math.min(1, this.stateT / (0.9 / spd));
        this.body.rotation.x = k * 0.25;
        this.armL.rotation.x = this.armR.rotation.x = k * 0.8;
        if (k >= 1) {
          this.setState('charge');
          this.game.audio.play('heavySwing');
        }
        break;
      }
      case 'charge': {
        const sp = 15 * spd;
        this.vel.copy(this.chargeDir).multiplyScalar(sp);
        if (Math.random() < 0.8)
          this.area.dust.emit({
            x: this.pos.x,
            y: 0.2,
            z: this.pos.z,
            vy: 0.5,
            color: [0.5, 0.45, 0.45],
            size: 1.2,
            grow: 1,
            life: 0.8,
            alpha: 0.35,
          });
        if (dist < this.radius + 0.6) this.player.damage(this.dmg * 1.1, this.pos);
        // wall hit -> stun
        const probe = this.pos.clone().addScaledVector(this.chargeDir, this.radius + 0.4);
        if (this.area.collision.pointBlocked(probe.x, probe.z) || this.stateT > 1.3) {
          const hitWall = this.stateT <= 1.3;
          this.vel.set(0, 0, 0);
          this.body.rotation.x = 0;
          this.armL.rotation.x = this.armR.rotation.x = 0;
          if (hitWall) {
            this.game.audio.play('slam');
            this.player.addShake(0.7);
            this.stunned = 2.0;
            this.setState('stunned');
            this.game.ui.toast('', 'The Colossus is stunned — strike now!');
          } else this.setState('idle');
        }
        break;
      }
      case 'stunned': {
        this.stunned -= dt;
        this.body.rotation.z = Math.sin(this.t * 10) * 0.05;
        if (Math.random() < dt * 8)
          this.area.sparks.emit({
            x: this.pos.x + (Math.random() - 0.5) * 2,
            y: this.pos.y + 6 + Math.random(),
            z: this.pos.z + (Math.random() - 0.5) * 2,
            vy: 0.5,
            color: [3, 3, 1],
            size: 0.15,
            life: 0.5,
          });
        if (this.stunned <= 0) {
          this.body.rotation.z = 0;
          this.setState('idle');
        }
        break;
      }
    }
  }

  hurt(dmg, dir, knock, crit) {
    if (this.state === 'stunned') dmg = Math.round(dmg * 1.5);
    super.hurt(dmg, dir, knock, crit);
    this.game.ui.updateBoss(this);
  }

  update(dt) {
    super.update(dt);
    // shockwave expansion
    if (this.wave.visible) {
      this.waveR += dt * 10;
      this.wave.position.set(this.pos.x, 0.25, this.pos.z);
      this.wave.scale.setScalar(this.waveR);
      this.wave.material.opacity = Math.max(0, 1 - this.waveR / 18);
      const p = this.player;
      const pd = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (!this.waveHit && Math.abs(pd - this.waveR) < 0.5) {
        if (p.damage(Math.round(this.dmg * 0.8), this.pos)) this.waveHit = true;
      }
      if (this.waveR > 18) this.wave.visible = false;
    }
    if (!this.dead) {
      const pulse = 1 + Math.sin(this.t * (this.phase2 ? 8 : 4)) * 0.15;
      if (this.state !== 'volleyWind' && this.state !== 'volley') this.coreGlow.scale.setScalar(2.5 * pulse);
    }
  }

  die() {
    super.die();
    this.area.scene.remove(this.ring);
    this.wave.visible = false;
    this.game.onBossDefeated(this);
  }

  dropLoot() {
    const p = this.pos.clone().setY(1.5);
    this.game.spawnLoot(this.area, 'heart', 1, p);
    this.game.spawnLoot(this.area, 'crown', 1, p);
    if (Math.random() < 0.6) this.game.spawnLoot(this.area, 'pearl', 1, p);
    for (let i = 0; i < 3; i++) this.game.spawnLoot(this.area, pickWeighted(LOOT_TABLES[3]), 1, p);
  }

  dispose() {
    super.dispose();
    this.area.scene.remove(this.ring, this.wave);
  }
}
