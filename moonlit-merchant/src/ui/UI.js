import * as THREE from 'three';
import { ITEMS, WEAPONS, ARMOR, FORGE_RECIPES, POTION_RECIPES, SHOP_UPGRADES, itemName } from '../game/Items.js';
import { POCKET_SLOTS, BAG_COLS } from '../game/State.js';
import { iconURL, faceURL } from './Icons.js';

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined) el.innerHTML = html;
  return el;
};

const HEART_PATH = 'M12 21s-7.5-4.6-9.6-9.3C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.2C19.5 16.4 12 21 12 21z';
const SHIELD_PATH = 'M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3z';

function heartSVG(fill) {
  // fill: 0, 0.5, 1
  const id = 'hc' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 24 24"><defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a96"/><stop offset="0.5" stop-color="#ff3d55"/><stop offset="1" stop-color="#b3122a"/></linearGradient>
    <clipPath id="${id}c"><rect x="0" y="0" width="${fill * 24}" height="24"/></clipPath></defs>
    <path d="${HEART_PATH}" fill="#2a1418" stroke="#120709" stroke-width="1.6"/>
    <path d="${HEART_PATH}" fill="url(#${id}g)" clip-path="url(#${id}c)"/>
    <ellipse cx="8" cy="8.5" rx="2.2" ry="1.4" fill="rgba(255,255,255,0.6)" clip-path="url(#${id}c)"/></svg>`;
}

function shieldSVG(fill) {
  const id = 'sc' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 24 24"><defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f0ff"/><stop offset="1" stop-color="#7a88a8"/></linearGradient>
    <clipPath id="${id}c"><rect x="0" y="0" width="${fill * 24}" height="24"/></clipPath></defs>
    <path d="${SHIELD_PATH}" fill="#1c2030" stroke="#0a0c14" stroke-width="1.6"/>
    <path d="${SHIELD_PATH}" fill="url(#${id}g)" clip-path="url(#${id}c)"/></svg>`;
}

