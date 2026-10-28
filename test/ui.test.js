// Browser regression tests. Needs Playwright (not a project dependency): `npm i --no-save playwright && npx playwright install chromium`.
// Run: npm run test:ui  (builds first). Skips cleanly if Playwright is missing.
const assert = require('assert'), path = require('path'), { pathToFileURL } = require('url');
let chromium, devices; try { ({ chromium, devices } = require('playwright')); } catch (_) { console.log('skip: playwright not installed'); process.exit(0); }
const url = pathToFileURL(path.join(__dirname, '../dist/nautilus_access.html')).href;
const clickMap = async (pg, x, y) => { await pg.locator('#map').scrollIntoViewIfNeeded(); const b = await pg.locator('#map').boundingBox(); await pg.mouse.click(b.x + b.width * x / 400, b.y + b.height * y / 300); };
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
    await m.click('#lensBtn'); await m.click('#lv2'); await m.locator('#map').scrollIntoViewIfNeeded(); const bx = await m.locator('#map').boundingBox();
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
  async 'Daniel: the walk fails at the dock without saying why; inspection shows the reader fault'(pg) {
    await pg.click('[data-q="daniel"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /didn't open/.test(document.getElementById('review').textContent), null, { timeout: 15000 });
    const log = await text(pg, '.walklog'); assert(/Loading dock: didn't open/.test(log) && !/fault/i.test(log), log);
    await pg.click('#lensBtn'); await clickMap(pg, 388, 250);
    const i = await text(pg, '#inspect'); assert(/Fault/.test(i) && /reader fault/.test(i), i);
  },
  async 'Daniel: closing without walking the chosen route is refused'(pg) {
    await pg.click('[data-q="daniel"]'); await pg.click('[data-rt="escortWest"]'); await pg.click('#closeBtn');
    assert(/Walk Daniel in by this route/.test(await text(pg, '.result')));
  },
  async 'Daniel: escort route (transfer shown, escort badge evaluated) closes with the tradeoff'(pg) {
    await pg.click('[data-q="daniel"]'); await pg.click('[data-rt="escortWest"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 });
    const log = await text(pg, '.walklog'); assert(/Loading dock to West staff entrance/.test(log) && /Priya's badge: opened/.test(log), log);
    await pg.click('#closeBtn'); const r = await text(pg, '.result'); assert(/Ticket closed/.test(r) && /hand cart/.test(r), r);
  },
  async 'Daniel: unescorted shortcut works but is flagged as outside scope'(pg) {
    await pg.click('[data-q="daniel"]'); await pg.click('[data-g="allStaff"]'); await pg.click('[data-rt="selfWest"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 });
    await pg.click('#closeBtn'); assert(/outside the approved scope/.test(await text(pg, '.result')));
  },
  async 'Daniel: holding for repair is accepted as a costed choice, with no walk'(pg) {
    await pg.click('[data-q="daniel"]'); await pg.click('[data-rt="wait"]');
    assert(await pg.isDisabled('#walkBtn')); await pg.click('#closeBtn'); const r = await text(pg, '.result'); assert(/Closed, delivery delayed/.test(r) && /missed|40-minute window/.test(r) && /Facilities/.test(r), r);
  },
  async 'Marcus: change review names the change and the grant that still supplies access'(pg) {
    await pg.click('[data-q="marcus"]'); await pg.click('[data-x]'); await pg.click('[data-gs]'); await pg.click('[data-x]');
    const r = await text(pg, '#review');
    assert(/Removed the time exception from WO-2291/.test(r) && /Dive Crew with its changed group hours/.test(r) && /all 12 badges/.test(r) && !/Another group/.test(r), r);
  },
  async 'phone: Inspect is the only switch; turning it off returns the badge pane and normal map mode'(pg, b) {
    const ctx = await b.newContext(devices['Pixel 7']), m = await ctx.newPage(); await m.goto(url);
    assert.equal(await m.locator('#paneBadge, #paneInspect').count(), 0);
    await m.click('#lensBtn'); assert(await m.isVisible('#inspect') && !(await m.isVisible('#badge')));
    await m.click('#lv2'); const bx = await m.locator('#map').boundingBox(); await m.touchscreen.tap(bx.x + bx.width * 97 / 400, bx.y + bx.height * 122 / 300);
    const sel = await text(m, '#inspect');
    await m.click('#lensBtn'); assert(await m.isVisible('#badge') && !(await m.isVisible('#inspect')));
    await m.touchscreen.tap(bx.x + bx.width * 97 / 400, bx.y + bx.height * 77 / 300);
    await m.click('#lensBtn'); assert.equal(await text(m, '#inspect'), sel, 'selection kept; taps with Inspect off did nothing');
    await ctx.close();
  },
  async 'phone: all four tickets are visible in the queue (Pixel 7 and iPhone SE)'(pg, b) {
    for (const dev of ['Pixel 7', 'iPhone SE']) {
      const ctx = await b.newContext(devices[dev]), m = await ctx.newPage(); await m.goto(url);
      const r = await m.evaluate(() => [...document.querySelectorAll('.qt')].map(e => { const q = e.getBoundingClientRect(); return [e.textContent.trim(), q.left >= 0 && q.right <= innerWidth]; }));
      await ctx.close(); assert(r.length === 4 && r.every(x => x[1]), dev + ' ' + JSON.stringify(r));
    }
  },
  async 'phone: controls scrolled into view are not hidden under the pinned map (Jordan, two sizes)'(pg, b) {
    for (const dev of ['Pixel 7', 'iPhone SE']) {
      const ctx = await b.newContext(devices[dev]), m = await ctx.newPage(); await m.goto(url); await m.click('[data-q="jordan"]');
      for (const sel of ['[data-dp="works"]', '[data-rv]', '#review']) {
        await m.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'start' }), sel);
        const r = await m.evaluate(s => ({ top: document.querySelector(s).getBoundingClientRect().top, mapBottom: document.getElementById('mapcard').getBoundingClientRect().bottom }), sel);
        assert(r.top >= r.mapBottom - 1, `${dev} ${sel} ${JSON.stringify(r)}`);
      }
      await m.locator('[data-dp="works"]').scrollIntoViewIfNeeded(); await m.click('[data-dp="works"]');
      assert.equal(await m.getAttribute('[data-dp="works"]', 'aria-pressed'), 'true', dev + ' could click the last reason');
      await ctx.close();
    }
  },
  async 'phone: the L2 lit dot does not wrap the toolbar, and the pinned-map offset matches the card (iPhone SE, every ticket)'(pg, b) {
    const ctx = await b.newContext(devices['iPhone SE']), m = await ctx.newPage(), heads = []; await m.goto(url);
    for (const q of ['elena', 'marcus', 'jordan', 'daniel']) {
      await m.click(`[data-q="${q}"]`);
      const r = await m.evaluate(() => ({ l1: document.getElementById('lv1').offsetHeight, l2: document.getElementById('lv2').offsetHeight, dot: !!document.querySelector('#lv2 .litdot'),
        head: document.querySelector('#mapcard .maphead').offsetHeight,
        stick: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stick')), card: document.getElementById('mapcard').offsetHeight + 12,
        overflow: document.documentElement.scrollWidth - innerWidth }));
      assert(r.l2 === r.l1 && r.stick === r.card && r.overflow <= 0, `${q} ${JSON.stringify(r)}`);
      heads.push(r.head);
    }
    assert(heads.every(h => h === heads[0]), 'toolbar height is the same with and without the L2 dot: ' + heads);
    await ctx.close();
  },
  async 'Elena: the scanner plays out on its own, and reduced motion goes straight to the record'(pg, b) {
    const walkClose = async m => { await m.click('[data-g="allStaff"]'); await m.click('[data-g="education"]'); await m.click('#walkBtn');
      await m.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 }); await m.click('#closeBtn'); };
    await walkClose(pg); await pg.waitForFunction(() => !document.querySelector('#artDlg .moment.scan'), null, { timeout: 3000 });
    assert.equal(await pg.evaluate(() => document.activeElement.id), 'momentOk');
    const ctx = await b.newContext({ reducedMotion: 'reduce' }), m = await ctx.newPage(); await m.goto(url); await walkClose(m);
    assert(await m.$eval('#artDlg', d => d.open && !d.querySelector('.scanner')), 'reduced motion: no scanner');
    assert.equal(await m.evaluate(() => document.activeElement.id), 'momentOk'); await ctx.close();
  },
  async 'Daniel: nothing before inspection names the fault or the repair'(pg) {
    await pg.click('[data-q="daniel"]'); await pg.click('[data-rec="Facilities procedures"]');
    const v = await text(pg, '#ticket') + ' ' + await text(pg, '#badge');
    assert(!/fault|repair/i.test(v), v.match(/.{0,40}(fault|repair).{0,40}/i)?.[0]);
    await pg.click('#lensBtn'); await clickMap(pg, 388, 250);
    assert(/Fault/.test(await text(pg, '#inspect')) && /about 90 minutes to repair/.test(await text(pg, '#inspect')));
  },
  async 'briefing shows on first visit and stays dismissed after Start shift'(pg) {
    assert(await pg.isVisible('#brief')); await pg.click('#briefBtn'); assert(!(await pg.isVisible('#brief')));
    await pg.reload(); assert(!(await pg.isVisible('#brief')));
  },
  async 'Elena: workflow landmarks, coaching, visible verify requirement, issued credential record, optional template comparison'(pg) {
    assert(/Read what Elena needs/.test(await text(pg, '#flow')));
    await pg.click('[data-g="allStaff"]'); await pg.click('[data-g="education"]');
    assert(/Walk Elena in to check/.test(await text(pg, '#flow')));
    assert(/Opens 4 doors/.test(await text(pg, '#badge')) && /Walk Elena in first/.test(await text(pg, '#badge')));
    assert.equal((await text(pg, '#closeBtn')), 'Issue badge');
    await pg.click('#walkBtn'); await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 });
    await pg.click('#closeBtn');
    assert(await pg.$eval('#artDlg', d => d.open), 'issuing opens the record moment');
    assert(await pg.$eval('#artDlg .moment', m => m.classList.contains('scan')), 'issuing starts with the scanner');
    const sc = await text(pg, '#artDlg .scanner');
    assert(/Issuing credential · Elena Park/.test(sc) && /Marine Educator/.test(sc) && /STAFF/.test(sc) && /Assigned groups · All Staff \+ Education/.test(sc), sc);
    await pg.mouse.click(20, 20);
    assert(await pg.$eval('#artDlg', d => d.open && !d.querySelector('.moment').classList.contains('scan')), 'a tap during the scan advances to the record without closing');
    assert.equal(await pg.evaluate(() => document.activeElement.id), 'momentOk', 'focus moves to the way to the details');
    await pg.click('#momentOk'); assert(!(await pg.$eval('#artDlg', d => d.open)));
    assert.equal(await pg.evaluate(() => document.activeElement.textContent), 'Record details', 'closing the moment lands on the readable record');
    await pg.click('#artBtn'); assert(await pg.$eval('#artDlg', d => d.open && !d.querySelector('.scanner')), 'reopening the record does not replay the scanner');
    await pg.keyboard.press('Escape');
    const r = await text(pg, '.record');
    assert(/Credential issued/.test(r) && /Issued/.test(r) && /Verified/.test(r) && /West Staff Entrance/.test(r) && /Least privilege/.test(r), r);
    const slots = await pg.$$eval('.record .art .slot', s => s.map(x => x.textContent));
    assert.deepEqual(slots.slice(0, 5), ['Elena Park', 'Marine Educator', 'Education', 'WA-1041', 'All Staff, Education'], 'issuance art carries live record values');
    assert(/Walk test passed/.test(slots[6]) && /Hours: All Staff/.test(slots[7]), slots.join(' | '));
    assert(await pg.$eval('.record .art img', i => i.complete && i.naturalWidth === 1025 && /fictional/.test(i.alt)), 'art loads with an alt text');
    assert.equal(await pg.locator('#flow li.done').count(), 4, 'all four landmarks done after closing');
    await pg.click('#compareBtn'); const rv = await text(pg, '#review');
    assert(/Comparison/.test(rv) && /Quarantine/.test(rv) && /Topside/.test(rv), rv);
    assert(/has lit areas/.test(await pg.getAttribute('#lv2', 'aria-label')));
    assert(/Ticket closed/.test(await text(pg, '.result')), 'comparison did not change the closed result');
  },
  async 'Marcus: the inspect hint appears only after the walk fails'(pg) {
    await pg.click('[data-q="marcus"]'); assert(!/Inspect that door/.test(await text(pg, '#flow')));
    await pg.click('#walkBtn'); await pg.waitForFunction(() => /didn't open/.test(document.getElementById('review').textContent), null, { timeout: 15000 });
    assert(/Inspect that door/.test(await text(pg, '#flow')));
  },
  async 'Jordan: ticket shows dates without a verdict; removing groups alone is partial offboarding'(pg) {
    await pg.click('[data-q="jordan"]'); await pg.click('[data-rec="WO-1873"]');
    assert(!/Ended/.test(await text(pg, '#ticket')) && /Jul 20, 2026/.test(await text(pg, '#ticket')));
    await pg.click('[data-g="tempExhibitAV"]'); await pg.click('[data-dp="ended"]');
    assert(/Recorded: Groups removed, credential still active · Work authorization ended/.test(await text(pg, '#badge')));
    await pg.click('#closeBtn'); let r = await text(pg, '.result');
    assert(/Offboarding incomplete/.test(r) && !/opens/i.test(r.split('Offboarding incomplete')[1].split('.')[0]), r);
    await pg.click('[data-rv]'); await pg.click('#closeBtn'); r = await text(pg, '.record');
    assert(/Audit recorded/.test(r) && /Deactivated/.test(r) && /Ticket closed/.test(r), r);
  },
  async 'Daniel: escort record names the designated escort'(pg) {
    await pg.click('[data-q="daniel"]'); assert(/designated vendor escort/.test(await text(pg, '#badge')));
    await pg.click('[data-rt="escortWest"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 });
    await pg.click('#closeBtn'); const r = await text(pg, '.record'); assert(/Entry recorded/.test(r) && /ESC-07/.test(r), r);
  },
  async 'end-of-shift summary appears once all four tickets are closed'(pg) {
    assert(!(await pg.isVisible('#shift')));
    await pg.click('[data-g="allStaff"]'); await pg.click('[data-g="education"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 }); await pg.click('#closeBtn'); await pg.click('#momentOk');
    await pg.click('[data-q="marcus"]'); await pg.click('[data-x]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 }); await pg.click('#closeBtn');
    await pg.click('[data-q="jordan"]'); await pg.click('[data-rv]'); await pg.click('[data-dp="ended"]'); await pg.click('#closeBtn');
    assert(!(await pg.isVisible('#shift')));
    await pg.click('[data-q="daniel"]'); await pg.click('[data-rt="wait"]'); await pg.click('#closeBtn');
    const sh = await text(pg, '#shift'); assert(/End of shift/.test(sh) && /Daniel Brooks · Closed, delivery delayed/.test(sh) && /Where vs. when/.test(sh), sh);
  },
  async 'small phone: map toolbar stays on one row with full accessible names'(pg, b) {
    const ctx = await b.newContext(devices['iPhone SE']), m = await ctx.newPage(); await m.goto(url);
    const r = await m.evaluate(() => ['lv1', 'lensBtn', 'walkBtn'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().top)));
    const name = await m.getAttribute('#lv1', 'aria-label'); await ctx.close();
    assert(Math.max(...r) - Math.min(...r) <= 6, JSON.stringify(r)); assert.equal(name, 'Gallery, level 1');
  },
  async 'phone: turning Inspect on and off does not jump the page; Back to badge returns'(pg, b) {
    const ctx = await b.newContext(devices['Pixel 7']), m = await ctx.newPage(); await m.goto(url); await m.click('#briefBtn');
    await m.mouse.wheel(0, 600); await m.waitForTimeout(250); const y0 = await m.evaluate(() => scrollY);
    const top0 = await m.evaluate(() => document.getElementById('mapcard').getBoundingClientRect().top);
    const lb = await m.locator('#lensBtn').boundingBox(); await m.touchscreen.tap(lb.x + lb.width / 2, lb.y + lb.height / 2); await m.waitForTimeout(200); const top1 = await m.evaluate(() => document.getElementById('mapcard').getBoundingClientRect().top);
    assert(Math.abs(top1 - top0) <= 2, `map moved ${top0} -> ${top1}`);
    const vis = await m.evaluate(() => document.getElementById('inspect').getBoundingClientRect().top >= document.getElementById('mapcard').getBoundingClientRect().bottom - 1);
    assert(vis, 'inspection panel starts below the pinned map, so Back to badge is reachable');
    const bb = await m.locator('#backBtn').boundingBox(); await m.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await m.waitForTimeout(200); assert(await m.isVisible('#badge') && !(await m.isVisible('#inspect')));
    assert(Math.abs((await m.evaluate(() => scrollY)) - y0) <= 2); await ctx.close();
  },
  async 'walk log lists arrivals at requested stops; a stop inside the footprint says the badge is granted there'(pg) {
    await pg.click('[data-g="allStaff"]'); await pg.click('[data-g="education"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 });
    const log = await text(pg, '.walklog'); assert(/Arrived: Kelp Hall/.test(log) && /Arrived: Living Shore/.test(log) && /Arrived: Classroom/.test(log), log);
    await pg.click('[data-q="marcus"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /didn't open/.test(document.getElementById('review').textContent), null, { timeout: 15000 });
    const r = await text(pg, '#review'); assert(/inside the lit footprint/.test(r) && !/schedule|07:00|hours/i.test(r.split('Walk log')[1]), r);
  },
  async 'finalized vs needs correction: warnings that need fixing make no record and do not finish the shift; Daniel waiting does'(pg) {
    await pg.click('[data-g="exhibitOps"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 });
    await pg.click('#closeBtn'); assert(/outside the approved scope/.test(await text(pg, '.result')));
    assert.equal(await pg.locator('.record').count(), 0, 'no issued-credential record for an overbroad badge');
    await pg.click('[data-q="daniel"]'); await pg.click('[data-rt="wait"]'); await pg.click('#closeBtn');
    assert.equal(await pg.locator('.record').count(), 1); assert.equal(await pg.locator('#flow li.done').count(), 4, 'Record landmark done for a finalized wait');
    assert.equal(await pg.locator('[data-q="daniel"] .dot.done').count(), 1); assert.equal(await pg.locator('[data-q="elena"] .dot.done').count(), 0);
  },
  async 'Jordan: reading the records counts as investigating, no lens needed'(pg) {
    await pg.click('[data-q="jordan"]'); await pg.click('[data-rec="WO-1873"]');
    const done = await pg.locator('#flow li.done').allInnerTexts(); assert(done.some(x => /Investigate/i.test(x)), JSON.stringify(done));
  },
  async 'footprint reads as doors plus connected areas: grouped text, room entry explained, walk completion shown'(pg) {
    await pg.click('[data-g="education"]');
    const b = await text(pg, '#badge'); assert(/Opens 3 doors/.test(b) && /public: West gallery, Kelp Hall/.test(b) && !/restricted:/.test(b), b);
    await pg.click('#lensBtn'); await clickMap(pg, 150, 70);
    const i = await text(pg, '#inspect'); assert(/Kelp Hall/.test(i) && /No reader of its own/.test(i) && /Open passage to West gallery/.test(i) && /reached through Staff–gallery connector and open passages/.test(i), i);
    await pg.click('#lensBtn'); await pg.click('[data-g="allStaff"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Walk complete: reached every stop/.test(document.getElementById('mapnote').textContent), null, { timeout: 15000 });
    assert.equal(await pg.getAttribute('#mapnote', 'class'), 'walkdone ok');
  },
  async 'Jordan: distractor reasons are plausible misconceptions'(pg) {
    await pg.click('[data-q="jordan"]'); const b = await text(pg, '#badge');
    assert(/No problems have been reported with this badge/.test(b) && !/The credential still works/.test(b));
  },
  async 'STAFF ENTRANCE label starts right of its door marker'(pg) {
    const r = await pg.evaluate(() => { const t = [...document.querySelectorAll('#map text')].find(e => e.textContent === 'STAFF ENTRANCE'); return t.getBBox().x; });
    assert(r >= 40, 'label x ' + r);
  },
  async 'compact map (short phone): one toolbar row, live two-level silhouette, stable scroll, no auto-expand on edits'(pg, b) {
    const ctx = await b.newContext(devices['iPhone SE']), m = await ctx.newPage(); await m.goto(url); await m.click('#briefBtn');
    const tops = await m.evaluate(() => ['lv1', 'sizeBtn', 'lensBtn', 'walkBtn'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().top)));
    assert(Math.max(...tops) - Math.min(...tops) <= 6, 'toolbar rows ' + JSON.stringify(tops));
    await m.mouse.wheel(0, 700); await m.waitForTimeout(250);
    const full = await m.evaluate(() => document.getElementById('mapcard').offsetHeight);
    const card = '[data-g="exhibitOps"]', y0 = await m.evaluate(s => document.querySelector(s).getBoundingClientRect().top, card);
    const sb = await m.locator('#sizeBtn').boundingBox(); await m.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2); await m.waitForTimeout(200);
    const r = await m.evaluate(s => ({ h: document.getElementById('mapcard').offsetHeight, stage: getComputedStyle(document.querySelector('#mapcard .stage')).display, mini: getComputedStyle(document.getElementById('mini')).display, y: document.querySelector(s).getBoundingClientRect().top }), card);
    assert(r.stage === 'none' && r.mini !== 'none' && full - r.h >= 90, JSON.stringify({ full, ...r }));
    assert(Math.abs(r.y - y0) <= 3, `content under the finger moved ${y0} -> ${r.y}`);
    const cb = await m.locator(card).boundingBox(); await m.touchscreen.tap(cb.x + 40, cb.y + cb.height / 2); await m.waitForTimeout(200);
    const sum = await m.innerText('#miniSum'); assert(/9 doors granted/.test(sum) && /L1 \+ L2/.test(sum) && /restricted: Quarantine/.test(sum), sum);
    assert(await m.evaluate(() => document.body.classList.contains('compact')), 'a badge change does not expand the map');
    const lb = await m.locator('#lensBtn').boundingBox(); await m.touchscreen.tap(lb.x + lb.width / 2, lb.y + lb.height / 2); await m.waitForTimeout(200);
    assert(!(await m.evaluate(() => document.body.classList.contains('compact'))), 'Inspect expands the map');
    await m.reload(); assert(!(await m.evaluate(() => document.body.classList.contains('compact'))), 'not persisted');
    await ctx.close();
  },
  async 'compact map: Walk expands it, the silhouette expands it, desktop has no toggle'(pg, b) {
    const ctx = await b.newContext(devices['Pixel 7']), m = await ctx.newPage(); await m.goto(url); await m.click('#briefBtn');
    await m.click('#sizeBtn'); await m.click('[data-g="allStaff"]'); await m.click('#walkBtn');
    assert(!(await m.evaluate(() => document.body.classList.contains('compact'))), 'Walk expands');
    await m.waitForFunction(() => /Walk complete/.test(document.getElementById('mapnote').textContent) || /Walk stopped/.test(document.getElementById('mapnote').textContent), null, { timeout: 15000 });
    await m.click('#sizeBtn'); await m.click('#mini'); assert(!(await m.evaluate(() => document.body.classList.contains('compact'))), 'tapping the silhouette expands');
    await ctx.close();
    const d = await b.newContext({ viewport: { width: 1280, height: 900 } }), dp = await d.newPage(); await dp.goto(url);
    assert(!(await dp.isVisible('#sizeBtn')), 'no compact toggle on desktop'); await d.close();
  },
  async 'Elena: closing needs a verifying walk; a later badge change invalidates it'(pg) {
    await pg.click('[data-g="allStaff"]'); await pg.click('[data-g="education"]'); await pg.click('#closeBtn');
    assert(/Walk Elena in to confirm/.test(await text(pg, '.result')), 'refused before walking');
    await pg.click('#walkBtn'); await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 });
    await pg.click('#closeBtn'); await pg.keyboard.press('Escape'); await pg.keyboard.press('Escape'); assert(/Ticket closed/.test(await text(pg, '.result')), 'closes after a successful walk');
    await pg.click('[data-g="exhibitOps"]'); await pg.click('[data-g="exhibitOps"]'); await pg.click('#closeBtn');
    assert(/Walk Elena in to confirm/.test(await text(pg, '.result')), 'a change after verification needs a new walk');
  },
  async 'Marcus: the fix closes only after he is walked in'(pg) {
    await pg.click('[data-q="marcus"]'); await pg.click('[data-x]'); await pg.click('#closeBtn');
    assert(/Walk Marcus in to confirm/.test(await text(pg, '.result')));
    await pg.click('#walkBtn'); await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 });
    await pg.click('#closeBtn'); assert(/Ticket closed/.test(await text(pg, '.result')));
  },
  async 'Jordan is not forced to walk (audit)'(pg) {
    await pg.click('[data-q="jordan"]'); await pg.click('[data-rv]'); await pg.click('[data-dp="ended"]'); await pg.click('#closeBtn');
    assert(/Ticket closed/.test(await text(pg, '.result')));
  },
  async 'Daniel: waiting after an unnecessary badge expansion is still flagged'(pg) {
    await pg.click('[data-q="daniel"]'); await pg.click('[data-g="allStaff"]'); await pg.click('[data-rt="wait"]'); await pg.click('#closeBtn');
    const r = await text(pg, '.result'); assert(/outside the approved scope/.test(r) && /Waiting does not need it/.test(r), r);
  },
  async 'Daniel: escort route after an expansion does not claim he used his own badge'(pg) {
    await pg.click('[data-q="daniel"]'); await pg.click('[data-g="allStaff"]'); await pg.click('[data-rt="escortWest"]'); await pg.click('#walkBtn');
    await pg.waitForFunction(() => /Reached every stop/.test(document.getElementById('review').textContent), null, { timeout: 20000 });
    await pg.click('#closeBtn'); const r = await text(pg, '.result'); assert(/was also expanded/.test(r) && !/own badge/.test(r), r);
  },
  async 'Daniel: the dock denial stays inspectable on Daniel\'s own badge after choosing the escort route'(pg) {
    await pg.click('[data-q="daniel"]'); await pg.click('[data-rt="escortWest"]'); await pg.click('#lensBtn'); await clickMap(pg, 388, 250);
    const i = await text(pg, '#inspect'); assert(/Fault/.test(i) && /Denied · reader fault/.test(i) && /Priya \(escort\)/.test(i), i);
    assert(!/no group for this door/.test(i.split('Priya')[0]), 'Daniel row is the reader fault, not a missing grant');
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
