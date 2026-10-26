"""Inline engine.js + scenarios.js into src/ui.html -> dist/nautilus_access.html (single self-contained file)."""
from pathlib import Path
root = Path(__file__).parent
ui = (root / "src/ui.html").read_text()
out = ui.replace("/*__ENGINE__*/", (root / "src/engine.js").read_text()).replace("/*__SCENARIOS__*/", (root / "src/scenarios.js").read_text())
(root / "dist").mkdir(exist_ok=True)
(root / "dist/nautilus_access.html").write_text(out)
print("built dist/nautilus_access.html", len(out), "bytes")
