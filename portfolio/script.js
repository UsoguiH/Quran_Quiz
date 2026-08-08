/* =========================================================================
   أثر — portfolio interactions (GSAP + ScrollTrigger + SplitText)
   ========================================================================= */
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
CustomEase.create("hop", "0.16, 1, 0.3, 1");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Western -> Arabic-Indic digits
const AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabic = (n) => String(n).replace(/\d/g, (d) => AR[+d]);

document.addEventListener("DOMContentLoaded", () => {
  if (reduceMotion) {
    initReducedMotion();
    return;
  }

  initPreloader();
  initNav();
  initCursor();
  initReveals();
  initParallax();
  initStats();
  initWorkPreview();
  initMarquees();
  initThemeToggle();
  initToTop();
});

/* ----------------------------------------------------------------------- */
/* Preloader                                                                */
/* ----------------------------------------------------------------------- */
function initPreloader() {
  document.body.style.overflow = "hidden";

  const countEl = document.getElementById("count");
  const counter = { v: 0 };
  const tl = gsap.timeline({
    onComplete: () => {
      document.body.style.overflow = "";
      ScrollTrigger.refresh();
      playHero();
    },
  });

  tl.to(".preloader-mark h1", { y: "0%", duration: 1, ease: "hop", delay: 0.2 });
  tl.to(".preloader-tag", { opacity: 1, duration: 0.6 }, "<0.2");
  tl.to(
    counter,
    {
      v: 100,
      duration: 1.8,
      ease: "power2.inOut",
      onUpdate: () => {
        countEl.textContent = toArabic(String(Math.round(counter.v)).padStart(3, "0"));
      },
    },
    "<"
  );
  tl.to(".preloader-inner, .preloader-tag", {
    y: -30,
    opacity: 0,
    duration: 0.6,
    ease: "hop",
  });
  tl.to(
    ".preloader",
    {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      duration: 1,
      ease: "hop",
    },
    "-=0.2"
  );
  tl.set(".preloader", { display: "none" });
}

/* ----------------------------------------------------------------------- */
/* Hero reveal (after preloader)                                            */
/* ----------------------------------------------------------------------- */
function playHero() {
  const tl = gsap.timeline();
  tl.to(".hero-title .line", { y: "0%", duration: 1.1, ease: "hop" });
  tl.to(".hero-eyebrow", { opacity: 1, duration: 0.8 }, "-=0.7");
  const lede = splitLines(".hero-lede");
  tl.from(
    lede.lines,
    { yPercent: 110, duration: 0.9, stagger: 0.12, ease: "hop" },
    "-=0.5"
  );
  gsap.to(".hero-lede", { opacity: 1, duration: 0.01 }, "<");
}

/* ----------------------------------------------------------------------- */
/* Scroll reveals                                                           */
/* ----------------------------------------------------------------------- */
function splitLines(sel) {
  return SplitText.create(sel, { type: "lines", linesClass: "line", mask: "lines" });
}

function initReveals() {
  // fade + rise
  gsap.utils.toArray('[data-reveal="fade"]').forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "hop",
        scrollTrigger: { trigger: el, start: "top 88%" },
      }
    );
  });

  // word-by-word headings
  gsap.utils.toArray('[data-reveal="words"]').forEach((el) => {
    const split = SplitText.create(el, {
      type: "words",
      wordsClass: "word",
      mask: "words",
    });
    gsap.set(el, { opacity: 1 });
    gsap.from(split.words, {
      yPercent: 110,
      duration: 1,
      stagger: 0.08,
      ease: "hop",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  // line-by-line paragraphs
  gsap.utils.toArray('[data-reveal="lines"]').forEach((el) => {
    if (el.classList.contains("hero-lede")) return; // handled in hero
    const split = SplitText.create(el, {
      type: "lines",
      linesClass: "line",
      mask: "lines",
    });
    gsap.set(el, { opacity: 1 });
    gsap.from(split.lines, {
      yPercent: 110,
      duration: 0.9,
      stagger: 0.1,
      ease: "hop",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });
}

/* ----------------------------------------------------------------------- */
/* Parallax images                                                          */
/* ----------------------------------------------------------------------- */
function initParallax() {
  gsap.utils.toArray("[data-parallax]").forEach((img) => {
    gsap.fromTo(
      img,
      { yPercent: -18 },
      {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: img.closest("figure") || img,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  });
}

/* ----------------------------------------------------------------------- */
/* Stats count-up                                                           */
/* ----------------------------------------------------------------------- */
function initStats() {
  gsap.utils.toArray(".stat-num").forEach((el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || "";
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          v: target,
          duration: 1.8,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = toArabic(Math.round(obj.v)) + suffix;
          },
        });
      },
    });
  });
}

/* ----------------------------------------------------------------------- */
/* Work list -> cursor-following image preview                              */
/* ----------------------------------------------------------------------- */
function initWorkPreview() {
  const preview = document.getElementById("work-preview");
  if (!preview || window.matchMedia("(hover: none)").matches) return;
  const img = preview.querySelector("img");
  const items = gsap.utils.toArray(".work-item");

  const xTo = gsap.quickTo(preview, "x", { duration: 0.5, ease: "power3" });
  const yTo = gsap.quickTo(preview, "y", { duration: 0.5, ease: "power3" });

  window.addEventListener("mousemove", (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });

  items.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      img.src = item.dataset.img;
      gsap.to(preview, { opacity: 1, scale: 1, duration: 0.5, ease: "hop" });
    });
    item.addEventListener("mouseleave", () => {
      gsap.to(preview, { opacity: 0, scale: 0.9, duration: 0.4, ease: "hop" });
    });
  });
}

