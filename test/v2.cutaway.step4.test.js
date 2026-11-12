// Cutaway integration Step 4 (flag on): Inspect zoom, the quieter footprint, room labels, identify-on-tap and Find on the map.
// Needs Playwright and dist/v2-cutaway-preview.html (python3 build.py). Run through `npm run test:ui`.
const assert = require('assert'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
let chromium; try { ({ chromium } = require('playwright')); } catch (_) { console.log('skip: playwright not installed'); process.exit(0); }
if (!fs.existsSync(path.join(__dirname, '../dist/v2-cutaway-preview.html'))) { console.log('skip: dist/v2-cutaway-preview.html not built'); process.exit(0); }
const PREVIEW = pathToFileURL(path.join(__dirname, '../dist/v2-cutaway-preview.html')).href + '?map=cutaway', FLAT = pathToFileURL(path.join(__dirname, '../dist/v2.html')).href;
const SIZES = { 320: [320, 568], 400: [400, 860], desktop: [1366, 900] }, W = Object.keys(SIZES);
const DENIAL = /denied|no access|not granted|\bgranted\b|unlocked|\blocked\b|allowed|cannot|can't|permission|authori[sz]ed/i;
const open = async (b, url, size = 320) => { const pg = await (await b.newContext({ viewport: { width: SIZES[size][0], height: SIZES[size][1] }, reducedMotion: 'reduce' })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); }); await pg.goto(url); pg.size = size; return pg; };
const ticket = async (pg, who = 'elena', stage = 'configure') => { await pg.goto(pg.url().split('#')[0] + `#/t/${who}/${stage}`); if (who === 'elena' && stage === 'configure') { await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-education"]'); } if (pg.size !== 'desktop') await pg.click('#nxMapBtn'); await pg.waitForTimeout(100); };
const ev = (pg, f, a) => pg.evaluate(f, a), done = async pg => { assert.deepEqual(pg.errs, []); await pg.context().close(); };
const level = (pg, l) => ev(pg, l => vis('#nxLv' + l).click(), l), inspect = pg => ev(pg, () => vis('#nxInspect').click()), zoomT = pg => ev(pg, () => vis('#nxZoom').click());
const pick = (pg, d) => ev(pg, d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d);
const find = (pg, v) => ev(pg, v => { const s = vis('#nxFind'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const identOf = pg => ev(pg, () => { const c = vis('#nxMapSvg').querySelector('.nx-ident-callout'); return c ? c.dataset.ident : null; });
const live = async pg => { await pg.waitForTimeout(60); return ev(pg, () => document.getElementById('nxLive').textContent); };
/* screen position of a canvas point on the shown map */
const scr = (pg, X, Y) => ev(pg, ([X, Y]) => { const s = vis('#nxMapSvg'), b = s.getBoundingClientRect(), vb = s.getAttribute('viewBox').split(' ').map(Number), k = b.width / vb[2]; return [b.left + (X - vb[0]) * k, b.top + (Y - vb[1]) * k]; }, [X, Y]);
const geom = pg => ev(pg, () => { const s = vis('#nxMapSvg'), b = s.getBoundingClientRect(), r = e => e && e.getBoundingClientRect(), inside = q => !q || (q.left >= b.left - 0.5 && q.right <= b.right + 0.5 && q.top >= b.top - 0.5 && q.bottom <= b.bottom + 0.5);
  return { vb: s.getAttribute('viewBox'), lensIn: inside(r(s.querySelector('.nx-lens'))), selIn: inside(r(s.querySelector('[data-sel]'))), nameIn: inside(r(s.querySelector('.nx-callout'))), zoomShown: !!vis('#nxZoomWrap'), findShown: !!vis('#nxFindWrap'), overflow: document.documentElement.scrollWidth - innerWidth }; });
const canvasVB = pg => ev(pg, () => { const c = NxMap.cutaway.canvas(); return [c.x, c.y, c.w, c.h].join(' '); });
/* Step 3's overlay with the two approved changes taken out: the quieter footprint pattern and the room labels */
const norm = s => s.replace(/<pattern id="nx(?:Dots|Strp)Q[AB]"[\s\S]*?<\/pattern>/g, '').replace(/nxDotsQ/g, 'nxDots').replace(/nxStrpQ/g, 'nxStrp')
  .replace(/(fill="url\(#nx(?:Dots|Strp)[AB]\)") opacity="1"/g, '$1 opacity=".8"').replace(/<g class="nx-rlabels"[^>]*>[\s\S]*?<\/g>/g, '').replace(/<g data-delta="(?:added|removed)" data-space="[^"]+">[\s\S]*?<\/g>/g, '').replace(/<rect [^>]*class="nx-case"[^>]*><\/rect>/g, '').replace(/ class="nx-line"/g, '');   /* and Step 6 R2's casings */   /* and Step 5's change-review outlines */

const tests = {
  async '1x overview: identical to Step 3 except the approved footprint pattern, room labels and (Step 5) change-review outlines (Inspect off and on, both levels, three widths)'(b) {
    const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden/cutaway-step3-overlay.json'), 'utf8')), snap = require('./v2.cutaway.snapshot.js');
    for (const size of W) { const now = await snap(b, size); for (const [k, v] of Object.entries(golden[size])) assert.strictEqual(norm(now[k]), v, `${size} ${k}`); } },
  async 'the footprint uses the quiet screen-pixel pattern: dots 12 px apart and stripes 10 px apart at every width, same rooms as before'(b) {
    for (const size of W) { const pg = await open(b, PREVIEW, size); await ticket(pg); const r = await ev(pg, () => { const s = vis('#nxMapSvg'), k = s.getBoundingClientRect().width / +s.getAttribute('viewBox').split(' ')[2], p = id => s.querySelector('#' + id);
        return { dots: +p('nxDotsQA').getAttribute('width') * k, strp: +p('nxStrpQA').getAttribute('width') * k, uses: s.querySelectorAll('[fill="url(#nxDotsQA)"]').length, old: s.querySelectorAll('[fill="url(#nxDotsA)"]').length }; });
      assert(Math.abs(r.dots - 12) < 0.05 && Math.abs(r.strp - 10) < 0.05, JSON.stringify(r)); assert(r.uses > 0 && r.old === 0, 'public rooms use the quiet dots'); await done(pg); } },
  async 'zoom: only in Inspect on the cutaway; one toggle, Whole building and 2x; Inspect off and the walk show the whole building'(b) {
    const pg = await open(b, PREVIEW, 320); await ticket(pg); const full = await canvasVB(pg);
    assert.strictEqual((await geom(pg)).zoomShown, false); await inspect(pg); assert.strictEqual((await geom(pg)).zoomShown, true);
    assert.strictEqual(await ev(pg, () => vis('#nxZoom').textContent), 'Zoom in'); await ev(pg, () => vis('#nxZoom').focus()); await pg.keyboard.press('Enter'); assert.notStrictEqual((await geom(pg)).vb, full); assert.strictEqual(await ev(pg, () => vis('#nxZoom').textContent), 'Whole building'); assert.match(await live(pg), /Zoomed in, 2 times/);
    assert.strictEqual(await ev(pg, () => document.activeElement.id), 'nxZoom', 'focus stays on the toggle');
    await zoomT(pg); assert.strictEqual((await geom(pg)).vb, full); assert.match(await live(pg), /whole building/);
    await zoomT(pg); await inspect(pg); assert.strictEqual((await geom(pg)).vb, full, 'Inspect off: whole building'); await inspect(pg); assert.strictEqual((await geom(pg)).vb, full, 'Inspect comes back at 1x');
    await zoomT(pg); if (pg.size !== 'desktop') await pg.keyboard.press('Escape'); await pg.goto(pg.url().split('#')[0] + '#/t/elena/verify'); await pg.click('[data-nx-key="walk"]');
    assert.strictEqual(await ev(pg, () => vis('#nxMapSvg').getAttribute('viewBox')), full, 'the walk shows the whole building'); assert.strictEqual(await ev(pg, () => !!vis('#nxZoomWrap')), false);
    await pg.waitForFunction(() => /Walk (complete|stopped)/.test((vis('#nxWalkNote') || {}).textContent || ''), null, { timeout: 30000 }); await done(pg);
    const flat = await open(b, FLAT, 320); await ticket(flat); await inspect(flat); const g = await geom(flat); assert(!g.zoomShown && !g.findShown, 'flag off: no zoom, no Find list'); await done(flat); },
  async 'zoom 2x: all 15 doors chosen from the list keep the lens, the selection and its name inside the map, at 320, 400 and desktop'(b) {
    const bad = []; for (const size of W) { const pg = await open(b, PREVIEW, size); await ticket(pg); await inspect(pg); await zoomT(pg);
      for (const d of await ev(pg, () => Object.keys(Engine.DOORS))) { await pick(pg, d); const g = await geom(pg), sel = await ev(pg, () => __nx.state('elena').sel);
        if (!g.lensIn || !g.selIn || !g.nameIn || g.overflow || !sel || sel.door !== d) bad.push(`${size} ${d} ${JSON.stringify(g)}`); }
      await done(pg); } assert.deepEqual(bad, []); },
  async 'zoom 2x: the view follows the lens when it is dragged to the edge and moved by arrow keys'(b) {
    const pg = await open(b, PREVIEW, 320); await ticket(pg); await inspect(pg); await zoomT(pg);
    const box = await ev(pg, () => { const r = vis('#nxMapSvg').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }), x0 = +(await geom(pg)).vb.split(' ')[0], [x, y, w, h] = box;
    await pg.mouse.move(x + w / 2, y + h / 2); await pg.mouse.down(); for (let i = 1; i <= 30; i++) await pg.mouse.move(x + w / 2 + i * (w / 2 - 6) / 30, y + h / 2); for (let i = 0; i < 20; i++) await pg.mouse.move(x + w - 6 - (i % 2), y + h / 2); await pg.mouse.up();
    let g = await geom(pg); assert(+g.vb.split(' ')[0] > x0 + 20, 'dragging to the edge pans'); assert(g.lensIn);
    await ev(pg, () => vis('#nxMapSvg').focus()); const cx = await ev(pg, () => NxMap.cutaway.canvas().x), before = +(await geom(pg)).vb.split(' ')[0]; let cut = 0;
    for (let i = 0; i < 40; i++) { await pg.keyboard.press('ArrowLeft'); const q = await geom(pg); if (!q.lensIn && +q.vb.split(' ')[0] > cx + 0.01) cut++; }
    assert(+(await geom(pg)).vb.split(' ')[0] < before - 20, 'arrow keys pan'); assert.strictEqual(cut, 0, 'the lens stays whole unless the view is at the canvas edge'); await done(pg); },
  async 'zoom 2x at 320 (Inspect, R1 rule): a click on each marker of the crowded pairs, or within 8 px of it towards its neighbour, picks that door; between them, the nearer door or the room, never the farther door'(b) {
    const pg = await open(b, PREVIEW, 320); await ticket(pg); await inspect(pg); await zoomT(pg);
    for (const [a, c] of [['D-QUAR', 'D-TOPW'], ['D-CLS', 'D-LSG'], ['D-DIVE', 'D-TOPE']]) { await pick(pg, a);
      const pa = await scr(pg, ...await ev(pg, d => NxMap.cutaway.cdoor(d), a)), pc = await scr(pg, ...await ev(pg, d => NxMap.cutaway.cdoor(d), c)), L = Math.hypot(pc[0] - pa[0], pc[1] - pa[1]), ux = (pc[0] - pa[0]) / L, uy = (pc[1] - pa[1]) / L;
      assert(L >= 24, `${a}/${c} ${L}`);
      for (const [p, want] of [[pa, a], [pc, c], [[pa[0] + 8 * ux, pa[1] + 8 * uy], a], [[pc[0] - 8 * ux, pc[1] - 8 * uy], c]]) { await pick(pg, a); await pg.mouse.click(...p); const s = await ev(pg, () => __nx.state('elena').sel); assert(s && s.door === want, `${a}/${c}: ${JSON.stringify(s)}`); }
      for (const [o, far] of [[-4, c], [4, a]]) { await pick(pg, a); await pg.mouse.click(pa[0] + (L / 2 + o) * ux, pa[1] + (L / 2 + o) * uy); const s = await ev(pg, () => __nx.state('elena').sel); assert(s && s.door !== far, `${a}/${c} midpoint ${o}: ${JSON.stringify(s)}`); } }
    await done(pg); },
  async 'identify: a real tap names every door, room, open passage, void and stair core on both levels at 320, 400 and desktop (cores where a tap clear of the door exists)'(b) {
    const report = {}; for (const size of W) { const pg = await open(b, PREVIEW, size); await ticket(pg); report[size] = { coresByTap: 0, passagesByTap: 0 };
      for (const l of [1, 2]) { await level(pg, l);
        /* for each target, the point a learner would aim at: a marker, a gap, a void's middle, a room's clearest point */
        const aims = await ev(pg, l => { const C = NxMap.cutaway, s = vis('#nxMapSvg'), sc = s.getBoundingClientRect().width / +s.getAttribute('viewBox').split(' ')[2], out = [];
          const marks = Object.keys(Engine.DOORS).filter(d => Engine.doorLevel(d) === l).map(C.cdoor), clear = (X, Y) => Math.min(...marks.map(([a, b]) => Math.hypot(a - X, b - Y) * sc));
          for (const it of C.targets(l)) { let best = null;
            if (it.type === 'door') best = C.cdoor(it.id); else {
              const rs = it.type === 'void' ? [Engine.VOIDS[it.id].r] : it.type === 'passage' ? [] : Engine.SPACES[it.id].r; let bd = -1;
              const pts = []; if (it.type === 'passage') { const [ax, ay] = C.anchor(it); for (let dx = -8; dx <= 8; dx += 1) for (let dy = -5; dy <= 5; dy += 1) pts.push([ax + dx, ay + dy]); }
              else for (const r of rs) for (let x = r[0] + 1; x < r[0] + r[2]; x += 1) for (let y = r[1] + 1; y < r[1] + r[3]; y += 1) { const [X, Y] = C.cpos(x, y); pts.push([X, Y, Math.min(x - r[0], r[0] + r[2] - x, 0.68 * (y - r[1]), 0.68 * (r[1] + r[3] - y)) * sc]); }
              const same = (X, Y) => { const got = C.identify(X, Y, l, sc); return got && got.type === it.type && got.id === it.id; }, e1 = 1.5 / sc;
              for (const [X, Y, edge] of pts) { if (same(X, Y) && same(X + e1, Y) && same(X - e1, Y) && same(X, Y + e1) && same(X, Y - e1)) { const c = Math.min(clear(X, Y), edge === undefined ? 1e9 : edge); if (c > bd) { bd = c; best = [X, Y]; } } } }
            out.push({ it, best }); }
          return out; }, l);
        for (const { it, best } of aims) { const key = `${it.type}:${it.id}`;
          if (!best) { if (it.type === 'core') continue; if (it.type === 'passage') continue; assert.fail(`${size} L${l} ${key}: nothing to tap`); }
          await pg.mouse.click(...await scr(pg, ...best)); assert.strictEqual(await identOf(pg), key, `${size} L${l} tap on ${key}`);
          const cov = await ev(pg, () => { const s = vis('#nxMapSvg'), sb = s.getBoundingClientRect(), cb = s.querySelector('.nx-ident-callout rect').getBoundingClientRect(); return { out: cb.left < sb.left - 0.5 || cb.right > sb.right + 0.5 || cb.top < sb.top - 0.5 || cb.bottom > sb.bottom + 0.5,
            marks: [...s.querySelectorAll('[data-level] .nx-door')].filter(e => { const m = e.getBoundingClientRect(), x = m.left + m.width / 2, y = m.top + m.height / 2, nx = Math.max(cb.left, Math.min(x, cb.right)), ny = Math.max(cb.top, Math.min(y, cb.bottom)); return Math.hypot(nx - x, ny - y) < 8; }).map(e => e.dataset.door) }; });
          if (cov.out || cov.marks.length) (report[size].covered = report[size].covered || []).push(`${key}${cov.out ? ' outside' : ''} ${cov.marks}`);
          if (it.type === 'core') report[size].coresByTap++; if (it.type === 'passage') report[size].passagesByTap++; } }
      await done(pg); }
    console.log('     taps that reach cores / open passages:', JSON.stringify(report));
    assert.strictEqual(report.desktop.coresByTap, 4, 'at desktop every core answers a tap'); for (const w of W) assert.deepEqual(report[w].covered || [], [], w + ': a name covers a marker or leaves the map'); },
  async 'identify: the crowded pairs at 1x on 320 (Inspect off) give the nearer door at the markers and 4 px either side of the midpoint, never a room'(b) {
    const pg = await open(b, PREVIEW, 320); await ticket(pg);
    for (const [a, c, l] of [['D-QUAR', 'D-TOPW', 2], ['D-CLS', 'D-LSG', 1], ['D-DIVE', 'D-TOPE', 2]]) { await level(pg, l);
      const pa = await scr(pg, ...await ev(pg, d => NxMap.cutaway.cdoor(d), a)), pc = await scr(pg, ...await ev(pg, d => NxMap.cutaway.cdoor(d), c)), L = Math.hypot(pc[0] - pa[0], pc[1] - pa[1]), ux = (pc[0] - pa[0]) / L, uy = (pc[1] - pa[1]) / L, m = [(pa[0] + pc[0]) / 2, (pa[1] + pc[1]) / 2];
      for (const [p, want] of [[pa, a], [pc, c], [[m[0] - 4 * ux, m[1] - 4 * uy], a], [[m[0] + 4 * ux, m[1] + 4 * uy], c]]) { await pg.mouse.click(...p); assert.strictEqual(await identOf(pg), 'door:' + want, `${a}/${c}`); } }
    await done(pg); },
  async 'Find on the map reaches every target on both levels; every name stays inside the map and clear of its own marker, gap or void edge and of every door marker'(b) {
    const bad = []; for (const size of W) { const pg = await open(b, PREVIEW, size); await ticket(pg);
      const vals = await ev(pg, () => [...vis('#nxFind').options].map(o => o.value).filter(Boolean)), n = await ev(pg, () => NxMap.cutaway.targets(1).length + NxMap.cutaway.targets(2).length);
      assert.strictEqual(vals.length, n, 'one entry per target');
      for (const v of vals) { await find(pg, v); const [type, id, l] = v.split('|');
        const r = await ev(pg, ([type, id, l]) => { const C = NxMap.cutaway, s = vis('#nxMapSvg'), sb = s.getBoundingClientRect(), vb = s.getAttribute('viewBox').split(' ').map(Number), k = sb.width / vb[2], P = (X, Y) => [sb.left + (X - vb[0]) * k, sb.top + (Y - vb[1]) * k];
          const co = s.querySelector('.nx-ident-callout'); if (!co) return { err: 'no callout' }; const cb = co.querySelector('rect').getBoundingClientRect(), it = { type, id, l: +l }, at = C.anchor(it), [ax, ay] = P(...at);
          const hitC = (x, y, r) => { const nx = Math.max(cb.left, Math.min(x, cb.right)), ny = Math.max(cb.top, Math.min(y, cb.bottom)); return Math.hypot(nx - x, ny - y) < r; };
          const errs = []; if (cb.left < sb.left - 0.5 || cb.right > sb.right + 0.5 || cb.top < sb.top - 0.5 || cb.bottom > sb.bottom + 0.5) errs.push('outside the map');
          for (const d of Object.keys(Engine.DOORS).filter(d => Engine.doorLevel(d) === +l)) { const [x, y] = P(...C.cdoor(d)); if (hitC(x, y, C.VIS_PX + 1)) errs.push('covers marker ' + d); }   /* stricter than the design's 30 px: no door marker is covered */
          if (type === 'passage') { const [x, y] = P(...at); if (hitC(x, y, 5)) errs.push('covers its gap'); }
          if (type === 'void') { const r = Engine.VOIDS[id].r, [x1, y1] = P(...C.cpos(r[0], r[1])), [x2, y2] = P(...C.cpos(r[0] + r[2], r[1] + r[3])), ov = cb.left < x2 && cb.right > x1 && cb.top < y2 && cb.bottom > y1, inn = cb.left >= x1 && cb.right <= x2 && cb.top >= y1 && cb.bottom <= y2; if (ov && !inn) errs.push('crosses its edge'); }
          return { errs, ident: co.dataset.ident, lv: document.querySelector('#nxLv' + l) && [...document.querySelectorAll('#nxLv' + l)].some(e => e.getAttribute('aria-pressed') === 'true') }; }, [type, id, l]);
        if (r.err || r.errs.length || r.ident !== `${type}:${id}` || !r.lv) bad.push(`${size} ${v}: ${JSON.stringify(r)}`); }
      await done(pg); } assert.deepEqual(bad, []); },
  async 'Find on the map: keyboard and focus; switching level announces "Level 2" then the identification, once; Escape closes the map dialog to the button that opened it'(b) {
    const pg = await open(b, PREVIEW, 320); await ticket(pg); await ev(pg, () => vis('#nxFind').focus()); await pg.keyboard.press('ArrowDown');   // keyboard selection on a closed select changes the value
    assert.strictEqual(await ev(pg, () => document.activeElement.id), 'nxFind'); await find(pg, 'room|quarantine|2');
    assert.strictEqual(await live(pg), 'Level 2. Quarantine · restricted area'); assert.strictEqual(await ev(pg, () => document.activeElement.id), 'nxFind', 'focus stays on the list');
    assert.strictEqual(await ev(pg, () => vis('#nxLv2').getAttribute('aria-pressed')), 'true'); await find(pg, 'door|D-TOPW|2'); assert.strictEqual(await live(pg), 'Tank-top · west · door with a badge reader · Level 2', 'same level: no level announcement');
    assert.strictEqual(await ev(pg, () => vis('#nxIdent').textContent.replace(/\s+Inspect this door$/, '')), 'Tank-top · west · door with a badge reader · Level 2');
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(80); const f = await ev(pg, () => document.activeElement.id); assert(f === 'nxMapBtn' || f === 'nxFind', 'Escape: ' + f);
    if (f === 'nxFind') { await pg.keyboard.press('Escape'); await pg.waitForTimeout(80); assert.strictEqual(await ev(pg, () => document.activeElement.id), 'nxMapBtn'); }
    await done(pg); },
  async 'wording: every target\'s identify line and name use the design\'s words and never describe access'(b) {
    const pg = await open(b, PREVIEW, 'desktop'); await ticket(pg); const lines = [];
    for (const v of await ev(pg, () => [...vis('#nxFind').options].map(o => o.value).filter(Boolean))) { await find(pg, v); lines.push([v, await ev(pg, () => vis('#nxIdent').textContent.replace(/\s+Inspect this door$/, '')), await ev(pg, () => vis('#nxMapSvg').querySelector('.nx-ident-callout').textContent)]); }
    for (const [v, line, name] of lines) { assert(!DENIAL.test(line) && !DENIAL.test(name), `${v}: ${line}`); assert(line.startsWith(name), `${v}: line starts with the name`); }
    const by = v => lines.find(x => x[0] === v)[1];
    assert.strictEqual(by('room|food|2'), 'Food prep · staff area · Level 2'); assert.strictEqual(by('room|quarantine|2'), 'Quarantine · restricted area · Level 2');
    assert.strictEqual(by('door|D-QUAR|2'), 'Quarantine · door with a badge reader · Level 2'); assert.strictEqual(by('passage|westMezz~admin|2'), 'Open passage between West mezzanine and Ops offices · no reader · Level 2');
    assert.strictEqual(by('core|westCore2|2'), 'West core · stairs between Level 1 and Level 2'); assert.strictEqual(by('void|1|2'), 'Open to Level 1 · the Atrium is below · not a room on this level');
    await done(pg); },
  async 'identification never changes ticket state, steps, record or result (Elena and Daniel, taps and the Find list, both levels)'(b) {
    for (const who of ['elena', 'daniel']) { const pg = await open(b, PREVIEW, 400); await ticket(pg, who, who === 'elena' ? 'configure' : 'review');
      const snap = () => ev(pg, w => JSON.stringify([__nx.state(w), __nx.steps(w), __nx.record(w), __nx.result(w)]), who), a = await snap();
      for (const v of await ev(pg, () => [...vis('#nxFind').options].map(o => o.value).filter(Boolean))) await find(pg, v);
      const box = await ev(pg, () => { const r = vis('#nxMapSvg').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
      for (const l of [1, 2]) { await level(pg, l); for (let i = 1; i < 8; i++) for (let j = 1; j < 5; j++) await pg.mouse.click(box[0] + box[2] * i / 8, box[1] + box[3] * j / 5); }
      assert.strictEqual(await snap(), a, who); await done(pg); } },
  async 'Inspect: unchanged selection, the identify line shows the selection\'s name; "Inspect this door" turns Inspect on at that door'(b) {
    const pg = await open(b, PREVIEW, 320); await ticket(pg); await find(pg, 'door|D-LSG|1');
    await ev(pg, () => vis('#nxIdent [data-nx-act="identinspect"]').click()); assert.strictEqual(await ev(pg, () => vis('#nxInspect').getAttribute('aria-pressed')), 'true');
    assert.deepEqual(await ev(pg, () => __nx.state('elena').sel), { door: 'D-LSG' }); assert.strictEqual(await ev(pg, () => document.activeElement.id), 'nxDoorPick');
    assert.strictEqual(await ev(pg, () => vis('#nxIdent').textContent), 'Living Shore staff gate · door with a badge reader · Level 1'); assert.strictEqual(await ev(pg, () => !!vis('#nxFindWrap')), false, 'Find list is for Inspect off');
    assert.strictEqual(await ev(pg, () => vis('#nxMapSvg').querySelector('.nx-ident-callout')), null, 'no identify callout in Inspect');
    await pick(pg, 'D-QUAR'); assert.strictEqual(await ev(pg, () => vis('#nxIdent').textContent), 'Quarantine · door with a badge reader · Level 2'); await done(pg); },
  async 'room labels: only whole names that fit their floor clear of door markers; none for cores; inside the map'(b) {
    const counts = {}; for (const size of W) { const pg = await open(b, PREVIEW, size); await ticket(pg); counts[size] = [];
      for (const l of [1, 2]) { await level(pg, l); const r = await ev(pg, l => { const s = vis('#nxMapSvg'), sb = s.getBoundingClientRect(), ls = [...s.querySelectorAll('[data-room-label]')], marks = [...s.querySelectorAll('[data-level] .nx-door')].map(e => e.getBoundingClientRect());
          return ls.map(e => { const b = e.getBoundingClientRect(), id = e.dataset.roomLabel; return { id, core: Engine.SPACES[id].kind === 'core', lvl: Engine.SPACES[id].l === l, inside: b.left >= sb.left && b.right <= sb.right, overMark: marks.some(m => b.left < m.right && b.right > m.left && b.top < m.bottom && b.bottom > m.top) }; }); }, l);
        counts[size].push(r.length); for (const x of r) assert(!x.core && x.lvl && x.inside && !x.overMark, `${size} L${l} ${JSON.stringify(x)}`); }
      await done(pg); }
    console.log('     room labels per level (L1, L2):', JSON.stringify(counts)); assert(counts.desktop[0] >= counts['320'][0]); },
  async 'flag off: no Find list, zoom, identify line or labels; taps on the flat map do nothing outside Inspect'(b) {
    const pg = await open(b, FLAT, 320); await ticket(pg); const before = await ev(pg, () => vis('#nxMapSvg').innerHTML);
    const box = await ev(pg, () => { const r = vis('#nxMapSvg').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); await pg.mouse.click(...box);
    assert.strictEqual(await ev(pg, () => vis('#nxMapSvg').innerHTML), before); assert.strictEqual(await ev(pg, () => !!(vis('#nxIdent') || vis('#nxFindWrap') || vis('#nxZoomWrap'))), false);
    assert.strictEqual(await ev(pg, () => document.querySelectorAll('[data-room-label]').length), 0); await done(pg); },
};
(async () => { const b = await chromium.launch(); let pass = 0, n = 0;
  for (const [name, f] of Object.entries(tests)) { n++; try { await f(b); pass++; console.log('ok', name); } catch (e) { console.log('FAIL', name, '\n  ', e.message.split('\n').slice(0, 4).join('\n   ')); } }
  await b.close(); console.log(`\n${pass}/${n} cutaway Step 4 tests passed`); process.exit(pass === n ? 0 : 1); })();
