import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Engine, QUALITY } from './render/Engine.js';
import { Textures } from './render/Textures.js';
import { globalUniforms } from './render/Models.js';
import { Input } from './core/Input.js';
import { Audio } from './core/Audio.js';
import { GameState, POCKET_SLOTS } from './game/State.js';
import { ITEMS } from './game/Items.js';
import { ShopManager, OPEN_FROM } from './game/Shop.js';
import { Player } from './entities/Player.js';
import { Weapons } from './entities/Weapons.js';
import { WorldItem } from './entities/Loot.js';
import { Village } from './world/Village.js';
import { ShopInterior } from './world/ShopInterior.js';
import { Dungeon } from './world/Dungeon.js';
import { UI } from './ui/UI.js';

const TIME_RATE = 2; // game minutes per real second
const SETTINGS_KEY = 'moonlit-merchant-settings';
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

const FORTUNES = [
  'The coin sinks with a soft plink. You feel lucky.',
  'A fish nibbles at the coin. Rude.',
  '“Buy low, sell high,” whispers the fountain.',
  'Somewhere, a slime sneezes.',
  'The moon statue seems to smile at you.',
  'You wish for a good day of sales.',
];

class Game {
  constructor() {
    this.engine = new Engine(document.getElementById('app'));
    this.input = new Input(this.engine.renderer.domElement);
    this.audio = new Audio();
    this.state = new GameState();
    this.mode = 'loading';
    this.paused = false;
    this.uiOpen = false;
    this.transitioning = false;
    this.time = 0;
    this.fps = 60;
    this.hitStopT = 0;
    this.pendantT = 0;
    this.godMode = false;
    this.clock = new THREE.Clock();
    this.ui = new UI(this);
    window.game = this;
  }

