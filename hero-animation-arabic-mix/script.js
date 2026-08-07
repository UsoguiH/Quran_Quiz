// ============================================================================
// ONE integrated timeline (Arabic, RTL): the "Nova Vice" intro and the
// "Archive / الأرشيف" reveal are woven into a single, overlapping GSAP timeline
// -- the shuffling 3x3 grid collapses to one photo and flows straight into the
// archive wipe, so the whole thing plays in ~6s instead of two back-to-back
// animations. Aref Ruqaa calligraphic display throughout.
// ============================================================================

gsap.registerPlugin(CustomEase, SplitText);
CustomEase.create("hop", "0.9, 0, 0.1, 1");
CustomEase.create("hopA", "0.8, 0, 0.2, 1");

const splitText = (selector, type, className, mask = true) =>
  SplitText.create(selector, {
    type,
    [`${type}Class`]: className,
    ...(mask && { mask: type }),
  });

document.addEventListener("DOMContentLoaded", () => {
  const projectsContainer = document.querySelector(".projects");
  const locationsContainer = document.querySelector(".locations");
  const gridImages = gsap.utils.toArray(".img");
  const heroImage = document.querySelector(".img.hero-img");
  const images = gridImages.filter((img) => img !== heroImage);

  const allImageSources = Array.from(
    { length: 35 },
    (_, i) => `./public/nova/img${i + 1}.jpeg`
  );
  const getRandomImageSet = () =>
    [...allImageSources].sort(() => 0.5 - Math.random()).slice(0, 9);

  // Archive text splits (words, masked) -> start hidden below their masks.
  splitText(".preloader-header h1", "words", "word");
  splitText("nav a", "words", "word");
  splitText(".header h1", "words", "word");
  splitText(".hero-footer p", "words", "word");

  const preloaderImgInitRotations = [7.5, -2.5, -10, 12.5, -5, 5];
  gsap.set(".preloader-img", { rotate: (i) => preloaderImgInitRotations[i] });

  function initializeDynamicContent() {
    projectsData.forEach((project) => {
      const projectItem = document.createElement("div");
      projectItem.className = "project-item";
      const projectName = document.createElement("p");
      projectName.textContent = project.name;
      const directorName = document.createElement("p");
      directorName.textContent = project.director;
      projectItem.appendChild(projectName);
      projectItem.appendChild(directorName);
      projectsContainer.appendChild(projectItem);
    });
    projectsData.forEach((project) => {
      const locationItem = document.createElement("div");
      locationItem.className = "location-item";
      const locationName = document.createElement("p");
      locationName.textContent = project.location;
      locationItem.appendChild(locationName);
      locationsContainer.appendChild(locationItem);
    });
  }

  initializeDynamicContent();

  // ---------------------------------------------------------------------------
  // ONE master timeline
  // ---------------------------------------------------------------------------
  const tl = gsap.timeline({ delay: 0.3 });
  tl.timeScale(1.1); // overall snappiness

  // --- Nova logo gradient fill (both lines, overlapping) ---
  tl.to(".logo-line-1", { backgroundPosition: "0% 0%", color: "#fff", duration: 0.5, ease: "none" }, 0);
  tl.to(".logo-line-2", { backgroundPosition: "0% 0%", color: "#fff", duration: 0.5, ease: "none" }, 0.35);

  // --- Project / director / location lists: quick in, brighten, out ---
  tl.to([".projects-header", ".project-item"], { opacity: 1, duration: 0.12, stagger: 0.03 }, 0.2);
  tl.to([".locations-header", ".location-item"], { opacity: 1, duration: 0.12, stagger: 0.03 }, 0.2);
  tl.to(".project-item", { color: "#fff", duration: 0.12, stagger: 0.03 }, 0.7);
  tl.to(".location-item", { color: "#fff", duration: 0.12, stagger: 0.03 }, 0.7);
  tl.to([".projects-header", ".project-item"], { opacity: 0, duration: 0.12, stagger: 0.03 }, 1.2);
  tl.to([".locations-header", ".location-item"], { opacity: 0, duration: 0.12, stagger: 0.03 }, 1.2);

  // --- 3x3 grid reveals ---
  tl.to(".img", {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    duration: 0.55,
    stagger: 0.04,
    ease: "hop",
  }, 0.55);

  // --- Fast image shuffle, driven by the timeline itself ---
  const shuffle = { p: 0 };
  let lastStep = -1;
  tl.to(shuffle, {
    p: 1,
    duration: 1.25,
    ease: "none",
    onUpdate: () => {
      const steps = 12;
      const step = Math.floor(shuffle.p * steps);
      if (step !== lastStep) {
        lastStep = step;
        const set = getRandomImageSet();
        gridImages.forEach((img, idx) => {
          img.querySelector("img").src = set[idx];
        });
      }
    },
    onComplete: () => {
      heroImage.querySelector("img").src = "./public/nova/img5.jpeg";
    },
  }, 1.05);

  // --- Overlay dissolves, revealing the grid on the light ground ---
  tl.to(".overlay", { opacity: 0, duration: 0.45 }, 1.6);

  // --- Collapse everything except the hero -> ONE photo remaining ---
  tl.to(images, {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
    duration: 0.55,
    stagger: 0.04,
    ease: "hop",
  }, 2.45);

  // --- Emphasize the single remaining photo ---
  tl.to(".hero-img", { scale: 1.4, duration: 0.5, ease: "hop" }, 2.95);

  // ===== HANDOFF: the archive dark panel wipes in over the photo =====
  tl.to(".preloader", {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    duration: 0.6,
    ease: "hop",
    onComplete: () => gsap.set(".image-grid", { autoAlpha: 0 }),
  }, 3.25);

  // --- Archive image fan-out ---
  tl.to(".preloader-img", {
    scale: 1,
    clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    duration: 0.6,
    ease: "hopA",
    stagger: 0.12,
  }, 3.75);

  // --- أرشيف title in ---
  tl.to(".preloader-header h1 .word", {
    y: "0%",
    duration: 0.55,
    ease: "hop",
    stagger: { each: 0.08, from: "random" },
  }, 3.95);

  // --- counter in + 000 -> 100 count ---
  tl.to(".preloader-counter p", {
    y: "0%",
    duration: 0.55,
    ease: "hop",
    onStart: () => {
      const counterEl = document.querySelector(".preloader-counter p");
      const counter = { value: 0 };
      gsap.to(counter, {
        value: 100,
        duration: 1.0,
        ease: "power2.inOut",
        onUpdate: () => {
          counterEl.textContent = String(Math.round(counter.value)).padStart(3, "0");
        },
      });
    },
  }, 3.95);

  // --- counter + title out ---
  tl.to(".preloader-counter p", { y: "-100%", duration: 0.45, ease: "hop" }, 5.15);
  tl.to(".preloader-header h1 .word", {
    y: "-100%",
    duration: 0.45,
    ease: "hop",
    stagger: { each: 0.08, from: "random" },
  }, 5.15);

  // --- archive images collapse ---
  tl.to(".preloader-images .preloader-img", {
    scale: 0,
    clipPath: "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)",
    duration: 0.55,
    ease: "hop",
    stagger: -0.05,
  }, 5.35);

  // --- preloader wipes out, revealing the final hero ---
  tl.to(".preloader", {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
    duration: 0.6,
    ease: "hop",
  }, 5.8);

  // --- final hero title / nav / footer rise in ---
  tl.to(".header h1 .word", {
    y: "0%",
    duration: 0.6,
    ease: "hopA",
    stagger: { each: 0.05, from: "random" },
  }, 6.05);
  tl.to("nav a .word", { y: "0%", duration: 0.6, ease: "hopA", stagger: 0.05 }, 6.2);
  tl.to(".hero-footer p .word", { y: "0%", duration: 0.6, ease: "hopA", stagger: 0.05 }, 6.2);
});
