"""Level 2 void treatment, by script (no image generation): the three voids read as openings onto the level below, not rooms.
Usage: python3 spikes/cutaway/l2voids.py [--preview DIR]
Inside each engine void (the same pixels l2base.py filled, and no others): the L1 master's own pixels, darker and cooler than
before (36% brightness, partly desaturated, blue-shifted), a deep inner shadow falling from the edge, a dark rim and a light
handrail with posts. The void's boundary, the L1 imagery's position, every wall and all interaction geometry are unchanged.
Asserts that no pixel outside the void pixels changed. Writes the next L2 master and a history entry."""
import json, re, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
root = Path(__file__).resolve().parents[2]; pkg = root / "docs/spikes/cutaway-l2"; l1 = root / "docs/spikes/cutaway-l1-correction"; a_ = sys.argv[1:]; prev = Path(a_[a_.index("--preview") + 1]) if "--preview" in a_ else None
plan = json.loads((pkg / "plan.json").read_text()); p = plan["projection"]; W, H = plan["size"]; s = 4; X = lambda x: x * s; Y = lambda y: (p["off"] + p["k"] * y) * s
latest = lambda d, pat: max(d.glob(pat), key=lambda q: int(re.search(r"v(\d+)", q.stem).group(1)))
mp = latest(pkg, "master-L2-v*.png"); base = np.asarray(Image.open(mp).convert("RGB")).astype(np.float32); A = np.asarray(Image.open(latest(l1, "master-L1-v*.png")).convert("RGB")).astype(np.float32)
B = np.asarray(Image.open(pkg / "blockout-L2.png").convert("RGB")).astype(np.float32); out = base.copy(); allv = np.zeros((H, W), bool)
voidcol = (np.abs(B - np.array([15, 29, 38])).max(axis=2) < 14) | (np.abs(B - np.array([42, 60, 71])).max(axis=2) < 14)   # exactly as l2base.py found them
mn = lambda m, n: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * n + 1))) > 0
for v in plan["voids"]:
    x, y, w, h = v["r"]; m = np.zeros((H, W), bool); m[int(Y(y)):int(Y(y + h)) + 1, int(X(x)):int(X(x + w)) + 1] = True; m &= voidcol
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))) > 0; allv |= m
    g = A.mean(axis=2, keepdims=True); below = (A * 0.6 + g * 0.4) * 0.36 * np.array([0.82, 0.95, 1.12]) + np.array([2, 8, 16])   # the level below: darker, cooler, less saturated
    depth = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)), np.float32) / 255; shade = np.clip((depth - 0.5) * 2, 0, 1) ** 0.7   # 0 at the edge, 1 well inside
    below *= (0.35 + 0.65 * shade)[..., None]; out[m] = below[m]
    rim = m & ~mn(m, 5); out[rim] = (22, 27, 32)
    r1 = mn(m, 5) & ~mn(m, 7); out[r1] = (214, 221, 225)                                                              # handrail
    yy, xx = np.mgrid[0:H, 0:W]; posts = mn(m, 7) & ~mn(m, 10) & ((xx % 22 < 2) | (yy % 22 < 2)); out[posts] = (150, 158, 164)   # posts under the rail
res = np.clip(out + 0.5, 0, 255).astype(np.uint8); b8 = base.astype(np.uint8); ch = np.abs(res.astype(int) - b8).max(axis=2) > 0
assert not (ch & ~allv).any(), "pixels outside the voids changed"
rep = {"region": "voids", "method": "scripted void treatment (no image generation)", "void_pixels": int(allv.sum()), "pixels_changed": int(ch.sum()), "outside_voids_unchanged": True, "from": mp.name}
if prev: prev.mkdir(parents=True, exist_ok=True); Image.fromarray(res).save(prev / "l2-voids.png"); print(json.dumps(rep)); sys.exit(0)
nv = int(re.search(r"v(\d+)", mp.stem).group(1)) + 1; Image.fromarray(res).save(pkg / f"master-L2-v{nv}.png"); rep["to"] = f"master-L2-v{nv}.png"
man = json.loads((pkg / "manifest.json").read_text()); man.setdefault("history", []).append(rep); (pkg / "manifest.json").write_text(json.dumps(man, indent=1)); print(json.dumps(rep, indent=1))
