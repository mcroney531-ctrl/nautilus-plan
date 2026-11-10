// Level 1 review of the painted master in the spike page: views and real taps at 320 / 400 / desktop.
// Usage: node spikes/cutaway/l1-review.js   -> docs/spikes/cutaway-shots/l1-review/*.png and l1-review.json
// Views kept: every state at 320 px, three representative desktop views. Taps run at all three widths.
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const U = pathToFileURL(path.join(__dirname, '../../docs/spikes/cutaway-poc.html')).href, O = path.join(__dirname, '../../docs/spikes/cutaway-shots/l1-review/');
const E = require('../../src/engine.js'); fs.mkdirSync(O, { recursive: true });
const PASSAGES = { 'reef-jelly': [289, 80], 'reef-seasonal': [289, 157] };
(async () => { const b = await chromium.launch(), out = { taps: {}, passages: {} };
  for (const [tag, vw] of [['320', 320], ['400', 400], ['desktop', 1000]]) {
    const pg = await (await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2, hasTouch: vw < 500 })).newPage(); await pg.goto(U);
    const KEEP = { '320': null, '400': [], desktop: ['2-granted', '4-walk-denied', '6-inspect-dock-door'] }[tag];  // 320: every state; 400: taps only; desktop: three representative views
    const set = o => pg.evaluate(o => __spike.set(o), o), shot = async n => { if (KEEP && !KEEP.includes(n)) return; await pg.waitForTimeout(120); await pg.locator('.map').screenshot({ path: O + tag + '-' + n + '.png' }); };
    const walked = async () => { await pg.evaluate(() => __spike.walk()); await pg.waitForFunction(() => __spike.st.walk.running === false, null, { timeout: 20000 }); };
    const base = { v: 'C', art: 'painted', level: 1, inspect: false, lens: null, sel: null, walk: null };
    await set({ ...base, badge: 'none' }); await shot('1-not-granted');
    await set({ ...base, badge: 'ok' }); await shot('2-granted');
    await walked(); await shot('3-walk-complete');
    await set({ ...base, badge: 'edu' }); await walked(); await shot('4-walk-denied');
    await pg.evaluate(() => __spike.set({ inspect: true, sel: { door: 'D-WSE' }, lens: __spike.doorP('D-WSE') })); await shot('5-inspect-denied-door');
    await set({ ...base, badge: 'ok' }); await pg.evaluate(() => __spike.set({ inspect: true, sel: { door: 'D-DOCK' }, lens: __spike.doorP('D-DOCK') })); await shot('6-inspect-dock-door');
    for (const [n, p] of Object.entries(PASSAGES)) { await pg.evaluate(p => __spike.set({ inspect: true, sel: null, lens: __spike.P(p[0], p[1]) }), p); await shot('7-lens-' + n); }
    // real taps: every L1 door at its marker, in inspect mode, must select that door
    const box = await pg.locator('#ovl').boundingBox(), sc = box.width / 400, res = {};
    for (const d of Object.keys(E.DOORS).filter(d => E.doorLevel(d) === 1)) {
      await set({ ...base, badge: 'ok', inspect: true }); const [x, y] = await pg.evaluate(d => __spike.doorP(d), d);
      await pg.mouse.click(box.x + x * sc, box.y + y * sc); res[d] = await pg.evaluate(() => __spike.st.sel && __spike.st.sel.door);
    }
    out.taps[tag] = { doors: Object.keys(res).length, wrong: Object.entries(res).filter(([d, got]) => got !== d).map(([d, got]) => d + ' -> ' + got) };
    // a tap on each open passage must not select a door (there is none there)
    out.passages[tag] = {};
    for (const [n, p] of Object.entries(PASSAGES)) { await set({ ...base, badge: 'ok', inspect: true }); const [x, y] = await pg.evaluate(p => __spike.P(p[0], p[1]), p);
      await pg.mouse.click(box.x + x * sc, box.y + y * sc); out.passages[tag][n] = await pg.evaluate(() => JSON.stringify(__spike.st.sel)); }
    await pg.close();
  }
  fs.writeFileSync(O + 'l1-review.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out)); await b.close(); })();
