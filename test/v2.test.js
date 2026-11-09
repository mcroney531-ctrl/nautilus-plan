// V2 browser tests (Phase 01 foundation). Needs Playwright, like test/ui.test.js; skips cleanly if it is missing.
// Helpers describe behaviour (open a ticket, pick a stage, open the map) so the tests survive later layout work.
const assert = require('assert'), path = require('path'), { pathToFileURL } = require('url');
let chromium; try { ({ chromium } = require('playwright')); } catch (_) { console.log('skip: playwright not installed'); process.exit(0); }
const url = pathToFileURL(path.join(__dirname, '../dist/v2.html')).href;
const SIZES = { phone: { width: 320, height: 568 }, phone400: { width: 400, height: 860 }, mid: { width: 900, height: 800 }, desk: { width: 1366, height: 900 } };
const TICKETS = ['elena', 'marcus', 'jordan', 'daniel'];
const page = async (b, size = 'phone', hash = '') => { const ctx = await b.newContext({ viewport: SIZES[size] }), pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.goto(url + hash); return pg; };
const openTicket = (pg, id) => pg.click(`[data-nx-open="${id}"]`);
const steps = pg => pg.$$eval('.nx-step', bs => bs.map(b => ({ name: b.getAttribute('aria-label'), current: b.getAttribute('aria-current') === 'step' })));
const goStage = (pg, i) => pg.click(`.nx-step >> nth=${i}`);
const active = pg => pg.evaluate(() => { const a = document.activeElement; return a.dataset.nxKey || a.id || a.tagName; });
const overflow = pg => pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const openAllRecords = async pg => { const n = await pg.locator('.nx-chip').count(); for (let i = 0; i < n; i++) await pg.locator('.nx-chip').nth(i).click(); };

