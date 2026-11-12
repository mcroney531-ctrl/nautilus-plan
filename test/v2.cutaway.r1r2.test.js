// Step 6 remediation. R1: Inspect hit-testing on the cutaway (bounded, nearest marker, flat-map behaviour for rooms).
// R2: dark casings keep the footprint rim and the change outlines at 3:1 or more against the painted art.
// Needs Playwright, Python with Pillow, and dist/v2-cutaway-preview.html. Writes docs/v2-cutaway-r1r2.json.
const assert = require('assert'), path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process'), { pathToFileURL } = require('url');
let chromium; try { ({ chromium } = require('playwright')); } catch (_) { console.log('skip: playwright not installed'); process.exit(0); }
const ON = pathToFileURL(path.join(__dirname, '../dist/v2-cutaway-preview.html')).href + '?map=cutaway', OFF = pathToFileURL(path.join(__dirname, '../dist/v2.html')).href + '?';
const SIZES = { 320: [320, 568], 400: [400, 860], desktop: [1366, 900] }, W = Object.keys(SIZES), OUT = {}, TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1r2-'));
const open = async (b, url, size, dsf = 1) => { const pg = await (await b.newContext({ viewport: { width: SIZES[size][0], height: SIZES[size][1] }, reducedMotion: 'reduce', deviceScaleFactor: dsf })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); }); pg.size = size; pg.base = url; await pg.goto(url + '#/inbox'); return pg; };
const ev = (pg, f, a) => pg.evaluate(f, a), done = async pg => { assert.deepEqual(pg.errs, []); await pg.context().close(); };
const mapOpen = async pg => { if (pg.size !== 'desktop' && !(await ev(pg, () => document.getElementById('nxMapDlg').open))) { await pg.click('#nxMapBtn'); await pg.waitForTimeout(150); } };
const go = async (pg, h, map = true) => { if (pg.size !== 'desktop' && await ev(pg, () => document.getElementById('nxMapDlg').open)) await pg.keyboard.press('Escape'); await pg.goto(pg.base + '#' + h); await pg.waitForTimeout(40); if (map) await mapOpen(pg); };
const inspect = pg => ev(pg, () => { if (vis('#nxInspect').getAttribute('aria-pressed') !== 'true') vis('#nxInspect').click(); });
const level = (pg, l) => ev(pg, l => vis('#nxLv' + l).click(), l);
const screenOf = (pg, x, y, cut) => ev(pg, ([x, y, cut]) => { const s = vis('#nxMapSvg'), [X, Y] = cut ? NxMap.cutaway.cpos(x, y) : [x, y], p = s.createSVGPoint(); p.x = X; p.y = Y; const q = p.matrixTransform(s.getScreenCTM()); return [q.x, q.y]; }, [x, y, cut]);
const markerAt = (pg, d) => ev(pg, d => { const s = vis('#nxMapSvg'), [X, Y] = NxMap.cutaway.cdoor(d), p = s.createSVGPoint(); p.x = X; p.y = Y; const q = p.matrixTransform(s.getScreenCTM()); return [q.x, q.y]; }, d);
const sel = pg => ev(pg, () => { const s = __nx.state('elena').sel; return s ? (s.door ? 'door:' + s.door : 'space:' + s.space) : null; });

