"""Check a correction mask against the engine geometry (variant C, L1) before it is used.
Usage: python3 spikes/cutaway/maskcheck.py NN [x0 y0 x1 y1] [--sheet out.png]
With no box, checks the region's box in the manifest; with a box, checks that proposal instead (the manifest is not written).
The architecture is rendered from base.js (arch mode). Two kinds of region, set by "check" in the manifest:

interior (default; rooms, floors):
  I1  the mask holds no architecture pixel: no wall face, side face or cap, and no wall span of any opening.

opening (a mask that has to repaint part of one wall):  "check": {"kind": "opening", "o": "v"|"h", "at": wall coordinate,
                                                                   "opening": [x, y], "width": plan units}
  O1  the mask holds no pixel of any wall other than the target wall line;
  O2  the mask contains the whole engine opening (the gap the engine cuts in that wall, with the wall's height and shear);
  O3  the mask reaches no further than REACH px beyond that opening on any side;
  O4  the mask does not overlap any region already composited (the manifest history), so approved rooms cannot change.
Every region also gets O4. A targeted re-edit of a locked region sets "within": that region's key; it may overlap that
region only, and (O5) must stay inside its box. --sheet writes the master with the mask (red), the opening (green) and other walls (blue)."""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
REACH = 28
root = Path(__file__).resolve().parents[2]; pkg = root / "docs/spikes/cutaway-l1-correction"; out = root / "spikes/cutaway/out"
def arch(spec, name):
    js = """const {baseSVG}=require('./spikes/cutaway/base.js'),{chromium}=require('playwright');(async()=>{const b=await chromium.launch(),pg=await b.newPage({viewport:{width:1600,height:1400}});
const svg=baseSVG(1,'C',false,JSON.parse(process.argv[1])).replace(/width="400" height="(\\d+)"/,(m,h)=>`width="1600" height="${h*4}"`);
await pg.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);await pg.locator('svg').screenshot({path:process.argv[2]});await b.close()})()"""
    subprocess.check_call(["node", "-e", js, json.dumps(spec), str(out / name)], cwd=root)
    return np.asarray(Image.open(out / name).convert("L")) > 0  # any coverage counts, antialiased edges included
args = sys.argv[1:]; sheet = None
if "--sheet" in args: i = args.index("--sheet"); sheet = args[i + 1]; del args[i:i + 2]
man = json.loads((pkg / "manifest.json").read_text()); nn = args[0].zfill(2)
name = next(k for k in man["regions"] if k.startswith(nn + "-")); reg = man["regions"][name]
box = [int(v) for v in args[1:5]] or reg["box_px"]; x0, y0, x1, y1 = box; chk = reg.get("check", {"kind": "interior"})
H, W = man["size"][1], man["size"][0]; M = np.zeros((H, W), bool); M[y0:y1 + 1, x0:x1 + 1] = True  # boxes are inclusive, as PIL draws them
res = {"region": name, "box_px": box, "kind": chk["kind"], "rules": {}}
locked = np.zeros((H, W), bool)
for h in man.get("history", []):
    if h["region"] not in (name, chk.get("within")): b = man["regions"][h["region"]]["box_px"]; locked[b[1]:b[3] + 1, b[0]:b[2] + 1] = True
if chk["kind"] == "interior":
    A = arch(True, "C-L1-arch.png"); other = A; F = np.zeros_like(A)
    res["rules"]["I1 no architecture inside"] = int((A & M).sum())
    def clear(side):
        n = 0
        while n < 200:
            n += 1
            b = {"left": (y0, y1, x0 - n, x0 - n), "right": (y0, y1, x1 + n, x1 + n), "top": (y0 - n, y0 - n, x0, x1), "bottom": (y1 + n, y1 + n, x0, x1)}[side]
            if b[2] < 0 or b[3] >= W or b[0] < 0 or b[1] >= H or A[b[0]:b[1] + 1, b[2]:b[3] + 1].any(): return n - 1
        return n
    c = {s: clear(s) for s in ("left", "top", "right", "bottom")} if not (A & M).any() else None
    if c: res["clear_px"] = c; res["largest_clear_box"] = [x0 - c["left"], y0 - c["top"], x1 + c["right"], y1 + c["bottom"]]
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
    mp = max(pkg.glob("master-L1-v*.png"), key=lambda q: int(re.search(r"v(\d+)", q.stem).group(1))); a = np.asarray(Image.open(mp).convert("RGB")).astype(np.float32)
    for m, col, w in ((other, (40, 90, 255), .45), (F, (0, 255, 120), .6)): a[m] = a[m] * (1 - w) + np.array(col) * w
    edge = M & ~(np.roll(M, 2, 0) & np.roll(M, -2, 0) & np.roll(M, 2, 1) & np.roll(M, -2, 1)); a[edge] = (255, 40, 40)
    c = (max(0, x0 - 110), max(0, y0 - 110), min(W, x1 + 110), min(H, y1 + 110)); im = Image.fromarray(a.astype(np.uint8)).crop(c)
    im.resize((im.width * 3, im.height * 3), Image.LANCZOS).save(sheet)
print(json.dumps(res, indent=1)); sys.exit(0 if res["result"] == "PASS" else 1)
