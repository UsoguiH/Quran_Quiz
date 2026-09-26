#!/usr/bin/env python3
"""Cut the قدّور poses this film acts with, straight from the Qudrati character sheets.

    QUDRATI=/path/to/-QUDRATI python3 tools/cut_poses.py

Reuses the app's own slicer (tools/slice_mascot.py in the Qudrati repo): same gutters,
same per-sheet anchor scale, same shared baseline. The only differences are a 2x canvas
(the film shows him up to ~900 px tall) and two clean-ups the app never needed:

  * the painted floor ellipse is keyed out of every pose, because the film draws live
    shadows that shrink when he jumps and spread when he lands;
  * background trapped inside the silhouette (the gap between the stick and a leg) is
    removed on the cream sheets, where it can't be confused with his white shirt.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw

QUDRATI = os.environ.get('QUDRATI', '/home/user/usoguih/-qudrati')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'mascot')
POSES = ['sleep', 'wait', 'concerned', 'read', 'cheer', 'celebrate', 'proud', 'wave']

sys.path.insert(0, os.path.join(QUDRATI, 'tools'))
import slice_mascot as S  # noqa: E402

S.CANVAS = 1024
S.TARGET_H = int(S.CANVAS * 0.94)
S.MAX_W = int(S.CANVAS * 0.96)
S.BASELINE = (S.CANVAS - S.TARGET_H) // 2
S.SIZE_LIMIT = 10 ** 9
S.OUT_DIR = OUT
S.SHIP = set(POSES)
S.LIVE_SHADOW = set(POSES)
os.makedirs(OUT, exist_ok=True)
SHEET_OF = {}
for n, rows in S.SHEETS.items():
    for row in rows:
        for name in row:
            SHEET_OF[name] = n
for n in sorted({SHEET_OF[p] for p in POSES}):
    S.process(n)


def key_floor(a):
    """Below the ankles, grey-and-light is the painted floor: fade it out, keep the
    near-black shoes, the stick and the purple book stack."""
    rgb, al = a[..., :3], a[..., 3]
    rows = np.where(al.max(1) > 20)[0]
    top, bottom = rows[0], rows[-1]
    band = np.zeros(al.shape, bool)
    band[int(bottom - (bottom - top) * 0.075):] = True
    lum = rgb.mean(-1)
    sat = rgb.max(-1) - rgb.min(-1)
    keep = np.clip((150 - lum) / 60, 0, 1)
    floor = band & (sat < 26)
    a[..., 3] = np.where(floor, al * keep, al).astype(np.uint8)
    return a


def drop_trapped(a, bg, tol=18, min_area=120):
    """Remove opaque, background-coloured islands (cream sheets only)."""
    rgb = a[..., :3].astype(int)
    paper = np.all(np.abs(rgb - bg) <= tol, axis=2) & (a[..., 3] > 200)
    img = Image.fromarray(np.where(paper, 255, 0).astype(np.uint8), 'L').copy()
    w, h = img.size
    removed = 0
    ys, xs = np.nonzero(paper)
    for y, x in zip(ys[::7], xs[::7]):
        if img.getpixel((int(x), int(y))) != 255:
            continue
        ImageDraw.floodfill(img, (int(x), int(y)), 100, thresh=0)
        comp = np.array(img) == 100
        if comp.sum() >= min_area:
            a[comp, 3] = 0
            removed += int(comp.sum())
        img = Image.fromarray(np.where(np.array(img) == 100, 50, np.array(img)).astype(np.uint8), 'L').copy()
    return a, removed


CREAM = np.array([252, 240, 223])
for p in POSES:
    path = os.path.join(OUT, f'qaddour-{p}.png')
    a = np.array(Image.open(path).convert('RGBA'))
    a = key_floor(a)
    note = ''
    if SHEET_OF[p] in (2, 3):
        a, n = drop_trapped(a, CREAM)
        note = f', {n} trapped px removed' if n else ''
    im = Image.fromarray(a, 'RGBA')
    bbox = im.getbbox()
    im.save(path, optimize=True)
    print(f'{p:<10} floor keyed{note}  bbox {bbox}')
