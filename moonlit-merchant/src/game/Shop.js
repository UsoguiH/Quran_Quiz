import * as THREE from 'three';
import { ITEMS } from './Items.js';
import { makeHumanoid, animateHumanoid } from '../render/Models.js';
import { emoteCanvas, iconTexture } from '../ui/Icons.js';

export const OPEN_FROM = 7 * 60;
export const OPEN_UNTIL = 19 * 60;

const LOOKS = [
  { shirt: 0xc05a5a, pants: 0x3a3048, hair: 0x2a1a10, hat: 'straw' },
  { shirt: 0x5ab08a, pants: 0x4a3a2a, hair: 0xd8b060 },
  { shirt: 0x8a6ad0, pants: 0x2a2a3a, hair: 0x6a3a1a, hat: 'cap', hatColor: 0x3a6ad0 },
  { shirt: 0xe0a040, pants: 0x3a3a4a, hair: 0x1a1a1a, skin: 0xa8784a },
  { shirt: 0x4a8ad0, pants: 0x5a4a3a, hair: 0xa04a2a, hat: 'straw' },
  { shirt: 0xd070a0, pants: 0x2a2a3a, hair: 0xf0e0c0, skin: 0xf6d6c0 },
  { shirt: 0x6a7a3a, pants: 0x3a2a1a, hair: 0x3a2a1a, beard: 0x3a2a1a, hat: 'cap', hatColor: 0x7a3a2a },
  { shirt: 0x3a4a6a, pants: 0x1a1a24, hair: 0x8a8a9a, beard: 0xc0c0c8, skin: 0xd8b090 },
];

// Price reaction bands relative to (base value * demand * tolerance).
export function reactionFor(ratio) {
  if (ratio <= 0.85) return 'ecstatic';
  if (ratio <= 1.1) return 'happy';
  if (ratio <= 1.4) return 'meh';
  return 'angry';
}

