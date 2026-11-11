"""Same-space connectivity check on a painting: has a room been divided by painted architecture?
Usage: python3 spikes/cutaway/connectivity.py LEVEL <painting.png>
For every engine space made of several rectangles, takes each boundary two of its rectangles share and looks in the painting
where a wall standing on that boundary would show its white cap (variant C: up by the partition height, right by the shear).
A boundary fails if a near-white neutral cap runs along more than 30% of it. (Heuristic: it finds partition-height walls with
white caps, which is how every wall in this art is drawn. Only north-south boundaries exist in the engine today.)
Exit code 1 if any boundary fails. The blockout itself is tested without a painting by test-geometry.js."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
root = Path(__file__).resolve().parents[2]; level = int(sys.argv[1]); a = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(int)
G = json.loads(subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('./spikes/cutaway/base.js').geom('C')))"], cwd=root))
S = json.loads(subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('./src/engine.js').SPACES))"], cwd=root))
k, off, hI, sh, s = G["k"], G["off"], G["hI"], G["sh"], 4; Y = lambda y: (off + k * y) * s
white = (a.min(axis=2) > 212) & (a.max(axis=2) - a.min(axis=2) < 30); res = []; bad = False  # caps are near 240; pale floors stay under 212
for id, sp in S.items():
    if sp["l"] != level: continue
    for i, r in enumerate(sp["r"]):
        for q in sp["r"][i + 1:]:
            for at in (r[0], r[0] + r[2]):
                if not any(abs(e - at) < 0.01 for e in (q[0], q[0] + q[2])): continue
                y0, y1 = max(r[1], q[1]), min(r[1] + r[3], q[1] + q[3])
                if y1 - y0 <= 0.5: continue
                cx = at * s + sh * hI * s; ya, yb = int(Y(y0) - hI * s + 10), int(Y(y1) - hI * s - 10)  # where the cap would run, clear of the walls at each end
                rows = white[ya:yb, int(cx - 10):int(cx + 11)].sum(axis=1) >= 4; frac = float(rows.mean()); fail = frac > 0.3; bad |= fail
                res.append({"space": sp["n"], "boundary": f"x = {at}, y = {y0} to {y1}", "cap_along_boundary": round(frac, 2), "result": "DIVIDED" if fail else "open"})
print(json.dumps(res, indent=1)); sys.exit(1 if bad else 0)
