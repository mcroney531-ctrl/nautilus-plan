"""Scripted material treatment for a "surface" region: turn what is painted on a wall face into plain service-wall material.
Usage: python3 spikes/cutaway/material.py NN [--preview DIR]
No image generation. Inside the region's mask only:
  - mural pixels (the saturated blue-green family) are recoloured to the region's target wall colour. The wall keeps the
    painting's broad shading (very low frequency luminance), its fine surface grain, and the warm light the fixtures throw
    on it (taken from the red channel, which the mural itself barely uses); mural shapes and silhouettes are removed;
  - "objects" boxes in the manifest (furnishings painted on the wall) are removed: wall material where the mural was,
    and below "band_bottom" each row is filled from the clean pixels of the same row on either side;
  - light fixtures are kept exactly: bright lamp pixels and the neutral housing pixels around them are never written;
  - everything else in the mask (neutral wall, skirting, floor ledge) is left as it is.
Without --preview it writes the next master, a compare image and a manifest history entry, after asserting that no pixel
outside the mask changed. With --preview it writes preview images to DIR and touches nothing in the package."""
import json, re, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
root = Path(__file__).resolve().parents[2]; pkg = root / "docs/spikes/cutaway-l1-correction"
args = sys.argv[1:]; prev = None
if "--preview" in args: i = args.index("--preview"); prev = Path(args[i + 1]); del args[i:i + 2]
man = json.loads((pkg / "manifest.json").read_text()); nn = args[0].zfill(2); name = next(k for k in man["regions"] if k.startswith(nn + "-")); reg = man["regions"][name]; mt = reg["material"]
mp = max(pkg.glob("master-L1-v*.png"), key=lambda q: int(re.search(r"v(\d+)", q.stem).group(1))); ver = int(re.search(r"v(\d+)", mp.stem).group(1))
master = Image.open(mp).convert("RGB"); a = np.asarray(master).astype(np.float32); H, W = a.shape[:2]; R, G, B = a[..., 0], a[..., 1], a[..., 2]
M = np.asarray(Image.open(pkg / reg["mask"]).convert("L")) > 0; x0, y0, x1, y1 = reg["box_px"]
def blur(arr, s):  # gaussian blur of a float image (reflect-padded, in the frequency domain)
    p = int(3 * s) + 1; b = np.pad(arr.astype(np.float32), p, mode="reflect"); fy = np.fft.fftfreq(b.shape[0])[:, None]; fx = np.fft.rfftfreq(b.shape[1])[None, :]
    return np.fft.irfft2(np.fft.rfft2(b) * np.exp(-2 * (np.pi * s) ** 2 * (fx ** 2 + fy ** 2)), s=b.shape)[p:-p, p:-p].astype(np.float32)
grow = lambda m, n: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * n + 1))) > 0
def nblur(arr, valid, s):  # blur over valid pixels only, so removed things do not bleed into the field
    w = blur(valid.astype(np.float32), s); return blur(arr * valid, s) / np.maximum(w, 1e-3)
L = 0.299 * R + 0.587 * G + 0.114 * B; sat = a.max(axis=2) - a.min(axis=2)
# fixtures, kept exactly: each lamp (a warm, bright blob) with a keep-zone around it. A lamp near the skirting is a floor-standing
# box whose body runs down from the lamp; any other lamp is a wall light with a thin housing. Mural pixels in a zone still count as mural.
core = (R > 205) & (R > G + 8) & (R - B > 25) & grow(M, 6); mural = (B - R > 22) & (G - R > 10); zone = np.zeros((H, W), bool); seen = np.zeros((H, W), bool)
for y, x in zip(*np.nonzero(core)):
    if seen[y, x]: continue
    todo = [(y, x)]; ys, xs = [], []
    while todo:
        cy, cx = todo.pop()
        if 0 <= cy < H and 0 <= cx < W and core[max(0, cy - 2):cy + 3, max(0, cx - 2):cx + 3].any() and not seen[cy, cx] and core[cy, cx]:
            seen[cy, cx] = True; ys.append(cy); xs.append(cx); todo += [(cy + dy, cx + dx) for dy in (-2, -1, 0, 1, 2) for dx in (-2, -1, 0, 1, 2)]
    if len(ys) < 12: continue
    ya, yb, xa, xb = min(ys), max(ys), min(xs), max(xs); box_lamp = "band_bottom" in mt and yb > mt["band_bottom"] - mt.get("box_lamp_reach", 26)
    z = (xa - 14, ya - 5, xb + 7, ya + mt.get("box_lamp_height", 30)) if box_lamp else (xa - 5, ya - 6, xb + 5, yb + 3)
    zone[max(0, z[1]):z[3] + 1, max(0, z[0]):z[2] + 1] = True
