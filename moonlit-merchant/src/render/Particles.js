import * as THREE from 'three';

// CPU-simulated, GPU-drawn soft particles (sparks, dust, smoke, magic).
export class Particles {
  constructor(capacity = 1500, additive = true) {
    this.cap = capacity;
    this.count = 0;
    this.p = new Float32Array(capacity * 3);
    this.v = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);

    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('color', this.aCol);
    geo.setAttribute('size', this.aSize);
    geo.setAttribute('alpha', this.aAlpha);
    geo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: window.innerHeight * 0.5 } },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uScale;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          if (a * vAlpha < 0.003) discard;
          gl_FragColor = vec4(vColor, a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.points.userData.noAO = true;
    window.addEventListener('resize', () => (mat.uniforms.uScale.value = window.innerHeight * 0.5));
  }

  emit(o) {
    if (this.count >= this.cap) return;
    const i = this.count++;
    const i3 = i * 3;
    this.p[i3] = o.x;
    this.p[i3 + 1] = o.y;
    this.p[i3 + 2] = o.z;
    this.v[i3] = o.vx ?? 0;
    this.v[i3 + 1] = o.vy ?? 0;
    this.v[i3 + 2] = o.vz ?? 0;
    const c = o.color ?? [1, 1, 1];
    this.col[i3] = c[0];
    this.col[i3 + 1] = c[1];
    this.col[i3 + 2] = c[2];
    this.size[i] = o.size ?? 0.1;
    this.life[i] = this.maxLife[i] = o.life ?? 1;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.grow[i] = o.grow ?? 0;
    this.alpha[i] = o.alpha ?? 1;
    this._baseAlpha ??= new Float32Array(this.cap);
    this._baseAlpha[i] = o.alpha ?? 1;
  }

  burst(pos, n, opts = {}) {
    const speed = opts.speed ?? 3;
    for (let k = 0; k < n; k++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + Math.random() * 0.6);
      const up = opts.up ?? 0;
      this.emit({
        x: pos.x + (Math.random() - 0.5) * (opts.spread ?? 0.2),
        y: pos.y + (Math.random() - 0.5) * (opts.spread ?? 0.2),
        z: pos.z + (Math.random() - 0.5) * (opts.spread ?? 0.2),
        vx: Math.sin(ph) * Math.cos(th) * s,
        vy: Math.cos(ph) * s + up,
        vz: Math.sin(ph) * Math.sin(th) * s,
        color: opts.color,
        size: (opts.size ?? 0.12) * (0.6 + Math.random() * 0.8),
        life: (opts.life ?? 0.6) * (0.6 + Math.random() * 0.8),
        gravity: opts.gravity ?? 6,
        drag: opts.drag ?? 1.5,
        grow: opts.grow ?? 0,
        alpha: opts.alpha ?? 1,
      });
    }
  }

  update(dt) {
    let i = 0;
    while (i < this.count) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // swap-remove with last
        const last = --this.count;
        if (i !== last) this._copy(last, i);
        continue;
      }
      const i3 = i * 3;
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.v[i3] *= dr;
      this.v[i3 + 1] = this.v[i3 + 1] * dr - this.grav[i] * dt;
      this.v[i3 + 2] *= dr;
      this.p[i3] += this.v[i3] * dt;
      this.p[i3 + 1] += this.v[i3 + 1] * dt;
      this.p[i3 + 2] += this.v[i3 + 2] * dt;
      this.size[i] += this.grow[i] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = this._baseAlpha[i] * Math.min(1, t * 2.5) * Math.min(1, (1 - t) * 8 + 0.2);
      i++;
    }
    const geo = this.points.geometry;
    geo.setDrawRange(0, this.count);
    this.aPos.needsUpdate = true;
    this.aCol.needsUpdate = true;
    this.aSize.needsUpdate = true;
    this.aAlpha.needsUpdate = true;
  }

  _copy(from, to) {
    const f3 = from * 3;
    const t3 = to * 3;
    for (let k = 0; k < 3; k++) {
      this.p[t3 + k] = this.p[f3 + k];
      this.v[t3 + k] = this.v[f3 + k];
      this.col[t3 + k] = this.col[f3 + k];
    }
    this.size[to] = this.size[from];
    this.alpha[to] = this.alpha[from];
    this._baseAlpha[to] = this._baseAlpha[from];
    this.life[to] = this.life[from];
    this.maxLife[to] = this.maxLife[from];
    this.grav[to] = this.grav[from];
    this.drag[to] = this.drag[from];
    this.grow[to] = this.grow[from];
  }

  clear() {
    this.count = 0;
  }
}
