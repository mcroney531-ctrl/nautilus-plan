// Review screenshots for cutaway Step 4 (not pass/fail). Usage: node test/v2.cutaway.step4.shots.js -> docs/v2-review-shots/cutaway-step4/
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const PREVIEW = pathToFileURL(path.join(__dirname, '../dist/v2-cutaway-preview.html')).href + '?map=cutaway', O = path.join(__dirname, '../docs/v2-review-shots/cutaway-step4/'); fs.mkdirSync(O, { recursive: true });
const SIZES = { 320: [320, 568], 400: [400, 860], desktop: [1366, 900] };
(async () => { const b = await chromium.launch();
  for (const [size, [w, h]] of Object.entries(SIZES)) { const pg = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: 'reduce' })).newPage();
    await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); });
    await pg.goto(PREVIEW + '#/t/elena/configure'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]'); if (size !== 'desktop') await pg.click('#nxMapBtn');
    const shot = async n => { await pg.waitForTimeout(200); const el = (await pg.evaluateHandle(() => vis('.nx-map'))).asElement(); await el.screenshot({ path: O + `${size}-${n}.png` }); };
    const find = v => pg.evaluate(v => { const s = vis('#nxFind'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    await pg.evaluate(() => vis('#nxLv1').click()); await shot('1-overview-L1'); await pg.evaluate(() => vis('#nxLv2').click()); await shot('2-overview-L2');
    for (const [v, n] of [['room|reef|1', '3-identify-room'], ['door|D-DOCK|1', '4-identify-door'], ['passage|reef~jelly|1', '5-identify-passage'], ['core|westCore2|2', '6-identify-stair-core'], ['void|1|2', '7-identify-void'], ['room|quarantine|2', '8-identify-restricted-room']]) { await find(v); await shot(n); }
    await pg.evaluate(() => vis('#nxInspect').click()); await pg.evaluate(() => { const s = vis('#nxDoorPick'); s.value = 'D-QUAR'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await shot('9-inspect-1x-quarantine');
    await pg.evaluate(() => vis('#nxZoom').click()); await shot('10-inspect-2x-quarantine');
    await pg.context().close(); }
  await b.close(); console.log('shots in', O); })();
