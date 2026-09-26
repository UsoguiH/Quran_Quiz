import * as THREE from 'three';
import { glowTexture } from '../render/Textures.js';

const _v = new THREE.Vector3();

// Generic projectile used by both the player's arrows and enemy magic.
export class Projectile {
  constructor(area, o) {
    this.area = area;
    this.pos = o.pos.clone();
    this.vel = o.vel.clone();
    this.radius = o.radius ?? 0.25;
    this.dmg = o.dmg ?? 10;
    this.owner = o.owner ?? 'enemy';
    this.life = o.life ?? 4;
    this.gravity = o.gravity ?? 0;
    this.color = o.color ?? [3, 1.2, 2.5];
    this.crit = o.crit ?? false;
    this.knock = o.knock ?? 4;
    this.dead = false;
    this.stuck = 0;
    this.pierce = o.pierce ?? 0;
    this.hitSet = new Set();

    if (o.mesh) {
      this.mesh = o.mesh;
    } else {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(this.radius * 0.7, 12, 10),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(...this.color) }),
      );
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture(),
          color: new THREE.Color(...this.color).multiplyScalar(0.6),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        }),
      );
      glow.scale.setScalar(this.radius * 5);
      g.add(core, glow);
      this.mesh = g;
    }
    this.mesh.position.copy(this.pos);
    area.scene.add(this.mesh);
  }

  update(dt, game) {
    if (this.stuck > 0) {
      this.stuck -= dt;
      if (this.stuck <= 0) this.kill();
      return;
    }
    this.life -= dt;
    if (this.life <= 0) return this.kill();
    this.vel.y -= this.gravity * dt;
    this.pos.addScaledVector(this.vel, dt);
    this.mesh.position.copy(this.pos);
    if (this.owner === 'player') {
      _v.copy(this.pos).add(this.vel);
      this.mesh.lookAt(_v);
    }
    // trail
    if (Math.random() < 0.7)
      this.area.sparks.emit({
        x: this.pos.x,
        y: this.pos.y,
        z: this.pos.z,
        color: this.color.map((c) => c * 0.5),
        size: this.radius * 0.9,
        life: 0.25,
        grow: -0.2,
      });

    const ground = this.area.groundHeight(this.pos.x, this.pos.z);
    if (this.area.collision.pointBlocked(this.pos.x, this.pos.z, 0.02) || this.pos.y < ground + 0.05) {
      this.area.sparks.burst(this.pos, 10, { color: this.color, speed: 3, size: 0.07, life: 0.3 });
      if (this.owner === 'player') {
        this.stuck = 1.5;
        return;
      }
      return this.kill();
    }

    if (this.owner === 'player') {
      for (const e of this.area.targets()) {
        if (e.dead || this.hitSet.has(e)) continue;
        const dx = e.pos.x - this.pos.x;
        const dz = e.pos.z - this.pos.z;
        const dy = this.pos.y - e.pos.y;
        const rr = e.radius + this.radius;
        if (dx * dx + dz * dz < rr * rr && dy > -0.3 && dy < (e.height ?? 1.8) + 0.3) {
          this.hitSet.add(e);
          e.hurt(this.dmg, this.vel.clone().setY(0).normalize(), this.knock, this.crit);
          game.onHitEnemy(e, this.crit);
          if (this.pierce-- <= 0) return this.kill();
        }
      }
    } else {
      const p = game.player;
      const dx = p.pos.x - this.pos.x;
      const dz = p.pos.z - this.pos.z;
      const dy = this.pos.y - p.pos.y;
      const rr = p.radius + this.radius;
      if (dx * dx + dz * dz < rr * rr && dy > 0 && dy < 2.0) {
        p.damage(this.dmg, this.pos.clone().sub(this.vel.clone().setLength(1)));
        this.area.sparks.burst(this.pos, 14, { color: this.color, speed: 4, size: 0.08, life: 0.4 });
        return this.kill();
      }
    }
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.area.scene.remove(this.mesh);
  }
}

export function makeArrowMesh(color = [1, 0.9, 0.7], glowy = false) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.7 }),
  );
  shaft.rotation.x = Math.PI / 2;
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.14, 8),
    glowy
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...color).multiplyScalar(3) })
      : new THREE.MeshStandardMaterial({ color: 0xd0d4dc, metalness: 0.8, roughness: 0.3 }),
  );
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 0.45;
  const fl = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.005, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0, side: THREE.DoubleSide }),
  );
  fl.position.z = -0.35;
  const fl2 = fl.clone();
  fl2.rotation.z = Math.PI / 2;
  g.add(shaft, tip, fl, fl2);
  return g;
}
