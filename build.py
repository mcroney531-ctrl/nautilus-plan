"""Inline engine.js + scenarios.js + assets/ artwork into src/ui.html -> dist/nautilus_access.html and index.html (single self-contained file)."""
import base64, re
from pathlib import Path
root = Path(__file__).parent
read = lambda p: (root / p).read_text(encoding="utf-8")
out = read("src/ui.html").replace("/*__ENGINE__*/", read("src/engine.js")).replace("/*__SCENARIOS__*/", read("src/scenarios.js"))
# __ART:name__ -> data URI of assets/name (record artwork stays inside the single file)
out = re.sub(r"__ART:([\w.-]+)__", lambda m: "data:image/webp;base64," + base64.b64encode((root / "assets" / m.group(1)).read_bytes()).decode(), out)
(root / "dist").mkdir(exist_ok=True)
for target in ("dist/nautilus_access.html", "index.html"):  # root copy so GitHub Pages serves the app from main
    (root / target).write_text(out, encoding="utf-8", newline="\n")
print("built dist/nautilus_access.html + index.html", len(out), "chars")
