// Cutaway map behind its flag (integration Steps 2 and 3). The flag is off by default; these tests pin both sides of it.
// Needs Playwright; skips cleanly if it is missing. Run through `npm run test:ui` (after build.py).
const assert = require('assert'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
let chromium; try { ({ chromium } = require('playwright')); } catch (_) { console.log('skip: playwright not installed'); process.exit(0); }
const file = f => pathToFileURL(path.join(__dirname, '../dist', f)).href, DEFAULT = file('v2.html'), PREVIEW = file('v2-cutaway-preview.html');
if (!fs.existsSync(path.join(__dirname, '../dist/v2-cutaway-preview.html'))) { console.log('skip: dist/v2-cutaway-preview.html not built'); process.exit(0); }
const SIZES = { 320: { width: 320, height: 568 }, 400: { width: 400, height: 860 }, desktop: { width: 1366, height: 900 } };
const open = async (b, url, size = 320) => { const pg = await (await b.newContext({ viewport: SIZES[size], reducedMotion: 'reduce' })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); }); await pg.goto(url); return pg; };
const showMap = async (pg, size) => { if (size !== 'desktop') await pg.click('#nxMapBtn'); };
const mapState = pg => pg.evaluate(() => { const s = [...document.querySelectorAll('#nxMapSvg')].find(e => e.getBoundingClientRect().width > 0); return s && { viewBox: s.getAttribute('viewBox'), frame: s.dataset.nxFrame || null, base: !!s.parentNode.querySelector('.nx-map-base'), doors: s.querySelectorAll('.nx-door').length, w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height }; });
const tests = {
  async 'default build: no cutaway art in the file, and ?map=cutaway changes nothing'(b) {
    const html = fs.readFileSync(path.join(__dirname, '../dist/v2.html'), 'utf8'); assert(!html.includes('NX_CUTAWAY='), 'no art data'); for (const lv of ['L1', 'L2']) assert(!html.includes(fs.readFileSync(path.join(__dirname, '../assets/v2/cutaway/' + lv + '.webp')).toString('base64').slice(0, 400)), lv + ' art is not embedded');
    for (const q of ['', '?map=cutaway']) { const pg = await open(b, DEFAULT + q + '#/t/elena/review', 'desktop'), m = await mapState(pg);
      assert.strictEqual(m.viewBox, '0 0 400 300', q); assert.strictEqual(m.frame, null); assert.strictEqual(m.base, false); assert(m.doors > 0, 'flat map doors drawn'); assert.strictEqual(await pg.evaluate(() => NxMap.cutawayOn()), false); assert.deepEqual(pg.errs, []); await pg.close(); } },
  async 'preview build without the flag behaves as the default build: same map, same badge, same walk and record'(b) {
    const run = async url => { const pg = await open(b, url + '#/t/elena/review', 'desktop'); const m = await mapState(pg);
      const caption = await pg.evaluate(() => [...document.querySelectorAll('#nxMapCap')].map(e => e.textContent).find(Boolean)), svg = await pg.evaluate(() => [...document.querySelectorAll('#nxMapSvg')].find(e => e.getBoundingClientRect().width > 0).innerHTML.length);
      const state = await pg.evaluate(() => JSON.stringify([__nx.state('elena'), __nx.steps('elena')])); assert.deepEqual(pg.errs, []); await pg.close(); return { m, caption, svg, state }; };
    const a = await run(DEFAULT), c = await run(PREVIEW); assert.deepEqual(c, a); assert.strictEqual(c.m.frame, null); },
  async 'flag on: both levels render with their door markers at 320, 400 and desktop; no sideways scrolling, no errors, nothing cut by the canvas'(b) {
    for (const size of Object.keys(SIZES)) { const pg = await open(b, PREVIEW + '?map=cutaway#/t/elena/review', size); await showMap(pg, size);
      for (const l of [1, 2]) { await pg.evaluate(l => vis('#nxLv' + l).click(), l);
        const r = await pg.evaluate(async () => { const s = vis('#nxMapSvg'), base = s.parentNode.querySelector('.nx-map-base'), im = base.querySelector('image'); const probe = new Image(); probe.src = im.getAttribute('href'); await probe.decode();
          const bb = base.getBoundingClientRect(), ob = s.getBoundingClientRect(), box = r => [r.x, r.y, r.width, r.height].map(Math.round);
          const ds = [...s.querySelectorAll('[data-level] .nx-door')].map(c => { const q = c.getBoundingClientRect(); return { d: c.dataset.door, w: q.width, inside: q.left >= ob.left && q.right <= ob.right && q.top >= ob.top && q.bottom <= ob.bottom }; });
          return { level: base.dataset.nxLevel, natural: [probe.naturalWidth, probe.naturalHeight], same: base.getAttribute('viewBox') === s.getAttribute('viewBox'), baseBox: box(bb), overBox: box(ob), ds, veil: !!s.querySelector('[data-veil]'), overflow: document.documentElement.scrollWidth - innerWidth }; });
        assert.strictEqual(r.level, String(l), `${size} L${l}`); assert.deepEqual(r.natural, [1600, 1004]); assert(r.same, 'one canvas'); assert.deepEqual(r.baseBox, r.overBox, 'overlay sits exactly on the picture');
        assert.strictEqual(r.ds.length, l === 1 ? 7 : 8, 'one marker per door on this level'); assert(r.ds.every(d => d.inside), 'no marker cut: ' + r.ds.filter(d => !d.inside).map(d => d.d)); assert(r.ds.every(d => Math.abs(d.w - 14) < 0.6), 'markers are 14 px across at every width: ' + r.ds[0].w);
        assert(r.veil); assert.strictEqual(r.overflow, 0); }
      assert.deepEqual(pg.errs, [], size); await pg.close(); } },
  async 'flag on: the canvas margins fit a lens, with its label, centred on any door of either level'(b) {
    const pg = await open(b, PREVIEW + '?map=cutaway', 'desktop'); const r = await pg.evaluate(() => { const c = NxMap.cutaway.canvas(), R = NxMap.cutaway.LENS_R, out = [];
      for (const d of Object.keys(Engine.DOORS)) { const [x, y] = NxMap.cutaway.cdoor(d); if (x - R < c.x || x + R > c.x + c.w || y - R < c.y || y + R + 16 > c.y + c.h) out.push(d); } return { c, out, n: Object.keys(Engine.DOORS).length }; });
    assert.deepEqual(r.out, []); assert.strictEqual(r.n, 15); assert(r.c.w / 400 < 1.25, 'the map keeps at least 80% of its width'); await pg.close(); },
  async 'flag on: the granted footprint is the engine\'s: lit rooms, veil and granted doors match Engine.footprint on both levels'(b) {
    const pg = await open(b, PREVIEW + '?map=cutaway#/t/elena/configure', 'desktop'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-exhibitOps"]');
    for (const l of [1, 2]) { await pg.evaluate(l => vis('#nxLv' + l).click(), l);
      const r = await pg.evaluate(l => { const s = vis('#nxMapSvg'), t = { groups: __nx.state('elena').credential.groups }; const person = JSON.parse(JSON.stringify(SCENARIOS.elena.person)); person.credential = __nx.state('elena').credential;
        const fp = Engine.footprint({ day: SCENARIOS.elena.day, date: SCENARIOS.elena.date, doorStatus: {}, groupOverrides: {} }, person);
        return { lit: [...s.querySelectorAll('[data-level] [data-lit]')].map(e => e.dataset.lit).sort(), want: [...fp.spaces].filter(k => Engine.SPACES[k].l === l).sort(),
          granted: [...s.querySelectorAll('[data-level] .nx-door[data-granted="true"]')].map(e => e.dataset.door).sort(), wantD: [...fp.doors].filter(d => Engine.doorLevel(d) === l).sort() }; }, l);
      assert.deepEqual(r.lit, r.want, 'L' + l + ' lit rooms'); assert.deepEqual(r.granted, r.wantD, 'L' + l + ' granted doors'); assert(r.want.length > 0); }
    assert.deepEqual(pg.errs, []); await pg.close(); },
  async 'flag on, Inspect: a real tap on every door marker selects that door, at 320, 400 and desktop, on both levels'(b) {
    for (const size of Object.keys(SIZES)) { const pg = await open(b, PREVIEW + '?map=cutaway#/t/elena/configure', size); await showMap(pg, size); await pg.evaluate(() => vis('#nxInspect').click()); const wrong = [];
      for (const l of [1, 2]) { await pg.evaluate(l => vis('#nxLv' + l).click(), l);
        for (const d of await pg.evaluate(l => Object.keys(Engine.DOORS).filter(d => Engine.doorLevel(d) === l), l)) {
          await pg.evaluate(() => vis('#nxMapSvg').scrollIntoView({ block: 'center' })); const q = await pg.evaluate(d => { const r = vis('#nxMapSvg').querySelector(`[data-level] .nx-door[data-door="${d}"]`).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, d);
          await pg.mouse.click(q[0], q[1]); const got = await pg.evaluate(() => (__nx.state('elena').sel || {}).door); if (got !== d) wrong.push(`${size} ${d} -> ${got}`); } }
      assert.deepEqual(wrong, []); assert.deepEqual(pg.errs, [], size); await pg.close(); } },
  async 'flag on, Inspect: the named-door picker reaches all 15 doors; the lens ring, its label and the door\'s name stay inside the map and the name does not cover the door'(b) {
    for (const size of Object.keys(SIZES)) { const pg = await open(b, PREVIEW + '?map=cutaway#/t/elena/configure', size); await showMap(pg, size); await pg.evaluate(() => vis('#nxInspect').click()); const bad = [];
      for (const d of await pg.evaluate(() => Object.keys(Engine.DOORS))) { await pg.evaluate(d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d);
        const r = await pg.evaluate(d => { const s = vis('#nxMapSvg'), ob = s.getBoundingClientRect(), inb = e => { const q = e.getBoundingClientRect(); return q.left >= ob.left - 0.5 && q.right <= ob.right + 0.5 && q.top >= ob.top - 0.5 && q.bottom <= ob.bottom + 0.5; };
          const ring = s.querySelector('.nx-lens'), lab = ring.nextElementSibling, co = s.querySelector('.nx-callout rect').getBoundingClientRect(), mk = s.querySelector(`[data-sel="${d}"]`).getBoundingClientRect(), li = s.parentNode.querySelector('.nx-map-lensimg');
          return { sel: (__nx.state('elena').sel || {}).door, level: s.parentNode.querySelector('.nx-map-base').dataset.nxLevel, ring: inb(ring), label: inb(lab), callout: inb(s.querySelector('.nx-callout rect')), covers: !(co.right < mk.left || co.left > mk.right || co.bottom < mk.top || co.top > mk.bottom),
            labelFill: getComputedStyle(lab).fill, lens: li.style.display !== 'none' && /circle\(/.test(li.style.clipPath) && li.dataset.nxLevel !== s.parentNode.querySelector('.nx-map-base').dataset.nxLevel, ev: vis('#nxInsp').textContent.includes(Engine.DOORS[d].n) }; }, d);
        if (r.sel !== d || r.level !== String(await pg.evaluate(d => Engine.doorLevel(d), d)) || !r.ring || !r.label || !r.callout || r.covers || !r.lens || !r.ev || r.labelFill !== 'rgb(226, 255, 255)') bad.push(size + ' ' + d + ' ' + JSON.stringify(r)); }
      assert.deepEqual(bad, []); assert.deepEqual(pg.errs, [], size); await pg.close(); } },
  async 'flag on, Inspect: a tap on a room away from doors selects the room (as on the flat map); the lens shows the other level; arrow keys move the lens'(b) {
    const pg = await open(b, PREVIEW + '?map=cutaway#/t/elena/configure', 'desktop'); await pg.evaluate(() => vis('#nxInspect').click());
    const pt = await pg.evaluate(() => { const s = vis('#nxMapSvg'), ob = s.getBoundingClientRect(), c = NxMap.cutaway.canvas(), [x, y] = NxMap.cutaway.cpos(256, 255), k = ob.width / c.w; return [ob.x + (x - c.x) * k, ob.y + (y - c.y) * k]; });
    await pg.mouse.click(pt[0], pt[1]); assert.deepEqual(await pg.evaluate(() => (__nx.state('elena').sel || {}).space), 'atrium'); assert(/Atrium/.test(await pg.evaluate(() => vis('#nxInsp').textContent)));
    assert.strictEqual(await pg.evaluate(() => vis('#nxMapSvg').querySelector('[data-lens-level]').dataset.lensLevel), '2');
    const before = await pg.evaluate(() => vis('#nxMapSvg').querySelector('.nx-lens').getAttribute('cx')); await pg.evaluate(() => vis('#nxMapSvg').focus()); await pg.keyboard.press('ArrowRight');
    assert.notStrictEqual(await pg.evaluate(() => vis('#nxMapSvg').querySelector('.nx-lens').getAttribute('cx')), before); assert.deepEqual(pg.errs, []); await pg.close(); },
  async 'flag on: the walk draws its route and door results; a stopped walk shows where, never why'(b) {
    const pg = await open(b, PREVIEW + '?map=cutaway#/t/elena/configure', 'desktop'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]'); await pg.goto(PREVIEW + '?map=cutaway#/t/elena/verify'); await pg.click('[data-nx-key="walk"]');
    await pg.waitForFunction(() => { const w = __nx.state('elena').walk; return w && !w.running; }, null, { timeout: 30000 });
    let r = await pg.evaluate(() => { const s = vis('#nxMapSvg'); return { lines: s.querySelectorAll('.nx-route line').length, ok: [...s.querySelectorAll('.nx-route [data-walk]')].map(e => e.dataset.ok), note: vis('#nxWalkNote').textContent }; });
    assert(r.lines >= 3, 'route drawn'); assert(r.ok.length >= 1 && r.ok.every(v => v === 'true')); assert(/Walk complete/.test(r.note));
    await pg.goto(PREVIEW + '?map=cutaway#/t/elena/configure'); await pg.uncheck('[data-nx-key="g-allStaff"]'); await pg.goto(PREVIEW + '?map=cutaway#/t/elena/verify'); await pg.click('[data-nx-key="walk"]');
    await pg.waitForFunction(() => /Walk stopped/.test((vis('#nxWalkNote') || {}).textContent || ''), null, { timeout: 30000 });
    r = await pg.evaluate(() => { const s = vis('#nxMapSvg'); return { stop: [...s.querySelectorAll('.nx-route [data-walk][data-ok="false"]')].map(e => e.dataset.walk), note: vis('#nxWalkNote').textContent, map: s.textContent }; });
    assert.deepEqual(r.stop, ['D-WSE']); assert(/Walk stopped at West Staff Entrance\./.test(r.note)); assert(!/denied|schedule|group|fault|inactive/i.test(r.note + r.map), 'no reason on the walk'); assert.deepEqual(pg.errs, []); await pg.close(); },
  async 'the same actions give the same ticket state, result and record with the flag on and off (configure, walk, inspect, on all four tickets\' start states)'(b) {
    const run = async url => { const pg = await open(b, url + '#/t/elena/configure', 'desktop'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]'); await pg.evaluate(() => vis('#nxInspect').click());
      await pg.evaluate(() => { const s = vis('#nxDoorPick'); s.value = 'D-LSG'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await pg.goto(url + '#/t/elena/verify'); await pg.click('[data-nx-key="walk"]');
      await pg.waitForFunction(() => { const w = __nx.state('elena').walk; return w && !w.running; }, null, { timeout: 30000 });
      const s = await pg.evaluate(() => JSON.stringify(['elena', 'marcus', 'jordan', 'daniel'].map(id => [__nx.state(id), __nx.steps(id), __nx.result(id), __nx.record(id)]))); assert.deepEqual(pg.errs, []); await pg.close(); return s; };
    assert.strictEqual(await run(PREVIEW + '?map=cutaway'), await run(DEFAULT + '?')); },
};
(async () => { const b = await chromium.launch(); let fail = 0;
  for (const [name, fn] of Object.entries(tests)) { try { await fn(b); console.log('ok', name); } catch (e) { fail++; console.log('FAIL', name, '\n  ', e.message.slice(0, 500)); } }
  await b.close(); console.log(`\n${Object.keys(tests).length - fail}/${Object.keys(tests).length} cutaway frame tests passed`); process.exit(fail ? 1 : 0); })();
