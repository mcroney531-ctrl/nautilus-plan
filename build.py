"""Build both single-file targets (no external requests at runtime):
   V1: src/ui.html  -> dist/nautilus_access.html + index.html (GitHub Pages serves index.html from main)
   V2: src/v2/      -> dist/v2.html + v2.html (separate until the deliberate cutover)
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

def build(template, targets, parts):
    out = read(template)
    for token, src in parts.items():
        out = out.replace(token, read(src))
    out = re.sub(r"__ART:([\w./-]+)__", art, out)
    (root / "dist").mkdir(exist_ok=True)
    for target in targets:
        (root / target).write_text(out, encoding="utf-8", newline="\n")
    print("built", " + ".join(targets), len(out), "chars")

shared = {"/*__ENGINE__*/": "src/engine.js", "/*__SCENARIOS__*/": "src/scenarios.js", "/*__FLOW__*/": "src/flow.js"}
build("src/ui.html", ("dist/nautilus_access.html", "index.html"), shared)
build("src/v2/shell.html", ("dist/v2.html", "v2.html"), {"/*__V2CSS__*/": "src/v2/styles.css", **shared, "/*__V2MAP__*/": "src/v2/map.js", "/*__V2APP__*/": "src/v2/app.js"})
