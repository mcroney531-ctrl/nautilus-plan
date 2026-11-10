"""Synthetic test of the zoomed-crop workflow (zoomcrop.py + composite.py --zoom). Touches a temporary copy of the package only.
Usage: python3 spikes/cutaway/test-zoom.py [NN]     (default 05)
A fake "edit" paints a magenta block at a known place inside the mask on the zoomed crop, and repaints the rest of the crop
slightly (a brightness change and noise, as an editor does). Cases: returned as is; at another size; shifted and scaled within
the limits; shifted beyond them (must be refused); re-framed to another aspect (must be refused). For each accepted case:
the block must land within 1 px of its expected master coordinates, and no pixel outside the mask may change."""
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
here = Path(__file__).parent; src = here.parents[1] / "docs/spikes/cutaway-l1-correction"; nn = (sys.argv[1:] or ["05"])[0]
tmp = Path(tempfile.mkdtemp()); pkg = tmp / "pkg"; pkg.mkdir(); env = {**os.environ, "CUTAWAY_PKG": str(pkg)}
man = json.loads((src / "manifest.json").read_text()); name = next(k for k in man["regions"] if k.startswith(nn + "-")); reg = man["regions"][name]
vs = sorted(src.glob("master-L1-v*.png"), key=lambda p: int(p.stem.split("v")[-1])); shutil.copy(vs[-1], pkg); shutil.copy(src / reg["mask"], pkg); shutil.copy(src / "manifest.json", pkg)
run = lambda *a: subprocess.run([sys.executable, *map(str, a)], env=env, capture_output=True, text=True)
r = run(here / "zoomcrop.py", nn); assert r.returncode == 0, r.stderr; print(r.stdout.strip())
z = json.loads((pkg / "manifest.json").read_text())["regions"][name]["zoom"]; rect, sc = z["rect"], z["scale"]
crop = Image.open(next(pkg.glob(f"zoom-{name}-v*.png"))).convert("RGB"); master = np.asarray(Image.open(pkg / vs[-1].name).convert("RGB")).astype(int)
mask = np.asarray(Image.open(pkg / reg["mask"]).convert("L")) > 0; b = reg["box_px"]
blk = [b[0] + 14, b[1] + 40, b[0] + 37, b[1] + 79]  # the block, in master px (inclusive), well inside the mask
rng = np.random.default_rng(1); a = np.asarray(crop).astype(float) * 1.04 + rng.normal(0, 3, (crop.height, crop.width, 3)); edit = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
ImageDraw.Draw(edit).rectangle([(blk[0] - rect[0]) * sc, (blk[1] - rect[1]) * sc, (blk[2] + 1 - rect[0]) * sc - 1, (blk[3] + 1 - rect[1]) * sc - 1], fill=(255, 0, 255))
def moved(s, dx, dy):  # scale about the centre and shift, in zoomed px
    cx, cy = edit.width / 2, edit.height / 2; return edit.transform(edit.size, Image.AFFINE, (1 / s, 0, cx - (cx + dx) / s, 0, 1 / s, cy - (cy + dy) / s), Image.BICUBIC)
cases = [("as returned", edit, True), ("returned at 832 x 1248" if edit.height > edit.width else "returned at 1248 x 832", edit.resize((832, 1248) if edit.height > edit.width else (1248, 832), Image.LANCZOS), True),
         (f"shifted {round(3 * sc)} / {round(-2 * sc)} zoomed px (3 / -2 in the master), scale 1.01", moved(1.01, 3 * sc, -2 * sc), True),
         (f"shifted {round(12 * sc)} zoomed px (12 in the master)", moved(1.0, 12 * sc, 0), False), ("re-framed to 1024 x 1024", edit.resize((1024, 1024)), False)]
ok = True
for label, img, accept in cases:
    for f in pkg.glob("master-L1-v*.png"):
        if f.name != vs[-1].name: f.unlink()
    f = tmp / "ret.png"; img.save(f); r = run(here / "composite.py", nn, f, "--zoom")
    if not accept: good = r.returncode != 0 and "REFUSED" in (r.stderr + r.stdout); print(("PASS" if good else "FAIL"), "|", label, "| refused" if good else "| NOT refused"); ok &= good; continue
    if r.returncode: print("FAIL |", label, "|", " ".join((r.stdout + r.stderr).split())[-420:]); ok = False; continue
    out = np.asarray(Image.open(max(pkg.glob("master-L1-v*.png"), key=lambda p: int(p.stem.split("v")[-1]))).convert("RGB")).astype(int)
    same = bool((out[~mask] == master[~mask]).all()); mg = (out[..., 0] > 200) & (out[..., 1] < 90) & (out[..., 2] > 200); ys, xs = np.nonzero(mg)
    got = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None; err = max(abs(g - e) for g, e in zip(got, blk)) if got else 99
    good = same and err <= 1; ok &= good; print(("PASS" if good else "FAIL"), "|", label, "| block", got, "expected", blk, "| max error", err, "px | outside mask unchanged:", same)
shutil.rmtree(tmp); print("ALL PASS" if ok else "FAILED"); sys.exit(0 if ok else 1)
