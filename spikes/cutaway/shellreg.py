"""Shell registration: does a whole-level painting sit on the engine's walls?
Usage: python3 spikes/cutaway/shellreg.py LEVEL <painting> [--zone x0 y0 x1 y1] [--sheet out.png]
       python3 spikes/cutaway/shellreg.py --selftest
The compositor's own fit needs unchanged pixels round the region; a shell paint has none. This check uses the one thing every
painting in this style shares with the engine: white wall caps.
  engine caps  = cap-coloured pixels of the engine blockout (base.js, variant C)
  painted caps = neutral near-white pixels of the painting
1. Global fit: for each scale 0.97..1.03 (step 0.0025) the painted caps are scaled about the zone centre and cross-correlated
   (FFT) with the engine caps over shifts of +/-24 px. The best (scale, dx, dy) is the registration.
   Limits: |scale - 1| <= 1.5%, |dx|, |dy| <= 6 px, the compositor's own.
2. Confidence, after applying the fit: recall = engine cap pixels with a painted cap within 5 px; precision = painted cap pixels
   within 5 px of an engine cap; peak = best correlation / median correlation over all shifts. A fit with recall < 0.60 or
   peak < 3 is not a registration: HOLD.
3. Structure: the zone is cut into 200 px tiles. With the global fit applied, a tile with enough engine cap fails if its recall
   is under 0.30 (walls missing), or if some shift of more than 12 px (searched to +/-30 px) gives a recall more than
   0.30 above the best shift within 12 px (a wall in the wrong place). These thresholds are set so the approved L1 master passes: its own walls sit up to 9 px
   off the engine's in places, and its tall kelp tank hides a wall. So this step finds walls misplaced by more than about
   12 px; smaller errors are inside what L1 was approved with.
The fit is the correction that brings the painting onto the engine (the inverse of how the painting is displaced).
Result: PASS (fit within limits, confident, no failed tile), REFUSED (fit confident but outside limits), or HOLD."""
import json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
root = Path(__file__).resolve().parents[2]; W, H = 1600, 1004
def engine_caps(level):
    f = root / f"spikes/cutaway/out/C-L{level}-blockout-full.png"
    js = """const {baseSVG}=require('./spikes/cutaway/base.js'),{chromium}=require('playwright');(async()=>{const b=await chromium.launch(),pg=await b.newPage({viewport:{width:1600,height:1400}});
const svg=baseSVG(+process.argv[2],'C',false).replace(/width="400" height="(\\d+)"/,(m,h)=>`width="1600" height="${h*4}"`);
await pg.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);await pg.locator('svg').screenshot({path:process.argv[1]});await b.close()})()"""
    subprocess.check_call(["node", "-e", js, str(f), str(level)], cwd=root); a = np.asarray(Image.open(f).convert("RGB")).astype(int)
    return np.abs(a - np.array([238, 243, 245])).max(axis=2) < 8
def to_frame(img):
    img = img.convert("RGB"); w, h = img.size
    if (w, h) == (W, H): return img
    if abs(w / h - 1.5) < 0.01: return img.resize((1600, 1067), Image.LANCZOS).crop((0, 0, W, H))
    return img.resize((W, H), Image.LANCZOS)
def painted_caps(img): a = np.asarray(img).astype(int); return (a.min(axis=2) > 212) & (a.max(axis=2) - a.min(axis=2) < 30)
dil = lambda m, n: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * n + 1))) > 0
def place(m, s, dx, dy, c):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).transform((W, H), Image.AFFINE, (1 / s, 0, c[0] - (c[0] + dx) / s, 0, 1 / s, c[1] - (c[1] + dy) / s), Image.BILINEAR)) > 127
def xcorr(E, P, R):
    c = np.fft.irfft2(np.fft.rfft2(E.astype(np.float32)) * np.conj(np.fft.rfft2(P.astype(np.float32))), s=E.shape)
    sub = np.roll(np.roll(c, R, 0), R, 1)[:2 * R + 1, :2 * R + 1]; i = np.unravel_index(np.argmax(sub), sub.shape); return float(sub[i]), int(i[1] - R), int(i[0] - R), float(np.median(sub))
