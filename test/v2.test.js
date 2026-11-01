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
  async 'inbox: four tickets with V2 portraits, live names and roles from scenario data, the ticket in view marked current'(b) {
    const pg = await page(b, 'desk', '#/t/marcus/review');
    const items = await pg.$$eval('.nx-item', a => a.map(x => ({ t: x.textContent.replace(/\s+/g, ' ').trim(), cur: x.getAttribute('aria-current'), img: x.querySelector('img').naturalWidth })));
    assert.deepEqual(items.map(i => i.t.split(' · ')[0].replace(/ (WO|WA|PO)-.*/, '')), ['Elena Park Marine Educator', 'Cameron Flynn Dive crew lead', 'Jordyn Kim Exhibit AV vendor', 'Daniel Brooks Frozen-feed driver']);
    assert.deepEqual(items.map(i => i.cur), [null, 'page', null, null]); assert(items.every(i => i.img === 192), 'V2 192px avatars');
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