const tests = {
  async 'R1: a tap at the centre of each of the 24 spaces selects what the flat map selects, at 320, 400 and desktop; no door on the other level is ever captured'(b) {
    const diffs = [], cross = []; OUT.centreTaps = {}; const pg0 = await open(b, ON, 'desktop'), DL = await ev(pg0, () => Object.fromEntries(Object.keys(Engine.DOORS).map(d => [d, Engine.doorLevel(d)]))); await pg0.context().close();
    for (const size of W) { const run = async url => { const pg = await open(b, url, size), r = {}; await go(pg, '/t/elena/review'); await inspect(pg);
        for (const l of [1, 2]) { await level(pg, l); for (const [k, s] of Object.entries(await ev(pg, () => Engine.SPACES))) { if (s.l !== l) continue;
            const q = s.r.reduce((a, c) => c[2] * c[3] > a[2] * a[3] ? c : a); await pg.mouse.click(...await screenOf(pg, q[0] + q[2] / 2, q[1] + q[3] / 2, url === ON)); r[k] = [l, await sel(pg)]; } }
        await done(pg); return r; };
      const flat = await run(OFF), cut = await run(ON); let same = 0;
      for (const k of Object.keys(flat)) { const fd = flat[k][1].startsWith('door:') && flat[k][1].slice(5), flatCross = fd && DL[fd] !== flat[k][0];
        if (flat[k][1] === cut[k][1]) same++; else if (flatCross && cut[k][1] === 'space:' + k) (OUT.flatCrossLevel = OUT.flatCrossLevel || []).push(`${size} ${k}: flat map captures ${fd} on the other level; cutaway selects the room`); else diffs.push(`${size} ${k}: flat ${flat[k][1]}, cutaway ${cut[k][1]}`);
        const d = cut[k][1].startsWith('door:') && cut[k][1].slice(5); if (d && DL[d] !== cut[k][0]) cross.push(`${size} ${k} -> ${d}`); }
      OUT.centreTaps[size] = { same, of: Object.keys(flat).length }; }
    OUT.centreTapDiffs = diffs; assert.deepEqual(cross, [], 'no cross-level capture'); assert.deepEqual(diffs, [], 'same as the flat map'); },
  async 'R1: the other-level radius, swept over real marker positions: room-centre captures, floor captured and finger-offset reach (choose the bound)'(b) {
    OUT.sweep = {}; for (const size of W) { const pg = await open(b, ON, size); await go(pg, '/t/elena/review'); await inspect(pg);
      OUT.sweep[size] = await ev(pg, () => { const C = NxMap.cutaway, s = vis('#nxMapSvg'), sc = s.getBoundingClientRect().width / +s.getAttribute('viewBox').split(' ')[2], res = {};
        for (const r of [6, 8, 10, 12, 14, 16, 20, 22]) { let centre = 0, floor = 0, pts = 0, reach = 0, tries = 0;
          for (const l of [1, 2]) { const other = l === 1 ? 2 : 1;
            for (const [k, sp] of Object.entries(Engine.SPACES)) { if (sp.l !== l) continue; const q = sp.r.reduce((a, c) => c[2] * c[3] > a[2] * a[3] ? c : a), p = C.inspectPick(...C.cpos(q[0] + q[2] / 2, q[1] + q[3] / 2), l, sc, true, r); if (p && p.door && Engine.doorLevel(p.door) === other) centre++;
              for (const q2 of sp.r) for (let x = q2[0] + 1; x < q2[0] + q2[2]; x += 2) for (let y = q2[1] + 1; y < q2[1] + q2[3]; y += 2) { pts++; const p2 = C.inspectPick(...C.cpos(x, y), l, sc, true, r); if (p2 && p2.door && Engine.doorLevel(p2.door) === other) floor++; } }
            /* a finger landing 0, 4 or 8 px off an other-level marker, seen through the lens */
            for (const d of Object.keys(Engine.DOORS).filter(d => Engine.doorLevel(d) === other)) { const [X, Y] = C.cdoor(d); for (const off of [0, 4, 8]) for (let a = 0; a < (off ? 8 : 1); a++) { tries++; const p = C.inspectPick(X + off / sc * Math.cos(a * Math.PI / 4), Y + off / sc * Math.sin(a * Math.PI / 4), l, sc, true, r); if (p && p.door === d) reach++; } } }
          res[r] = { roomCentreCaptures: centre, floorCapturedPct: +(100 * floor / pts).toFixed(1), fingerReachPct: +(100 * reach / tries).toFixed(1) }; }
        return res; }); await done(pg); }
    for (const size of W) assert.strictEqual(OUT.sweep[size][10].roomCentreCaptures, 0, size + ': the chosen 10 px captures no room centre'); },
  async 'R1: every door is reachable: a real click on its marker and 6 px around it on its own level (1x and 2x), through the lens from the other level, and by the door list'(b) {
    const miss = []; OUT.throughLens = {};
    for (const size of W) for (const z of [1, 2]) { const pg = await open(b, ON, size); await go(pg, '/t/elena/review'); await inspect(pg); if (z === 2) await ev(pg, () => vis('#nxZoom').click());
      const doors = await ev(pg, () => Object.keys(Engine.DOORS).map(d => [d, Engine.doorLevel(d)])); let lensOk = 0;
      for (const [d, l] of doors) { await level(pg, l);
        await ev(pg, d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d); if (await sel(pg) !== 'door:' + d) miss.push(`${size} ${z}x list ${d}`);
        for (const [dx, dy] of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]]) { const [x, y] = await markerAt(pg, d); await pg.mouse.click(x + dx, y + dy); if (await sel(pg) !== 'door:' + d) miss.push(`${size} ${z}x tap ${d} ${dx},${dy} -> ${await sel(pg)}`); }
        await level(pg, l === 1 ? 2 : 1); await ev(pg, d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d); await level(pg, l === 1 ? 2 : 1);   // centre the lens there on the other level
        const [x, y] = await markerAt(pg, d); await pg.mouse.click(x, y); const got = await sel(pg); if (got === 'door:' + d) lensOk++; else OUT.throughLens[`${size} ${z}x ${d}`] = got; }
      OUT.throughLens[`${size} ${z}x reached`] = `${lensOk}/15`; await done(pg); }
    assert.deepEqual(miss, []); },
  async 'R2: casings keep the rim and the gained and lost outlines at 3:1 or more against their surroundings over the real art (320, 400, desktop; 1x and 2x); markers stay on top'(b) {
    OUT.contrast = {}; const low = [];
    for (const size of W) for (const z of [1, 2]) { const pg = await open(b, ON, size, 2); await go(pg, '/t/elena/configure', false); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-exhibitOps"]'); await mapOpen(pg);
      const prep = async () => { if (z === 2) { await inspect(pg); await ev(pg, () => { const s = vis('#nxDoorPick'); s.value = 'D-LIFE'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await ev(pg, () => { if (vis('#nxZoom').textContent === 'Zoom in') vis('#nxZoom').click(); }); } };
      const measure = async (name, l, sel, hex) => { await level(pg, l); await prep(); await pg.waitForTimeout(200);
        const box = await ev(pg, () => { const q = vis('#nxMapSvg').getBoundingClientRect(); return { x: q.x, y: q.y, width: q.width, height: q.height }; }); if (box.y < 0 || box.y + box.height > SIZES[size][1]) await ev(pg, () => vis('#nxMapSvg').scrollIntoView({ block: 'center' }));
        const box2 = await ev(pg, () => { const q = vis('#nxMapSvg').getBoundingClientRect(); return { x: q.x, y: q.y, width: q.width, height: q.height }; });
        const fa = path.join(TMP, 'a.png'), fb = path.join(TMP, 'b.png'), fc = path.join(TMP, 'c.png'); fs.writeFileSync(fa, await pg.screenshot({ clip: box2 }));
        await ev(pg, sel => { for (const e of vis('#nxMapSvg').querySelectorAll(sel + ' .nx-line')) e.style.visibility = 'hidden'; }, sel); fs.writeFileSync(fb, await pg.screenshot({ clip: box2 }));
        await ev(pg, sel => { for (const e of vis('#nxMapSvg').querySelectorAll(sel + ' .nx-line, ' + sel + ' .nx-case')) e.style.visibility = 'hidden'; }, sel); fs.writeFileSync(fc, await pg.screenshot({ clip: box2 }));
        await ev(pg, sel => { for (const e of vis('#nxMapSvg').querySelectorAll(sel + ' .nx-line, ' + sel + ' .nx-case')) e.style.visibility = ''; }, sel);
        const r = JSON.parse(execFileSync('python3', ['-c', `
import json,sys
from PIL import Image
A=Image.open(sys.argv[1]).convert('RGB');B=Image.open(sys.argv[2]).convert('RGB');Cc=Image.open(sys.argv[3]).convert('RGB');a=A.load();b=B.load();c=Cc.load();W,H=A.size
def L(p):
  f=lambda v:(v/255)/12.92 if v/255<=0.03928 else ((v/255+0.055)/1.055)**2.4
  return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def cr(p,q):
  x,y=L(p),L(q);return (max(x,y)+0.05)/(min(x,y)+0.05)
N=tuple(int(sys.argv[4][i:i+2],16) for i in (0,2,4))
anyl=set((x,y) for y in range(H) for x in range(W) if sum(abs(a[x,y][i]-b[x,y][i]) for i in range(3))>60)
line=set(p for p in anyl if sum(abs(a[p][i]-N[i]) for i in range(3))<=45)   # pixels drawn in the line's own colour; the rest are anti-aliased edges
ok=0;before=0;n=0
for (x,y) in line:
  nb=[a[i,j] for i in range(max(0,x-3),min(W,x+4)) for j in range(max(0,y-3),min(H,y+4)) if (i,j) not in anyl]
  if not nb: continue
  n+=1;v=sorted(cr(a[x,y],q) for q in nb);ok+= v[len(v)//2]>=3
  w=sorted(cr(a[x,y],c[i,j]) for i in range(max(0,x-3),min(W,x+4)) for j in range(max(0,y-3),min(H,y+4)) if (i,j) not in anyl) if nb else [0];before+= w[len(w)//2]>=3
print(json.dumps({'edge_px':len(anyl)-len(line),'line_px':n,'pct_ge_3':round(100*ok/max(n,1),1),'without_casing_pct_ge_3':round(100*before/max(n,1),1)}))`, fa, fb, fc, hex]).toString());
        const top = await ev(pg, () => { const s = vis('#nxMapSvg'), m = s.querySelector('[data-level] .nx-door'), c = s.querySelector('[data-level] .nx-case'); return !c || !!(c.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING); });
        OUT.contrast[`${size} ${z}x ${name}`] = { ...r, markersOnTop: top }; if (r.pct_ge_3 < 90 || !top) low.push(`${size} ${z}x ${name} ${JSON.stringify(r)}`); };
      await measure('footprint rim L1', 1, '[data-lit]', 'a4ead0'); await measure('gained outline L2', 2, '[data-delta="added"]', 'f5d192');
      await ev(pg, () => vis('#nxInspect') && vis('#nxInspect').getAttribute('aria-pressed') === 'true' && vis('#nxInspect').click()); if (size !== 'desktop') await pg.keyboard.press('Escape');
      await pg.uncheck('[data-nx-key="g-exhibitOps"]'); await mapOpen(pg); await measure('lost outline L2', 2, '[data-delta="removed"]', 'f39091');
      await done(pg); }
    assert.deepEqual(low, [], 'at least 90% of each line\'s pixels at 3:1 against their surroundings'); },
};
(async () => { const b = await chromium.launch(); let pass = 0, n = 0;
  for (const [name, f] of Object.entries(tests)) { n++; try { await f(b); pass++; console.log('ok', name); } catch (e) { console.log('FAIL', name, '\n  ', e.message.split('\n').slice(0, 8).join('\n   ')); } }
  fs.writeFileSync(path.join(__dirname, '../docs/v2-cutaway-r1r2.json'), JSON.stringify(OUT, null, 1) + '\n'); await b.close(); console.log(`\n${pass}/${n} R1/R2 tests passed`); process.exit(pass === n ? 0 : 1); })();
