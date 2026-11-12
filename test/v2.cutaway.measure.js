// Measurements of the flagged cutaway map at its rendered size (not a pass/fail test). Usage: node test/v2.cutaway.measure.js
// Writes docs/v2-cutaway-step3-measurements.json and screenshots to docs/v2-review-shots/cutaway-step3/.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const file = f => pathToFileURL(path.join(__dirname, '../dist', f)).href, PREVIEW = file('v2-cutaway-preview.html') + '?map=cutaway', FLAT = file('v2.html');
const O = path.join(__dirname, '../docs/v2-review-shots/cutaway-step3/'); fs.mkdirSync(O, { recursive: true });
const SIZES = { 320: [320, 568], 400: [400, 860], desktop: [1366, 900] };
(async () => { const b = await chromium.launch(), out = {};
  for (const [size, [w, h]] of Object.entries(SIZES)) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: 'reduce' }), pg = await ctx.newPage();
    await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); });
    await pg.goto(PREVIEW + '#/t/elena/configure'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]'); if (size !== 'desktop') await pg.click('#nxMapBtn');
    const m = await pg.evaluate(() => { const C = NxMap.cutaway, c = C.canvas(), ob = vis('#nxMapSvg').getBoundingClientRect(), sc = ob.width / c.w, r = {};
      r.map_px = [Math.round(ob.width), Math.round(ob.height)]; r.building_px_wide = Math.round(c.W * sc); r.px_per_map_unit = +sc.toFixed(3); r.marker_px = 2 * C.VIS_PX; r.marker_hit_px = 2 * C.HIT_PX; r.lens_px = Math.round(2 * C.LENS_R * sc);
      for (const l of [1, 2]) { const ds = Object.keys(Engine.DOORS).filter(d => Engine.doorLevel(d) === l), P = Object.fromEntries(ds.map(d => [d, C.cdoor(d)])); let best = [1e9];
        for (const a of ds) for (const e of ds) if (a < e) { const dd = Math.hypot(P[a][0] - P[e][0], P[a][1] - P[e][1]) * sc; if (dd < best[0]) best = [Math.round(dd), Engine.DOORS[a].n, Engine.DOORS[e].n]; }
        const rooms = {}; for (const [k, s] of Object.entries(Engine.SPACES)) { if (s.l !== l) continue; let n = 0, room = 0; for (const q of s.r) for (let x = q[0] + 1; x < q[0] + q[2]; x += 2) for (let y = q[1] + 1; y < q[1] + q[3]; y += 2) { n++; const [X, Y] = C.cpos(x, y), p = C.pick(X, Y, l, sc); if (p && p.space === k) room++; }
          rooms[s.n] = Math.round(100 * room / n); }
        r['L' + l] = { closest_markers_px: best, room_floor_where_a_tap_selects_the_room_pct: rooms }; }
      return r; });
    out[size] = m;
    const shot = async n => { await pg.waitForTimeout(150); await pg.evaluate(() => vis('#nxMapSvg').scrollIntoView({ block: 'center' })); const bx = await pg.evaluate(() => { const r = vis('#nxMapSvg').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }); await pg.screenshot({ path: O + size + '-' + n + '.png', clip: bx }); };
    await shot('1-footprint-L1'); await pg.evaluate(() => vis('#nxLv2').click()); await shot('2-footprint-L2'); await pg.evaluate(() => vis('#nxLv1').click());
    await pg.evaluate(() => vis('#nxInspect').click()); const pick = async d => pg.evaluate(d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d);
    await pick('D-LSG'); await shot('3-inspect-living-shore-gate'); await pick('D-DOCK'); await shot('4-inspect-dock-door'); await pick('D-QUAR'); await shot('5-inspect-quarantine-L2'); await pick('D-LIFE'); await shot('6-inspect-life-support-L2');
    await pg.evaluate(() => vis('#nxInspect').click()); if (size !== 'desktop') await pg.keyboard.press('Escape');
    await pg.goto(PREVIEW + '#/t/elena/verify'); await pg.click('[data-nx-key="walk"]'); await pg.waitForFunction(() => /Walk (complete|stopped)/.test((vis('#nxWalkNote') || {}).textContent || ''), null, { timeout: 30000 }); await shot('7-walk-complete');
    // the flat map at the same width, for comparison
    const fp = await ctx.newPage(); await fp.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); }); await fp.goto(FLAT + '#/t/elena/configure'); if (size !== 'desktop') await fp.click('#nxMapBtn');
    out[size].flat_map_for_comparison = await fp.evaluate(() => { const ob = vis('#nxMapSvg').getBoundingClientRect(), sc = ob.width / 400, r = { map_px: [Math.round(ob.width), Math.round(ob.height)], marker_px: Math.round(12 * sc), marker_hit_px: Math.round(36 * sc), lens_px: Math.round(112 * sc) };
      for (const l of [1, 2]) { const ds = Object.keys(Engine.DOORS).filter(d => Engine.doorLevel(d) === l); let best = 1e9; for (const a of ds) for (const e of ds) if (a < e) best = Math.min(best, Math.hypot(Engine.DOORS[a].p[0] - Engine.DOORS[e].p[0], Engine.DOORS[a].p[1] - Engine.DOORS[e].p[1]) * sc); r['L' + l + '_closest_markers_px'] = Math.round(best); } return r; });
    await ctx.close(); }
  fs.writeFileSync(path.join(__dirname, '../docs/v2-cutaway-step3-measurements.json'), JSON.stringify(out, null, 1) + '\n'); console.log(JSON.stringify(out, null, 1)); await b.close(); })();