  async init() {
    const steps = [
      ['Carving stone bricks…', () => Textures.stoneBricks()],
      ['Laying cobblestones…', () => Textures.cobble()],
      ['Planing wood…', () => Textures.wood()],
      ['Plastering walls…', () => Textures.plaster()],
      ['Growing grass…', () => Textures.grass()],
      ['Tiling roofs…', () => [Textures.roof(0), Textures.roof(1), Textures.roof(2)]],
      ['Sweeping dungeon floors…', () => Textures.dungeonFloor()],
      ['Peeling bark…', () => Textures.bark()],
    ];
    for (let i = 0; i < steps.length; i++) {
      this.ui.showLoading(i / (steps.length + 3), steps[i][0]);
      await nextFrame();
      steps[i][1]();
    }
    this.ui.showLoading(0.75, 'Building the village…');
    await nextFrame();

    const pmrem = new THREE.PMREMGenerator(this.engine.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.engine.viewScene.environment = this.envMap;
    this.engine.viewScene.environmentIntensity = 0.3;

    this.player = new Player(this);
    this.shop = new ShopManager(this);
    this.areas = {};
    this.areas.village = new Village(this);
    this.ui.showLoading(0.85, 'Dusting the shop…');
    await nextFrame();
    this.areas.shop = new ShopInterior(this);
    this.areas.dungeon = new Dungeon(this);
    for (const a of Object.values(this.areas)) {
      a.scene.environment = this.envMap;
      a.scene.environmentIntensity = 0.5;
    }
    this.weapons = new Weapons(this);

    this.loadSettings();
    this.setupInput();
    this.ui.showLoading(1);

    // title screen: village at golden hour
    this.area = this.areas.village;
    this.engine.setScene(this.area.scene);
    this.state.minutes = 17.6 * 60;
    this.mode = 'menu';
    this.ui.showMenu();
    // warm up shaders
    this.engine.render(0);
    this.clock.start();
    this.engine.renderer.setAnimationLoop(() => this.frame());
  }

  // ------------------------------------------------------------ settings

  loadSettings() {
    let s = {};
    try {
      s = JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {};
    } catch {
      /* ignore */
    }
    if (s.sensitivity) this.player.sensitivity = s.sensitivity;
    if (s.fov) this.player.fov = s.fov;
    if (s.volume !== undefined) this.audio.volume = s.volume;
    if (s.music !== undefined) this.audio.musicVolume = s.music;
    this.setQuality(s.quality ?? this.engine.quality, false);
  }

  saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          sensitivity: this.player.sensitivity,
          fov: this.player.fov,
          volume: this.audio.volume,
          music: this.audio.musicVolume,
          quality: this.engine.quality,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  setSetting(k, v) {
    if (k === 'sensitivity') this.player.sensitivity = v;
    if (k === 'fov') this.player.fov = v;
    if (k === 'volume') this.audio.setVolume(v);
    if (k === 'music') this.audio.setMusicVolume(v);
    this.saveSettings();
  }

  setQuality(q, save = true) {
    this.engine.applyQuality(q);
    this.areas?.village?.rebuildGrass(QUALITY[q].grass);
    const size = QUALITY[q].shadowSize;
    for (const light of [this.areas?.village?.sun, this.areas?.shop?.sun]) {
      if (!light) continue;
      light.shadow.mapSize.set(size, size);
      light.shadow.map?.dispose();
      light.shadow.map = null;
    }
    if (save) this.saveSettings();
  }

  // ------------------------------------------------------------ input

  setupInput() {
    const input = this.input;
    this.engine.renderer.domElement.addEventListener('mousedown', () => {
      this.audio.init();
      if (this.mode === 'play' && !this.paused && !this.uiOpen && !input.locked) input.lock();
    });
    input.onLockChange = (locked) => {
      if (!locked && this.mode === 'play' && !this.uiOpen && !this.paused && !this.player.dead && !this.transitioning) this.pause();
    };
    input.onKey = (e) => {
      this.audio.init();
      if (e.code === 'F3') {
        this.ui.toggleDebug();
        return;
      }
      if (this.mode !== 'play') return;
      if (this.ui.window) {
        const typing = document.activeElement?.tagName === 'INPUT';
        if (e.code === 'Escape' || e.code === 'Tab' || (!typing && (e.code === 'KeyE' || e.code === 'KeyI' || e.code === 'KeyL'))) {
          e.preventDefault();
          this.ui.closeWindow();
        }
        return;
      }
      if (this.paused && e.code === 'Escape') {
        this.resume();
      }
    };
  }

  canControl() {
    return this.mode === 'play' && !this.paused && !this.uiOpen && !this.transitioning && (this.input.locked || this.noLock);
  }

  setUIOpen(open) {
    this.uiOpen = open;
    if (open) {
      this.input.unlock();
      this.pendantT = 0;
    } else if (this.mode === 'play' && !this.paused) {
      this.input.lock();
    }
    this.ui.crosshair.classList.toggle('hidden', open);
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.ui.showPause();
  }

  resume() {
    this.paused = false;
    this.ui.clearScreen();
    this.input.lock();
  }

  // ------------------------------------------------------------ game flow

  async startPlaying() {
    this.ui.clearScreen();
    this.audio.init();
    await this.ui.fadeOut();
    this.mode = 'play';
    this.paused = false;
    this.player.hp = this.player.maxHp;
    this.player.dead = false;
    this.shop.clearAll();
    this.shop.open = false;
    this.areas.shop.applyUpgrades();
    this.areas.shop.refreshPedestals();
    this.state.bag.resize(this.state.bagSize());
    this.weapons.root.visible = true;
    await this.changeArea('shop', { spawn: 'bed', instant: true });
    this.ui.showHUD(true);
    this.ui.refreshHUD();
    this.input.lock();
    await this.ui.fadeIn();
  }

  async newGame() {
    this.state.wipe();
    this.state.minutes = OPEN_FROM;
    this.state.hot = this.pickHotItem();
    await this.startPlaying();
    this.ui.toast('Day 1', 'Welcome to the Moonlit Merchant!');
    setTimeout(() => {
      this.ui.message('Your storage chest (back right) has some starter loot.');
      this.ui.message('Place items on the display tables with <kbd>E</kbd>, then open the shop at the register.');
    }, 1200);
    setTimeout(() => this.ui.message('Need more loot? The dungeon gate is south of the village plaza.'), 6000);
  }

  async continueGame() {
    this.state.load();
    await this.startPlaying();
    this.ui.toast(`Day ${this.state.day}`, 'Welcome back, merchant.');
  }

  async quitToMenu() {
    this.state.save();
    this.ui.clearScreen();
    await this.ui.fadeOut();
    this.shop.close();
    this.shop.clearAll();
    this.mode = 'menu';
    this.paused = false;
    this.ui.showHUD(false);
    this.weapons.root.visible = false;
    this.area?.exit();
    this.area = this.areas.village;
    this.engine.setScene(this.area.scene);
    this.state.minutes = 17.6 * 60;
    this.ui.showMenu();
    await this.ui.fadeIn();
  }

  async changeArea(name, opts = {}) {
    if (this.transitioning && !opts.instant) return;
    this.transitioning = true;
    if (!opts.instant) await this.ui.fadeOut();
    this.ui.closeWindow(true);
    this.area?.exit();
    const area = this.areas[name];
    this.area = area;
    area.enter(opts);
    area.scene.environment = this.envMap;
    this.engine.setScene(area.scene);
    let pos = area.spawn.clone();
    let yaw = area.spawnYaw;
    if (name === 'village' && opts.spawn === 'shopDoor') {
      pos = new THREE.Vector3(0, 0, -10.2);
      yaw = Math.PI;
    } else if (name === 'village' && opts.spawn === 'gate') {
      pos = new THREE.Vector3(0, 0, 42);
      yaw = 0;
    } else if (name === 'shop' && opts.spawn === 'bed') {
      pos = new THREE.Vector3(-4.6, 0, -5.8);
      yaw = -Math.PI * 0.75;
    }
    this.player.place(pos, yaw);
    this.player.update(0);
    this.weapons.refresh();
    this.ui.minimapDirty = true;
    this.pendantT = 0;
    if (name === 'dungeon') this.ui.toast(`Floor ${area.floor}`, area.floor === 3 ? 'Something enormous stirs below…' : 'The Hollow Ruins');
    if (!opts.instant) {
      this.audio.play('door');
      await this.ui.fadeIn();
    }
    this.transitioning = false;
  }

  enterDungeon(floor) {
    if (floor === 1) this.audio.play('portal');
    this.changeArea('dungeon', { floor });
  }

  async returnHome(reason) {
    this.ui.setPendant(0);
    await this.changeArea('village', { spawn: 'gate' });
    this.player.hp = this.player.maxHp;
    if (reason === 'pendant') this.ui.message('The pendant carries you home, loot and all.');
    if (reason === 'victory') this.ui.toast('Home, victorious!', 'Time to sell that treasure.');
    this.state.save();
  }

  onPlayerDeath() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    this.state.stats.deaths++;
    let lost = 0;
    const bag = this.state.bag;
    for (let i = POCKET_SLOTS; i < bag.size; i++) {
      if (bag.slots[i]) {
        lost += bag.slots[i].qty;
        bag.slots[i] = null;
      }
    }
    this.audio.play('die');
    this.weapons.cancel();
    setTimeout(() => {
      this.input.unlock();
      this.ui.showDeath(lost);
    }, 1300);
  }

