// Cutaway map frame (integration Step 2). The flag is off by default; these tests pin both sides of it.
// Needs Playwright; skips cleanly if it is missing. Run through `npm run test:ui` (after build.py).
const assert = require('assert'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
let chromium; try { ({ chromium } = require('playwright')); } catch (_) { console.log('skip: playwright not installed'); process.exit(0); }
const file = f => pathToFileURL(path.join(__dirname, '../dist', f)).href, DEFAULT = file('v2.html'), PREVIEW = file('v2-cutaway-preview.html');
if (!fs.existsSync(path.join(__dirname, '../dist/v2-cutaway-preview.html'))) { console.log('skip: dist/v2-cutaway-preview.html not built'); process.exit(0); }
const SIZES = { 320: { width: 320, height: 568 }, 400: { width: 400, height: 860 }, desktop: { width: 1366, height: 900 } };
const open = async (b, url, size = 320) => { const pg = await (await b.newContext({ viewport: SIZES[size], reducedMotion: 'reduce' })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); await pg.goto(url); return pg; };
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
  async 'flag on: both levels render inside the framed canvas at 320, 400 and desktop, with no sideways scrolling and no errors'(b) {
    for (const size of Object.keys(SIZES)) { const pg = await open(b, PREVIEW + '?map=cutaway#/t/elena/review', size); await showMap(pg, size);
      for (const l of [1, 2]) { await pg.evaluate(l => [...document.querySelectorAll('#nxLv' + l)].find(e => e.getBoundingClientRect().width > 0).click(), l);
        const r = await pg.evaluate(async () => { const s = [...document.querySelectorAll('#nxMapSvg')].find(e => e.getBoundingClientRect().width > 0), base = s.parentNode.querySelector('.nx-map-base'), im = base.querySelector('image');
          const probe = new Image(); probe.src = im.getAttribute('href'); await probe.decode(); const bb = base.getBoundingClientRect(), ob = s.getBoundingClientRect(), fb = s.parentNode.getBoundingClientRect();
          return { level: base.dataset.nxLevel, natural: [probe.naturalWidth, probe.naturalHeight], vb: base.getAttribute('viewBox'), ovb: s.getAttribute('viewBox'), frame: s.dataset.nxFrame, overlayEmpty: s.innerHTML === '', baseBox: [bb.x, bb.y, bb.width, bb.height].map(Math.round), overBox: [ob.x, ob.y, ob.width, ob.height].map(Math.round), inFig: bb.right <= fb.right + 1 && bb.left >= fb.left - 1,
            overflow: document.documentElement.scrollWidth - innerWidth, pressed: [...document.querySelectorAll('#nxLv' + base.dataset.nxLevel)].some(e => e.getAttribute('aria-pressed') === 'true') }; });
        assert.strictEqual(r.level, String(l), `${size} L${l}`); assert.deepEqual(r.natural, [1600, 1004], 'the painted level decodes at full size'); assert.strictEqual(r.vb, r.ovb, 'overlay and base share one canvas'); assert.deepEqual(r.baseBox, r.overBox, 'overlay sits exactly on the base');
        assert.strictEqual(r.frame, 'cutaway'); assert(r.overlayEmpty, 'no overlays yet (Step 3)'); assert(r.inFig && r.baseBox[2] > 200, 'visible and inside its figure'); assert.strictEqual(r.overflow, 0, 'no sideways scrolling'); assert(r.pressed); }
      assert.deepEqual(pg.errs, [], size); await pg.close(); } },
  async 'flag on: the canvas margins fit a lens, with its label, centred on any door of either level'(b) {
    const pg = await open(b, PREVIEW + '?map=cutaway', 'desktop'); const r = await pg.evaluate(() => { const c = NxMap.cutaway.canvas(), R = NxMap.cutaway.LENS_R, out = [];
      for (const d of Object.keys(Engine.DOORS)) { const [x, y] = NxMap.cutaway.cdoor(d); if (x - R < c.x || x + R > c.x + c.w || y - R < c.y || y + R + 16 > c.y + c.h) out.push(d); } return { c, out, n: Object.keys(Engine.DOORS).length }; });
    assert.deepEqual(r.out, [], 'doors whose lens would be cut'); assert.strictEqual(r.n, 15); assert(r.c.margin.r >= 40 && r.c.margin.b >= 40, 'the dock door and the staff entrance drive the right and bottom margins'); assert(r.c.w / 400 < 1.25, 'the map keeps at least 80% of its width'); await pg.close(); },
  async 'flag on: Inspect is unavailable, the caption says what the preview does not show, and the text summary of the badge stays'(b) {
    const pg = await open(b, PREVIEW + '?map=cutaway#/t/elena/review', 'desktop'); const r = await pg.evaluate(() => { const vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); return { insp: vis('#nxInspect').disabled, cap: vis('#nxMapCap').textContent, role: vis('#nxMapSvg').getAttribute('role') }; });
    assert.strictEqual(r.insp, true); assert(/Cutaway map preview/.test(r.cap) && /not drawn on this preview yet/.test(r.cap)); assert(/Elena Park's badge grants access to/.test(r.cap)); assert.strictEqual(r.role, 'img'); assert.deepEqual(pg.errs, []); await pg.close(); },
  async 'flag on changes nothing about scenarios, permissions or grading: all four tickets give the same state and steps'(b) {
    const snap = async url => { const pg = await open(b, url, 'desktop'); const s = await pg.evaluate(() => JSON.stringify(['elena', 'marcus', 'jordan', 'daniel'].map(id => [__nx.state(id), __nx.steps(id), __nx.result(id), __nx.record(id)]))); await pg.close(); return s; };
    assert.strictEqual(await snap(PREVIEW + '?map=cutaway'), await snap(DEFAULT)); },
};
(async () => { const b = await chromium.launch(); let fail = 0;
  for (const [name, fn] of Object.entries(tests)) { try { await fn(b); console.log('ok', name); } catch (e) { fail++; console.log('FAIL', name, '\n  ', e.message.slice(0, 500)); } }
  await b.close(); console.log(`\n${Object.keys(tests).length - fail}/${Object.keys(tests).length} cutaway frame tests passed`); process.exit(fail ? 1 : 0); })();