def register(E, img, zone=None, tiles=True):
    x0, y0, x1, y1 = zone or (0, 0, W, H); Z = np.zeros((H, W), bool); Z[y0:y1, x0:x1] = True; P = painted_caps(img) & Z; Ez = E & Z; c = ((x0 + x1) / 2, (y0 + y1) / 2)
    Eb = np.asarray(Image.fromarray((Ez * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), np.float32) / 255; best = None
    for s in np.arange(0.97, 1.03001, 0.0025):
        Ps = place(P, s, 0, 0, c); v, dx, dy, med = xcorr(Eb, Ps, 24); v /= max(Ps.sum(), 1); med /= max(Ps.sum(), 1)
        if best is None or v > best[0]: best = (v, float(s), dx, dy, med)
    v, s, dx, dy, med = best; Pa = place(P, s, dx, dy, c); recall = float((Ez & dil(Pa, 5)).sum() / max(Ez.sum(), 1)); prec = float((Pa & dil(Ez, 5)).sum() / max(Pa.sum(), 1)); peak = v / max(med, 1e-6)
    res = {"zone": [x0, y0, x1, y1], "fit": {"scale": round(s, 4), "dx_px": dx, "dy_px": dy}, "recall": round(recall, 2), "precision": round(prec, 2), "peak": round(peak, 1), "tiles_failed": []}
    if tiles:
        Pd = dil(Pa, 5)
        for ty in range(y0, y1, 200):
            for tx in range(x0, x1, 200):
                ta, tb, tc, td = ty, min(ty + 200, y1), tx, min(tx + 200, x1); Et = Ez[ta:tb, tc:td]
                if Et.sum() < 500: continue
                rc = float((Et & Pd[ta:tb, tc:td]).sum() / Et.sum()); near = (rc, 0, 0); far = (0.0, 0, 0)   # best recall within 12 px, and beyond
                for ldy in range(-30, 31, 3):
                    for ldx in range(-30, 31, 3):
                        a0, a1, b0, b1 = ta - ldy, tb - ldy, tc - ldx, td - ldx
                        if a0 < 0 or b0 < 0 or a1 > H or b1 > W: continue
                        r2 = float((Et & Pd[a0:a1, b0:b1]).sum() / Et.sum())
                        if max(abs(ldx), abs(ldy)) <= 12: near = max(near, (r2, ldx, ldy))
                        else: far = max(far, (r2, ldx, ldy))
                if rc < 0.30 or far[0] > near[0] + 0.30: res["tiles_failed"].append({"tile_px": [tx, ty], "recall": round(rc, 2), "best_within_12px": round(near[0], 2), "best_beyond": round(far[0], 2), "at_shift": [far[1], far[2]]})
    conf = recall >= 0.60 and peak >= 3; inlim = abs(s - 1) <= 0.015 and max(abs(dx), abs(dy)) <= 6
    res["result"] = "HOLD" if not conf else "REFUSED" if not inlim else "PASS" if not res["tiles_failed"] else "HOLD"; res["_aligned_caps"] = Pa; return res
def selftest():
    import re
    l1 = max((root / "docs/spikes/cutaway-l1-correction").glob("master-L1-v*.png"), key=lambda q: int(re.search(r"v(\d+)", q.stem).group(1))); good = Image.open(l1).convert("RGB"); E = engine_caps(1); ok = True
    def tr(img, s, dx, dy): return img.transform((W, H), Image.AFFINE, (1 / s, 0, W / 2 - (W / 2 + dx) / s, 0, 1 / s, H / 2 - (H / 2 + dy) / s), Image.BICUBIC, fillcolor=(10, 24, 34))
    moved = good.copy(); blk = good.crop((820, 640, 1260, 760)); moved.paste((120, 120, 118), (820, 640, 1260, 760)); moved.paste(blk, (820, 690))   # the Atrium's north wall moved 50 px south
    base = register(E, good)["fit"]   # the approved master's own fit; transformed copies must come back to it
    cases = [("the locked L1 master, as is", good, "PASS", (1.0, 0, 0)), ("scaled 1%, shifted 3 / -2", tr(good, 1.01, 3, -2), "PASS", (1.01, 3, -2)), ("scaled 2.5%, shifted 9 / -5", tr(good, 1.025, 9, -5), "REFUSED", (1.025, 9, -5)),
             ("shifted 14 px", tr(good, 1.0, 14, 0), "REFUSED", (1.0, 14, 0)), ("one wall moved 50 px (the Atrium's north wall)", moved, "HOLD", (1.0, 0, 0)),
             ("a different level's layout (the L2 blockout against L1's walls)", Image.open(root / "docs/spikes/cutaway-l2/blockout-L2.png"), "HOLD", None)]
    for name, img, want, truth in cases:
        r = register(E, img); f = r["fit"]
        rec = truth is None or (abs(f["scale"] * truth[0] - base["scale"]) <= 0.004 and abs(f["dx_px"] + truth[1] - base["dx_px"]) <= 2 and abs(f["dy_px"] + truth[2] - base["dy_px"]) <= 2)
        good_ = r["result"] == want and rec; ok &= good_
        print(("PASS" if good_ else "FAIL"), "|", name, "| result", r["result"], "(want " + want + ")", "| correction found", f, "| recall", r["recall"], "precision", r["precision"], "peak", r["peak"], "| failed tiles", len(r["tiles_failed"]))
    print("ALL PASS" if ok else "FAILED"); sys.exit(0 if ok else 1)
if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "--selftest": selftest()
    zone = [int(v) for v in a[a.index("--zone") + 1:a.index("--zone") + 5]] if "--zone" in a else None; img = to_frame(Image.open(a[1])); E = engine_caps(int(a[0])); r = register(E, img, zone); Pa = r.pop("_aligned_caps")
    if "--sheet" in a:
        v = np.asarray(img).astype(np.float32) * 0.45; v[E] = (255, 0, 255); v[Pa & ~dil(E, 5)] = (255, 220, 0); v[Pa & dil(E, 5) & ~E] = (0, 255, 120); im = Image.fromarray(v.astype(np.uint8)); d = ImageDraw.Draw(im)
        for t in r["tiles_failed"]: d.rectangle([t["tile_px"][0], t["tile_px"][1], t["tile_px"][0] + 199, t["tile_px"][1] + 199], outline=(255, 60, 60), width=4)
        im.save(a[a.index("--sheet") + 1])
    print(json.dumps(r, indent=1)); sys.exit(0 if r["result"] == "PASS" else 1)