  async respawnAfterDeath() {
    this.ui.clearScreen();
    this.player.dead = false;
    this.player.hp = this.player.maxHp;
    // you wake up the next morning
    this.advanceToMorning();
    await this.changeArea('shop', { spawn: 'bed' });
    this.input.lock();
    this.state.save();
  }

  onBossDefeated(boss) {
    this.state.dungeonClears++;
    this.ui.toast('Victory!', 'The Hollow Colossus has fallen');
    this.audio.play('levelup');
    this.area.onBossDefeated?.(boss);
    this.ui.updateBoss(null);
    this.state.save();
  }

  // ------------------------------------------------------------ time

  canSleep() {
    const m = this.state.minutes;
    return m >= 17 * 60 || m < 6 * 60;
  }

  async sleep() {
    if (!this.canSleep()) {
      this.ui.message('It’s too early to sleep. Come back after 17:00.');
      this.audio.play('error');
      return;
    }
    this.transitioning = true;
    await this.ui.fadeOut();
    this.shop.close();
    this.advanceToMorning();
    this.player.hp = this.player.maxHp;
    this.areas.shop.updateLighting();
    await new Promise((r) => setTimeout(r, 500));
    this.state.save();
    await this.ui.fadeIn();
    this.transitioning = false;
    this.ui.message('Game saved.');
  }

  advanceToMorning() {
    this.newDay();
    this.state.minutes = 7 * 60;
  }