const tests = {
  async 'no errors and no sideways scrolling: inbox, every stage of every ticket, map overlay (320, 400, 900, 1366)'(b) {
    for (const size of Object.keys(SIZES)) {
      const pg = await page(b, size); assert.equal(await overflow(pg), 0, `${size} inbox`);
      for (const id of TICKETS) for (let i = 0; i < 4; i++) { await pg.goto(`${url}#/t/${id}/${(await pg.evaluate(id => __nx.steps(id), id))[i][0]}`); assert.equal(await overflow(pg), 0, `${size} ${id} stage ${i + 1}`); }
      if (size !== 'desk') { await pg.click('#nxMapBtn'); assert.equal(await overflow(pg), 0, `${size} map overlay`); }
      assert.deepEqual(pg.errs, [], size); await pg.close();
    }
  },
  async 'phone: inbox and ticket are separate screens; browser Back returns to the inbox with focus on that ticket'(b) {
    const pg = await page(b); assert(await pg.isVisible('#nxInbox')); assert(!(await pg.isVisible('#nxWork')));
    await openTicket(pg, 'marcus'); assert(await pg.isVisible('#nxWork')); assert(!(await pg.isVisible('#nxInbox')));
    assert.equal(await pg.evaluate(() => document.activeElement.textContent), 'Cameron Flynn', 'focus on the person heading');
    await pg.goBack(); assert(await pg.isVisible('#nxInbox')); assert.equal(await active(pg), 'inbox-marcus');
  },
  async 'phone: the in-page "Shift Inbox" link goes back without leaving history loops'(b) {
    const pg = await page(b); await openTicket(pg, 'elena'); await goStage(pg, 2); const len = await pg.evaluate(() => history.length); await pg.click('[data-nx-act="inbox"]');
    assert(await pg.isVisible('#nxInbox')); assert.equal(await pg.evaluate(() => location.hash), '#/inbox');
    assert.equal(await pg.evaluate(() => history.length), len, 'the link went back instead of adding an entry');
  },
  async 'tracker is navigation: any stage in any order, no gating; aria-current moves; names carry the scenario labels'(b) {
    const pg = await page(b, 'phone400'); await openTicket(pg, 'jordan');
    assert.deepEqual((await steps(pg)).map(s => s.name.replace(/, suggested next/, '')), ['Step 1 of 4: Review', 'Step 2 of 4: Investigate', 'Step 3 of 4: Decide', 'Step 4 of 4: Submit']);
    for (const i of [3, 0, 2, 1]) { await goStage(pg, i); const s = await steps(pg); assert.deepEqual(s.map(x => x.current), [0, 1, 2, 3].map(j => j === i), `stage ${i + 1}`);
      assert.equal(await pg.textContent('.nx-instr h2'), ['Review', 'Investigate', 'Decide', 'Submit'][i]); }
    await openTicket(pg, 'elena').catch(() => {}); await pg.goto(url + '#/t/elena/review');
    assert.deepEqual((await steps(pg)).map(s => s.name.split(': ')[1].split(',')[0]), ['Review', 'Configure', 'Verify', 'Close']);
    await pg.goto(url + '#/t/daniel/review'); assert.deepEqual((await steps(pg)).map(s => s.name.split(': ')[1].split(',')[0]), ['Review', 'Respond', 'Verify', 'Record']);
  },
  async '"Next" moves one stage forward and the URL keeps the stage (replace, not a new history entry per stage)'(b) {
    const pg = await page(b, 'desk', '#/t/elena/review'); await pg.click('[data-nx-key="next"]'); assert.equal(await pg.evaluate(() => location.hash), '#/t/elena/configure');
    await pg.click('[data-nx-key="next"]'); await pg.goBack(); assert.notEqual(await pg.evaluate(() => location.hash), '#/t/elena/configure', 'Back does not step back through stages');
  },
  async 'each ticket remembers its stage, and grading output is identical before and after navigating everywhere'(b) {
    const pg = await page(b, 'desk'); const before = await pg.evaluate(ids => ids.map(id => __nx.grade(id)), TICKETS);
    await openTicket(pg, 'elena'); await goStage(pg, 2); await openTicket(pg, 'jordan'); await goStage(pg, 3); await pg.click('#nxBriefBtn'); await pg.keyboard.press('Escape');
    await openTicket(pg, 'elena'); assert.equal((await steps(pg)).findIndex(s => s.current), 2, 'Elena kept Verify');
    await openTicket(pg, 'jordan'); assert.equal((await steps(pg)).findIndex(s => s.current), 3, 'Jordyn kept Submit');
    assert.deepEqual(await pg.evaluate(ids => ids.map(id => __nx.grade(id)), TICKETS), before);
  },
  async 'keyboard: arrows move between stages, Enter selects, focus stays on the selected stage after the update'(b) {
    const pg = await page(b, 'desk', '#/t/elena/review'); await pg.focus('.nx-step >> nth=0');
    await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight'); assert.equal(await active(pg), 'step-2');
    await pg.keyboard.press('Enter'); assert.equal(await active(pg), 'step-2', 'focus kept through the re-render');
    assert((await steps(pg))[2].current); await pg.keyboard.press('End'); assert.equal(await active(pg), 'step-3'); await pg.keyboard.press('Home'); assert.equal(await active(pg), 'step-0');
  },
  async '320px: numbers inside the chevrons, the selected stage named in full below, nothing clipped, 44px targets; full labels at 400px'(b) {
    for (const [size, compact] of [['phone', true], ['phone400', false]]) {
      const pg = await page(b, size, '#/t/jordan/investigate');
      const r = await pg.evaluate(() => { const lab = [...document.querySelectorAll('.nx-step-label')], num = [...document.querySelectorAll('.nx-step-num')];
        return { labels: lab.map(l => getComputedStyle(l).display !== 'none'), nums: num.map(n => getComputedStyle(n).display !== 'none'), heading: document.querySelector('.nx-instr h2').textContent,
          clipped: [...document.querySelectorAll('.nx-step-label,.nx-instr h2,.nx-step-num')].filter(e => getComputedStyle(e).display !== 'none' && e.scrollWidth > e.clientWidth + 1).length,
          small: [...document.querySelectorAll('.nx-step,.nx-hbtn,.nx-back,.nx-btn')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.height < 44 || b.width < 44); }).map(e => e.dataset.nxKey || e.id) }; });
      assert.equal(r.heading, 'Investigate'); assert.equal(r.clipped, 0, size); assert.deepEqual(r.small, [], size);
      assert.deepEqual(r.labels, [!compact, !compact, !compact, !compact], size); assert.deepEqual(r.nums, [compact, compact, compact, compact], size);
      await pg.close();
    }
  },
  async 'phone: Facility Map from every stage opens the full-screen map, focus moves in; Esc closes it and returns focus'(b) {
    const pg = await page(b); await openTicket(pg, 'daniel');
    for (let i = 0; i < 4; i++) { await goStage(pg, i); await pg.click('#nxMapBtn');
      assert(await pg.evaluate(() => document.getElementById('nxMapDlg').open), `stage ${i + 1}`); assert.equal(await active(pg), 'nxMapH');
      assert(/\/map$/.test(await pg.evaluate(() => location.hash))); await pg.keyboard.press('Escape');
      assert(!(await pg.evaluate(() => document.getElementById('nxMapDlg').open))); assert.equal(await active(pg), 'map', 'focus back on Facility Map'); }
    await pg.click('[data-nx-act="inbox"]'); await pg.click('#nxMapBtn'); assert(await pg.evaluate(() => document.getElementById('nxMapDlg').open), 'from the inbox too');
  },
  async 'phone: browser Back closes the map before it leaves the ticket; the Close map button works too'(b) {
    const pg = await page(b); await openTicket(pg, 'elena'); await goStage(pg, 1); await pg.click('#nxMapBtn');
    await pg.goBack(); assert(!(await pg.evaluate(() => document.getElementById('nxMapDlg').open))); assert(await pg.isVisible('#nxWork'), 'still on the ticket');
    assert.equal(await pg.evaluate(() => location.hash), '#/t/elena/configure');
    await pg.click('#nxMapBtn'); await pg.click('#nxMapClose'); assert(!(await pg.evaluate(() => document.getElementById('nxMapDlg').open))); assert.equal(await active(pg), 'map');
  },
  async 'desktop: the map is a column beside the work area; Facility Map focuses it and opens no overlay'(b) {
    const pg = await page(b, 'desk', '#/t/elena/review'); assert(await pg.isVisible('#nxMapCol .nx-map')); assert(!(await pg.isVisible('#nxMapClose')));
    await pg.click('#nxMapBtn'); assert(!(await pg.evaluate(() => document.getElementById('nxMapDlg').open))); assert.equal(await active(pg), 'nxMapH');
    const m = await page(b, 'mid', '#/t/elena/review'); assert(!(await m.isVisible('#nxMapCol'))); await m.click('#nxMapBtn'); assert(await m.evaluate(() => document.getElementById('nxMapDlg').open), '900px uses the overlay');
  },
  async 'header: only Shift Brief and Facility Map (no Help, Settings, Resources or menu); both keep full accessible names on phones'(b) {
    for (const size of ['phone', 'desk']) { const pg = await page(b, size);
      const names = await pg.$$eval('.nx-header button', bs => bs.map(b => b.textContent.trim())); assert.deepEqual(names, ['Shift Brief', 'Facility Map'], size);
      assert(!(await pg.evaluate(() => /help|settings|resources|menu/i.test(document.querySelector('.nx-header').textContent)))); await pg.close(); }
  },
  async 'Shift Brief opens from the header and the inbox card, closes with Esc or its button, and focus returns'(b) {
    const pg = await page(b, 'desk'); await pg.click('#nxBriefBtn'); assert(await pg.evaluate(() => document.getElementById('nxBrief').open)); assert.equal(await active(pg), 'nxBriefH');
    assert(/Four access tickets today/.test(await pg.textContent('#nxBrief'))); await pg.keyboard.press('Escape'); assert.equal(await active(pg), 'brief');
    await pg.click('[data-nx-act="brief"]'); await pg.click('#nxBriefClose'); assert.equal(await active(pg), 'briefcard');
  },
  async 'inbox: four tickets with V2 portraits, names, locked display roles and a preview; the ticket in view marked current'(b) {
    const pg = await page(b, 'desk', '#/t/marcus/review');
    const items = await pg.$$eval('.nx-item', a => a.map(x => ({ name: x.querySelector('b').textContent, role: x.querySelector('.nx-item-txt > span').textContent,
      preview: x.querySelector('.nx-preview').textContent, cur: x.getAttribute('aria-current'), img: x.querySelector('img').naturalWidth })));
    assert.deepEqual(items.map(i => `${i.name} | ${i.role}`), ['Elena Park | Marine Educator', 'Cameron Flynn | Dive Crew Lead', 'Jordyn Kim | External Exhibit AV Vendor', 'Daniel Brooks | External Frozen-Feed Driver']);
    assert(/^Hi! I start Tuesday/.test(items[0].preview) && /^We're completing the quarterly/.test(items[2].preview));
    assert.deepEqual(items.map(i => i.cur), [null, 'page', null, null]); assert(items.every(i => i.img === 192), 'V2 192px avatars');
    assert(!/Jenni/.test(await pg.textContent('#nxInbox')), 'Jenni is not a ticket');
  },
  async 'status: New until real work; opening tickets, stages, Next, the map and the brief change nothing; a record read is In progress and stays so'(b) {
    const pg = await page(b, 'phone'); const statuses = () => pg.$$eval('.nx-status', s => s.map(x => x.textContent));
    assert.deepEqual(await statuses(), ['New', 'New', 'New', 'New']); assert.equal(await pg.textContent('.nx-count'), '4');
    for (const id of TICKETS) { await openTicket(pg, id); for (let i = 1; i < 4; i++) await goStage(pg, i); await pg.click('#nxMapBtn'); await pg.keyboard.press('Escape');
      await goStage(pg, 0); await pg.click('[data-nx-key="next"]'); await pg.click('#nxBriefBtn'); await pg.keyboard.press('Escape'); await pg.click('[data-nx-act="inbox"]'); }
    assert.deepEqual(await statuses(), ['New', 'New', 'New', 'New'], 'navigation is not work');
    await openTicket(pg, 'jordan'); await goStage(pg, 0); await pg.click('[data-nx-rec="WO-1873"]'); await pg.click('[data-nx-act="inbox"]');
    assert.deepEqual(await statuses(), ['New', 'New', 'In progress', 'New']);
    assert(/Jordyn Kim[\s\S]*In progress/.test(await pg.textContent('[data-nx-open="jordan"]')), 'status is part of the link text');
    await openTicket(pg, 'jordan'); await pg.click('[data-nx-rec="WO-1873"]'); await pg.click('[data-nx-act="inbox"]');
    assert.deepEqual(await statuses(), ['New', 'New', 'In progress', 'New'], 'a record read stays read after it is collapsed');
  },
  async 'Review, all four: the request in its sender\'s words; Jordyn\'s ticket opens with the ops desk assignment, not a message from Jordyn'(b) {
    const pg = await page(b, 'desk'); const S = await pg.evaluate(() => SCENARIOS);
    for (const id of TICKETS) { await pg.goto(`${url}#/t/${id}/review`);
      const r = await pg.evaluate(() => ({ msg: document.querySelector('.nx-request blockquote').textContent.trim(), from: document.querySelector('.nx-request figcaption').textContent.replace(/\s+/g, ' ').trim(),
        img: !!document.querySelector('.nx-request figcaption img'), h1: document.querySelector('h1').textContent }));
      assert.equal(r.msg, S[id].message, id); assert.equal(r.h1, S[id].person.name);
      if (id === 'jordan') { assert.equal(r.from, 'Ops desk Quarterly contractor access review · about Jordyn Kim'); assert(!r.img, 'no Jordyn portrait as sender'); }
      else { assert(r.from.startsWith(S[id].person.name), r.from); assert(r.img); } }
  },
  async 'Review records: every authorization and note as a disclosure with aria-expanded and aria-controls; opening shows the record, focus stays put'(b) {
    const pg = await page(b, 'phone400'); const S = await pg.evaluate(() => SCENARIOS);
    for (const id of TICKETS) { await pg.goto(`${url}#/t/${id}/review`);
      const want = [...S[id].person.authorizations.map(a => a.id), ...(S[id].notes || []).map(n => n.id)];
      assert.deepEqual(await pg.$$eval('.nx-chip', c => c.map(x => x.textContent)), want, id);
      for (const rid of want) { const chip = `[data-nx-rec="${rid}"]`, panel = '#' + await pg.getAttribute(chip, 'aria-controls');
        assert.equal(await pg.getAttribute(chip, 'aria-expanded'), 'false'); assert(!(await pg.isVisible(panel)));
        await pg.click(chip); assert.equal(await pg.getAttribute(chip, 'aria-expanded'), 'true'); assert(await pg.isVisible(panel), rid);
        assert.equal(await pg.evaluate(() => document.activeElement.dataset.nxRec), rid, 'focus stays on the chip');
        const a = S[id].person.authorizations.find(x => x.id === rid);
        if (a) { const txt = await pg.textContent(panel); assert(txt.includes(a.places) && txt.includes(a.window) && txt.includes(a.approver), rid); }
        else assert((await pg.textContent(panel)).includes(S[id].notes.find(n => n.id === rid).text));
        assert.equal(await overflow(pg), 0, `${id} ${rid} open`); } }
  },
  async 'Review never names a denial cause, an engine verdict or Jenni (inspection keeps those)'(b) {
    const pg = await page(b, 'phone');
    for (const id of TICKETS) { await pg.goto(`${url}#/t/${id}/review`); await openAllRecords(pg);
      const txt = await pg.textContent('#nxWork');
      const bad = txt.match(/.{0,40}(didn't open|denied|fault|repair|outside (its|the) schedule|no group|NO_GRANT|OUTSIDE_SCHEDULE|HARDWARE|out of scope|no active record).{0,40}/i);
      assert(!bad, id + ': ' + (bad && bad[0])); assert(!/Jenni/.test(txt), id); }
  },
  async 'Next starts the learner at the new stage: focus on its heading, tracker scrolled into view below the header; chevron clicks keep focus'(b) {
    const pg = await page(b, 'phone', '#/t/jordan/review'); await openAllRecords(pg);
    await pg.evaluate(() => scrollTo(0, document.body.scrollHeight)); await pg.click('[data-nx-key="next"]');
    const r = await pg.evaluate(() => ({ focus: document.activeElement.textContent, tag: document.activeElement.tagName, top: document.querySelector('.nx-tracker').getBoundingClientRect().top,
      header: document.querySelector('.nx-header').getBoundingClientRect().bottom, hash: location.hash }));
    assert.equal(r.tag, 'H2'); assert.equal(r.focus, 'Investigate'); assert.equal(r.hash, '#/t/jordan/investigate');
    assert(r.top >= r.header - 1 && r.top < r.header + 40, JSON.stringify(r));
    await pg.click('.nx-step >> nth=2'); assert.equal(await active(pg), 'step-2', 'tracker click keeps focus on the chevron');
    for (const size of ['phone400', 'desk']) { const d = await page(b, size, '#/t/elena/review'); await d.setViewportSize({ ...SIZES[size], height: 520 });
      await d.evaluate(() => scrollTo(0, document.body.scrollHeight)); await d.click('[data-nx-key="next"]');
      const q = await d.evaluate(() => ({ top: document.querySelector('.nx-tracker').getBoundingClientRect().top, header: document.querySelector('.nx-header').getBoundingClientRect().bottom,
        heading: document.querySelector('.nx-instr h2').getBoundingClientRect().bottom, focus: document.activeElement.textContent }));
      assert(q.top >= q.header - 1 && q.heading < 520, `${size} ${JSON.stringify(q)}`); assert.equal(q.focus, 'Configure'); await d.close(); }
  },
  async 'stage workspaces follow stage FUNCTION, not tracker position; only Verify and Close/Submit/Record remain placeholders'(b) {
    const pg = await page(b, 'desk'); const ctl = () => pg.evaluate(() => ({ groups: document.querySelectorAll('#nxStage [data-nx-do="group"]').length,
      exc: document.querySelectorAll('#nxStage [data-nx-do="exception"]').length, hours: document.querySelectorAll('#nxStage [data-nx-do="hours"]').length,
      routes: document.querySelectorAll('#nxStage [data-nx-do="route"]').length, revoke: document.querySelectorAll('#nxStage [data-nx-do="revoke"]').length,
      reasons: document.querySelectorAll('#nxStage [data-nx-do="reason"]').length, ph: !!document.querySelector('#nxStage .nx-placeholder') }));
    const want = { 'elena/configure': { groups: 4, exc: 0, hours: 0, routes: 0, revoke: 0, reasons: 0, ph: false }, 'marcus/configure': { groups: 4, exc: 1, hours: 1, routes: 0, revoke: 0, reasons: 0, ph: false },
      'jordan/investigate': { groups: 0, exc: 0, hours: 0, routes: 0, revoke: 0, reasons: 0, ph: false }, 'jordan/decide': { groups: 4, exc: 0, hours: 0, routes: 0, revoke: 1, reasons: 3, ph: false },
      'daniel/respond': { groups: 3, exc: 0, hours: 0, routes: 4, revoke: 0, reasons: 0, ph: false } };
    for (const [h, w] of Object.entries(want)) { await pg.goto(`${url}#/t/${h}`); assert.deepEqual(await ctl(), w, h); }
    await pg.goto(url + '#/t/jordan/decide'); assert.equal(await pg.$eval('#nxStage', s => s.dataset.slot), '2', 'Decide is the third segment and holds the decision controls');
    for (const h of ['elena/verify', 'elena/close', 'marcus/verify', 'jordan/close', 'daniel/verify', 'daniel/close']) { await pg.goto(`${url}#/t/${h}`);
      assert(/Not built yet: this stage's workspace arrives in Phase 0[56]/.test(await pg.textContent('#nxStage')), h); }
  },
  async 'decision controls change domain state exactly as V1 does; evaluation is the shared Flow.grade'(b) {
    const pg = await page(b, 'desk', '#/t/elena/configure');
    await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]');
    assert.deepEqual((await pg.evaluate(() => __nx.state('elena'))).credential.groups, ['allStaff', 'education']); assert.equal((await pg.evaluate(() => __nx.grade('elena'))).title, 'Not ready to close', 'needs its walk');
    await pg.goto(url + '#/t/marcus/configure'); await pg.check('[data-nx-key="gs"]'); assert.deepEqual((await pg.evaluate(() => __nx.state('marcus'))).overrides, { diveCrew: [5, 19] });
    await pg.uncheck('[data-nx-key="gs"]'); await pg.check('[data-nx-key="x-WO-2291"]'); const m = await pg.evaluate(() => __nx.state('marcus'));
    assert.deepEqual(m.overrides, {}); assert.equal(m.credential.exceptions[0].source, 'WO-2291');
    await pg.goto(url + '#/t/jordan/decide'); await pg.check('[data-nx-key="rv"]'); await pg.check('[data-nx-key="dp-ended"]');
    assert.equal((await pg.evaluate(() => __nx.grade('jordan'))).title, 'Ticket closed', 'deactivated with the matching reason (submitting arrives in Phase 06)');
    await pg.check('[data-nx-key="dp-followup"]'); assert.equal((await pg.evaluate(() => __nx.grade('jordan'))).title, 'Reason does not match the records');
    assert(/Recorded: Credential deactivated · Future follow-up work may require access/.test(await pg.textContent('.nx-recorded')));
    await pg.goto(url + '#/t/daniel/respond'); await pg.check('[data-nx-key="rt-wait"]'); assert.equal((await pg.evaluate(() => __nx.state('daniel'))).route, 'wait');
    assert.equal((await pg.evaluate(() => __nx.grade('daniel'))).title, 'Closed, delivery delayed');
    assert.deepEqual(await pg.$$eval('.nx-step', s => s.map(x => x.getAttribute('aria-label').split(': ')[1].split(',')[0])), ['Review', 'Respond', 'Verify', 'Record']);
    assert(/not applicable/.test(await pg.getAttribute('.nx-step >> nth=2', 'aria-label')), 'Verify is not applicable on the wait route');
  },
  async 'change review: added and removed areas and doors as separate lists; schedule-only changes with their scope; the map outlines the change'(b) {
    const pg = await page(b, 'desk', '#/t/elena/configure'); await pg.check('[data-nx-key="g-exhibitOps"]');
    let r = await pg.textContent('.nx-impact'); assert(/Added Exhibit Operations/.test(r) && /Added to the granted footprint/.test(r) && /Quarantine restricted L2/.test(r), r);
    await pg.click('#nxLv2'); assert(await pg.$('#nxMapSvg [data-delta="added"][data-space="quarantine"]'), 'Quarantine outlined on L2');
    await pg.click('[data-nx-key="delta"]'); assert(!(await pg.$('#nxMapSvg [data-delta]')), 'overlay hidden'); assert.equal(await pg.getAttribute('[data-nx-key="delta"]', 'aria-pressed'), 'false');
    await pg.uncheck('[data-nx-key="g-exhibitOps"]'); r = await pg.textContent('.nx-impact'); assert(/Removed Exhibit Operations/.test(r) && /Removed from the granted footprint/.test(r));
    await pg.check('[data-nx-key="g-allStaff"]'); r = await pg.textContent('.nx-impact'); assert(/Doors added to badge permissions|Added to the granted footprint/.test(r), r);
    await pg.goto(url + '#/t/marcus/configure'); await pg.check('[data-nx-key="x-WO-2291"]'); r = await pg.textContent('.nx-impact');
    assert(/Same places, different hours/.test(r) && /this badge only/.test(r) && !/Added to the granted footprint/.test(r), r);
    await pg.uncheck('[data-nx-key="x-WO-2291"]'); await pg.check('[data-nx-key="gs"]'); r = await pg.textContent('.nx-impact'); assert(/all 12 Dive Crew badges/.test(r), r);
  },
  async 'phone: the live mini footprint updates with each change and opens the full map; it never names time or reader causes'(b) {
    const pg = await page(b, 'phone', '#/t/elena/configure'); const sum = () => pg.textContent('.nx-mini-sum');
    assert(/^0 doors in badge permissions/.test(await sum())); await pg.check('[data-nx-key="g-education"]'); assert(/^3 doors in badge permissions · footprint on L1/.test(await sum()), await sum());
    await pg.click('.nx-mini'); assert(await pg.evaluate(() => document.getElementById('nxMapDlg').open)); await pg.keyboard.press('Escape'); assert.equal(await active(pg), 'mini', 'focus returns to the mini footprint');
    for (const h of ['marcus/configure', 'daniel/respond']) { await pg.goto(`${url}#/t/${h}`); assert(!/fault|repair|schedule|05:30|08:15|outside|denied/i.test(await sum()), h); }
    const d = await page(b, 'desk', '#/t/elena/configure'); assert(!(await d.isVisible('.nx-mini')), 'desktop has the map column instead');
  },
  async 'Daniel: the escort route shows Jenni (portrait, name, role, ESC-07) only inside that route; no other ticket or stage mentions her'(b) {
    const pg = await page(b, 'phone400', '#/t/daniel/respond'); const esc = await pg.textContent('.nx-escort');
    assert(/Jenni Nair/.test(esc) && /Receiving Supervisor · Designated Vendor Escort · ESC-07/.test(esc), esc); assert.equal(await pg.$$eval('.nx-escort img', i => i[0].naturalWidth), 192);
    for (const h of ['elena/configure', 'marcus/configure', 'jordan/investigate', 'jordan/decide', 'daniel/review']) { await pg.goto(`${url}#/t/${h}`); assert(!/Jenni/.test(await pg.textContent('#nxWork')), h); }
  },
  async 'no denial causes in any decision workspace before investigation; wording keeps granted separate from working at a time'(b) {
    const pg = await page(b, 'phone');
    for (const h of ['elena/configure', 'marcus/configure', 'jordan/investigate', 'jordan/decide', 'daniel/respond']) { await pg.goto(`${url}#/t/${h}`);
      const txt = await pg.textContent('#nxStage'); const bad = txt.match(/.{0,30}(fault|repair|out of service|denied|didn't open|outside (its|the) schedule|NO_GRANT|HARDWARE|no active record|out of scope).{0,30}/i);
      assert(!bad, h + ': ' + (bad && bad[0])); assert(!/badge opens|reaches/i.test(txt), h + ' wording'); }
  },
  async 'keyboard: Space toggles a group, arrows move between routes and reasons, focus stays on the control after each update'(b) {
    const pg = await page(b, 'desk', '#/t/elena/configure'); await pg.focus('[data-nx-key="g-allStaff"]'); await pg.keyboard.press('Space');
    assert.equal(await active(pg), 'g-allStaff'); assert(await pg.isChecked('[data-nx-key="g-allStaff"]'));
    await pg.goto(url + '#/t/daniel/respond'); await pg.focus('[data-nx-key="rt-dock"]'); await pg.keyboard.press('ArrowDown');
    assert.equal(await active(pg), 'rt-selfWest'); assert.equal((await pg.evaluate(() => __nx.state('daniel'))).route, 'selfWest');
    await pg.goto(url + '#/t/jordan/decide'); await pg.focus('[data-nx-key="rv"]'); await pg.keyboard.press('Space'); assert.equal(await active(pg), 'rv');
    const sem = await pg.evaluate(() => [...document.querySelectorAll('#nxStage fieldset')].map(f => f.querySelector('legend').textContent));
    assert.deepEqual(sem.slice(0, 3), ['Credential', 'Reason for the decision', 'Access groups']);
  },
  async 'Investigate stays done after Jordyn reads and collapses a record; status and tracker agree'(b) {
    const pg = await page(b, 'desk', '#/t/jordan/investigate'); await pg.click('[data-nx-rec="WO-1873"]'); await pg.click('[data-nx-rec="WO-1873"]');
    assert(/Investigate, done/.test(await pg.getAttribute('.nx-step >> nth=1', 'aria-label')), 'tick kept after collapsing'); assert.equal(await pg.evaluate(() => __nx.status('jordan')), 'progress');
  },
  async 'semantics: banner, labelled inbox navigation, main; one h1 per ticket; stage and section headings; the message is a quotation with its sender; noindex'(b) {
    const pg = await page(b, 'desk', '#/t/elena/review');
    const r = await pg.evaluate(() => ({ banner: !!document.querySelector('header.nx-header'), nav: document.querySelector('nav#nxInbox').getAttribute('aria-labelledby'), main: !!document.querySelector('main#nxWork'),
      h1: document.querySelectorAll('#nxWork h1').length, h2: [...document.querySelectorAll('#nxWork h2')].map(h => h.textContent), quote: !!document.querySelector('figure figcaption + blockquote'),
      robots: document.querySelector('meta[name=robots]').content }));
    assert(r.banner && r.main && r.nav === 'nxInboxH'); assert.equal(r.h1, 1); assert.deepEqual(r.h2, ['Review', 'Request', 'Records']); assert(r.quote);
    assert.equal(r.robots, 'noindex, nofollow', 'development preview is kept out of search indexes');
  },
  async 'map shows GRANTED only: lit doors equal Engine.footprint for every ticket on both levels; no time, schedule or reader-fault cue'(b) {
    const pg = await page(b, 'desk');
    for (const id of TICKETS) { await pg.goto(`${url}#/t/${id}/review`); const fp = await pg.evaluate(id => __nx.footprint(id), id); const lit = [];
      for (const l of [1, 2]) { await pg.click(`#nxLv${l}`); lit.push(...await pg.$$eval('#nxMapSvg .nx-door[data-granted="true"]', c => c.map(x => x.dataset.door))); }
      assert.deepEqual(lit.sort(), fp.doors, id);
      const txt = await pg.evaluate(() => document.querySelector('.nx-map').textContent);
      assert(!/fault|repair|out of service|schedule|outside|denied|didn't open|07:00|hours/i.test(txt), `${id}: ${txt.match(/.{0,30}(fault|repair|service|schedule|outside|denied|hours).{0,30}/i)}`); }
    await pg.goto(url + '#/t/marcus/review'); await pg.click('#nxLv1'); assert.equal(await pg.getAttribute('#nxMapSvg [data-door="D-DOCK"]', 'data-granted'), 'true', 'Cameron at 05:30: the dock is granted (time is not on the map)');
    await pg.goto(url + '#/t/daniel/review'); await pg.click('#nxLv1'); assert.equal(await pg.getAttribute('#nxMapSvg [data-door="D-DOCK"]', 'data-granted'), 'true', 'Daniel: granted despite the reader fault (status is not on the map)');
    await pg.goto(url + '#/inbox'); assert.equal(await pg.$$eval('#nxMapSvg [data-granted="true"]', c => c.length), 0, 'inbox: plain floor plan');
  },
  async 'map levels: aria-pressed, the L2 marker when the badge reaches topside, per-ticket memory, focus stays on the button, grading untouched'(b) {
    const pg = await page(b, 'desk'); const before = await pg.evaluate(ids => ids.map(id => __nx.grade(id)), TICKETS);
    await pg.goto(url + '#/t/jordan/review');
    assert.equal(await pg.getAttribute('#nxLv1', 'aria-pressed'), 'true'); assert(/has areas in the granted footprint/.test(await pg.getAttribute('#nxLv2', 'aria-label')));
    assert(await pg.$eval('#nxLv2', b => b.classList.contains('nx-lit')));
    await pg.focus('#nxLv2'); await pg.keyboard.press('Enter'); assert.equal(await active(pg), 'lv2', 'focus stays on the level button');
    assert.equal(await pg.getAttribute('#nxLv2', 'aria-pressed'), 'true'); assert(/^Showing level 2/.test(await pg.textContent('#nxMapCap')));
    await openTicket(pg, 'elena'); assert.equal(await pg.getAttribute('#nxLv1', 'aria-pressed'), 'true', 'Elena starts on L1');
    assert(!/has areas/.test(await pg.getAttribute('#nxLv2', 'aria-label')), 'Elena has no badge yet: no L2 marker');
    await openTicket(pg, 'jordan'); assert.equal(await pg.getAttribute('#nxLv2', 'aria-pressed'), 'true', 'Jordyn kept L2');
    assert.deepEqual(await pg.evaluate(ids => ids.map(id => __nx.grade(id)), TICKETS), before);
  },
  async 'map text: the caption names every granted door and area and labels the drawing; the clock is the ticket\'s scenario time'(b) {
    const pg = await page(b, 'phone400', '#/t/marcus/review'); await pg.click('#nxMapBtn');
    const r = await pg.evaluate(() => ({ cap: document.querySelector('#nxMapCap').textContent, lab: document.querySelector('#nxMapSvg').getAttribute('aria-labelledby'), role: document.querySelector('#nxMapSvg').getAttribute('role'), clock: document.querySelector('#nxClock').textContent }));
    assert.equal(r.role, 'img'); assert.equal(r.lab, 'nxMapCap'); assert.equal(r.clock, 'Tue Oct 27 · 05:30');
    for (const d of ['Loading dock', 'Dive locker', 'East mezzanine']) assert(r.cap.includes(d), d);
    assert(/Cameron Flynn's badge grants access to 5 doors/.test(r.cap), r.cap);
    const all = await pg.evaluate(() => document.querySelector('.nx-map').innerText + ' ' + [...document.querySelectorAll('.nx-map [aria-label]')].map(e => e.getAttribute('aria-label')).join(' '));
    assert(!/\bopens?\b|\breach(es)?\b/i.test(all), 'map wording never claims a door opens or an area is reached: ' + (all.match(/.{0,30}\b(opens?|reach(es)?)\b.{0,30}/i) || [''])[0]);
  },
  async 'one map instance: a single drawing and no duplicate ids across column, dialog, tickets and resizes'(b) {
    const pg = await page(b, 'phone', '#/t/elena/review');
    const check = async label => { const r = await pg.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id); return { svgs: document.querySelectorAll('#nxMapSvg').length, regions: document.querySelectorAll('.nx-map').length, dup: ids.filter((x, i) => ids.indexOf(x) !== i) }; });
      assert.equal(r.svgs, 1, label); assert.equal(r.regions, 1, label); assert.deepEqual(r.dup, [], label); };
    await check('phone, closed'); await pg.click('#nxMapBtn'); await check('phone, dialog open');
    await pg.setViewportSize({ width: 1366, height: 900 }); await pg.waitForTimeout(100); await check('widened to desktop');
    assert(await pg.isVisible('#nxMapCol #nxMapSvg'), 'the same map moved into the column'); assert(!(await pg.evaluate(() => document.getElementById('nxMapDlg').open)), 'dialog closed');
    await pg.setViewportSize({ width: 320, height: 568 }); await pg.waitForTimeout(100); await check('narrowed again');
  },
  async 'stage container: data-stage follows the tracker for every stage of every ticket; Review content only in the first slot'(b) {
    const pg = await page(b, 'desk');
    for (const id of TICKETS) { await pg.goto(`${url}#/t/${id}/review`); const ss = await pg.evaluate(id => __nx.steps(id), id);
      for (let i = 0; i < 4; i++) { await goStage(pg, i); const r = await pg.$eval('#nxStage', s => ({ k: s.dataset.stage, slot: s.dataset.slot, review: !!s.querySelector('.nx-request') }));
        assert.deepEqual(r, { k: ss[i][0], slot: String(i), review: i === 0 }, `${id} ${i}`); } }
  },
  async 'header and inbox text over the textures stays above 4.5:1 at the brightest point'(b) {
    const pg = await page(b, 'desk', '#/t/elena/review'); await pg.addStyleTag({ content: '.nx-header *,.nx-inbox *{visibility:hidden!important}' });
    for (const sel of ['.nx-header', '.nx-inbox']) {
      const worst = await pg.evaluate(async sel => { const r = document.querySelector(sel).getBoundingClientRect(); return r; }, sel);
      const buf = await pg.screenshot({ clip: { x: worst.x, y: worst.y, width: worst.width, height: Math.min(worst.height, 800) } });
      const L = await pg.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data, ls = [];
        for (let i = 0; i < d.length; i += 4 * 7) { const v = [d[i], d[i + 1], d[i + 2]].map(u => u / 255).map(u => u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4); ls.push(0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]); }
        ls.sort((a, b) => a - b); return ls[Math.floor(ls.length * 0.999)]; }, buf.toString('base64'));
      const muted = 0.5776; // relative luminance of --nx-on-navy-muted (#b9c9da), the dimmest text used on these surfaces
      assert((muted + 0.05) / (L + 0.05) >= 4.5, `${sel}: ${((muted + 0.05) / (L + 0.05)).toFixed(1)}:1`);
    }
  },
  async 'reduced motion: no transitions or animations'(b) {
    const ctx = await b.newContext({ viewport: SIZES.desk, reducedMotion: 'reduce' }), pg = await ctx.newPage(); await pg.goto(url + '#/t/elena/review');
    assert(await pg.evaluate(() => [...document.querySelectorAll('.nx-body *')].every(e => { const s = getComputedStyle(e); return parseFloat(s.transitionDuration) === 0 && s.animationName === 'none'; })));
  },
};
(async () => {
  const b = await chromium.launch(); let fail = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try { await fn(b); console.log('ok', name); } catch (e) { fail++; console.log('FAIL', name, '\n  ', e.message.slice(0, 400)); }
  }
  await b.close(); console.log(`\n${Object.keys(tests).length - fail}/${Object.keys(tests).length} V2 browser tests passed`); process.exit(fail ? 1 : 0);
})();
