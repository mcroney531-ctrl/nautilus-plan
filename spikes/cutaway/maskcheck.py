"""Check a correction mask against the engine geometry (variant C, L1) before it is used.
Usage: python3 spikes/cutaway/maskcheck.py NN [x0 y0 x1 y1] [--sheet out.png]
With no box, checks the region's box in the manifest; with a box, checks that proposal instead (the manifest is not written).
The architecture is rendered from base.js (arch mode). Two kinds of region, set by "check" in the manifest:

interior (default; rooms, floors):
  I1  the mask holds no architecture pixel: no wall face, side face or cap, and no wall span of any opening.
      With "internal_wall": {"at": x, "a": y0, "b": y1} (a false wall painted on a boundary inside one space) the mask is the
      region's mask file: its box plus that wall's silhouette. Architecture behind the silhouette is exempt from I1, and
  I2  no mask pixel lies outside the box and the silhouette.

opening (a mask that has to repaint part of one wall):  "check": {"kind": "opening", "o": "v"|"h", "at": wall coordinate,
                                                                   "opening": [x, y], "width": plan units}
  O1  the mask holds no pixel of any wall other than the target wall line;
  O2  the mask contains the whole engine opening (the gap the engine cuts in that wall, with the wall's height and shear);
  O3  the mask reaches no further than REACH px beyond that opening on any side;
  O4  the mask does not overlap any region already composited (the manifest history), so approved rooms cannot change.
surface (a mask that repaints the face of one wall without moving it: a mural, or furnishings painted onto a wall face):
        "check": {"kind": "surface", "o": "v"|"h", "at": wall coordinate}; the mask is the region's mask file, not its box
  S1  every mask pixel is on the target wall line (2 px inside its outline). With "fringe_px": N in the check (an approved,
      documented exception) pixels up to N px past the line are allowed if they are on that wall's outline or on empty background;
  S2  the mask holds no pixel of any other wall;
  S3  the mask holds no painted wall cap (neutral near-white pixels within 16 px of the wall's outline), so its edges cannot change.
Every region also gets O4, and "locked" entries in the manifest (painted exhibits that overlap a wall) count as locked
regions: the whole box, or with "silhouette" the exhibit's painted silhouette grown 3 px (masklib.py). A targeted re-edit of a locked region sets "within": that region's key; it may overlap that
region only, and (O5) must stay inside its box. --sheet writes the master with the mask (red), the opening (green) and other walls (blue)."""
import json, os, re, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from masklib import painted_caps, locked_mask
REACH = 28
root = Path(__file__).resolve().parents[2]; pkg = Path(os.environ.get("CUTAWAY_PKG", root / "docs/spikes/cutaway-l1-correction")); out = root / "spikes/cutaway/out"
def arch(spec, name):
    js = """const {baseSVG}=require('./spikes/cutaway/base.js'),{chromium}=require('playwright');(async()=>{const b=await chromium.launch(),pg=await b.newPage({viewport:{width:1600,height:1400}});
const svg=baseSVG(+process.argv[3],'C',false,JSON.parse(process.argv[1])).replace(/width="400" height="(\\d+)"/,(m,h)=>`width="1600" height="${h*4}"`);
await pg.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);await pg.locator('svg').screenshot({path:process.argv[2]});await b.close()})()"""
    subprocess.check_call(["node", "-e", js, json.dumps(spec), str(out / name.replace("L1", f"L{LEVEL}")), str(LEVEL)], cwd=root)
    return np.asarray(Image.open(out / name.replace("L1", f"L{LEVEL}")).convert("L")) > 0  # any coverage counts, antialiased edges included
