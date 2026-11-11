"""Level 2 shell base (scripted, no image generation): the engine blockout with the two layers that must agree with Level 1.
Usage: python3 spikes/cutaway/l2base.py   (run l2plan.py first)
  - Reef tank top: inside the engine's Reef Tunnel ellipse, the L1 master's own pixels (the blue field and the manta), treated
    as lit water seen from above, with a steel rim and rail. The same ellipse, the same manta, in the same place.
  - Voids: inside each engine void, the L1 master's own pixels, dimmed, behind a rim and rail. Only where the blockout shows
    void: L2 walls that stand in front stay.
Writes to docs/spikes/cutaway-l2/: master-L2-v0.png, lock-L2.png (white = scripted pixels no editor mask may hold),
mask-NN-*.png per planned region (its box, less locked pixels) and manifest.json (level 2) for composite.py and maskcheck.py."""
import json, re
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
root = Path(__file__).resolve().parents[2]; out = root / "docs/spikes/cutaway-l2"; l1 = root / "docs/spikes/cutaway-l1-correction"
plan = json.loads((out / "plan.json").read_text()); p = plan["projection"]; W, H = plan["size"]; s = 4; X = lambda x: x * s; Y = lambda y: (p["off"] + p["k"] * y) * s
src = max(l1.glob("master-L1-v*.png"), key=lambda q: int(re.search(r"v(\d+)", q.stem).group(1))); A = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
B = np.asarray(Image.open(out / "blockout-L2.png").convert("RGB")).astype(np.float32); res = B.copy(); lock = np.zeros((H, W), bool); yy, xx = np.mgrid[0:H, 0:W]; rng = np.random.default_rng(5)
# voids
voidcol = (np.abs(B - np.array([15, 29, 38])).max(axis=2) < 14) | (np.abs(B - np.array([42, 60, 71])).max(axis=2) < 14)
for v in plan["voids"]:
    x, y, w, h = v["r"]; m = np.zeros((H, W), bool); m[int(Y(y)):int(Y(y + h)) + 1, int(X(x)):int(X(x + w)) + 1] = True; m &= voidcol
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))) > 0
    below = A * 0.52 + np.array([4, 10, 16]); res[m] = below[m]; lock |= m                      # the level below, in shadow
    inner = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))) > 0; rim = m & ~inner; res[rim] = (40, 47, 53)
    rail = inner & ~(np.asarray(Image.fromarray((inner * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) > 0); res[rail] = (196, 204, 209)
# reef tank top
sp = json.loads(__import__("subprocess").check_output(["node", "-e", "console.log(JSON.stringify(require('./src/engine.js').SPACES.reef.ellipse))"], cwd=root)); cx, cy, ex, ey = X(sp[0]), Y(sp[1]), sp[2] * s, sp[3] * p["k"] * s
floor = np.abs(B - np.array([188, 197, 202])).max(axis=2) < 10   # the catwalk room's floor in the blockout: walls in front of the ellipse stay
r = np.where(floor, np.hypot((xx - cx) / ex, (yy - cy) / ey), 9.0); water = r <= 0.955; blue = (A[..., 2] - A[..., 0] > 12) & (A[..., 0] < 120)   # L1's blue field and manta; not its walls or lights
med = np.median(A[water & blue], axis=0); wsrc = np.where(blue[..., None], A, med[None, None, :])
wsrc = np.asarray(Image.fromarray(wsrc.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32)
t = wsrc * np.array([0.55, 1.05, 1.2]) + np.array([0, 28, 40]); rip = np.sin(yy / 5.0 + np.sin(xx / 37.0) * 3) * 9 + np.sin(yy / 11.0 + xx / 53.0) * 7
t += rip[..., None] * np.array([0.6, 1, 1]); t += (np.clip(1.0 - r, 0, 1) ** 2 * 36)[..., None]; res[water] = t[water]
res[(r > 0.955) & (r <= 1.0)] = (34, 40, 45); res[(r > 1.0) & (r <= 1.022)] = (200, 208, 212); lock |= r <= 1.03
res = Image.fromarray(np.clip(res, 0, 255).astype(np.uint8)); res.save(out / "master-L2-v0.png"); Image.fromarray((lock * 255).astype(np.uint8)).save(out / "lock-L2.png")
# package manifest for the L1 tools
BR = {"quarantine": "Quarantine: isolation tanks in rows on stands with their own filters and lids, floor drain, stainless bench, cool clinical light.",
      "life": "Life support: pumps, sand filters, a protein skimmer column, a chiller, a pipe manifold with valves, control cabinets with blank faces.",
      "topside": "Tank-top catwalks: steel grating walkways with rails around the open reef tank top, feeding stations, a hoist, maintenance gear. The round water and its rim are fixed and not to be painted.",
      "dive": "Dive locker: wetsuit rack, cylinder rack, a rinse tank, a bench.", "food": "Food prep: stainless counters, sinks, chopping stations, buckets.",
      "admin": "Ops offices: desks, monitors with blank screens, shelving.", "westMezz": "West mezzanine: sealed floor, carts or lockers against walls, clear paths.", "eastMezz": "East mezzanine: sealed floor, a trolley of dive gear, clear paths."}
man = {"level": 2, "master": "master-L2-v0.png", "size": [W, H], "projection": p, "locked_files": ["lock-L2.png"], "regions": {},
       "canvas_3x2": {"file": "canvas-3x2-L2-v0.png", "size": [1600, 1067], "master_at": [0, 0]}}
for key, m in plan["masks"].items():
    if not m["box_px"]: continue
    b = m["box_px"]; M = np.zeros((H, W), bool); M[b[1]:b[3] + 1, b[0]:b[2] + 1] = True; cut = M & np.asarray(Image.fromarray((lock * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
    M &= ~cut; Image.fromarray((M * 255).astype(np.uint8)).save(out / f"mask-{key}.png"); cv = Image.new("L", (1600, 1067), 0); cv.paste(Image.fromarray((M * 255).astype(np.uint8)), (0, 0)); cv.save(out / f"canvas-3x2-mask-{key}.png")
    man["regions"][key] = {"box_px": b, "room": plan["rooms"][m["room"]]["name"] + f" (engine: {m['room']}, {plan['rooms'][m['room']]['kind']})", "brief": BR[m["room"]], "mask": f"mask-{key}.png", "crop": f"crop-{key}.png",
                           "check": {"kind": "interior", **({"mask_file": True} if cut.any() else {})}}
old = json.loads((out / "manifest.json").read_text()) if (out / "manifest.json").exists() else {}
if "history" in old: man["history"] = old["history"]
(out / "manifest.json").write_text(json.dumps(man, indent=1)); print("L2 shell base from", src.name, "| locked px", int(lock.sum()), "| regions", len(man["regions"]))
