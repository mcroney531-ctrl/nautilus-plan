"""Level 2 tank-top catwalks, by script (no image generation): steel grating on every visible floor pixel of the engine
space "topside" outside the locked water, and one railed bridge across the Reef tank.
Usage: python3 spikes/cutaway/l2catwalk.py [--preview DIR]
The bridge is placed from the engine, not by eye. It joins the room's two real ways in: the catwalk strip, which meets the
main room on the boundary x = 198, y = 112..132 (the way from D-TOPW and D-FOOD), and the east margin beside the water, which
leads to D-TOPE at (297, 157). The script checks that before drawing and stops if it does not hold.
The bridge is the one approved exception to the water lock: bridge-exception-L2.png records exactly which locked pixels it
and its shadow change. Everything else in lock-L2.png is asserted unchanged. Writes the next L2 master and a history entry."""
import json, math, re, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
root = Path(__file__).resolve().parents[2]; pkg = root / "docs/spikes/cutaway-l2"; args = sys.argv[1:]; prev = Path(args[args.index("--preview") + 1]) if "--preview" in args else None
man = json.loads((pkg / "manifest.json").read_text()); plan = json.loads((pkg / "plan.json").read_text()); p = man["projection"]; W, H = man["size"]; s = 4; k, off, sh = p["k"], p["off"], p["sh"]
X = lambda x: x * s; Y = lambda y: (off + k * y) * s
E = json.loads(__import__("subprocess").check_output(["node", "-e", "const E=require('./src/engine.js');console.log(JSON.stringify({t:E.SPACES.topside.r,e:E.SPACES.reef.ellipse,d:E.DOORS}))"], cwd=root))
strip, main = E["t"]; ecx, ecy, erx, ery = E["e"]
# ---- bridge geometry from the engine, with the connectivity conditions ----
BY0, BY1 = 113.5, 118.5                                  # deck, plan y: inside the strip's mouth, north of the manta's body
half = lambda y: erx * math.sqrt(1 - ((y - ecy) / ery) ** 2); yc = (BY0 + BY1) / 2
xw, xe = main[0], ecx + half(yc) + 1.5                   # from the strip boundary to just past the water's east edge
chk = {}
chk["west end on the boundary the strip shares with the main room"] = strip[0] + strip[2] == main[0] == xw and strip[1] <= BY0 and BY1 <= strip[1] + strip[3]
chk["east end on floor of the same space, outside the water"] = main[0] <= xe <= main[0] + main[2] and xe - ecx > half(yc)
dT = E["d"]["D-TOPE"]["p"]; ys = np.arange(min(yc, dT[1]), max(yc, dT[1]) + 0.1, 1.0); margin = min(main[0] + main[2] - (ecx + half(y)) for y in ys)
chk[f"east margin between the bridge and D-TOPE is walkable (narrowest {margin:.1f} units, need 6)"] = margin >= 6
chk["no badge door lies on the bridge or within 10 units of either end"] = all(math.hypot(d["p"][0] - x, d["p"][1] - yc) > 10 for d in E["d"].values() for x in (xw, xe))
chk["both ends are in one engine space (no door is bypassed)"] = True   # strip and main room are the two rectangles of 'topside'
print(json.dumps(chk, indent=1)); assert all(chk.values()), "the bridge does not connect to real catwalk: not drawn"
# ---- drawing ----
mp = max(pkg.glob("master-L2-v*.png"), key=lambda q: int(re.search(r"v(\d+)", q.stem).group(1))); ver = int(re.search(r"v(\d+)", mp.stem).group(1))
master = Image.open(mp).convert("RGB"); a = np.asarray(master).astype(np.float32); B = np.asarray(Image.open(pkg / "blockout-L2.png").convert("RGB")).astype(np.float32)
lock = np.asarray(Image.open(pkg / "lock-L2.png").convert("L")) > 0; yy, xx = np.mgrid[0:H, 0:W]
floor = np.abs(B - np.array([188, 197, 202])).max(axis=2) < 10; inrect = np.zeros((H, W), bool)
for r in (strip, main): inrect[int(Y(r[1])):int(Y(r[1] + r[3])) + 1, int(X(r[0])):int(X(r[0] + r[2])) + 1] = True
G = floor & inrect & ~lock                                # every visible floor pixel of the catwalk space outside the water
r_ = np.hypot((xx - X(ecx)) / (erx * s), (yy - Y(ecy)) / (ery * k * s))
g = np.full((H, W, 3), (62, 70, 76), np.float32); g[xx % 8 == 0] = (80, 90, 97); g[yy % 6 == 0] = (47, 54, 59); g += (np.clip(1.6 - r_, 0, 1) * 24)[..., None] * np.array([0.5, 0.9, 1.0])
out = a.copy(); out[G] = g[G]
x0, x1, y0, y1 = X(xw), X(xe), Y(BY0), Y(BY1); SS = 3; layer = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(layer); S_ = lambda *v: [c * SS for c in v]
rh = 3.2 * s; rdx = sh * rh                               # rail height on screen: up rh, right rdx (variant C)
steel, light = (62, 70, 76), (206, 213, 217)
for x in np.arange(x0 + 26, x1 - 10, 58): d.line(S_(x, y1, x, y1 + 11), fill=(28, 34, 39, 230), width=2 * SS); d.line(S_(x + 5, y0 + 3, x + 5, y0 + 9), fill=(28, 34, 39, 120), width=SS)   # support legs into the water
d.rectangle(S_(x0, y0, x1, y1), fill=steel + (178,))                                         # open grating deck: the water shows through
for x in np.arange(x0, x1, 6): d.line(S_(x, y0, x, y1), fill=(92, 102, 109, 235), width=1 * SS // 2 + 1)
for y in (y0 + 4.5, y0 + 9): d.line(S_(x0, y, x1, y), fill=(44, 51, 56, 220), width=SS // 2 + 1)
d.line(S_(x0, y1, x1, y1), fill=(30, 36, 41, 255), width=2 * SS); d.line(S_(x0, y0, x1, y0), fill=(40, 47, 52, 255), width=SS)   # deck edges
for ye in (y0, y1):                                                                           # safety rails: posts and one top rail on each side
    for x in np.arange(x0 + 4, x1 - 2, 29): d.line(S_(x, ye, x + rdx, ye - rh), fill=light + (210,), width=SS // 2 + 1)
    d.line(S_(x0 + 4 + rdx, ye - rh, x1 - 4 + rdx, ye - rh), fill=light + (235,), width=SS // 2 + 1)
layer = layer.resize((W, H), Image.LANCZOS); la = np.asarray(layer).astype(np.float32); alpha = la[..., 3:] / 255
shadow = Image.new("L", (W, H), 0); ImageDraw.Draw(shadow).rectangle([x0 + 5, y1 + 3, x1 + 5, y1 + 3 + (y1 - y0) * 0.9], fill=255)
shd = np.asarray(shadow.filter(ImageFilter.GaussianBlur(3)), np.float32)[..., None] / 255 * 0.34 * (r_ <= 0.955)[..., None]   # on the water only
out = out * (1 - shd) + np.array([4, 26, 44]) * shd; out = out * (1 - alpha) + la[..., :3] * alpha
out = np.clip(out + 0.5, 0, 255).astype(np.uint8); m0 = np.asarray(master)
changed = np.abs(out.astype(int) - m0).max(axis=2) > 0; exc = changed & lock                # the documented exception to the water lock
allowed = G | (alpha[..., 0] > 0) | (shd[..., 0] > 0); assert not (changed & ~allowed).any(), "pixels outside the catwalk floor and the bridge changed"
band = np.zeros((H, W), bool); band[int(y0 - rh - 3):int(y1 + 3 + (y1 - y0) * 0.9 + 12), int(x0 - 2):int(x1 + rdx + 8)] = True; assert not (exc & ~band).any(), "locked pixels changed outside the bridge band"
report = {"region": "05-topside-b", "method": "scripted catwalks and bridge (no image generation)", "grating_pixels": int(G.sum()), "bridge_plan": {"y": [BY0, BY1], "x": [xw, round(xe, 1)]},
          "locked_pixels_changed_by_the_bridge": int(exc.sum()), "locked_pixels_total": int(lock.sum()), "locked_pixels_unchanged_elsewhere": True, "connectivity": chk, "from": mp.name}
res = Image.fromarray(out)
if prev: prev.mkdir(parents=True, exist_ok=True); res.save(prev / "catwalk-preview.png"); print(json.dumps({k_: v for k_, v in report.items() if k_ != "connectivity"})); sys.exit(0)
nv = ver + 1; res.save(pkg / f"master-L2-v{nv}.png"); Image.fromarray((exc * 255).astype(np.uint8)).save(pkg / "bridge-exception-L2.png"); Image.fromarray(((G | exc | (alpha[..., 0] > 0)) * 255).astype(np.uint8)).save(pkg / "scripted-catwalk-L2.png")
report["to"] = f"master-L2-v{nv}.png"; man.setdefault("history", []).append(report); (pkg / "manifest.json").write_text(json.dumps(man, indent=1)); print(json.dumps({k_: v for k_, v in report.items() if k_ != "connectivity"}, indent=1))
