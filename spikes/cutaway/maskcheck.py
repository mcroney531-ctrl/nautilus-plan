"""Check a correction mask against the engine geometry (variant C, L1) before it is used.
Usage: python3 spikes/cutaway/maskcheck.py NN [x0 y0 x1 y1]
With no box, checks the region's box in the manifest; with a box, checks that proposal instead (nothing is written).
Protected pixels are rendered from base.js with arch = true: every wall face, side face and cap, with no openings cut, so
door openings and open passages count as protected too. PASS = the box holds no protected pixel. Also prints the clearance
to the nearest protected pixel on each side, and the largest box that stays clear when grown from this one."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
root = Path(__file__).resolve().parents[2]; pkg = root / "docs/spikes/cutaway-l1-correction"; png = root / "spikes/cutaway/out/C-L1-arch.png"
js = """const {baseSVG}=require('./spikes/cutaway/base.js'),{chromium}=require('playwright');(async()=>{const b=await chromium.launch(),pg=await b.newPage({viewport:{width:1600,height:1400}});
const svg=baseSVG(1,'C',false,true).replace(/width="400" height="(\\d+)"/,(m,h)=>`width="1600" height="${h*4}"`);
await pg.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);await pg.locator('svg').screenshot({path:process.argv[1]});await b.close()})()"""
subprocess.check_call(["node", "-e", js, str(png)], cwd=root)
A = np.asarray(Image.open(png).convert("L")) > 0  # any coverage counts, antialiased edges included
man = json.loads((pkg / "manifest.json").read_text()); nn = sys.argv[1].zfill(2)
name = next(k for k in man["regions"] if k.startswith(nn + "-")); box = [int(v) for v in sys.argv[2:6]] or man["regions"][name]["box_px"]
x0, y0, x1, y1 = box; hit = int(A[y0:y1 + 1, x0:x1 + 1].sum())  # boxes are inclusive, as PIL draws them
def clear(side):
    n = 0
    while n < 200:
        n += 1
        b = {"left": (y0, y1, x0 - n, x0 - n), "right": (y0, y1, x1 + n, x1 + n), "top": (y0 - n, y0 - n, x0, x1), "bottom": (y1 + n, y1 + n, x0, x1)}[side]
        if A[b[0]:b[1] + 1, b[2]:b[3] + 1].any(): return n - 1
    return n
c = {s: clear(s) for s in ("left", "top", "right", "bottom")}
print(json.dumps({"region": name, "box_px": box, "protected_pixels_inside": hit, "clear_px": c,
                  "largest_clear_box": [x0 - c["left"], y0 - c["top"], x1 + c["right"], y1 + c["bottom"]], "result": "PASS" if hit == 0 else "FAIL"}, indent=1))
sys.exit(0 if hit == 0 else 1)