/* ----------------------------------------------------------------------- */
/* Custom cursor                                                            */
/* ----------------------------------------------------------------------- */
function initCursor() {
  const cursor = document.getElementById("cursor");
  if (!cursor || window.matchMedia("(hover: none)").matches) return;

  const xTo = gsap.quickTo(cursor, "x", { duration: 0.25, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.25, ease: "power3" });

  window.addEventListener("mousemove", (e) => {
    gsap.to(cursor, { opacity: 1, duration: 0.3 });
    xTo(e.clientX);
    yTo(e.clientY);
  });

  document.querySelectorAll("[data-hover], a, button").forEach((el) => {
    el.addEventListener("mouseenter", () =>
      gsap.to(cursor, { scale: 2.6, duration: 0.3, ease: "hop" })
    );
    el.addEventListener("mouseleave", () =>
      gsap.to(cursor, { scale: 1, duration: 0.3, ease: "hop" })
    );
  });
}

/* ----------------------------------------------------------------------- */
/* Marquees (velocity-reactive)                                             */
/* ----------------------------------------------------------------------- */
function initMarquees() {
  let velocity = 0;
  ScrollTrigger.create({
    onUpdate: (self) => {
      velocity = self.getVelocity();
    },
  });

  const build = (track, dir, speed) => {
    if (!track) return;
    track.innerHTML += track.innerHTML; // seamless duplicate
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
  build(document.getElementById("clients-marquee").querySelector(".marquee-track"), -1, 0.9);
}

/* ----------------------------------------------------------------------- */
/* Nav: hide on scroll down, show on scroll up                             */
/* ----------------------------------------------------------------------- */
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

/* ----------------------------------------------------------------------- */
/* Theme toggle                                                             */
/* ----------------------------------------------------------------------- */
function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let dark = prefersDark;
  const apply = () => {
    root.setAttribute("data-theme", dark ? "dark" : "light");
    const dot = btn.querySelector(".theme-dot");
    dot.style.boxShadow = dark ? "none" : "inset -4px -4px 0 0 var(--paper)";
  };
  apply();
  btn.addEventListener("click", () => {
    dark = !dark;
    apply();
  });
}

/* ----------------------------------------------------------------------- */
/* To top                                                                   */
/* ----------------------------------------------------------------------- */
function initToTop() {
  const btn = document.getElementById("to-top");
  if (!btn) return;
  btn.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );
}

/* ----------------------------------------------------------------------- */
/* Reduced motion fallback                                                  */
/* ----------------------------------------------------------------------- */
function initReducedMotion() {
  const pre = document.getElementById("preloader");
  if (pre) pre.style.display = "none";
  gsap.set(".hero-title .line, .preloader-mark h1", { y: "0%" });
  gsap.set("[data-reveal]", { opacity: 1, y: 0 });
  gsap.set(".hero-eyebrow, .hero-lede", { opacity: 1 });
  document.querySelectorAll(".stat-num").forEach((el) => {
    el.textContent = toArabic(el.dataset.count) + (el.dataset.suffix || "");
  });
  initThemeToggle();
  initToTop();
}
