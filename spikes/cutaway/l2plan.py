"""Level 2 production planning (no art): a geometry-accurate reference sheet and an initial mask plan, from the engine.
Usage: python3 spikes/cutaway/l2plan.py
Writes docs/spikes/cutaway-l2/: blockout-L2.png (variant C, 1600 x 1004, the base to paint over), reference-L2.jpg (rooms,
kinds, doors, passages, voids and planned masks, labelled), plan.json (every room, opening and planned mask with its check)."""
import json, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[2]; out = root / "docs/spikes/cutaway-l2"; out.mkdir(parents=True, exist_ok=True); tmp = root / "spikes/cutaway/out"
node = lambda js: json.loads(subprocess.check_output(["node", "-e", js], cwd=root))
G = node("console.log(JSON.stringify(require('./spikes/cutaway/base.js').geom('C')))")
E = node("const E=require('./src/engine.js');console.log(JSON.stringify({S:E.SPACES,D:Object.fromEntries(Object.entries(E.DOORS).map(([d,o])=>[d,{...o,level:E.doorLevel(d)}])),L:E.LINKS,V:E.VOIDS,G:E.GROUPS}))")
def render(arch, name):
    js = """const {baseSVG}=require('./spikes/cutaway/base.js'),{chromium}=require('playwright');(async()=>{const b=await chromium.launch(),pg=await b.newPage({viewport:{width:1600,height:1400}});
const svg=baseSVG(2,'C',false,JSON.parse(process.argv[1])).replace(/width="400" height="(\\d+)"/,(m,h)=>`width="1600" height="${h*4}"`);
await pg.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);await pg.locator('svg').screenshot({path:process.argv[2]});await b.close()})()"""
    subprocess.check_call(["node", "-e", js, json.dumps(arch), str(name)], cwd=root); return Image.open(name).convert("RGB")
block = render(False, out / "blockout-L2.png"); A = np.asarray(render(True, tmp / "C-L2-arch.png").convert("L")) > 0; W, H = block.size
s, k, off, hI, sh, t = 4, G["k"], G["off"], G["hI"], G["sh"], 2.2; X = lambda x: x * s; Y = lambda y: (off + k * y) * s
def box(r):  # the L1 room inset: clear of the west wall's leaning face, the north cap and the room's own south partition
    x, y, w, h = r; hW = G["hE"] * 0.6 if x <= 12 else hI  # a room against the west exterior wall sits beside a taller leaning face
    return [round(v) for v in (X(x) + t * s + sh * hW * s + 4, Y(y) + t * k * s + 4, X(x + w) - t * s - 4, Y(y + h) - hI * s - t * k * s - 4)]
rooms = {id: o for id, o in E["S"].items() if o["l"] == 2}; doors = {d: o for d, o in E["D"].items() if o["level"] == 2}
links = [l for l in E["L"] if l[2] and E["S"][l[0]]["l"] == 2 and E["S"][l[1]]["l"] == 2]
grants = {d: [g["n"] for g in E["G"].values() if d in g["doors"]] for d in doors}
plan = {"size": [W, H], "projection": {"variant": "C", **G}, "rooms": {}, "doors": {}, "passages": [], "voids": E["V"], "masks": {}}
n = 0
for id, o in rooms.items():
    plan["rooms"][id] = {"name": o["n"], "kind": o["kind"], "rects": o["r"]}
    for i, r in enumerate(o["r"]):
        n += 1; b = box(r); key = f"{n:02d}-{id}" + (f"-{chr(97 + i)}" if len(o["r"]) > 1 else "")
        if o["kind"] == "core": plan["masks"][key] = {"room": id, "rect": r, "box_px": None, "kind": "none", "note": "stair core: 26 px of visible floor under the tall back wall; painted with the shell, no mask"}; continue
        if b[3] - b[1] < 24 or b[2] - b[0] < 24: plan["masks"][key] = {"room": id, "rect": r, "box_px": None, "kind": "none", "note": "too thin for an interior mask once the wall insets are taken; stays as blockout floor"}; continue
        hit = int(A[b[1]:b[3] + 1, b[0]:b[2] + 1].sum())
        plan["masks"][key] = {"room": id, "rect": r, "box_px": b, "size_px": [b[2] - b[0] + 1, b[3] - b[1] + 1], "kind": "interior", "I1_architecture_pixels_inside": hit}
