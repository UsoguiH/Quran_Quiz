/* =========================================================================
   أثر — portfolio motion system (GSAP + ScrollTrigger + SplitText)
   Intro = "Archive"-style reveal (first zip), adapted to the أثر brand.
   ========================================================================= */
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
CustomEase.create("hop", "0.9, 0, 0.1, 1");
CustomEase.create("hopA", "0.8, 0, 0.2, 1");
CustomEase.create("expo", "0.16, 1, 0.3, 1");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

const AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabic = (n) => String(n).replace(/\d/g, (d) => AR[+d]);

document.addEventListener("DOMContentLoaded", () => {
  if (reduceMotion) return initReducedMotion();

  initThemeToggle();
  initCursor();
  initPreloader();
  initNav();
  initReveals();
  initImageReveals();
  initParallax();
  initHorizontalWork();
  initStats();
  initMarquees();
  initToTop();
});

/* ---------------- Preloader (Archive reveal) ---------------- */
function initPreloader() {
  document.body.style.overflow = "hidden";

  SplitText.create(".preloader-header h1", { type: "words", wordsClass: "word", mask: "words" });
  const rot = [7.5, -2.5, -10, 12.5, -5, 5];
  gsap.set(".preloader-img", { rotate: (i) => rot[i] });

  const countEl = document.querySelector(".preloader-counter p");
  const counter = { v: 0 };

  const tl = gsap.timeline({
    delay: 0.3,
    onComplete: () => {
      document.body.style.overflow = "";
      ScrollTrigger.refresh();
      playHero();
    },
  });

  tl.to(".preloader-img", {
    scale: 1,
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    duration: 0.9,
    ease: "hopA",
    stagger: 0.14,
  });
  tl.to(".preloader-header h1 .word", { y: "0%", duration: 0.9, ease: "hop" }, "0.4");
  tl.to(
    ".preloader-counter p",
    {
      y: "0%",
      duration: 0.9,
      ease: "hop",
      onStart: () => {
        gsap.to(counter, {
          v: 100,
          duration: 1.4,
          ease: "power2.inOut",
          onUpdate: () => (countEl.textContent = toArabic(String(Math.round(counter.v)).padStart(3, "0"))),
        });
      },
    },
    "<"
  );
  tl.to(".preloader-counter p", { y: "-110%", duration: 0.6, ease: "hop" }, 2.5);
  tl.to(".preloader-header h1 .word", { y: "-110%", duration: 0.6, ease: "hop" }, 2.5);
  tl.to(
    ".preloader-images .preloader-img",
    {
      scale: 0,
      clipPath: "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)",
      duration: 0.8,
      ease: "hop",
      stagger: -0.06,
    },
    2.6
  );
  tl.to(
    ".preloader",
    { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", duration: 0.9, ease: "hop" },
    3.3
  );
  tl.set(".preloader", { display: "none" });
}

/* ---------------- Hero reveal ---------------- */
function playHero() {
  const tl = gsap.timeline();
  tl.to(".hero-title .line", { y: "0%", duration: 1.1, ease: "hop" });
  tl.from(".hero-bg", { clipPath: "inset(0 0 100% 0)", duration: 1.2, ease: "expo" }, "<");
  tl.to(".hero-eyebrow, .hero-scroll", { opacity: 1, duration: 0.8, stagger: 0.1 }, "-=0.7");
  const lede = SplitText.create(".hero-lede", { type: "lines", linesClass: "line", mask: "lines" });
  gsap.set(".hero-lede", { opacity: 1 });
  tl.from(lede.lines, { yPercent: 110, duration: 0.9, stagger: 0.12, ease: "hop" }, "-=0.5");

  // slow hero background parallax
  gsap.to(".hero-bg img", {
    yPercent: 12,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
}

/* ---------------- Scroll reveals ---------------- */
function initReveals() {
  gsap.utils.toArray('[data-reveal="fade"]').forEach((el) => {
    gsap.fromTo(el, { opacity: 0, y: 44 }, {
      opacity: 1, y: 0, duration: 1, ease: "expo",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  gsap.utils.toArray('[data-reveal="words"]').forEach((el) => {
    const s = SplitText.create(el, { type: "words", wordsClass: "word", mask: "words" });
    gsap.set(el, { opacity: 1 });
    gsap.from(s.words, {
      yPercent: 110, duration: 1, stagger: 0.08, ease: "hop",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  gsap.utils.toArray('[data-reveal="lines"]').forEach((el) => {
    const s = SplitText.create(el, { type: "lines", linesClass: "line", mask: "lines" });
    gsap.set(el, { opacity: 1 });
    gsap.from(s.lines, {
      yPercent: 110, duration: 0.9, stagger: 0.1, ease: "hop",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });
}

/* ---------------- Clip-path image reveals ---------------- */
function initImageReveals() {
  gsap.utils.toArray("[data-img-reveal]").forEach((el) => {
    gsap.fromTo(el, { clipPath: "inset(100% 0 0 0)" }, {
      clipPath: "inset(0% 0 0 0)", duration: 1.3, ease: "expo",
      scrollTrigger: { trigger: el, start: "top 82%" },
    });
  });
}

/* ---------------- Parallax ---------------- */
function initParallax() {
  gsap.utils.toArray("[data-parallax]").forEach((img) => {
    gsap.fromTo(img, { yPercent: -16 }, {
      yPercent: 8, ease: "none",
      scrollTrigger: { trigger: img.closest("figure") || img, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}

/* ---------------- Pinned horizontal work gallery ---------------- */
function initHorizontalWork() {
  const track = document.getElementById("work-track");
  const section = document.querySelector(".work");
  if (!track || !section) return;
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);

  gsap.to(track, {
    x: () => -dist(),
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => "+=" + dist(),
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
}

/* ---------------- Stats count-up ---------------- */
function initStats() {
  gsap.utils.toArray(".stat-num").forEach((el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || "";
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: () => gsap.to(obj, {
        v: target, duration: 1.8, ease: "power2.out",
        onUpdate: () => (el.textContent = toArabic(Math.round(obj.v)) + suffix),
      }),
    });
  });
}

/* ---------------- Marquees (velocity-reactive) ---------------- */
function initMarquees() {
  let velocity = 0;
  ScrollTrigger.create({ onUpdate: (self) => (velocity = self.getVelocity()) });

  const build = (track, dir, speed) => {
    if (!track) return;
    track.innerHTML += track.innerHTML;
    let x = 0;
    let half = track.scrollWidth / 2;
    window.addEventListener("resize", () => (half = track.scrollWidth / 2));
    gsap.ticker.add(() => {
      const boost = Math.min(Math.abs(velocity) / 350, 8);
      x += dir * (speed + boost);
      if (half) {
        if (x <= -half) x += half;
        if (x >= 0) x -= half;
      }
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  };
  build(document.getElementById("hero-marquee"), -1, 0.5);
  build(document.querySelector("#clients-marquee .marquee-track"), -1, 0.9);
}

/* ---------------- Cursor ---------------- */
function initCursor() {
  const cursor = document.getElementById("cursor");
  if (!cursor || isTouch) return;
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.25, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.25, ease: "power3" });
  window.addEventListener("mousemove", (e) => {
    gsap.to(cursor, { opacity: 1, duration: 0.3 });
    xTo(e.clientX);
    yTo(e.clientY);
  });
  document.querySelectorAll("[data-hover], a, button").forEach((el) => {
    el.addEventListener("mouseenter", () => gsap.to(cursor, { scale: 2.8, duration: 0.3, ease: "hop" }));
    el.addEventListener("mouseleave", () => gsap.to(cursor, { scale: 1, duration: 0.3, ease: "hop" }));
  });
}

/* ---------------- Nav hide/show ---------------- */
function initNav() {
  const nav = document.getElementById("nav");
  let hidden = false;
  ScrollTrigger.create({
    start: "top top",
    onUpdate: (self) => {
      const y = self.scroll();
      if (self.direction === 1 && y > 200 && !hidden) {
        hidden = true;
        gsap.to(nav, { yPercent: -130, duration: 0.5, ease: "hop" });
      } else if (self.direction === -1 && hidden) {
        hidden = false;
        gsap.to(nav, { yPercent: 0, duration: 0.5, ease: "hop" });
      }
    },
  });
}

/* ---------------- Theme toggle (default dark) ---------------- */
function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const root = document.documentElement;
  let light = false;
  btn.addEventListener("click", () => {
    light = !light;
    root.setAttribute("data-theme", light ? "light" : "dark");
    ScrollTrigger.refresh();
  });
}

/* ---------------- To top ---------------- */
function initToTop() {
  const btn = document.getElementById("to-top");
  if (btn) btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ---------------- Reduced motion ---------------- */
function initReducedMotion() {
  const pre = document.getElementById("preloader");
  if (pre) pre.style.display = "none";
  gsap.set(".hero-title .line", { y: "0%" });
  gsap.set("[data-reveal], .hero-eyebrow, .hero-lede, .hero-scroll", { opacity: 1, y: 0 });
  gsap.set("[data-img-reveal]", { clipPath: "inset(0 0 0 0)" });
  document.querySelectorAll(".stat-num").forEach((el) => {
    el.textContent = toArabic(el.dataset.count) + (el.dataset.suffix || "");
  });
  initThemeToggle();
  initToTop();
}
