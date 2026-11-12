// Cutaway integration Step 5 (flag on): inspection evidence through the cutaway lens and the door list, change-review outlines,
// and identical scenario progression, grading and records with the flag on and off. Needs Playwright and the preview build.
const assert = require('assert'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
let chromium; try { ({ chromium } = require('playwright')); } catch (_) { console.log('skip: playwright not installed'); process.exit(0); }
if (!fs.existsSync(path.join(__dirname, '../dist/v2-cutaway-preview.html'))) { console.log('skip: dist/v2-cutaway-preview.html not built'); process.exit(0); }
const ON = pathToFileURL(path.join(__dirname, '../dist/v2-cutaway-preview.html')).href + '?map=cutaway', OFF = pathToFileURL(path.join(__dirname, '../dist/v2.html')).href + '?';
const SIZES = { 320: [320, 568], 400: [400, 860], desktop: [1366, 900] }, W = Object.keys(SIZES), DOORS = 15;
const open = async (b, url, size = 'desktop') => { const pg = await (await b.newContext({ viewport: { width: SIZES[size][0], height: SIZES[size][1] }, reducedMotion: 'reduce' })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); }); pg.base = url; pg.size = size; await pg.goto(url + '#/inbox'); return pg; };
const go = async (pg, h) => { await pg.goto(pg.base + '#' + h); await pg.waitForTimeout(30); };
const ev = (pg, f, a) => pg.evaluate(f, a), done = async pg => { assert.deepEqual(pg.errs, []); await pg.context().close(); };
const mapOpen = async pg => { if (pg.size !== 'desktop' && !(await ev(pg, () => document.getElementById('nxMapDlg').open))) { await pg.click('#nxMapBtn'); await pg.waitForTimeout(120); } };
const inspectOn = async pg => { await mapOpen(pg); if ((await ev(pg, () => vis('#nxInspect').getAttribute('aria-pressed'))) !== 'true') await ev(pg, () => vis('#nxInspect').click()); };
const pick = (pg, d) => ev(pg, d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d);
const evidence = pg => ev(pg, () => vis('#nxInsp').innerHTML);
const walk = async (pg, id) => { await go(pg, `/t/${id}/verify`); await pg.click('[data-nx-key="walk"]'); await pg.waitForFunction(id => { const w = __nx.state(id).walk; return w && !w.running; }, id, { timeout: 30000 }); if (pg.size !== 'desktop') await pg.keyboard.press('Escape'); };
/* states with granted and denied doors on all four tickets: [ticket, how to get there] */
const STATES = [
  ['elena', 'start', async () => {}], ['elena', 'All Staff + Education', async pg => { await go(pg, '/t/elena/configure'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]'); }],
  ['marcus', 'start', async () => {}], ['marcus', 'WO-2291 exception', async pg => { await go(pg, '/t/marcus/configure'); await pg.check('[data-nx-key="x-WO-2291"]'); }],
  ['jordan', 'start', async () => {}], ['daniel', 'start', async () => {}], ['daniel', 'escort route', async pg => { await go(pg, '/t/daniel/respond'); await pg.check('[data-nx-key="rt-escortWest"]'); }],
];
const doorIds = pg => ev(pg, () => Object.keys(Engine.DOORS));

const tests = {
  async 'evidence: for every door on all four tickets (granted and denied), the cutaway shows exactly the flat map\'s inspection panel, by door list, by a real tap on the marker, and at 2x'(b) {
    const run = async (url, size, how) => { const pg = await open(b, url, size), out = {};
      for (const [id, name, prep] of STATES) { await prep(pg); await go(pg, `/t/${id}/review`); await inspectOn(pg);
        for (const d of await doorIds(pg)) { await pick(pg, d);
          if (how === 'tap' || how === 'zoom') { if (how === 'zoom' && (await ev(pg, () => vis('#nxZoom').textContent)) === 'Zoom in') await ev(pg, () => vis('#nxZoom').click());
            const [x, y] = await ev(pg, d => { const s = vis('#nxMapSvg'), b = s.getBoundingClientRect(), vb = s.getAttribute('viewBox').split(' ').map(Number), k = b.width / vb[2], [X, Y] = NxMap.cutaway.cdoor(d); return [b.left + (X - vb[0]) * k, b.top + (Y - vb[1]) * k]; }, d);
            await ev(pg, () => { const s = vis('#nxDoorPick'); s.value = ''; }); await pg.mouse.click(x, y); }
          out[`${id} ${name} ${d}`] = [await evidence(pg), JSON.stringify(await ev(pg, id => __nx.state(id).sel, id))]; }
        if (pg.size !== 'desktop') await pg.keyboard.press('Escape'); }
      await done(pg); return out; };
    const flat = await run(OFF, 'desktop', 'pick'), all = Object.values(flat).map(v => v[0]).join('');
    assert(/nx-ok">Opens/.test(all) && /nx-bad">Denied/.test(all), 'both granted and denied doors are covered'); assert.strictEqual(Object.keys(flat).length, STATES.length * DOORS);
    const opens = Object.values(flat).filter(v => /nx-ok">Opens/.test(v[0])).length, denied = Object.values(flat).filter(v => /nx-bad">Denied/.test(v[0])).length; console.log(`     ${opens} door states open, ${denied} denied, over ${STATES.length} badge states`);
    for (const [size, how] of [['desktop', 'pick'], ['320', 'pick'], ['400', 'pick'], ['desktop', 'tap'], ['320', 'tap'], ['400', 'tap'], ['320', 'zoom']]) {
      const cut = await run(ON, size, how); for (const k of Object.keys(flat)) { assert.strictEqual(cut[k][1], flat[k][1], `${size} ${how} ${k}: selection`); assert.strictEqual(cut[k][0], flat[k][0], `${size} ${how} ${k}: evidence`); } } },
  async 'change review: the cutaway outlines exactly the engine\'s added and removed areas on both levels, as the flat map does; the Show changes toggle hides them'(b) {
    const run = async url => { const pg = await open(b, url, 'desktop'), out = [];
      const read = async label => { for (const l of [1, 2]) { await ev(pg, l => vis('#nxLv' + l).click(), l);
          out.push([label, l, await ev(pg, () => { const s = vis('#nxMapSvg'), g = [...s.querySelectorAll(':scope > g[data-level] [data-delta], :scope > [data-delta], :scope > g:not([data-lens-level]) [data-delta]')].filter(e => !e.closest('[data-lens-level]'));
            return { added: [...new Set(g.filter(e => e.dataset.delta === 'added').map(e => e.dataset.space))].sort(), removed: [...new Set(g.filter(e => e.dataset.delta === 'removed').map(e => e.dataset.space))].sort() }; })]); } };
      const engine = id => ev(pg, id => { const d = __nx.state(id).delta; return d && { added: [...d.addedSpaces].sort(), removed: [...d.removedSpaces].sort() }; }, id);
      await go(pg, '/t/elena/configure'); await pg.check('[data-nx-key="g-exhibitOps"]'); await read('elena +exhibitOps'); out.push(['engine', await engine('elena')]);
      await pg.click('[data-nx-key="delta"]'); await read('elena hidden'); await pg.click('[data-nx-key="delta"]');
      await pg.uncheck('[data-nx-key="g-exhibitOps"]'); await read('elena -exhibitOps'); out.push(['engine', await engine('elena')]);
      await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]'); await read('elena +allStaff +education'); out.push(['engine', await engine('elena')]);
      await go(pg, '/t/marcus/configure'); await pg.check('[data-nx-key="gs"]'); await read('marcus schedule only'); out.push(['engine', await engine('marcus')]);
      await go(pg, '/t/jordan/decide'); await pg.check('[data-nx-key="rv"]'); await read('jordan deactivated'); out.push(['engine', await engine('jordan')]);
      await go(pg, '/t/daniel/respond'); await pg.check('[data-nx-key="g-allStaff"]'); await read('daniel +allStaff'); out.push(['engine', await engine('daniel')]);
      await done(pg); return out; };
    const flat = await run(OFF), cut = await run(ON); assert.deepEqual(cut, flat);
    /* and the map matches the engine: per level, the outlined areas are the engine's delta on that level */
    for (let i = 0; i < cut.length; i++) if (cut[i][0] === 'engine' && cut[i][1]) { const e = cut[i][1], drawn = cut.slice(Math.max(0, i - 2), i).filter(x => x[0] !== 'engine');
      for (const [label, l, d] of drawn) { const lv = k => ['westSvc', 'spine', 'eastSvc', 'receiving', 'westGal', 'kelp', 'touch', 'classroom', 'reef', 'jelly', 'seasonal', 'atrium', 'westCore1', 'eastCore1'].includes(k) ? 1 : 2;
        assert.deepEqual(d.added, e.added.filter(k => lv(k) === l).sort(), `${label} L${l} added`); assert.deepEqual(d.removed, e.removed.filter(k => lv(k) === l).sort(), `${label} L${l} removed`); } }
    assert(cut.some(x => x[0] === 'elena +exhibitOps' && x[2].added.includes('quarantine')), 'Quarantine outlined on L2'); assert(cut.filter(x => x[0] === 'elena hidden').every(x => !x[2].added.length && !x[2].removed.length), 'hidden when toggled off');
    assert(cut.some(x => x[0] === 'elena -exhibitOps' && x[2].removed.includes('quarantine')), 'removed shown'); },
  async 'progression: all four correct paths and the meaningful wrong answers grade, record and track identically with the flag on and off (with inspection and identification used on the way)'(b) {
    const run = async url => { const pg = await open(b, url, 'desktop'), cut = url === ON, log = [];
      const busy = async id => { await inspectOn(pg); for (const d of ['D-QUAR', 'D-DOCK', 'D-LSG']) await pick(pg, d); if (cut) { await ev(pg, () => vis('#nxZoom').click()); await ev(pg, () => vis('#nxZoom').click()); } await ev(pg, () => vis('#nxInspect').click());
        if (cut) for (const v of ['room|quarantine|2', 'door|D-DOCK|1', 'passage|reef~jelly|1', 'void|1|2', 'core|westCore1|1']) await ev(pg, v => { const s = vis('#nxFind'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v); };
      const sub = async id => { await go(pg, `/t/${id}/close`); await pg.click('[data-nx-key="submit"]'); if (await ev(pg, () => document.getElementById('nxMoment').open)) await pg.click('#nxMomentOk');
        log.push([id, await ev(pg, id => JSON.stringify([__nx.state(id), __nx.steps(id), __nx.result(id), __nx.record(id), __nx.status(id), __nx.grade(id)]), id)]); };
      /* wrong answers first, then the correct paths */
      await sub('elena'); await go(pg, '/t/elena/configure'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-exhibitOps"]'); await busy('elena'); await walk(pg, 'elena'); await sub('elena');
      await go(pg, '/t/marcus/configure'); await pg.check('[data-nx-key="gs"]'); await walk(pg, 'marcus'); await sub('marcus');
      await go(pg, '/t/jordan/decide'); await pg.uncheck('[data-nx-key="g-tempExhibitAV"]'); await pg.check('[data-nx-key="dp-ended"]'); await sub('jordan');
      await go(pg, '/t/daniel/respond'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="rt-selfWest"]'); await busy('daniel'); await walk(pg, 'daniel'); await sub('daniel');
      await go(pg, '/t/daniel/respond'); await pg.uncheck('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="rt-wait"]'); await sub('daniel');
      await go(pg, '/t/elena/configure'); await pg.uncheck('[data-nx-key="g-exhibitOps"]'); await pg.check('[data-nx-key="g-education"]'); await walk(pg, 'elena'); await sub('elena');
      await go(pg, '/t/marcus/configure'); await pg.uncheck('[data-nx-key="gs"]'); await pg.check('[data-nx-key="x-WO-2291"]'); await busy('marcus'); await walk(pg, 'marcus'); await sub('marcus');
      await go(pg, '/t/jordan/decide'); await pg.check('[data-nx-key="g-tempExhibitAV"]'); await pg.check('[data-nx-key="rv"]'); await pg.check('[data-nx-key="dp-ended"]'); await busy('jordan'); await sub('jordan');
      await go(pg, '/t/daniel/respond'); await pg.check('[data-nx-key="rt-escortWest"]'); await walk(pg, 'daniel'); await sub('daniel');
      await go(pg, '/inbox'); log.push(['inbox', await ev(pg, () => [document.querySelector('.nx-count').textContent, [...document.querySelectorAll('.nx-status')].map(x => x.textContent).join(',')].join('|'))]);
      await done(pg); return log; };
    const off = await run(OFF), on = await run(ON); assert.strictEqual(on.length, off.length); on.forEach((x, i) => assert.deepEqual(x, off[i], `step ${i} (${x[0]})`));
    const g = id => off.filter(x => x[0] === id).map(x => JSON.parse(x[1])[5].title); console.log('     grades (flag off = on):', JSON.stringify({ elena: g('elena'), marcus: g('marcus'), jordan: g('jordan'), daniel: g('daniel') }));
    assert.strictEqual(off[off.length - 1][1], '0|Closed,Closed,Closed,Closed'); },
  async 'identification stays separate from inspection: it never selects, never shows evidence, and Inspect evidence is unchanged after any identification'(b) {
    const pg = await open(b, ON, '400'); await go(pg, '/t/elena/review'); await inspectOn(pg); await pick(pg, 'D-QUAR'); const ev0 = await evidence(pg); await ev(pg, () => vis('#nxInspect').click());
    const s0 = await ev(pg, () => JSON.stringify(__nx.state('elena')));
    for (const v of ['door|D-DOCK|1', 'room|kelp|1', 'door|D-QUAR|2']) { await ev(pg, v => { const s = vis('#nxFind'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
      assert.strictEqual(await ev(pg, () => !!vis('#nxInsp')), false, 'no evidence outside Inspect'); }
    assert.strictEqual(await ev(pg, () => JSON.stringify(__nx.state('elena'))), s0, 'selection and ticket untouched'); await ev(pg, () => vis('#nxInspect').click());
    assert.deepEqual(await ev(pg, () => __nx.state('elena').sel), { door: 'D-QUAR' }, 'Inspect keeps its own selection'); assert.strictEqual(await evidence(pg), ev0); await done(pg); },
  async 'resize during Inspect (1x and 2x): lens, selected door, its name and the lens picture stay registered on the marker; selection and focus are kept'(b) {
    const bad = []; for (const [from, to] of [[[320, 568], [400, 700]], [[400, 860], [340, 700]], [[1366, 900], [1240, 900]], [[1240, 900], [1500, 900]]]) for (const z of [1, 2]) {
      const pg = await (await b.newContext({ viewport: { width: from[0], height: from[1] }, reducedMotion: 'reduce' })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
      await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); }); pg.base = ON; pg.size = from[0] >= 1180 ? 'desktop' : '320';
      await go(pg, '/t/elena/configure'); await inspectOn(pg); for (const d of ['D-QUAR', 'D-DOCK']) await pick(pg, d); if (z === 2) await ev(pg, () => vis('#nxZoom').click());
      await ev(pg, () => vis('#nxMapSvg').focus()); await pg.keyboard.press('ArrowUp'); await pg.keyboard.press('ArrowDown');
      const sel0 = await ev(pg, () => JSON.stringify(__nx.state('elena').sel)); await pg.setViewportSize({ width: to[0], height: to[1] }); await pg.waitForTimeout(250);
      const r = await ev(pg, () => { const s = vis('#nxMapSvg'), b = s.getBoundingClientRect(), vb = s.getAttribute('viewBox').split(' ').map(Number), k = b.width / vb[2], c = e => { const q = e.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; };
        const sel = __nx.state('elena').sel, [X, Y] = NxMap.cutaway.cdoor(sel.door), want = [b.left + (X - vb[0]) * k, b.top + (Y - vb[1]) * k];
        const lens = s.querySelector('.nx-lens'), ring = s.querySelector('[data-sel]'), mark = s.querySelector(`[data-level] .nx-door[data-door="${sel.door}"]`), name = s.querySelector('.nx-callout').getBoundingClientRect();
        const li = s.parentNode.querySelector('.nx-map-lensimg'), m = /circle\(([\d.]+)px at ([\d.-]+)px ([\d.-]+)px\)/.exec(li.style.clipPath), lb = li.getBoundingClientRect(), lc = c(lens);
        return { want, mark: c(mark), ring: c(ring), lens: lc, lensImg: [lb.left + +m[2], lb.top + +m[3]], lensR: [lens.getBoundingClientRect().width / 2, +m[1]], markW: mark.getBoundingClientRect().width,
          nameOk: name.left >= b.left - 0.5 && name.right <= b.right + 0.5 && name.top >= b.top - 0.5 && name.bottom <= b.bottom + 0.5 && !(name.left < c(mark)[0] + 7 && name.right > c(mark)[0] - 7 && name.top < c(mark)[1] + 7 && name.bottom > c(mark)[1] - 7),
          focus: document.activeElement.id, lensP: vis('#nxMapSvg') && null }; });
      const near = (a, c, t = 1.5) => Math.hypot(a[0] - c[0], a[1] - c[1]) <= t, tag = `${from[0]}->${to[0]} ${z}x`;
      if (!near(r.mark, r.want) || !near(r.ring, r.want) || !near(r.lensImg, r.lens) || Math.abs(r.lensR[0] - r.lensR[1]) > 2 || Math.abs(r.markW - 14) > 0.6 || !r.nameOk) bad.push(`${tag} ${JSON.stringify(r)}`);
      if (await ev(pg, () => JSON.stringify(__nx.state('elena').sel)) !== sel0) bad.push(tag + ' selection changed'); if (r.focus !== 'nxMapSvg') bad.push(`${tag} focus ${r.focus}`);
      assert.deepEqual(pg.errs, []); await pg.context().close(); }
    assert.deepEqual(bad, []); },
};
(async () => { const b = await chromium.launch(); let pass = 0, n = 0;
  for (const [name, f] of Object.entries(tests)) { n++; try { await f(b); pass++; console.log('ok', name); } catch (e) { console.log('FAIL', name, '\n  ', e.message.split('\n').slice(0, 6).join('\n   ')); } }
  await b.close(); console.log(`\n${pass}/${n} cutaway Step 5 tests passed`); process.exit(pass === n ? 0 : 1); })();
