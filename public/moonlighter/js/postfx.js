'use strict';
// ============================================================================
//  POST FX: a WebGL pass over the finished 2D frame. Bloom on bright lights,
//  per-scene colour grading, vignette, sun rays, low-health pulse, hit colour
//  split, death desaturation and a touch of film grain. Falls back silently
//  to the plain canvas when WebGL is unavailable or the option is off.
// ============================================================================

const PostFX = (() => {
  let gl = null, glcv = null, prog = null, tex = null, U = {}, ok = false;
  const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `
precision mediump float;
varying vec2 uv;
uniform sampler2D t;
uniform sampler2D bt;
uniform vec2 lres;
uniform float time, sat, contrast, vig, bloom, grain, aberr, lowhp, dead, rays, warm, dof;
uniform vec3 tint;
vec3 tx(vec2 q){ return texture2D(t, q).rgb; }
void main(){
  vec2 q = uv;
  vec3 c;
  if (aberr > 0.001) { vec2 o = (q - 0.5) * aberr * 0.014; c = vec3(texture2D(t, q + o).r, texture2D(t, q).g, texture2D(t, q - o).b); }
  else c = tx(q);
  vec2 px = 1.0 / lres;
  // cinematic depth of field: soften the frame edges
  if (dof > 0.001) {
    float e = smoothstep(0.22, 0.7, distance(q, vec2(0.5, 0.5)));
    vec2 o = px * (1.0 + 2.5 * e) * dof;
    vec3 bl = (tx(q + vec2(o.x, 0.0)) + tx(q - vec2(o.x, 0.0)) + tx(q + vec2(0.0, o.y)) + tx(q - vec2(0.0, o.y))) * 0.25;
    c = mix(c, bl, e * dof * 0.85);
  }
  vec3 b = texture2D(bt, q).rgb * 0.4 + (texture2D(bt, q + vec2(px.x * 4.0, 0.0)).rgb + texture2D(bt, q - vec2(px.x * 4.0, 0.0)).rgb + texture2D(bt, q + vec2(0.0, px.y * 4.0)).rgb + texture2D(bt, q - vec2(0.0, px.y * 4.0)).rgb) * 0.15;
  c += b * bloom * 2.2;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, sat);
  c = (c - 0.5) * contrast + 0.5;
  c *= tint;
  // warm light: lift shadows toward amber, keep highlights
  c += vec3(0.05, 0.025, -0.01) * warm * (1.0 - l);
  if (rays > 0.001) {
    float r = sin((q.x * 1.4 + q.y * 1.0) * 11.0 + time * 0.35) * 0.5 + 0.5;
    r = pow(r, 8.0) * smoothstep(1.0, 0.0, q.y) * smoothstep(0.0, 0.35, q.x);
    c += vec3(1.0, 0.86, 0.58) * r * rays * 0.14;
  }
  float d = distance(q, vec2(0.5, 0.52));
  float v = smoothstep(0.32, 0.85, d);
  c *= 1.0 - v * vig;
  if (lowhp > 0.001) { float pulse = 0.5 + 0.5 * sin(time * 6.0); c = mix(c, vec3(0.75, 0.04, 0.08), v * lowhp * (0.35 + 0.3 * pulse)); }
  if (dead > 0.001) { float g = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(c, vec3(g) * vec3(0.78, 0.82, 1.0), dead * 0.85); c = mix(c, vec3(0.55, 0.05, 0.08), dead * v * 0.45); }
  float n = fract(sin(dot(floor(q * lres * 2.0) + fract(time) * 91.0, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * grain;
  gl_FragColor = vec4(c, 1.0);
}`;
  const BFS = `
precision mediump float;
varying vec2 uv;
uniform sampler2D t;
uniform vec2 lres;
vec3 br(vec2 q){ return max(texture2D(t, q).rgb - 0.74, 0.0); }
void main(){
  vec2 px = 1.0 / lres;
  vec3 b = br(uv);
  for (int i = 0; i < 8; i++) { float a = float(i) * 0.7854; vec2 d = vec2(cos(a), sin(a)) * px; b += br(uv + d * 3.0) + br(uv + d * 7.0) * 0.6; }
  gl_FragColor = vec4(b / 9.0, 1.0);
}`;
  let bprog = null, fbo = null, btex = null, BU = {};
  const BW = 192, BH = 108;
  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function init() {
    try {
      glcv = document.createElement('canvas'); glcv.id = 'glfx';
      glcv.style.cssText = 'position:absolute;pointer-events:none;image-rendering:auto;';
      document.getElementById('wrap').appendChild(glcv);
      gl = glcv.getContext('webgl', { premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: false });
      if (!gl) throw new Error('no webgl');
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // bloom program + small framebuffer
      bprog = gl.createProgram();
      gl.attachShader(bprog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(bprog, compile(gl.FRAGMENT_SHADER, BFS));
      gl.bindAttribLocation(bprog, 0, 'p'); gl.linkProgram(bprog);
      if (!gl.getProgramParameter(bprog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(bprog));
      BU.t = gl.getUniformLocation(bprog, 't'); BU.lres = gl.getUniformLocation(bprog, 'lres');
      btex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, btex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, BW, BH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, btex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(prog);
      U.bt = gl.getUniformLocation(prog, 'bt');
      for (const n of ['t', 'lres', 'time', 'sat', 'contrast', 'vig', 'bloom', 'grain', 'aberr', 'lowhp', 'dead', 'rays', 'warm', 'tint', 'dof']) U[n] = gl.getUniformLocation(prog, n);
      ok = true; resize();
    } catch (e) { console.warn('PostFX disabled:', e.message); ok = false; if (glcv) glcv.remove(); }
  }
  function resize() {
    if (!ok) return;
    glcv.width = cv.width; glcv.height = cv.height;
    glcv.style.width = cv.style.width; glcv.style.height = cv.style.height;
    glcv.style.left = cv.offsetLeft + 'px'; glcv.style.top = cv.offsetTop + 'px';
    gl.viewport(0, 0, glcv.width, glcv.height);
    sync();
  }
  function sync() {
    const on = active();
    if (glcv) glcv.style.display = on ? 'block' : 'none';
    cv.style.opacity = on ? '0' : '1';
  }
  // adaptive quality: if the device can't keep ~30fps with effects on, turn them off once
  let perfT = 0, perfN = 0, perfDone = false;
  function watchPerf(dt) {
    if (perfDone || !active() || Game.time < 3) return;
    perfT += dt; perfN++;
    if (perfT >= 3) {
      perfDone = true;
      if (perfN / perfT < 30) { OPTS.fx = false; saveOpts(); sync(); resize2d(); if (typeof toast === 'function') toast('Shaders turned off to keep the game smooth (Settings > Video)'); }
    }
  }
  function resize2d() { if (typeof resize === 'function') window.dispatchEvent(new Event('resize')); }
  function render(p, dt) {
    watchPerf(dt || 0);
    if (!active()) return;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    // pass 1: bright-pass bloom into the small framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, BW, BH);
    gl.useProgram(bprog); gl.uniform1i(BU.t, 0); gl.uniform2f(BU.lres, W, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // pass 2: composite at full size
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, glcv.width, glcv.height);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, btex); gl.uniform1i(U.bt, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(U.t, 0); gl.uniform2f(U.lres, W, H); gl.uniform1f(U.time, Game.time % 1000);
    gl.uniform1f(U.sat, p.sat); gl.uniform1f(U.contrast, p.contrast); gl.uniform1f(U.vig, p.vig); gl.uniform1f(U.bloom, p.bloom);
    gl.uniform1f(U.grain, p.grain); gl.uniform1f(U.aberr, p.aberr); gl.uniform1f(U.lowhp, p.lowhp); gl.uniform1f(U.dead, p.dead);
    gl.uniform1f(U.rays, p.rays); gl.uniform1f(U.dof, p.dof || 0); gl.uniform1f(U.warm, p.warm); gl.uniform3f(U.tint, p.tint[0], p.tint[1], p.tint[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function active() { return ok && OPTS.fx !== false; }
  return { init, resize, render, sync, active, get ok() { return ok; } };
})();

// per-scene look
function fxParams() {
  const sc = Game.scene instanceof Cutscene ? Game.scene.stage : Game.scene;
  const p = { sat: 1.05, contrast: 1.04, vig: 0.3, bloom: 0.35, grain: 0.025, aberr: 0, lowhp: 0, dead: 0, rays: 0, warm: 0, tint: [1, 1, 1] };
  if (sc instanceof TownScene) {
    if (sc.night) Object.assign(p, { sat: 0.95, vig: 0.5, bloom: 0.85, tint: [0.9, 0.95, 1.12] });
    else Object.assign(p, { sat: 1.08, contrast: 1.05, vig: 0.3, bloom: 0.2, rays: 0.8, warm: 0.5, tint: [1.03, 1.0, 0.94] });
  } else if (sc instanceof ShopScene) Object.assign(p, { sat: 1.02, vig: 0.45, bloom: 0.35, rays: 0.5, warm: 0.35, tint: [1.03, 0.99, 0.93] });
  else if (sc instanceof DungeonScene) {
    const st = sc.d.style;
    Object.assign(p, { vig: 0.55, bloom: 0.9, sat: st === 'grave' ? 0.92 : 1.05, tint: st === 'grave' ? [0.95, 1.0, 1.02] : st === 'void' ? [1.0, 0.95, 1.08] : [1, 1, 1] });
  } else Object.assign(p, { vig: 0.25, bloom: 0.3 });
  if (S && !(sc instanceof TitleScene) && !(sc instanceof SlotScene)) {
    const frac = S.hp / playerStats().maxHp;
    if (frac < 0.3 && S.hp > 0) p.lowhp = (0.3 - frac) / 0.3 * 0.8 + 0.3;
    p.dead = HUD.dead;
  }
  p.aberr = Game.fxHit || 0;
  if (Game.scene instanceof Cutscene) { p.vig = Math.min(0.85, p.vig + 0.22); p.grain = 0.05; p.contrast *= 1.07; p.sat *= 0.94; p.dof = 1; p.lowhp = 0; }
  return p;
}
