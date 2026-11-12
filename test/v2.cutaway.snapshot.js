// Records the flagged cutaway's overlay output for a fixed set of states, so a later change can be compared with it.
// Usage: node test/v2.cutaway.snapshot.js <out.json>   (Step 3's record: test/golden/cutaway-step3-overlay.json)
const { chromium } = require('playwright'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const PREVIEW = pathToFileURL(path.join(__dirname, '../dist/v2-cutaway-preview.html')).href + '?map=cutaway';
const SIZES = { 320: [320, 568], 400: [400, 860], desktop: [1366, 900] };
const snap = module.exports = async (b, size) => { const pg = await (await b.newContext({ viewport: { width: SIZES[size][0], height: SIZES[size][1] }, reducedMotion: 'reduce' })).newPage();
  await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); });
  await pg.goto(PREVIEW + '#/t/elena/configure'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]'); if (size !== 'desktop') await pg.click('#nxMapBtn');
  const grab = () => pg.evaluate(() => [vis('#nxMapSvg').innerHTML, vis('#nxMapSvg').getAttribute('viewBox'), (vis('#nxMapSvg').parentNode.querySelector('.nx-map-lensimg').style.display==='none'?'none':vis('#nxMapSvg').parentNode.querySelector('.nx-map-lensimg').style.clipPath)].join('|')), out = {};
  for (const l of [1, 2]) { await pg.evaluate(l => vis('#nxLv' + l).click(), l); out['overview-L' + l] = await grab(); }
  await pg.evaluate(() => vis('#nxInspect').click());
  for (const d of ['D-LSG', 'D-DOCK', 'D-QUAR', 'D-LIFE']) { await pg.evaluate(d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d); out['inspect-' + d] = await grab(); }
  await pg.context().close(); return out; };
if (require.main === module) (async () => { const b = await chromium.launch(), out = {}; for (const s of Object.keys(SIZES)) out[s] = await snap(b, s); await b.close();
  fs.writeFileSync(process.argv[2], JSON.stringify(out) + '\n'); console.log('wrote', process.argv[2]); })();
