import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { setMaxAnisotropy } from './Textures.js';

// Final "shader pack" pass: god rays, filmic tone mapping, colour grading,
// vignette, subtle chromatic aberration and film grain.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSunPos: { value: new THREE.Vector2(0.5, 0.5) },
    uSunAmount: { value: 0 },
    uSunColor: { value: new THREE.Color(1.0, 0.85, 0.6) },
    uExposure: { value: 1.0 },
    uSaturation: { value: 1.12 },
    uContrast: { value: 1.06 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uVignette: { value: 0.32 },
    uHurt: { value: 0 },
    uTime: { value: 0 },
    uAberration: { value: 0.0012 },
    uGodRays: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform vec2 uSunPos;
    uniform float uSunAmount;
    uniform vec3 uSunColor;
    uniform float uExposure, uSaturation, uContrast, uVignette, uHurt, uTime, uAberration, uGodRays;
    uniform vec3 uTint;
    varying vec2 vUv;

    vec3 aces(vec3 x) {
      const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      vec2 center = uv - 0.5;
      float dist = length(center);

      // chromatic aberration grows towards the edges
      float ab = uAberration * (1.0 + uHurt * 6.0) * dist * 2.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + center * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - center * ab).b;

      // screen-space god rays from very bright (sun) pixels
      if (uSunAmount > 0.001 && uGodRays > 0.5) {
        const int N = 40;
        vec2 delta = (uv - uSunPos) / float(N) * 0.95;
        vec2 suv = uv;
        float decay = 1.0;
        vec3 acc = vec3(0.0);
        float jitter = rand(uv + fract(uTime)) ;
        suv -= delta * jitter;
        for (int i = 0; i < N; i++) {
          suv -= delta;
          vec3 s = texture2D(tDiffuse, clamp(suv, 0.0, 1.0)).rgb;
          float l = max(luma(s) - 1.6, 0.0);
          acc += min(l, 6.0) * decay;
          decay *= 0.955;
        }
        acc /= float(N);
        col += uSunColor * acc * uSunAmount * 0.9;
      }

      col *= uExposure * uTint;
      col = aces(col);
      col = pow(col, vec3(1.0 / 2.2));

      // grading
      float l = luma(col);
      col = mix(vec3(l), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      // gentle split toning: warm highlights, cool shadows
      col += vec3(0.025, 0.012, -0.012) * smoothstep(0.5, 1.0, l);
      col += vec3(-0.01, 0.0, 0.025) * smoothstep(0.5, 0.0, l);

      // vignette + hurt flash
      float vig = smoothstep(0.85, 0.2, dist * (1.0 + uVignette));
      col *= mix(1.0, vig, 0.85);
      col = mix(col, vec3(0.6, 0.0, 0.05), uHurt * smoothstep(0.2, 0.75, dist) * 0.7);

      // grain
      col += (rand(uv * 1000.0 + uTime) - 0.5) * 0.018;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

// GTAO variant that ignores sprites, particles, sky and flagged objects.
class SafeGTAOPass extends GTAOPass {
  overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      cache.set(o, o.visible);
      if (o.isPoints || o.isLine || o.isSprite || o.userData.noAO) o.visible = false;
      else if (o.material && (o.material.transparent || o.material.isShaderMaterial) && !o.userData.forceAO) o.visible = false;
    });
  }
}

// Draws the viewmodel on top of the world with a fresh depth buffer.
class ViewmodelPass extends RenderPass {
  constructor(scene, camera) {
    super(scene, camera);
    this.clear = false;
  }

  render(renderer, writeBuffer, readBuffer) {
    renderer.setRenderTarget(readBuffer);
    renderer.clearDepth();
    super.render(renderer, writeBuffer, readBuffer);
  }
}