args = sys.argv[1:]; sheet = None
if "--sheet" in args: i = args.index("--sheet"); sheet = args[i + 1]; del args[i:i + 2]
man = json.loads((pkg / "manifest.json").read_text()); nn = args[0].zfill(2); LEVEL = man.get("level", 1)
name = next(k for k in man["regions"] if k.startswith(nn + "-")); reg = man["regions"][name]
box = [int(v) for v in args[1:5]] or reg["box_px"]; x0, y0, x1, y1 = box; chk = reg.get("check", {"kind": "interior"})
H, W = man["size"][1], man["size"][0]; M = np.zeros((H, W), bool); M[y0:y1 + 1, x0:x1 + 1] = True  # boxes are inclusive, as PIL draws them
if chk["kind"] == "surface" or chk.get("internal_wall") or chk.get("mask_file"): M = np.asarray(Image.open(pkg / reg["mask"]).convert("L")) > 0
# the painting the mask is judged against: the master the region was composited from, or the latest if it has not been yet
done = [h for h in man.get("history", []) if h["region"] == name]
src = pkg / done[-1]["from"] if done else max(pkg.glob("master-L*-v*.png"), key=lambda q: int(re.search(r"v(\d+)", q.stem).group(1)))
painting = np.asarray(Image.open(src).convert("RGB")).astype(int)
res = {"region": name, "box_px": box, "kind": chk["kind"], "rules": {}}
locked = np.zeros((H, W), bool)
for h in man.get("history", []):
    if h["region"] not in (name, chk.get("within")) and man["regions"][h["region"]].get("check", {}).get("within") != name: b = man["regions"][h["region"]]["box_px"]; locked[b[1]:b[3] + 1, b[0]:b[2] + 1] = True
locked |= locked_mask(man, painting)
for f in man.get("locked_files", []): locked |= np.asarray(Image.open(pkg / f).convert("L")) > 0   # scripted layers no editor may repaint
if chk["kind"] == "interior":
    A = arch(True, "C-L1-arch.png"); other = A
    F = np.zeros_like(A)
    if chk.get("internal_wall"):  # a false wall painted on a boundary inside one space: its silhouette may be repainted, whatever is behind it
        from masklib import wall_silhouette; F = wall_silhouette(man["projection"], chk["internal_wall"], A.shape, chk.get("silhouette_grow_px", 4)); res["architecture_pixels_behind_the_false_wall"] = int((A & M & F).sum())
        res["rules"]["I2 mask pixels outside the box and the false wall"] = int((M & ~F & ~np.pad(np.ones((y1 - y0 + 1, x1 - x0 + 1), bool), ((y0, H - y1 - 1), (x0, W - x1 - 1)))).sum())
    res["rules"]["I1 no architecture inside"] = int((A & M & ~F).sum())
    def clear(side):
        n = 0
        while n < 200:
            n += 1
            b = {"left": (y0, y1, x0 - n, x0 - n), "right": (y0, y1, x1 + n, x1 + n), "top": (y0 - n, y0 - n, x0, x1), "bottom": (y1 + n, y1 + n, x0, x1)}[side]
            if b[2] < 0 or b[3] >= W or b[0] < 0 or b[1] >= H or A[b[0]:b[1] + 1, b[2]:b[3] + 1].any(): return n - 1
        return n
    c = {s: clear(s) for s in ("left", "top", "right", "bottom")} if not (A & M).any() else None
    if c: res["clear_px"] = c; res["largest_clear_box"] = [x0 - c["left"], y0 - c["top"], x1 + c["right"], y1 + c["bottom"]]
