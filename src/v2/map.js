/* Nautilus V2 map drawing (Phase 03): the engine's own floor plan as SVG strings, ported from V1's levelSVG.
   Shows GRANTED only (Engine.footprint: doors the badge's groups and exceptions open, flooded through open passages).
   Time windows, schedules, door status and reader faults never reach the map: those belong to the walk (opened or
   didn't open, no reason) and to inspection. Change review (Phase 04) outlines what the last badge change added to or
   removed from the granted footprint. Phase 05 adds the lens (the other level seen through a circle), the selected door or
   room, and the walk route: doors on the route turn green or red (opened or not), never with a reason. */
const NxMap = ((E, F) => {
  const shapes = (id, attrs = '') => E.SPACES[id].r.map(r => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" ${attrs}/>`).join('');
  function label(id) {
    const s = E.SPACES[id], [x, y] = F.center(id), r = s.r[0];
    if (r[2] < 46 && r[3] > r[2] * 2) return `<text x="${x}" y="${y}" class="nx-lbl nx-lbl-sm" transform="rotate(-90 ${x} ${y})">${s.n.toUpperCase()}</text>`;
    if (r[2] < 46) return `<text x="${x}" y="${y + 3}" class="nx-lbl nx-lbl-sm">${(s.short || s.n).toUpperCase()}</text>`;
    const narrow = r[2] < 70, cls = narrow ? 'nx-lbl nx-lbl-nr' : 'nx-lbl', words = s.n.toUpperCase().split(' ');
    const lines = words.length > 1 && (s.n.length > 11 || narrow) ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [s.n.toUpperCase()];
    return lines.map((t, i) => `<text x="${x}" y="${y + 4 + (i - (lines.length - 1) / 2) * 12}" class="${cls}">${t}</text>`).join('');
  }
  const defs = sfx => `<linearGradient id="nxWater${sfx}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#087b97"/><stop offset="1" stop-color="#0a4e6a"/></linearGradient>
    <pattern id="nxHatch${sfx}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#0a2a38"/><rect width="1.5" height="6" fill="#1d4d5e"/></pattern>
    <pattern id="nxDots${sfx}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.1" fill="#d9fff1" opacity=".6"/></pattern>
    <pattern id="nxStrp${sfx}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="6" fill="#ffe3b3" opacity=".45"/></pattern>
    <filter id="nxRing${sfx}" x="-5%" y="-5%" width="110%" height="110%"><feMorphology in="SourceGraphic" operator="dilate" radius="1.8" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out"/></filter>`;
  const style = font => `<style>.nx-lbl{fill:#e3f5f6;font:700 11.5px ${font};text-anchor:middle;letter-spacing:.04em;pointer-events:none}.nx-lbl-sm{font-size:9.5px;fill:#bfe0e5}.nx-lbl-nr{font-size:10px}
    .nx-lbl-void{font-size:9px;fill:#7fa9b3;font-weight:600}.nx-lbl-out{font-size:9px;fill:#a4ead0}</style>`;
  const footprintOf = t => t ? E.footprint(t.world, t.person) : { spaces: new Set(), doors: new Set() };
  /* one level: spaces, labels, the dark-water veil with the granted footprint cut out, public/restricted patterns, doors */
  function level(t, l, sfx, o = {}) {
    const fp = footprintOf(t), ids = Object.keys(E.SPACES).filter(k => E.SPACES[k].l === l), lit = [...fp.spaces].filter(k => E.SPACES[k].l === l);
    let s = `<rect x="4" y="4" width="392" height="292" rx="10" fill="#082536" stroke="#3a7487" stroke-width="1.5"/>`;
    for (const id of ids) { const k = E.SPACES[id].kind;
      s += shapes(id, `fill="${k === 'public' ? '#12445a' : k === 'program' ? '#13495c' : k === 'core' ? '#1f4b5c' : k === 'restricted' ? '#2a3a4a' : '#163a47'}" stroke="#4d8696" stroke-width="1"`);
      if (E.SPACES[id].ellipse) { const [cx, cy, rx, ry] = E.SPACES[id].ellipse; s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#nxWater${sfx})" stroke="#61c8d6" stroke-width="1.5"/>`; } }
    if (l === 2) { for (const v of E.VOIDS) s += `<rect x="${v.r[0]}" y="${v.r[1]}" width="${v.r[2]}" height="${v.r[3]}" fill="url(#nxHatch${sfx})" stroke="#2c5a69" stroke-dasharray="3 3"/><text x="${v.r[0] + v.r[2] / 2}" y="${v.r[1] + v.r[3] / 2 + 3}" class="nx-lbl nx-lbl-void">${v.n.toUpperCase()}</text>`;
      s += `<g stroke="#d4bb8c" stroke-width="3" opacity=".55"><path d="M210 70H284M210 110H284M210 150H284M210 185H284M226 52V196M262 52V196"/></g>`; }
    for (const id of ids) s += label(id);
    s += `<mask id="nxVeil${sfx}"><rect width="400" height="300" fill="#fff"/>${lit.map(k => shapes(k, 'fill="#000"')).join('')}</mask><rect width="400" height="300" fill="#021019" opacity=".72" mask="url(#nxVeil${sfx})"/>`;
    s += `<g filter="url(#nxRing${sfx})">${lit.map(k => shapes(k, 'fill="#a4ead0"')).join('')}</g>`;
    for (const k of lit) { const kd = E.SPACES[k].kind; if (kd === 'public' || kd === 'restricted') s += shapes(k, `fill="url(#${kd === 'public' ? 'nxDots' : 'nxStrp'}${sfx})" pointer-events="none"`); }
    const d = t && t.delta && t.showDelta ? t.delta : null; /* effective-permission difference from the last change */
    if (d) { for (const k of d.addedSpaces.filter(k => E.SPACES[k].l === l)) s += `<g data-delta="added" data-space="${k}">${shapes(k, 'fill="#f5d192" fill-opacity=".22" stroke="#f5d192" stroke-width="2" stroke-dasharray="5 3"')}</g>`;
      for (const k of d.removedSpaces.filter(k => E.SPACES[k].l === l)) s += `<g data-delta="removed" data-space="${k}">${shapes(k, 'fill="none" stroke="#f39091" stroke-width="2" stroke-dasharray="5 3"')}</g>`; }
    for (const [d, o] of Object.entries(E.DOORS)) { if (E.doorLevel(d) !== l) continue; const g = fp.doors.has(d);
      s += `<circle class="nx-door" data-door="${d}" data-granted="${g}" cx="${o.p[0]}" cy="${o.p[1]}" r="6" fill="${g ? '#a4ead0' : '#0b2a39'}" stroke="#a9cfd6" stroke-width="1.3"/>`; }
    if (l === 1) s += `<path d="M24 296h16M390 242v16" stroke="#a4ead0" stroke-width="3"/><text x="44" y="297" class="nx-lbl nx-lbl-out" style="text-anchor:start">STAFF ENTRANCE</text><text x="383" y="236" class="nx-lbl nx-lbl-out" style="text-anchor:end">DOCK</text>`;
    return s;
  }
  /* walk route up to the current point: dotted path, door results (green opened / red didn't open), the walker's marker */
  function route(w, l, initials) {
    const pts = w.pts.slice(0, w.i + 1); let s = '';
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (a.l === l && b.l === l) s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#f5d192" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 5"/>`; }
    for (const p of pts) if (p.door && p.l === l) s += `<circle data-walk="${p.door}" data-ok="${p.ok}" cx="${p.x}" cy="${p.y}" r="5" fill="${p.ok ? '#a4ead0' : '#f39091'}" stroke="#061b29" stroke-width="1.5"/>`;
    const last = pts[pts.length - 1];
    if (last && last.l === l) { if (last.door && !last.ok) s += `<circle cx="${last.x}" cy="${last.y}" r="11" fill="none" stroke="#f39091" stroke-width="2.5"/>`;
      s += `<g transform="translate(${last.x} ${last.y})"><circle r="8" fill="#f5d192" stroke="#fff" stroke-width="1.5"/><text y="3.5" text-anchor="middle" font-size="8" font-weight="800" fill="#1b1406">${initials}</text></g>`; }
    return s;
  }
  /* the selected door's name drawn large next to it, so a sighted learner on a phone does not depend on the room labels */
  function callout(sel) {
    if (!sel || !sel.door) return ''; const d = E.DOORS[sel.door], [x, y] = d.p, w = Math.min(220, d.n.length * 7.2 + 16), bx = Math.max(6, Math.min(394 - w, x - w / 2)), by = y > 40 ? y - 38 : y + 16;
    return `<g class="nx-callout" pointer-events="none"><rect x="${bx}" y="${by}" width="${w}" height="22" rx="6" fill="#ffde9f"/><text x="${bx + w / 2}" y="${by + 15.5}" text-anchor="middle" style="font:800 12.5px inherit;fill:#1b1406">${d.n}</text></g>`;
  }
  /* the selected door or room: a ring that stays on top of the lens, whichever level it is on */
  function selection(sel, l) {
    if (sel && sel.door) { const [x, y] = E.DOORS[sel.door].p; return `<circle data-sel="${sel.door}" cx="${x}" cy="${y}" r="10" fill="none" stroke="#ffde9f" stroke-width="3"/>`; }
    if (sel && sel.space) return `<g data-sel="${sel.space}">${shapes(sel.space, `fill="none" stroke="#ffde9f" stroke-width="2.5"${E.SPACES[sel.space].l === l ? '' : ' stroke-dasharray="4 3"'}`)}</g>`;
    return '';
  }
  /* o: {lens:[x,y]|null, sel, walk, initials}. Layers, bottom to top: this level; the lens (the other level seen through
     it); then the walk route, the selection and its name, so the lens never hides a stopped door or the selected door. */
  function svg(t, l, font, o = {}) {
    const other = l === 1 ? 2 : 1, lens = o.lens;
    let s = `<defs>${defs('A')}${defs('B')}${lens ? `<clipPath id="nxLensClip"><circle cx="${lens[0]}" cy="${lens[1]}" r="56"/></clipPath>` : ''}</defs>${style(font)}${level(t, l, 'A', o)}`;
    if (lens) { const ly = lens[1] + 68 > 296 ? lens[1] - 62 : lens[1] + 68, lx = Math.max(40, Math.min(360, lens[0]));
      s += `<g clip-path="url(#nxLensClip)"><rect width="400" height="300" fill="#061b29"/>${level(t, other, 'B')}</g>
      <circle class="nx-lens" cx="${lens[0]}" cy="${lens[1]}" r="56" fill="none" stroke="#e2ffff" stroke-width="3"/><text x="${lx}" y="${ly}" class="nx-lbl nx-lbl-sm" style="fill:#e2ffff">${other === 2 ? 'ABOVE · L2' : 'BELOW · L1'}</text>`; }
    if (o.walk) s += `<g class="nx-route">${route(o.walk, l, o.initials)}</g>`;
    return s + selection(o.sel, l) + callout(o.sel);
  }
  /* what is under a point: the nearest door within 18 map units, else the room */
  function pick(x, y, l) {
    let best = null, bd = 1e9;
    for (const [d, o] of Object.entries(E.DOORS)) { if (E.doorLevel(d) !== l) continue; const dd = Math.hypot(o.p[0] - x, o.p[1] - y); if (dd < bd) { bd = dd; best = d; } }
    if (bd < 18) return { door: best };
    const sp = Object.entries(E.SPACES).find(([k, o]) => o.l === l && o.r.some(r => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]));
    return sp ? { space: sp[0], pt: [x, y] } : null;
  }
  /* the same facts as text, for screen readers and anyone who cannot read the drawing */
  function summary(t) {
    const fp = footprintOf(t), byL = l => [...fp.spaces].filter(k => E.SPACES[k].l === l).map(k => E.SPACES[k].n);
    return { doors: [...fp.doors].map(d => E.DOORS[d].n), l1: byL(1), l2: byL(2) };
  }
  const litOn = (t, l) => [...footprintOf(t).spaces].some(k => E.SPACES[k].l === l) || !!(t && t.delta && t.showDelta && t.delta.addedSpaces.some(k => E.SPACES[k].l === l));
  /* phone mini footprint: both levels as silhouettes (no labels, no doors), with the change-review outlines */
  function mini(t, l) {
    const fp = footprintOf(t), d = t && t.delta && t.showDelta ? t.delta : null; let s = '<rect width="400" height="300" fill="#04161f"/>';
    for (const [k, o] of Object.entries(E.SPACES)) { if (o.l !== l) continue; const g = fp.spaces.has(k); s += shapes(k, `fill="${g ? (o.kind === 'restricted' ? '#e8c98f' : '#7fd8bd') : '#143644'}" stroke="#04161f" stroke-width="4"`); }
    if (d) { for (const k of d.addedSpaces.filter(k => E.SPACES[k].l === l)) s += shapes(k, 'fill="none" stroke="#f5d192" stroke-width="7"'); for (const k of d.removedSpaces.filter(k => E.SPACES[k].l === l)) s += shapes(k, 'fill="none" stroke="#f39091" stroke-width="7" stroke-dasharray="14 8"'); }
    return s;
  }
  /* Cutaway map, behind a flag that is off by default. It needs two things: the art data, which only the preview build
     carries (NX_CUTAWAY; the default build has none), and ?map=cutaway in the address.
     Step 2: the painted level in the engine's variant C projection, on a canvas with margins.
     Step 3: the same overlays as the flat map, drawn in that projection: granted footprint and veil, door markers, the walk
     route, the lens and the selection. Everything is still decided by the engine; only where it is drawn changes.
     Room labels, and identifying things by tap, are Step 4. Change-review outlines are Step 5. */
  const CUT = typeof NX_CUTAWAY === 'object' && NX_CUTAWAY ? NX_CUTAWAY : null;
  const cutawayOn = () => !!CUT && typeof location === 'object' && new URLSearchParams(location.search).get('map') === 'cutaway';
  const LENS_R = 56, PAD = 6, LENS_LABEL = 16;   // lens radius (map units, as on the flat map), breathing room, the lens's "ABOVE · L2" line
  const VIS_PX = 7, HIT_PX = 22;                  // door marker radius and hit radius, in screen pixels at every width
  /* plan point -> cutaway point, and back; a door marker sits half-way up its wall, as in the spike that proved the overlays */
  const cpos = (x, y) => [x, CUT.projection.off + CUT.projection.k * y];
  const cplan = (X, Y) => [X, (Y - CUT.projection.off) / CUT.projection.k];
  const cdoor = d => { const p = CUT.projection, [x, y] = cpos(...E.DOORS[d].p); return [x + p.sh * p.hI * 0.5, y - p.hI * 0.5]; };
  /* margins from the engine's own doors: a lens centred on any door, with its label, fits inside the canvas */
  function canvas() {
    const { W, H } = CUT.projection, pts = Object.keys(E.DOORS).map(cdoor), need = { l: 0, r: 0, t: 0, b: 0 };
    for (const [x, y] of pts) { need.l = Math.max(need.l, LENS_R - x); need.r = Math.max(need.r, x + LENS_R - W); need.t = Math.max(need.t, LENS_R - y); need.b = Math.max(need.b, y + LENS_R + LENS_LABEL - H); }
    const m = { l: Math.ceil(need.l) + PAD, r: Math.ceil(need.r) + PAD, t: Math.ceil(need.t) + PAD, b: Math.ceil(need.b) + PAD };
    return { x: -m.l, y: -m.t, w: W + m.l + m.r, h: H + m.t + m.b, margin: m, W, H };
  }
  const image = l => { const c = canvas(); return `<image href="${CUT.img[l]}" x="0" y="0" width="${c.W}" height="${c.H}" preserveAspectRatio="none"/>`; };
  const frame = l => { const c = canvas(); return { viewBox: `${c.x} ${c.y} ${c.w} ${c.h}`, ratio: `${c.w} / ${c.h}`, image: image(l),
    base: `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="#061b29"/>${image(l)}` }; };
  const crects = (id, attrs = '', inset = 0) => E.SPACES[id].r.map(r => { const [x, y] = cpos(r[0], r[1]); return `<rect x="${x + inset}" y="${y + inset}" width="${r[2] - 2 * inset}" height="${CUT.projection.k * r[3] - 2 * inset}" ${attrs}/>`; }).join('');
  /* one level's overlay: the veil over floors outside the granted footprint, the footprint's rim and its public / restricted
     patterns, and the doors. sc = screen pixels per map unit, so markers and lines keep their size on a phone. */
  function clevel(t, l, sfx, sc) {
    const u = px => px / sc, fp = footprintOf(t), ids = Object.keys(E.SPACES).filter(k => E.SPACES[k].l === l), lit = ids.filter(k => fp.spaces.has(k));
    let s = `<g fill="#021019" opacity=".62" data-veil="${l}">${ids.filter(k => !fp.spaces.has(k)).map(k => crects(k)).join('')}</g>`;
    for (const k of lit) { const kd = E.SPACES[k].kind; if (kd === 'public' || kd === 'restricted') s += crects(k, `fill="url(#${kd === 'public' ? 'nxDots' : 'nxStrp'}${sfx})" opacity=".8" pointer-events="none"`); }
    s += lit.map(k => `<g data-lit="${k}">${crects(k, `fill="none" stroke="#a4ead0" stroke-width="${u(2)}"`, u(1))}</g>`).join('');
    for (const d of Object.keys(E.DOORS)) { if (E.doorLevel(d) !== l) continue; const g = fp.doors.has(d), [x, y] = cdoor(d);
      s += `<circle class="nx-door" data-door="${d}" data-granted="${g}" cx="${x}" cy="${y}" r="${u(VIS_PX)}" fill="${g ? '#a4ead0' : '#0b2a39'}" stroke="#fff" stroke-width="${u(1.6)}"/>`; }
    return s;
  }
  function croute(w, l, initials, sc) {
    const u = px => px / sc, pts = w.pts.slice(0, w.i + 1), at = p => p.door ? cdoor(p.door) : cpos(p.x, p.y); let s = '';
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (a.l === l && b.l === l) { const [x1, y1] = at(a), [x2, y2] = at(b); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f5d192" stroke-width="${u(3)}" stroke-linecap="round" stroke-dasharray="${u(1)} ${u(6)}"/>`; } }
    for (const p of pts) if (p.door && p.l === l) { const [x, y] = cdoor(p.door); s += `<circle data-walk="${p.door}" data-ok="${p.ok}" cx="${x}" cy="${y}" r="${u(VIS_PX)}" fill="${p.ok ? '#a4ead0' : '#f39091'}" stroke="#061b29" stroke-width="${u(1.6)}"/>`; }
    const last = pts[pts.length - 1];
    if (last && last.l === l) { const [x, y] = at(last); if (last.door && !last.ok) s += `<circle cx="${x}" cy="${y}" r="${u(13)}" fill="none" stroke="#f39091" stroke-width="${u(2.5)}"/>`;
      s += `<g transform="translate(${x} ${y})"><circle r="${u(10)}" fill="#f5d192" stroke="#fff" stroke-width="${u(1.5)}"/><text y="${u(3.5)}" text-anchor="middle" font-size="${u(9.5)}" font-weight="800" fill="#1b1406">${initials}</text></g>`; }
    return s;
  }
  function cselection(sel, l, sc) {
    const u = px => px / sc;
    if (sel && sel.door) { const [x, y] = cdoor(sel.door); return `<circle data-sel="${sel.door}" cx="${x}" cy="${y}" r="${u(12)}" fill="none" stroke="#ffde9f" stroke-width="${u(3)}"/>`; }
    if (sel && sel.space) return `<g data-sel="${sel.space}">${crects(sel.space, `fill="none" stroke="#ffde9f" stroke-width="${u(2.5)}"${E.SPACES[sel.space].l === l ? '' : ` stroke-dasharray="${u(5)} ${u(4)}"`}`)}</g>`;
    return '';
  }
  /* the selected door's name, placed above the door (below it near the top edge) so it never covers the door it names */
  function ccallout(sel, sc) {
    if (!sel || !sel.door) return ''; const u = px => px / sc, c = canvas(), d = E.DOORS[sel.door], [x, y] = cdoor(sel.door), h = u(24), w = Math.min(c.w - 8, u(d.n.length * 7.6 + 18));
    const bx = Math.max(c.x + 4, Math.min(c.x + c.w - 4 - w, x - w / 2)), by = y - u(16) - h > c.y + 2 ? y - u(16) - h : y + u(16);
    return `<g class="nx-callout" pointer-events="none"><rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="${u(6)}" fill="#ffde9f"/><text x="${bx + w / 2}" y="${by + h * 0.7}" text-anchor="middle" font-size="${u(13)}" font-weight="800" fill="#1b1406">${d.n}</text></g>`;
  }
  /* The overlay drawing. Layers, bottom to top: this level (with a hole where the lens is); inside the lens, the other
     level's overlay (the other level's picture is a separate element under this drawing, see app.js); the lens ring; then
     the walk route, the selection and its name, so the lens never hides a stopped door or the selected door.
     o: {lens:[plan x, plan y]|null, sel, walk, initials}; sc: screen pixels per map unit. */
  function overlay(t, l, font, o, sc) {
    const u = px => px / sc, c = canvas(), other = l === 1 ? 2 : 1, lens = o.lens ? cpos(...o.lens) : null;
    font = String(font).replace(/"/g, "'");   // the family list goes inside a style attribute
    let s = `<defs>${defs('A')}${defs('B')}${lens ? `<clipPath id="nxLensClip"><circle cx="${lens[0]}" cy="${lens[1]}" r="${LENS_R}"/></clipPath>
      <mask id="nxLensHole" maskUnits="userSpaceOnUse" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="#fff"/><circle cx="${lens[0]}" cy="${lens[1]}" r="${LENS_R}" fill="#000"/></mask>` : ''}</defs>`;
    s += `<g data-level="${l}"${lens ? ' mask="url(#nxLensHole)"' : ''}>${clevel(t, l, 'A', sc)}</g>`;
    if (lens) { const ly = lens[1] + LENS_R + u(13) > c.y + c.h - 2 ? lens[1] - LENS_R - u(6) : lens[1] + LENS_R + u(13), lx = Math.max(c.x + u(40), Math.min(c.x + c.w - u(40), lens[0]));
      s += `<g clip-path="url(#nxLensClip)" data-lens-level="${other}">${clevel(t, other, 'B', sc)}</g>
      <circle class="nx-lens" cx="${lens[0]}" cy="${lens[1]}" r="${LENS_R}" fill="none" stroke="#e2ffff" stroke-width="${u(3)}"/><text x="${lx}" y="${ly}" text-anchor="middle" style="font:700 ${u(11)}px ${font};fill:#e2ffff;letter-spacing:.04em" pointer-events="none">${other === 2 ? 'ABOVE · L2' : 'BELOW · L1'}</text>`; }
    if (o.walk) s += `<g class="nx-route">${croute(o.walk, l, o.initials, sc)}</g>`;
    return s + cselection(o.sel, l, sc) + ccallout(o.sel, sc);
  }
  /* what is under a cutaway point: the nearest door marker within HIT_PX screen pixels, else the room (as on the flat map) */
  function cpick(X, Y, l, sc) {
    let best = null, bd = 1e9;
    for (const d of Object.keys(E.DOORS)) { if (E.doorLevel(d) !== l) continue; const [x, y] = cdoor(d), dd = Math.hypot(x - X, y - Y); if (dd < bd) { bd = dd; best = d; } }
    if (bd * sc <= HIT_PX) return { door: best };
    const [x, y] = cplan(X, Y), sp = Object.entries(E.SPACES).find(([k, o]) => o.l === l && o.r.some(r => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]));
    return sp ? { space: sp[0], pt: [x, y] } : null;
  }
  return { svg, summary, litOn, mini, pick, cutawayOn, cutaway: { frame, canvas, cpos, cplan, cdoor, overlay, pick: cpick, LENS_R, VIS_PX, HIT_PX } };
})(Engine, Flow);
