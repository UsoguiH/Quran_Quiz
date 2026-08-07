// Same reveal animation as the original "Archive" hero, translated to Arabic.
//
// Key adaptation: Arabic is a connected (cursive) script, so splitting words
// into individual characters — as the original English version does — would
// break the letter joins and render the calligraphy incorrectly. We therefore
// split the titles by WORDS with masked reveals, which preserves the beautiful
// Arabic letterforms while keeping the exact same timeline, staggers, easings,
// counter and clip-path wipe.

gsap.registerPlugin(CustomEase, SplitText);
CustomEase.create("hop", "0.8, 0, 0.2, 1");
CustomEase.create("hop2", "0.9, 0, 0.1, 1");

const splitText = (selector, type, className, mask = true) => {
  return SplitText.create(selector, {
    type: type,
    [`${type}Class`]: className,
    ...(mask && { mask: type }),
  });
};

// Split by words (not chars) so Arabic ligatures stay intact.
const preloaderHeaderSplit = splitText(".preloader-header h1", "words", "word");
const navSplit = splitText("nav a", "words", "word");
const headerSplit = splitText(".header h1", "words", "word");
const footerSplit = splitText(".hero-footer p", "words", "word");

const preloaderImgInitRotations = [7.5, -2.5, -10, 12.5, -5, 5];
gsap.set(".preloader-img", {
  rotate: (i) => preloaderImgInitRotations[i],
});

const tl = gsap.timeline({ delay: 0.5 });

tl.to(".preloader-img", {
  scale: 1,
  clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
  duration: 1,
  ease: "hop",
  stagger: 0.2,
});

tl.to(
  ".preloader-header h1 .word",
  {
    y: "0%",
    duration: 1,
    ease: "hop2",
    stagger: { each: 0.125, from: "random" },
  },
  "0.35",
);

tl.to(
  ".preloader-counter p",
  {
    y: "0%",
    duration: 1,
    ease: "hop2",
    onStart: () => {
      const counterEl = document.querySelector(".preloader-counter p");
      const counter = { value: 0 };

      gsap.to(counter, {
        value: 100,
        duration: 2,
        delay: 0.5,
        ease: "power2.inOut",
        onUpdate: () => {
          // Western digits, padded to 3 (matches the original 000 -> 100).
          counterEl.textContent = String(Math.round(counter.value)).padStart(
            3,
            "0",
          );
        },
      });
    },
  },
  "<",
);

tl.to(
  ".preloader-counter p",
  {
    y: "-100%",
    duration: 0.75,
    ease: "hop2",
  },
  3.25,
);

tl.to(
  ".preloader-header h1 .word",
  {
    y: "-100%",
    duration: 0.75,
    ease: "hop2",
    stagger: { each: 0.125, from: "random" },
  },
  3.25,
);

tl.to(
  ".preloader-images .preloader-img",
  {
    scale: 0,
    clipPath: "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)",
    duration: 1,
    ease: "hop2",
    stagger: -0.075,
  },
  3.5,
);

tl.to(
  ".preloader",
  {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
    duration: 1,
    ease: "hop2",
  },
  4.35,
);

tl.to(
  ".header h1 .word",
  {
    y: "0%",
    duration: 1,
    ease: "hop",
    stagger: { each: 0.075, from: "random" },
  },
  4.65,
);

tl.to(
  "nav a .word",
  {
    y: "0%",
    duration: 1,
    ease: "hop",
    stagger: 0.075,
  },
  4.75,
);

tl.to(
  ".hero-footer p .word",
  {
    y: "0%",
    duration: 1,
    ease: "hop",
    stagger: 0.075,
  },
  4.75,
);