for d, o in doors.items(): plan["doors"][d] = {"name": o["n"], "from": o["from"], "into": o["into"], "plan": o["p"], "px": [round(X(o["p"][0])), round(Y(o["p"][1]))], "groups": grants[d]}
for a, b_, p, *_ in links: plan["passages"].append({"between": [a, b_], "plan": p, "px": [round(X(p[0])), round(Y(p[1]))]})
(out / "plan.json").write_text(json.dumps(plan, indent=1))
# reference sheet
KC = {"staff": (90, 200, 255), "restricted": (255, 110, 90), "core": (190, 190, 200), "public": (120, 230, 150)}
font = lambda z: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", z)
ref = block.copy().convert("RGBA"); ov = Image.new("RGBA", ref.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
for key, m in plan["masks"].items():
    if not m["box_px"]: continue
    c = KC[rooms[m["room"]]["kind"]]; b = m["box_px"]; d.rectangle(b, fill=c + (70,), outline=c + (255,), width=3)
    d.text((b[0] + 6, b[1] + 4), key[:2], fill=(255, 255, 255, 255), font=font(24), stroke_width=4, stroke_fill=(0, 0, 0, 255))
for id, o in rooms.items():
    r = max(o["r"], key=lambda r: r[2] * r[3]); d.text((X(r[0] + r[2] / 2), Y(r[1] + r[3] / 2)), o["n"], fill=(255, 255, 255, 255), font=font(20), anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0, 255))
for v in E["V"]:
    r = v["r"]; d.rectangle([X(r[0]), Y(r[1]), X(r[0] + r[2]), Y(r[1] + r[3])], outline=(255, 220, 0, 255), width=3); d.text((X(r[0] + r[2] / 2), Y(r[1] + r[3] / 2)), "VOID: " + v["n"], fill=(255, 220, 0, 255), font=font(18), anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0, 255))
for dd, o in plan["doors"].items():
    x, y = o["px"]; d.ellipse([x - 11, y - 11, x + 11, y + 11], fill=(255, 0, 255, 255), outline=(255, 255, 255, 255), width=3); d.text((x + 15, y - 26), dd, fill=(255, 160, 255, 255), font=font(17), stroke_width=4, stroke_fill=(0, 0, 0, 255))
for p in plan["passages"]:
    x, y = p["px"]; d.rectangle([x - 30, y - 6, x + 30, y + 6], outline=(0, 255, 200, 255), width=3); d.text((x + 36, y - 10), "open passage", fill=(0, 255, 200, 255), font=font(16), stroke_width=4, stroke_fill=(0, 0, 0, 255))
ref = Image.alpha_composite(ref, ov).convert("RGB"); rows = [f"{k_[:2]}  {plan['rooms'][m['room']]['name']} ({plan['rooms'][m['room']]['kind']})  {(str(m['size_px'][0]) + ' x ' + str(m['size_px'][1]) + ' px') if m['box_px'] else 'no mask'}" for k_, m in plan["masks"].items()]
LH = 30 * ((len(rows) + 1) // 2) + 70; leg = Image.new("RGB", (W, LH), (12, 22, 30)); ld = ImageDraw.Draw(leg)
ld.text((20, 10), "Level 2, engine geometry (variant C). Boxes: planned interior masks. Magenta: badge doors. Teal: open passage. Yellow: voids (open to L1).", fill=(220, 230, 240), font=font(17))
ld.text((20, 34), "Blue = staff, red = restricted, grey = core.", fill=(220, 230, 240), font=font(17))
for i, r in enumerate(rows): ld.text((20 + (i % 2) * 800, 66 + (i // 2) * 30), r, fill=(230, 235, 240), font=font(17))
sheet = Image.new("RGB", (W, H + LH)); sheet.paste(ref, (0, 0)); sheet.paste(leg, (0, H)); sheet.save(out / "reference-L2.jpg", quality=88)
for k_, m in plan["masks"].items(): print(k_, m["box_px"], m.get("size_px"), "I1:", m.get("I1_architecture_pixels_inside"))
