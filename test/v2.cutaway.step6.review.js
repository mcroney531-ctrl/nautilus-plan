// Cutaway Step 6: automated part of the review (Chromium, emulated). Records results; it is not a pass/fail gate and is
// not a substitute for real-device or assistive-technology testing. Usage: node test/v2.cutaway.step6.review.js
// Writes docs/v2-cutaway-step6-review.json and docs/v2-review-shots/cutaway-step6/.
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url'), { chromium } = require('playwright');
const ON = pathToFileURL(path.join(__dirname, '../dist/v2-cutaway-preview.html')).href + '?map=cutaway', OFF = pathToFileURL(path.join(__dirname, '../dist/v2.html')).href + '?';
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cut6-')), SH = path.join(__dirname, '../docs/v2-review-shots/cutaway-step6/'); fs.mkdirSync(SH, { recursive: true });
const SIZES = { 320: [320, 568], 400: [400, 860], desktop: [1366, 900] }, R = {};
const mk = async (b, url, w, h, opt = {}) => { const pg = await (await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', ...opt })).newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript(() => { window.vis = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0); }); pg.base = url; pg.phone = w < 1180; await pg.goto(url + '#/inbox'); return pg; };
const ev = (pg, f, a) => pg.evaluate(f, a), go = async (pg, h) => { if (pg.phone && await ev(pg, () => document.getElementById('nxMapDlg').open)) await pg.keyboard.press('Escape'); await pg.goto(pg.base + '#' + h); await pg.waitForTimeout(40); };
const mapOpen = async pg => { if (pg.phone && !(await ev(pg, () => document.getElementById('nxMapDlg').open))) { await pg.click('#nxMapBtn'); await pg.waitForTimeout(150); } };
const insp = async (pg, on = true) => { await mapOpen(pg); if ((await ev(pg, () => vis('#nxInspect').getAttribute('aria-pressed'))) !== String(on)) await ev(pg, () => vis('#nxInspect').click()); };
const pick = (pg, d) => ev(pg, d => { const s = vis('#nxDoorPick'); s.value = d; s.dispatchEvent(new Event('change', { bubbles: true })); }, d);
const find = (pg, v) => ev(pg, v => { const s = vis('#nxFind'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const walk = async (pg, id) => { await go(pg, `/t/${id}/verify`); await pg.click('[data-nx-key="walk"]'); await pg.waitForFunction(id => { const w = __nx.state(id).walk; return w && !w.running; }, id, { timeout: 30000 }); };
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* 1. all four scenarios, correct paths and meaningful wrong answers, at three widths, flag on vs off */
async function playthrough(b, url, w, h) { const pg = await mk(b, url, w, h), cut = url === ON, log = [];
  const busy = async () => { await insp(pg); for (const d of ['D-QUAR', 'D-DOCK', 'D-LSG']) await pick(pg, d); if (cut) { await ev(pg, () => vis('#nxZoom').click()); await ev(pg, () => vis('#nxZoom').click()); } await insp(pg, false);
    if (cut) for (const v of ['room|quarantine|2', 'door|D-DOCK|1', 'void|1|2']) await find(pg, v); if (pg.phone) await pg.keyboard.press('Escape'); };
  const sub = async id => { await go(pg, `/t/${id}/close`); await pg.click('[data-nx-key="submit"]'); if (await ev(pg, () => document.getElementById('nxMoment').open)) await pg.click('#nxMomentOk');
    log.push([id, await ev(pg, id => JSON.stringify([__nx.state(id), __nx.steps(id), __nx.result(id), __nx.record(id), __nx.status(id), __nx.grade(id)]), id)]); };
  await sub('elena'); await go(pg, '/t/elena/configure'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-exhibitOps"]'); await busy(); await walk(pg, 'elena'); await sub('elena');
  await go(pg, '/t/marcus/configure'); await pg.check('[data-nx-key="gs"]'); await walk(pg, 'marcus'); await sub('marcus');
  await go(pg, '/t/jordan/decide'); await pg.uncheck('[data-nx-key="g-tempExhibitAV"]'); await pg.check('[data-nx-key="dp-ended"]'); await sub('jordan');
  await go(pg, '/t/daniel/respond'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="rt-selfWest"]'); await busy(); await walk(pg, 'daniel'); await sub('daniel');
  await go(pg, '/t/daniel/respond'); await pg.uncheck('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="rt-wait"]'); await sub('daniel');
  await go(pg, '/t/elena/configure'); await pg.uncheck('[data-nx-key="g-exhibitOps"]'); await pg.check('[data-nx-key="g-education"]'); await walk(pg, 'elena'); await sub('elena');
  await go(pg, '/t/marcus/configure'); await pg.uncheck('[data-nx-key="gs"]'); await pg.check('[data-nx-key="x-WO-2291"]'); await busy(); await walk(pg, 'marcus'); await sub('marcus');
  await go(pg, '/t/jordan/decide'); await pg.check('[data-nx-key="g-tempExhibitAV"]'); await pg.check('[data-nx-key="rv"]'); await pg.check('[data-nx-key="dp-ended"]'); await sub('jordan');
  await go(pg, '/t/daniel/respond'); await pg.check('[data-nx-key="rt-escortWest"]'); await walk(pg, 'daniel'); await sub('daniel');
  await go(pg, '/inbox'); log.push(['inbox', await ev(pg, () => [...document.querySelectorAll('.nx-status')].map(x => x.textContent).join(','))]); const errs = pg.errs; await pg.context().close(); return { log, errs }; }

/* 6. sideways scroll and clipped map controls: every stage of every ticket, map open, Inspect off/on, identify, 2x */
async function layout(b, w, h) { const pg = await mk(b, ON, w, h), bad = [];
  const check = async tag => { const r = await ev(pg, () => { const o = document.documentElement.scrollWidth - innerWidth, cl = [...document.querySelectorAll('.nx-map button, .nx-map select, .nx-map .nx-ident, .nx-map .nx-insp')].filter(e => e.getBoundingClientRect().width > 0)
      .filter(e => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > innerWidth + 0.5; }).map(e => e.id || e.className); return { o, cl }; }); if (r.o > 0 || r.cl.length) bad.push(`${w} ${tag} ${JSON.stringify(r)}`); };
  for (const id of ['elena', 'marcus', 'jordan', 'daniel']) for (const st of ['review', 'investigate', 'configure', 'decide', 'respond', 'verify', 'close']) { await go(pg, `/t/${id}/${st}`); await check(`${id}/${st}`); }
  await go(pg, '/t/elena/configure'); await mapOpen(pg); await check('map'); await find(pg, 'passage|westMezz~admin|2'); await check('identify passage'); await find(pg, 'door|D-DOCK|1'); await check('identify door');
  await insp(pg); await pick(pg, 'D-LIFE'); await check('inspect'); await ev(pg, () => vis('#nxZoom').click()); await check('inspect 2x'); const errs = pg.errs; await pg.context().close(); return { bad, errs }; }

/* 3. keyboard: Tab order through the map region, and focus after each map action */
async function keyboard(b, w, h) { const pg = await mk(b, ON, w, h), out = {};
  await go(pg, '/t/elena/configure'); if (pg.phone) { await pg.focus('#nxMapBtn'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(150); } else await ev(pg, () => vis('#nxLv1').focus());
  const order = async n => { const seq = []; for (let i = 0; i < n; i++) { const a = await ev(pg, () => { const e = document.activeElement; return e.closest('.nx-map') ? (e.dataset.nxKey || e.id || e.tagName) : null; }); seq.push(a); await pg.keyboard.press('Tab'); } return seq.filter(Boolean); };
  out.tabOrderInspectOff = await order(9);
  await ev(pg, () => vis('#nxInspect').focus()); await pg.keyboard.press('Enter'); out.focusAfterInspect = await ev(pg, () => document.activeElement.id);
  await ev(pg, () => vis('#nxLv1').focus()); out.tabOrderInspectOn = await order(9);
  await ev(pg, () => vis('#nxZoom').focus()); await pg.keyboard.press('Enter'); out.focusAfterZoom = await ev(pg, () => document.activeElement.id);
  await ev(pg, () => vis('#nxMapSvg').focus()); for (let i = 0; i < 6; i++) await pg.keyboard.press('ArrowRight'); out.lensByKeys = await ev(pg, () => [document.activeElement.id, JSON.stringify(__nx.state('elena').sel)]);
  await ev(pg, () => vis('#nxInspect').focus()); await pg.keyboard.press('Enter'); await ev(pg, () => vis('#nxFind').focus()); await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('ArrowDown');
  out.findByKeys = await ev(pg, () => [document.activeElement.id, vis('#nxIdent') && vis('#nxIdent').textContent]); out.liveAfterFind = await ev(pg, () => new Promise(r => setTimeout(() => r(document.getElementById('nxLive').textContent), 80)));
  if (pg.phone) { await pg.keyboard.press('Escape'); await pg.waitForTimeout(80); out.focusAfterEscape = await ev(pg, () => document.activeElement.dataset.nxKey || document.activeElement.id); }
  out.errs = pg.errs; await pg.context().close(); return out; }

/* 3. non-text contrast of the overlay over the art: each stroke pixel against the same pixel with that layer hidden */
async function contrast(b) { const pg = await mk(b, ON, 1366, 900, { deviceScaleFactor: 1 }), out = {}, sharp = require('child_process');
  const shotOf = async () => { const r = await ev(pg, () => { const q = vis('#nxMapSvg').getBoundingClientRect(); return { x: q.x, y: q.y, width: q.width, height: q.height }; }); return await pg.screenshot({ clip: r }); };
  const measure = async (name, sel, l) => { await ev(pg, l => vis('#nxLv' + l).click(), l); await pg.waitForTimeout(150);
    const on = await shotOf(); await ev(pg, sel => { for (const e of vis('#nxMapSvg').querySelectorAll(sel)) e.style.visibility = 'hidden'; }, sel); const off = await shotOf(); await ev(pg, sel => { for (const e of vis('#nxMapSvg').querySelectorAll(sel)) e.style.visibility = ''; }, sel);
    const fa = path.join(TMP, 'on.png'), fb = path.join(TMP, 'off.png'); fs.writeFileSync(fa, on); fs.writeFileSync(fb, off);
    const res = JSON.parse(sharp.execFileSync('python3', ['-c', `
import json; from PIL import Image
import sys; a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB'); A=a.load(); B=b.load(); rs=[]
def lum(c):
  f=lambda v:(v/255)/12.92 if v/255<=0.03928 else ((v/255+0.055)/1.055)**2.4
  return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
for y in range(a.height):
  for x in range(a.width):
    p,q=A[x,y],B[x,y]
    if sum(abs(p[i]-q[i]) for i in range(3))>90:
      l1,l2=lum(p),lum(q); rs.append((max(l1,l2)+0.05)/(min(l1,l2)+0.05))
rs.sort(); n=len(rs)
print(json.dumps({'pixels':n,'pct_ge_3':round(100*sum(r>=3 for r in rs)/max(n,1),1),'median':round(rs[n//2],2) if n else None,'p10':round(rs[n//10],2) if n else None}))`, fa, fb]).toString()); out[name] = res; };
  await go(pg, '/t/elena/configure'); await pg.check('[data-nx-key="g-allStaff"]'); await pg.check('[data-nx-key="g-exhibitOps"]');
  await measure('footprint rim (L1)', '[data-lit]', 1); await measure('added outline, amber (L2)', '[data-delta="added"]', 2); await measure('door markers (L1)', '.nx-door', 1); await measure('door markers (L2)', '.nx-door', 2);
  await pg.uncheck('[data-nx-key="g-exhibitOps"]'); await measure('removed outline, red (L2)', '[data-delta="removed"]', 2);
  await go(pg, '/t/elena/configure'); await measure('public-gallery dots (L1)', '[fill="url(#nxDotsQA)"]', 1);
  out.text = { 'identify name (callout)': +ratio([0x1b, 0x14, 0x06], [0xff, 0xde, 0x9f]).toFixed(1), 'room label core vs its outline': +ratio([0xe3, 0xf5, 0xf6], [0x06, 0x1b, 0x29]).toFixed(1) };
  await pg.context().close(); return out; }

/* 3. 200% page zoom (1280 x 800 at 200% = 640 x 400 CSS px) and 400% (320 CSS px reflow) */
async function zoom(b) { const out = {}; for (const [tag, w, h, dsf] of [['200% of 1280', 640, 400, 2], ['400% of 1280', 320, 200, 4]]) { const pg = await mk(b, ON, w, h, { deviceScaleFactor: dsf });
    await go(pg, '/t/elena/configure'); await mapOpen(pg); await find(pg, 'room|quarantine|2'); const a = await ev(pg, () => ({ overflow: document.documentElement.scrollWidth - innerWidth, find: !!vis('#nxFind'), ident: vis('#nxIdent') && vis('#nxIdent').textContent }));
    await insp(pg); await pick(pg, 'D-QUAR'); const c = await ev(pg, () => ({ overflow: document.documentElement.scrollWidth - innerWidth, evidence: !!vis('#nxInsp'), zoomBtn: !!vis('#nxZoom') }));
    await pg.screenshot({ path: SH + `zoom-${tag.split('%')[0]}.png`, fullPage: false }); out[tag] = { identify: a, inspect: c, errs: pg.errs }; await pg.context().close(); } return out; }

/* 3. reduced motion: no transitions or animations in the map region, open or in the dialog */
async function motion(b) { const pg = await mk(b, ON, 320, 568); await go(pg, '/t/elena/verify'); await mapOpen(pg);
  const r = await ev(pg, () => [...document.querySelectorAll('.nx-map, .nx-map *')].filter(e => { const s = getComputedStyle(e); return parseFloat(s.transitionDuration) > 0 || (s.animationName !== 'none' && parseFloat(s.animationDuration) > 0); }).map(e => e.id || e.className.baseVal || e.className).slice(0, 10));
  await pg.context().close(); return r; }

/* 4. lens both directions, and a tap in Inspect on every room centre selects the same thing as on the flat map */
async function lensAndRooms(b) { const out = { lens: [], rooms: [] };
  const run = async url => { const pg = await mk(b, url, 1366, 900), res = {};
    await go(pg, '/t/elena/review'); await insp(pg);
    for (const l of [1, 2]) { await ev(pg, l => vis('#nxLv' + l).click(), l);
      for (const [k, s] of Object.entries(await ev(pg, () => Engine.SPACES))) { if (s.l !== l) continue; const r = s.r.reduce((a, q) => q[2] * q[3] > a[2] * a[3] ? q : a), x = r[0] + r[2] / 2, y = r[1] + r[3] / 2;
        const p = await ev(pg, ([x, y]) => { const svg = vis('#nxMapSvg'); const cut = typeof NxMap.cutawayOn === 'function' && NxMap.cutawayOn(), [X, Y] = cut ? NxMap.cutaway.cpos(x, y) : [x, y], pt = svg.createSVGPoint(); pt.x = X; pt.y = Y; const m = svg.getScreenCTM(), q = pt.matrixTransform(m); return [q.x, q.y]; }, [x, y]);
        await pg.mouse.click(...p); res[`L${l} ${k}`] = await ev(pg, () => [JSON.stringify(__nx.state('elena').sel), vis('#nxInsp').innerHTML]); }
      res[`lens L${l}`] = await ev(pg, () => { const s = vis('#nxMapSvg'), g = s.querySelector('[data-lens-level]'), li = s.parentNode.querySelector('.nx-map-lensimg'); return [g ? g.dataset.lensLevel : (s.innerHTML.match(/(ABOVE|BELOW) · L\d/) || [''])[0], li ? li.dataset.nxLevel : null, (s.innerHTML.match(/(ABOVE|BELOW) · L\d/) || [''])[0]]; }); }
    await pg.context().close(); return res; };
  const flat = await run(OFF), cut = await run(ON);
  for (const k of Object.keys(flat)) if (k.startsWith('L')) { const same = flat[k][0] === cut[k][0], evSame = flat[k][1] === cut[k][1]; out.rooms.push([k, same && evSame ? 'same' : `DIFF flat ${flat[k][0]} cut ${cut[k][0]} evidence ${evSame}`]); }
  out.lens = [cut['lens L1'], cut['lens L2']]; return out; }

/* 3. accessibility tree of the map region (reading order), Inspect off with an identification, and Inspect on */
async function tree(b) { const pg = await mk(b, ON, 400, 860), out = {}; await go(pg, '/t/elena/configure'); await mapOpen(pg); await find(pg, 'door|D-QUAR|2');
  out.inspectOff = await pg.locator('#nxMapDlg .nx-map').ariaSnapshot().catch(e => 'n/a: ' + e.message); await insp(pg); await pick(pg, 'D-QUAR');
  out.inspectOn = await pg.locator('#nxMapDlg .nx-map').ariaSnapshot().catch(e => 'n/a: ' + e.message); await pg.context().close(); return out; }

(async () => { const b = await chromium.launch(), t0 = Date.now();
  R.playthrough = {}; for (const [s, [w, h]] of Object.entries(SIZES)) { const off = await playthrough(b, OFF, w, h), on = await playthrough(b, ON, w, h);
    R.playthrough[s] = { identical: JSON.stringify(off.log) === JSON.stringify(on.log), steps: on.log.length, final: on.log[on.log.length - 1][1], errs: [...off.errs, ...on.errs] }; console.log('playthrough', s, R.playthrough[s].identical); }
  R.layout = {}; for (const [s, [w, h]] of Object.entries(SIZES)) R.layout[s] = await layout(b, w, h); console.log('layout done');
  R.keyboard = { 320: await keyboard(b, 320, 568), desktop: await keyboard(b, 1366, 900) }; console.log('keyboard done');
  R.contrast = await contrast(b); console.log('contrast done'); R.zoom = await zoom(b); R.reducedMotion = await motion(b); R.lensAndRooms = await lensAndRooms(b); R.accessibilityTree = await tree(b);
  R.note = 'Automated, emulated Chromium only. No real device, no screen reader. See docs/v2-cutaway-step6-review.md.'; R.seconds = Math.round((Date.now() - t0) / 1000);
  fs.writeFileSync(path.join(__dirname, '../docs/v2-cutaway-step6-review.json'), JSON.stringify(R, null, 1) + '\n'); await b.close(); console.log('written'); })();
