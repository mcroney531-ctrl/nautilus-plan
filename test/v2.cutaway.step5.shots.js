// Review screenshots for cutaway Step 5 (not pass/fail): change review and inspection evidence, cutaway beside the flat map.
// Usage: node test/v2.cutaway.step5.shots.js -> docs/v2-review-shots/cutaway-step5/
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const ON = pathToFileURL(path.join(__dirname, '../dist/v2-cutaway-preview.html')).href + '?map=cutaway', OFF = pathToFileURL(path.join(__dirname, '../dist/v2.html')).href + '?';
const O = path.join(__dirname, '../docs/v2-review-shots/cutaway-step5/'); fs.mkdirSync(O, { recursive: true });
(async () => { const b = await chromium.launch();
  for (const [size, w, h] of [['320', 320, 568], ['desktop', 1366, 900]]) for (const [tag, url] of [['cutaway', ON], ['flat', OFF]]) {
    const pg = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: 'reduce' })).newPage();
    await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); });
    const go = async hsh => { await pg.goto(url + '#' + hsh); await pg.waitForTimeout(60); }, map = async () => { if (size !== 'desktop' && !(await pg.evaluate(() => document.getElementById('nxMapDlg').open))) await pg.click('#nxMapBtn'); await pg.waitForTimeout(150); };
    const shot = async n => { await pg.waitForTimeout(200); const el = (await pg.evaluateHandle(() => vis('.nx-map'))).asElement(); await el.screenshot({ path: O + `${size}-${n}-${tag}.png` }); };
    const lv = l => pg.evaluate(l => vis('#nxLv' + l).click(), l), pick = d => pg.evaluate(d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d);
    await go('/t/elena/configure'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-exhibitOps"]'); await map(); await lv(2); await shot('1-change-added-quarantine-L2');
    if (size !== 'desktop') await pg.keyboard.press('Escape'); await pg.uncheck('[data-nx-key="g-exhibitOps"]'); await map(); await shot('2-change-removed-quarantine-L2');
    if (size !== 'desktop') await pg.keyboard.press('Escape'); await go('/t/jordan/decide'); await pg.check('[data-nx-key="rv"]'); await map(); await lv(1); await shot('3-change-deactivated-L1');
    if (size !== 'desktop') await pg.keyboard.press('Escape'); await go('/t/marcus/review'); await map(); await pg.evaluate(() => vis('#nxInspect').click()); await pick('D-DIVE'); await shot('4-evidence-cameron-dive-locker');
    if (size !== 'desktop') await pg.keyboard.press('Escape'); await go('/t/daniel/review'); await map(); await pg.evaluate(() => vis('#nxInspect').click()); await pick('D-DOCK'); await shot('5-evidence-daniel-dock');
    await pg.context().close(); }
  await b.close(); console.log('shots in', O); })();
