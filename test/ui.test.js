// Browser regression tests. Needs Playwright (not a project dependency): `npm i --no-save playwright && npx playwright install chromium`.
// Run: npm run test:ui  (builds first). Skips cleanly if Playwright is missing.
const assert = require('assert'), path = require('path'), { pathToFileURL } = require('url');
let chromium, devices; try { ({ chromium, devices } = require('playwright')); } catch (_) { console.log('skip: playwright not installed'); process.exit(0); }
const url = pathToFileURL(path.join(__dirname, '../dist/nautilus_access.html')).href;
const clickMap = async (pg, x, y) => { const b = await pg.locator('#map').boundingBox(); await pg.mouse.click(b.x + b.width * x / 400, b.y + b.height * y / 300); };
const text = async (pg, sel) => (await pg.textContent(sel)).replace(/\s+/g, ' ').trim();
const tests = {
  async 'tapping a door without Inspect reveals nothing'(pg) {
    await pg.click('#lv2'); await clickMap(pg, 97, 122);
    assert(/Turn on Inspect/.test(await text(pg, '#inspect')));
  },
  async 'Jordan: early close does not name the cause'(pg) {
    await pg.click('[data-q="jordan"]'); await pg.click('#closeBtn');
    const r = await text(pg, '.result'); assert(/Review incomplete/.test(r) && !/WO-1873|ended/.test(r), r);
  },
  async 'Jordan: ticket is a routine assignment; the account note is discoverable'(pg) {
    await pg.click('[data-q="jordan"]');
    assert(!/follow-up/.test(await text(pg, '#ticket .msg')));
    await pg.click('[data-rec="Account history"]'); assert(/follow-up work/.test(await text(pg, '#ticket')));
  },
  async 'Jordan: lens shows ended record neutrally, no verdict'(pg) {
    await pg.click('[data-q="jordan"]'); await pg.click('#lensBtn'); await pg.click('#lv2'); await clickMap(pg, 97, 122);
    const i = await text(pg, '#inspect'); assert(/WO-1873 · ended 2026-07-20/.test(i) && !/No active record/.test(i), i);
  },
  async 'Jordan: audit needs deactivation and a matching reason'(pg) {
    await pg.click('[data-q="jordan"]'); await pg.click('[data-rv]'); await pg.click('#closeBtn');
    assert(/Record a reason/.test(await text(pg, '.result')));
    await pg.click('[data-dp="followup"]'); await pg.click('#closeBtn'); assert(/does not match/.test(await text(pg, '.result')));
    await pg.click('[data-dp="ended"]'); await pg.click('#closeBtn'); assert(/Ticket closed/.test(await text(pg, '.result')));
  },
  async 'Jordan: the walk before the fix succeeds'(pg) {
    await pg.click('[data-q="jordan"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 15000 });
  },
  async 'Marcus: schedule-only change is not reported as "no change"'(pg) {
    await pg.click('[data-q="marcus"]'); await pg.click('[data-gs]');
    const r = await text(pg, '#review');
    assert(/Same places, different hours/.test(r) && /all 12 Dive Crew badges/.test(r) && !/didn't alter/.test(r), r);
    await pg.click('[data-gs]'); await pg.click('[data-x]');
    assert(/this badge only/.test(await text(pg, '#review')));
  },
  async 'mobile emulation honors the viewport tag (layout width is the device width, map fills it)'(pg, b) {
    const ctx = await b.newContext(devices['Pixel 7']), m = await ctx.newPage(); await m.goto(url);
    const r = await m.evaluate(() => ({ w: innerWidth, sw: document.documentElement.scrollWidth, map: document.getElementById('map').getBoundingClientRect().width }));
    await ctx.close(); assert(r.w < 500 && r.sw <= r.w && r.map > r.w * 0.8, JSON.stringify(r));
  },
  async 'phone portrait: map stays in view while scrolling to a control, and the consequence is visible'(pg, b) {
    const ctx = await b.newContext(devices['Pixel 7']), m = await ctx.newPage(); await m.goto(url); await m.click('[data-q="marcus"]');
    await m.locator('[data-gs]').scrollIntoViewIfNeeded(); await m.click('[data-gs]');
    const r = await m.evaluate(() => { const v = el => { const b = document.querySelector(el).getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; }; return { map: v('#map'), vh: innerHeight, review: document.getElementById('review').textContent }; });
    await ctx.close(); assert(r.map.top >= 0 && r.map.bottom <= r.vh, 'map not fully in view: ' + JSON.stringify(r.map));
    assert(/different hours/.test(r.review));
  },
  async 'phone portrait: Inspect switches to the inspection pane; badge pane returns'(pg, b) {
    const ctx = await b.newContext(devices['Pixel 7']), m = await ctx.newPage(); await m.goto(url); await m.click('[data-q="jordan"]');
    assert(await m.isVisible('#badge') && !(await m.isVisible('#inspect')));
    await m.click('#lensBtn'); await m.click('#lv2'); const bx = await m.locator('#map').boundingBox();
    await m.touchscreen.tap(bx.x + bx.width * 97 / 400, bx.y + bx.height * 122 / 300);
    assert(await m.isVisible('#inspect') && !(await m.isVisible('#badge')));
    assert(/Tank-top/.test(await text(m, '#inspect')), 'tap selected the door');
    await m.click('#lensBtn'); assert(await m.isVisible('#badge'));
    await ctx.close();
  },
  async 'phone landscape: whole map is visible on load, beside the ticket'(pg, b) {
    const ctx = await b.newContext(devices['Pixel 7 landscape']), m = await ctx.newPage(); await m.goto(url);
    const r = await m.evaluate(() => { const mb = document.getElementById('map').getBoundingClientRect(), tb = document.getElementById('ticket').getBoundingClientRect(); return { top: mb.top, bottom: mb.bottom, right: mb.right, vh: innerHeight, ticketLeft: tb.left, sw: document.documentElement.scrollWidth, w: innerWidth }; });
    await ctx.close(); assert(r.top >= 0 && r.bottom <= r.vh && r.right <= r.ticketLeft && r.sw <= r.w, JSON.stringify(r));
  },
  async 'phone: door tap targets are at least 24px and the map does not block page scroll when Inspect is off'(pg, b) {
    const ctx = await b.newContext(devices['Pixel 7']), m = await ctx.newPage(); await m.goto(url);
    const r = await m.evaluate(() => ({ scale: document.getElementById('map').getBoundingClientRect().width / 400, ta: document.getElementById('map').style.touchAction }));
    await ctx.close(); assert(r.scale * 18 * 2 >= 24, 'hit radius too small ' + r.scale); assert(r.ta === 'pan-y', r.ta);
  },
  async 'Elena still closes with the right groups'(pg) {
    await pg.click('[data-g="allStaff"]'); await pg.click('[data-g="education"]'); await pg.click('#closeBtn');
    assert(/Ticket closed/.test(await text(pg, '.result')));
  },
};
(async () => {
  const b = await chromium.launch(); let fail = 0;
  for (const [name, fn] of Object.entries(tests)) {
    const pg = await b.newPage({ viewport: { width: 400, height: 900 } }), errs = []; pg.on('pageerror', e => errs.push(e.message));
    try { await pg.goto(url); await fn(pg, b); assert.deepEqual(errs, []); console.log('ok', name); } catch (e) { fail++; console.log('FAIL', name, '\n  ', e.message.slice(0, 300)); }
    await pg.close();
  }
  await b.close(); process.exit(fail ? 1 : 0);
})();
