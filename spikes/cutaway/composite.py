"""Composite one corrected region back into the L1 master without moving the master's geometry.
Usage: python3 spikes/cutaway/composite.py NN <returned image> [--zoom] [--master PATH] [--force]
  NN        region number from docs/spikes/cutaway-l1-correction/manifest.json (01 to 08)
  returned  the editor's output: the master (1600 x 1004), the 3:2 canvas (any 3:2 size), or the master stretched to any size

The master is never scaled or shifted. Only the returned image is brought into the master's frame:
  1. base mapping: same size = identity; 3:2 = scale to 1600 x 1067 and take the top 1004 rows; otherwise a plain resize
     to 1600 x 1004 (whichever of these fits the master best outside the region is used);
  2. residual fit: uniform scale (+/-3%) and offset (+/-16 px), scored on the unedited ring around the region;
  3. only pixels inside the region mask are taken, with a 3 px inward feather; every pixel outside is the master's own.
--zoom: the returned image is the region's zoomed crop (zoomcrop.py), at any size of the same aspect. It is scaled back
to the crop rectangle recorded in the manifest and placed at its original coordinates; steps 2 and 3, the limits and the
assertion are the same, in master pixels, and the fit is scored inside the rectangle only.
Refuses (unless --force) when the residual fit is over 6 px or 1.5%: the editor moved the picture, not just the region.
Writes master-L1-v<N+1>.png, compare-NN-v<N+1>.png (before | after | returned, cropped) and a history entry in manifest.json."""
import json, re, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

import os
root = Path(__file__).resolve().parents[2]; pkg = Path(os.environ.get("CUTAWAY_PKG", root / "docs/spikes/cutaway-l1-correction"))  # override for tests
W, H, CW, CH = 1600, 1004, 1600, 1067
args = sys.argv[1:]; force = "--force" in args; zoom = "--zoom" in args; args = [a for a in args if a not in ("--force", "--zoom")]
mpath = None
if "--master" in args: i = args.index("--master"); mpath = Path(args[i + 1]); del args[i:i + 2]
nn, ret_path = args[0].zfill(2), Path(args[1])
man = json.loads((pkg / "manifest.json").read_text())
name = next(k for k in man["regions"] if k.startswith(nn + "-")); reg = man["regions"][name]
if mpath is None:
    vs = sorted(pkg.glob("master-L1-v*.png"), key=lambda p: int(re.search(r"v(\d+)", p.stem).group(1))); mpath = vs[-1]
ver = int(re.search(r"v(\d+)", mpath.stem).group(1))
master = Image.open(mpath).convert("RGB"); assert master.size == (W, H), f"master is {master.size}, expected {(W, H)}"
mask = Image.open(pkg / reg["mask"]).convert("L"); ret = Image.open(ret_path).convert("RGB"); rw, rh = ret.size

rect = None
if zoom:
    assert "zoom" in reg, "run zoomcrop.py for this region first"; rect = reg["zoom"]["rect"]; zw, zh = rect[2] - rect[0], rect[3] - rect[1]
    if abs(rw / rh - zw / zh) > 0.01: sys.exit(f"REFUSED: the returned image is {rw} x {rh}; the zoomed crop is {zw}:{zh}. It was re-framed.")
def base(kind):
    if kind == "zoom": full = master.copy(); full.paste(ret.resize((zw, zh), Image.LANCZOS), (rect[0], rect[1])); return full  # PIL clips at the picture edge
    if kind == "identity": return ret.copy()
    if kind == "canvas-3x2": return ret.resize((CW, CH), Image.LANCZOS).crop((0, 0, W, H))
    return ret.resize((W, H), Image.LANCZOS)
kinds = ["zoom"] if zoom else ["identity"] if (rw, rh) == (W, H) else (["canvas-3x2", "stretch"] if abs(rw / rh - 1.5) < 0.01 else ["stretch"])

# scoring ring: the region's box grown by 120 px, minus the region itself (grown 6 px), scored at quarter resolution.
# A zoomed crop is scored inside its rectangle only (less a 24 px border, which a shift would pull blank pixels into), at
# full resolution, because that ring is small.
b = reg["box_px"]; ring = Image.new("L", (W, H), 0); ring.paste(255, (max(0, b[0] - 120), max(0, b[1] - 120), min(W, b[2] + 120), min(H, b[3] + 120)))
ring = np.array(ring) > 0; ring &= ~(np.array(mask.filter(ImageFilter.MaxFilter(13))) > 0)
inrect = np.ones((H, W), bool); win = (0, 0, W, H)
if zoom:
    win = (max(0, rect[0]), max(0, rect[1]), min(W, rect[2]), min(H, rect[3])); inrect[:] = False; inrect[win[1]:win[3], win[0]:win[2]] = True
    inner = np.zeros((H, W), bool); inner[win[1] + 24:win[3] - 24, win[0] + 24:win[2] - 24] = True; ring &= inner