fixture = zone & (grow(core, 2) | ((sat < 30) & (L < 95)))   # exact: the lamp and its dark neutral housing. The mural around it, lit or not, is wall
objs = np.zeros((H, W), bool)
for b in mt.get("objects", []): objs[b[1]:b[3] + 1, b[0]:b[2] + 1] = True
band = np.ones((H, W), bool)
if "band_bottom" in mt: band[mt["band_bottom"]:] = False                      # the mural band ends here; below it only objects are touched
if "band_top" in mt: band[:mt["band_top"]] = False
wall = M & ~fixture & ((band if mt.get("full_band") else band & (mural | objs)) | mural)  # becomes wall material
clean = M & band & mural & ~objs & ~fixture                                     # where the fields are measured
# broad shading: luminance of the mural's darker ground, very low frequency, relative to its median
dark = clean & (L < np.percentile(L[clean], 60)); sh = nblur(L, dark, mt.get("shade_sigma", 60)); sh = np.clip(sh / np.median(sh[wall]), 0.75, 1.3)
# light from the fixtures: red excess over the mural's own (near zero) red
lit = M & band & ~objs & ~fixture; rex = np.clip(R - np.percentile(R[clean], 50) - 6, 0, mt.get("glow_cap", 70)); glow = np.where(blur(lit.astype(np.float32), 2.0) > 0.2, nblur(rex, lit, 2.0), nblur(rex, lit, 14.0))  # behind an object, the light around it carries across
# fine grain from the clean mural, reused at random where there was an object or a silhouette edge
hf = L - blur(L, 1.5); rng = np.random.default_rng(7); pool = hf[clean & (np.abs(hf) < 6)]; grain = np.where(clean & (np.abs(hf) < 6), hf, rng.choice(pool, size=(H, W)))
mottle = blur(rng.normal(0, 1, (H, W)), 7) * mt.get("mottle", 14) + blur(rng.normal(0, 1, (H, W)), 24) * mt.get("mottle", 14) * 2.2  # uneven paint, two scales
tgt = np.array(mt["target"], np.float32); gain = mt.get("glow_gain", 1.1); warm = np.array([1.0, 0.86, 0.62], np.float32)
top = np.where(M.any(axis=0), M.argmax(axis=0), 0)[None, :]; capsh = 0.84 + 0.16 * np.clip((np.arange(H)[:, None] - top) / 12.0, 0, 1)  # soft shadow under the wall cap
out = a.copy(); new = tgt[None, None, :] * (sh * (capsh if mt.get("cap_shadow") else 1))[..., None] + (grain * 0.8 + mottle)[..., None] + (glow * gain)[..., None] * warm
# next to a lamp the painting's own structure is kept pixel for pixel in brightness (the lamp's body lines, its pool of light):
# darker than the mural ground stays darker, lighter becomes warm light. Away from lamps only the smooth fields above are used.
Lb = nblur(L, dark, mt.get("shade_sigma", 60)); d = L - Lb; near = np.clip(blur(grow(zone, 3).astype(np.float32), 3.0), 0, 1) * (~objs)
keep = tgt[None, None, :] * (sh * np.clip(1 + np.minimum(d, 0) / np.maximum(Lb, 1), 0.25, 1))[..., None] + (np.maximum(d, 0) * mt.get("lamp_gain", 0.9))[..., None] * warm + (grain * 0.5)[..., None]
new = new * (1 - near[..., None]) + keep * near[..., None]
out[wall] = new[wall]
# objects below the band (skirting, floor ledge): only pixels that differ from their row's clean neighbours are replaced
low = np.zeros((H, W), bool); okc = M & ~objs & ~fixture & ~band & ~mural
for y in np.unique(np.nonzero(M & objs & ~band)[0]):
    xs = np.nonzero(M[y] & objs[y] & ~band[y] & ~fixture[y])[0]
    for xa in np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1):
        if not len(xa): continue
        lo, hi = xa[0], xa[-1]; left = np.arange(max(0, lo - 60), lo); left = left[okc[y, left]]; right = np.arange(hi + 1, min(W, hi + 61)); right = right[okc[y, right]]
        if len(left) + len(right) < 8: continue
        far = np.nonzero(okc[y])[0]; far = far[(far > lo - 170) & (far < hi + 170)]; base = np.median(a[y, far], axis=0)   # the row's usual colour nearby
        cl = np.median(a[y, left[-6:]], axis=0) if len(left) else base; cr = np.median(a[y, right[:6]], axis=0) if len(right) else base
        d = np.arange(lo, hi + 1); wl = np.exp(-(d - lo + 1) / 26.0)[:, None]; wr = np.exp(-(hi + 1 - d) / 26.0)[:, None]  # neighbours fade into the usual colour
        ref = base[None] + (cl - base)[None] * wl + (cr - base)[None] * wr
        low[y, lo:hi + 1] = True; out[y, lo:hi + 1] = ref + rng.choice(pool, size=(hi - lo + 1, 1)) * 0.8