  pickHotItem() {
    const pool = Object.keys(ITEMS).filter((id) => !ITEMS[id].heal && ITEMS[id].base < 1500);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  newDay() {
    const s = this.state;
    s.day++;
    for (const id of Object.keys(s.demand)) {
      s.demand[id] = Math.min(1, s.demand[id] + 0.15);
      if (s.demand[id] >= 1) delete s.demand[id];
    }
    s.hot = this.pickHotItem();
    this.shop.newDay();
    this.ui.toast(`Day ${s.day}`, `Today’s craze: ${ITEMS[s.hot].name}!`);
  }

  updateClock(dt) {
    const s = this.state;
    const before = s.minutes;
    s.minutes += dt * TIME_RATE;
    if (s.minutes >= 1440) s.minutes -= 1440;
    // natural sunrise without sleeping
    if (before < 360 && s.minutes >= 360) this.newDay();
  }

  // ------------------------------------------------------------ helpers

  spawnLoot(area, id, qty, pos) {
    const it = new WorldItem(area, id, qty, pos);
    area.loot.push(it);
    return it;
  }

  pickupItem(wi) {
    const left = this.state.bag.add(wi.id, wi.qty);
    if (left === wi.qty) {
      this.ui.message('Your bag is full!');
      this.audio.play('error');
      return;
    }
    const got = wi.qty - left;
    this.state.discovered[wi.id] = true;
    this.audio.play('pickup');
    this.ui.message(`Picked up ${ITEMS[wi.id].name}${got > 1 ? ' ×' + got : ''}`, wi.id);
    if (left > 0) wi.qty = left;
    else {
      wi.dispose();
      wi.area.loot = wi.area.loot.filter((l) => l !== wi);
    }
    this.ui.updateHotbar();
  }

  addGold(n, pos) {
    this.state.gold += n;
    this.audio.play('coin');
    if (pos) this.ui.damageNumber(pos, `+${n}g`, 'gold');
    this.ui.updateGold();
  }

  tossCoin() {
    if (this.state.gold < 1) return;
    this.state.gold -= 1;
    this.audio.play('coin');
    this.ui.updateGold();
    this.ui.message(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]);
  }

  onHitEnemy() {
    this.ui.crosshair.classList.add('hit');
    clearTimeout(this._hitT);
    this._hitT = setTimeout(() => this.ui.crosshair.classList.remove('hit'), 120);
  }

  hitStop(t) {
    this.hitStopT = Math.max(this.hitStopT, t);
  }

  drink(slotIndex) {
    const bag = this.state.bag;
    const s = bag.slots[slotIndex];
    if (!s || !ITEMS[s.id].heal) return false;
    if (this.player.hp >= this.player.maxHp) {
      this.ui.message('You are already at full health.');
      return true;
    }
    this.player.heal(ITEMS[s.id].heal);
    s.qty--;
    if (s.qty <= 0) bag.slots[slotIndex] = null;
    this.audio.play('drink');
    this.area.sparks.burst(this.player.pos.clone().setY(1.0), 25, { color: [2.5, 0.6, 0.8], speed: 2, size: 0.08, life: 0.8, gravity: -2 });
    this.ui.updateHotbar();
    return true;
  }

  quickHeal() {
    const bag = this.state.bag;
    let best = -1;
    for (let i = 0; i < bag.size; i++) {
      const s = bag.slots[i];
      if (s && ITEMS[s.id].heal) {
        if (best < 0 || ITEMS[s.id].heal < ITEMS[bag.slots[best].id].heal) best = i;
      }
    }
    if (best < 0) {
      this.ui.message('No potions in your bag!');
      this.audio.play('error');
      return;
    }
    this.drink(best);
  }

  pendantCost() {
    const f = this.area?.floor ?? 1;
    const base = 40 + f * 40;
    return this.state.upgrades.pendant ? Math.round(base / 2) : base;
  }

  // ------------------------------------------------------------ interaction

  findInteract() {
    const area = this.area;
    const p = this.player;
    const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    let best = null;
    let bestScore = Infinity;
    for (const it of area.interactables) {
      if (!it.enabled()) continue;
      const dx = it.pos.x - p.pos.x;
      const dz = it.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > it.radius) continue;
      const dot = d > 0.01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
      if (dot < -0.1 && d > 1.2) continue;
      const score = d - dot * 1.5 - (it.priority ?? 0);
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }

