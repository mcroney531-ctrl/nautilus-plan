"""Cutaway L1 correction handoff: per-region masks from the engine geometry (variant C), the registered master, a labelled
reference, and a 3:2 working canvas for editors that only return 3:2 images. Output: docs/spikes/cutaway-l1-correction/.
Usage: python3 spikes/cutaway/handoff.py <registered master png> [--edit NN ...]
--edit NN also writes edit-NN-*.png (master with that region transparent: the alpha-mask format some edit APIs take).
Those are 2.5 MB each and gitignored; generate the one you need."""
import json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[2]; out = root / "docs/spikes/cutaway-l1-correction"; out.mkdir(parents=True, exist_ok=True)
G = json.loads(subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('./spikes/cutaway/base.js').geom('C')))"], cwd=root))
E = json.loads(subprocess.check_output(["node", "-e", "const E=require('./src/engine.js');console.log(JSON.stringify(E.SPACES))"], cwd=root))
args = sys.argv[1:]; EDIT = {args[i + 1] for i, a in enumerate(args) if a == "--edit"}
master = Image.open(args[0]).convert("RGB"); W, H = master.size; assert (W, H) == (1600, 1004), (W, H)
s, k, off, hI, sh, t = W / 400, G["k"], G["off"], G["hI"], G["sh"], 2.2
X = lambda x: x * s; Y = lambda y: (off + k * y) * s
master.save(out / "master-L1-v1.png")

def room_box(key):
    """Visible interior of a room: inside its walls. Left inset clears the west wall and its right-leaning side face; bottom
    inset clears the room's own south partition face (hI tall) and cap; top clears the north wall cap."""
    x, y, w, h = E[key]["r"][0]
    return [X(x) + t * s + sh * hI * s + 4, Y(y) + t * k * s + 4, X(x + w) - t * s - 4, Y(y + h) - hI * s - t * k * s - 4]
REGIONS = {  # name: (box or polygon in master px, engine room/door, what it must show)
    "01-living-shore": (room_box("touch"), "Living Shore (engine: touch, public gallery)", "Shallow touch pool: low open pool, rocks, sand, coastal habitat, a rail at visitor height. Public, warm and inviting."),
    "02-jelly-room": (room_box("jelly"), "Jelly Room (engine: jelly, public gallery)", "Jellyfish gallery: dark room, glowing cylindrical or round tanks with jellies, soft blue and violet light. Public."),
    "03-seasonal": (room_box("seasonal"), "Seasonal (engine: seasonal, public gallery)", "Flexible temporary exhibit gallery: display cases or plinths, blank panels (no text), track lighting. Public."),
    "04-atrium": (room_box("atrium"), "Atrium (engine: atrium, public; open to L2 above)", "Open central gathering space, visibly open to Level 2 above (light from above, the void edge), seating; no storage, no pipes."),
    "05-dock-door": ([X(388) - 18, Y(232) - 0.6 * G["hE"] * s - 8, W, Y(268) + 8], "Loading dock door D-DOCK (east exterior wall of Receiving, plan 388,250)", "A dock door opening in the east exterior wall, centred at the marked point; the engine's dock reader is here."),
    "06-receiving-north-wall": ([X(316) + 30, Y(196) - hI * s - 8, X(388) - 30, Y(196) + 96], "Receiving north wall (engine passage to East service hall at plan 368,196 stays)", "Remove the roll-up door: plain wall with the existing passage. Receiving's dock door belongs on the east wall (region 05)."),
    "07-reef-to-jelly": ([X(289) - 10, Y(80) - hI * s - 30, X(289) + 26, Y(80) + 34], "Passage Reef Tunnel to Jelly Room (plan 289,80)", "A clear open passage through the wall at the marked point (about 15 units wide), no door leaf."),
    "08-reef-to-seasonal": ([X(289) - 10, Y(157) - hI * s - 30, X(289) + 26, Y(157) + 34], "Passage Reef Tunnel to Seasonal (plan 289,157)", "A clear open passage through the wall at the marked point (about 15 units wide), no door leaf."),
}
font = lambda n: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", n)
ref = master.copy(); rd = ImageDraw.Draw(ref, "RGBA")
manifest = {"master": "master-L1-v1.png", "size": [W, H], "projection": {"variant": "C", **G}, "regions": {}}
for name, (box, room, brief) in REGIONS.items():
    box = [round(v) for v in box]
    m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).rectangle(box, fill=255); m.save(out / f"mask-{name}.png")
    if name[:2] in EDIT:
        edit = master.copy().convert("RGBA"); edit.putalpha(Image.eval(m, lambda v: 0 if v else 255)); edit.save(out / f"edit-{name}.png")  # transparent = editable
    crop = master.crop((max(0, box[0] - 90), max(0, box[1] - 90), min(W, box[2] + 90), min(H, box[3] + 90))); cd = ImageDraw.Draw(crop)
    cd.rectangle([box[0] - max(0, box[0] - 90), box[1] - max(0, box[1] - 90), box[2] - max(0, box[0] - 90), box[3] - max(0, box[1] - 90)], outline=(255, 210, 0), width=3); crop.save(out / f"crop-{name}.png")
    col = (255, 200, 0, 80) if name[:2] <= "04" else (255, 60, 60, 110)
    rd.rectangle(box, fill=col, outline=col[:3] + (255,), width=4); rd.text((box[0] + 6, box[1] + 4), name[:2], fill=(255, 255, 255, 255), font=font(28), stroke_width=4, stroke_fill=(0, 0, 0, 255))
    manifest["regions"][name] = {"box_px": box, "room": room, "brief": brief, "mask": f"mask-{name}.png", "crop": f"crop-{name}.png"}
# legend strip under the reference: one row per region, amber = room interior (repaint function), red = opening fix
LH = 46 * len(REGIONS) + 60; leg = Image.new("RGB", (W, LH), (12, 22, 30)); ld = ImageDraw.Draw(leg)
ld.text((20, 12), "Amber: repaint the room interior to its real function.  Red: fix an opening.  Everything outside a box stays as is.", fill=(220, 230, 240), font=font(18))
for i, (name, (_, room, _b)) in enumerate(REGIONS.items()):
    ld.text((20, 52 + i * 46), f"{name[:2]}  {room}", fill=(255, 220, 120) if name[:2] <= "04" else (255, 140, 140), font=font(19))
sheet = Image.new("RGB", (W, H + LH)); sheet.paste(ref, (0, 0)); sheet.paste(leg, (0, H)); sheet.save(out / "reference-regions.jpg", quality=88)
# 3:2 working canvas (1600 x 1067): master at the top, dark padding below; returned 3:2 images scale back uniformly
CW, CH = 1600, 1067; canvas = Image.new("RGB", (CW, CH), (10, 24, 34)); canvas.paste(master, (0, 0)); canvas.save(out / "canvas-3x2-L1-v1.png")
for name in REGIONS:
    m = Image.open(out / f"mask-{name}.png"); c = Image.new("L", (CW, CH), 0); c.paste(m, (0, 0)); c.save(out / f"canvas-3x2-mask-{name}.png")
manifest["canvas_3x2"] = {"file": "canvas-3x2-L1-v1.png", "size": [CW, CH], "master_at": [0, 0], "note": "Returned 3:2 images (for example 1536 x 1024) are scaled uniformly to 1600 x 1067; the top 1004 rows are the master."}
(out / "manifest.json").write_text(json.dumps(manifest, indent=1)); print("handoff written:", len(REGIONS), "regions")
