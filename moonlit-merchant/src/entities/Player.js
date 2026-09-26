import * as THREE from 'three';
import { ARMOR } from '../game/Items.js';

const WALK = 5.2;
const ROLL_SPEED = 13;
const ROLL_TIME = 0.34;

export class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.radius = 0.38;
    this.eye = 1.62;
    this.hp = 100;
    this.rollTime = 0;
    this.rollCd = 0;
    this.rollDir = new THREE.Vector3();
    this.invuln = 0;
    this.bob = 0;
    this.bobAmt = 0;
    this.tilt = 0;
    this.shake = 0;
    this.hurtFx = 0;
    this.groundY = 0;
    this.sensitivity = 0.0022;
    this.fov = 75;
    this.dead = false;
    this.blocking = false;
    this.slowMul = 1;
    this.forward = new THREE.Vector3();
    this.lastSafe = new THREE.Vector3();
  }

  get maxHp() {
    return 100 + ARMOR[this.game.state.armor].hp;
  }

  place(pos, yaw = 0) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.groundY = this.game.area?.groundHeight(pos.x, pos.z) ?? 0;
    this.pos.y = this.groundY;
  }

  update(dt) {
    const game = this.game;
    const input = game.input;
    const cam = game.engine.camera;
    const canControl = game.canControl();

    if (canControl) {
      this.yaw -= input.mouse.dx * this.sensitivity;
      this.pitch -= input.mouse.dy * this.sensitivity;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    }

    // desired movement
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    if (canControl && !this.dead) {
      if (input.down('KeyW') || input.down('ArrowUp')) wish.add(f);
      if (input.down('KeyS') || input.down('ArrowDown')) wish.sub(f);
      if (input.down('KeyD')) wish.add(r);
      if (input.down('KeyA')) wish.sub(r);
    }
    if (wish.lengthSq() > 0) wish.normalize();

    this.rollCd -= dt;
    this.invuln -= dt;
    this.hurtFx = Math.max(0, this.hurtFx - dt * 2.2);
    if (
      canControl &&
      !this.dead &&
      game.area?.combat &&
      input.hit('Space') &&
      this.rollCd <= 0 &&
      this.rollTime <= 0
    ) {
      this.rollDir.copy(wish.lengthSq() > 0 ? wish : f);
      this.rollTime = ROLL_TIME;
      this.rollCd = ROLL_TIME + 0.35;
      this.invuln = Math.max(this.invuln, ROLL_TIME + 0.05);
      game.audio.play('roll');
      game.weapons?.cancel();
    }

    if (this.rollTime > 0) {
      this.rollTime -= dt;
      const k = Math.max(0, this.rollTime / ROLL_TIME);
      this.vel.copy(this.rollDir).multiplyScalar(ROLL_SPEED * (0.45 + 0.55 * k));
      // dust trail
      if (Math.random() < 0.6)
        game.area.dust.emit({
          x: this.pos.x + (Math.random() - 0.5) * 0.4,
          y: this.groundY + 0.1,
          z: this.pos.z + (Math.random() - 0.5) * 0.4,
          vy: 0.4,
          color: [0.55, 0.5, 0.45],
          size: 0.35,
          grow: 0.8,
          life: 0.7,
          alpha: 0.35,
          drag: 2,
        });
    } else {
      const speed = WALK * this.slowMul * (this.blocking ? 0.45 : 1) * (game.weapons?.moveMul() ?? 1);
      const target = wish.multiplyScalar(speed);
      const accel = 1 - Math.exp(-dt * 14);
      this.vel.x += (target.x - this.vel.x) * accel;
      this.vel.z += (target.z - this.vel.z) * accel;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    game.area.collision.resolve(this.pos, this.radius);
    this.groundY += (game.area.groundHeight(this.pos.x, this.pos.z) - this.groundY) * Math.min(1, dt * 18);
    this.pos.y = this.groundY;

    // camera feel
    const hs = Math.hypot(this.vel.x, this.vel.z);
    const moving = Math.min(1, hs / WALK);
    this.bobAmt += (moving - this.bobAmt) * Math.min(1, dt * 8);
    this.bob += dt * hs * 1.9;
    const rollDip = this.rollTime > 0 ? Math.sin((1 - this.rollTime / ROLL_TIME) * Math.PI) : 0;
    const strafe = this.vel.dot(r) / WALK;
    this.tilt += (-strafe * 0.025 - (this.rollTime > 0 ? this.rollDir.dot(r) * 0.12 : 0) - this.tilt) * Math.min(1, dt * 8);
    this.shake = Math.max(0, this.shake - dt * 3);
    const sh = this.shake * this.shake;

    cam.position.set(
      this.pos.x + (Math.random() - 0.5) * sh * 0.25,
      this.pos.y + this.eye + Math.sin(this.bob * 2) * 0.045 * this.bobAmt - rollDip * 0.55 + (Math.random() - 0.5) * sh * 0.25,
      this.pos.z + (Math.random() - 0.5) * sh * 0.25,
    );
    cam.rotation.set(this.pitch - rollDip * 0.12, this.yaw, this.tilt);
    const targetFov = this.fov + (this.rollTime > 0 ? 8 : 0) + (game.weapons?.fovOffset() ?? 0);
    cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 10);
    cam.updateProjectionMatrix();
    cam.getWorldDirection(this.forward);
  }

  addShake(a) {
    this.shake = Math.min(1.2, this.shake + a);
  }

  heal(n) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    return this.hp - before;
  }

  // Returns true if damage was applied.
  damage(amount, from) {
    if (this.dead || this.invuln > 0 || this.game.godMode) return false;
    let dmg = amount;
    // blocking with a shield/greatsword reduces frontal damage
    if (this.blocking && from) {
      const toSrc = new THREE.Vector3().subVectors(from, this.pos).setY(0).normalize();
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      if (toSrc.dot(fwd) > 0.3) {
        dmg *= 0.2;
        this.game.audio.play('block');
        this.game.area.sparks.burst(
          this.pos.clone().add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(fwd, 0.8),
          14,
          { color: [3, 2.2, 1], speed: 4, size: 0.06, life: 0.35 },
        );
      }
    }
    dmg *= 1 - ARMOR[this.game.state.armor].reduce;
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg;
    this.invuln = 0.55;
    this.hurtFx = 1;
    this.addShake(0.6);
    this.game.audio.play('hurt');
    if (from) {
      const push = new THREE.Vector3().subVectors(this.pos, from).setY(0).normalize().multiplyScalar(6);
      this.vel.add(push);
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.game.onPlayerDeath();
    }
    return true;
  }
}
