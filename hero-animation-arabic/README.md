# أرشيف — Arabic Hero Reveal Animation

An Arabic (RTL) recreation of the original "Archive" GSAP hero reveal
animation. Same timeline, staggers, easings, image reveal, `000 → 100`
counter, and `clip-path` wipe — translated into Arabic with a beautiful
calligraphic display font.

## Fonts

- **Aref Ruqaa** — calligraphic display font used for the large titles.
- **Reem Kufi** / **Tajawal** — clean geometric/UI Arabic for nav & footer.

Loaded from Google Fonts.

## Arabic adaptation note

The original English version splits each title into **characters** and reveals
them in random order. Arabic is a **connected (cursive) script**, so splitting
words into individual characters breaks the letter joins and renders the
calligraphy incorrectly.

This version therefore splits titles by **words** (with masked reveals),
preserving correct Arabic letterforms while keeping the identical animation
timeline.

## Running it

The page loads GSAP 3.13 (with the now-free `SplitText` and `CustomEase`
plugins) from a CDN, so it needs an internet connection but **no build step**.

Serve the folder over any static server, e.g.:

```bash
cd hero-animation-arabic
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly via `file://` also works in most browsers.