edit = wall | low; soft = np.clip(blur((edit * 255).astype(np.float32), 0.8) / 255, 0, 1) * edit  # antialias the edge inwards only
out = a * (1 - soft[..., None]) + out * soft[..., None]; out = np.clip(out + 0.5, 0, 255).astype(np.uint8); res = Image.fromarray(out)
m0 = np.asarray(master); assert (out[~M] == m0[~M]).all(), "pixels outside the mask changed"; assert (out[fixture & M] == m0[fixture & M]).all(), "a light fixture changed"
left = M & mural & band & ~fixture & ~edit
report = {"region": name, "method": "scripted material treatment (no image generation)", "pixels_in_mask": int(M.sum()), "pixels_changed": int((np.abs(out.astype(int) - m0).max(axis=2) > 0).sum()),
          "fixture_pixels_kept": int((fixture & M).sum()), "mural_pixels_left": int(left.sum()), "outside_mask_unchanged": True, "from": mp.name}
pad = 30; box = (max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)); cw, ch = box[2] - box[0], box[3] - box[1]
horiz = cw > ch; cmp = Image.new("RGB", (cw, ch * 2 + 10) if horiz else (cw * 2 + 10, ch), (10, 24, 34))
cmp.paste(master.crop(box), (0, 0)); cmp.paste(res.crop(box), (0, ch + 10) if horiz else (cw + 10, 0))
if prev: prev.mkdir(parents=True, exist_ok=True); res.save(prev / f"preview-{nn}.png"); cmp.save(prev / f"preview-compare-{nn}.png"); print(json.dumps(report)); sys.exit(0)
nv = ver + 1; res.save(pkg / f"master-L1-v{nv}.png"); cmp.save(pkg / f"compare-{nn}-v{nv}.png"); report |= {"to": f"master-L1-v{nv}.png", "compare": f"compare-{nn}-v{nv}.png"}
man.setdefault("history", []).append(report); (pkg / "manifest.json").write_text(json.dumps(man, indent=1)); print(json.dumps(report, indent=1))