export const QUALITY = {
  low: { pixelRatio: 0.75, shadows: false, shadowSize: 1024, bloom: false, ao: false, godRays: false, grass: 0.3 },
  medium: { pixelRatio: 1.0, shadows: true, shadowSize: 1024, bloom: true, ao: false, godRays: true, grass: 0.6 },
  high: { pixelRatio: 1.0, shadows: true, shadowSize: 2048, bloom: true, ao: true, godRays: true, grass: 1.0 },
  ultra: { pixelRatio: 1.5, shadows: true, shadowSize: 4096, bloom: true, ao: true, godRays: true, grass: 1.4 },
};

export class Engine {
  constructor(container) {
    this.container = container;
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NoToneMapping; // done in GradeShader
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;
    setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 900);
    this.camera.rotation.order = 'YXZ';

    // Separate scene/camera for the first-person viewmodel (never clips walls)
    this.viewCamera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.01, 20);
    this.viewScene = new THREE.Scene();
    this.viewAmbient = new THREE.HemisphereLight(0xdde6ff, 0x3a3020, 1.2);
    this.viewSun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.viewSun.position.set(0.6, 1, 0.8);
    this.viewFill = new THREE.PointLight(0xffa860, 0, 3, 2);
    this.viewFill.position.set(0.3, -0.2, -0.3);
    this.viewScene.add(this.viewAmbient, this.viewSun, this.viewFill);

    this.scene = new THREE.Scene();

    const composer = new EffectComposer(renderer);
    this.composer = composer;
    this.renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(this.renderPass);

    this.gtao = new SafeGTAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
    this.gtao.blendIntensity = 0.85;
    this.gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(this.gtao);

    this.viewPass = new ViewmodelPass(this.viewScene, this.viewCamera);
    composer.addPass(this.viewPass);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.55, 0.92);
    composer.addPass(this.bloom);

    this.grade = new ShaderPass(GradeShader);
    composer.addPass(this.grade);

    this.fxaa = new ShaderPass(FXAAShader);
    composer.addPass(this.fxaa);

    this.quality = 'high';
    this.applyQuality('high');

    window.addEventListener('resize', () => this.resize());
    this.resize();

    this._sunWorld = new THREE.Vector3();
    this._camDir = new THREE.Vector3();
  }

  applyQuality(name) {
    const q = QUALITY[name] ?? QUALITY.high;
    this.quality = name;
    this.q = q;
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.gtao.enabled = q.ao;
    this.bloom.enabled = q.bloom;
    this.grade.uniforms.uGodRays.value = q.godRays ? 1 : 0;
    // force materials to recompile for shadow changes
    this.scene?.traverse((o) => {
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => (m.needsUpdate = true));
      }
    });
    this.resize();
  }

  setScene(scene) {
    this.scene = scene;
    this.renderPass.scene = scene;
    this.gtao.scene = scene;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2) * (this.q?.pixelRatio ?? 1);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = w / h;
    this.viewCamera.updateProjectionMatrix();
    this.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
  }

  // Sun screen position for god rays.
  updateSunScreen(sunDir, strength) {
    const cam = this.camera;
    cam.getWorldDirection(this._camDir);
    const facing = this._camDir.dot(sunDir);
    const u = this.grade.uniforms;
    if (facing <= 0.05 || strength <= 0) {
      u.uSunAmount.value = 0;
      return;
    }
    this._sunWorld.copy(cam.position).addScaledVector(sunDir, 400);
    this._sunWorld.project(cam);
    const sx = this._sunWorld.x * 0.5 + 0.5;
    const sy = this._sunWorld.y * 0.5 + 0.5;
    u.uSunPos.value.set(sx, sy);
    const edge = Math.max(Math.abs(sx - 0.5), Math.abs(sy - 0.5));
    const fade = THREE.MathUtils.smoothstep(1.1 - edge, 0, 0.6);
    u.uSunAmount.value = strength * fade * THREE.MathUtils.smoothstep(facing, 0.05, 0.5);
  }

  render(time) {
    this.grade.uniforms.uTime.value = time;
    this.composer.render();
  }
}
