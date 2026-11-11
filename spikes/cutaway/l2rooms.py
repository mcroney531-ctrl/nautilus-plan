"""Level 2, engine-walls approach: the engine owns walls, openings and connectivity; the editor's painting supplies room interiors.
Usage: python3 spikes/cutaway/l2rooms.py [--preview DIR] [--rooms id,id,...]
Source: docs/spikes/cutaway-l2/source-shell-return-2.png (a whole-level return whose walls failed shellreg.py; its rooms are good).
1. Wall finish (script): the blockout's wall faces are toned to L1's wall material with grain; a few practical wall lights are
   added on faces no room covers. Caps, openings and every wall position stay the blockout's.
2. Room masks, from the engine: every visible floor pixel of the room's rectangles (one continuous mask for a multi-rectangle
   space), plus the face of the room's own back (north) wall below its cap, so things standing against it are not cut.
   Never a cap, never another wall, never a door or passage gap, never a scripted (locked) pixel.
3. Room fit: for each room, the painted room's four walls are located from its wall caps and the room is resampled so they land
   on the engine's (independent x and y scale, refused beyond 20%). The room is then composited through its mask, 3 px feather.
Asserts that no pixel outside the room masks and the wall-finish pixels changed, and that no cap or locked pixel changed.
With --preview nothing in the package is written."""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
sys.path.insert(0, str(Path(__file__).parent)); import shellreg as R
root = Path(__file__).resolve().parents[2]; pkg = root / "docs/spikes/cutaway-l2"; W, H = 1600, 1004; a_ = sys.argv[1:]
prev = Path(a_[a_.index("--preview") + 1]) if "--preview" in a_ else None
ROOMS = (a_[a_.index("--rooms") + 1].split(",") if "--rooms" in a_ else ["quarantine", "food", "dive", "life", "eastMezz"])
plan = json.loads((pkg / "plan.json").read_text()); p = plan["projection"]; s = 4; k, off, hI, hE, sh = p["k"], p["off"], p["hI"], p["hE"], p["sh"]; X = lambda x: x * s; Y = lambda y: (off + k * y) * s
def arch(spec, name):
    js = """const {baseSVG}=require('./spikes/cutaway/base.js'),{chromium}=require('playwright');(async()=>{const b=await chromium.launch(),pg=await b.newPage({viewport:{width:1600,height:1400}});
const svg=baseSVG(2,'C',false,JSON.parse(process.argv[1])).replace(/width="400" height="(\\d+)"/,(m,h)=>`width="1600" height="${h*4}"`);
await pg.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);await pg.locator('svg').screenshot({path:process.argv[2]});await b.close()})()"""
    f = root / "spikes/cutaway/out" / name; subprocess.check_call(["node", "-e", js, json.dumps(spec), str(f)], cwd=root); return np.asarray(Image.open(f).convert("L")) > 0
