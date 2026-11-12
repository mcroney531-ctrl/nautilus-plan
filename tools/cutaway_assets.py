"""Cutaway map assets for V2: derived from the two locked masters, never edited by hand.
Usage: python3 tools/cutaway_assets.py            derive assets/v2/cutaway/L1.webp, L2.webp and assets.json
       python3 tools/cutaway_assets.py --check    verify, write nothing (exit 1 on any failure)
       python3 tools/cutaway_assets.py --check --structure   also run the structure and connectivity checks on both masters
                                                              (needs Node and Playwright; see spikes/cutaway/shellreg.py)
Reproducible: the masters are read, never written; the encoder and its settings are fixed below; Pillow and libwebp versions are
recorded in assets.json. With the same versions (requirements-cutaway.txt) the derived files are byte-identical, and --check
proves it by deriving them again. With other versions --check cannot compare bytes, says so, and instead decodes the stored
assets and requires them to match the masters closely (mean absolute error under 4 levels).
The geometry hash covers everything the art was drawn to: the engine's spaces, doors, links and voids and the variant C
projection. If the engine's geometry changes, the hash changes, the test fails, and the art has to be re-checked before the
hash is updated here."""
import hashlib, json, subprocess, sys
from pathlib import Path
import numpy as np
import PIL
from PIL import Image, features
root = Path(__file__).resolve().parents[1]; out = root / "assets/v2/cutaway"
MASTERS = {"L1": "docs/spikes/cutaway-l1-correction/master-L1-v11.png", "L2": "docs/spikes/cutaway-l2/master-L2-v4.png"}
SIZE = (1600, 1004); ENC = {"format": "WEBP", "quality": 82, "method": 6}
sha = lambda b: hashlib.sha256(b).hexdigest()
def geometry():
    js = """const E=require('./src/engine.js'),{geom}=require('./spikes/cutaway/base.js');const g=geom('C');
const S=Object.fromEntries(Object.entries(E.SPACES).map(([k,s])=>[k,{l:s.l,r:s.r,kind:s.kind,ellipse:s.ellipse||null}]));
const D=Object.fromEntries(Object.entries(E.DOORS).map(([k,d])=>[k,{from:d.from,into:d.into,p:d.p}]));
console.log(JSON.stringify({projection:{variant:'C',k:g.k,off:g.off,W:g.W,H:g.H,hI:g.hI,hE:g.hE,hF:g.hF,sh:g.sh},spaces:S,doors:D,links:E.LINKS,voids:E.VOIDS.map(v=>v.r)}))"""
    g = json.loads(subprocess.check_output(["node", "-e", js], cwd=root)); canon = json.dumps(g, sort_keys=True, separators=(",", ":")); return g["projection"], sha(canon.encode())
def derive(level):
    im = Image.open(root / MASTERS[level]).convert("RGB"); assert im.size == SIZE, (level, im.size)
    import io; b = io.BytesIO(); im.save(b, **ENC); return b.getvalue()
tools = {"pillow": PIL.__version__, "libwebp": features.version("webp")}; check = "--check" in sys.argv; fails = []
proj, ghash = geometry()
if not check:
    rec = {"note": "Derived by tools/cutaway_assets.py. Do not edit by hand.", "tools": tools, "encoder": ENC, "size": list(SIZE), "projection": proj, "geometry_sha256": ghash, "levels": {}}
    for lv, m in MASTERS.items():
        data = derive(lv); (out / f"{lv}.webp").write_bytes(data); rec["levels"][lv] = {"master": m, "master_sha256": sha((root / m).read_bytes()), "asset": f"assets/v2/cutaway/{lv}.webp", "asset_sha256": sha(data), "bytes": len(data)}
    (out / "assets.json").write_text(json.dumps(rec, indent=1) + "\n"); print(json.dumps({k: (v["bytes"], v["asset_sha256"][:12]) for k, v in rec["levels"].items()}), "geometry", ghash[:12]); sys.exit(0)
rec = json.loads((out / "assets.json").read_text()); same_tools = rec["tools"] == tools
if rec["geometry_sha256"] != ghash: fails.append("geometry hash: the engine's geometry or the projection changed since the art was approved")
for lv, r in rec["levels"].items():
    if sha((root / r["master"]).read_bytes()) != r["master_sha256"]: fails.append(f"{lv}: the master file changed")
    stored = (root / r["asset"]).read_bytes()
    if sha(stored) != r["asset_sha256"]: fails.append(f"{lv}: the stored asset does not match assets.json")
    if same_tools:
        if sha(derive(lv)) != r["asset_sha256"]: fails.append(f"{lv}: deriving the asset again gives different bytes")
    else:
        import io; a = np.asarray(Image.open(io.BytesIO(stored)).convert("RGB")).astype(int); m = np.asarray(Image.open(root / r["master"]).convert("RGB")).astype(int)
        if a.shape != m.shape or np.abs(a - m).mean() > 4: fails.append(f"{lv}: the stored asset does not match its master")
print("tools:", tools, "| same as recorded:", same_tools, "(byte-for-byte re-derivation checked)" if same_tools else "(bytes not comparable; decoded assets compared with the masters)")
if "--structure" in sys.argv:
    for lv, r in rec["levels"].items():
        n = lv[1]
        a = subprocess.run([sys.executable, str(root / "spikes/cutaway/shellreg.py"), n, str(root / r["master"])], capture_output=True, text=True)
        if a.returncode: fails.append(f"{lv}: structure check (shellreg.py) did not pass")
        c = subprocess.run([sys.executable, str(root / "spikes/cutaway/connectivity.py"), n, str(root / r["master"])], capture_output=True, text=True)
        if c.returncode: fails.append(f"{lv}: connectivity check found a divided room")
        print(lv, "structure:", "PASS" if not a.returncode else "FAIL", "| connectivity:", "PASS" if not c.returncode else "FAIL")
print("FAILED:\n  " + "\n  ".join(fails) if fails else "cutaway assets: all checks pass"); sys.exit(1 if fails else 0)
