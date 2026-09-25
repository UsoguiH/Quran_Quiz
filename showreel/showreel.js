/* قدراتي — 15-second showreel.
   One paused GSAP master timeline, cut to a 128 BPM grid: eight bars of
   1.875 s, one shot per bar. Everything is a pure function of time, so the
   renderer can seek to any sub-frame and get the same picture every run. */
(() => {
  gsap.registerPlugin(CustomEase);

  const B = 60 / 128;                 // one beat
  const BAR = 4 * B;                  // 1.875 s
  const T = i => i * BAR;             // shot i starts here
  const DUR = 8 * BAR;                // 15.000 s
  const $ = s => document.querySelector(s);
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const toAr = n => String(n).replace(/\d/g, d => AR[d]);

  // a sharp, confident settle: most of the move happens in the first third
  CustomEase.create('snap', 'M0,0 C0.1,0.7 0.2,1 1,1');

  const tl = gsap.timeline({ paused: true });

  /* ---------- counters: tweened proxies, written to the DOM after every seek ---------- */
  const counters = [];
  function counter(sel, fmt, v0 = 0) {
    const o = { v: v0 };
    counters.push({ o, el: $(sel), fmt });
    return o;
  }
  function sync() { for (const c of counters) c.el.textContent = c.fmt(c.o.v); }

  /* ---------- scene windows and stacking ---------- */
  const Z = { s1: 1, s2: 2, s3: 3, s5: 4, s4: 5, s6: 6, s7: 7, s8: 8 };
  for (const id in Z) gsap.set('#' + id, { zIndex: Z[id] });
  function show(id, from, to) {
    tl.set('#' + id, { visibility: 'visible' }, from);
    if (to < DUR) tl.set('#' + id, { visibility: 'hidden' }, to);
  }
  show('s1', 0, T(1));
  show('s2', T(1), T(2) + 0.1);
  show('s3', T(2) - 0.16, T(3) + 0.12);
  show('s4', T(3) - 0.4, T(4) + 0.02);
  show('s5', T(4) - 0.62, T(5) + 0.06);
  show('s6', T(5) - 0.36, T(6));
  show('s7', T(6), T(7) + 0.02);
  show('s8', T(7), DUR);

  /* reveal words from behind their masks, in reading order */
  function words(sel, t, { stagger = 0.06, dur = 0.55, ease = 'power4.out' } = {}) {
    tl.fromTo(sel, { yPercent: 165 }, { yPercent: 0, duration: dur, ease, stagger }, t);
  }

  /* squash on impact, then a springy settle (origin must sit at the feet) */
  function impact(el, t, sx = 1.2, sy = 0.82, settle = 0.5) {
    tl.to(el, { scaleX: sx, scaleY: sy, duration: 0.06, ease: 'power2.out' }, t)
      .to(el, { scaleX: 1, scaleY: 1, duration: settle, ease: 'elastic.out(1.1, 0.42)' }, t + 0.06);
  }

  /* ======================================================================
     S1 · 0.000 — the start node. Pop, «ابدأ», press, dive into the star.
     ====================================================================== */
  {
    const t0 = T(0);
    gsap.set('#s1grp', { scale: 1.4, transformOrigin: '960px 547px' });
    gsap.set('#s1node', { transformOrigin: '50% 100%', scaleX: 0, scaleY: 0 });
    gsap.set('#s1tip', { xPercent: -50, yPercent: -100, transformOrigin: '50% 130%', scale: 0 });
    gsap.set('#s1ring', { scale: 0.5, opacity: 0, transformOrigin: '50% 50%' });

    // the node grows out of the page: stretch up, squash down, settle
    tl.to('#s1node', { keyframes: [
      { scaleX: 0.7, scaleY: 1.3, duration: 0.15, ease: 'power3.out' },
      { scaleX: 1.2, scaleY: 0.8, duration: 0.09, ease: 'power2.in' },
      { scaleX: 0.95, scaleY: 1.06, duration: 0.1, ease: 'sine.out' },
      { scaleX: 1, scaleY: 1, duration: 0.14, ease: 'sine.inOut' }
    ] }, t0 + 0.02);
    tl.to('#s1ring', { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.2)' }, t0 + 0.2);
    tl.to('#s1arc', { attr: { 'stroke-dashoffset': 62 }, duration: 0.55, ease: 'power2.inOut' }, t0 + 0.3);

    // the tooltip lands on beat 1 and bobs
    tl.to('#s1tip', { scale: 1, duration: 0.4, ease: 'back.out(3.2)' }, t0 + B - 0.05);
    tl.to('#s1tip', { y: -14, duration: B / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, t0 + B + 0.3);

    // beat 2: the press. The face drops onto its lip, exactly like the app's :active
    tl.to('#s1face', { y: 30, duration: 0.05, ease: 'power2.in' }, t0 + 2 * B - 0.05)
      .to('#s1node', { scaleX: 1.04, scaleY: 0.97, duration: 0.05 }, t0 + 2 * B - 0.05)
      .to('#s1tip', { scale: 0, duration: 0.18, ease: 'back.in(2.5)' }, t0 + 2 * B - 0.02)
      .to('#s1face', { y: 0, duration: 0.3, ease: 'back.out(3)' }, t0 + 2.5 * B)
      .to('#s1node', { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'back.out(3)' }, t0 + 2.5 * B)
      .to('#s1star', { rotation: 72, duration: 0.5, ease: 'back.out(2)' }, t0 + 2.5 * B);

    // beat 3 → downbeat: dive into the star, which becomes the white of the next shot
    gsap.set('#s1cam', { transformOrigin: '960px 547px' });
    tl.to('#s1cam', { scale: 52, rotation: 28, duration: 0.64, ease: 'expo.in' }, T(1) - 0.64);
  }

  /* ======================================================================
     S2 · 1.875 — the path. Lessons light up gold, one per eighth note.
     ====================================================================== */
  {
    const t0 = T(1);
    const PATH = [
      'ترتيب العمليات والتبسيط', 'قوانين العد الذهبية', 'الاحتمالات', null,
      'قراءة البيانات والرسوم', 'الترتيب والاستنتاج', 'المتتابعات والأنماط', 'فن المقارنة'
    ];
    const XO = [0, -92, -138, -92, 0, 92, 138, 92];
    const Y0 = 290, DY = 200;
    const STAR = $('#s1star path').getAttribute('d');
    const host = $('#s2path');
    const nodes = PATH.map((title, i) => {
      const el = document.createElement('div');
      el.className = 'pn';
      el.style.left = XO[i] + 'px';
      el.style.top = (Y0 + i * DY) + 'px';
      el.innerHTML = title
        ? `<div class="node st-lock"><div class="lip"></div><div class="face"><div class="shine"></div><svg class="ico" viewBox="0 0 42 40"><path fill="#fff" d="${STAR}"/></svg></div></div><div class="lbl">${title}</div>`
        : `<div class="pchest">${chestArt().closed}</div>`;
      host.appendChild(el);
      return el;
    });
    const tip = document.createElement('div');
    tip.className = 'tip'; tip.id = 's2tip'; tip.textContent = 'ابدأ';
    host.appendChild(tip);

    gsap.set('#s2col', { scale: 1.35, transformOrigin: '0px 0px' });
    gsap.set('#s2cam', { transformOrigin: '640px 420px' });
    tl.fromTo('#s2cam', { scale: 0.5, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'expo.out' }, t0);
    tl.fromTo('#s2banner', { y: -260 }, { y: 0, duration: 0.5, ease: 'back.out(1.6)' }, t0 + 0.02);

    // every node pops up out of the page on sixteenths
    nodes.forEach((el, i) => {
      const n = el.firstElementChild;
      gsap.set(n, { transformOrigin: '50% 100%' });
      tl.fromTo(n, { scale: 0 }, { scale: 1, duration: 0.42, ease: 'back.out(2.4)' }, t0 + 0.04 + i * 0.05);
      const lbl = el.querySelector('.lbl');
      if (lbl) tl.fromTo(lbl, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3 }, t0 + 0.1 + i * 0.05);
    });

    const paint = (el, face, lip, shine) => [
      [el.querySelector('.face'), { backgroundColor: face }],
      [el.querySelector('.lip'), { backgroundColor: lip }],
      [el.querySelector('.shine'), { backgroundColor: shine }]
    ];
    const setState = (i, st, t) => {
      const el = nodes[i];
      if (!PATH[i]) return;
      const c = st === 'cur' ? ['#58CC02', '#58A700', '#71DC1A', '#4B4B4B']
        : st === 'done' ? ['#FFC800', '#E6A000', '#FFE700', '#E6A000'] : null;
      for (const [node, v] of paint(el, c[0], c[1], c[2])) tl.to(node, { ...v, duration: 0.06, ease: 'none' }, t);
      tl.to(el.querySelector('.lbl'), { color: c[3], duration: 0.06, ease: 'none' }, t);
    };
    const hop = (i, t, h = 34) => {
      const n = nodes[i].firstElementChild;
      tl.to(n, { keyframes: [
        { y: -h, scaleX: 0.9, scaleY: 1.1, duration: 0.11, ease: 'power2.out' },
        { y: 0, scaleX: 1, scaleY: 1, duration: 0.1, ease: 'power2.in' },
        { scaleX: 1.16, scaleY: 0.86, duration: 0.05, ease: 'power1.out' },
        { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1, 0.45)' }
      ] }, t);
    };

    // first lesson is the one you're on
    setState(0, 'cur', t0 + 0.2);
    gsap.set(tip, { xPercent: -50, yPercent: -100, x: XO[0], y: Y0 - 44, scale: 0, transformOrigin: '50% 130%' });
    tl.to(tip, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, t0 + 0.3);

    // then the run: complete → next, on eighths, while the page scrolls
    const order = [0, 1, 2, 3, 4, 5];
    order.forEach((i, k) => {
      const t = t0 + B + k * (B / 2) - 0.02;
      if (PATH[i]) { setState(i, 'done', t); hop(i, t); }
      else { // the chest on the path wiggles as you pass it
        const c = nodes[i].firstElementChild;
        gsap.set(c, { transformOrigin: '50% 100%' });
        tl.to(c, { keyframes: [
          { rotation: -10, y: -26, duration: 0.09 }, { rotation: 8, y: 0, duration: 0.09 },
          { rotation: -4, duration: 0.08 }, { rotation: 0, duration: 0.14 }] }, t);
      }
      const nx = i + 1;
      const target = PATH[nx] ? nx : nx + 1;
      if (i !== 3) setState(target, 'cur', t + 0.05);
      tl.to(tip, { x: XO[target], y: Y0 + target * DY - 44, duration: B / 2 - 0.03, ease: 'back.out(1.8)' }, t + 0.03);
    });
    tl.to('#s2col', { y: -1330, duration: 1.5, ease: 'power2.inOut' }, t0 + 0.3);

    // the headline, reading right to left
    words('#s2head .kick .w', t0 + 0.22);
    words('#s2head h1 .w', t0 + 0.32, { stagger: 0.09, dur: 0.6 });

    // exit: a whip to the right, which is "forward" in Arabic
    tl.to('#s2cam', { x: 2400, duration: 0.34, ease: 'power3.in' }, T(2) - 0.3);
  }

  /* ======================================================================
     S3 · 3.750 — the question. Pick «٧ من مئة», check, «أحسنت!».
     ====================================================================== */
  {
    const t0 = T(2);
    const CH = [['أ', '٧ آحاد'], ['ب', '٧ من مئة'], ['جـ', '٧ أعشار'], ['د', '٧ من ألف']];
    const top0 = 336, gap = 122;
    const host = $('#s3choices');
    const els = CH.map(([l, txt], i) => {
      const el = document.createElement('div');
      el.className = 'choice';
      el.style.top = (top0 + i * gap) + 'px';
      el.innerHTML = `<div class="lt">${l}</div><span>${txt}</span>` +
        `<div class="st st-sel"><div class="lt">${l}</div><span>${txt}</span></div>` +
        `<div class="st st-ok"><div class="lt">${l}</div><span>${txt}</span></div>`;
      host.appendChild(el);
      return el;
    });

    // the shot slams in from the left, the card trailing on a longer spring
    tl.fromTo('#s3', { x: -1920 }, { x: 0, duration: 0.4, ease: 'power3.out' }, t0 - 0.16);
    gsap.set('#s3card', { transformOrigin: '50% 50%' });
    tl.fromTo('#s3card', { x: -700, rotationY: 38, rotationZ: -6 },
      { x: 0, rotationY: 12, rotationZ: 0, duration: 0.9, ease: 'expo.out' }, t0 - 0.16);
    tl.to('#s3card', { rotationY: 5, duration: BAR - 0.7, ease: 'sine.inOut' }, t0 + 0.74);

    // UI assembles
    tl.fromTo('#s3bar', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, t0 + 0.05);
    tl.fromTo('#s3prog', { width: '28%' }, { width: '46%', duration: 0.6, ease: 'power3.inOut' }, t0 + 0.2);
    words('#s3card .qprompt .w', t0 + 0.1);
    words('#s3card .qstem .w', t0 + 0.2);
    els.forEach((el, i) => tl.fromTo(el, { y: 70, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.7)' }, t0 + 0.24 + i * 0.055));
    tl.fromTo('#s3check', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }, t0 + 0.46);
    gsap.set('#qchkOn', { opacity: 0 });
    gsap.set('#s3fb', { yPercent: 102 });

    // the 60-second clock, ticking in real time
    const clk = counter('#s3time', v => { const s = Math.ceil(v - 1e-6); return s >= 60 ? '١:٠٠' : '٠:' + toAr(String(s).padStart(2, '0')); }, 60);
    tl.to(clk, { v: 58.1, duration: BAR, ease: 'none' }, t0);
    tl.to('#s3hand', { rotation: 540, svgOrigin: '11 11.2', duration: BAR, ease: 'none' }, t0);

    // the finger: tap «ب» on beat 1, tap «تحقق» on beat 2
    const P1 = { left: 560, top: top0 + gap + 52 }, P2 = { left: 470, top: 980 - 44 - 50 };
    gsap.set('#s3touch', { ...P1, scale: 0.4, opacity: 0 });
    tl.to('#s3touch', { scale: 1, opacity: 1, duration: 0.14, ease: 'power2.out' }, t0 + B - 0.16)
      .to('#s3touch', { scale: 0.78, duration: 0.06 }, t0 + B - 0.02)
      .to('#s3touch', { scale: 1, duration: 0.12 }, t0 + B + 0.06)
      .to('#s3touch', { left: P2.left, top: P2.top, duration: 0.3, ease: 'power3.inOut' }, t0 + B + 0.12)
      .to('#s3touch', { scale: 0.78, duration: 0.06 }, t0 + 2 * B - 0.03)
      .to('#s3touch', { scale: 1.2, opacity: 0, duration: 0.22 }, t0 + 2 * B + 0.06);

    const pick = els[1];
    tl.set(pick.querySelector('.st-sel'), { opacity: 1 }, t0 + B)
      .fromTo(pick, { scale: 0.96 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, t0 + B)
      .set('#qchkOn', { opacity: 1 }, t0 + B)
      .fromTo('#qchkOn', { scale: 0.96 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, t0 + B);

    // «تحقق»: the face drops onto its lip…
    tl.to('#qchkFace', { y: 12, duration: 0.05, ease: 'power2.in' }, t0 + 2 * B - 0.03)
      .to('#qchkFace', { y: 0, duration: 0.2, ease: 'back.out(3)' }, t0 + 2 * B + 0.09);

    // …and the answer turns green and jumps (the app's own correct-answer hop)
    const ok = t0 + 2 * B + 0.04;
    gsap.set(pick, { transformOrigin: '50% 100%' });
    tl.set(pick.querySelector('.st-ok'), { opacity: 1 }, ok)
      .set(pick.querySelector('.st-sel'), { opacity: 0 }, ok)
      .to(pick, { keyframes: [
        { y: -34, scaleX: 0.97, scaleY: 1.05, duration: 0.12, ease: 'power2.out' },
        { y: 0, scaleX: 1, scaleY: 1, duration: 0.11, ease: 'power2.in' },
        { scaleX: 1.04, scaleY: 0.9, duration: 0.05 },
        { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' }
      ] }, ok);
    tl.to('#s3fb', { yPercent: 0, duration: 0.42, ease: 'power3.out' }, ok + 0.08);
    tl.fromTo('#s3okb', { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(3)' }, ok + 0.2);

    // headline
    words('#s3head .kick .w', t0 + 0.26);
    words('#s3head h1 .w', t0 + 0.34, { stagger: 0.1, dur: 0.6 });
    words('#s3head .sub .w', t0 + 0.62);
    tl.fromTo('#s3head', { x: -60 }, { x: 0, duration: BAR, ease: 'sine.out' }, t0);
  }

  /* ======================================================================
     S4 · 5.625 — the game systems, four strips on the downbeat.
     ====================================================================== */
  {
    const t0 = T(3);
    const S = ['#st1', '#st2', '#st3', '#st4'];
    // drop in right-to-left, landing around the downbeat
    S.forEach((s, i) => tl.fromTo(s, { y: -1120 }, { y: 0, duration: 0.42, ease: 'power3.out' }, t0 - 0.36 + i * 0.055));
    S.forEach((s, i) => {
      tl.fromTo(s + 'ic', { scale: 0, rotation: -16 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.6)' }, t0 + 0.02 + i * 0.09);
      tl.fromTo(s + ' .num', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.2)' }, t0 + 0.08 + i * 0.09);
      tl.fromTo(s + ' .cap', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 }, t0 + 0.16 + i * 0.09);
    });
    const hearts = counter('#st1n', v => toAr(Math.round(v)));
    const secs = counter('#st2n', v => toAr(Math.round(v)));
    const streak = counter('#st3n', v => toAr(Math.round(v)));
    const gems = counter('#st4n', v => toAr(Math.round(v)));
    tl.to(hearts, { v: 5, duration: 0.45, ease: 'power2.out' }, t0 + 0.08);
    tl.to(secs, { v: 60, duration: 0.7, ease: 'power3.out' }, t0 + 0.17);
    tl.to(streak, { v: 43, duration: 0.8, ease: 'power3.out' }, t0 + 0.26);
    tl.to(gems, { v: 50, duration: 0.8, ease: 'power3.out' }, t0 + 0.35);

    // secondary action: each icon keeps its own little life
    gsap.set('#st1ic svg', { transformOrigin: '50% 60%' });
    [1, 2, 3].forEach(b => tl.fromTo('#st1ic svg', { scale: 1.2 }, { scale: 1, duration: 0.36, ease: 'power3.out' }, t0 + b * B));
    tl.to('#st2hand', { rotation: 720, svgOrigin: '11 11', duration: BAR, ease: 'none' }, t0);
    tl.to('#st2hand2', { rotation: 60, svgOrigin: '11 11', duration: BAR, ease: 'none' }, t0);
    gsap.set('#st3flame', { transformOrigin: '50% 100%' });
    tl.to('#st3flame', { scaleY: 1.1, scaleX: 0.95, duration: B / 2, ease: 'sine.inOut', yoyo: true, repeat: 7 }, t0);
    gsap.set('#st3core', { transformOrigin: '50% 100%' });
    tl.to('#st3core', { scaleY: 0.82, duration: B / 4, ease: 'sine.inOut', yoyo: true, repeat: 15 }, t0);
    tl.fromTo('#st4ic svg', { rotationY: 0 }, { rotationY: 360, duration: 0.6, ease: 'back.out(1.4)' }, t0 + 2 * B);

    // exit: the curtain lifts, right to left, as Qaddour falls through it
    S.forEach((s, i) => tl.to(s, { y: -1150, duration: 0.32, ease: 'power3.in' }, T(4) - 0.62 + i * 0.05));
  }

  /* ======================================================================
     S5 · 7.500 — Qaddour lands, the title pops, he hops on the beat.
     No confetti, no rings, no sprays: the character is the celebration.
     ====================================================================== */
  {
    const t0 = T(4);
    gsap.set('#s5m', { transformOrigin: '50% 92%' });
    gsap.set('#s5msq', { transformOrigin: '50% 92%' });
    gsap.set('#s5title', { xPercent: -50, transformOrigin: '50% 80%', scale: 0 });
    gsap.set('#s5shadow', { transformOrigin: '50% 50%' });

    // fall: gravity in, stretched along the motion
    tl.fromTo('#s5m', { y: -1150 }, { y: 0, duration: 0.34, ease: 'power2.in' }, t0 - 0.34);
    tl.fromTo('#s5msq', { scaleX: 0.9, scaleY: 1.14 }, { scaleX: 0.92, scaleY: 1.1, duration: 0.34, ease: 'none' }, t0 - 0.34);
    tl.fromTo('#s5shadow', { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.34, ease: 'power2.in' }, t0 - 0.34);
    // land hard on the downbeat
    impact('#s5msq', t0, 1.24, 0.78, 0.55);
    tl.to('#s5shadow', { scaleX: 1.2, duration: 0.06 }, t0).to('#s5shadow', { scaleX: 1, duration: 0.4, ease: 'elastic.out(1,0.5)' }, t0 + 0.06);
    tl.to('#s5title', { scale: 1, duration: 0.5, ease: 'back.out(2.6)' }, t0 + 0.01);
    tl.fromTo('#s5title', { rotation: -7 }, { rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, t0 + 0.01);

    // the cards flip in on the "and" of 1 and 2
    [['#wcXP', t0 + B * 0.5, 9], ['#wcACC', t0 + B * 0.85, -9]].forEach(([s, t, r]) => {
      gsap.set(s, { transformOrigin: '50% 100%' });
      tl.fromTo(s, { scale: 0, rotation: r, y: 80 }, { scale: 1, rotation: 0, y: 0, duration: 0.55, ease: 'back.out(2)' }, t);
    });
    const xp = counter('#wcXPn', v => toAr(Math.round(v)));
    const acc = counter('#wcACCn', v => toAr(Math.round(v)) + '٪');
    tl.to(xp, { v: 44, duration: 0.7, ease: 'power3.out' }, t0 + B * 0.55);
    tl.to(acc, { v: 100, duration: 0.7, ease: 'power3.out' }, t0 + B * 0.9);

    // hop: anticipation, stretch, hang, squash, settle — over a live shadow
    function hop(tLand, h, air, lean) {
      const tUp = tLand - air;
      tl.to('#s5msq', { scaleX: 1.1, scaleY: 0.87, duration: 0.1, ease: 'power2.out' }, tUp - 0.1)
        .to('#s5msq', { scaleX: 0.9, scaleY: 1.12, duration: 0.07, ease: 'power2.out' }, tUp)
        .to('#s5msq', { scaleX: 1, scaleY: 1, duration: air * 0.35, ease: 'sine.out' }, tUp + 0.07)
        .to('#s5msq', { scaleX: 0.95, scaleY: 1.06, duration: air * 0.3, ease: 'sine.in' }, tLand - air * 0.3)
        .to('#s5m', { y: -h, rotation: lean, duration: air * 0.5, ease: 'power2.out' }, tUp)
        .to('#s5m', { y: 0, rotation: 0, duration: air * 0.5, ease: 'power2.in' }, tUp + air * 0.5)
        .to('#s5shadow', { scale: 0.55, opacity: 0.5, duration: air * 0.5, ease: 'power2.out' }, tUp)
        .to('#s5shadow', { scale: 1, opacity: 1, duration: air * 0.5, ease: 'power2.in' }, tUp + air * 0.5);
      impact('#s5msq', tLand, 1.16, 0.85, 0.42);
    }
    hop(t0 + 2 * B, 150, 0.32, -5);
    hop(t0 + 3 * B, 95, 0.26, 5);
    tl.to('#s5m', { rotation: -4, duration: 0.14, ease: 'sine.out' }, t0 + 3 * B + 0.1)
      .to('#s5m', { rotation: 3, duration: 0.18, ease: 'sine.inOut' }, t0 + 3 * B + 0.24);
  }

  /* ======================================================================
     S6 · 9.375 — the daily chest: two hops, it opens, fifty gems.
     The hop is the app's own measured choreography (CV_TAP_HOP).
     ====================================================================== */
  {
    const t0 = T(5);
    const art = chestArt();
    $('#s6csq').innerHTML = art.closed + art.open;
    const closed = $('#s6csq .closed'), open = $('#s6csq .open');
    gsap.set(open, { opacity: 0 });
    gsap.set('#s6chest', { transformOrigin: '50% 92%' });
    gsap.set('#s6csq', { transformOrigin: '50% 92%' });
    gsap.set(['#s6title', '#s6cap', '#s6count'], { xPercent: -50 });
    gsap.set(['#s6glow', '#s6rays'], { opacity: 0, scale: 0.3 });
    gsap.set('#s6count', { opacity: 0 });

    // the sheet rises like the app's bottom sheets
    tl.fromTo('#s6sheet', { y: 1300 }, { y: 0, duration: 0.4, ease: 'power3.inOut' }, t0 - 0.36);
    tl.fromTo('#s6title', { scale: 0.6, y: 40 }, { scale: 1, y: 0, duration: 0.5, ease: 'back.out(2.4)' }, t0 - 0.02);

    const HOP = [
      [0.00, 0, 0, 1.00], [0.03, -4, 8, 1.10], [0.05, -8, 12, 1.10], [0.08, -22, 8, 1.06], [0.12, -32, 2, 1.03],
      [0.17, -42, -2, 1.00], [0.22, -47, -4, 1.00], [0.27, -50, -1, 1.00], [0.37, -50, 0, 1.00],
      [0.43, -44, -3, 1.00], [0.48, -34, -6, 1.00], [0.52, -20, -9, 1.00], [0.55, -4, -10, 1.00], [0.58, 3, -3, 0.96],
      [0.62, -4, 3, 1.00], [0.66, -10, 4, 1.00], [0.72, -16, 2, 1.00], [0.80, -18, 0, 1.00], [0.88, -18, 0, 1.00], [0.93, -10, 0, 1.00], [0.98, 0, 0, 1.00]];
    const hopAt = (t, f, ky) => {
      tl.to('#s6chest', { keyframes: HOP.slice(1).map((k, i) => ({
        y: k[1] * ky, rotation: k[2], duration: (k[0] - HOP[i][0]) * f, ease: 'sine.inOut' })) }, t);
      tl.to('#s6csq', { keyframes: HOP.slice(1).map((k, i) => ({
        scaleY: k[3], scaleX: 2 - k[3], duration: (k[0] - HOP[i][0]) * f, ease: 'sine.inOut' })) }, t);
      tl.to('#s6shadow', { keyframes: HOP.slice(1).map((k, i) => ({
        scale: 1 + k[1] * ky / 700, opacity: 1 + k[1] * ky / 400, duration: (k[0] - HOP[i][0]) * f, ease: 'sine.inOut' })) }, t);
    };
    hopAt(t0 - 0.03, 0.5, 3.6);
    tl.fromTo('#s6cap', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' }, t0 - 0.02);
    tl.to('#s6sheet', { borderRadius: 0, duration: 0.2, ease: 'power2.out' }, t0 + 0.04);

    // beat 1: it opens. Lift, burst of light, a white wash, the pile
    const o = t0 + B;
    tl.set(closed, { opacity: 0 }, o).set(open, { opacity: 1 }, o);
    tl.to('#s6chest', { keyframes: [
      { y: -70, duration: 0.12, ease: 'power2.out' },
      { y: 0, duration: 0.14, ease: 'power2.in' }] }, o);
    impact('#s6csq', o + 0.26, 1.12, 0.88, 0.4);
    tl.to('#s6cap', { opacity: 0, scale: 0.6, duration: 0.15 }, o);
    tl.to('#s6glow', { opacity: 1, scale: 1, duration: 0.55, ease: 'expo.out' }, o);
    tl.to('#s6rays', { opacity: 1, scale: 1, duration: 0.7, ease: 'expo.out' }, o);
    tl.fromTo('#s6rays', { rotation: 0 }, { rotation: 30, duration: T(6) - o, ease: 'none' }, o);
    // light pours out, a white wash, and the pile takes the chest's place
    const w = o + 0.26;
    tl.fromTo('#s6wash', { opacity: 0 }, { opacity: 0.95, duration: 0.07, ease: 'power2.in' }, w - 0.07)
      .to('#s6wash', { opacity: 0, duration: 0.4, ease: 'power2.out' }, w);
    tl.set(['#s6chest', '#s6shadow'], { opacity: 0 }, w);

    // the gem pile, top rows first so the front row overlaps them
    const pile = $('#s6pile');
    const rows = [4, 3, 2, 1], dx = 118, dy = 100;
    const gems = [];
    for (let r = rows.length - 1; r >= 0; r--) {
      for (let i = 0; i < rows[r]; i++) {
        const g = document.createElement('div');
        const dark = r > 0;
        g.innerHTML = gemSVG(dark);
        const svg = g.firstElementChild;
        pile.appendChild(svg);
        gems.push({ svg, x: (i - (rows[r] - 1) / 2) * dx, y: -r * dy, r });
      }
    }
    gems.sort((a, b) => a.r - b.r || a.x - b.x);
    gems.forEach((g, k) => {
      // each gem hops out of where the chest stood and lands in its slot
      gsap.set(g.svg, { x: 0, y: -140, scale: 0, transformOrigin: '50% 80%' });
      const t = w + 0.02 + k * 0.03;
      tl.to(g.svg, { x: g.x, duration: 0.34, ease: 'power2.out' }, t);
      tl.to(g.svg, { keyframes: [
        { y: g.y - 110, duration: 0.17, ease: 'power2.out' },
        { y: g.y, duration: 0.17, ease: 'power2.in' }] }, t);
      tl.to(g.svg, { scale: 1, duration: 0.26, ease: 'back.out(2)' }, t);
      tl.to(g.svg, { keyframes: [
        { scaleX: 1.14, scaleY: 0.86, duration: 0.05 },
        { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'elastic.out(1, 0.45)' }] }, t + 0.34);
    });
    tl.fromTo('#s6count', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.6)' }, w + 0.08);
    const gc = counter('#s6n', v => '+' + toAr(Math.round(v)));
    tl.to(gc, { v: 50, duration: 0.6, ease: 'power2.out' }, w + 0.1);
    tl.to('#s6pile', { y: -12, duration: B, ease: 'sine.inOut', yoyo: true, repeat: 1 }, w + 0.62);
    tl.fromTo('#s6glow', { scale: 1 }, { scale: 1.1, duration: B, ease: 'sine.inOut', yoyo: true, repeat: 1, immediateRender: false }, w + 0.5);

    // the white wash carries us into the next shot
    tl.to('#s6wash', { opacity: 1, duration: 0.26, ease: 'power2.in' }, T(6) - 0.26);
  }

  /* ======================================================================
     S7 · 11.250 — rank up. Five tiers roll past, it lands on الأبطال.
     ====================================================================== */
  {
    const t0 = T(6);
    const TIERS = [['bronze', 'المستوى البرونزي'], ['silver', 'المستوى الفضي'], ['gold', 'المستوى الذهبي'],
      ['diamond', 'المستوى الألماسي'], ['champion', 'مستوى الأبطال']];
    const SP = 430;
    const strip = $('#s7strip'), names = $('#s7name');
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:0;right:0;top:0';
    names.appendChild(wrap);
    const badges = TIERS.map(([k, n], i) => {
      const b = document.createElement('div');
      b.className = 'rk';
      b.style.left = (-SP * i) + 'px';
      b.innerHTML = `<img src="assets/ranks/rank-${k}.png" alt="">`;
      strip.appendChild(b);
      const nm = document.createElement('div');
      nm.className = 'nm'; nm.textContent = n; nm.style.top = (i * 300) + 'px';
      wrap.appendChild(nm);
      return b;
    });
    gsap.set('#s7flood', { scale: 0 });
    gsap.set('#s7iris', { scale: 0 });
    gsap.set('#s7kick', { xPercent: -50, opacity: 0, color: '#fff' });
    gsap.set(wrap, { color: '#4B4B4B' });
    // one tween per step owns each badge's opacity; on the landing the others fade right out
    const focus = (k, t, d, ease, last) => badges.forEach((b, i) => {
      const on = i === k;
      tl.to(b, { scale: on ? 1.32 : 0.74, opacity: on ? 1 : last ? 0 : Math.max(0.12, 0.55 - 0.18 * Math.abs(i - k)), duration: d, ease }, t);
    });
    badges.forEach((b, i) => tl.fromTo(b, { y: 120, opacity: 0, scale: 0.4 },
      { y: 0, opacity: i === 0 ? 1 : 0.55 - 0.18 * i, scale: i === 0 ? 1.32 : 0.74, duration: 0.4, ease: 'back.out(2)' }, t0 + 0.02 + i * 0.03));
    tl.fromTo(wrap, { yPercent: 0, opacity: 0 }, { opacity: 1, duration: 0.2 }, t0 + 0.08);

    // the roll: quick, quick, quick, then the landing on beat 2
    const steps = [t0 + 0.3, t0 + 0.5, t0 + 0.7, t0 + 2 * B - 0.05];
    steps.forEach((t, j) => {
      const k = j + 1, last = k === 4;
      tl.to(strip, { x: SP * k, duration: last ? 0.42 : 0.18, ease: last ? 'back.out(1.8)' : 'power3.out' }, t);
      tl.to(wrap, { y: -300 * k, duration: last ? 0.4 : 0.18, ease: last ? 'back.out(1.6)' : 'power3.out' }, t);
      focus(k, t, last ? 0.4 : 0.18, last ? 'back.out(2.4)' : 'power2.out', last);
    });
    const land = steps[3] + 0.05;
    const champ = badges[4];
    tl.to(champ, { keyframes: [
      { scaleX: 1.6, scaleY: 1.18, duration: 0.08, ease: 'power2.out' },
      { scaleX: 1.34, scaleY: 1.34, duration: 0.45, ease: 'elastic.out(1, 0.4)' }] }, land + 0.02);
    tl.to('#s7flood', { scale: 1, duration: 0.6, ease: 'expo.out' }, land);
    tl.to(wrap, { color: '#FFFFFF', duration: 0.12 }, land + 0.04);
    tl.fromTo('#s7kick', { opacity: 0, y: 30, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2.4)' }, land + 0.1);
    tl.to(champ, { y: -16, duration: B, ease: 'sine.inOut', yoyo: true, repeat: 1 }, land + 0.5);

    // exit: the badge shrinks away and green irises open from where it was
    tl.to(champ, { scale: 0, rotation: -20, duration: 0.24, ease: 'back.in(2.2)' }, T(7) - 0.42);
    tl.to(['#s7kick', wrap], { opacity: 0, y: -30, duration: 0.2, ease: 'power2.in' }, T(7) - 0.38);
    tl.to('#s7iris', { scale: 1, duration: 0.3, ease: 'power2.in' }, T(7) - 0.3);
  }

  /* ======================================================================
     S8 · 13.125 — the end card. He jumps in and points; the button presses.
     ====================================================================== */
  {
    const t0 = T(7);
    gsap.set('#s8m', { transformOrigin: '50% 93%' });
    gsap.set('#s8msq', { transformOrigin: '50% 93%' });
    gsap.set(['#s8word', '#s8sub', '#s8pills'], { xPercent: -50 });
    gsap.set('.dia', { rotation: 45 });

    // Qaddour jumps up into frame, hangs, lands
    tl.fromTo('#s8m', { y: 900 }, { keyframes: [
      { y: -70, duration: 0.24, ease: 'power2.out' },
      { y: 0, duration: 0.14, ease: 'power2.in' }] }, t0 - 0.04);
    tl.fromTo('#s8msq', { scaleX: 0.88, scaleY: 1.14 }, { scaleX: 1, scaleY: 1, duration: 0.22, ease: 'sine.out' }, t0 - 0.04);
    impact('#s8msq', t0 + 0.34, 1.12, 0.88, 0.5);
    tl.fromTo('#s8shadow', { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'power2.in' }, t0 + 0.14);
    tl.fromTo('#s8m', { rotation: 6 }, { rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, t0 + 0.34);

    // the wordmark rises out of the page: the mask reveals it, then its lip extrudes
    words('#s8word .w', t0 + 0.12, { dur: 0.6 });
    tl.fromTo('#s8word', { textShadow: '0px 0px 0px #478700', y: 16 },
      { textShadow: '0px 16px 0px #478700', y: 0, duration: 0.3, ease: 'back.out(2)' }, t0 + 0.5);
    words('#s8sub .w', t0 + 0.42, { stagger: 0.045, dur: 0.5 });
    gsap.utils.toArray('#s8pills .pill').forEach((p, i) =>
      tl.fromTo(p, { scale: 0, y: 20 }, { scale: 1, y: 0, duration: 0.42, ease: 'back.out(3)' }, t0 + 0.72 + i * 0.1));

    // the URL is a button, and it gets pressed — the same gesture that opened the film
    tl.fromTo('#s8url', { y: -60, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, t0 + 0.95);
    const press = t0 + 2.5 * B;
    tl.to('#s8face', { y: 12, duration: 0.05, ease: 'power2.in' }, press - 0.05)
      .to('#s8face', { y: 0, duration: 0.3, ease: 'back.out(3)' }, press + 0.08)
      .to('#s8m', { rotation: -3.5, duration: 0.08, ease: 'power2.out' }, press - 0.06)
      .to('#s8m', { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, press + 0.04);

    // idle life to the last frame
    tl.to('#s8msq', { scaleY: 1.015, scaleX: 0.994, duration: B, ease: 'sine.inOut', yoyo: true, repeat: 2 }, t0 + 0.9);
    [['#d1', -14, 8], ['#d2', 12, -10], ['#d3', -10, -6], ['#d4', 16, 12]].forEach(([s, dy, dr]) =>
      tl.fromTo(s, { y: 0, rotation: 45, scale: 0 }, { y: dy, rotation: 45 + dr, scale: 1, duration: BAR, ease: 'sine.out' }, t0));
  }

  /* ---------- art from the app, ported verbatim ---------- */
  function chestArt() {
    const c = { body: '#1E3A8A', bodyDk: '#172C6B', trim: '#FFC800', trimDk: '#E6A800', latch: '#FFF1B8', lidIn: '#2A4AA6', lidInDk: '#1E3A8A', intA: '#B8C2E0', intB: '#EEF1FA' };
    return {
      closed: `<svg class="closed" viewBox="0 0 260 290"><g>
        <rect x="24" y="180" width="41" height="87" rx="10" fill="${c.trimDk}"/><rect x="195" y="180" width="41" height="87" rx="10" fill="${c.trimDk}"/>
        <rect x="65" y="180" width="130" height="87" fill="${c.body}"/><rect x="65" y="245" width="130" height="4" fill="${c.bodyDk}"/></g><g>
        <rect x="24" y="75" width="41" height="112" rx="10" fill="${c.trim}"/><rect x="195" y="75" width="41" height="112" rx="10" fill="${c.trim}"/>
        <rect x="65" y="82" width="130" height="100" fill="${c.body}"/><rect x="65" y="123" width="130" height="4" fill="${c.bodyDk}"/>
        <circle cx="130" cy="192" r="30" fill="${c.trim}"/>
        <rect x="12" y="167" width="236" height="58" rx="8" fill="${c.trim}"/>
        <rect x="12" y="213" width="236" height="12" rx="4" fill="${c.trimDk}"/>
        <circle cx="130" cy="212" r="22" fill="${c.latch}"/></g></svg>`,
      open: `<svg class="open" viewBox="0 0 260 290"><defs>
        <linearGradient id="cvInt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.intA}"/><stop offset="1" stop-color="${c.intB}"/></linearGradient>
        <radialGradient id="cvBleach" cx="130" cy="120" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".55" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
        <rect x="24" y="42" width="41" height="64" rx="10" fill="${c.trim}"/><rect x="195" y="42" width="41" height="64" rx="10" fill="${c.trim}"/>
        <rect x="65" y="48" width="130" height="58" fill="${c.lidIn}"/><rect x="65" y="74" width="130" height="4" fill="${c.lidInDk}"/>
        <rect x="34" y="150" width="192" height="66" fill="url(#cvInt)"/>
        <rect x="24" y="150" width="41" height="117" rx="10" fill="${c.trimDk}"/><rect x="195" y="150" width="41" height="117" rx="10" fill="${c.trimDk}"/>
        <rect x="65" y="227" width="130" height="40" fill="${c.body}"/>
        <rect x="65" y="212" width="130" height="15" fill="${c.trim}"/>
        <rect x="12" y="92" width="236" height="58" rx="8" fill="${c.trim}"/>
        <rect x="12" y="92" width="236" height="10" rx="4" fill="${c.trimDk}"/>
        <circle cx="130" cy="118" r="22" fill="#FFFFFF"/>
        <rect x="0" y="30" width="260" height="200" fill="url(#cvBleach)"/></svg>`
    };
  }
  function gemSVG(dark) {
    return `<svg viewBox="0 0 17 22"><path d="M0 15.41V6.14c0-.71.38-1.36.99-1.72L7.49.6a2 2 0 0 1 2.02 0l6.5 3.82c.61.36.99 1.01.99 1.72v9.27c0 .68-.34 1.31-.91 1.68l-6.5 4.21a2 2 0 0 1-2.17 0L.91 17.09A2 2 0 0 1 0 15.41Z" fill="${dark ? '#1899D6' : '#1CB0F6'}"/><path d="M6.93 2.58 2.15 5.86c-.68.47-.53 1.51.25 1.77l2.17.73c.27.09.57.06.81-.08l2.61-1.49c.31-.18.5-.51.5-.87V3.4c0-.8-.9-1.28-1.56-.82Z" fill="${dark ? '#B6E2F8' : '#DDF4FF'}"/></svg>`;
  }

  /* ---------- driver: the renderer seeks; the preview plays ---------- */
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
  const snd = $('#snd'), btn = $('#play'), scrub = $('#scrub'), clock = $('#clock');
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