grow = lambda m, n: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * n + 1))) > 0
B = np.asarray(Image.open(pkg / "blockout-L2.png").convert("RGB")).astype(np.float32); base = np.asarray(Image.open(pkg / "master-L2-v1.png").convert("RGB")).astype(np.float32)
lock = (np.asarray(Image.open(pkg / "lock-L2.png").convert("L")) > 0) | (np.asarray(Image.open(pkg / "scripted-catwalk-L2.png").convert("L")) > 0)
Acut = arch({"cut": True}, "C-L2-arch-cut.png"); Afull = arch(True, "C-L2-arch.png"); caps = np.abs(B - np.array([238, 243, 245])).max(axis=2) < 8
isfloor = (np.abs(B - np.array([188, 197, 202])).max(axis=2) < 10) | (np.abs(B - np.array([196, 187, 177])).max(axis=2) < 10) | (np.abs(B - np.array([174, 183, 189])).max(axis=2) < 10)
rng = np.random.default_rng(11); yy, xx = np.mgrid[0:H, 0:W]; out = base.copy()
# ---- 1. wall finish ----
faces = Acut & ~grow(caps, 1) & ~lock; lum = (B.mean(axis=2) - 123) / 61.0; grain = rng.normal(0, 2.2, (H, W))
wall = np.stack([np.clip(lum, 0, 1.1) * 58 + 78, np.clip(lum, 0, 1.1) * 56 + 77, np.clip(lum, 0, 1.1) * 54 + 77], axis=2) + grain[..., None]; out[faces] = wall[faces]
unp = isfloor & ~lock; conc = np.full((H, W, 3), (128, 126, 123), np.float32) + grain[..., None]; conc[(xx % 40 == 0) | (yy % 27 == 0)] -= 9; out[unp] = conc[unp]   # floors no room has painted yet: plain sealed tile
lamps = [(X(32) + 60, Y(12)), (X(368) + 60, Y(12)), (X(222), Y(44)), (X(272), Y(44))]   # stair cores and the catwalk room's back wall
glow = np.zeros((H, W), np.float32)
for lx, fy in lamps: glow += np.exp(-(((xx - lx) / 46.0) ** 2 + ((yy - (fy - 8)) / 30.0) ** 2)) * 70
lit = (faces | unp)[..., None] * glow[..., None] * np.array([1.0, 0.82, 0.55]); out += lit
img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
for lx, fy in lamps: d.rectangle([lx - 9, fy - 24, lx + 9, fy - 21], fill=(58, 54, 50)); d.rectangle([lx - 8, fy - 21, lx + 8, fy - 17], fill=(255, 216, 150))
out = np.asarray(img).astype(np.float32); out[caps | lock] = base[caps | lock]; finish = (faces | unp) & ~caps
# ---- 2 and 3. rooms ----
src = R.to_frame(Image.open(pkg / "source-shell-return-2.png")); c0 = (1009, 502); g = (1.005, 1, -2)   # shellreg's global fit for this return
src = src.transform((W, H), Image.AFFINE, (1 / g[0], 0, c0[0] - (c0[0] + g[1]) / g[0], 0, 1 / g[0], c0[1] - (c0[1] + g[2]) / g[0]), Image.BICUBIC); Pc = R.painted_caps(src); S_ = np.asarray(src).astype(np.float32)
def edge_shift(strip, axis):  # how far the painted caps in this strip sit from the engine's, along one axis (+/-48 px)
    e = caps & strip; best = (-1, 0)
    for o in range(-48, 49):
        sc = (np.roll(e, o, axis) & Pc).sum()
        if sc > best[0]: best = (sc, o)
    return best[1] if e.sum() > 60 else 0
