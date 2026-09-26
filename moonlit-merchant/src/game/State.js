import { ITEMS } from './Items.js';

const SAVE_KEY = 'moonlit-merchant-save-v1';
export const POCKET_SLOTS = 5;
export const BAG_COLS = 5;

// A container is a fixed-size array of stacks ({ id, qty }) or null.
export class Container {
  constructor(size) {
    this.slots = new Array(size).fill(null);
  }

  get size() {
    return this.slots.length;
  }

  resize(size) {
    while (this.slots.length < size) this.slots.push(null);
  }

  // Returns quantity that did NOT fit.
  add(id, qty = 1, range = null) {
    const max = ITEMS[id]?.stack ?? 1;
    const [from, to] = range ?? [0, this.slots.length];
    for (let i = from; i < to && qty > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id && s.qty < max) {
        const n = Math.min(max - s.qty, qty);
        s.qty += n;
        qty -= n;
      }
    }
    for (let i = from; i < to && qty > 0; i++) {
      if (!this.slots[i]) {
        const n = Math.min(max, qty);
        this.slots[i] = { id, qty: n };
        qty -= n;
      }
    }
    return qty;
  }

  canFit(id, qty = 1) {
    const max = ITEMS[id]?.stack ?? 1;
    let room = 0;
    for (const s of this.slots) {
      if (!s) room += max;
      else if (s.id === id) room += max - s.qty;
      if (room >= qty) return true;
    }
    return room >= qty;
  }

  count(id) {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.qty;
    return n;
  }

  // Removes up to qty, returns removed amount. Takes from the back first.
  remove(id, qty) {
    let removed = 0;
    for (let i = this.slots.length - 1; i >= 0 && removed < qty; i--) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const n = Math.min(s.qty, qty - removed);
        s.qty -= n;
        removed += n;
        if (s.qty <= 0) this.slots[i] = null;
      }
    }
    return removed;
  }

  isEmpty() {
    return this.slots.every((s) => !s);
  }

  toJSON() {
    return this.slots;
  }

  load(arr) {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < Math.min(arr.length, this.slots.length); i++) {
      const s = arr[i];
      this.slots[i] = s && ITEMS[s.id] ? { id: s.id, qty: s.qty | 0 || 1 } : null;
    }
  }
}

export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.gold = 150;
    this.day = 1;
    this.minutes = 7 * 60; // 07:00
    this.bag = new Container(20);
    this.chest = new Container(36);
    this.pedestals = []; // [{ item: {id, qty} | null, price }]
    for (let i = 0; i < 6; i++) this.pedestals.push({ item: null, price: 0 });
    this.weapons = ['sword_1'];
    this.equipped = ['sword_1', null];
    this.activeWeapon = 0;
    this.armor = 0;
    this.upgrades = {};
    this.ledger = {}; // id -> { ecstatic:[min,max], happy:[..], meh:[..], angry:[..] }
    this.demand = {}; // id -> multiplier
    this.hot = null; // item in high demand today
    this.dungeonClears = 0;
    this.deepestFloor = 0;
    this.stats = { sold: 0, earned: 0, kills: 0, deaths: 0 };
    this.seenTutorial = {};
    this.discovered = { potion_s: true, gel: true, twig: true };

    // starter goodies
    this.bag.add('potion_s', 2);
    this.chest.add('gel', 4);
    this.chest.add('twig', 5);
  }

  bagSize() {
    return this.upgrades.bag ? 25 : 20;
  }

  pedestalCount() {
    return this.upgrades.expand ? 6 : 4;
  }

  maxHp() {
    return 100;
  }

  hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  save() {
    const data = {
      v: 1,
      gold: this.gold,
      day: this.day,
      minutes: this.minutes,
      bag: this.bag.toJSON(),
      chest: this.chest.toJSON(),
      pedestals: this.pedestals,
      weapons: this.weapons,
      equipped: this.equipped,
      activeWeapon: this.activeWeapon,
      armor: this.armor,
      upgrades: this.upgrades,
      ledger: this.ledger,
      demand: this.demand,
      hot: this.hot,
      dungeonClears: this.dungeonClears,
      deepestFloor: this.deepestFloor,
      stats: this.stats,
      seenTutorial: this.seenTutorial,
      discovered: this.discovered,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable: play on without saving */
    }
  }

  load() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
    if (!data) return false;
    this.reset();
    this.gold = data.gold ?? this.gold;
    this.day = data.day ?? 1;
    this.minutes = data.minutes ?? 7 * 60;
    this.upgrades = data.upgrades ?? {};
    this.bag = new Container(this.bagSize());
    this.bag.load(data.bag);
    this.chest.load(data.chest);
    if (Array.isArray(data.pedestals)) {
      data.pedestals.forEach((p, i) => {
        if (i < this.pedestals.length && p) {
          this.pedestals[i] = {
            item: p.item && ITEMS[p.item.id] ? p.item : null,
            price: p.price | 0,
          };
        }
      });
    }
    this.weapons = data.weapons ?? this.weapons;
    this.equipped = data.equipped ?? this.equipped;
    this.activeWeapon = data.activeWeapon ?? 0;
    this.armor = data.armor ?? 0;
    this.ledger = data.ledger ?? {};
    this.demand = data.demand ?? {};
    this.hot = data.hot ?? null;
    this.dungeonClears = data.dungeonClears ?? 0;
    this.deepestFloor = data.deepestFloor ?? 0;
    this.stats = { ...this.stats, ...(data.stats ?? {}) };
    this.seenTutorial = data.seenTutorial ?? {};
    this.discovered = data.discovered ?? this.discovered;
    return true;
  }

  wipe() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.reset();
  }

  // Materials may come from bag or storage chest.
  countMaterial(id) {
    return this.bag.count(id) + this.chest.count(id);
  }

  hasMaterials(mats) {
    return Object.entries(mats).every(([id, n]) => this.countMaterial(id) >= n);
  }

  consumeMaterials(mats) {
    for (const [id, n] of Object.entries(mats)) {
      const got = this.chest.remove(id, n);
      if (got < n) this.bag.remove(id, n - got);
    }
  }

  demandFor(id) {
    let d = this.demand[id] ?? 1;
    if (this.hot === id) d *= 1.35;
    return d;
  }

  recordReaction(id, price, reaction) {
    const e = (this.ledger[id] ??= {});
    const r = (e[reaction] ??= [price, price]);
    r[0] = Math.min(r[0], price);
    r[1] = Math.max(r[1], price);
  }
}
