// Cutaway spike measurements: marker and hit sizes, door spacing, tap accuracy at centre and towards the nearest
// neighbour, alignment of overlays with the base image, decode and render time, asset sizes. Prints JSON.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const U = pathToFileURL(path.join(__dirname, '../../docs/spikes/cutaway-poc.html')).href;
(async () => { const b = await chromium.launch(), out = { sizes: {}, widths: {} };
  for (const f of fs.readdirSync(path.join(__dirname, 'out')).filter(f => f.endsWith('.webp'))) out.sizes[f] = fs.statSync(path.join(__dirname, 'out', f)).size;
  out.sizes['cutaway-poc.html'] = fs.statSync(path.join(__dirname, '../../docs/spikes/cutaway-poc.html')).size;
  for (const [name, vw] of [['320', 320], ['400', 400], ['desktop', 1000]]) for (const v of ['A', 'B', 'C']) {
    const ctx = await b.newContext({ viewport: { width: vw, height: 800 }, hasTouch: vw < 500, isMobile: vw < 500 }), pg = await ctx.newPage(); await pg.goto(U);
    await pg.evaluate(v => __spike.set({ v, inspect: true }), v);
    const r = { scale: 0, visiblePx: 0, hitPx: 0, levels: {} };
    for (const l of [1, 2]) { await pg.evaluate(l => __spike.set({ level: l }), l);
      const m = await pg.evaluate(l => { const s = __spike.scale(), ds = Object.keys(Engine.DOORS).filter(d => Engine.doorLevel(d) === l), p = ds.map(d => __spike.doorP(d).map(z => z * s));
        let min = 1e9, pair = null; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) { const d = Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]); if (d < min) { min = d; pair = [ds[i], ds[j]]; } }
        const close = []; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) { const d = Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]); if (d < 48) close.push(`${ds[i]}~${ds[j]} ${d.toFixed(0)}px`); }
        return { scale: s, doors: ds, minSpacingPx: +min.toFixed(1), closest: pair, under48px: close }; }, l);
      r.scale = +m.scale.toFixed(2); r.visiblePx = 2 * 7; r.hitPx = 2 * 22;
      // physical taps: at each marker centre, and 10px towards the nearest other door
      const box = await pg.locator('#ovl').boundingBox(), miss = [];
      for (const d of m.doors) { const [x, y] = await pg.evaluate(d => __spike.doorP(d), d), s = m.scale, cx = box.x + x * s, cy = box.y + y * s;
        const nb = await pg.evaluate(([d, l]) => { const me = __spike.doorP(d); let best = null, bd = 1e9; for (const o of Object.keys(Engine.DOORS)) { if (o === d || Engine.doorLevel(o) !== l) continue; const q = __spike.doorP(o), dd = Math.hypot(q[0] - me[0], q[1] - me[1]); if (dd < bd) { bd = dd; best = q; } } return best && [best[0] - me[0], best[1] - me[1], bd]; }, [d, l]);
        for (const [tx, ty, label] of [[cx, cy, 'centre'], ...(nb ? [[cx + nb[0] / nb[2] * 10, cy + nb[1] / nb[2] * 10, '10px toward neighbour']] : [])]) {
          vw < 500 ? await pg.touchscreen.tap(tx, ty) : await pg.mouse.click(tx, ty); const sel = await pg.evaluate(() => __spike.st.sel);
          if (!sel || sel.door !== d) miss.push(`${d} ${label} -> ${sel && (sel.door || sel.space)}`); } }
      r.levels['L' + l] = { minSpacingPx: m.minSpacingPx, closest: m.closest, under48px: m.under48px, tapMisses: miss };
      // alignment: the lit rim of the overlay vs the floor plates of the base (same projection), checked numerically
      r.levels['L' + l].alignment = await pg.evaluate(l => { const G = SPIKE.geom[__spike.st.v]; let worst = 0; for (const [k, sp] of Object.entries(Engine.SPACES)) { if (sp.l !== l) continue;
        for (const rr of sp.r) { const [x, y] = __spike.P(rr[0], rr[1]); worst = Math.max(worst, Math.abs(x - rr[0]), Math.abs(y - (G.off + G.k * rr[1]))); } } return worst; }, l); }
    // decode: every base image, fresh
    r.decodeMs = await pg.evaluate(async () => { const t = []; for (const src of Object.values(SPIKE.img)) { const i = new Image(); i.src = src; const t0 = performance.now(); await i.decode(); t.push(performance.now() - t0); } return { max: Math.max(...t).toFixed(1), total: t.reduce((a, b) => a + b, 0).toFixed(1) }; });
    // render: overlay redraw time over a full walk
    await pg.evaluate(() => { window.__perf = []; __spike.set({ inspect: false, badge: 'ok' }); __spike.walk(); });
    await pg.waitForFunction(() => __spike.st.walk && __spike.st.walk.running === false, null, { timeout: 30000 });
    r.overlayMs = await pg.evaluate(() => { const p = window.__perf.slice().sort((a, b) => a - b); return { ticks: p.length, median: p[p.length >> 1].toFixed(2), p95: p[Math.floor(p.length * .95)].toFixed(2) }; });
    out.widths[`${name}-${v}`] = r; await ctx.close(); }
  console.log(JSON.stringify(out, null, 1)); await b.close(); })();