report = {}; roommask = np.zeros((H, W), bool)
for rid in ROOMS:
    rects = plan["rooms"][rid]["rects"]; x0 = min(r[0] for r in rects); y0 = min(r[1] for r in rects); x1 = max(r[0] + r[2] for r in rects); y1 = max(r[1] + r[3] for r in rects)
    M = np.zeros((H, W), bool)
    for r in rects:
        fl = np.zeros((H, W), bool); fl[int(Y(r[1])):int(Y(r[1] + r[3])) + 1, int(X(r[0])):int(X(r[0] + r[2])) + 1] = True; M |= fl & isfloor
        bw = np.zeros((H, W), bool); bw[int(Y(r[1]) - hI * s) + 3:int(Y(r[1])) + 2, int(X(r[0])) + 6:int(X(r[0] + r[2])) + int(sh * hI * s)] = True
        if not any(q is not r and abs(q[1] + q[3] - r[1]) < 0.01 for q in rects): M |= bw & Acut & ~caps      # its own back wall's face
    M &= ~grow(caps, 1) & ~lock; M &= ~(Afull & ~Acut)                                                        # never a cap, a locked pixel or an opening span
    M = np.asarray(Image.fromarray((M * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0
    M &= ~grow(caps, 1) & ~lock & ~(Afull & ~Acut)
    al = Image.fromarray((M * 255).astype(np.uint8)); alpha = np.minimum(np.asarray(al.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(1.5)), np.float32), np.asarray(al, np.float32)) / 255
    tall = lambda xe: hE * 0.6 if (xe <= 12 or xe >= 388) else hI; report[rid] = {"pieces": []}
    for r in rects:   # each rectangle of the space is fitted on its own walls; the mask stays one piece
        x0, y0, x1, y1 = r[0], r[1], r[0] + r[2], r[1] + r[3]
        def vstrip(xe): h_ = tall(xe); z = np.zeros((H, W), bool); cx = X(xe) + sh * h_ * s; z[int(Y(y0) - h_ * s) + 20:int(Y(y1) - h_ * s) - 20, int(cx) - 14:int(cx) + 15] = True; return z
        def hstrip(ye): h_ = 2 if ye >= 288 else hI; z = np.zeros((H, W), bool); cy = Y(ye) - h_ * s; z[int(cy) - 12:int(cy) + 10, int(X(x0)) + 40:int(X(x1)) - 20] = True; return z
        inner = lambda o, at: any(q is not r and any(abs(e - at) < 0.01 for e in ((q[0], q[0] + q[2]) if o == "v" else (q[1], q[1] + q[3]))) for q in rects)   # an edge shared inside the space has no wall to measure
        oL = 0 if inner("v", x0) else edge_shift(vstrip(x0), 1); oR = 0 if inner("v", x1) else edge_shift(vstrip(x1), 1); oT = 0 if inner("h", y0) else edge_shift(hstrip(y0), 0); oB = 0 if inner("h", y1) else edge_shift(hstrip(y1), 0)
        ex0, ex1, ey0, ey1 = X(x0), X(x1), Y(y0), Y(y1); px0, px1, py0, py1 = ex0 + oL, ex1 + oR, ey0 + oT, ey1 + oB; sx, sy = (px1 - px0) / (ex1 - ex0), (py1 - py0) / (ey1 - ey0)
        piece = {"rect": r, "painted_walls_off_by_px": {"left": oL, "right": oR, "top": oT, "bottom": oB}, "x_scale": round(sx, 3), "y_scale": round(sy, 3)}; report[rid]["pieces"].append(piece)
        if abs(sx - 1) > 0.2 or abs(sy - 1) > 0.2: piece["result"] = "REFUSED"; continue
        F = np.asarray(src.transform((W, H), Image.AFFINE, (sx, 0, px0 - sx * ex0, 0, sy, py0 - sy * ey0), Image.BICUBIC)).astype(np.float32)
        part = np.zeros((H, W), np.float32); part[int(Y(y0) - hI * s):int(Y(y1)) + 2, int(X(x0)):int(X(x1)) + (int(sh * hI * s) + 2 if not inner("v", x1) else 0)] = 1
        if len(rects) > 1 and inner("v", x0) is False and inner("v", x1): part[:, int(X(x1)):] = 0
        a2 = (alpha * part)[..., None]; out = out * (1 - a2) + F * a2
    roommask |= M; report[rid] |= {"mask_px": int(M.sum()), "opening_span_px_in_mask": int((M & Afull & ~Acut).sum()), "cap_px": int((M & caps).sum()), "locked_px": int((M & lock).sum())}
res = np.clip(out + 0.5, 0, 255).astype(np.uint8); b8 = base.astype(np.uint8); ch = np.abs(res.astype(int) - b8).max(axis=2) > 0
assert not (ch & ~(roommask | finish)).any(), "pixels outside the room masks and the wall finish changed"; assert not (ch & (caps | lock)).any(), "a cap or a scripted pixel changed"
print(json.dumps(report, indent=1)); dest = prev or pkg; dest.mkdir(parents=True, exist_ok=True)
if prev: Image.fromarray(res).save(prev / "l2-stage1.png"); Image.fromarray((roommask * 255).astype(np.uint8)).save(prev / "l2-stage1-roommask.png")
else: sys.exit("promotion is not enabled yet: run with --preview")