class Customer {
  constructor(shop, look) {
    this.shop = shop;
    this.area = shop.area;
    this.mesh = makeHumanoid(look);
    this.mesh.scale.setScalar(0.92 + Math.random() * 0.14);
    this.pos = shop.area.doorPos.clone();
    this.mesh.position.copy(this.pos);
    this.path = [];
    this.state = 'enter';
    this.t = Math.random() * 10;
    this.timer = 0;
    this.patience = 45;
    this.visits = 0;
    this.speed = 1.7 + Math.random() * 0.5;
    this.item = null;
    this.price = 0;
    this.target = null;
    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, transparent: true }));
    this.bubble.scale.set(0.7, 0.7, 1);
    this.bubble.visible = false;
    this.bubbleT = 0;
    this.carry = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, transparent: true }));
    this.carry.scale.set(0.35, 0.35, 1);
    this.carry.visible = false;
    this.area.scene.add(this.mesh, this.bubble, this.carry);
    this.face = 0;
  }

  say(kind) {
    this.bubble.material.map = emoteCanvas(kind).tex;
    this.bubble.material.needsUpdate = true;
    this.bubble.visible = true;
    this.bubbleT = 0;
  }

  goTo(points, next) {
    this.path = points.map((p) => p.clone());
    this.state = 'walk';
    this.next = next;
  }

  choosePedestal() {
    const free = this.area.pedestals
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => i < this.shop.game.state.pedestalCount() && this.shop.game.state.pedestals[i].item && !p.claimed);
    if (!free.length) return null;
    const pick = free[Math.floor(Math.random() * free.length)];
    pick.p.claimed = this;
    return pick;
  }

  startBrowsing() {
    const pick = this.choosePedestal();
    if (!pick) {
      this.leave();
      return;
    }
    this.target = pick;
    const spot = pick.p.viewSpot;
    this.goTo([new THREE.Vector3(0, 0, spot.z), spot], () => {
      this.state = 'browse';
      this.timer = 2.2 + Math.random() * 1.6;
      this.say('think');
    });
  }

  react() {
    const state = this.shop.game.state;
    const idx = this.target.i;
    const ped = state.pedestals[idx];
    const pinfo = this.target.p;
    if (!ped.item) {
      pinfo.claimed = null;
      this.say('meh');
      this.timer = 1.2;
      this.state = 'reacting';
      this.buys = false;
      return;
    }
    const id = ped.item.id;
    const reaction = this.shop.evaluate(id, ped.price);
    state.recordReaction(id, ped.price, reaction);
    this.say(reaction);
    this.shop.game.audio.play(reaction === 'angry' ? 'angry' : reaction === 'meh' ? 'click' : 'happy');
    this.buys = reaction === 'ecstatic' || reaction === 'happy' || (reaction === 'meh' && Math.random() < 0.55);
    this.state = 'reacting';
    this.timer = 1.6;
    this.shop.game.ui.onReaction(id, ped.price, reaction);
  }

  afterReaction() {
    const state = this.shop.game.state;
    const idx = this.target.i;
    const ped = state.pedestals[idx];
    this.target.p.claimed = null;
    if (this.buys && ped.item) {
      this.item = { ...ped.item };
      this.price = ped.price;
      ped.item = null;
      this.area.refreshPedestals();
      this.carry.material.map = iconTexture(this.item.id);
      this.carry.material.needsUpdate = true;
      this.carry.visible = true;
      this.bubble.visible = false;
      this.shop.queue.push(this);
      this.state = 'queue';
    } else {
      this.visits++;
      if (this.visits < 2 && Math.random() < 0.6) this.startBrowsing();
      else this.leave();
    }
  }

  leave() {
    if (this.target) this.target.p.claimed = null;
    const door = this.area.doorPos;
    this.goTo([new THREE.Vector3(0, 0, this.pos.z), new THREE.Vector3(0, 0, door.z - 0.5), door], () => {
      this.gone = true;
    });
  }

  pay() {
    const total = this.price * this.item.qty;
    this.shop.completeSale(this.item, this.price, total, this);
    this.item = null;
    this.carry.visible = false;
    this.say('coin');
    this.leave();
  }

  update(dt) {
    this.t += dt;
    let walk = 0;
    if (this.state === 'walk') {
      const target = this.path[0];
      if (!target) {
        this.state = 'idle';
        this.next?.();
      } else {
        const d = new THREE.Vector3().subVectors(target, this.pos).setY(0);
        const dist = d.length();
        if (dist < 0.08) {
          this.path.shift();
          if (!this.path.length) {
            this.state = 'idle';
            const n = this.next;
            this.next = null;
            n?.();
          }
        } else {
          d.normalize();
          this.pos.addScaledVector(d, Math.min(dist, this.speed * dt));
          walk = 1;
          this.face = Math.atan2(d.x, d.z);
        }
      }
    } else if (this.state === 'enter') {
      this.goTo([new THREE.Vector3(0, 0, this.area.doorPos.z - 2.2)], () => this.startBrowsing());
    } else if (this.state === 'browse') {
      this.timer -= dt;
      this.face = this.target.p.faceYaw;
      if (this.timer <= 0) this.react();
    } else if (this.state === 'reacting') {
      this.timer -= dt;
      if (this.timer <= 0) this.afterReaction();
    } else if (this.state === 'queue') {
      const qi = this.shop.queue.indexOf(this);
      const spot = new THREE.Vector3(0, 0, this.area.queueZ + qi * 1.0);
      const d = new THREE.Vector3().subVectors(spot, this.pos).setY(0);
      if (d.length() > 0.08) {
        // walk via the aisle
        if (Math.abs(this.pos.x) > 0.1) {
          const via = new THREE.Vector3(0, 0, this.pos.z);
          const dv = via.sub(this.pos).setY(0);
          dv.normalize();
          this.pos.addScaledVector(dv, Math.min(Math.abs(this.pos.x), this.speed * dt));
          this.face = Math.atan2(dv.x, dv.z);
        } else {
          d.normalize();
          const dd = new THREE.Vector3().subVectors(spot, this.pos).setY(0).length();
          this.pos.addScaledVector(d, Math.min(dd, this.speed * dt));
          this.face = Math.atan2(d.x, d.z);
        }
        walk = 1;
      } else {
        this.face = Math.PI; // face the counter (north)
        if (qi === 0) {
          this.patience -= dt;
          if (!this.bubble.visible || this.bubbleT > 3) this.say('coin');
          if (this.patience <= 0) {
            // gives up: returns the item to its pedestal if possible
            this.shop.abandon(this);
          }
        }
      }
    }

    let diff = this.face - this.mesh.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.mesh.rotation.y += diff * Math.min(1, dt * 8);
    this.mesh.position.copy(this.pos);
    const holding = this.carry.visible ? -1.1 : 0;
    animateHumanoid(this.mesh, this.t, walk, { armL: holding, armR: holding, tilt: this.state === 'browse' ? Math.sin(this.t * 1.5) * 0.12 : 0 });

    this.bubbleT += dt;
    if (this.bubble.visible) {
      const s = Math.min(1, this.bubbleT * 6);
      const pop = s < 1 ? s * (1.25 - 0.25 * s) : 1;
      this.bubble.scale.set(0.75 * pop, 0.75 * pop, 1);
      this.bubble.position.set(this.pos.x, this.pos.y + 2.35 + Math.sin(this.t * 3) * 0.03, this.pos.z);
      if (this.state !== 'queue' && this.bubbleT > 2.4) this.bubble.visible = false;
    }
    if (this.carry.visible) {
      const fwd = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
      this.carry.position.set(this.pos.x + fwd.x * 0.45, this.pos.y + 1.25, this.pos.z + fwd.z * 0.45);
    }
  }

  dispose() {
    this.area.scene.remove(this.mesh, this.bubble, this.carry);
  }
}

