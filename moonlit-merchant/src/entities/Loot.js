import * as THREE from 'three';
import { iconTexture } from '../ui/Icons.js';
import { glowTexture } from '../render/Textures.js';
import { ITEMS } from '../game/Items.js';

const RARITY_GLOW = {
  common: 0xffffff,
  uncommon: 0x7ef07a,
  rare: 0x6ab8ff,
  epic: 0xc88bff,
  legendary: 0xffc040,
};

// An item lying in the world, bobbing and glowing, picked up with [E].
export class WorldItem {
  constructor(area, id, qty, pos, vel) {
    this.area = area;
    this.id = id;
    this.qty = qty;
    this.pos = pos.clone();
    this.vel = vel ? vel.clone() : new THREE.Vector3((Math.random() - 0.5) * 3, 4 + Math.random() * 2, (Math.random() - 0.5) * 3);
    this.t = Math.random() * 10;
    this.settled = false;

    const g = new THREE.Group();
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(id), transparent: true, depthWrite: false }));
    spr.scale.set(0.55, 0.55, 1);
    const col = new THREE.Color(RARITY_GLOW[ITEMS[id]?.rarity ?? 'common']);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: col.clone().multiplyScalar(1.4),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(1.1, 1.1, 1);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.32, 32),
      new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2), transparent: true, opacity: 0.6, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    g.add(glow, spr);
    this.ring = ring;
    this.sprite = spr;
    this.group = g;
    area.scene.add(g, ring);
    this.interact = area.addInteract({
      pos: this.pos,
      radius: 1.8,
      label: () => `Pick up ${ITEMS[id].name}${this.qty > 1 ? ' ×' + this.qty : ''}`,
      priority: 2,
      action: () => area.game.pickupItem(this),
    });
  }

  update(dt) {
    this.t += dt;
    const ground = this.area.groundHeight(this.pos.x, this.pos.z);
    if (!this.settled) {
      this.vel.y -= 18 * dt;
      this.pos.addScaledVector(this.vel, dt);
      this.area.collision.resolve(this.pos, 0.25);
      if (this.pos.y <= ground + 0.45) {
        this.pos.y = ground + 0.45;
        if (Math.abs(this.vel.y) < 2) {
          this.settled = true;
          this.vel.set(0, 0, 0);
        } else {
          this.vel.y *= -0.35;
          this.vel.x *= 0.6;
          this.vel.z *= 0.6;
        }
      }
    }
    const bob = this.settled ? Math.sin(this.t * 2.5) * 0.08 : 0;
    this.group.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    this.ring.position.set(this.pos.x, ground + 0.03, this.pos.z);
    this.ring.scale.setScalar(1 + Math.sin(this.t * 3) * 0.1);
  }

  dispose() {
    this.area.scene.remove(this.group, this.ring);
    this.area.removeInteract(this.interact);
    this.sprite.material.dispose();
  }
}
