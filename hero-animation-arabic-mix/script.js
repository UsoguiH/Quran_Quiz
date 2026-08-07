// ============================================================================
// MIXED reveal: the "Nova Vice" intro (dark overlay + shuffling 3x3 grid) runs
// first; when the grid collapses down to ONE remaining photo, it hands off into
// the "Archive / الأرشيف" reveal (image fan-out, title, 000->100 counter,
// clip-path wipe -> final hero). Both in Arabic (RTL) with Aref Ruqaa.
// ============================================================================

gsap.registerPlugin(CustomEase, SplitText);
CustomEase.create("hop", "0.9, 0, 0.1, 1"); // Nova ease + Archive "hop2"
CustomEase.create("hopA", "0.8, 0, 0.2, 1"); // Archive original "hop"

const splitText = (selector, type, className, mask = true) =>
  SplitText.create(selector, {
    type,
    [`${type}Class`]: className,
    ...(mask && { mask: type }),
  });

document.addEventListener("DOMContentLoaded", () => {
  // ---- Nova elements ----
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

  // ---- Archive text splits (words, masked) ----
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

  function startImageRotation() {
    const totalCycles = 20;
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const randomImages = getRandomImageSet();
      gsap.to(
        {},
        {
          duration: 0,
          delay: cycle * 0.15,
          onComplete: () => {
            gridImages.forEach((img, index) => {
              const imgElement = img.querySelector("img");
              if (cycle === totalCycles - 1 && img === heroImage) {
                imgElement.src = "./public/nova/img5.jpeg";
                gsap.set(".hero-img img", { scale: 2 });
              } else {
                imgElement.src = randomImages[index];
              }
            });
          },
        }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // PHASE A — Nova Vice intro
  // ---------------------------------------------------------------------------
  function playNovaIntro() {
    const overlayTimeline = gsap.timeline();
    const imagesTimeline = gsap.timeline();

    overlayTimeline.to(".logo-line-1", {
      backgroundPosition: "0% 0%",
      color: "#fff",
      duration: 1,
      ease: "none",
      delay: 0.5,
      onComplete: () => {
        gsap.to(".logo-line-2", {
          backgroundPosition: "0% 0%",
          color: "#fff",
          duration: 1,
          ease: "none",
        });
      },
    });

    overlayTimeline.to([".projects-header", ".project-item"], {
      opacity: 1,
      duration: 0.15,
      stagger: 0.075,
      delay: 1,
    });
    overlayTimeline.to(
      [".locations-header", ".location-item"],
      { opacity: 1, duration: 0.15, stagger: 0.075 },
      "<"
    );
    overlayTimeline.to(".project-item", {
      color: "#fff",
      duration: 0.15,
      stagger: 0.075,
    });
    overlayTimeline.to(
      ".location-item",
      { color: "#fff", duration: 0.15, stagger: 0.075 },
      "<"
    );
    overlayTimeline.to([".projects-header", ".project-item"], {
      opacity: 0,
      duration: 0.15,
      stagger: 0.075,
    });
    overlayTimeline.to(
      [".locations-header", ".location-item"],
      { opacity: 0, duration: 0.15, stagger: 0.075 },
      "<"
    );
    overlayTimeline.to(".overlay", { opacity: 0, duration: 0.5, delay: 1.5 });

    // Reveal the 3x3 grid, then shuffle through the image set.
    imagesTimeline.to(".img", {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      duration: 1,
      delay: 2.5,
      stagger: 0.05,
      ease: "hop",
      onStart: () => {
        setTimeout(startImageRotation, 1000);
      },
    });

    // Collapse everything except the hero image -> ONE photo remaining,
    // then hand off to the Archive reveal.
    imagesTimeline.to(images, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      duration: 1,
      delay: 2.5,
      stagger: 0.05,
      ease: "hop",
      onComplete: startArchiveHandoff,
    });
  }

  // ---------------------------------------------------------------------------
  // HANDOFF + PHASE B — Archive reveal
  // ---------------------------------------------------------------------------
  function startArchiveHandoff() {
    const t = gsap.timeline({ delay: 0.35 });

    // Emphasize the single remaining photo (reset its inner zoom to full).
    t.to(".hero-img", { scale: 1.4, duration: 0.9, ease: "hop" });
    t.to(".hero-img img", { scale: 1, duration: 0.9, ease: "hop" }, "<");

    // Dark Archive preloader wipes in from the bottom, over the photo.
    t.to(
      ".preloader",
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 1,
        ease: "hop",
        onComplete: () => gsap.set(".image-grid", { autoAlpha: 0 }),
      },
      "-=0.2"
    );

    t.add(buildArchiveTimeline(), ">-0.1");
  }

  function buildArchiveTimeline() {
    const tl = gsap.timeline();

    tl.to(".preloader-img", {
      scale: 1,
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      duration: 1,
      ease: "hopA",
      stagger: 0.2,
    });

    tl.to(
      ".preloader-header h1 .word",
      {
        y: "0%",
        duration: 1,
        ease: "hop",
        stagger: { each: 0.125, from: "random" },
      },
      "0.35"
    );

    tl.to(
      ".preloader-counter p",
      {
        y: "0%",
        duration: 1,
        ease: "hop",
        onStart: () => {
          const counterEl = document.querySelector(".preloader-counter p");
          const counter = { value: 0 };
          gsap.to(counter, {
            value: 100,
            duration: 2,
            delay: 0.5,
            ease: "power2.inOut",
            onUpdate: () => {
              counterEl.textContent = String(
                Math.round(counter.value)
              ).padStart(3, "0");
            },
          });
        },
      },
      "<"
    );

    tl.to(
      ".preloader-counter p",
      { y: "-100%", duration: 0.75, ease: "hop" },
      3.25
    );
    tl.to(
      ".preloader-header h1 .word",
      {
        y: "-100%",
        duration: 0.75,
        ease: "hop",
        stagger: { each: 0.125, from: "random" },
      },
      3.25
    );

    tl.to(
      ".preloader-images .preloader-img",
      {
        scale: 0,
        clipPath: "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)",
        duration: 1,
        ease: "hop",
        stagger: -0.075,
      },
      3.5
    );

    tl.to(
      ".preloader",
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
        duration: 1,
        ease: "hop",
      },
      4.35
    );

    tl.to(
      ".header h1 .word",
      {
        y: "0%",
        duration: 1,
        ease: "hopA",
        stagger: { each: 0.075, from: "random" },
      },
      4.65
    );

    tl.to(
      "nav a .word",
      { y: "0%", duration: 1, ease: "hopA", stagger: 0.075 },
      4.75
    );

    tl.to(
      ".hero-footer p .word",
      { y: "0%", duration: 1, ease: "hopA", stagger: 0.075 },
      4.75
    );

    return tl;
  }

  // ---- boot ----
  initializeDynamicContent();
  playNovaIntro();
});
