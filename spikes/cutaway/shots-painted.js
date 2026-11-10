// Painted-concept review views: the registered painting under the same live overlays, variant C, 320 / 400 / desktop.
const { chromium } = require('playwright'), path = require('path'), { pathToFileURL } = require('url');
const U = pathToFileURL(path.join(__dirname, '../../docs/spikes/cutaway-poc.html')).href, O = path.join(__dirname, '../../docs/spikes/cutaway-shots/');
(async () => { const b = await chromium.launch();
  const shot = async (name, vw, o, act, full) => { const pg = await (await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 })).newPage();
    await pg.goto(U); await pg.evaluate(o => __spike.set(o), o); if (act) await act(pg); await pg.waitForTimeout(150); await (full ? pg : pg.locator('.map')).screenshot({ path: O + name + '.png', fullPage: !!full }); await pg.close(); };
  const walked = async pg => { await pg.evaluate(() => __spike.walk()); await pg.waitForFunction(() => __spike.st.walk.running === false, null, { timeout: 20000 }); };
  await shot('painted-desktop-1-art-only', 1000, { v: 'C', art: 'painted', badge: 'none' });
  await shot('painted-desktop-2-walk', 1000, { v: 'C', art: 'painted' }, walked);
  await shot('painted-desktop-3-lens-quarantine', 1000, { v: 'C', art: 'painted', inspect: true }, pg => pg.evaluate(() => __spike.set({ lens: __spike.P(140, 70), sel: { door: 'D-LSG' } })));
  await shot('painted-desktop-4-denied', 1000, { v: 'C', art: 'painted', badge: 'edu' }, async pg => { await walked(pg); await pg.evaluate(() => __spike.set({ inspect: true, sel: { door: 'D-WSE' }, lens: __spike.doorP('D-WSE') })); });
  await shot('painted-320-walk', 320, { v: 'C', art: 'painted' }, walked);
  await shot('painted-400-walk', 400, { v: 'C', art: 'painted' }, walked);
  await b.close(); })();
