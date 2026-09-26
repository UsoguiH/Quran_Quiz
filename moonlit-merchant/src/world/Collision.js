// 2D (XZ-plane) collision: axis-aligned boxes and circles.
export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.circles = [];
  }

  clear() {
    this.boxes.length = 0;
    this.circles.length = 0;
  }

  addBox(minX, minZ, maxX, maxZ, data = {}) {
    const b = { minX, minZ, maxX, maxZ, active: true, ...data };
    this.boxes.push(b);
    return b;
  }

  addBoxCentered(x, z, w, d, data) {
    return this.addBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2, data);
  }

  addCircle(x, z, r, data = {}) {
    const c = { x, z, r, active: true, ...data };
    this.circles.push(c);
    return c;
  }

  // Push a circle (pos.x, pos.z, radius) out of all colliders. Returns true on contact.
  resolve(pos, radius) {
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.boxes) {
        if (!b.active) continue;
        if (pos.x < b.minX - radius || pos.x > b.maxX + radius || pos.z < b.minZ - radius || pos.z > b.maxZ + radius) continue;
        const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        let dx = pos.x - cx;
        let dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        hit = moved = true;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          const push = (radius - d) / d;
          pos.x += dx * push;
          pos.z += dz * push;
        } else {
          // centre inside the box: push out along the smallest axis
          const l = pos.x - b.minX;
          const r = b.maxX - pos.x;
          const t = pos.z - b.minZ;
          const bt = b.maxZ - pos.z;
          const m = Math.min(l, r, t, bt);
          if (m === l) pos.x = b.minX - radius;
          else if (m === r) pos.x = b.maxX + radius;
          else if (m === t) pos.z = b.minZ - radius;
          else pos.z = b.maxZ + radius;
        }
      }
      for (const c of this.circles) {
        if (!c.active) continue;
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const rr = radius + c.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        hit = moved = true;
        const d = Math.sqrt(d2) || 1e-4;
        pos.x = c.x + (dx / d) * rr;
        pos.z = c.z + (dz / d) * rr;
      }
      if (!moved) break;
    }
    return hit;
  }

  pointBlocked(x, z, pad = 0) {
    for (const b of this.boxes) {
      if (!b.active || b.low) continue;
      if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) return true;
    }
    return false;
  }

  // Ray-march line of sight test (for AI).
  lineClear(ax, az, bx, bz, step = 0.5) {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    const n = Math.ceil(len / step);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.pointBlocked(ax + dx * t, az + dz * t)) return false;
    }
    return true;
  }
}
