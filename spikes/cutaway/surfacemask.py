"""Mask for a "surface" region: the face of one engine wall line, for repainting what is painted on it (a mural, wall-mounted
or wall-painted furnishings) without moving the wall.
Usage: python3 spikes/cutaway/surfacemask.py NN
Reads region NN's "check" ({"kind": "surface", "o", "at", optional "xrange": [x0, x1] for one part of a long wall}) from the manifest and writes its mask file and box_px (the mask's
bounding box). Mask = the target wall line, 2 px inside its outline, minus every other wall (grown 3 px), minus painted wall
caps (neutral near-white pixels in the master, grown 2 px), minus the manifest's locked boxes. Check it with maskcheck.py."""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from masklib import grow, painted_caps, locked_mask
root = Path(__file__).resolve().parents[2]; pkg = root / "docs/spikes/cutaway-l1-correction"; out = root / "spikes/cutaway/out"
man = json.loads((pkg / "manifest.json").read_text()); nn = sys.argv[1].zfill(2); name = next(k for k in man["regions"] if k.startswith(nn + "-")); reg = man["regions"][name]; c = reg["check"]
def arch(spec, f):
    js = """const {baseSVG}=require('./spikes/cutaway/base.js'),{chromium}=require('playwright');(async()=>{const b=await chromium.launch(),pg=await b.newPage({viewport:{width:1600,height:1400}});
const svg=baseSVG(1,'C',false,JSON.parse(process.argv[1])).replace(/width="400" height="(\\d+)"/,(m,h)=>`width="1600" height="${h*4}"`);
await pg.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);await pg.locator('svg').screenshot({path:process.argv[2]});await b.close()})()"""
    subprocess.check_call(["node", "-e", js, json.dumps(spec), str(out / f)], cwd=root); return Image.open(out / f).convert("L").point(lambda v: 255 if v else 0)
line = {"o": c["o"], "at": c["at"]}; T = np.asarray(arch(line, "C-L1-arch-line.png").filter(ImageFilter.MinFilter(5))) > 0
O = np.asarray(arch({**line, "invert": True}, "C-L1-arch-other.png").filter(ImageFilter.MaxFilter(7))) > 0
mp = max(pkg.glob("master-L1-v*.png"), key=lambda q: int(re.search(r"v(\d+)", q.stem).group(1))); a = np.asarray(Image.open(mp).convert("RGB")).astype(int)
Traw = np.asarray(Image.open(out / "C-L1-arch-line.png").convert("L")) > 0; caps = grow(painted_caps(a, Traw), 2)
M = T & ~O & ~caps
# approved exception (check["fringe_px"]): where the painted wall is a few px wider than the engine's, the mural's colour runs past
# the wall line. Those pixels are added if they are mural-coloured, within fringe_px of the mask, on no other wall and not a cap.
mural = (a[..., 2] - a[..., 0] > 22) & (a[..., 1] - a[..., 0] > 10)
if c.get("fringe_px"):
    add = mural & grow(M, int(c["fringe_px"])) & ~O & ~caps & ~M; M |= add; print("fringe pixels added:", int(add.sum()))
# locked exhibits: never their silhouette; and inside a locked box only dark mural pixels are editable at all
lock = locked_mask(man, a); boxes = np.zeros_like(M)
for l in man.get("locked", []): b = l["box_px"]; boxes[b[1]:b[3] + 1, b[0]:b[2] + 1] = True
M &= ~lock; M &= ~boxes | (mural & (a[..., 1] < 125) & (a[..., 0] < 60))
ys, xs = np.nonzero(M); reg["box_px"] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]; reg.setdefault("mask", f"mask-{name}.png"); reg.setdefault("crop", f"crop-{name}.png")
m = Image.fromarray((M * 255).astype(np.uint8)); m.save(pkg / reg["mask"]); cv = Image.new("L", tuple(man["canvas_3x2"]["size"]), 0); cv.paste(m, (0, 0)); cv.save(pkg / f"canvas-3x2-mask-{name}.png")
(pkg / "manifest.json").write_text(json.dumps(man, indent=1)); print(name, "box", reg["box_px"], "mask pixels", int(M.sum()))