  handleActions(dt) {
    const input = this.input;
    const inCombat = this.area.combat;
    const st = this.state;

    const it = this.player.dead ? null : this.findInteract();
    this.currentInteract = it;
    this.ui.setPrompt(this.canControl() ? it : null);
    if (!this.canControl()) return;

    if (input.hit('KeyE') && it) {
      it.action();
      return;
    }
    if (input.hit('Tab') || input.hit('KeyI')) {
      this.ui.openInventory();
      return;
    }
    if (input.hit('KeyL')) {
      this.ui.openLedger();
      return;
    }
    for (let i = 0; i < POCKET_SLOTS; i++) {
      if (input.hit('Digit' + (i + 1))) {
        this.ui.hotbarSel = i;
        this.ui.updateHotbar();
      }
    }
    if (input.mouse.wheel) {
      this.ui.hotbarSel = (this.ui.hotbarSel + input.mouse.wheel + POCKET_SLOTS) % POCKET_SLOTS;
      this.ui.updateHotbar();
    }
    if (input.hit('KeyF')) {
      if (!this.drink(this.ui.hotbarSel)) {
        const s = st.bag.slots[this.ui.hotbarSel];
        if (s) this.ui.message(`${ITEMS[s.id].name} can't be used — sell it in your shop!`);
      }
    }
    if (input.hit('KeyH')) this.quickHeal();

    // merchant pendant
    if (inCombat && input.down('KeyR') && !this.player.dead) {
      const cost = this.pendantCost();
      if (this.pendantT === 0 && st.gold < cost) {
        if (input.hit('KeyR')) {
          this.ui.message(`The pendant needs ${cost} gold to activate.`);
          this.audio.play('error');
        }
      } else {
        if (this.pendantT === 0) this.audio.play('portal');
        this.pendantT += dt / 1.6;
        if (Math.random() < 0.5)
          this.area.sparks.burst(this.player.pos.clone().setY(0.2 + Math.random() * 1.5), 1, {
            color: [1.5, 1.1, 3],
            speed: 1,
            size: 0.08,
            life: 0.8,
            gravity: -2,
          });
        if (this.pendantT >= 1) {
          st.gold -= cost;
          this.ui.updateGold();
          this.pendantT = 0;
          this.returnHome('pendant');
        }
      }
    } else {
      this.pendantT = 0;
    }
    this.ui.setPendant(this.pendantT, this.pendantCost());
  }

  // ------------------------------------------------------------ loop

  frame() {
    let dt = Math.min(0.05, this.clock.getDelta());
    this.fps += (1 / Math.max(dt, 1e-4) - this.fps) * 0.05;
    if (this.hitStopT > 0) {
      this.hitStopT -= dt;
      dt *= 0.08;
    }
    this.time += dt;
    globalUniforms.uTime.value = this.time;
    const area = this.area;

    if (this.mode === 'menu') {
      const t = this.time * 0.04;
      const cam = this.engine.camera;
      cam.position.set(Math.sin(t) * 12.5, 4.5 + Math.sin(t * 1.3) * 0.8, Math.cos(t) * 12.5);
      cam.lookAt(-Math.sin(t) * 6, 3, -Math.cos(t) * 6);
      cam.fov = 60;
      cam.updateProjectionMatrix();
      this.player.pos.set(0, 0, 0);
      this.state.minutes += dt * 0.6;
      if (this.state.minutes > 19.2 * 60) this.state.minutes = 16.8 * 60;
      area.update(dt, this.time);
      this.weapons.root.visible = false;
    } else if (this.mode === 'play') {
      const active = !this.paused;
      if (active) {
        this.updateClock(dt);
        this.player.update(dt);
        this.weapons.update(dt);
        area.update(dt, this.time);
        this.shop.update(dt);
        this.handleActions(dt);
      } else {
        this.ui.setPrompt(null);
      }
      this.ui.update(dt);
    }
    this.audio.update(dt);
    this.input.endFrame();
    this.engine.render(this.time);
  }
}

const game = new Game();
game.init().catch((err) => {
  console.error(err);
  const el = document.createElement('pre');
  el.style.cssText = 'position:fixed;inset:20px;color:#fff;background:#300;padding:20px;z-index:100;white-space:pre-wrap';
  el.textContent = 'Failed to start: ' + err.stack;
  document.body.append(el);
});
