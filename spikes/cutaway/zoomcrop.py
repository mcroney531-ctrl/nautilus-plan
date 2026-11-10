"""Zoomed-crop inputs for a small region: the same mask, at a working resolution an image editor can hold.
Usage: python3 spikes/cutaway/zoomcrop.py NN
Cuts a rectangle around the region's box from the latest master (the box plus at least 60 px of context, at 2:3 or 3:2,
whichever suits the box), and scales it up to 1024 x 1536 or 1536 x 1024. The editable region is not enlarged: only the
working resolution changes. Where the rectangle runs past the picture it is padded with the background colour.
Writes zoom-NN-*-v<N>.png (the crop), zoom-guide-NN-*-v<N>.png (the crop with the mask outlined) and zoom-mask-NN-*.png,
and records the rectangle in the manifest as region["zoom"]; composite.py --zoom uses it to put the edit back."""
import json, os, re, sys
from pathlib import Path
from PIL import Image, ImageDraw
pkg = Path(os.environ.get("CUTAWAY_PKG", Path(__file__).resolve().parents[2] / "docs/spikes/cutaway-l1-correction")); M, PAD, BG = 60, 20, (10, 24, 34)
man = json.loads((pkg / "manifest.json").read_text()); nn = sys.argv[1].zfill(2)
name = next(k for k in man["regions"] if k.startswith(nn + "-")); reg = man["regions"][name]; x0, y0, x1, y1 = reg["box_px"]
mp = max(pkg.glob("master-L1-v*.png"), key=lambda p: int(re.search(r"v(\d+)", p.stem).group(1))); v = re.search(r"v(\d+)", mp.stem).group(1)
master = Image.open(mp).convert("RGB"); W, H = master.size; bw, bh = x1 - x0 + 1, y1 - y0 + 1
aw, ah, canvas = (2, 3, (1024, 1536)) if bh > bw else (3, 2, (1536, 1024))
u = max(-(-(bw + 2 * M) // aw), -(-(bh + 2 * M) // ah)); w, h = u * aw, u * ah  # smallest exact-aspect rectangle with the margin
rx = min(max(round((x0 + x1 + 1) / 2 - w / 2), -PAD), W + PAD - w); ry = min(max(round((y0 + y1 + 1) / 2 - h / 2), -PAD), H + PAD - h)
rect = [rx, ry, rx + w, ry + h]; scale = canvas[0] / w
def cut(img, fill, resample):
    c = Image.new(img.mode, (w, h), fill); c.paste(img.crop((max(0, rx), max(0, ry), min(W, rx + w), min(H, ry + h))), (max(0, -rx), max(0, -ry))); return c.resize(canvas, resample)
crop = cut(master, BG, Image.LANCZOS); crop.save(pkg / f"zoom-{name}-v{v}.png")
mask = cut(Image.open(pkg / reg["mask"]).convert("L"), 0, Image.NEAREST); mask.save(pkg / f"zoom-mask-{name}.png")
guide = crop.copy(); b = mask.getbbox(); ImageDraw.Draw(guide).rectangle([b[0] - 4, b[1] - 4, b[2] + 3, b[3] + 3], outline=(255, 210, 0), width=4); guide.save(pkg / f"zoom-guide-{name}-v{v}.png")
reg["zoom"] = {"rect": rect, "canvas": list(canvas), "scale": round(scale, 3)}; (pkg / "manifest.json").write_text(json.dumps(man, indent=1))
print(f"{name}: rect {rect} ({w} x {h}) at {scale:.2f}x on {canvas[0]} x {canvas[1]}, from {mp.name}")
