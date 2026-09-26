/* قدراتي — «دقيقة قبل منتصف الليل» (one minute to midnight)
   A 15-second character film on the same 128 BPM grid as the first reel.
   قدّور dozes off on his books, the streak flame is dying, the alarm goes at
   ١١:٥٩, he speed-runs a lesson, the flame roars back and the streak rolls to ٤٤.

   Acting is pose-to-pose: his fourteen painted poses are swapped on the squash
   or the stretch of a move, so the change hides inside the smear, the way
   Duolingo's own character animation cuts between drawings. The flame is a
   fully rigged SVG character: eyes, pupils, brows, five mouths, a blink. */
(() => {
  gsap.registerPlugin(CustomEase);
  const B = 60 / 128, BAR = 4 * B, T = i => i * BAR, DUR = 8 * BAR;
  const $ = s => document.querySelector(s);
  const AR = '٠١٢٣٤٥٦٧٨٩', toAr = n => String(n).replace(/\d/g, d => AR[d]);
  const tl = gsap.timeline({ paused: true });
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const counters = [];
  const counter = (sel, fmt, v0 = 0) => { const o = { v: v0 }; counters.push({ o, el: $(sel), fmt }); return o; };
  const sync = () => { for (const c of counters) c.el.textContent = c.fmt(c.o.v); };

  /* ---------- scene windows ---------- */
  const Z = { night: 1, lesson: 2, streak: 3, tag: 4, end: 5 };
  for (const id in Z) gsap.set('#' + id, { zIndex: Z[id] });
  const win = (id, a, b) => { tl.set('#' + id, { visibility: 'visible' }, a); if (b < DUR) tl.set('#' + id, { visibility: 'hidden' }, b); };
  win('night', 0, 3.84); win('lesson', 3.54, 6.2); win('night', 5.98, 7.5);
  win('streak', 7.5, 11.3); win('tag', 11.04, 13.2); win('end', 13.1, DUR);
  gsap.set('#night', { zIndex: 1 });
  tl.set('#night', { zIndex: 3 }, 5.98);       // on its return the room plays above the lesson

  /* ---------- قدّور: a pose rig ----------
     pos (where he is) › rot (lean, about the feet) › sq (squash and stretch) › one img per pose */
  const FEET = 0.966;
  function rig(host, { x, y, S, poses, stack }) {
    const el = document.createElement('div');
    el.className = 'rig';
    Object.assign(el.style, { left: x + 'px', top: y + 'px', width: S + 'px', height: S + 'px' });
    el.innerHTML = '<div class="r-pos"><div class="r-rot"><div class="r-sq">' +
      poses.map(p => `<img data-p="${p}" src="assets/mascot/qaddour-${p}.png" alt="">`).join('') + '</div></div></div>';
    const sh = document.createElement('div');
    sh.className = 'shadow';
    Object.assign(sh.style, { left: (x + S * 0.5 - S * 0.24) + 'px', top: (y + S * FEET - S * 0.028) + 'px', width: S * 0.48 + 'px', height: S * 0.056 + 'px', background: 'rgba(0,0,0,.2)' });
    let st = null;
    if (stack) {
      // the three purple books painted under the sitting poses, redrawn so they stay when he leaves them
      st = document.createElement('div');
      st.className = 'stack';
      Object.assign(st.style, { left: x + 'px', top: y + 'px', width: S + 'px', height: S + 'px' });
      const book = (x0, x1, y, h, cover, spine, pagesRight) => {
        const w = x1 - x0, pw = 30, px = pagesRight ? x1 - pw - 8 : x0 + 8;
        return `<rect x="${x0}" y="${y}" width="${w}" height="${h}" rx="12" fill="${cover}"/>` +
          `<rect x="${pagesRight ? x0 : x1 - 26}" y="${y}" width="26" height="${h}" rx="10" fill="${spine}"/>` +
          `<rect x="${px}" y="${y + 9}" width="${pw}" height="${h - 18}" rx="5" fill="#F1E8FF"/>` +
          `<rect x="${px}" y="${y + 20}" width="${pw}" height="3" fill="#D3C0F2"/><rect x="${px}" y="${y + h - 23}" width="${pw}" height="3" fill="#D3C0F2"/>`;
      };
      const [a0, a1] = stack;
      st.innerHTML = `<svg viewBox="0 0 1024 1024" width="100%" height="100%">` +
        book(a0, a1, 902, 56, '#6B21C4', '#5A1AA8', true) +
        book(a0 + 12, a1 - 6, 848, 58, '#8328CD', '#6D20B2', false) +
        book(a0 + 34, a1 - 30, 794, 58, '#6B21C4', '#5A1AA8', true) + `</svg>`;
      host.appendChild(st);
    }
    host.appendChild(sh);
    host.appendChild(el);
    const q = s => el.querySelector(s);
    const r = { el, pos: q('.r-pos'), rot: q('.r-rot'), sq: q('.r-sq'), sh, st, imgs: {} };
    el.querySelectorAll('img').forEach(i => (r.imgs[i.dataset.p] = i));
    gsap.set([r.rot, r.sq], { transformOrigin: `50% ${FEET * 100}%` });
    gsap.set(sh, { transformOrigin: '50% 50%' });
    r.pose = (t, p) => { for (const k in r.imgs) tl.set(r.imgs[k], { opacity: k === p ? 1 : 0 }, t); };
    return r;
  }

  /* squash on landing, springy settle */
  const land = (el, t, sx = 1.18, sy = 0.84, d = 0.45) =>
    tl.to(el, { scaleX: sx, scaleY: sy, duration: 0.05, ease: 'power2.out' }, t)
      .to(el, { scaleX: 1, scaleY: 1, duration: d, ease: 'elastic.out(1.1, 0.42)' }, t + 0.05);

  /* a full hop: anticipation, stretch, hang, fall, squash, settle — shadow breathing with it */
  function hop(r, tLand, h, air, { lean = 0, swapAt = null, swapTo = null, antic = 0.1 } = {}) {
    const up = tLand - air;
    tl.to(r.sq, { scaleX: 1.12, scaleY: 0.86, duration: antic, ease: 'power2.out' }, up - antic)
      .to(r.sq, { scaleX: 0.88, scaleY: 1.14, duration: 0.07, ease: 'power2.out' }, up)
      .to(r.sq, { scaleX: 1, scaleY: 1, duration: air * 0.4, ease: 'sine.out' }, up + 0.07)
      .to(r.sq, { scaleX: 0.94, scaleY: 1.07, duration: air * 0.28, ease: 'sine.in' }, tLand - air * 0.28)
      .to(r.pos, { y: `-=${h}`, duration: air * 0.5, ease: 'power2.out' }, up)
      .to(r.pos, { y: `+=${h}`, duration: air * 0.5, ease: 'power2.in' }, up + air * 0.5)
      .to(r.rot, { rotation: lean, duration: air * 0.5, ease: 'sine.out' }, up)
      .to(r.rot, { rotation: 0, duration: air * 0.5, ease: 'sine.in' }, up + air * 0.5)
      .to(r.sh, { scale: 0.55, opacity: 0.45, duration: air * 0.5, ease: 'power2.out' }, up)
      .to(r.sh, { scale: 1, opacity: 1, duration: air * 0.5, ease: 'power2.in' }, up + air * 0.5);
    if (swapTo) r.pose(swapAt ?? up, swapTo);
    land(r.sq, tLand, 1.16, 0.85, 0.42);
  }

  /* ---------- the streak flame: a rigged character ---------- */
  const OUTER = 'M0 15.45V5.69C0 3.64 1.54 3.64 2.57 4.15l2.05 1.03C5.48 3.98 7.39 1.38 8.22.56c1.03-1.03 2.05-.51 3.08.51 1.03 1.03 4.11 5.14 5.65 7.19C18.49 10.32 19 12.37 19 15.45c0 3.08-3.59 8.22-9.76 8.22C3.08 23.67 0 18.02 0 15.45Z';
  const CORE = 'M6.16 13.91c.82-1.23 2.06-2.91 2.57-3.59.17-.34.72-.82 1.54 0 1.03 1.03 2.05 3.08 2.57 3.59.51.51 1.03 2.57 0 4.11-1.03 1.54-2.57 2.05-3.6 2.05-1.02 0-2.56-1.03-3.08-2.05-.51-1.03-1.03-2.57 0-4.11Z';
  const INK = '#3B2412';
  function flame(host, { cx, bottom, H }) {
    const W = H * 190 / 240;
    const el = document.createElement('div');
    el.className = 'flm';
    Object.assign(el.style, { left: cx - W / 2 + 'px', top: bottom - H + 'px', width: W + 'px', height: H + 'px' });
    el.innerHTML = `<div class="f-pos" style="position:absolute;inset:0"><div class="f-sc" style="position:absolute;inset:0"><div class="f-sq" style="position:absolute;inset:0">
      <svg viewBox="0 0 190 240">
        <g class="f-outg"><path class="f-out" d="${OUTER}" transform="scale(10)" fill="#FF9600"/></g>
        <path class="f-shine" d="M34 70 C40 52 52 40 62 34" stroke="#FFB84D" stroke-width="11" stroke-linecap="round" fill="none"/>
        <g class="f-coreg"><path class="f-core" d="${CORE}" transform="scale(10) translate(-.5 .6) scale(1.06)" fill="#FFC800"/></g>
        <g class="f-face">
          <ellipse cx="54" cy="186" rx="13" ry="8" fill="#FF6B35" opacity=".45"/><ellipse cx="136" cy="186" rx="13" ry="8" fill="#FF6B35" opacity=".45"/>
          <g class="e-open">
            <ellipse cx="75" cy="158" rx="16" ry="19" fill="#fff"/><ellipse cx="115" cy="158" rx="16" ry="19" fill="#fff"/>
            <g class="pup"><circle cx="77" cy="161" r="10" fill="${INK}"/><circle cx="117" cy="161" r="10" fill="${INK}"/><circle cx="80" cy="156" r="3.6" fill="#fff"/><circle cx="120" cy="156" r="3.6" fill="#fff"/></g>
          </g>
          <g class="e-happy" opacity="0"><path d="M60 162 Q75 144 90 162" stroke="${INK}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M100 162 Q115 144 130 162" stroke="${INK}" stroke-width="7" stroke-linecap="round" fill="none"/></g>
          <g class="e-shut" opacity="0"><path d="M62 148 L86 158 L62 168" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M128 148 L104 158 L128 168" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>
          <g class="brows" opacity="0"><path d="M58 132 L88 122" stroke="#B85700" stroke-width="7" stroke-linecap="round"/><path d="M132 132 L102 122" stroke="#B85700" stroke-width="7" stroke-linecap="round"/></g>
          <path class="m-frown" d="M83 196 Q95 186 107 196" stroke="${INK}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0"/>
          <path class="m-wavy" d="M78 194 q4.25 -5 8.5 0 t8.5 0 t8.5 0 t8.5 0" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none" opacity="0"/>
          <ellipse class="m-o" cx="95" cy="193" rx="9" ry="11" fill="#7A2A10" opacity="0"/>
          <g class="m-grin" opacity="0"><path d="M72 180 Q95 216 118 180 Z" fill="#7A2A10"/><path d="M83 198 Q95 190 107 198 Q95 210 83 198Z" fill="#FF6B6B"/></g>
          <path class="m-smile" d="M80 188 Q95 202 110 188" stroke="${INK}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0"/>
          <path class="sweat" d="M150 96 C158 110 162 118 150 124 C138 118 142 110 150 96Z" fill="#9EE3FF" opacity="0"/>
        </g>
      </svg></div></div></div>`;
    host.appendChild(el);
    const q = s => el.querySelector(s);
    const f = { el, pos: q('.f-pos'), sc: q('.f-sc'), sq: q('.f-sq'), out: q('.f-out'), core: q('.f-core'), outg: q('.f-outg'), coreg: q('.f-coreg'), shine: q('.f-shine'),
      face: q('.f-face'), eOpen: q('.e-open'), eHappy: q('.e-happy'), eShut: q('.e-shut'), pup: q('.pup'), brows: q('.brows'),
      m: { frown: q('.m-frown'), wavy: q('.m-wavy'), o: q('.m-o'), grin: q('.m-grin'), smile: q('.m-smile') }, sweat: q('.sweat'), W, H };
    gsap.set([f.sc, f.sq], { transformOrigin: '50% 98%' });
    gsap.set(f.eOpen, { svgOrigin: '95 158' });
    f.eyes = (t, k) => { tl.set(f.eOpen, { opacity: k === 'open' ? 1 : 0 }, t).set(f.eHappy, { opacity: k === 'happy' ? 1 : 0 }, t).set(f.eShut, { opacity: k === 'shut' ? 1 : 0 }, t); };
    f.mouth = (t, k) => { for (const n in f.m) tl.set(f.m[n], { opacity: n === k ? 1 : 0 }, t); };
    f.blink = t => tl.to(f.eOpen, { scaleY: 0.08, duration: 0.05, ease: 'power2.in' }, t).to(f.eOpen, { scaleY: 1, duration: 0.08, ease: 'power2.out' }, t + 0.05);
    f.look = (t, x, y, d = 0.12) => tl.to(f.pup, { x, y, duration: d, ease: 'power2.out' }, t);
    f.color = (t, out, core, d) => tl.to(f.out, { attr: { fill: out }, duration: d, ease: 'power2.out' }, t).to(f.core, { attr: { fill: core }, duration: d, ease: 'power2.out' }, t);
    // a living flame: skew and stretch jitter, deterministic
    f.flicker = (t0, t1, amp = 1, rate = 0.085) => {
      const ko = [], kc = [];
      for (let t = t0; t < t1; t += rate) {
        ko.push({ skewX: (rnd() - 0.5) * 9 * amp, scaleY: 1 + (rnd() - 0.4) * 0.07 * amp, duration: rate, ease: 'sine.inOut' });
        kc.push({ scale: 1 + (rnd() - 0.5) * 0.08 * amp, duration: rate, ease: 'sine.inOut' });
      }
      tl.to(f.outg, { svgOrigin: '95 236', keyframes: ko }, t0);
      tl.to(f.coreg, { svgOrigin: '95 200', keyframes: kc }, t0);
    };
    f.hop = (tLand, h, air, spin = 0) => {
      const up = tLand - air;
      tl.to(f.sq, { scaleX: 1.2, scaleY: 0.8, duration: 0.09, ease: 'power2.out' }, up - 0.09)
        .to(f.sq, { scaleX: 0.85, scaleY: 1.2, duration: 0.07 }, up)
        .to(f.sq, { scaleX: 1, scaleY: 1, duration: air * 0.4 }, up + 0.07)
        .to(f.pos, { y: `-=${h}`, duration: air * 0.5, ease: 'power2.out' }, up)
        .to(f.pos, { y: `+=${h}`, duration: air * 0.5, ease: 'power2.in' }, up + air * 0.5);
      if (spin) tl.fromTo(f.pos, { rotation: 0 }, { rotation: spin, duration: air, ease: 'power1.inOut', immediateRender: false }, up);
      land(f.sq, tLand, 1.25, 0.78, 0.45);
    };
    return f;
  }

  const bubbleIn = (sel, t, out) => {
    gsap.set(sel, { transformOrigin: '80% 110%', scale: 0 });
    tl.to(sel, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, t);
    tl.fromTo(sel, { rotation: -8 }, { rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' }, t);
    if (out) tl.to(sel, { scale: 0, duration: 0.16, ease: 'back.in(2)' }, out);
  };
  const shake = (el, t, d, amp) => {
    const k = [];
    for (let s = 0; s < d; s += 0.035) { const a = amp * (1 - s / d); k.push({ x: (rnd() - 0.5) * 2 * a, y: (rnd() - 0.5) * 2 * a, duration: 0.035, ease: 'none' }); }
    k.push({ x: 0, y: 0, duration: 0.04 });
    tl.to(el, { keyframes: k }, t);
  };

  /* ======================================================================
     1 · NIGHT — ١١:٥٨. He's asleep on his books; the flame is dying.
     ====================================================================== */
  const Q = rig($('#nightChars'), { x: 921, y: 108, S: 820, poses: ['sleep', 'wait', 'concerned', 'cheer'], stack: [272, 743] });
  const F = flame($('#nightChars'), { cx: 500, bottom: 902, H: 340 });
  Q.pose(0, 'sleep');
  gsap.set(Q.sh, { opacity: 0 });
  gsap.set(F.sc, { scale: 0.64 });
  F.eyes(0, 'open'); F.mouth(0, 'wavy');
  tl.set(F.brows, { opacity: 1 }, 0);
  gsap.set(F.eOpen, { scaleY: 0.62 });
  F.look(0, -3, 3, 0.01);
  gsap.set([F.out, F.core], {});
  tl.set(F.out, { attr: { fill: '#C9772F' } }, 0).set(F.core, { attr: { fill: '#D9AC45' } }, 0);
  F.flicker(0, 2.34, 0.7, 0.1);
  tl.to(F.sc, { scale: 0.58, duration: 0.25, ease: 'power2.out' }, 2 * B).to(F.sc, { scale: 0.5, duration: 0.25, ease: 'power2.out' }, 4 * B);
  tl.to('#glow', { scale: 0.8, opacity: 0.8, duration: 0.3 }, 2 * B).to('#glow', { scale: 0.6, opacity: 0.55, duration: 0.3 }, 4 * B);
  tl.to(F.sweat, { opacity: 1, duration: 0.1 }, 1.25).fromTo(F.sweat, { y: -10 }, { y: 18, duration: 0.8, ease: 'power1.in' }, 1.25);

  // slow push-in, breathing, snores rising as ز ز ز
  gsap.set('#ncam', { transformOrigin: '1000px 640px' });
  tl.fromTo('#ncam', { scale: 1.02 }, { scale: 1.1, duration: 5 * B, ease: 'sine.inOut' }, 0);
  tl.to(Q.sq, { scaleY: 1.025, scaleX: 0.99, duration: B, ease: 'sine.inOut', yoyo: true, repeat: 4 }, 0);
  for (let i = 0; i < 3; i++) {
    const z = document.createElement('div');
    z.className = 'zz'; z.textContent = 'ز';
    z.style.cssText = `left:${1400 + i * 30}px;top:250px;font-size:${70 + i * 18}px`;
    $('#nightChars').appendChild(z);
    const t0 = 0.05 + i * 0.62;
    tl.fromTo(z, { opacity: 0, x: 0, y: 0, scale: 0.4, rotation: -12 },
      { keyframes: [
        { opacity: 1, x: 40, y: -60, scale: 0.9, rotation: 10, duration: 0.45, ease: 'sine.out' },
        { x: 110, y: -150, scale: 1.2, rotation: -8, duration: 0.5, ease: 'sine.inOut' },
        { opacity: 0, x: 170, y: -230, scale: 1.35, rotation: 6, duration: 0.35, ease: 'sine.in' }] }, t0);
  }
  ['#st1', '#st2', '#st3', '#st4'].forEach((s, i) => {
    gsap.set(s, { svgOrigin: ['283 187', '357 262', '574 414', '292 440'][i] });
    tl.to(s, { scale: 0.45, duration: B, ease: 'sine.inOut', yoyo: true, repeat: 3 }, i * 0.23);
  });

  // the clock: a tick on every beat, ١١:٥٩ on the downbeat of bar 2, then it goes off
  gsap.set('#clock', { transformOrigin: '50% 100%' });
  for (let b = 1; b <= 4; b++) tl.to('#clkBody', { keyframes: [{ y: -6, duration: 0.05 }, { y: 0, duration: 0.12, ease: 'bounce.out' }] }, b * B);
  tl.set('#clkTxt', { textContent: '١١:٥٩' }, T(1));
  tl.fromTo('#clkTxt', { scale: 1.3, svgOrigin: '95 118' }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, T(1));
  const ALARM = 5 * B;                                   // 2.344
  gsap.set(['#bellL', '#bellR'], { transformOrigin: '50% 100%' });
  const ring = [];
  for (let s = 0; s < 0.42; s += 0.04) ring.push({ rotation: ring.length % 2 ? -12 : 12, y: ring.length % 2 ? -8 : 0, duration: 0.04, ease: 'none' });
  ring.push({ rotation: 0, y: 0, duration: 0.08 });
  tl.to('#clock', { keyframes: ring }, ALARM);
  tl.to('#bellL', { keyframes: ring.map(k => ({ ...k, rotation: -k.rotation * 1.8, y: 0 })) }, ALARM);
  tl.to('#bellR', { keyframes: ring.map(k => ({ ...k, rotation: k.rotation * 1.8, y: 0 })) }, ALARM);
  ['#vibL', '#vibR'].forEach((s, i) => tl.to(s, { keyframes: [
    { opacity: 1, x: i ? 10 : -10, duration: 0.06 }, { opacity: 0.3, x: 0, duration: 0.06 }, { opacity: 1, x: i ? 10 : -10, duration: 0.06 },
    { opacity: 0.3, x: 0, duration: 0.06 }, { opacity: 1, x: i ? 10 : -10, duration: 0.06 }, { opacity: 0, x: 0, duration: 0.1 }] }, ALARM));
  shake('#ncam', ALARM, 0.3, 10);
  // the flame jolts awake too
  F.eyes(ALARM, 'open'); F.mouth(ALARM, 'o');
  tl.to(F.eOpen, { scaleY: 1.15, duration: 0.08 }, ALARM);
  tl.to(F.pos, { keyframes: [{ y: -40, duration: 0.1, ease: 'power2.out' }, { y: 0, duration: 0.12, ease: 'power2.in' }] }, ALARM);

  // THE TAKE: squash down asleep, then leap off the books into «wait», mid-air
  const TAKE = 2.6;
  tl.to(Q.sq, { scaleX: 1.08, scaleY: 0.9, duration: 0.12, ease: 'power2.out' }, TAKE - 0.14);
  Q.pose(TAKE, 'wait');
  tl.set(Q.sh, { opacity: 1 }, TAKE);
  tl.to(Q.sq, { scaleX: 0.84, scaleY: 1.22, duration: 0.06 }, TAKE);
  tl.to(Q.pos, { x: -250, duration: 0.24, ease: 'power2.out' }, TAKE);
  tl.to(Q.pos, { keyframes: [{ y: -140, duration: 0.11, ease: 'power2.out' }, { y: 0, duration: 0.11, ease: 'power2.in' }] }, TAKE);
  tl.fromTo(Q.sh, { x: 0 }, { x: -250, duration: 0.24, ease: 'power2.out', immediateRender: false }, TAKE);
  tl.to(Q.sq, { scaleX: 1, scaleY: 1, duration: 0.1 }, TAKE + 0.07);
  land(Q.sq, TAKE + 0.22, 1.2, 0.8, 0.45);
  bubbleIn('#bubbleWait', TAKE + 0.14, 3.34);
  shake(Q.rot, TAKE + 0.3, 0.3, 4);                       // the shocked hold, vibrating
  gsap.set('#bubbleWait', { transformOrigin: '85% 130%' });

  // the realisation: he looks at the flame
  const REAL = 3.05;
  tl.to(Q.sq, { scaleX: 1.06, scaleY: 0.94, duration: 0.06 }, REAL - 0.04);
  Q.pose(REAL, 'concerned');
  land(Q.sq, REAL + 0.02, 1.04, 0.96, 0.3);
  tl.to('#ncam', { x: 120, scale: 1.16, duration: 0.5, ease: 'power2.inOut' }, REAL - 0.1);
  F.look(REAL, 6, -6); F.mouth(REAL + 0.05, 'wavy');
  tl.to(F.eOpen, { scaleY: 0.85, duration: 0.1 }, REAL);
  F.flicker(2.34, 3.8, 1, 0.07);

  // and he's gone: lean back, then a smear to the left (forward, in Arabic)
  const DASH = 3.5;
  tl.to(Q.rot, { rotation: 7, duration: 0.12, ease: 'power2.out' }, DASH - 0.12);
  tl.to(Q.sq, { scaleX: 1.08, scaleY: 0.92, duration: 0.12, ease: 'power2.out' }, DASH - 0.12);
  Q.pose(DASH, 'cheer');
  tl.to(Q.rot, { rotation: -10, duration: 0.08 }, DASH);
  tl.to(Q.sq, { scaleX: 1.45, scaleY: 0.78, duration: 0.08 }, DASH);
  tl.to(Q.pos, { x: -1900, y: -60, duration: 0.3, ease: 'power3.in' }, DASH);
  tl.to(Q.sh, { opacity: 0, duration: 0.1 }, DASH);
  tl.to(F.pos, { rotation: 14, duration: 0.12 }, DASH + 0.05).to(F.pos, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' }, DASH + 0.17);
  tl.to('#ncam', { x: 2400, duration: 0.3, ease: 'power3.in' }, 3.56);

  /* ======================================================================
     2 · LESSON — three questions, one per beat, the clock racing.
     ====================================================================== */
  {
    const t0 = T(2);
    tl.fromTo('#lcam', { x: -2200 }, { x: 0, duration: 0.36, ease: 'power3.out' }, 3.56);
    const L = rig($('#lessonChars'), { x: -40, y: 287, S: 800, poses: ['read', 'celebrate'], stack: [304, 732] });
    L.pose(0, 'read');
    gsap.set(L.sh, { opacity: 0 });
    tl.fromTo(L.pos, { y: -300 }, { y: 0, duration: 0.24, ease: 'power2.in' }, 3.6);
    land(L.sq, 3.84, 1.14, 0.86, 0.45);

    const QS = [
      { k: 'اختر الإجابة الصحيحة:', s: 'كم قيمة √٤٩؟', fs: 120, c: ['٦', '٧', '٨', '٩'], a: 1 },
      { k: 'اختر الإجابة الصحيحة:', s: 'ناتج ٧٠٠ ÷ ٣٥ يساوي:', fs: 100, c: ['٢٠', '٢', '٢٠٠', '٢٥'], a: 0 },
      { k: 'اختر الإجابة الصحيحة:', s: 'كم ثانية في ٣ دقائق؟', fs: 100, c: ['١٢٠', '١٥٠', '١٨٠', '٢١٠'], a: 2 }
    ];
    const SLOT = [[550, 300], [60, 300], [550, 520], [60, 520]];   // RTL: first choice top-right
    const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const answers = [t0 + B, t0 + 2 * B, t0 + 3 * B];
    const prog = ['8%', '38%', '68%', '100%'];
    gsap.set('#ltouch', { left: 1300, top: 900 });
    QS.forEach((q, i) => {
      const card = document.createElement('div');
      card.className = 'qcard';
      card.innerHTML = `<div class="qk">${q.k}</div><div class="qs" style="font-size:${q.fs}px">${q.s}</div>` +
        q.c.map((c, j) => `<div class="tile" style="left:${SLOT[j][0]}px;top:${SLOT[j][1]}px"><div class="face">${c}</div><div class="ok">${c}</div>${j === q.a ? `<div class="badge">${CHECK}</div>` : ''}</div>`).join('');
      $('#cards').appendChild(card);
      const tiles = [...card.querySelectorAll('.tile')];
      const right = tiles[q.a], badge = right.querySelector('.badge');
      gsap.set(badge, { scale: 0 });
      gsap.set(tiles, { transformOrigin: '50% 100%' });
      const A = answers[i], tin = i === 0 ? 3.66 : answers[i - 1] + 0.2;
      // in from the left, out to the right
      tl.fromTo(card, { x: -2200, rotation: -6, opacity: 1 }, { x: 0, rotation: 0, duration: 0.26, ease: 'back.out(1.3)' }, tin);
      tiles.forEach((tile, j) => tl.fromTo(tile, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: 'back.out(2)' }, tin + 0.06 + j * 0.025));
      // the tap
      const cx = 740 + SLOT[q.a][0] + 235, cy = 180 + SLOT[q.a][1] + 85;
      tl.to('#ltouch', { left: cx, top: cy + 20, opacity: 1, duration: 0.14, ease: 'power2.out' }, A - 0.16)
        .to('#ltouch', { scale: 0.75, duration: 0.05 }, A - 0.03)
        .to('#ltouch', { scale: 1, opacity: 0, duration: 0.16 }, A + 0.05);
      tl.to(right.querySelector('.ok'), { opacity: 1, duration: 0.04 }, A);
      tl.to(right, { keyframes: [
        { y: -30, scaleX: 0.96, scaleY: 1.05, duration: 0.1, ease: 'power2.out' },
        { y: 0, scaleX: 1, scaleY: 1, duration: 0.09, ease: 'power2.in' },
        { scaleX: 1.05, scaleY: 0.9, duration: 0.04 },
        { scaleX: 1, scaleY: 1, duration: 0.25, ease: 'elastic.out(1,0.5)' }] }, A);
      tl.to(badge, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, A + 0.04);
      tiles.forEach((tile, j) => j !== q.a && tl.to(tile, { opacity: 0.35, duration: 0.1 }, A + 0.02));
      tl.to('#lprog', { width: prog[i + 1], duration: 0.3, ease: 'back.out(1.6)' }, A + 0.02);
      if (i < 2) tl.to(card, { x: 1500, rotation: 8, duration: 0.2, ease: 'power3.in' }, answers[i] + 0.2);
      // he bounces on his books with every right answer
      if (i < 2) hop(L, A + 0.2, 34, 0.16, { antic: 0.05 });
    });
    // the clock chip races: ١١:٥٩:٤٠ → :٥٨, the hand spinning
    const secs = counter('#tcTxt', v => '١١:٥٩:' + toAr(String(Math.floor(v)).padStart(2, '0')), 40);
    tl.to(secs, { v: 58.9, duration: T(3) - 3.66, ease: 'none' }, 3.66);
    tl.to('#tchand', { rotation: 1080, svgOrigin: '11 11.2', duration: 2.4, ease: 'none' }, 3.66);
    tl.to('#tchip', { keyframes: [{ scale: 1.08, duration: B / 2 }, { scale: 1, duration: B / 2 }], repeat: 4, transformOrigin: '0% 50%' }, 3.7);

    // FULL: «أحسنت!» slams, he leaps off the books
    const FULL = T(3);
    gsap.set('#praise', { xPercent: -50, yPercent: -50, scale: 0, transformOrigin: '50% 70%' });
    tl.to('#praise', { scale: 1, duration: 0.42, ease: 'back.out(2.6)' }, FULL);
    tl.fromTo('#praise', { rotation: -8 }, { rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.45)' }, FULL);
    tl.to('.qcard:last-child', { opacity: 0.12, scale: 0.94, duration: 0.2 }, FULL);
    tl.to('.lbar .prog i', { backgroundColor: '#FFC800', duration: 0.1, yoyo: true, repeat: 1 }, FULL);
    hop(L, FULL + 0.36, 190, 0.36, { swapTo: 'celebrate', lean: -4, antic: 0.08 });
    tl.set(L.sh, { opacity: 1 }, FULL - 0.1);
    tl.to('#lcam', { x: 2400, duration: 0.24, ease: 'power3.in' }, 5.96);
  }

  /* ======================================================================
     3 · RETURN — the flame gathers itself and roars back. 6.56 on the beat.
     ====================================================================== */
  {
    const BURST = T(3) + 2 * B;                            // 6.5625
    tl.set(Q.el, { opacity: 0 }, 5.98).set(Q.sh, { opacity: 0 }, 5.98).set('#bubbleWait', { opacity: 0 }, 5.98);
    tl.set('#ncam', { x: 0, y: 0, rotation: 0 }, 5.98);
    gsap.set('#ncam', { transformOrigin: '1000px 640px' });
    tl.set('#ncam', { transformOrigin: '500px 760px', scale: 1.55, y: -170 }, 5.98);
    tl.fromTo('#ncam', { x: -2400 }, { x: 460, duration: 0.3, ease: 'power3.out', immediateRender: false }, 5.98);
    F.mouth(6.1, 'frown'); F.look(6.1, 0, 0);
    tl.set(F.brows, { opacity: 0 }, 6.2);
    // anticipation: eyes squeezed, gathering down
    F.eyes(6.22, 'shut'); F.mouth(6.22, 'frown');
    tl.to(F.sq, { scaleX: 1.25, scaleY: 0.72, duration: 0.3, ease: 'power2.in' }, 6.24);
    F.flicker(5.98, 6.5, 1.4, 0.05);
    // FWOOSH
    F.eyes(BURST, 'open'); F.mouth(BURST, 'grin');
    tl.set(F.sweat, { opacity: 0 }, BURST);
    tl.to(F.eOpen, { scaleY: 1.15, duration: 0.1 }, BURST);
    tl.to(F.sq, { scaleX: 0.78, scaleY: 1.45, duration: 0.08, ease: 'power2.out' }, BURST)
      .to(F.sq, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.35)' }, BURST + 0.08);
    tl.to(F.sc, { scale: 1.12, duration: 0.3, ease: 'back.out(2)' }, BURST);
    F.color(BURST, '#FF9600', '#FFC800', 0.12);
    tl.to('#glow', { scale: 1.6, opacity: 1, duration: 0.4, ease: 'expo.out' }, BURST);
    tl.to('#warm', { opacity: 1, duration: 0.35, ease: 'power2.out' }, BURST);
    shake('#ncam', BURST, 0.22, 12);
    F.flicker(BURST, 7.5, 1.1, 0.07);
    F.eyes(BURST + 0.3, 'happy');
    // the flare that carries us into the streak screen
    tl.to(F.face, { opacity: 0, duration: 0.12 }, 7.18);
    tl.set(F.sc, { transformOrigin: '50% 58%' }, 7.15);
    tl.to(F.sc, { scale: 18, duration: 0.35, ease: 'expo.in' }, 7.15);
  }

  /* ======================================================================
     4 · STREAK — ٤٣ rolls to ٤٤, today gets its tick.
     ====================================================================== */
  const SF = flame($('#streakFlame'), { cx: 960, bottom: 470, H: 360 });
  {
    const t0 = T(4);
    gsap.set('#num', { xPercent: -50 });
    gsap.set(['#slabel', '#week'], { xPercent: -50 });
    SF.eyes(0, 'happy'); SF.mouth(0, 'grin');
    gsap.set(SF.sc, { transformOrigin: '50% 58%' });
    tl.fromTo(SF.sc, { scale: 16 }, { scale: 1, duration: 0.55, ease: 'expo.out', immediateRender: false }, t0);
    tl.fromTo(SF.face, { opacity: 0 }, { opacity: 1, duration: 0.15, immediateRender: false }, t0 + 0.15);
    SF.flicker(t0, T(6), 0.9, 0.08);
    tl.fromTo('#num', { y: 80, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, t0 + 0.12);
    tl.fromTo('#slabel', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(2)' }, t0 + 0.22);
    // the roll, on beat 1: the flame jumps with it
    const ROLL = t0 + B;
    tl.to('#ones', { y: -300, duration: 0.42, ease: 'back.out(2.2)' }, ROLL);
    tl.fromTo('#num', { scale: 1.14 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.45)', immediateRender: false }, ROLL);
    SF.eyes(ROLL - 0.1, 'open');
    SF.hop(ROLL + 0.3, 70, 0.3);
    SF.eyes(ROLL + 0.3, 'happy');
    // the week: six days already done, today pops on beat 2
    const DAYS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
    const CHK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    DAYS.forEach((d, i) => {
      const day = document.createElement('div');
      day.className = 'day';
      day.innerHTML = `<b>${d}</b><div class="dot"><div class="fill">${CHK}</div></div>`;
      $('#week').appendChild(day);
      const fill = day.querySelector('.fill');
      const today = i === 6;
      tl.fromTo(day, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, t0 + 0.2 + i * 0.03);
      tl.fromTo(fill, { scale: 0 }, { scale: 1, duration: today ? 0.45 : 0.3, ease: today ? 'back.out(3.4)' : 'back.out(2)', immediateRender: true }, today ? t0 + 2 * B : t0 + 0.34 + i * 0.045);
      if (today) {
        tl.to(day.querySelector('b'), { color: '#FF9600', duration: 0.1 }, t0 + 2 * B);
        tl.fromTo(day, { y: 0 }, { keyframes: [{ y: -34, duration: 0.12, ease: 'power2.out' }, { y: 0, duration: 0.14, ease: 'power2.in' }], immediateRender: false }, t0 + 2 * B);
      }
    });
    SF.hop(t0 + 3 * B, 50, 0.24);

    /* 5 · CELEBRATE — he leaps in, the room floods blue, they hop on the beat */
    const C = rig($('#celebChars'), { x: 820, y: 169, S: 860, poses: ['cheer', 'celebrate'] });
    C.pose(0, 'cheer');
    const LAND = T(5);
    tl.fromTo(C.pos, { x: 1100, y: -60 }, { x: 0, duration: 0.44, ease: 'power1.out', immediateRender: true }, LAND - 0.44);
    tl.to(C.pos, { keyframes: [{ y: -430, duration: 0.2, ease: 'power2.out' }, { y: 0, duration: 0.24, ease: 'power2.in' }] }, LAND - 0.44);
    tl.fromTo(C.sh, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.3, immediateRender: true }, LAND - 0.3);
    tl.fromTo(C.rot, { rotation: 18 }, { rotation: 0, duration: 0.42, ease: 'power2.out', immediateRender: true }, LAND - 0.42);
    land(C.sq, LAND, 1.2, 0.8, 0.5);
    // the flame hops down to the floor to meet him; the numbers fall away
    tl.to(['#num', '#slabel', '#week'], { y: 900, rotation: (i) => [6, -8, 4][i], duration: 0.34, ease: 'power3.in', stagger: 0.03 }, LAND - 0.4);
    tl.to(SF.pos, { x: -260, duration: 0.4, ease: 'power1.inOut' }, LAND - 0.4);
    tl.to(SF.pos, { keyframes: [{ y: -140, duration: 0.16, ease: 'power2.out' }, { y: 530, duration: 0.24, ease: 'power2.in' }] }, LAND - 0.4);
    land(SF.sq, LAND, 1.25, 0.78, 0.45);
    gsap.set('#flood', { scale: 0 });
    tl.to('#flood', { scale: 1, duration: 0.6, ease: 'expo.out' }, LAND);
    const FS = document.createElement('div');
    FS.className = 'shadow';
    Object.assign(FS.style, { left: '590px', top: '986px', width: '220px', height: '32px', background: 'rgba(0,0,0,.2)', opacity: 0 });
    $('#celebChars').appendChild(FS);
    tl.to(FS, { opacity: 1, duration: 0.1 }, LAND);
    SF.eyes(LAND, 'open'); SF.look(LAND, 8, -2);
    // call and response: flame flips on 1, he jumps (celebrate) on 2, both on 3
    SF.hop(T(5) + B + 0.28, 230, 0.4, -360);
    SF.eyes(T(5) + B, 'happy');
    tl.to(FS, { scale: 0.5, duration: 0.2, yoyo: true, repeat: 1 }, T(5) + B - 0.12);
    hop(C, T(5) + 2 * B + 0.3, 210, 0.34, { swapTo: 'celebrate', lean: -3 });
    hop(C, T(5) + 3 * B + 0.3, 170, 0.34, { swapTo: 'cheer', swapAt: T(5) + 3 * B - 0.04, lean: 3 });
    SF.hop(T(5) + 3 * B + 0.3, 200, 0.34);
    tl.to(FS, { scale: 0.5, duration: 0.17, yoyo: true, repeat: 1 }, T(5) + 3 * B - 0.04);
    tl.to('#scam', { x: 2400, duration: 0.26, ease: 'power3.in' }, T(6) - 0.24);
  }

  /* ======================================================================
     6 · TAGLINE — «لا تكسر السلسلة!», and the flame lands on the last word.
     ====================================================================== */
  {
    const t0 = T(6);
    tl.fromTo('#tcam', { x: -2200 }, { x: 0, duration: 0.3, ease: 'power3.out' }, t0 - 0.2);
    const P = rig($('#tagChars'), { x: 30, y: 287, S: 800, poses: ['proud'] });
    P.pose(0, 'proud');
    // words drop on 1, the "and", and 2 — each one lands with weight
    [['#w1', t0], ['#w2', t0 + B / 2], ['#w3', t0 + B]].forEach(([s, t]) => {
      gsap.set(s, { transformOrigin: '50% 100%' });
      tl.fromTo(s, { y: -700, scaleX: 0.8, scaleY: 1.25 }, { y: 0, scaleX: 0.8, scaleY: 1.25, duration: 0.2, ease: 'power2.in' }, t - 0.2);
      tl.to(s, { keyframes: [{ scaleX: 1.2, scaleY: 0.78, duration: 0.05 }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.4)' }] }, t);
    });
    // he nods along, arms crossed
    [t0, t0 + B, t0 + 2 * B, t0 + 3 * B].forEach(t => tl.to(P.rot, { keyframes: [{ rotation: -4, duration: 0.09 }, { rotation: 0, duration: 0.3, ease: 'elastic.out(1, 0.5)' }] }, t));
    tl.to(P.sq, { scaleY: 1.02, duration: B, yoyo: true, repeat: 3, ease: 'sine.inOut' }, t0);
    // the flame arcs in from the left and lands on «السلسلة!», which squashes under it
    const TF = flame($('#tagChars'), { cx: 945, bottom: 486, H: 250 });
    TF.eyes(0, 'happy'); TF.mouth(0, 'grin');
    TF.flicker(t0, T(7), 0.9, 0.08);
    const FL = t0 + 2 * B;
    tl.fromTo(TF.pos, { x: -700, y: -500, rotation: -30 }, { x: 0, rotation: 0, duration: 0.4, ease: 'power1.out', immediateRender: true }, FL - 0.4);
    tl.to(TF.pos, { keyframes: [{ y: -640, duration: 0.14, ease: 'power2.out' }, { y: 0, duration: 0.26, ease: 'power2.in' }] }, FL - 0.4);
    land(TF.sq, FL, 1.3, 0.72, 0.5);
    tl.to('#w3', { keyframes: [{ scaleX: 1.06, scaleY: 0.86, duration: 0.05 }, { scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' }] }, FL);
    TF.eyes(FL + 0.1, 'open'); TF.look(FL + 0.1, -6, 2);
    TF.eyes(FL + 0.55, 'happy');
    TF.hop(t0 + 3 * B + 0.2, 60, 0.22);
    tl.fromTo('#tsub .w', { yPercent: 170 }, { yPercent: 0, duration: 0.45, ease: 'power4.out', stagger: 0.05 }, t0 + 2 * B + 0.18);
    // a green wave rises into the end card
    tl.fromTo('#wipe', { y: 1100 }, { y: -300, duration: 0.42, ease: 'power2.in' }, T(7) - 0.36);
  }

  /* ======================================================================
     7 · END — «موعدنا غداً!». The flame hops onto the URL and presses it.
     ====================================================================== */
  {
    const t0 = T(7);
    const E = rig($('#endChars'), { x: 1000, y: 229, S: 860, poses: ['wave'] });
    E.pose(0, 'wave');
    tl.fromTo(E.pos, { y: 700 }, { keyframes: [{ y: -60, duration: 0.22, ease: 'power2.out' }, { y: 0, duration: 0.14, ease: 'power2.in' }] }, t0 - 0.04);
    tl.fromTo(E.sq, { scaleX: 0.86, scaleY: 1.16 }, { scaleX: 1, scaleY: 1, duration: 0.22, immediateRender: false }, t0 - 0.04);
    land(E.sq, t0 + 0.32, 1.12, 0.88, 0.5);
    tl.fromTo(E.sh, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.2, immediateRender: true }, t0 + 0.14);
    // the wave: a rock from the feet, on the beat
    [t0 + 0.7, t0 + 0.7 + B, t0 + 0.7 + 2 * B].forEach(t => tl.to(E.rot, { keyframes: [{ rotation: -4, duration: B / 2, ease: 'sine.inOut' }, { rotation: 3, duration: B / 2, ease: 'sine.inOut' }] }, t));
    bubbleIn('#bubbleEnd', t0 + 0.42);
    gsap.set('#bubbleEnd', { transformOrigin: '85% 120%' });

    gsap.set(['#wordmark', '#esub'], { xPercent: -50 });
    tl.fromTo('#wordmark .w', { yPercent: 170 }, { yPercent: 0, duration: 0.6, ease: 'power4.out' }, t0 + 0.08);
    tl.fromTo('#wordmark', { textShadow: '0px 0px 0px #478700', y: 16 }, { textShadow: '0px 16px 0px #478700', y: 0, duration: 0.3, ease: 'back.out(2)' }, t0 + 0.46);
    tl.fromTo('#esub .w', { yPercent: 170 }, { yPercent: 0, duration: 0.45, ease: 'power4.out', stagger: 0.05 }, t0 + 0.4);
    tl.fromTo('#url', { y: -50, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, t0 + 0.62);
    gsap.set('.dia', { rotation: 45 });
    [['#d1', -14, 8], ['#d2', 12, -10], ['#d3', -10, -6], ['#d4', 16, 12]].forEach(([s, dy, dr]) =>
      tl.fromTo(s, { y: 0, rotation: 45, scale: 0 }, { y: dy, rotation: 45 + dr, scale: 1, duration: BAR, ease: 'sine.out' }, t0));

    // the flame: pops up beside him, then the big jump onto the button — pressing it on the final hit
    const EF = flame($('#endChars'), { cx: 1010, bottom: 1030, H: 215 });
    EF.eyes(0, 'happy'); EF.mouth(0, 'grin');
    EF.flicker(t0, DUR, 0.9, 0.08);
    tl.fromTo(EF.sc, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(2.6)', immediateRender: true }, t0 + 0.25);
    const PRESS = t0 + 2.5 * B;                            // 14.297
    EF.eyes(PRESS - 0.5, 'open'); EF.look(PRESS - 0.5, -8, -6);
    tl.to(EF.sq, { scaleX: 1.2, scaleY: 0.8, duration: 0.1 }, PRESS - 0.44)
      .to(EF.sq, { scaleX: 0.86, scaleY: 1.18, duration: 0.07 }, PRESS - 0.34)
      .to(EF.sq, { scaleX: 1, scaleY: 1, duration: 0.14 }, PRESS - 0.27);
    tl.to(EF.pos, { x: -450, duration: 0.34, ease: 'power1.inOut' }, PRESS - 0.34);
    tl.to(EF.pos, { keyframes: [{ y: -510, duration: 0.18, ease: 'power2.out' }, { y: -354, duration: 0.16, ease: 'power2.in' }] }, PRESS - 0.34);
    land(EF.sq, PRESS, 1.3, 0.72, 0.5);
    EF.eyes(PRESS, 'shut'); EF.eyes(PRESS + 0.2, 'happy');
    tl.to('#urlFace', { y: 14, duration: 0.04, ease: 'power2.in' }, PRESS - 0.04)
      .to('#urlFace', { y: 0, duration: 0.3, ease: 'back.out(3)' }, PRESS + 0.14);
    tl.to(EF.pos, { y: -368, duration: 0.3, ease: 'back.out(3)' }, PRESS + 0.14);
    EF.blink(14.75);
  }

  /* ---------- driver ---------- */
  tl.seek(0, false); sync();
  const render = /[?&]render\b/.test(location.search);
  const stage = $('#stage');
  window.__DUR = DUR;
  window.__seek = t => { tl.seek(t, false); sync(); };
  window.__ready = (async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    return true;
  })();
  if (render) { document.documentElement.classList.add('render'); return; }
  const fit = () => {
    const s = Math.min(innerWidth / 1920, (innerHeight - 56) / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 56 - 1080 * s) / 2}px) scale(${s})`;
  };
  addEventListener('resize', fit); fit();
  const snd = $('#snd'), btn = $('#play'), scrub = $('#scrub'), clock = $('#clockUi');
  let playing = false, t = 0, last = 0;
  const hasAudio = () => snd.readyState >= 2 && !snd.error;
  const draw = () => { window.__seek(t); scrub.value = t; clock.textContent = t.toFixed(3) + ' s'; };
  const loop = now => {
    if (!playing) return;
    t = hasAudio() && !snd.paused ? snd.currentTime : t + (now - last) / 1000;
    last = now;
    if (t >= DUR) { t = DUR; playing = false; btn.textContent = '▶ Play'; snd.pause(); }
    draw();
    if (playing) requestAnimationFrame(loop);
  };
  const play = () => {
    if (t >= DUR) t = 0;
    playing = true; btn.textContent = '❚❚ Pause'; last = performance.now();
    if (hasAudio()) { snd.currentTime = t; snd.play().catch(() => {}); }
    requestAnimationFrame(loop);
  };
  const pause = () => { playing = false; btn.textContent = '▶ Play'; snd.pause(); };
  btn.onclick = () => (playing ? pause() : play());
  scrub.oninput = () => { pause(); t = +scrub.value; draw(); };
  addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); btn.click(); } });
  draw();
})();