function fmtTime(minutes) {
  const m = Math.floor(minutes) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

const REACTION_LABEL = {
  ecstatic: 'Too cheap! (they love it)',
  happy: 'Perfect price',
  meh: 'A bit expensive',
  angry: 'Way too expensive',
};

const SPLASHES = ['Now in 3D!', 'Shaders included!', 'Buy low, sell high!', 'Mind the slimes!', 'Not a single cube!', 'Open 7 to 7!'];

export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui-root');
    this.held = null;
    this.window = null;
    this.windowName = null;
    this.screen = null;
    this.dmgNums = [];
    this.minimapDirty = true;
    this.hotbarSel = 0;
    this._lastHearts = '';
    this.buildHUD();
    this.tooltip = h('div', 'tooltip hidden');
    this.heldEl = h('div', 'held hidden');
    this.fade = h('div', 'fade');
    this.root.append(this.tooltip, this.heldEl, this.fade);
    document.addEventListener('mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
      if (this.held) {
        this.heldEl.style.left = e.clientX + 'px';
        this.heldEl.style.top = e.clientY + 'px';
      }
      if (!this.tooltip.classList.contains('hidden')) this.placeTooltip();
    });
  }

  // ================================================================= HUD

  buildHUD() {
    const hud = h('div', '');
    hud.id = 'hud';
    hud.classList.add('hidden');
    this.hud = hud;
    this.hurtEl = h('div', 'hurt');
    this.crosshair = h('div', 'crosshair');
    this.drawRing = h(
      'div',
      'draw-ring hidden',
      `<svg viewBox="0 0 46 46"><circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3"/><circle class="arc" cx="23" cy="23" r="19" fill="none" stroke="#ffd35a" stroke-width="3" stroke-linecap="round" stroke-dasharray="119.4" stroke-dashoffset="119.4" transform="rotate(-90 23 23)"/></svg>`,
    );
    this.prompt = h('div', 'prompt hidden');
    this.prompt.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      this.game.input.pressed.add('KeyE');
    });
    const tl = h('div', 'info-tl');
    this.clockChip = h('div', 'chip');
    this.shopChip = h('div', 'chip closed hidden', '<span class="dot"></span><span class="t">Shop closed</span>');
    this.floorChip = h('div', 'chip hidden');
    tl.append(this.clockChip, this.shopChip, this.floorChip);

    this.minimap = h('div', 'minimap hidden');
    this.mapCanvas = h('canvas');
    this.mapCanvas.width = 380;
    this.mapCanvas.height = 380;
    this.mapLabel = h('div', 'floor');
    this.minimap.append(this.mapCanvas, this.mapLabel);

    this.bossbar = h('div', 'bossbar hidden', '<div class="name"></div><div class="bar"><div></div></div>');
    this.messages = h('div', 'messages');

    const bottom = h('div', 'bottom-bar');
    const status = h('div', 'status-row');
    this.hearts = h('div', 'hearts');
    this.armorEl = h('div', 'armor');
    this.goldEl = h('div', 'gold-label', '<span class="coin"></span><span class="g">0</span>');
    status.append(this.hearts, this.goldEl, this.armorEl);
    this.xp = h('div', 'xp', '<div class="fill"></div>');
    const wrap = h('div', 'hotbar-wrap');
    this.weaponSlots = h('div', 'weapon-slots');
    this.hotbar = h('div', 'hotbar');
    wrap.append(this.weaponSlots, this.hotbar);
    bottom.append(status, this.xp, wrap);

    this.pendant = h(
      'div',
      'pendant hidden',
      `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="rgba(20,12,40,0.35)" stroke="rgba(200,180,255,0.25)" stroke-width="6"/><circle class="arc" cx="60" cy="60" r="50" fill="none" stroke="#c9b8ff" stroke-width="6" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="314" transform="rotate(-90 60 60)" style="filter: drop-shadow(0 0 6px #a78bff)"/></svg><div class="label"></div>`,
    );
    this.debug = h('div', 'debug hidden');
    this.toastWrap = h('div', '');
    hud.append(this.hurtEl, this.crosshair, this.drawRing, this.prompt, tl, this.minimap, this.bossbar, this.messages, bottom, this.pendant, this.debug, this.toastWrap);
    this.root.append(hud);
  }

  showHUD(v) {
    this.hud.classList.toggle('hidden', !v);
  }

  refreshHUD() {
    this.updateHotbar();
    this.updateWeapons();
    this.updateGold();
    this.updateShopChip();
    this._lastHearts = '';
  }

  updateHotbar() {
    const bag = this.game.state.bag;
    this.hotbar.innerHTML = '';
    for (let i = 0; i < POCKET_SLOTS; i++) {
      const s = this.slotEl(bag.slots[i]);
      if (i === this.hotbarSel) s.classList.add('selected');
      s.append(h('span', 'key', String(i + 1)));
      // tap a pocket slot to select it; tap the selected one again to use it (touch)
      s.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        e.preventDefault();
        if (this.hotbarSel === i) this.game.input.pressed.add('KeyF');
        else {
          this.hotbarSel = i;
          this.updateHotbar();
        }
      });
      this.hotbar.append(s);
    }
  }

  updateWeapons() {
    const st = this.game.state;
    this.weaponSlots.innerHTML = '';
    st.equipped.forEach((id, i) => {
      const s = h('div', 'slot');
      s.style.setProperty('--slot', '52px');
      if (id) {
        const img = h('img');
        img.src = iconURL(id);
        s.append(img);
      } else {
        const img = h('img');
        img.src = iconURL('empty_weapon');
        s.append(img);
      }
      if (i === st.activeWeapon && id) s.classList.add('active');
      s.append(h('span', 'tag', i === 0 ? 'MAIN' : 'ALT · Q'));
      s.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        e.preventDefault();
        this.game.input.pressed.add('KeyQ');
      });
      this.weaponSlots.append(s);
    });
  }

  updateGold() {
    this.goldEl.querySelector('.g').textContent = this.game.state.gold.toLocaleString();
  }

  updateShopChip() {
    const open = this.game.shop?.open;
    this.shopChip.classList.toggle('closed', !open);
    this.shopChip.querySelector('.t').textContent = open ? 'Shop open' : 'Shop closed';
  }

  updateBoss(boss) {
    if (!boss || boss.dead) {
      this.bossbar.classList.add('hidden');
      return;
    }
    this.bossbar.classList.remove('hidden');
    this.bossbar.querySelector('.name').textContent = boss.name;
    this.bossbar.querySelector('.bar div').style.width = `${(Math.max(0, boss.hp) / boss.maxHp) * 100}%`;
  }

  message(html, icon) {
    const m = h('div', 'msg', (icon ? `<img src="${iconURL(icon)}">` : '') + html);
    this.messages.append(m);
    while (this.messages.children.length > 6) this.messages.firstChild.remove();
    setTimeout(() => m.classList.add('out'), 5500);
    setTimeout(() => m.remove(), 6200);
  }

  toast(big, small = '') {
    const t = h('div', 'toast', `${big ? `<div class="big">${big}</div>` : ''}${small ? `<div class="small">${small}</div>` : ''}`);
    this.toastWrap.innerHTML = '';
    this.toastWrap.append(t);
    setTimeout(() => t.remove(), 3500);
  }

  damageNumber(pos, value, cls = '') {
    const el = h('div', 'dmg ' + cls, String(value));
    this.root.append(el);
    this.dmgNums.push({ el, pos: pos.clone(), t: 0, vx: (Math.random() - 0.5) * 0.6 });
  }

  onReaction() {}

  setPrompt(it) {
    if (!it) {
      this.prompt.classList.add('hidden');
      return;
    }
    const label = typeof it.label === 'function' ? it.label() : it.label;
    const sub = typeof it.sub === 'function' ? it.sub() : it.sub;
    const html = `<kbd>E</kbd>${label}${sub ? `<span class="sub">${sub}</span>` : ''}`;
    if (this._promptHtml !== html) {
      this.prompt.innerHTML = html;
      this._promptHtml = html;
    }
    this.prompt.classList.remove('hidden');
  }

  update(dt) {
    const game = this.game;
    const st = game.state;
    const p = game.player;

    // hearts
    const maxHp = p.maxHp;
    const per = maxHp / 10;
    const heartKey = Math.ceil(p.hp / (per / 2)) + '/' + maxHp + '/' + st.armor;
    if (heartKey !== this._lastHearts) {
      this._lastHearts = heartKey;
      let html = '';
      for (let i = 0; i < 10; i++) {
        const v = Math.max(0, Math.min(1, (p.hp - i * per) / per));
        html += heartSVG(v >= 0.75 ? 1 : v > 0.01 ? 0.5 : 0);
      }
      this.hearts.innerHTML = html;
      const pts = Math.round(ARMOR[st.armor].reduce * 20);
      let ah = '';
      if (pts > 0) for (let i = 0; i < 10; i++) ah += shieldSVG(Math.max(0, Math.min(1, (pts - i * 2) / 2)));
      this.armorEl.innerHTML = ah;
    }
    this.hearts.classList.toggle('low', p.hp <= maxHp * 0.25 && p.hp > 0);

    // clock + day progress bar
    const m = st.minutes;
    const isDay = m >= 6 * 60 && m < 19 * 60;
    const icon = isDay ? '<span class="sun"></span>' : '<span class="moon"></span>';
    const clockHtml = `${icon}Day ${st.day} · ${fmtTime(m)}`;
    if (this._clock !== clockHtml) {
      this.clockChip.innerHTML = clockHtml;
      this._clock = clockHtml;
    }
    const fill = this.xp.querySelector('.fill');
    const frac = isDay ? (m - 360) / (780) : ((m - 1140 + 1440) % 1440) / 660;
    fill.style.width = `calc(${Math.min(1, Math.max(0, frac)) * 100}% - 2px)`;
    fill.classList.toggle('night', !isDay);

    const area = game.area;
    this.shopChip.classList.toggle('hidden', !(area?.name === 'shop' || area?.name === 'village'));
    this.floorChip.classList.toggle('hidden', area?.name !== 'dungeon');
    if (area?.name === 'dungeon') this.floorChip.textContent = `Hollow Ruins · Floor ${area.floor}`;
    this.minimap.classList.toggle('hidden', area?.name !== 'dungeon');
    if (area?.name === 'dungeon') {
      this._mapT = (this._mapT ?? 0) - dt;
      if (this.minimapDirty || this._mapT <= 0) {
        this.drawMinimap();
        this._mapT = 0.1;
        this.minimapDirty = false;
      }
    }

    // hurt vignette
    this.hurtEl.style.opacity = Math.max(p.hurtFx * 0.9, p.hp < maxHp * 0.25 ? 0.25 + Math.sin(game.time * 5) * 0.1 : 0);
    game.engine.grade.uniforms.uHurt.value = p.hurtFx * 0.6;

    // bow draw ring
    const w = game.weapons;
    const drawing = w.state === 'draw';
    this.drawRing.classList.toggle('hidden', !drawing);
    if (drawing) {
      const arc = this.drawRing.querySelector('.arc');
      arc.style.strokeDashoffset = String(119.4 * (1 - w.draw));
      arc.style.stroke = w.draw >= 0.99 ? '#8fff8a' : '#ffd35a';
    }

    // damage numbers
    const cam = game.engine.camera;
    const v = new THREE.Vector3();
    this.dmgNums = this.dmgNums.filter((d) => {
      d.t += dt;
      d.pos.y += dt * 1.2;
      d.pos.x += d.vx * dt;
      v.copy(d.pos).project(cam);
      if (v.z > 1 || d.t > 1.1) {
        d.el.remove();
        return false;
      }
      d.el.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth).toFixed(1) + 'px';
      d.el.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight).toFixed(1) + 'px';
      const s = d.t < 0.12 ? 0.6 + d.t * 5 : 1;
      d.el.style.opacity = String(Math.min(1, (1.1 - d.t) * 3));
      d.el.style.transform = `translate(-50%,-50%) scale(${s})`;
      return true;
    });

    // debug overlay
    if (!this.debug.classList.contains('hidden')) {
      const info = game.engine.renderer.info;
      this.debug.textContent =
        `Moonlit Merchant 3D\n${game.fps.toFixed(0)} fps · ${info.render.calls} draws · ${(info.render.triangles / 1000).toFixed(0)}k tris\n` +
        `XYZ: ${p.pos.x.toFixed(1)} / ${p.pos.y.toFixed(1)} / ${p.pos.z.toFixed(1)}\n` +
        `Area: ${area?.name}  Quality: ${game.engine.quality}\nEnemies: ${area?.enemies?.length ?? 0}  Particles: ${area?.sparks?.count ?? 0}`;
    }
  }

  setPendant(progress, cost) {
    this.pendant.classList.toggle('hidden', progress <= 0);
    if (progress > 0) {
      this.pendant.querySelector('.arc').style.strokeDashoffset = String(314 * (1 - progress));
      this.pendant.querySelector('.label').innerHTML = `Merchant Pendant — returning home (${cost}g)`;
    }
  }

  drawMinimap() {
    const d = this.game.area;
    const ctx = this.mapCanvas.getContext('2d');
    const W = this.mapCanvas.width;
    ctx.clearRect(0, 0, W, W);
    if (!d.rooms) return;
    const cur = d.currentRoom ?? d.rooms[0];
    const cell = 52;
    const size = 38;
    const cx = W / 2;
    const cy = W / 2;
    const pos = (r) => [cx + (r.gx - cur.gx) * cell, cy - (r.gy - cur.gy) * cell];
    ctx.lineCap = 'round';
    // corridors
    for (const r of d.rooms) {
      if (!r.seen && !r.visited) continue;
      const [x, y] = pos(r);
      ctx.strokeStyle = r.visited ? 'rgba(200,190,220,0.6)' : 'rgba(120,110,140,0.35)';
      ctx.lineWidth = 7;
      if (r.doors.n) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - cell / 2);
        ctx.stroke();
      }
      if (r.doors.s) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + cell / 2);
        ctx.stroke();
      }
      if (r.doors.e) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cell / 2, y);
        ctx.stroke();
      }
      if (r.doors.w) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - cell / 2, y);
        ctx.stroke();
      }
    }
    for (const r of d.rooms) {
      if (!r.seen && !r.visited) continue;
      const [x, y] = pos(r);
      ctx.beginPath();
      ctx.roundRect(x - size / 2, y - size / 2, size, size, 9);
      if (r === cur) ctx.fillStyle = 'rgba(255,211,90,0.95)';
      else if (r.visited) ctx.fillStyle = r.cleared ? 'rgba(150,140,175,0.9)' : 'rgba(220,90,110,0.9)';
      else ctx.fillStyle = 'rgba(60,55,75,0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
      const iconMap = { stairs: '▼', boss: '☠', treasure: '★', fountain: '◆', start: '⌂' };
      const ic = iconMap[r.type];
      if (ic && (r.visited || r.type === 'boss' || r.type === 'stairs')) {
        ctx.font = '900 22px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = r === cur ? '#3a2400' : r.type === 'fountain' ? '#7ff0e0' : r.type === 'boss' ? '#ff8a9a' : '#fff';
        ctx.fillText(ic, x, y + 1);
      }
    }
    // player arrow
    const p = this.game.player;
    const [px, py] = pos(cur);
    const ox = ((p.pos.x - cur.gx * 20) / 20) * cell;
    const oy = ((p.pos.z + cur.gy * 20) / 20) * cell;
    ctx.save();
    ctx.translate(px + ox, py + oy);
    ctx.rotate(-p.yaw);
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1a1020';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    this.mapLabel.textContent = `Floor ${d.floor}  ·  ${d.rooms.filter((r) => r.visited).length}/${d.rooms.length} rooms`;
  }

  // ============================================================ slots

  slotEl(stack, opts = {}) {
    const s = h('div', 'slot' + (opts.cls ? ' ' + opts.cls : ''));
    if (stack) {
      const r = ITEMS[stack.id]?.rarity;
      if (r && r !== 'common') s.append(h('div', `rarity rarity-${r}`));
      const img = h('img');
      img.src = iconURL(stack.id);
      img.draggable = false;
      s.append(img);
      if (stack.qty > 1) s.append(h('span', 'count', String(stack.qty)));
    } else if (opts.ghost) {
      const img = h('img', 'ghost');
      img.src = iconURL(opts.ghost);
      s.append(img);
    }
    return s;
  }

  // slot descriptor: { get, set, accept?, max?, quick?, pocket? }
  bindSlot(desc, extraCls) {
    const stack = desc.get();
    const el = this.slotEl(stack, { cls: (desc.pocket ? 'pocket ' : '') + (extraCls ?? ''), ghost: desc.ghost });
    if (desc.locked) {
      el.classList.add('locked');
      return el;
    }
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.onSlotClick(desc, e);
    });
    // long-press on touch screens acts as right-click (split a stack)
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (document.body.classList.contains('touch')) this.onSlotClick(desc, { button: 2, shiftKey: false });
    });
    el.addEventListener('mouseenter', () => this.showTooltip(desc.get(), desc));
    el.addEventListener('mouseleave', () => this.hideTooltip());
    return el;
  }

  onSlotClick(desc, e) {
    const cur = desc.get();
    const held = this.held;
    const maxOf = (id) => Math.min(ITEMS[id]?.stack ?? 1, desc.max ?? 99);
    const accept = (s) => !desc.accept || desc.accept(s);
    if (e.button === 0 && e.shiftKey && cur && desc.quick) {
      desc.quick();
    } else if (e.button === 0) {
      if (!held) {
        if (cur) {
          this.held = { ...cur };
          desc.set(null);
        }
      } else if (!cur) {
        if (accept(held)) {
          const n = Math.min(maxOf(held.id), held.qty);
          desc.set({ id: held.id, qty: n });
          held.qty -= n;
          if (held.qty <= 0) this.held = null;
        }
      } else if (cur.id === held.id) {
        const n = Math.min(maxOf(cur.id) - cur.qty, held.qty);
        desc.set({ id: cur.id, qty: cur.qty + n });
        held.qty -= n;
        if (held.qty <= 0) this.held = null;
      } else if (accept(held) && held.qty <= maxOf(held.id)) {
        desc.set({ ...held });
        this.held = { ...cur };
      }
    } else if (e.button === 2) {
      if (!held && cur) {
        const half = Math.ceil(cur.qty / 2);
        this.held = { id: cur.id, qty: half };
        desc.set(cur.qty - half > 0 ? { id: cur.id, qty: cur.qty - half } : null);
      } else if (held && accept(held)) {
        if (!cur) {
          desc.set({ id: held.id, qty: 1 });
          held.qty--;
        } else if (cur.id === held.id && cur.qty < maxOf(cur.id)) {
          desc.set({ id: cur.id, qty: cur.qty + 1 });
          held.qty--;
        }
        if (held.qty <= 0) this.held = null;
      }
    }
    this.game.audio.play('click');
    this.renderHeld();
    this.refreshWindow();
    this.updateHotbar();
  }

  renderHeld() {
    if (!this.held) {
      this.heldEl.classList.add('hidden');
      return;
    }
    this.heldEl.classList.remove('hidden');
    this.heldEl.innerHTML = `<img src="${iconURL(this.held.id)}">${this.held.qty > 1 ? `<span class="count">${this.held.qty}</span>` : ''}`;
    this.heldEl.style.left = (this.mx ?? 0) + 'px';
    this.heldEl.style.top = (this.my ?? 0) + 'px';
    this.hideTooltip();
  }

  returnHeld() {
    if (!this.held) return;
    const st = this.game.state;
    let left = st.bag.add(this.held.id, this.held.qty);
    if (left) left = st.chest.add(this.held.id, left);
    this.held = null;
    this.renderHeld();
  }

  showTooltip(stack, desc = {}) {
    if (!stack || this.held) {
      this.hideTooltip();
      return;
    }
    const it = ITEMS[stack.id] ?? WEAPONS[stack.id];
    const r = it.rarity ?? 'rare';
    let meta = '';
    const led = this.game.state.ledger[stack.id];
    if (led) {
      const parts = ['ecstatic', 'happy', 'meh', 'angry']
        .filter((k) => led[k])
        .map((k) => `<img src="${faceURL(k)}" style="width:14px;vertical-align:-2px"> ${led[k][0] === led[k][1] ? led[k][0] : led[k][0] + '–' + led[k][1]}g`);
      if (parts.length) meta = `<div class="t-meta">${parts.join(' &nbsp; ')}</div>`;
    } else if (ITEMS[stack.id]) {
      meta = `<div class="t-meta" style="color:#b9b6ad">Price unknown — try selling it!</div>`;
    }
    if (desc.pocket) meta += `<div class="t-desc" style="color:#ffd35a">Pocket slot: kept even if you fall in the dungeon.</div>`;
    this.tooltip.innerHTML = `<div class="t-name r-${r}">${it.name}${stack.qty > 1 ? ` ×${stack.qty}` : ''}</div><div class="t-desc">${it.desc}</div>${meta}`;
    this.tooltip.classList.remove('hidden');
    this.placeTooltip();
  }

  placeTooltip() {
    const x = Math.min((this.mx ?? 0) + 16, window.innerWidth - 300);
    const y = Math.min((this.my ?? 0) + 16, window.innerHeight - this.tooltip.offsetHeight - 8);
    this.tooltip.style.left = x + 'px';
    this.tooltip.style.top = y + 'px';
  }

  hideTooltip() {
    this.tooltip.classList.add('hidden');
  }

  containerSlots(container, from, to, other, opts = {}) {
    const out = [];
    for (let i = from; i < to; i++) {
      out.push({
        get: () => container.slots[i],
        set: (s) => (container.slots[i] = s),
        pocket: opts.pocket && i < POCKET_SLOTS,
        locked: opts.lockedFrom !== undefined && i >= opts.lockedFrom,
        quick: other
          ? () => {
              const s = container.slots[i];
              if (!s) return;
              const left = other(s);
              container.slots[i] = left > 0 ? { id: s.id, qty: left } : null;
            }
          : null,
      });
    }
    return out;
  }

  grid(slots, cols) {
    const g = h('div', 'grid');
    g.style.setProperty('--cols', cols);
    slots.forEach((d) => g.append(this.bindSlot(d)));
    return g;
  }

  // ========================================================== windows

  openWindow(name, title, build, opts = {}) {
    this.closeWindow(true);
    const layer = h('div', 'window-layer');
    const win = h('div', 'window');
    const t = h('div', 'title', `<span>${title}</span>`);
    const x = h('button', 'close', '✕');
    x.addEventListener('click', () => this.closeWindow());
    t.append(x);
    const body = h('div', 'body');
    win.append(t, body);
    layer.append(win);
    layer.addEventListener('mousedown', (e) => {
      if (e.target === layer) {
        if (this.held) this.returnHeld();
        else this.closeWindow();
        this.refreshWindow();
      }
    });
    layer.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.append(layer);
    this.window = { layer, win, body, build, name, opts };
    this.windowName = name;
    build(body);
    this.game.setUIOpen(true);
    this.game.audio.play('open');
    return this.window;
  }

  refreshWindow() {
    if (!this.window) return;
    const scroll = this.window.win.scrollTop;
    const focusId = document.activeElement?.id;
    this.window.body.innerHTML = '';
    this.window.build(this.window.body);
    this.window.win.scrollTop = scroll;
    if (focusId) document.getElementById(focusId)?.focus();
  }

  closeWindow(silent = false) {
    if (!this.window) return;
    this.returnHeld();
    this.hideTooltip();
    this.window.opts.onClose?.();
    this.window.layer.remove();
    this.window = null;
    this.windowName = null;
    this.updateHotbar();
    if (!silent) {
      this.game.setUIOpen(false);
      this.game.audio.play('click');
    }
  }

  // ------------------------------------------------------------ inventory

  openInventory() {
    const st = this.game.state;
    this.openWindow('inventory', 'Inventory', (body) => {
      const lay = h('div', 'inv-layout');
      const eq = h('div', 'equip-col');
      eq.append(h('div', 'section-label', 'Weapons'));
      st.equipped.forEach((id, i) => {
        const s = this.slotEl(id ? { id, qty: 1 } : null, { ghost: id ? null : 'empty_weapon' });
        s.classList.add('panel-slot');
        if (i === st.activeWeapon && id) s.classList.add('selected');
        s.addEventListener('mousedown', () => this.cycleWeapon(i));
        s.addEventListener('mouseenter', () => {
          if (!id) return;
          const w = WEAPONS[id];
          this.tooltip.innerHTML = `<div class="t-name r-rare">${w.name}</div><div class="t-desc">${w.desc}</div><div class="t-meta">Damage ${w.dmg}</div><div class="t-desc">Click to switch to another weapon you own.</div>`;
          this.tooltip.classList.remove('hidden');
          this.placeTooltip();
        });
        s.addEventListener('mouseleave', () => this.hideTooltip());
        eq.append(s, h('div', 'slot-label', i === 0 ? 'Main hand' : 'Off hand (Q)'));
      });
      const armor = this.slotEl({ id: `armor_${st.armor}`, qty: 1 });
      eq.append(h('div', 'section-label', 'Armor'), armor, h('div', 'slot-label', ARMOR[st.armor].name));
      lay.append(eq);

      const right = h('div', '');
      right.append(h('div', 'section-label', `<span>Bag</span><span class="note">Gold row = pocket (kept on death)</span>`));
      right.append(this.grid(this.containerSlots(st.bag, 0, st.bag.size, null, { pocket: true }), BAG_COLS));
      const stats = h(
        'div',
        'stats',
        `<b>Health</b> ${Math.ceil(this.game.player.hp)} / ${this.game.player.maxHp}<br>` +
          `<b>Armor</b> ${ARMOR[st.armor].name} (−${Math.round(ARMOR[st.armor].reduce * 100)}% dmg)<br>` +
          `<b>Gold</b> <span class="gold-text">${st.gold.toLocaleString()}</span><br>` +
          `<b>Items sold</b> ${st.stats.sold} · <b>Earned</b> ${st.stats.earned.toLocaleString()}g<br>` +
          `<b>Monsters slain</b> ${st.stats.kills} · <b>Ruins cleared</b> ${st.dungeonClears}`,
      );
      stats.style.marginTop = '12px';
      right.append(stats);
      right.append(h('div', 'hint', document.body.classList.contains('touch')
            ? '<p style="font-size:12px;color:#b9b6ad;margin:10px 0 0">Tap to pick up / place · Long-press to split a stack · Tap a hotbar slot twice to use it</p>'
            : '<p style="font-size:12px;color:#b9b6ad;margin:10px 0 0">Click to pick up · Right-click to split · Shift-click to quick-move · 1–5 select pocket slot · F uses it</p>'));
      lay.append(right);
      body.append(lay);
    });
  }

  cycleWeapon(slot) {
    const st = this.game.state;
    const other = st.equipped[1 - slot];
    const owned = st.weapons.filter((w) => w !== other);
    if (slot === 1) owned.push(null);
    if (!owned.length) return;
    const cur = owned.indexOf(st.equipped[slot]);
    st.equipped[slot] = owned[(cur + 1) % owned.length];
    if (!st.equipped[0]) st.equipped[0] = st.weapons[0];
    if (!st.equipped[st.activeWeapon]) st.activeWeapon = 0;
    this.game.weapons.refresh();
    this.game.audio.play('click');
    this.updateWeapons();
    this.refreshWindow();
  }

  openChest() {
    const st = this.game.state;
    this.openWindow('chest', 'Storage Chest', (body) => {
      body.append(h('div', 'section-label', `<span>Chest</span><span class="note">Shift-click to move items</span>`));
      body.append(this.grid(this.containerSlots(st.chest, 0, st.chest.size, (s) => st.bag.add(s.id, s.qty)), 9));
      body.append(h('div', 'section-label', `<span>Bag</span><span class="note">Gold row = pocket</span>`));
      body.append(this.grid(this.containerSlots(st.bag, 0, st.bag.size, (s) => st.chest.add(s.id, s.qty), { pocket: true }), 9));
      const row = h('div', 'row-flex');
      row.style.marginTop = '12px';
      const dep = h('button', 'btn small', 'Deposit all loot');
      dep.addEventListener('click', () => {
        for (let i = 0; i < st.bag.size; i++) {
          const s = st.bag.slots[i];
          if (!s || ITEMS[s.id].heal) continue;
          const left = st.chest.add(s.id, s.qty);
          st.bag.slots[i] = left ? { id: s.id, qty: left } : null;
        }
        this.game.audio.play('pickup');
        this.refreshWindow();
      });
      row.append(dep);
      body.append(row);
    });
  }

  // ------------------------------------------------------------ pedestal

  openPedestal(index) {
    const st = this.game.state;
    const ped = st.pedestals[index];
    const shopArea = this.game.areas.shop;
    const sellable = (s) => !!ITEMS[s.id];
    const setPrice = (v) => {
      ped.price = Math.max(1, Math.min(999999, Math.round(v) || 1));
      shopArea.refreshPedestals();
    };
    const defaultPrice = (id) => {
      const led = st.ledger[id];
      if (led?.last) return led.last;
      if (led?.happy) return led.happy[1];
      return 100;
    };
    const pedSlot = {
      get: () => ped.item,
      set: (s) => {
        const had = ped.item?.id;
        ped.item = s;
        if (s && s.id !== had) {
          ped.price = defaultPrice(s.id);
        }
        shopArea.refreshPedestals();
      },
      accept: sellable,
    };
    const toPedestal = (s) => {
      if (ped.item && ped.item.id !== s.id) return s.qty;
      const max = ITEMS[s.id].stack;
      const have = ped.item?.qty ?? 0;
      const n = Math.min(max - have, s.qty);
      pedSlot.set({ id: s.id, qty: have + n });
      return s.qty - n;
    };
    pedSlot.quick = () => {
      const s = ped.item;
      let left = st.bag.add(s.id, s.qty);
      if (left) left = st.chest.add(s.id, left);
      ped.item = left ? { id: s.id, qty: left } : null;
      shopArea.refreshPedestals();
    };

    this.openWindow(
      'pedestal',
      'Display Table',
      (body) => {
        const lay = h('div', 'inv-layout');
        const box = h('div', 'price-box');
        const top = h('div', 'row-flex');
        const slot = this.bindSlot(pedSlot);
        slot.style.setProperty('--slot', '72px');
        const name = h('div', '', ped.item ? `<b style="font-size:17px">${itemName(ped.item.id)}</b><br><span style="color:#b9b6ad;font-size:13px">×${ped.item.qty} on display</span>` : '<span style="color:#b9b6ad">Click an item in your bag or chest, then click this slot.<br>Shift-click an item to place it directly.</span>');
        top.append(slot, name);
        box.append(top);
        if (ped.item) {
          const pi = h('div', 'price-input');
          const mk = (label, d) => {
            const b = h('button', 'btn small', label);
            b.addEventListener('click', () => {
              setPrice(ped.price + d);
              this.game.audio.play('click');
              input.value = ped.price;
              updateHint();
            });
            return b;
          };
          const input = h('input');
          input.id = 'price-input';
          input.type = 'number';
          input.min = '1';
          input.value = ped.price;
          input.addEventListener('input', () => {
            setPrice(Number(input.value));
            updateHint();
          });
          pi.append(mk('−100', -100), mk('−10', -10), mk('−1', -1), input, mk('+1', 1), mk('+10', 10), mk('+100', 100));
          box.append(h('div', 'section-label', 'Price per item'), pi);
          const total = h('div', '', '');
          box.append(total);
          const hint = h('div', 'ledger-hint');
          box.append(h('div', 'section-label', 'Customer reactions you have seen'), hint);
          const updateHint = () => {
            total.innerHTML = `Stack value: <span class="gold-text">${(ped.price * ped.item.qty).toLocaleString()}g</span>`;
            const led = st.ledger[ped.item.id] ?? {};
            hint.innerHTML = '';
            let any = false;
            for (const k of ['ecstatic', 'happy', 'meh', 'angry']) {
              if (!led[k]) continue;
              any = true;
              const r = led[k];
              hint.append(h('img', 'face'));
              hint.lastChild.src = faceURL(k);
              hint.append(h('div', '', `${REACTION_LABEL[k]} — <b>${r[0] === r[1] ? r[0] : r[0] + '–' + r[1]}g</b>`));
            }
            if (!any) hint.append(h('div', '', ''), h('div', '', 'No data yet. Watch customers’ faces to learn the right price!'));
            led.last = ped.price;
            st.ledger[ped.item.id] = led;
          };
          updateHint();
          const tip = h(
            'div',
            '',
            `<p style="font-size:12px;color:#b9b6ad;margin:4px 0 0;line-height:1.5">😍 = too cheap (you are losing money) · 🙂 = perfect · 😓 = pricey, may still buy · 😠 = won't buy. Selling lots of one item lowers its demand for a while.</p>`,
          );
          box.append(tip);
        }
        lay.append(box);
        const right = h('div', '');
        right.append(h('div', 'section-label', `<span>Bag</span><span class="note">Shift-click to display</span>`));
        right.append(this.grid(this.containerSlots(st.bag, 0, st.bag.size, toPedestal, { pocket: true }), BAG_COLS));
        right.append(h('div', 'section-label', 'Storage chest'));
        right.append(this.grid(this.containerSlots(st.chest, 0, st.chest.size, toPedestal), 9));
        lay.append(right);
        body.append(lay);
      },
      { onClose: () => shopArea.refreshPedestals() },
    );
  }

  // ------------------------------------------------------------ crafting

  reqChips(mats, cost) {
    const st = this.game.state;
    const wrap = h('div', 'reqs');
    for (const [id, n] of Object.entries(mats)) {
      const have = st.countMaterial(id);
      const c = h('span', `req ${have >= n ? 'ok' : 'missing'}`, `<img src="${iconURL(id)}">${have}/${n} ${ITEMS[id].name}`);
      wrap.append(c);
    }
    if (cost) wrap.append(h('span', `req ${st.gold >= cost ? 'ok' : 'missing'}`, `<span class="coin" style="width:14px;height:14px"></span>${cost.toLocaleString()}g`));
    return wrap;
  }

  openForge() {
    const st = this.game.state;
    this.openWindow('forge', 'Brom’s Forge', (body) => {
      body.append(h('div', 'dialog-text', '“Bring me materials from the ruins and I’ll hammer out something that’ll keep you breathing.”'));
      const list = h('div', 'recipes');
      list.style.marginTop = '12px';
      for (const r of FORGE_RECIPES) {
        const isArmor = r.kind === 'armor';
        const name = isArmor ? ARMOR[r.tier].name : WEAPONS[r.id].name;
        const desc = isArmor ? `Reduces damage by ${Math.round(ARMOR[r.tier].reduce * 100)}% and adds ${ARMOR[r.tier].hp} max health.` : WEAPONS[r.id].desc + ` Damage ${WEAPONS[r.id].dmg}.`;
        const owned = isArmor ? st.armor >= r.tier : st.weapons.includes(r.id);
        const prereq = isArmor ? st.armor >= r.tier - 1 : !r.requires || st.weapons.includes(r.requires);
        const row = h('div', 'recipe' + (owned ? ' owned' : ''));
        const icon = this.slotEl({ id: r.id, qty: 1 });
        const info = h('div', 'info', `<div class="name">${name}</div><div class="desc">${desc}${r.requires ? ` <i>Upgrades your ${WEAPONS[r.requires].name}.</i>` : ''}</div>`);
        info.append(this.reqChips(r.mats, r.cost));
        const btn = h('button', 'btn small gold', owned ? 'Owned' : !prereq ? 'Locked' : 'Forge');
        const can = !owned && prereq && st.gold >= r.cost && st.hasMaterials(r.mats);
        if (!can) btn.disabled = true;
        btn.addEventListener('click', () => {
          if (!can) return;
          st.gold -= r.cost;
          st.consumeMaterials(r.mats);
          if (isArmor) {
            st.armor = r.tier;
            this.game.player.hp = Math.min(this.game.player.maxHp, this.game.player.hp + ARMOR[r.tier].hp);
          } else if (r.requires) {
            st.weapons = st.weapons.map((w) => (w === r.requires ? r.id : w));
            st.equipped = st.equipped.map((w) => (w === r.requires ? r.id : w));
          } else {
            st.weapons.push(r.id);
            if (!st.equipped[1]) st.equipped[1] = r.id;
          }
          this.game.audio.play('levelup');
          this.message(`Forged <b>${name}</b>!`, r.id);
          this.game.weapons.refresh();
          this.refreshHUD();
          this.refreshWindow();
          st.save();
        });
        row.append(icon, info, btn);
        list.append(row);
      }
      body.append(list);
    });
  }

  openPotions() {
    const st = this.game.state;
    this.openWindow('potions', 'Mirelle’s Apothecary', (body) => {
      body.append(h('div', 'dialog-text', '“Potions, dearie? Keep them in your pocket row — press <b>F</b> (or <b>H</b>) in the ruins to drink one.”'));
      const list = h('div', 'recipes');
      list.style.marginTop = '12px';
      for (const r of POTION_RECIPES) {
        const it = ITEMS[r.id];
        const row = h('div', 'recipe');
        const info = h('div', 'info', `<div class="name">${it.name}</div><div class="desc">${it.desc}</div>`);
        info.append(this.reqChips(r.mats, r.cost));
        const can = st.gold >= r.cost && st.hasMaterials(r.mats) && (st.bag.canFit(r.id) || st.chest.canFit(r.id));
        const btn = h('button', 'btn small gold', r.label ?? 'Brew');
        if (!can) btn.disabled = true;
        btn.addEventListener('click', () => {
          if (!can) return;
          st.gold -= r.cost;
          st.consumeMaterials(r.mats);
          if (st.bag.add(r.id, 1)) st.chest.add(r.id, 1);
          this.game.audio.play('drink');
          this.message(`Got <b>${it.name}</b>`, r.id);
          this.refreshHUD();
          this.refreshWindow();
        });
        row.append(this.slotEl({ id: r.id, qty: 1 }), info, btn);
        list.append(row);
      }
      body.append(list);
    });
  }

  openUpgrades() {
    const st = this.game.state;
    this.openWindow('upgrades', 'Tomo’s Workshop', (body) => {
      body.append(h('div', 'dialog-text', '“A fine shop sells finer goods. Let me spruce the place up for you!”'));
      const list = h('div', 'recipes');
      list.style.marginTop = '12px';
      for (const u of SHOP_UPGRADES) {
        const owned = !!st.upgrades[u.id];
        const row = h('div', 'recipe' + (owned ? ' owned' : ''));
        const info = h('div', 'info', `<div class="name">${u.name}</div><div class="desc">${u.desc}</div>`);
        info.append(this.reqChips({}, u.cost));
        const can = !owned && st.gold >= u.cost;
        const btn = h('button', 'btn small gold', owned ? 'Owned' : 'Buy');
        if (!can) btn.disabled = true;
        btn.addEventListener('click', () => {
          if (!can) return;
          st.gold -= u.cost;
          st.upgrades[u.id] = true;
          if (u.id === 'bag') st.bag.resize(st.bagSize());
          this.game.areas.shop.applyUpgrades();
          this.game.audio.play('levelup');
          this.message(`Purchased <b>${u.name}</b>!`);
          this.refreshHUD();
          this.refreshWindow();
          st.save();
        });
        const icon = h('div', 'slot', `<span style="font-size:26px">${{ expand: '🪵', rug: '🧶', chandelier: '💎', bag: '🎒', pendant: '📿' }[u.id]}</span>`);
        row.append(icon, info, btn);
        list.append(row);
      }
      body.append(list);
    });
  }

  openLedger() {
    const st = this.game.state;
    this.openWindow('ledger', 'Merchant’s Ledger', (body) => {
      body.append(h('div', 'dialog-text', 'Every customer reaction you observe is written down here. Use it to find the perfect price for each item.'));
      const grid = h('div', 'ledger');
      grid.style.marginTop = '12px';
      for (const [id, it] of Object.entries(ITEMS)) {
        const led = st.ledger[id];
        const known = led || st.discovered?.[id];
        const e = h('div', 'ledger-entry' + (known ? '' : ' unknown'));
        e.append(this.slotEl(known ? { id, qty: 1 } : null));
        const lines = ['ecstatic', 'happy', 'meh', 'angry']
          .filter((k) => led?.[k])
          .map((k) => `<img src="${faceURL(k)}" style="width:14px;vertical-align:-2px"> ${led[k][0] === led[k][1] ? led[k][0] : led[k][0] + '–' + led[k][1]}g`)
          .join('<br>');
        const dm = st.demandFor(id);
        const demand = known ? (dm > 1.15 ? ' <span style="color:#7ee07a">▲ in demand</span>' : dm < 0.85 ? ' <span style="color:#ff8a8a">▼ low demand</span>' : '') : '';
        e.append(h('div', '', `<div class="name">${known ? it.name : '???'}${demand}</div><div class="ranges">${lines || (known ? 'No reactions recorded yet' : 'Not yet discovered')}</div>`));
        grid.append(e);
      }
      body.append(grid);
    });
  }

  openNotice() {
    const st = this.game.state;
    this.openWindow('notice', 'Village Notice Board', (body) => {
      const hot = st.hot ? ITEMS[st.hot] : null;
      body.append(
        h(
          'div',
          'dialog-text',
          `${hot ? `<p>📣 <b>Today’s craze:</b> everyone wants <b>${hot.name}</b>! Customers will pay a lot more for it today.</p>` : ''}
          <p>📜 <b>How business works:</b> Gather loot in the <b>Hollow Ruins</b> (south gate). Place it on display tables in your shop, set a price and open the shop by the register. Watch each customer's face: 😍 means you asked too little, 🙂 is perfect, 😓 is pricey and 😠 means no sale. Everything you learn goes into your ledger.</p>
          <p>⚔️ <b>Surviving the ruins:</b> <kbd>LMB</kbd> attack · <kbd>RMB</kbd> shield/block · <kbd>Space</kbd> dodge roll (you can't be hit mid-roll) · <kbd>Q</kbd> swap weapon · <kbd>F</kbd>/<kbd>H</kbd> drink potion. Hold <kbd>R</kbd> to use your Merchant Pendant and teleport home with your loot (costs gold). If you fall, you lose everything except your pocket row (the gold-bordered top row of your bag).</p>
          <p>🏪 <b>Services:</b> Brom the smith (west) forges weapons and armor. Mirelle (east) brews potions. Tomo (north-west) upgrades your shop.</p>
          <p>📊 Days: ${st.day} · Items sold: ${st.stats.sold} · Gold earned: ${st.stats.earned.toLocaleString()} · Deepest floor: ${st.deepestFloor} · Ruins cleared: ${st.dungeonClears}</p>`,
        ),
      );
    });
  }

  // ============================================================ screens

  clearScreen() {
    if (this.screen) this.screen.remove();
    this.screen = null;
  }

  showScreen(el) {
    this.clearScreen();
    this.screen = el;
    this.root.append(el);
  }

  btn(label, fn, cls = '') {
    const b = h('button', 'btn ' + cls, label);
    b.addEventListener('click', () => {
      this.game.audio.init();
      this.game.audio.play('click');
      fn();
    });
    return b;
  }

  showLoading(progress, text) {
    if (!this._loading) {
      this._loading = h('div', 'screen', `<h1>Moonlit Merchant</h1><div class="subtitle">loading</div><div class="loading-bar"><div></div></div><div class="hint"></div>`);
      this.root.append(this._loading);
    }
    this._loading.querySelector('.loading-bar div').style.width = `${progress * 100}%`;
    this._loading.querySelector('.hint').textContent = text ?? '';
    if (progress >= 1) {
      this._loading.remove();
      this._loading = null;
    }
  }

  showMenu() {
    const s = h('div', 'screen clear');
    s.append(h('h1', '', 'Moonlit Merchant'));
    s.append(h('div', 'splash', SPLASHES[Math.floor(Math.random() * SPLASHES.length)]));
    s.append(h('div', 'subtitle', 'shopkeeper by day · adventurer by night'));
    if (this.game.state.hasSave()) s.append(this.btn('Continue', () => this.game.continueGame(), 'gold'));
    s.append(this.btn('New Game', () => this.game.newGame(), this.game.state.hasSave() ? '' : 'gold'));
    s.append(this.btn('How to Play', () => this.showHelp(() => this.showMenu())));
    s.append(this.btn('Settings', () => this.showSettings(() => this.showMenu())));
    s.append(h('div', 'footer', '<span>A first-person homage to the shop-keeping dungeon crawler genre</span><span>Made with three.js</span>'));
    this.showScreen(s);
  }

  showHelp(back) {
    const s = h('div', 'screen');
    s.append(h('h2', '', 'How to Play'));
    s.append(
      h(
        'div',
        'hint',
        'By day, run your shop: put dungeon loot on display tables, set prices and read your customers’ faces to learn what things are worth. By night (or any time), venture into the Hollow Ruins to collect more loot. Spend your earnings on better weapons, armor, potions and shop upgrades. Defeat the Colossus on floor 3!',
      ),
    );
    const g = h('div', 'controls-grid');
    [
      ['WASD / Mouse', 'Move / look'],
      ['E', 'Interact · pick up'],
      ['Tab or I', 'Inventory'],
      ['LMB', 'Attack (hold for bow draw)'],
      ['RMB', 'Block with shield'],
      ['Space', 'Dodge roll (dungeon)'],
      ['Q', 'Swap weapon'],
      ['1–5 / Wheel', 'Select pocket slot'],
      ['F / H', 'Use item / quick heal'],
      ['Hold R', 'Merchant Pendant: go home'],
      ['L', 'Price ledger'],
      ['F3', 'Debug info'],
      ['Esc', 'Pause'],
    ].forEach(([k, v]) => g.append(h('b', '', k), h('span', '', v)));
    s.append(g);
    s.append(this.btn('Back', back));
    this.showScreen(s);
  }

  showSettings(back) {
    const game = this.game;
    const s = h('div', 'screen');
    s.append(h('h2', '', 'Settings'));
    const grid = h('div', 'settings');
    const seg = (opts, cur, fn) => {
      const w = h('div', 'seg');
      opts.forEach(([v, label]) => {
        const b = h('button', v === cur ? 'on' : '', label);
        b.addEventListener('click', () => {
          fn(v);
          w.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          game.audio.play('click');
        });
        w.append(b);
      });
      return w;
    };
    const slider = (min, max, step, val, fn) => {
      const r = h('input');
      r.type = 'range';
      r.min = min;
      r.max = max;
      r.step = step;
      r.value = val;
      r.addEventListener('input', () => fn(Number(r.value)));
      return r;
    };
    grid.append(
      h('span', '', 'Graphics'),
      seg(
        [
          ['low', 'Low'],
          ['medium', 'Medium'],
          ['high', 'High'],
          ['ultra', 'Ultra'],
        ],
        game.engine.quality,
        (v) => game.setQuality(v),
      ),
    );
    grid.append(h('span', '', 'Mouse sensitivity'), slider(0.0005, 0.005, 0.0001, game.player.sensitivity, (v) => game.setSetting('sensitivity', v)));
    grid.append(h('span', '', 'Field of view'), slider(60, 100, 1, game.player.fov, (v) => game.setSetting('fov', v)));
    grid.append(h('span', '', 'Master volume'), slider(0, 1, 0.01, game.audio.volume, (v) => game.setSetting('volume', v)));
    grid.append(h('span', '', 'Music volume'), slider(0, 1, 0.01, game.audio.musicVolume, (v) => game.setSetting('music', v)));
    s.append(grid);
    s.append(this.btn('Done', back));
    this.showScreen(s);
  }

  showPause() {
    const s = h('div', 'screen');
    s.append(h('h2', '', 'Game Paused'));
    s.append(this.btn('Back to Game', () => this.game.resume(), 'gold'));
    s.append(this.btn('How to Play', () => this.showHelp(() => this.showPause())));
    s.append(this.btn('Settings', () => this.showSettings(() => this.showPause())));
    s.append(this.btn('Save & Quit to Title', () => this.game.quitToMenu()));
    this.showScreen(s);
  }

  showDeath(lost) {
    const s = h('div', 'screen');
    s.style.background = 'radial-gradient(ellipse at center, rgba(80,0,10,0.45), rgba(10,0,4,0.85))';
    s.append(h('h2', '', 'You were defeated…'));
    s.append(
      h(
        'div',
        'hint',
        lost > 0
          ? `A wandering traveler dragged you back to town. You lost <b>${lost}</b> item${lost > 1 ? 's' : ''} from your bag — only your pocket row was kept.`
          : 'A wandering traveler dragged you back to town. Your pocket row was kept safe.',
      ),
    );
    s.append(this.btn('Wake up', () => this.game.respawnAfterDeath(), 'gold'));
    this.showScreen(s);
  }

  async fadeOut() {
    this.fade.classList.add('on');
    await new Promise((r) => setTimeout(r, 480));
  }

  async fadeIn() {
    await new Promise((r) => setTimeout(r, 60));
    this.fade.classList.remove('on');
  }

  toggleDebug() {
    this.debug.classList.toggle('hidden');
  }
}
