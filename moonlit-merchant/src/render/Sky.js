import * as THREE from 'three';

// Physically-inspired stylised sky: gradient, sun + halo, moon, stars and
// drifting fbm clouds. Outputs HDR so the sun blooms and casts god rays.

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // push to far plane
}
`;

const frag = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uTime;
uniform float uDay;      // 0 = night, 1 = day
uniform float uSunset;   // 0..1 amount of sunset tint
uniform float uCloudCover;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash2(i), b = hash2(i + vec2(1, 0)), c = hash2(i + vec2(0, 1)), d = hash2(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;

  vec3 zenithDay = vec3(0.16, 0.36, 0.85);
  vec3 horizonDay = vec3(0.62, 0.78, 0.98);
  vec3 zenithNight = vec3(0.008, 0.012, 0.045);
  vec3 horizonNight = vec3(0.04, 0.05, 0.12);
  vec3 sunsetCol = vec3(1.25, 0.48, 0.18);

  float t = pow(clamp(1.0 - max(h, 0.0), 0.0, 1.0), 3.0);
  vec3 dayCol = mix(zenithDay, horizonDay, t);
  vec3 nightCol = mix(zenithNight, horizonNight, t);
  vec3 col = mix(nightCol, dayCol, uDay);

  // sunset band around the sun's azimuth
  float sunAz = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
  float band = exp(-abs(h) * 5.0) * (0.35 + 0.65 * pow(sunAz, 3.0));
  col = mix(col, sunsetCol, band * uSunset);

  // below horizon: darker ground haze
  if (h < 0.0) col = mix(col, col * 0.35, clamp(-h * 3.0, 0.0, 1.0));

  // sun
  float sd = max(dot(d, uSunDir), 0.0);
  float sunVis = smoothstep(-0.05, 0.05, uSunDir.y);
  col += vec3(1.0, 0.85, 0.6) * pow(sd, 1600.0) * 60.0 * sunVis;
  col += vec3(1.0, 0.7, 0.4) * pow(sd, 12.0) * 0.35 * sunVis * (0.4 + uSunset);
  col += vec3(1.0, 0.8, 0.6) * pow(sd, 200.0) * 1.5 * sunVis;

  // moon
  float md = max(dot(d, uMoonDir), 0.0);
  float moonVis = smoothstep(-0.05, 0.1, uMoonDir.y) * (1.0 - uDay * 0.85);
  float moonDisc = smoothstep(0.99955, 0.9997, md);
  vec3 moonCol = vec3(0.85, 0.88, 1.0) * (0.75 + 0.25 * fbm(d.xy * 400.0));
  col = mix(col, moonCol * 3.0, moonDisc * moonVis);
  col += vec3(0.5, 0.55, 0.9) * pow(md, 60.0) * 0.4 * moonVis;

  // stars
  if (h > 0.0) {
    vec3 sp = d * 280.0;
    vec3 cell = floor(sp);
    float s = hash(cell);
    float star = step(0.9975, s);
    vec3 f = fract(sp) - 0.5;
    float twinkle = 0.6 + 0.4 * sin(uTime * (2.0 + s * 5.0) + s * 100.0);
    float shape = smoothstep(0.35, 0.0, length(f));
    col += vec3(0.9, 0.92, 1.0) * star * shape * twinkle * (1.0 - uDay) * 2.5 * smoothstep(0.0, 0.2, h);
    // milky way haze
    float mw = fbm(d.xz * 3.0 + d.y * 2.0) * smoothstep(0.35, 0.0, abs(d.x * 0.6 + d.z * 0.3 - d.y * 0.2));
    col += vec3(0.25, 0.22, 0.45) * mw * 0.25 * (1.0 - uDay);
  }

  // clouds (planar projection)
  if (h > 0.01) {
    vec2 uv = d.xz / (h + 0.08) * 0.9 + vec2(uTime * 0.006, uTime * 0.002);
    float c = fbm(uv * 1.3);
    c = smoothstep(0.62 - uCloudCover * 0.2, 0.9, c);
    float shade = fbm(uv * 1.3 + uSunDir.xz * 0.08);
    vec3 cloudDay = mix(vec3(1.05, 1.02, 1.0), vec3(0.62, 0.66, 0.76), shade);
    cloudDay = mix(cloudDay, vec3(1.3, 0.62, 0.38), uSunset * 0.7);
    vec3 cloudNight = vec3(0.05, 0.06, 0.1) + vec3(0.1, 0.1, 0.16) * (1.0 - shade);
    vec3 cc = mix(cloudNight, cloudDay, uDay);
    cc += vec3(1.0, 0.8, 0.55) * pow(sd, 6.0) * 0.8 * sunVis * uDay;
    col = mix(col, cc, c * smoothstep(0.01, 0.2, h) * 0.9);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

export class Sky {
  constructor() {
    this.uniforms = {
      uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2).normalize() },
      uMoonDir: { value: new THREE.Vector3(-0.3, -0.8, -0.2).normalize() },
      uTime: { value: 0 },
      uDay: { value: 1 },
      uSunset: { value: 0 },
      uCloudCover: { value: 0.5 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    this.mesh.userData.noAO = true;
  }

  // Horizon colour for matching fog.
  horizonColor(target) {
    const day = this.uniforms.uDay.value;
    const sunset = this.uniforms.uSunset.value;
    const d = new THREE.Color(0.55, 0.68, 0.86);
    const n = new THREE.Color(0.03, 0.04, 0.09);
    target.copy(n).lerp(d, day);
    target.lerp(new THREE.Color(0.9, 0.5, 0.3), sunset * 0.45);
    return target;
  }
}

// Given minutes of the day, compute sun/moon directions and day factors.
export function sunState(minutes) {
  const t = ((minutes / 1440) % 1 + 1) % 1; // 0 = midnight
  const angle = (t - 0.25) * Math.PI * 2; // sunrise ~6:00
  const sunDir = new THREE.Vector3(Math.cos(angle) * 0.85, Math.sin(angle), 0.35).normalize();
  const moonDir = sunDir.clone().multiplyScalar(-1);
  moonDir.z = 0.25;
  moonDir.normalize();
  const elev = sunDir.y;
  const day = THREE.MathUtils.smoothstep(elev, -0.12, 0.22);
  const sunset = Math.max(0, 1 - Math.abs(elev - 0.03) / 0.22) * 0.95;
  return { sunDir, moonDir, day, sunset, elev };
}
