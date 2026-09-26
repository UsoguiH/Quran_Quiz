import * as THREE from 'three';
import { CollisionWorld } from './Collision.js';
import { Particles } from '../render/Particles.js';

// Base class for a playable space (village, shop interior, dungeon floor).
export class Area {
  constructor(game, name) {
    this.game = game;
    this.name = name;
    this.scene = new THREE.Scene();
    this.collision = new CollisionWorld();
    this.interactables = [];
    this.enemies = [];
    this.loot = [];
    this.projectiles = [];
    this.combat = false;
    this.outdoor = false;
    this.sparks = new Particles(2000, true);
    this.dust = new Particles(800, false);
    this.scene.add(this.sparks.points, this.dust.points);
    this.flames = [];
    this.spawn = new THREE.Vector3();
    this.spawnYaw = 0;
  }

  groundHeight() {
    return 0;
  }

  // Everything the player's attacks can hit.
  targets() {
    return this.enemies;
  }

  addInteract(o) {
    const it = { radius: 2.2, enabled: () => true, ...o };
    this.interactables.push(it);
    return it;
  }

  removeInteract(it) {
    const i = this.interactables.indexOf(it);
    if (i >= 0) this.interactables.splice(i, 1);
  }

  enter() {}
  exit() {}

  update(dt, t) {
    this.sparks.update(dt);
    this.dust.update(dt);
    for (const f of this.flames) f.userData.flicker?.(t);
  }
}