q = 1 if zoom else 4; ww, wh = win[2] - win[0], win[3] - win[1]
gray = lambda im: np.asarray(im.convert("L").resize((ww // q, wh // q), Image.BILINEAR), dtype=np.float32)
M = gray(master.crop(win)); R = ring[win[1]:win[3], win[0]:win[2]][::q, ::q][: wh // q, : ww // q]

def place(img, s, dx, dy, f=1, o=(0, 0)):
    """img (master frame from origin o, or 1/f of it) scaled by s about the region centre and shifted by (dx, dy) master px."""
    cx, cy = ((b[0] + b[2]) / 2 - o[0]) / f, ((b[1] + b[3]) / 2 - o[1]) / f; dx, dy = dx / f, dy / f
    return img.transform(img.size, Image.AFFINE, (1 / s, 0, cx - (cx + dx) / s, 0, 1 / s, cy - (cy + dy) / s), Image.BILINEAR if f > 1 else Image.BICUBIC)
def score(img, s, dx, dy, small=None):
    g = np.asarray(place(small, s, dx, dy, q, win[:2]), np.float32) if small is not None else gray(place(img.crop(win), s, dx, dy, 1, win[:2]))
    return float(np.abs(g - M)[R].mean())

best = None; step = 2 if zoom else 4  # a zoomed crop's ring is lopsided, so scale and offset trade off: search both finely
for kind in kinds:  # coarse: quarter resolution and 4 px offset steps (zoomed crop: full resolution, 2 px)
    img = base(kind); small = img.crop(win).convert("L").resize((ww // q, wh // q), Image.BILINEAR)
    for s in np.arange(0.97, 1.0301, 0.005):
        for dx in range(-16, 17, step):
            for dy in range(-16, 17, step):
                sc = score(img, s, dx, dy, small)
                if best is None or sc < best[0]: best = (sc, kind, float(s), dx, dy)
_, kind, s0, dx0, dy0 = best; img = base(kind); best = (score(img, s0, dx0, dy0), kind, s0, dx0, dy0)
for s in ([s0 - 0.0025, s0, s0 + 0.0025] if zoom else [s0]):  # refine: full resolution, 1 px steps
    for dx in range(dx0 - 3, dx0 + 4):
        for dy in range(dy0 - 3, dy0 + 4):
            sc = score(img, s, dx, dy)
            if sc < best[0]: best = (sc, kind, s, dx, dy)
fit_mad, kind, s, dx, dy = best; zero_mad = score(img, 1.0, 0, 0)
if abs(s - 1) < 0.0025 and abs(dx) <= 1 and abs(dy) <= 1: s, dx, dy, fit_mad = 1.0, 0, 0, zero_mad  # within noise: take the plain mapping
aligned = place(img, s, dx, dy)
report = {"region": name, "returned": str(ret_path.name), "returned_size": [rw, rh], "base_mapping": kind, **({"zoom_rect": rect} if zoom else {}),
          "correction_applied": {"scale": round(s, 4), "dx_px": dx, "dy_px": dy}, "ring_mad_plain": round(zero_mad, 2), "ring_mad_fit": round(fit_mad, 2)}
if (abs(s - 1) > 0.015 or max(abs(dx), abs(dy)) > 6) and not force:
    print(json.dumps(report, indent=1)); sys.exit("REFUSED: the returned picture moved more than 6 px or 1.5% around the region. Check it, or rerun with --force.")

# composite: inward feather only, so alpha is zero everywhere outside the mask
alpha = mask.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(1.5))
a = np.minimum(np.asarray(alpha, np.float32), np.asarray(mask, np.float32))[..., None] / 255
out = np.asarray(master, np.float32) * (1 - a) + np.asarray(aligned, np.float32) * a
out = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))
o, m0, inside = np.asarray(out), np.asarray(master), np.asarray(mask) > 0
assert (o[~inside] == m0[~inside]).all(), "pixels outside the mask changed"
report |= {"pixels_changed_inside": int((np.abs(o.astype(np.int16) - m0).max(axis=2)[inside] > 8).sum()), "pixels_inside": int(inside.sum()),
           "outside_mask_unchanged": True, "editor_redrew_outside_pct": round(float((np.abs(np.asarray(aligned, np.int16) - m0).max(axis=2)[~inside & inrect] > 24).mean() * 100), 1)}
nv = ver + 1; out.save(pkg / f"master-L1-v{nv}.png")
pad = 60; box = (max(0, b[0] - pad), max(0, b[1] - pad), min(W, b[2] + pad), min(H, b[3] + pad)); cw, ch = box[2] - box[0], box[3] - box[1]
cmp = Image.new("RGB", (cw * 3 + 20, ch), (10, 24, 34))
for i, im in enumerate((master, out, aligned)): cmp.paste(im.crop(box), (i * (cw + 10), 0))
cmp.save(pkg / f"compare-{nn}-v{nv}.png")
report |= {"from": mpath.name, "to": f"master-L1-v{nv}.png", "compare": f"compare-{nn}-v{nv}.png"}
man.setdefault("history", []).append(report); (pkg / "manifest.json").write_text(json.dumps(man, indent=1))
print(json.dumps(report, indent=1))
