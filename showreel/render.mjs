#!/usr/bin/env node
/* Frame-accurate renderer for index.html.
 *
 *   node render.mjs stills 0.5 2.4 7.6         → frames/still-<t>.png (no blur)
 *   node render.mjs video                      → qudrati-showreel.mp4
 *
 * Video: every output frame is the average of SAMPLES sub-frames spread over
 * a 180° shutter (half a frame), which is real motion blur rather than a
 * filter. Workers render contiguous chunks in parallel, each into a lossless
 * segment; the segments are concatenated, graded to BT.709 and muxed with
 * soundtrack.wav when it exists.
 *
 * Env: FPS (60), SAMPLES (8), WORKERS (4), FFMPEG (ffmpeg on PATH),
 *      CHROMIUM (optional executable path for Playwright).
 */
import { createServer } from 'node:http';
import { readFile, mkdir, rm, writeFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = dirname(fileURLToPath(import.meta.url));
const FPS = +(process.env.FPS || 60);
const SAMPLES = +(process.env.SAMPLES || 8);
const WORKERS = +(process.env.WORKERS || 4);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const SHUTTER = 0.5;                      // 180°
const TMP = join(ROOT, '.render');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };

function serve() {
  const srv = createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const body = await readFile(join(ROOT, p === '/' ? 'index.html' : p));
      res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(() => window.__ready);
  const cdp = await page.context().newCDPSession(page);
  const shot = async t => {
    await page.evaluate(t => new Promise(r => { window.__seek(t); requestAnimationFrame(() => r()); }), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  return { page, shot };
}

function ffmpeg(args, opts = {}) {
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'], ...opts });
  const done = new Promise((ok, no) => p.on('close', c => (c ? no(new Error('ffmpeg exited ' + c)) : ok())));
  return { p, done };
}
const write = (stream, buf) => new Promise(r => (stream.write(buf) ? r() : stream.once('drain', r)));

async function main() {
  const [mode = 'video', ...rest] = process.argv.slice(2);
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/index.html?render`;
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  try {
    if (mode === 'stills') {
      await mkdir(join(ROOT, 'frames'), { recursive: true });
      const { shot } = await openPage(browser, url);
      for (const t of rest.map(Number)) {
        const f = join(ROOT, 'frames', `still-${t.toFixed(3)}.png`);
        await writeFile(f, await shot(t));
        console.log('wrote', f);
      }
      return;
    }

    const { dur } = await (async () => {
      const { page } = await openPage(browser, url);
      const d = await page.evaluate(() => window.__DUR);
      await page.close();
      return { dur: d };
    })();
    const N = Math.round(dur * FPS);
    await rm(TMP, { recursive: true, force: true });
    await mkdir(TMP, { recursive: true });
    const chunk = Math.ceil(N / WORKERS);
    const t0 = Date.now();
    let doneFrames = 0;

    await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const a = w * chunk, b = Math.min(N, a + chunk);
      if (a >= b) return;
      const { shot } = await openPage(browser, url);
      // sub-frames go in at FPS×SAMPLES; tmix averages each group, select keeps one per group
      const seg = join(TMP, `seg${w}.mkv`);
      const ff = ffmpeg(['-f', 'image2pipe', '-framerate', String(FPS * SAMPLES), '-c:v', 'png', '-i', '-',
        '-vf', `tmix=frames=${SAMPLES},select='eq(mod(n\\,${SAMPLES})\\,${SAMPLES - 1})',setpts=N/(${FPS}*TB)`,
        '-r', String(FPS), '-c:v', 'libx264rgb', '-qp', '0', '-preset', 'ultrafast', seg]);
      for (let f = a; f < b; f++) {
        for (let s = 0; s < SAMPLES; s++) {
          // centred shutter: samples straddle the frame's nominal time
          const t = Math.min(dur - 1e-4, Math.max(0, (f + ((s + 0.5) / SAMPLES - 0.5) * SHUTTER) / FPS));
          await write(ff.p.stdin, await shot(t));
        }
        if (++doneFrames % 30 === 0) {
          const el = (Date.now() - t0) / 1000;
          console.log(`${doneFrames}/${N} frames · ${el.toFixed(0)}s · eta ${(el / doneFrames * (N - doneFrames)).toFixed(0)}s`);
        }
      }
      ff.p.stdin.end();
      await ff.done;
    }));

    const list = Array.from({ length: WORKERS }, (_, w) => `file 'seg${w}.mkv'`).join('\n');
    await writeFile(join(TMP, 'list.txt'), list + '\n');
    const out = join(ROOT, 'qudrati-showreel.mp4');
    const wav = join(ROOT, 'soundtrack.wav');
    const hasAudio = await access(wav).then(() => true, () => false);
    await ffmpeg([
      '-f', 'concat', '-safe', '0', '-i', join(TMP, 'list.txt'),
      ...(hasAudio ? ['-i', wav] : []),
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      ...(hasAudio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
      '-movflags', '+faststart', '-t', String(dur), out
    ]).done;
    console.log('wrote', out, `in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } finally {
    await browser.close();
    srv.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
