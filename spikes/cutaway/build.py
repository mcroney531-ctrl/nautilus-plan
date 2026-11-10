"""Cutaway spike: assemble docs/spikes/cutaway-poc.html (self-contained) from the engine, the spike overlay and the
rendered base images in spikes/cutaway/out (run `node spikes/cutaway/render.js` first). Not part of the V1/V2 builds."""
import base64, json, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[2]; here = Path(__file__).parent
read = lambda p: (root / p).read_text(encoding="utf-8")
geom = json.loads(subprocess.check_output(["node", "-e", "const {geom}=require('./spikes/cutaway/base.js');console.log(JSON.stringify({A:geom('A'),B:geom('B'),C:geom('C')}))"], cwd=root))
img = {p.stem: "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode() for p in sorted((here / "out").glob("*.webp"))}
html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Cutaway map spike</title>
<style>
body{{margin:0;font:14px/1.45 system-ui,sans-serif;background:#eef3f8;color:#0b2342}}
.bar{{display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:#0b2342;color:#f4f8fc;align-items:center}}
.bar button,.bar select{{min-height:40px;border-radius:9px;border:1px solid #8ea1b8;background:#16365a;color:#f4f8fc;font:600 13px system-ui;padding:0 10px}}
.bar button[aria-pressed="true"]{{background:#8ea1b8;color:#06213b}}
.map{{position:relative;margin:8px;max-width:1000px;border-radius:12px;overflow:hidden;background:#0a1822}}
.map svg{{display:block;width:100%;height:auto}} #ovl{{position:absolute;inset:0;touch-action:none}}
.info{{margin:8px;display:grid;gap:4px}} .note{{color:#4d6177;font-size:13px}}
</style></head><body>
<div class="bar"><b>Cutaway spike</b> (isolated proof of concept; not V2)
  <button id="vA">Variant A</button><button id="vB">Variant B</button><button id="vC">Variant C</button><button id="artT">Treated</button><button id="artB">Blockout</button>
  <button id="lv1">L1</button><button id="lv2">L2</button><button id="insp">Inspect</button><button id="hits">Show hit areas</button>
  <select id="badge" aria-label="Elena's badge"><option value="ok">All Staff + Education</option><option value="edu">Education only</option><option value="none">No groups</option></select>
  <button id="walk">Walk Elena in</button><label>Inspect a door <select id="pick"></select></label></div>
<div class="map"><svg id="base" viewBox="0 0 400 300" aria-hidden="true"></svg><svg id="ovl" viewBox="0 0 400 300" role="img" aria-label="Cutaway facility map"></svg></div>
<div class="info"><div id="lvl"></div><div id="wstat"></div><div id="ev"></div>
<p class="note">Engine-exact blockout. The treated Kelp Hall tank is a procedural stand-in drawn by Claude to test depth and layering; production art would be painted over this blockout. Fictional facility.</p></div>
<script>
{read('src/engine.js')}
{read('src/scenarios.js')}
{read('src/flow.js')}
const SPIKE={{geom:{json.dumps(geom)},img:{json.dumps(img)}}};
{(here / 'overlay.js').read_text(encoding='utf-8')}
</script></body></html>"""
out = root / "docs/spikes/cutaway-poc.html"; out.parent.mkdir(parents=True, exist_ok=True); out.write_text(html, encoding="utf-8")
print("built", out.relative_to(root), len(html), "chars")
