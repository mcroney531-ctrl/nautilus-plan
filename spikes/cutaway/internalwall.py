"""Mask for removing a false wall painted on a boundary inside one engine space.
Usage: python3 spikes/cutaway/internalwall.py NN
Reads region NN: box_px (floor around the wall, clear of all real architecture) and check["internal_wall"] ({"at", "a", "b"}).
Mask = the box, plus the false wall's own silhouette (masklib.wall_silhouette) where it stands above the box. Check with maskcheck.py."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from masklib import wall_silhouette
pkg = Path(__file__).resolve().parents[2] / "docs/spikes/cutaway-l1-correction"; man = json.loads((pkg / "manifest.json").read_text()); nn = sys.argv[1].zfill(2)
name = next(k for k in man["regions"] if k.startswith(nn + "-")); reg = man["regions"][name]; W, H = man["size"]; b = reg["box_px"]
M = np.zeros((H, W), bool); M[b[1]:b[3] + 1, b[0]:b[2] + 1] = True; M |= wall_silhouette(man["projection"], reg["check"]["internal_wall"], (H, W))
m = Image.fromarray((M * 255).astype(np.uint8)); m.save(pkg / reg["mask"]); cv = Image.new("L", tuple(man["canvas_3x2"]["size"]), 0); cv.paste(m, (0, 0)); cv.save(pkg / f"canvas-3x2-mask-{name}.png")
print(name, "mask pixels", int(M.sum()))
