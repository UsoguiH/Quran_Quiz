// On-screen controls for phones and tablets.
// - Left side: floating joystick (touch anywhere on the left 40% of the screen)
// - Right side: drag to look
// - Button cluster: attack, block, roll, interact, swap, heal, pendant
// Buttons feed the same Input state the keyboard/mouse use, so gameplay code
// needs no special cases.

const h = (tag, cls, html) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html !== undefined) el.innerHTML = html;
  return el;
};

export function isTouchDevice() {
  return (
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
    window.matchMedia?.('(pointer: coarse)').matches !== false
  );
}

const STICK_R = 56;
const LOOK_SPEED = 1.5;

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.input = game.input;
    this.stickId = null;
    this.lookId = null;
    this.origin = { x: 0, y: 0 };
    this.last = { x: 0, y: 0 };

    this.el = h('div', 'touch-controls hidden');
    this.base = h('div', 'joy-base');
    this.knob = h('div', 'joy-knob');
    this.base.append(this.knob);
    this.el.append(this.base);

    const cluster = h('div', 'touch-cluster');
    this.buttons = {};
    const btn = (id, label, cls, down, up) => {
      const b = h('button', 'tbtn ' + cls, label);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          b.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic events */
        }
        b.classList.add('down');
        this.game.audio.init();
        down();
      });
      const release = (e) => {
        e.preventDefault();
        b.classList.remove('down');
        up?.();
      };
      b.addEventListener('pointerup', release);
      b.addEventListener('pointercancel', release);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      this.buttons[id] = b;
      return b;
    };
    const m = this.input.mouse;
    const press = (code) => () => this.input.pressed.add(code);
    const hold = (code) => () => {
      this.input.keys.add(code);
      this.input.pressed.add(code);
    };
    const unhold = (code) => () => this.input.keys.delete(code);

    cluster.append(
      btn('attack', '⚔️', 'big attack', () => {
        m.buttons.add(0);
        m.pressed.add(0);
      }, () => {
        m.buttons.delete(0);
        m.released.add(0);
      }),
      btn('block', '🛡️', 'block', () => {
        m.buttons.add(2);
        m.pressed.add(2);
      }, () => m.buttons.delete(2)),
      btn('roll', '💨', 'roll', press('Space')),
      btn('interact', '✋', 'interact', press('KeyE')),
      btn('swap', '🔄', 'swap', press('KeyQ')),
      btn('heal', '❤️', 'heal', press('KeyH')),
      btn('pendant', '🌙', 'pendant', hold('KeyR'), unhold('KeyR')),
    );
    this.el.append(cluster);

    const top = h('div', 'touch-top');
    top.append(
      btn('inv', '🎒', 'small', press('KeyI')),
      btn('ledger', '📖', 'small', press('KeyL')),
      btn('pause', '⏸', 'small', () => this.game.pause()),
    );
    this.el.append(top);

    this.rotate = h(
      'div',
      'rotate-hint',
      '<div class="phone">📱</div><div>Turn your phone sideways to play</div>',
    );

    document.getElementById('ui-root').append(this.el, this.rotate);
    this.bindCanvas(game.engine.renderer.domElement);
  }

  bindCanvas(canvas) {
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || !this.active()) return;
      e.preventDefault();
      this.game.audio.init();
      if (e.clientX < window.innerWidth * 0.4 && this.stickId === null) {
        this.stickId = e.pointerId;
        this.origin = { x: e.clientX, y: e.clientY };
        this.moveStick(e.clientX, e.clientY);
      } else if (this.lookId === null) {
        this.lookId = e.pointerId;
        this.last = { x: e.clientX, y: e.clientY };
      }
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic events */
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId) this.moveStick(e.clientX, e.clientY);
      else if (e.pointerId === this.lookId) {
        this.input.mouse.dx += (e.clientX - this.last.x) * LOOK_SPEED;
        this.input.mouse.dy += (e.clientY - this.last.y) * LOOK_SPEED;
        this.last = { x: e.clientX, y: e.clientY };
      }
    });
    const end = (e) => {
      if (e.pointerId === this.stickId) {
        this.stickId = null;
        this.input.axis.x = 0;
        this.input.axis.y = 0;
      }
      if (e.pointerId === this.lookId) this.lookId = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  moveStick(x, y) {
    let dx = x - this.origin.x;
    let dy = y - this.origin.y;
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) {
      // drag the base along so the stick never "sticks" at the edge
      this.origin.x += (dx / len) * (len - STICK_R);
      this.origin.y += (dy / len) * (len - STICK_R);
      dx = x - this.origin.x;
      dy = y - this.origin.y;
    }
    this.input.axis.x = dx / STICK_R;
    this.input.axis.y = -dy / STICK_R;
  }

  active() {
    const g = this.game;
    return g.mode === 'play' && !g.paused && !g.uiOpen && !g.player.dead;
  }

  reset() {
    this.stickId = null;
    this.lookId = null;
    this.input.axis.x = this.input.axis.y = 0;
    this.input.mouse.buttons.clear();
    this.input.keys.clear();
    Object.values(this.buttons).forEach((b) => b.classList.remove('down'));
  }

  update() {
    const g = this.game;
    const show = this.active();
    if (show !== this._shown) {
      this._shown = show;
      this.el.classList.toggle('hidden', !show);
      if (!show) this.reset();
    }
    if (!show) return;
    const combat = g.area?.combat;
    const b = this.buttons;
    b.block.classList.toggle('hidden', !combat);
    b.roll.classList.toggle('hidden', !combat);
    b.pendant.classList.toggle('hidden', !combat);
    b.heal.classList.toggle('hidden', !combat);
    b.swap.classList.toggle('hidden', !combat || !g.state.equipped[1]);
    b.attack.classList.toggle('hidden', !combat);
    b.interact.classList.toggle('ready', !!g.currentInteract);
    b.interact.classList.toggle('hidden', combat && !g.currentInteract);

    // joystick visual
    const active = this.stickId !== null;
    this.base.classList.toggle('active', active);
    const ox = active ? this.origin.x : 110;
    const oy = active ? this.origin.y : window.innerHeight - 120;
    this.base.style.left = ox + 'px';
    this.base.style.top = oy + 'px';
    this.knob.style.transform = `translate(calc(-50% + ${this.input.axis.x * STICK_R}px), calc(-50% + ${-this.input.axis.y * STICK_R}px))`;
  }
}