export class ShopManager {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.customers = [];
    this.queue = [];
    this.spawnTimer = 2;
    this.todaySales = 0;
    this.todayEarned = 0;
  }

  get area() {
    return this.game.areas.shop;
  }

  canOpen() {
    const m = this.game.state.minutes;
    return m >= OPEN_FROM && m < OPEN_UNTIL;
  }

  toggle() {
    if (this.open) return this.close('You flip the sign to CLOSED.');
    if (!this.canOpen()) {
      this.game.ui.message('The shop can only open between 07:00 and 19:00.');
      this.game.audio.play('error');
      return;
    }
    const s = this.game.state;
    const hasItems = s.pedestals.slice(0, s.pedestalCount()).some((p) => p.item);
    if (!hasItems) {
      this.game.ui.message('Put some items on your display tables first!');
      this.game.audio.play('error');
      return;
    }
    this.open = true;
    this.spawnTimer = 1.5;
    this.game.audio.play('bell');
    this.game.ui.toast('Shop Open!', 'Customers will start arriving soon');
    this.game.ui.updateShopChip();
    this.area.updateSign();
  }

  close(msg) {
    if (!this.open) return;
    this.open = false;
    // queued customers still pay on the way out
    for (const c of [...this.queue]) c.pay();
    for (const c of this.customers) if (c.state !== 'walk' || !c.gone) c.leave();
    if (msg) this.game.ui.message(msg);
    if (this.todaySales > 0)
      this.game.ui.toast('Shop Closed', `Sold ${this.todaySales} item${this.todaySales > 1 ? 's' : ''} for ${this.todayEarned.toLocaleString()} gold today`);
    this.game.ui.updateShopChip();
    this.area.updateSign();
    this.game.state.save();
  }

  evaluate(id, price) {
    const s = this.game.state;
    const base = ITEMS[id].base * s.demandFor(id);
    const tol = s.upgrades.rug ? 1.08 : 1;
    return reactionFor(price / (base * tol));
  }

  checkout() {
    const c = this.queue[0];
    if (!c) return false;
    c.pay();
    return true;
  }

  completeSale(item, price, total, customer) {
    const s = this.game.state;
    this.queue = this.queue.filter((q) => q !== customer);
    s.gold += total;
    s.stats.sold += item.qty;
    s.stats.earned += total;
    this.todaySales += item.qty;
    this.todayEarned += total;
    // selling lowers demand for that item a bit
    s.demand[item.id] = Math.max(0.55, (s.demand[item.id] ?? 1) - 0.04 * Math.min(3, item.qty));
    this.game.audio.play('sale');
    this.game.ui.message(`Sold ${ITEMS[item.id].name}${item.qty > 1 ? ' ×' + item.qty : ''} for <span class="gold-text">${total.toLocaleString()}g</span>`, item.id);
    this.game.ui.damageNumber(customer.pos.clone().setY(2.6), `+${total}g`, 'gold');
    this.game.ui.updateGold();
    this.area.sparks.burst(customer.pos.clone().setY(1.6), 20, { color: [3, 2.3, 0.6], speed: 3, size: 0.06, life: 0.6, gravity: 3 });
  }

  abandon(c) {
    const s = this.game.state;
    this.queue = this.queue.filter((q) => q !== c);
    // try to put the item back where it came from
    const idx = s.pedestals.findIndex((p, i) => i < s.pedestalCount() && !p.item);
    if (idx >= 0) {
      s.pedestals[idx].item = c.item;
      s.pedestals[idx].price = c.price;
    } else {
      const left = s.bag.add(c.item.id, c.item.qty);
      if (left) s.chest.add(c.item.id, left);
    }
    this.area.refreshPedestals();
    c.item = null;
    c.carry.visible = false;
    c.say('angry');
    this.game.ui.message('A customer got tired of waiting and left! (Press E at the register to serve customers)');
    c.leave();
  }

  newDay() {
    this.todaySales = 0;
    this.todayEarned = 0;
  }

  update(dt) {
    const game = this.game;
    const inShop = game.area === this.area;
    if (this.open && !this.canOpen()) this.close('Evening has come — the shop closes for the day.');
    if (this.open && !inShop) this.close('You left the shop, so it closed.');
    if (!inShop) {
      if (this.customers.length) this.clearAll();
      return;
    }

    if (this.open) {
      this.spawnTimer -= dt;
      const s = game.state;
      const maxC = s.upgrades.chandelier ? 5 : 3;
      const hasItems = s.pedestals.slice(0, s.pedestalCount()).some((p) => p.item);
      const active = this.customers.filter((c) => !c.gone).length;
      if (this.spawnTimer <= 0 && active < maxC && hasItems) {
        const rate = s.upgrades.chandelier ? 0.65 : 1;
        this.spawnTimer = (6 + Math.random() * 6) * rate;
        this.customers.push(new Customer(this, LOOKS[Math.floor(Math.random() * LOOKS.length)]));
        game.audio.play('bell');
      }
    }
    for (const c of this.customers) c.update(dt);
    const gone = this.customers.filter((c) => c.gone);
    gone.forEach((c) => c.dispose());
    this.customers = this.customers.filter((c) => !c.gone);
  }

  clearAll() {
    this.customers.forEach((c) => c.dispose());
    this.customers = [];
    this.queue = [];
  }
}
