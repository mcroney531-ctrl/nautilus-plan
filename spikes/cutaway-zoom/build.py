"""Mobile usability spike for the cutaway map: Inspect-only zoom with a camera that follows the lens, and a quieter
granted-footprint pattern. ISOLATED: src/v2 is not modified. This script applies the patches below to the V2 sources in
memory and writes docs/spikes/cutaway-zoom/v2-zoom.html (the cutaway preview app plus the patches). The patches are the
implementation proposal; each must match exactly once or the build stops.
Open with ?map=cutaway (zoom) and add &fp=quiet for the quieter footprint. Usage: python3 spikes/cutaway-zoom/build.py"""
import base64, json, re
from pathlib import Path
root = Path(__file__).resolve().parents[2]
read = lambda p: (root / p).read_text(encoding="utf-8")

MAP = [  # src/v2/map.js
    # the quieter footprint (opt-in with ?fp=quiet): same dots and stripes, sized in screen pixels and sparser
    ("const VIS_PX = 7, HIT_PX = 22;",
     "const VIS_PX = 7, HIT_PX = 22;\n  const QUIET = typeof location === 'object' && new URLSearchParams(location.search).get('fp') === 'quiet';   // SPIKE\n"
     "  const qdefs = (sfx, u) => `<pattern id=\"nxDotsQ${sfx}\" width=\"${u(12)}\" height=\"${u(12)}\" patternUnits=\"userSpaceOnUse\"><circle cx=\"${u(6)}\" cy=\"${u(6)}\" r=\"${u(1.2)}\" fill=\"#d9fff1\" opacity=\".55\"/></pattern>"
     "<pattern id=\"nxStrpQ${sfx}\" width=\"${u(10)}\" height=\"${u(10)}\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\"><rect width=\"${u(1.6)}\" height=\"${u(10)}\" fill=\"#ffe3b3\" opacity=\".4\"/></pattern>`;"),
    ("fill=\"url(#${kd === 'public' ? 'nxDots' : 'nxStrp'}${sfx})\" opacity=\".8\" pointer-events=\"none\"",
     "fill=\"url(#${kd === 'public' ? 'nxDots' : 'nxStrp'}${QUIET ? 'Q' : ''}${sfx})\" opacity=\"${QUIET ? '1' : '.8'}\" pointer-events=\"none\""),
    ("${defs('A')}${defs('B')}${lens ? `<clipPath id=\"nxLensClip\"><circle cx=\"${lens[0]}\" cy=\"${lens[1]}\" r=\"${LENS_R}\"", "${defs('A')}${defs('B')}${QUIET ? qdefs('A', u) + qdefs('B', u) : ''}${lens ? `<clipPath id=\"nxLensClip\"><circle cx=\"${lens[0]}\" cy=\"${lens[1]}\" r=\"${LENS_R}\""),
    # overlay and callout read the camera's view and the lens radius from the caller (both default to today's values)
    ("function ccallout(sel, sc) {\n    if (!sel || !sel.door) return ''; const u = px => px / sc, c = canvas(),",
     "function ccallout(sel, sc, view) {\n    if (!sel || !sel.door) return ''; const u = px => px / sc, c = view || canvas(),"),
    ("const u = px => px / sc, c = canvas(), other = l === 1 ? 2 : 1,", "const u = px => px / sc, c = o.view || canvas(), LR = o.lensR || LENS_R, other = l === 1 ? 2 : 1,"),
    ("return s + cselection(o.sel, l, sc) + ccallout(o.sel, sc);", "return s + cselection(o.sel, l, sc) + ccallout(o.sel, sc, o.view);"),
]
APP = [  # src/v2/app.js
    ("return w>0?w/NxMap.cutaway.canvas().w:0.62;};",
     """return w>0?w/camView().w:0.62;};
/* SPIKE zoom. Zoom exists only in Inspect. The camera is a sub-rectangle of the canvas (view state only, never on the ticket);
   it follows the lens, so moving the lens (drag, tap, arrow keys, the door list) is how a zoomed view pans. Inspect off,
   the walk, and "Whole building" all show the full canvas with today's margins. */
const ZOOMS=[1,2,3];
const camV=()=>route.screen==='ticket'?view[route.id]:null;
const camZoom=()=>{const v=camV();return v&&v.inspect&&!walking()?(v.zoom||1):1;};
function camView(){const c=NxMap.cutaway.canvas(),z=camZoom(),v=camV();if(z===1)return {x:c.x,y:c.y,w:c.w,h:c.h,z:1};
  const w=c.w/z,h=c.h/z,cam=v.cam||[c.x+c.w/2,c.y+c.h/2],cl=(a,lo,hi)=>Math.max(lo,Math.min(hi,a));
  return {x:cl(cam[0]-w/2,c.x,c.x+c.w-w),y:cl(cam[1]-h/2,c.y,c.y+c.h-h),w,h,z};}
/* zoomed, the lens keeps at most 112 px across on screen; at 1x it is today's lens */
const lensR=sc=>camZoom()>1?Math.min(NxMap.cutaway.LENS_R,56/sc):NxMap.cutaway.LENS_R;
function camFollow(center){const v=camV();if(!v||!v.lensP||camZoom()===1)return;const [X,Y]=NxMap.cutaway.cpos(...v.lensP);
  if(center){v.cam=[X,Y];return;}
  const vb=camView(),sc=cutScale(svgEl),R=lensR(sc),pl=R+4/sc,pb=R+20/sc;let cx=vb.x+vb.w/2,cy=vb.y+vb.h/2;
  if(X-pl<vb.x)cx-=vb.x-(X-pl);if(X+pl>vb.x+vb.w)cx+=X+pl-(vb.x+vb.w);if(Y-pl<vb.y)cy-=vb.y-(Y-pl);if(Y+pb>vb.y+vb.h)cy+=Y+pb-(vb.y+vb.h);v.cam=[cx,cy];}"""),
    ("const sc=cutScale(svg);\n  if(o.lens){const [x,y]=C.cpos(...o.lens);li.style.display='';li.style.clipPath=`circle(${C.LENS_R*sc}px at ${(x-c.x)*sc}px ${(y-c.y)*sc}px)`;}else li.style.display='none';\n  svg.innerHTML=C.overlay(t,l,getComputedStyle(document.body).fontFamily,o,sc);}",
     "const vb=camView(),vbs=`${vb.x} ${vb.y} ${vb.w} ${vb.h}`;for(const e of [base,li,svg])if(e.getAttribute('viewBox')!==vbs)e.setAttribute('viewBox',vbs);\n"
     "  const sc=cutScale(svg),R=lensR(sc);fig.dataset.nxZoom=String(vb.z);\n"
     "  if(o.lens){const [x,y]=C.cpos(...o.lens);li.style.display='';li.style.clipPath=`circle(${R*sc}px at ${(x-vb.x)*sc}px ${(y-vb.y)*sc}px)`;}else li.style.display='none';\n"
     "  svg.innerHTML=C.overlay(t,l,getComputedStyle(document.body).fontFamily,{...o,view:vb,lensR:R},sc);}"),
    ("const n=(s&&s.door)?s:(s2&&s2.door)?s2:tap?(s||s2):null;if(n)t.sel=n;}", "const n=(s&&s.door)?s:(s2&&s2.door)?s2:tap?(s||s2):null;if(n)t.sel=n;camFollow(false);}"),
    ("v.lensP=[...E.DOORS[d].p];render();", "v.lensP=[...E.DOORS[d].p];camFollow(true);render();"),
    ("v.inspect=!v.inspect;", "v.inspect=!v.inspect;if(!v.inspect)v.zoom=1;"),
    ("<select id=\"nxDoorPick\" data-nx-key=\"doorpick\"></select></div>",
     "<select id=\"nxDoorPick\" data-nx-key=\"doorpick\"></select></div>\n  <div class=\"nx-zoom\" id=\"nxZoomWrap\" role=\"group\" aria-label=\"Zoom\" hidden>"
     "<button type=\"button\" class=\"nx-tool\" id=\"nxZoomOut\" data-nx-key=\"zoomout\" aria-label=\"Zoom out\">&minus;</button>"
     "<button type=\"button\" class=\"nx-tool\" id=\"nxZoomIn\" data-nx-key=\"zoomin\" aria-label=\"Zoom in\">+</button>"
     "<button type=\"button\" class=\"nx-tool\" id=\"nxZoomAll\" data-nx-key=\"zoomall\">Whole building</button><span class=\"nx-zoomval\" id=\"nxZoomVal\"></span></div>"),
    ("pw.hidden=!ins;",
     "pw.hidden=!ins;{const zw=inMap('#nxZoomWrap'),z=NxMap.cutawayOn()&&ins&&!run?(v.zoom||1):0;zw.hidden=!z;if(z){inMap('#nxZoomOut').setAttribute('aria-disabled',z===1);"
     "inMap('#nxZoomIn').setAttribute('aria-disabled',z===ZOOMS[ZOOMS.length-1]);inMap('#nxZoomAll').setAttribute('aria-disabled',z===1);inMap('#nxZoomVal').textContent=z===1?'Whole building':`Zoom ${z}×`;}}"),
    ("/* the door list is the accessible alternative",
     """mapRegion.addEventListener('click',e=>{const b=e.target.closest('#nxZoomIn,#nxZoomOut,#nxZoomAll');if(!b||route.screen!=='ticket'||walking())return;
  const v=view[route.id],z=v.zoom||1,i=ZOOMS.indexOf(z),nz=b.id==='nxZoomIn'?ZOOMS[Math.min(ZOOMS.length-1,i+1)]:b.id==='nxZoomOut'?ZOOMS[Math.max(0,i-1)]:1;if(nz===z)return;
  const C=NxMap.cutaway,c=C.canvas(),cv=camView();v.zoom=nz;v.cam=v.lensP?C.cpos(...v.lensP):[cv.x+cv.w/2,cv.y+cv.h/2];
  renderMap();announce(nz===1?'Showing the whole building':`Zoomed in, ${nz} times`);});
/* the door list is the accessible alternative"""),
]
CSS = ("", ".nx-zoom{display:flex;align-items:center;gap:6px;padding:0 8px}.nx-zoom[hidden]{display:none}.nx-zoom .nx-tool{min-width:44px;justify-content:center;font-size:18px}"
       "#nxZoomAll{font-size:14px}.nx-zoom [aria-disabled=\"true\"]{opacity:.45;cursor:default}.nx-zoomval{margin-left:auto;font:700 13px var(--nx-font);color:var(--nx-on-navy-muted)}")

