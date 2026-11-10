// Review views for the cutaway spike: blockout and treated, same overlays, at 320 / 400 / desktop, both variants.
const { chromium } = require('playwright'), path = require('path'), { pathToFileURL } = require('url');
const U = pathToFileURL(path.join(__dirname, '../../docs/spikes/cutaway-poc.html')).href, O = path.join(__dirname, '../../docs/spikes/cutaway-shots/');
(async () => { const b = await chromium.launch();
  const shot = async (name, vw, o, act, full) => { const pg = await (await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2 })).newPage();
    await pg.goto(U); await pg.evaluate(o => __spike.set(o), o); if (act) await act(pg); await pg.waitForTimeout(100); await (full ? pg : pg.locator('.map')).screenshot({ path: O + name + '.png', fullPage: !!full }); await pg.close(); };
  const walked = async pg => { await pg.evaluate(() => __spike.walk()); await pg.waitForFunction(() => __spike.st.walk.running === false, null, { timeout: 20000 }); };
  for (const v of ['A', 'B', 'C']) {
    await shot(`desktop-${v}-1-blockout-walk`, 1000, { v, art: 'blockout' }, walked);
    await shot(`desktop-${v}-2-treated-walk`, 1000, { v, art: 'treated' }, walked);
    await shot(`desktop-${v}-3-treated-lens`, 1000, { v, art: 'treated', inspect: true, level: 1 }, pg => pg.evaluate(() => __spike.set({ lens: __spike.P(140, 70), sel: { door: 'D-LSG' } })));
    await shot(`320-${v}-treated-walk`, 320, { v, art: 'treated' }, walked);
    await shot(`320-${v}-hit-areas-L2`, 320, { v, art: 'treated', level: 2, hits: true, inspect: true });
    await shot(`400-${v}-treated-denied-inspected`, 400, { v, art: 'treated', badge: 'edu' }, async pg => { await walked(pg); await pg.evaluate(() => __spike.set({ inspect: true, sel: { door: 'D-WSE' }, lens: __spike.doorP('D-WSE') })); }, true);
  }
  await b.close(); })();
