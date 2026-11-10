"""One zip per handoff: everything to give the image editor for a region, plus the prompt.
Usage: python3 spikes/cutaway/bundle.py NN
Writes spikes/cutaway/out/handoff-NN-v<N>.zip (not committed). Files are numbered in the order the prompt refers to them.
Zoomed region: the crop to edit, the outlined guide, the full canvas (style reference), the enlarged mask.
Full-frame region: the canvas, the close-up, the reference sheet, the mask.
PROMPT.txt is the newest "Paste-ready prompt for GPT (region NN" section of the correction README."""
import json, re, sys, zipfile
from pathlib import Path
root = Path(__file__).resolve().parents[2]; pkg = root / "docs/spikes/cutaway-l1-correction"
man = json.loads((pkg / "manifest.json").read_text()); nn = sys.argv[1].zfill(2)
name = next(k for k in man["regions"] if k.startswith(nn + "-")); reg = man["regions"][name]
v = max(int(re.search(r"v(\d+)", p.stem).group(1)) for p in pkg.glob("master-L1-v*.png"))
files = ([f"zoom-{name}-v{v}.png", f"zoom-guide-{name}-v{v}.png", f"canvas-3x2-L1-v{v}.png", f"zoom-mask-{name}.png"] if "zoom" in reg
         else [f"canvas-3x2-L1-v{v}.png", reg["crop"], f"reference-regions-v{v}.jpg", reg["mask"]])
secs = re.split(r"^## ", (pkg / "README.md").read_text(), flags=re.M); sec = [s for s in secs if s.startswith(f"Paste-ready prompt for GPT (region {nn}")]
assert sec, f"no prompt section for region {nn} in the README"
prompt = "\n".join(l[2:] for l in sec[-1].splitlines() if l.startswith("> ")); assert prompt
out = root / "spikes/cutaway/out" / f"handoff-{nn}-v{v}.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for i, f in enumerate(files, 1): assert (pkg / f).exists(), f; z.write(pkg / f, f"{i}-{f}")
    z.writestr("PROMPT.txt", prompt + "\n")
print(out.relative_to(root), "|", ", ".join(files), "| prompt", len(prompt), "chars")
