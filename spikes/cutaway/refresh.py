"""Refresh the correction package's editor inputs from the latest master, after a pass is promoted.
Usage: python3 spikes/cutaway/refresh.py
Writes canvas-3x2-L1-v<N>.png, reference-regions-v<N>.jpg (pending regions only) and re-cuts crop-NN-*.png for every
region not yet in the manifest history. Masks, boxes and the manifest's regions are engine-derived and never change here."""
import json, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
pkg = Path(__file__).resolve().parents[2] / "docs/spikes/cutaway-l1-correction"
man = json.loads((pkg / "manifest.json").read_text())
mp = max(pkg.glob("master-L1-v*.png"), key=lambda p: int(re.search(r"v(\d+)", p.stem).group(1))); v = re.search(r"v(\d+)", mp.stem).group(1)
master = Image.open(mp).convert("RGB"); W, H = master.size
done = {h["region"] for h in man.get("history", [])}; pending = {k: r for k, r in man["regions"].items() if k not in done}
font = lambda n: ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", n)
ref = master.copy(); rd = ImageDraw.Draw(ref, "RGBA")
for name, r in pending.items():
    b = r["box_px"]; o = (max(0, b[0] - 90), max(0, b[1] - 90))
    crop = master.crop((o[0], o[1], min(W, b[2] + 90), min(H, b[3] + 90)))
    ImageDraw.Draw(crop).rectangle([b[0] - o[0], b[1] - o[1], b[2] - o[0], b[3] - o[1]], outline=(255, 210, 0), width=3); crop.save(pkg / r["crop"])
    col = (255, 200, 0, 80) if name[:2] <= "04" else (255, 60, 60, 110)
    rd.rectangle(b, fill=col, outline=col[:3] + (255,), width=4); rd.text((b[0] + 6, b[1] + 4), name[:2], fill=(255, 255, 255, 255), font=font(28), stroke_width=4, stroke_fill=(0, 0, 0, 255))
LH = 46 * len(pending) + 60; leg = Image.new("RGB", (W, LH), (12, 22, 30)); ld = ImageDraw.Draw(leg)
ld.text((20, 12), "Amber: repaint the room interior to its real function.  Red: fix an opening.  Everything outside a box stays as is.", fill=(220, 230, 240), font=font(18))
for i, (name, r) in enumerate(pending.items()):
    ld.text((20, 52 + i * 46), f"{name[:2]}  {r['room']}", fill=(255, 220, 120) if name[:2] <= "04" else (255, 140, 140), font=font(19))
sheet = Image.new("RGB", (W, H + LH)); sheet.paste(ref, (0, 0)); sheet.paste(leg, (0, H)); sheet.save(pkg / f"reference-regions-v{v}.jpg", quality=88)
cs = man["canvas_3x2"]["size"]; canvas = Image.new("RGB", tuple(cs), (10, 24, 34)); canvas.paste(master, (0, 0)); canvas.save(pkg / f"canvas-3x2-L1-v{v}.png")
print(f"refreshed from {mp.name}: canvas-3x2-L1-v{v}.png, reference-regions-v{v}.jpg, crops for", ", ".join(k[:2] for k in pending))
