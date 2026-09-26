// Keyboard / mouse input with pointer-lock and per-frame edge detection.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouse = { dx: 0, dy: 0, x: 0, y: 0, buttons: new Set(), pressed: new Set(), released: new Set(), wheel: 0 };
    this.locked = false;
    this.axis = { x: 0, y: 0 }; // analog movement (touch joystick)
    this.lockDisabled = false; // touch devices never use pointer lock
    this.freeLook = false; // fallback when pointer lock is unavailable (e.g. sandboxed iframes)
    this.onLockFail = null;
    this.everLocked = false;
    this.onLockChange = null;
    this.onKey = null; // raw keydown hook for UI

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        if (e.code === 'Escape' || e.code === 'Enter') e.target.blur();
        else return;
      }
      if (['Tab', 'Space', 'F3', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.keys.add(e.code);
        this.pressed.add(e.code);
      }
      this.onKey?.(e);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.released.add(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.buttons.clear();
    });
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.locked || this.freeLook) {
        // clamp giant spikes some browsers emit when re-locking
        this.mouse.dx += Math.max(-250, Math.min(250, e.movementX));
        this.mouse.dy += Math.max(-250, Math.min(250, e.movementY));
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.locked && !(this.freeLook && e.target === this.canvas)) return;
      this.mouse.buttons.add(e.button);
      this.mouse.pressed.add(e.button);
    });
    document.addEventListener('mouseup', (e) => {
      this.mouse.buttons.delete(e.button);
      this.mouse.released.add(e.button);
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener(
      'wheel',
      (e) => {
        if (this.locked || this.freeLook) this.mouse.wheel += Math.sign(e.deltaY);
      },
      { passive: true },
    );
    document.addEventListener('pointerlockerror', () => this.lockFailed());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this.locked) this.everLocked = true;
      if (!this.locked) {
        this.mouse.buttons.clear();
        this.keys.clear();
      }
      this.onLockChange?.(this.locked);
    });
  }

  lock() {
    if (this.locked || this.lockDisabled || this.freeLook) return;
    if (!this.canvas.requestPointerLock) return this.lockFailed();
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: false });
      if (p && p.catch) p.catch((err) => {
        // a user-gesture error is recoverable; anything else means lock is unsupported here
        if (!/gesture|activation/i.test(String(err))) this.lockFailed();
      });
    } catch {
      /* ignore: needs a user gesture */
    }
  }

  // Only fall back to free-look if pointer lock has never worked on this page
  // (a re-lock that is merely too soon after Esc is not a real failure).
  lockFailed() {
    if (!this.everLocked) this.onLockFail?.();
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  down(code) {
    return this.keys.has(code);
  }

  hit(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouse.pressed.clear();
    this.mouse.released.clear();
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mouse.wheel = 0;
  }
}