def patch(text, pairs, name):
    for old, new in pairs:
        n = text.count(old)
        if n != 1: raise SystemExit(f"{name}: patch anchor found {n} times: {old[:70]!r}")
        text = text.replace(old, new)
    return text

def lens_in_overlay(js):
    """inside overlay() only, the lens radius is the caller's (LR), not the constant"""
    a, b = js.index("function overlay("), js.index("function cpick(")
    body = js[a:b].replace("LENS_R", "LR").replace("LR = o.lensR || LR", "LR = o.lensR || LENS_R")
    assert body.count("LR") >= 6, "lens radius uses in overlay() changed"
    return js[:a] + body + js[b:]

def main():
    src = {"/*__V2CSS__*/": read("src/v2/styles.css") + CSS[1], "/*__ENGINE__*/": read("src/engine.js"), "/*__SCENARIOS__*/": read("src/scenarios.js"),
           "/*__FLOW__*/": read("src/flow.js"), "/*__V2MAP__*/": lens_in_overlay(patch(read("src/v2/map.js"), MAP, "map.js")), "/*__V2APP__*/": patch(read("src/v2/app.js"), APP, "app.js")}
    d = root / "assets/v2/cutaway"; rec = json.loads((d / "assets.json").read_text())
    uri = lambda lv: "data:image/webp;base64," + base64.b64encode((d / f"{lv}.webp").read_bytes()).decode()
    out = read("src/v2/shell.html").replace("/*__V2CUTAWAY__*/", "const NX_CUTAWAY=" + json.dumps({"projection": rec["projection"], "geometry": rec["geometry_sha256"], "img": {"1": uri("L1"), "2": uri("L2")}}) + ";")
    for tok, text in src.items(): out = out.replace(tok, text)
    def art(m):
        p = root / "assets" / m.group(1); assert ".." not in m.group(1).split("/")
        return f"data:image/{p.suffix[1:].replace('jpg', 'jpeg').replace('svg', 'svg+xml')};base64," + base64.b64encode(p.read_bytes()).decode()
    out = re.sub(r"__ART:([\w./-]+)__", art, out)
    o = root / "docs/spikes/cutaway-zoom"; o.mkdir(parents=True, exist_ok=True); (o / "v2-zoom.html").write_text(out, encoding="utf-8", newline="\n")
    print("built docs/spikes/cutaway-zoom/v2-zoom.html", len(out), "chars")

if __name__ == "__main__": main()
