# أثر — Creative Studio Portfolio

A complete, single-page Arabic (RTL) creative-studio portfolio built around the
**Aref Ruqaa** calligraphic identity, with a full GSAP motion system. Mock
content throughout.

## Sections
Preloader → Hero → Manifesto → Selected Work (index) → Feature (parallax) →
Services → Studio + Stats → Clients marquee → Contact → Footer.

## GSAP motion
- **Preloader** — `٠٠٠ → ١٠٠` count-up (Arabic-Indic digits), mask reveal, clip-path wipe.
- **Hero** — masked title + line-split lede reveal after the preloader.
- **Scroll reveals** (ScrollTrigger + SplitText) — headings rise word-by-word,
  paragraphs line-by-line, blocks fade-up.
- **Parallax** — scrubbed feature image.
- **Stats** — count-up when scrolled into view.
- **Marquees** — continuous, and speed reacts to scroll velocity.
- **Work index** — a project image follows the cursor on hover (desktop).
- **Custom cursor**, **nav hide/show on scroll**, and a **light/dark theme toggle**.
- Full `prefers-reduced-motion` fallback.

## Type & color
- **Aref Ruqaa** (display, calligraphy), **Reem Kufi** (labels/eyebrows),
  **Tajawal** (body) — all self-hosted.
- Warm bone/ink palette with an oxblood accent; complete light **and** dark token sets.

## Running it
Everything (GSAP + plugins, fonts, imagery) is self-hosted under `vendor/` and
`public/`, so it runs offline with no build step:

```bash
cd portfolio
python3 -m http.server 8080   # open http://localhost:8080
```

`live-preview.html` is a single self-contained build (all assets inlined as
data URIs) for previewing/embedding anywhere.
