/* Cutaway spike overlay: live SVG above an engine-aligned base image. All engine geometry is projected with one mapping
   (P: plan -> screen units); markers, labels and the lens are drawn in screen space so they stay round and upright.
   Not V2 code: an isolated proof of concept (docs/spikes/cutaway-poc.html). */
(() => {
const E = Engine, S = SCENARIOS, F = Flow, $ = id => document.getElementById(id), G = SPIKE.geom, IMG = SPIKE.img;
const st = { v: 'A', art: 'treated', level: 1, inspect: false, lens: null, sel: null, badge: 'ok', walk: null, hits: false, timer: null };
const VIS_PX = 7, HIT_PX = 22, LENS_PX = 64, LABEL_PX = 10.5; // visible marker radius, hit radius, lens radius, label size (screen px)
const BADGES = { ok: ['allStaff', 'education'], edu: ['education'], none: [] };
const ticket = () => { const sc = S.elena, t = { person: E.clone(sc.person), world: { day: sc.day, date: sc.date, doorStatus: {}, groupOverrides: {} }, route: null };
  t.person.credential.groups = [...BADGES[st.badge]]; return t; };
const g = () => G[st.v], P = (x, y) => [x, g().off + g().k * y];
const doorP = d => { const [x, y] = E.DOORS[d].p, [X, Y] = P(x, y); return [X + (g().sh || 0) * g().hI * 0.5, Y - g().hI * 0.5]; };
const svg = $('ovl'), base = $('base');
const scale = () => svg.getBoundingClientRect().width / 400; // screen px per unit
const u = px => px / scale();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function draw() { const t0 = performance.now(), gg = g(), t = ticket(), fp = E.footprint(t.world, t.person), l = st.level, H = gg.H;
  svg.setAttribute('viewBox', `0 0 400 ${H}`); base.setAttribute('viewBox', `0 0 400 ${H}`);
  const art = l === 1 && st.art !== 'blockout' ? (st.art === 'painted' && IMG[`${st.v}-L1-painted`] ? '-painted' : '-treated') : '';
  base.innerHTML = `<image href="${IMG[`${st.v}-L${l}${art}`]}" width="400" height="${H}" preserveAspectRatio="none"/>`;
  const rectP = r => { const [x, y] = P(r[0], r[1]); return [x, y, r[2], gg.k * r[3]]; };
  const lit = [...fp.spaces].filter(k => E.SPACES[k].l === l);
  /* the veil dims the floors of rooms outside the granted footprint; walls, the back wall and exhibits stay lit (architecture) */
  const unlit = Object.keys(E.SPACES).filter(k => E.SPACES[k].l === l && !fp.spaces.has(k));
  let s = `<g fill="#021019" opacity=".62">${unlit.flatMap(k => E.SPACES[k].r.map(r => { const [x, y, w, h] = rectP(r); return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`; })).join('')}</g>`;
  s += lit.flatMap(k => E.SPACES[k].r.map(r => { const [x, y, w, h] = rectP(r); return `<rect x="${x + .6}" y="${y + .6}" width="${w - 1.2}" height="${h - 1.2}" fill="none" stroke="#7ff0c4" stroke-width="${u(2)}"/>`; })).join('');
  // labels: upright, screen-sized, only where they fit
  const fs = u(LABEL_PX);
  for (const [k, sp] of Object.entries(E.SPACES)) { if (sp.l !== l) continue; const r = sp.r[0], [x, y, w, h] = rectP(r), n = sp.short || sp.n;
    if (n.length * fs * 0.56 + u(8) > w || h < fs * 1.6) continue;
    s += `<text x="${x + w / 2}" y="${y + h * 0.5 + fs * 0.35}" text-anchor="middle" style="font:700 ${fs}px system-ui;fill:#0b2342;paint-order:stroke;stroke:#ffffffcc;stroke-width:${u(3)}">${esc(n.toUpperCase())}</text>`; }
  // doors: visible marker radius VIS_PX; optional hit-area debug circles
  for (const [d] of Object.entries(E.DOORS)) { if (E.doorLevel(d) !== l) continue; const [x, y] = doorP(d), gr = fp.doors.has(d);
    if (st.hits) s += `<circle cx="${x}" cy="${y}" r="${u(HIT_PX)}" fill="#ffde9f22" stroke="#ffde9f" stroke-dasharray="${u(3)} ${u(3)}" stroke-width="${u(1)}"/>`;
    s += `<circle class="door" data-door="${d}" cx="${x}" cy="${y}" r="${u(VIS_PX)}" fill="${gr ? '#7ff0c4' : '#0b2a39'}" stroke="#ffffff" stroke-width="${u(1.6)}"/>`; }
  // lens: a circle on screen showing the other level's image and doors
  if (st.inspect && st.lens) { const [lx, ly] = st.lens, r = u(LENS_PX), o = l === 1 ? 2 : 1;
    s += `<clipPath id="lc"><circle cx="${lx}" cy="${ly}" r="${r}"/></clipPath><g clip-path="url(#lc)"><image href="${IMG[`${st.v}-L${o}`]}" width="400" height="${H}"/>
      ${Object.keys(E.DOORS).filter(d => E.doorLevel(d) === o).map(d => { const [x, y] = doorP(d); return `<circle cx="${x}" cy="${y}" r="${u(VIS_PX)}" fill="#0b2a39" stroke="#fff" stroke-width="${u(1.6)}"/>`; }).join('')}</g>
      <circle class="lens" cx="${lx}" cy="${ly}" r="${r}" fill="none" stroke="#e2ffff" stroke-width="${u(3)}"/><text x="${lx}" y="${ly + r + u(14)}" text-anchor="middle" style="font:700 ${u(11)}px system-ui;fill:#e2ffff">${o === 2 ? 'ABOVE · L2' : 'BELOW · L1'}</text>`; }
  // walk route above the lens
  if (st.walk) { const w = st.walk, pts = w.pts.slice(0, w.i + 1).map(p => ({ ...p, sp: p.door ? doorP(p.door) : P(p.x, p.y) }));
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (a.l === l && b.l === l) s += `<line x1="${a.sp[0]}" y1="${a.sp[1]}" x2="${b.sp[0]}" y2="${b.sp[1]}" stroke="#f5d192" stroke-width="${u(3)}" stroke-linecap="round" stroke-dasharray="${u(1)} ${u(6)}"/>`; }
    for (const p of pts) if (p.door && p.l === l) s += `<circle data-walk="${p.door}" data-ok="${p.ok}" cx="${p.sp[0]}" cy="${p.sp[1]}" r="${u(6)}" fill="${p.ok ? '#7ff0c4' : '#f39091'}" stroke="#061b29" stroke-width="${u(1.5)}"/>`;
    const last = pts[pts.length - 1]; if (last && last.l === l) { if (last.door && !last.ok) s += `<circle cx="${last.sp[0]}" cy="${last.sp[1]}" r="${u(12)}" fill="none" stroke="#f39091" stroke-width="${u(2.5)}"/>`;
      s += `<g transform="translate(${last.sp[0]} ${last.sp[1] - u(10)})"><circle r="${u(9)}" fill="#f5d192" stroke="#fff" stroke-width="${u(1.5)}"/><text y="${u(3.5)}" text-anchor="middle" style="font:800 ${u(9)}px system-ui;fill:#1b1406">EP</text></g>`; } }
  // selection ring and name
  if (st.sel && st.sel.door && E.doorLevel(st.sel.door) === l) { const [x, y] = doorP(st.sel.door), n = E.DOORS[st.sel.door].n, w = u(n.length * 7.4 + 16), bx = Math.max(2, Math.min(398 - w, x - w / 2)), by = y - u(38);
    s += `<circle data-sel="${st.sel.door}" cx="${x}" cy="${y}" r="${u(11)}" fill="none" stroke="#ffde9f" stroke-width="${u(3)}"/><rect x="${bx}" y="${by}" width="${w}" height="${u(22)}" rx="${u(6)}" fill="#ffde9f"/><text x="${bx + w / 2}" y="${by + u(15.5)}" text-anchor="middle" style="font:800 ${u(12.5)}px system-ui;fill:#1b1406">${esc(n)}</text>`; }
  svg.innerHTML = s; const ms = performance.now() - t0; (window.__perf = window.__perf || []).push(ms);
  $('ev').innerHTML = evidence(t); $('lvl').textContent = `Level ${l}`; }

function evidence(t) { const sel = st.sel; if (!st.inspect) return 'Turn on Inspect to tap doors or rooms.'; if (!sel) return 'Tap a door or room, drag the lens, or choose a door.';
  if (sel.door) { const r = E.canEnter(t.world, t.person, sel.door, S.elena.time); return `<b>${esc(E.DOORS[sel.door].n)}</b> · ${r.ok ? 'opens' : 'denied · ' + r.code}`; }
  return `<b>${esc(E.SPACES[sel.space].n)}</b> · room`; }

/* picking in screen pixels: nearest door marker within HIT_PX, else the room under the point (inverse projection) */
function pick(X, Y, l) { let best = null, bd = 1e9;
  for (const d of Object.keys(E.DOORS)) { if (E.doorLevel(d) !== l) continue; const [x, y] = doorP(d), dd = Math.hypot(x - X, y - Y); if (dd < bd) { bd = dd; best = d; } }
  if (bd * scale() <= HIT_PX) return { door: best };
  const px = X, py = (Y - g().off) / g().k, sp = Object.entries(E.SPACES).find(([, o]) => o.l === l && o.r.some(r => px >= r[0] && px <= r[0] + r[2] && py >= r[1] && py <= r[1] + r[3]));
  return sp ? { space: sp[0] } : null; }
const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
let drag = false;
svg.addEventListener('pointerdown', e => { if (!st.inspect) return; drag = true; svg.setPointerCapture(e.pointerId); const p = pt(e); st.lens = [p.x, p.y];
  st.sel = pick(p.x, p.y, st.level) || null; draw(); });
svg.addEventListener('pointermove', e => { if (!drag) return; const p = pt(e); st.lens = [p.x, p.y]; const n = pick(p.x, p.y, st.level); if (n && n.door) st.sel = n; draw(); });
svg.addEventListener('pointerup', () => { drag = false; });
$('pick').addEventListener('change', e => { const d = e.target.value; if (!d) return; st.level = E.doorLevel(d); st.sel = { door: d }; st.inspect = true; st.lens = doorP(d); sync(); draw(); });
function walk() { clearTimeout(st.timer); const t = ticket(); st.walk = F.buildWalk(S.elena, t); st.level = 1; st.inspect = false; sync(); draw();
  const tick = () => { const w = st.walk; if (w.i >= w.pts.length - 1) { w.running = false; $('wstat').textContent = w.res.stop ? `Walk stopped at ${E.DOORS[w.res.stop.door].n}.` : 'Walk complete: reached every stop.'; return; }
    w.i++; st.level = w.pts[w.i].l; draw(); st.timer = setTimeout(tick, 170); }; st.timer = setTimeout(tick, 150); }
function sync() { for (const [id, k, v] of [['vA', 'v', 'A'], ['vB', 'v', 'B'], ['vC', 'v', 'C'], ['artT', 'art', 'treated'], ['artB', 'art', 'blockout'], ['artP', 'art', 'painted'], ['lv1', 'level', 1], ['lv2', 'level', 2]]) $(id).setAttribute('aria-pressed', st[k] === v);
  $('insp').setAttribute('aria-pressed', st.inspect); $('hits').setAttribute('aria-pressed', st.hits); }
const on = (id, fn) => $(id).addEventListener('click', () => { fn(); sync(); draw(); });
on('vA', () => st.v = 'A'); on('vB', () => st.v = 'B'); on('vC', () => st.v = 'C'); on('artT', () => st.art = 'treated'); on('artP', () => st.art = 'painted'); on('artB', () => st.art = 'blockout');
on('lv1', () => st.level = 1); on('lv2', () => st.level = 2); on('insp', () => { st.inspect = !st.inspect; if (st.inspect && !st.lens) st.lens = P(143, 88); }); on('hits', () => st.hits = !st.hits);
$('badge').addEventListener('change', e => { st.badge = e.target.value; st.walk = null; $('wstat').textContent = ''; draw(); });
$('walk').addEventListener('click', walk);
$('pick').innerHTML = '<option value="">Choose a door…</option>' + [1, 2].map(L => `<optgroup label="Level ${L}">${Object.entries(E.DOORS).filter(([d]) => E.doorLevel(d) === L).map(([d, o]) => `<option value="${d}">${esc(o.n)}</option>`).join('')}</optgroup>`).join('');
addEventListener('resize', draw);
window.__spike = { st, draw, doorP, scale, pick, walk, P, HIT_PX, VIS_PX, set: o => { Object.assign(st, o); sync(); draw(); } };
sync(); draw();
})();