elif chk["kind"] == "surface":
    line = {"o": chk["o"], "at": chk["at"]}; other = arch({**line, "invert": True}, "C-L1-arch-other.png"); T = arch(line, "C-L1-arch-line.png"); F = np.zeros_like(T)
    inner = np.asarray(Image.fromarray((T * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) > 0
    off = M & ~inner; res["rules"]["S2 other wall pixels inside"] = int((M & other).sum())
    if chk.get("fringe_px"):  # approved exception: pixels past the wall line are allowed only on the wall line's own outline or on empty background, close to the wall
        n = int(chk["fringe_px"]) + 3; nearT = np.asarray(Image.fromarray((T * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * n + 1))) > 0
        res["exception_pixels_past_wall_line"] = int(off.sum()); res["exception_pixels_on_empty_background"] = int((off & ~T).sum()); off = off & ~(nearT & ~other)
    res["rules"]["S1 pixels off the target wall face"] = int(off.sum())
    res["rules"]["S3 painted wall-cap pixels inside"] = int((M & painted_caps(painting, T)).sum()); res["mask_pixels"] = int(M.sum())
else:
    line = {"o": chk["o"], "at": chk["at"]}
    other = arch({**line, "invert": True}, "C-L1-arch-other.png")
    gaps = arch(line, "C-L1-arch-line.png") & ~arch({**line, "cut": True}, "C-L1-arch-line-cut.png")  # every opening on that wall line
    p = man["projection"]; px, py = chk["opening"][0] * 4, (p["off"] + p["k"] * chk["opening"][1]) * 4
    gy, gx = np.nonzero(gaps); assert len(gx), "the engine cuts no opening on that wall line: check 'o' and 'at'"
    i = int(np.argmin((gx - px) ** 2 + (gy - py) ** 2)); assert (gx[i] - px) ** 2 + (gy[i] - py) ** 2 < 40 ** 2, "no engine opening near 'opening'"
    F = np.zeros_like(gaps); todo = [(int(gy[i]), int(gx[i]))]  # the one gap at that point: flood fill from its nearest pixel
    while todo:
        y, x = todo.pop()
        if 0 <= y < H and 0 <= x < W and gaps[y, x] and not F[y, x]: F[y, x] = True; todo += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    ys, xs = np.nonzero(F); fb = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]; res["engine_opening_px"] = fb
    res["rules"]["O1 no other wall inside"] = int((other & M).sum())
    res["rules"]["O2 opening pixels left outside"] = int((F & ~M).sum())
    res["rules"][f"O3 reach beyond the opening over {REACH}px"] = max(0, fb[0] - x0 - REACH, fb[1] - y0 - REACH, x1 - fb[2] - REACH, y1 - fb[3] - REACH)
    res["tightest_allowed_box"] = fb; res["widest_allowed_box"] = [max(0, fb[0] - REACH), max(0, fb[1] - REACH), min(W - 1, fb[2] + REACH), min(H - 1, fb[3] + REACH)]
res["rules"]["O4 no overlap with locked regions"] = int((locked & M).sum())
if chk.get("within"):
    b = man["regions"][chk["within"]]["box_px"]; inside = np.zeros((H, W), bool); inside[b[1]:b[3] + 1, b[0]:b[2] + 1] = True
    res["rules"]["O5 stays inside " + chk["within"]] = int((M & ~inside).sum())
res["result"] = "PASS" if not any(res["rules"].values()) else "FAIL"
if sheet:
    mp = max(pkg.glob("master-L*-v*.png"), key=lambda q: int(re.search(r"v(\d+)", q.stem).group(1))); a = np.asarray(Image.open(mp).convert("RGB")).astype(np.float32)
    for m, col, w in ((other, (40, 90, 255), .45), (F, (0, 255, 120), .6)): a[m] = a[m] * (1 - w) + np.array(col) * w
    edge = M & ~(np.roll(M, 2, 0) & np.roll(M, -2, 0) & np.roll(M, 2, 1) & np.roll(M, -2, 1)); a[edge] = (255, 40, 40)
    c = (max(0, x0 - 110), max(0, y0 - 110), min(W, x1 + 110), min(H, y1 + 110)); im = Image.fromarray(a.astype(np.uint8)).crop(c)
    im.resize((im.width * 3, im.height * 3), Image.LANCZOS).save(sheet)
print(json.dumps(res, indent=1)); sys.exit(0 if res["result"] == "PASS" else 1)
