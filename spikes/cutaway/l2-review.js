// Level 2 review of the painted master in the spike page: views, real taps, picker, marker clipping and spacing at 320 / 400 / desktop.
// Usage: node spikes/cutaway/l2-review.js   -> docs/spikes/cutaway-shots/l2-review/*.png and l2-review.json
// Badges: 'ops' = Exhibit Operations (west side of L2), 'dive' = Dive Crew (east side), 'av' = Temporary Exhibit AV.
// Scenarios 'jordan' (AV vendor, 10:00) and 'marcus' (dive crew lead, 05:30) supply the walks.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const U = pathToFileURL(path.join(__dirname, '../../docs/spikes/cutaway-poc.html')).href, O = path.join(__dirname, '../../docs/spikes/cutaway-shots/l2-review/');
const E = require('../../src/engine.js'); fs.mkdirSync(O, { recursive: true }); const L2 = Object.keys(E.DOORS).filter(d => E.doorLevel(d) === 2);
(async () => { const b = await chromium.launch(), out = { taps: {}, passage_tap: {}, picker: {}, clipped_markers: {}, closest_markers_px: {}, walks: {} };
  for (const [tag, vw] of [['320', 320], ['400', 400], ['desktop', 1000]]) {
    const pg = await (await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2, hasTouch: vw < 500 })).newPage(); await pg.goto(U);
    const KEEP = { '320': null, '400': [], desktop: ['2-granted-ops', '3-granted-dive', '6-inspect-life-support', '8-lens-L1-over-reef'] }[tag];
    const set = o => pg.evaluate(o => __spike.set(o), o), shot = async n => { if (KEEP && !KEEP.includes(n)) return; await pg.waitForTimeout(120); await pg.locator('.map').screenshot({ path: O + tag + '-' + n + '.png' }); };
    const walked = async () => { await pg.evaluate(() => __spike.walk()); await pg.waitForFunction(() => __spike.st.walk.running === false, null, { timeout: 30000 }); return pg.evaluate(() => ({ status: document.getElementById('wstat').textContent, level: __spike.st.level })); };
    const base = { sc: 'elena', v: 'C', art: 'painted', level: 2, inspect: false, lens: null, sel: null, walk: null };
    await set({ ...base, badge: 'none' }); await shot('1-not-granted');
    await set({ ...base, badge: 'ops' }); await shot('2-granted-ops');
    await set({ ...base, badge: 'dive' }); await shot('3-granted-dive');
    await set({ ...base, sc: 'jordan', badge: 'av' }); out.walks[tag] = { 'AV vendor to the catwalks (10:00)': await walked() }; await shot('4-walk-to-catwalks');
    await set({ ...base, sc: 'marcus', badge: 'dive' }); out.walks[tag]['dive crew lead at 05:30'] = await walked(); await shot('5-walk-stopped');
    await set({ ...base, badge: 'ops' }); await pg.evaluate(() => __spike.set({ inspect: true, sel: { door: 'D-QUAR' }, lens: __spike.doorP('D-QUAR') })); await shot('6-inspect-quarantine');
    await set({ ...base, badge: 'dive' }); await pg.evaluate(() => __spike.set({ inspect: true, sel: { door: 'D-LIFE' }, lens: __spike.doorP('D-LIFE') })); await shot('6-inspect-life-support');
    for (const [n, lv, p] of [['L2-over-reef', 2, [243, 123]], ['L2-over-atrium-void', 2, [256, 246]], ['L2-over-classroom-void', 2, [143, 227]], ['L2-over-west-core', 2, [32, 27]], ['L1-over-reef', 1, [243, 123]], ['L1-over-atrium', 1, [256, 246]], ['L1-over-west-core', 1, [32, 27]], ['L1-over-east-core', 1, [368, 27]]]) {
      await set({ ...base, badge: 'ops', level: lv }); await pg.evaluate(p => __spike.set({ inspect: true, sel: null, lens: __spike.P(p[0], p[1]) }), p); await shot('8-lens-' + n); }
    const box = await pg.locator('#ovl').boundingBox(), sc = box.width / 400, res = {}, pts = {};
    for (const d of L2) { await set({ ...base, badge: 'ops', inspect: true }); const [x, y] = await pg.evaluate(d => __spike.doorP(d), d); pts[d] = [x * sc, y * sc];
      await pg.mouse.click(box.x + x * sc, box.y + y * sc); res[d] = await pg.evaluate(() => __spike.st.sel && __spike.st.sel.door); }
    out.taps[tag] = { doors: L2.length, wrong: Object.entries(res).filter(([d, g]) => g !== d).map(([d, g]) => d + ' -> ' + g) };
    await set({ ...base, badge: 'ops', inspect: true }); { const [x, y] = await pg.evaluate(() => __spike.P(54, 141)); await pg.mouse.click(box.x + x * sc, box.y + y * sc); out.passage_tap[tag] = await pg.evaluate(() => JSON.stringify(__spike.st.sel)); }
    const pick = {}; for (const d of L2) { await set({ ...base, level: 1, badge: 'ops' }); await pg.selectOption('#pick', d); pick[d] = await pg.evaluate(() => [__spike.st.sel && __spike.st.sel.door, __spike.st.level, __spike.st.inspect]); }
    out.picker[tag] = { doors: L2.length, wrong: Object.entries(pick).filter(([d, v]) => v[0] !== d || v[1] !== 2 || v[2] !== true).map(([d]) => d) };
    out.clipped_markers[tag] = L2.filter(d => pts[d][0] - 9 < 0 || pts[d][0] + 9 > box.width || pts[d][1] - 9 < 0 || pts[d][1] + 9 > box.height);
    let best = [1e9]; for (const a of L2) for (const c of L2) if (a < c) { const dd = Math.hypot(pts[a][0] - pts[c][0], pts[a][1] - pts[c][1]); if (dd < best[0]) best = [Math.round(dd), a, c]; } out.closest_markers_px[tag] = best;
    await pg.close(); }
  fs.writeFileSync(O + 'l2-review.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1)); await b.close(); })();
