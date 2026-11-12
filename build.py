"""Build both single-file targets (no external requests at runtime):
   V1: src/ui.html  -> dist/nautilus_access.html + index.html (GitHub Pages serves index.html from main)
   V2: src/v2/      -> dist/v2.html + v2.html (separate until the deliberate cutover)
       and dist/v2-cutaway-preview.html: the same app with the cutaway map art embedded, for the flagged map frame
Inlines engine.js, scenarios.js, flow.js and, for V2, the stylesheet and app script. __ART:path__ becomes a data URI of
assets/path (subfolders allowed, '..' refused); the MIME type comes from the file extension."""
import base64, re
from pathlib import Path
root = Path(__file__).parent
read = lambda p: (root / p).read_text(encoding="utf-8")
MIME = {".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg"}

def art(m):
    rel = m.group(1)
    if ".." in rel.split("/"):
        raise SystemExit(f"refusing asset path outside assets/: {rel}")
    p = root / "assets" / rel
    return f"data:{MIME[p.suffix]};base64," + base64.b64encode(p.read_bytes()).decode()

def build(template, targets, parts, literal=None):
    out = read(template)
    for token, text in (literal or {}).items():
        out = out.replace(token, text)
    for token, src in parts.items():
        out = out.replace(token, read(src))
    out = re.sub(r"__ART:([\w./-]+)__", art, out)
    (root / "dist").mkdir(exist_ok=True)
    for target in targets:
        (root / target).write_text(out, encoding="utf-8", newline="\n")
    print("built", " + ".join(targets), len(out), "chars")

shared = {"/*__ENGINE__*/": "src/engine.js", "/*__SCENARIOS__*/": "src/scenarios.js", "/*__FLOW__*/": "src/flow.js"}
build("src/ui.html", ("dist/nautilus_access.html", "index.html"), shared)
v2 = {"/*__V2CSS__*/": "src/v2/styles.css", **shared, "/*__V2MAP__*/": "src/v2/map.js", "/*__V2APP__*/": "src/v2/app.js"}
build("src/v2/shell.html", ("dist/v2.html", "v2.html"), v2, {"/*__V2CUTAWAY__*/": ""})   # the default build carries no cutaway art: the flag cannot turn on

def cutaway_data():
    """The cutaway art for the preview build, or None (with the reason printed) if it is missing or stale."""
    import hashlib, json, subprocess
    d = root / "assets/v2/cutaway"
    if not (d / "assets.json").exists(): print("cutaway preview skipped: run tools/cutaway_assets.py"); return None
    rec = json.loads((d / "assets.json").read_text())
    for lv, r in rec["levels"].items():
        if hashlib.sha256((root / r["asset"]).read_bytes()).hexdigest() != r["asset_sha256"]: raise SystemExit(f"cutaway asset {lv} does not match assets.json")
    try: ok = subprocess.run(["node", "test/cutaway.assets.test.js"], cwd=root, capture_output=True).returncode == 0
    except FileNotFoundError: print("cutaway preview skipped: Node is needed to check the geometry hash"); return None
    if not ok: raise SystemExit("cutaway preview refused: geometry or assets changed (node test/cutaway.assets.test.js)")
    uri = lambda lv: "data:image/webp;base64," + base64.b64encode((d / f"{lv}.webp").read_bytes()).decode()
    return "const NX_CUTAWAY=" + json.dumps({"projection": rec["projection"], "geometry": rec["geometry_sha256"], "img": {"1": uri("L1"), "2": uri("L2")}}) + ";"

data = cutaway_data()
if data:  # same app, plus the art; the cutaway still needs ?map=cutaway in the address. Not linked from anywhere, not the cutover target.
    build("src/v2/shell.html", ("dist/v2-cutaway-preview.html",), v2, {"/*__V2CUTAWAY__*/": data})
