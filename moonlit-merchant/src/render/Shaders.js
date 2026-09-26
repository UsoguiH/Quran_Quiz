import * as THREE from 'three';
import { globalUniforms } from './Models.js';

// Swirling magic portal disc.
export function makePortal(radius = 1.4, colA = [0.4, 0.3, 1.6], colB = [1.6, 0.8, 2.4]) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: globalUniforms.uTime,
      uColA: { value: new THREE.Vector3(...colA) },
      uColB: { value: new THREE.Vector3(...colB) },
      uIntensity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uIntensity;
      uniform vec3 uColA, uColB;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float s = sin(a * 5.0 + r * 14.0 - uTime * 3.0) * 0.5 + 0.5;
        float s2 = sin(a * 3.0 - r * 9.0 + uTime * 2.0) * 0.5 + 0.5;
        float glow = smoothstep(1.0, 0.0, r);
        vec3 col = mix(uColA, uColB, s * s2) * (0.5 + glow * 1.6);
        col += vec3(1.5) * smoothstep(0.25, 0.0, r);
        float rim = smoothstep(0.8, 0.97, r) * smoothstep(1.0, 0.97, r);
        col += uColB * rim * 2.0;
        float alpha = smoothstep(1.0, 0.9, r);
        gl_FragColor = vec4(col * alpha * uIntensity, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), m);
  mesh.userData.noAO = true;
  return mesh;
}

// Stylised water: animated normals, fresnel sky reflection, sun glint, depth tint.
export function makeWaterMaterial(o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: globalUniforms.uTime,
      uSunDir: o.sunDir ?? { value: new THREE.Vector3(0.3, 0.8, 0.2) },
      uSky: o.sky ?? { value: new THREE.Color(0.55, 0.7, 0.95) },
      uDeep: { value: new THREE.Color(o.deep ?? 0x0b3a4a) },
      uShallow: { value: new THREE.Color(o.shallow ?? 0x2f9aa8) },
      uGlow: { value: o.glow ?? 0 },
      uSunStrength: o.sunStrength ?? { value: 1 },
      fogColor: { value: new THREE.Color() },
      fogDensity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y += sin(w.x * 1.3 + uTime * 1.5) * 0.02 + cos(w.z * 1.7 + uTime * 1.2) * 0.02;
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uGlow, uSunStrength;
      uniform vec3 uSunDir, uSky, uDeep, uShallow;
      varying vec3 vWorld;
      varying vec2 vUv;
      vec3 waveNormal(vec2 p) {
        float t = uTime;
        vec2 d = vec2(0.0);
        d += vec2(cos(p.x * 1.1 + t * 1.3), sin(p.y * 1.3 + t * 1.1)) * 0.25;
        d += vec2(cos(p.x * 2.7 - p.y * 1.9 + t * 2.1), sin(p.y * 2.3 + p.x * 1.2 - t * 1.7)) * 0.14;
        d += vec2(cos(p.x * 6.1 + p.y * 4.7 + t * 3.3), sin(p.y * 5.9 - p.x * 4.1 + t * 2.9)) * 0.06;
        return normalize(vec3(-d.x, 1.0, -d.y));
      }
      void main() {
        vec3 n = waveNormal(vWorld.xz * 1.4);
        vec3 v = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.85 + 0.08;
        vec2 edge = min(vUv, 1.0 - vUv);
        float shore = smoothstep(0.0, 0.18, min(edge.x, edge.y));
        vec3 base = mix(uShallow, uDeep, shore);
        vec3 col = mix(base, uSky, fres);
        vec3 h = normalize(uSunDir + v);
        float spec = pow(max(dot(n, h), 0.0), 220.0) * 8.0 * uSunStrength;
        col += vec3(1.0, 0.9, 0.7) * spec;
        // caustic sparkle
        float c = sin(vWorld.x * 7.0 + uTime * 2.0) * sin(vWorld.z * 7.0 - uTime * 1.7);
        col += uShallow * smoothstep(0.85, 1.0, c) * 0.25;
        col += uShallow * uGlow * (0.6 + 0.4 * sin(uTime * 2.0));
        float foam = smoothstep(0.06, 0.0, min(edge.x, edge.y));
        col = mix(col, vec3(0.9, 0.95, 1.0), foam * 0.5);
        gl_FragColor = vec4(col, 0.86);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

// Soft volumetric light shaft (additive cone).
export function makeLightShaft(topR = 1.0, botR = 2.6, height = 5, color = [0.5, 0.65, 1.0], strength = 0.35) {
  const geo = new THREE.CylinderGeometry(topR, botR, height, 32, 1, true);
  geo.translate(0, -height / 2, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: globalUniforms.uTime,
      uColor: { value: new THREE.Vector3(...color) },
      uStrength: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uStrength;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vWorld;
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vView)));
        float soft = pow(facing, 2.0);
        float fall = smoothstep(0.0, 0.25, vUv.y) * (0.35 + 0.65 * vUv.y);
        float streak = 0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 0.4) * sin(vUv.x * 17.0 - uTime * 0.25);
        float a = soft * fall * streak * uStrength;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.userData.noAO = true;
  mesh.renderOrder = 4;
  return mesh;
}
