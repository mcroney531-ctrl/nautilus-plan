// Cutaway mobile usability spike: interaction tests, measurements and screenshots. Compares the spike (docs/spikes/cutaway-zoom/
// v2-zoom.html, built by spikes/cutaway-zoom/build.py) with today's flagged preview (dist/v2-cutaway-preview.html, built by build.py).
// Usage: node spikes/cutaway-zoom/test.js   Writes docs/spikes/cutaway-zoom/measurements.json and shots/.
const assert = require('assert'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url'), { chromium } = require('playwright');
const R = path.join(__dirname, '../..'), url = f => pathToFileURL(path.join(R, f)).href;
const SPIKE = url('docs/spikes/cutaway-zoom/v2-zoom.html') + '?map=cutaway', NOW = url('dist/v2-cutaway-preview.html') + '?map=cutaway';
const O = path.join(R, 'docs/spikes/cutaway-zoom/'), SHOTS = O + 'shots/'; fs.mkdirSync(SHOTS, { recursive: true });
const SIZES = { 320: [320, 568], 400: [400, 860], desktop: [1366, 900] };
const open = async (b, u, size = 320, dpr = 1) => { const ctx = await b.newContext({ viewport: { width: SIZES[size][0], height: SIZES[size][1] }, deviceScaleFactor: dpr, reducedMotion: 'reduce' }), pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); }); await pg.goto(u); return pg; };
const elena = async (pg, size, stage = 'configure') => { await pg.goto(pg.url().split('#')[0] + '#/t/elena/' + stage); if (stage === 'configure') { await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]'); } if (size !== 'desktop') await pg.click('#nxMapBtn'); };
const ev = (pg, f, a) => pg.evaluate(f, a);
const inspectOn = pg => ev(pg, () => vis('#nxInspect').click());
const pick = (pg, d) => ev(pg, d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d);
const zoom = (pg, which) => ev(pg, w => vis('#nxZoom' + w).click(), which);
const doorId = (pg, name) => ev(pg, n => Object.keys(Engine.DOORS).find(d => Engine.DOORS[d].n === n), name);
const geom = pg => ev(pg, () => { const s = vis('#nxMapSvg'), b = s.getBoundingClientRect(), vb = s.getAttribute('viewBox').split(' ').map(Number), sc = b.width / vb[2], scr = (x, y) => [b.left + (x - vb[0]) * sc, b.top + (y - vb[1]) * sc];
  const lens = s.querySelector('.nx-lens'), lb = lens && lens.getBoundingClientRect(), co = s.querySelector('.nx-callout'), cb = co && co.getBoundingClientRect(), sel = s.querySelector('[data-sel]'), sb = sel && sel.getBoundingClientRect();
  const inside = r => !r || (r.left >= b.left - 0.5 && r.right <= b.right + 0.5 && r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5);
  return { vb, sc, box: [b.left, b.top, b.width, b.height], lensPx: lb ? Math.round(lb.width) : 0, lensIn: inside(lb), calloutIn: inside(cb), selIn: inside(sb), zoomLabel: (vis('#nxZoomVal') || {}).textContent || '', zoomShown: !!vis('#nxZoomWrap'), overflow: document.documentElement.scrollWidth - innerWidth }; });
const doorScreen = (pg, d) => ev(pg, d => { const s = vis('#nxMapSvg'), b = s.getBoundingClientRect(), vb = s.getAttribute('viewBox').split(' ').map(Number), sc = b.width / vb[2], [x, y] = NxMap.cutaway.cdoor(d); return [b.left + (x - vb[0]) * sc, b.top + (y - vb[1]) * sc]; }, d);
const measure = pg => ev(pg, () => { const C = NxMap.cutaway, s = vis('#nxMapSvg'), vb = s.getAttribute('viewBox').split(' ').map(Number), sc = s.getBoundingClientRect().width / vb[2], r = { px_per_map_unit: +sc.toFixed(3) };
  for (const l of [1, 2]) { const ds = Object.keys(Engine.DOORS).filter(d => Engine.doorLevel(d) === l), P = Object.fromEntries(ds.map(d => [d, C.cdoor(d)])); let best = [1e9];
    for (const a of ds) for (const e of ds) if (a < e) { const dd = Math.hypot(P[a][0] - P[e][0], P[a][1] - P[e][1]) * sc; if (dd < best[0]) best = [Math.round(dd), Engine.DOORS[a].n, Engine.DOORS[e].n]; }
    const rooms = {}; for (const [k, sp] of Object.entries(Engine.SPACES)) { if (sp.l !== l) continue; let n = 0, room = 0; for (const q of sp.r) for (let x = q[0] + 1; x < q[0] + q[2]; x += 2) for (let y = q[1] + 1; y < q[1] + q[3]; y += 2) { n++; const [X, Y] = C.cpos(x, y), p = C.pick(X, Y, l, sc); if (p && p.space === k) room++; } rooms[sp.n] = Math.round(100 * room / n); }
    r['L' + l] = { closest_markers_px: best, room_floor_where_a_tap_selects_the_room_pct: rooms }; }
  return r; });
const out = { note: 'Spike measurements. 1x is today\'s flagged cutaway; zoom exists only in Inspect.', sizes: {} };
const tests = {
  async 'at 1x the spike draws exactly what today\'s preview draws (Inspect off and on, lens on doors of both levels), at every width'(b) {
    for (const size of Object.keys(SIZES)) { const run = async u => { const pg = await open(b, u, size); await elena(pg, size); const r = [];
        r.push(await ev(pg, () => vis('#nxMapSvg').innerHTML)); await inspectOn(pg);
        for (const n of ['Living Shore staff gate', 'Loading dock', 'Quarantine']) { const d = await doorId(pg, n); if (!d) continue; await pick(pg, d); r.push(await ev(pg, () => [vis('#nxMapSvg').innerHTML, vis('#nxMapSvg').getAttribute('viewBox'), vis('.nx-map-lensimg').style.clipPath].join('|'))); }
        assert.deepEqual(pg.errs, []); await pg.context().close(); return r; };
      const a = await run(NOW), c = await run(SPIKE); assert.strictEqual(c.length, a.length); c.forEach((x, i) => assert.strictEqual(x, a[i], `${size} step ${i} differs`)); } },
  async 'zoom controls appear only in Inspect on the cutaway; Inspect off and Whole building return to today\'s full canvas'(b) {
    const pg = await open(b, SPIKE, 320); await elena(pg, 320); const full = (await geom(pg)).vb.join(' ');
    assert.strictEqual((await geom(pg)).zoomShown, false, 'hidden outside Inspect'); await inspectOn(pg); assert.strictEqual((await geom(pg)).zoomShown, true);
    await zoom(pg, 'In'); let g = await geom(pg); assert.notStrictEqual(g.vb.join(' '), full); assert.strictEqual(g.zoomLabel, 'Zoom 2×');
    await zoom(pg, 'All'); assert.strictEqual((await geom(pg)).vb.join(' '), full); await zoom(pg, 'In'); await zoom(pg, 'In'); assert.strictEqual((await geom(pg)).zoomLabel, 'Zoom 3×');
    await inspectOn(pg); g = await geom(pg); assert.strictEqual(g.vb.join(' '), full, 'Inspect off shows the whole building'); assert.strictEqual(g.zoomShown, false);
    await inspectOn(pg); assert.strictEqual((await geom(pg)).vb.join(' '), full, 'and Inspect comes back at 1x');
    // flat map (no flag): no zoom controls at all
    const flat = await open(b, SPIKE.replace('?map=cutaway', ''), 320); await elena(flat, 320); await inspectOn(flat); assert.strictEqual((await geom(flat)).zoomShown, false);
    assert.deepEqual([...pg.errs, ...flat.errs], []); await pg.context().close(); await flat.context().close(); },
  async 'measurements at 320 / 400 / desktop: 1x against 2x and 3x (marker spacing, lens, room taps)'(b) {
    for (const size of Object.keys(SIZES)) { const pg = await open(b, SPIKE, size); await elena(pg, size); await inspectOn(pg); out.sizes[size] = {};
      for (const z of [1, 2, 3]) { if (z > 1) await zoom(pg, 'In'); const d = await doorId(pg, 'Quarantine'); await pick(pg, d); const g = await geom(pg);
        out.sizes[size][z + 'x'] = { map_px: [Math.round(g.box[2]), Math.round(g.box[3])], lens_px: g.lensPx, view_shows_pct_of_canvas: Math.round(100 / z / z), ...(await measure(pg)) }; }
      await pg.context().close(); }
    const s = out.sizes[320]; assert(s['2x'].L2.closest_markers_px[0] >= 24, 'L2 pair reaches 24 px at 2x on 320'); assert(s['1x'].L2.closest_markers_px[0] < 24); },
  async '320 at 2x: real clicks on the crowded pairs pick the nearer door, at the markers, the midpoint and 4 px either side'(b) {
    const pg = await open(b, SPIKE, 320); await elena(pg, 320); await inspectOn(pg); await zoom(pg, 'In'); const res = [];
    for (const [a, c, l] of [['Quarantine', 'Tank-top · west', 2], ['Classroom', 'Living Shore staff gate', 1], ['Dive locker', 'Tank-top · east', 2]]) {
      const da = await doorId(pg, a), dc = await doorId(pg, c); if (!da || !dc) { res.push(`missing ${a} / ${c}`); continue; }
      await pick(pg, da); const pa = await doorScreen(pg, da), pc = await doorScreen(pg, dc), mid = [(pa[0] + pc[0]) / 2, (pa[1] + pc[1]) / 2], L = Math.hypot(pc[0] - pa[0], pc[1] - pa[1]), ux = (pc[0] - pa[0]) / L, uy = (pc[1] - pa[1]) / L;
      for (const [p, want] of [[pa, da], [pc, dc], [[mid[0] - 4 * ux, mid[1] - 4 * uy], da], [[mid[0] + 4 * ux, mid[1] + 4 * uy], dc]]) {
        await pick(pg, da); const q = (await doorScreen(pg, da)), off = [q[0] - pa[0], q[1] - pa[1]];   // re-centre, then click
        await pg.mouse.click(p[0] + off[0], p[1] + off[1]); const got = await ev(pg, () => __nx.state('elena').sel); res.push([a, c, Math.round(L), got && got.door === want]); assert(got && got.door === want, `${a}/${c}: wanted ${want}, got ${JSON.stringify(got)}`); } }
    out.crowded_pairs_320_2x = res; assert.deepEqual(pg.errs, []); await pg.context().close(); },
  async 'zoomed, the lens, the selection and its name stay inside the map for every door (both levels, 2x and 3x, three widths)'(b) {
    const bad = []; for (const size of Object.keys(SIZES)) { const pg = await open(b, SPIKE, size); await elena(pg, size); await inspectOn(pg);
      for (const z of [2, 3]) { await zoom(pg, 'In'); for (const d of await ev(pg, () => Object.keys(Engine.DOORS))) { await pick(pg, d); const g = await geom(pg); if (!g.lensIn || !g.selIn || !g.calloutIn) bad.push(`${size} ${z}x ${d} lens:${g.lensIn} sel:${g.selIn} name:${g.calloutIn}`); if (g.overflow) bad.push(`${size} sideways scroll`); } }
      assert.deepEqual(pg.errs, []); await pg.context().close(); }
    assert.deepEqual(bad, []); },
  async 'zoomed, dragging the lens and arrow keys pan the view; the lens never leaves it'(b) {
    const pg = await open(b, SPIKE, 320); await elena(pg, 320); await inspectOn(pg); await zoom(pg, 'In'); const g0 = await geom(pg), [x, y, w, h] = g0.box;
    await pg.mouse.move(x + w / 2, y + h / 2); await pg.mouse.down(); for (let i = 1; i <= 40; i++) { await pg.mouse.move(x + w / 2 + i * (w / 2 - 6) / 40, y + h / 2); } for (let i = 0; i < 20; i++) await pg.mouse.move(x + w - 6 - (i % 2), y + h / 2);
    let g = await geom(pg); await pg.mouse.up(); assert(g.vb[0] > g0.vb[0] + 20, `drag to the edge pans right (${g0.vb[0]} -> ${g.vb[0]})`); assert(g.lensIn);
    await ev(pg, () => vis('#nxMapSvg').focus()); const before = (await geom(pg)).vb[0]; let out1 = 0;
    const cx = await ev(pg, () => NxMap.cutaway.canvas().x);   // past the last door the lens may meet the canvas edge, as at 1x today; only then may it be cut
    for (let i = 0; i < 40; i++) { await pg.keyboard.press('ArrowLeft'); const q = await geom(pg); if (!q.lensIn && q.vb[0] > cx + 0.01) out1++; }
    g = await geom(pg); assert(g.vb[0] < before - 20, 'arrow keys pan left'); assert.strictEqual(out1, 0, 'lens inside the view on every key press, unless the camera is already at the canvas edge');
    assert.strictEqual(await ev(pg, () => document.activeElement.id), 'nxMapSvg', 'focus stays on the map'); assert.deepEqual(pg.errs, []); await pg.context().close(); },
  async 'keyboard: the zoom buttons are reachable by Tab and keep focus; zoom changes are announced'(b) {
    const pg = await open(b, SPIKE, 320); await elena(pg, 320); await inspectOn(pg); await ev(pg, () => vis('#nxZoomIn').focus()); await pg.keyboard.press('Enter');
    assert.strictEqual(await ev(pg, () => document.activeElement.id), 'nxZoomIn'); await pg.waitForTimeout(80); assert.match(await ev(pg, () => document.getElementById('nxLive').textContent), /Zoomed in, 2 times/);
    await pg.keyboard.press('Tab'); assert.strictEqual(await ev(pg, () => document.activeElement.id), 'nxZoomAll'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
    assert.match(await ev(pg, () => document.getElementById('nxLive').textContent), /whole building/); await pg.keyboard.press('Shift+Tab'); await pg.keyboard.press('Shift+Tab'); assert.strictEqual(await ev(pg, () => document.activeElement.id), 'nxZoomOut');
    assert.deepEqual(pg.errs, []); await pg.context().close(); },
  async 'zoom is view state only: ticket state, steps and record unchanged by any zooming'(b) {
    const pg = await open(b, SPIKE, 320); await elena(pg, 320); await inspectOn(pg); const d = await doorId(pg, 'Quarantine'); await pick(pg, d);
    const snap = () => ev(pg, () => JSON.stringify([__nx.state('elena'), __nx.steps('elena'), __nx.record('elena'), __nx.result('elena')])), a = await snap();
    for (const w of ['In', 'In', 'Out', 'All', 'In', 'In']) await zoom(pg, w); await ev(pg, () => vis('#nxLv1').click()); await ev(pg, () => vis('#nxLv2').click());
    assert.strictEqual(await snap(), a); assert.deepEqual(pg.errs, []); await pg.context().close(); },
  async 'the walk always shows the whole building, even if Inspect was zoomed'(b) {
    const pg = await open(b, SPIKE, 320); await elena(pg, 320, 'configure'); await inspectOn(pg); await zoom(pg, 'In'); await pg.keyboard.press('Escape');
    await pg.goto(pg.url().split('#')[0] + '#/t/elena/verify'); await pg.click('[data-nx-key="walk"]'); const full = await ev(pg, () => { const c = NxMap.cutaway.canvas(); return [c.x, c.y, c.w, c.h].join(' '); });
    const during = await ev(pg, () => vis('#nxMapSvg').getAttribute('viewBox')); assert.strictEqual(during, full); assert.strictEqual(await ev(pg, () => !!vis('#nxZoomWrap')), false, 'no zoom controls during the walk');
    await pg.waitForFunction(() => /Walk (complete|stopped)/.test((vis('#nxWalkNote') || {}).textContent || ''), null, { timeout: 30000 }); assert.deepEqual(pg.errs, []); await pg.context().close(); },
  async 'screenshots: today at 320 against the spike at 2x; footprint today against quiet'(b) {
    const clip = async (pg, f) => { await pg.waitForTimeout(150); await ev(pg, () => vis('#nxMapSvg').scrollIntoView({ block: 'center' })); const g = await geom(pg); await pg.screenshot({ path: SHOTS + f, clip: { x: g.box[0], y: g.box[1], width: g.box[2], height: g.box[3] } }); };
    for (const [n, f] of [['Quarantine', 'quarantine-L2'], ['Living Shore staff gate', 'living-shore-gate-L1'], ['Loading dock', 'dock-L1']]) {
      for (const [u, tag, z] of [[NOW, 'today-1x', 0], [SPIKE, 'spike-2x', 1]]) { const pg = await open(b, u, 320, 2); await elena(pg, 320); await inspectOn(pg); if (z) await zoom(pg, 'In'); const d = await doorId(pg, n); if (d) { await pick(pg, d); await clip(pg, `320-${f}-${tag}.png`); } await pg.context().close(); } }
    for (const [u, tag] of [[NOW, 'today'], [SPIKE + '&fp=quiet', 'quiet']]) for (const size of ['320', 'desktop']) { const pg = await open(b, u, size, 2); await elena(pg, size); for (const l of [1, 2]) { await ev(pg, l => vis('#nxLv' + l).click(), l); await clip(pg, `${size}-footprint-L${l}-${tag}.png`); } await pg.context().close(); }
    // full map view at 320 at 2x, with the controls, as a learner sees it
    const pg = await open(b, SPIKE, 320, 2); await elena(pg, 320); await inspectOn(pg); await zoom(pg, 'In'); await pick(pg, await doorId(pg, 'Quarantine')); await pg.waitForTimeout(150); await pg.screenshot({ path: SHOTS + '320-screen-spike-2x.png' }); await pg.context().close();
    const p2 = await open(b, NOW, 320, 2); await elena(p2, 320); await inspectOn(p2); await pick(p2, await doorId(p2, 'Quarantine')); await p2.waitForTimeout(150); await p2.screenshot({ path: SHOTS + '320-screen-today.png' }); await p2.context().close(); },
};
(async () => { const b = await chromium.launch(); let pass = 0, fail = 0;
  for (const [n, f] of Object.entries(tests)) { try { await f(b); pass++; console.log('ok  ', n); } catch (e) { fail++; console.log('FAIL', n, '\n     ', e.message.split('\n')[0]); } }
  fs.writeFileSync(O + 'measurements.json', JSON.stringify(out, null, 1) + '\n'); console.log(`${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0); })();
