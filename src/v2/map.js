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
     Step 4: Inspect zoom (Whole building or 2x; the view follows the lens), the quieter footprint pattern (sized in screen
     pixels), room labels where they fit, and identify: a tap names what is under it from the engine's static data only.
     Change-review outlines are Step 5. */
  const CUT = typeof NX_CUTAWAY === 'object' && NX_CUTAWAY ? NX_CUTAWAY : null;
  const cutawayOn = () => !!CUT && typeof location === 'object' && new URLSearchParams(location.search).get('map') === 'cutaway';
  const LENS_R = 56, PAD = 6, LENS_LABEL = 16;   // lens radius (map units, as on the flat map), breathing room, the lens's "ABOVE · L2" line
  const VIS_PX = 7, HIT_PX = 22;
  /* the footprint's public and restricted patterns, sized in screen pixels so they stay quiet over the painted floors */
  const qdefs = (sfx, u) => `<pattern id="nxDotsQ${sfx}" width="${u(12)}" height="${u(12)}" patternUnits="userSpaceOnUse"><circle cx="${u(6)}" cy="${u(6)}" r="${u(1.2)}" fill="#d9fff1" opacity=".55"/></pattern>`
    + `<pattern id="nxStrpQ${sfx}" width="${u(10)}" height="${u(10)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${u(1.6)}" height="${u(10)}" fill="#ffe3b3" opacity=".4"/></pattern>`;                  // door marker radius and hit radius, in screen pixels at every width
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
    for (const k of lit) { const kd = E.SPACES[k].kind; if (kd === 'public' || kd === 'restricted') s += crects(k, `fill="url(#${kd === 'public' ? 'nxDotsQ' : 'nxStrpQ'}${sfx})" opacity="1" pointer-events="none"`); }
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
  function ccallout(sel, sc, view) {
    if (!sel || !sel.door) return ''; const u = px => px / sc, c = view || canvas(), d = E.DOORS[sel.door], [x, y] = cdoor(sel.door), h = u(24), w = Math.min(c.w - 8, u(d.n.length * 7.6 + 18));
    const bx = Math.max(c.x + 4, Math.min(c.x + c.w - 4 - w, x - w / 2)), by = y - u(16) - h > c.y + 2 ? y - u(16) - h : y + u(16);
    return `<g class="nx-callout" pointer-events="none"><rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="${u(6)}" fill="#ffde9f"/><text x="${bx + w / 2}" y="${by + h * 0.7}" text-anchor="middle" font-size="${u(13)}" font-weight="800" fill="#1b1406">${d.n}</text></g>`;
  }
  /* The overlay drawing. Layers, bottom to top: this level (with a hole where the lens is); inside the lens, the other
     level's overlay (the other level's picture is a separate element under this drawing, see app.js); the lens ring; then
     the walk route, the selection and its name, so the lens never hides a stopped door or the selected door.
     o: {lens:[plan x, plan y]|null, sel, walk, initials}; sc: screen pixels per map unit. */
  function overlay(t, l, font, o, sc) {
    const u = px => px / sc, c = o.view || canvas(), LR = o.lensR || LENS_R, other = l === 1 ? 2 : 1, lens = o.lens ? cpos(...o.lens) : null;
    font = String(font).replace(/"/g, "'");   // the family list goes inside a style attribute
    let s = `<defs>${defs('A')}${defs('B')}${qdefs('A', u)}${qdefs('B', u)}${lens ? `<clipPath id="nxLensClip"><circle cx="${lens[0]}" cy="${lens[1]}" r="${LR}"/></clipPath>
      <mask id="nxLensHole" maskUnits="userSpaceOnUse" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="#fff"/><circle cx="${lens[0]}" cy="${lens[1]}" r="${LR}" fill="#000"/></mask>` : ''}</defs>`;
    s += `<g data-level="${l}"${lens ? ' mask="url(#nxLensHole)"' : ''}>${clevel(t, l, 'A', sc)}${roomLabels(l, sc, c, font)}</g>`;
    if (lens) { const ly = lens[1] + LR + u(13) > c.y + c.h - 2 ? lens[1] - LR - u(6) : lens[1] + LR + u(13), lx = Math.max(c.x + u(40), Math.min(c.x + c.w - u(40), lens[0]));
      s += `<g clip-path="url(#nxLensClip)" data-lens-level="${other}">${clevel(t, other, 'B', sc)}</g>
      <circle class="nx-lens" cx="${lens[0]}" cy="${lens[1]}" r="${LR}" fill="none" stroke="#e2ffff" stroke-width="${u(3)}"/><text x="${lx}" y="${ly}" text-anchor="middle" style="font:700 ${u(11)}px ${font};fill:#e2ffff;letter-spacing:.04em" pointer-events="none">${other === 2 ? 'ABOVE · L2' : 'BELOW · L1'}</text>`; }
    if (o.walk) s += `<g class="nx-route">${croute(o.walk, l, o.initials, sc)}</g>`;
    return s + cselection(o.sel, l, sc) + ccallout(o.sel, sc, o.view) + (o.ident ? identCallout(o.ident, sc, c, font) : '');
  }
  /* ---------- Step 4: identify. Reads only the engine's static data (SPACES, DOORS, LINKS, VOIDS); never canEnter, walk
     or footprint, and nothing it returns describes what a badge may do. ---------- */
  const KIND = { public: 'public gallery', staff: 'staff area', program: 'program room', restricted: 'restricted area' };
  const inR = (x, y, r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
  const big = id => E.SPACES[id].r.reduce((a, r) => r[2] * r[3] > a[2] * a[3] ? r : a);
  const floorBox = r => { const [x, y] = cpos(r[0], r[1]); return { x, y, w: r[2], h: CUT.projection.k * r[3] }; };
  const doorsOn = l => Object.keys(E.DOORS).filter(d => E.doorLevel(d) === l).sort();
  /* an open passage crosses the wall its point sits on: 15 units along that wall, 6 either side of it */
  const axis = (a, b, p) => { let best = [1e9, 'h']; for (const id of [a, b]) for (const r of E.SPACES[id].r) {
    for (const y of [r[1], r[1] + r[3]]) if (Math.abs(p[1] - y) < best[0]) best = [Math.abs(p[1] - y), 'h'];
    for (const x of [r[0], r[0] + r[2]]) if (Math.abs(p[0] - x) < best[0]) best = [Math.abs(p[0] - x), 'v']; } return best[1]; };
  const PASSAGES = E.LINKS.filter(k => k[2]).map(([a, b, p]) => ({ id: a + '~' + b, a, b, p, l: E.SPACES[a].l, ax: axis(a, b, p) }));
  const passage = id => PASSAGES.find(q => q.id === id);
  const inPassage = (q, x, y) => q.ax === 'h' ? Math.abs(x - q.p[0]) <= 7.5 && Math.abs(y - q.p[1]) <= 6 : Math.abs(y - q.p[1]) <= 7.5 && Math.abs(x - q.p[0]) <= 6;
  const below = v => { const x = v.r[0] + v.r[2] / 2, y = v.r[1] + v.r[3] / 2, s = Object.values(E.SPACES).find(o => o.l === 1 && o.kind !== 'core' && o.r.some(r => inR(x, y, r))); return s ? s.n : 'Level 1'; };
  /* what a thing is: {name, after, rest}, read as "Name after · rest · rest" */
  function describe(it) {
    if (it.type === 'door') return { name: E.DOORS[it.id].n, after: '', rest: ['door with a badge reader', 'Level ' + E.doorLevel(it.id)] };
    if (it.type === 'passage') { const q = passage(it.id); return { name: 'Open passage', after: ` between ${E.SPACES[q.a].n} and ${E.SPACES[q.b].n}`, rest: ['no reader', 'Level ' + q.l] }; }
    if (it.type === 'void') return { name: 'Open to Level 1', after: '', rest: [`the ${below(E.VOIDS[it.id])} is below`, 'not a room on this level'] };
    const sp = E.SPACES[it.id];
    if (sp.kind === 'core') return { name: sp.n.replace(/ · L\d$/, ''), after: '', rest: ['stairs between Level 1 and Level 2'] };
    return { name: sp.n, after: '', rest: [KIND[sp.kind] || 'room', 'Level ' + sp.l] };
  }
  const plain = d => d.name + d.after + d.rest.map(r => ' · ' + r).join('');
  /* every identifiable thing on a level, for the Find list (engine order) */
  function targets(l) {
    const out = [];
    for (const [k, sp] of Object.entries(E.SPACES)) if (sp.l === l) out.push({ type: sp.kind === 'core' ? 'core' : 'room', id: k, l });
    for (const d of Object.keys(E.DOORS)) if (E.doorLevel(d) === l) out.push({ type: 'door', id: d, l });
    for (const q of PASSAGES) if (q.l === l) out.push({ type: 'passage', id: q.id, l });
    if (l === 2) E.VOIDS.forEach((v, i) => out.push({ type: 'void', id: String(i), l }));
    return out;
  }
  /* where a thing's name is pinned: its marker, its gap, the top edge of a void, or a room's floor centre (a tap uses the tapped spot) */
  function anchor(it) {
    if (it.type === 'door') return cdoor(it.id);
    if (it.type === 'passage') return cpos(...passage(it.id).p);
    if (it.type === 'void') { const b = floorBox(E.VOIDS[it.id].r); return [b.x + b.w / 2, b.y]; }
    const b = floorBox(big(it.id)); return [b.x + b.w / 2, b.y + b.h / 2];
  }
  /* a door's identify radius: 22 px, capped at half the distance to the nearest other marker on its level, never under 12 px */
  function doorRadius(d, sc) { const [x, y] = cdoor(d); let nn = 1e9; for (const e of doorsOn(E.doorLevel(d))) if (e !== d) { const [a, b] = cdoor(e); nn = Math.min(nn, Math.hypot(a - x, b - y) * sc); } return Math.min(HIT_PX, Math.max(12, nn / 2)); }
  /* what is under a cutaway point, first match wins: door, open passage, void, stair core, room. Inside a core the core wins
     over its door unless the tap is within 12 px of the marker. Ties between doors go to the nearer, then to the smaller id. */
  function identify(X, Y, l, sc) {
    const [x, y] = cplan(X, Y), core = Object.keys(E.SPACES).find(k => E.SPACES[k].l === l && E.SPACES[k].kind === 'core' && E.SPACES[k].r.some(r => inR(x, y, r)));
    let best = null, bd = 1e9;
    for (const d of doorsOn(l)) { const [a, b] = cdoor(d), dd = Math.hypot(a - X, b - Y) * sc; if (dd <= doorRadius(d, sc) && dd < bd) { bd = dd; best = d; } }
    if (best && !(core && bd > 12)) return { type: 'door', id: best, l };
    const q = PASSAGES.find(q => q.l === l && inPassage(q, x, y)); if (q) return { type: 'passage', id: q.id, l };
    if (l === 2) { const i = E.VOIDS.findIndex(v => inR(x, y, v.r)); if (i >= 0) return { type: 'void', id: String(i), l }; }
    if (core) return { type: 'core', id: core, l };
    const sp = Object.keys(E.SPACES).find(k => E.SPACES[k].l === l && E.SPACES[k].kind !== 'core' && E.SPACES[k].r.some(r => inR(x, y, r)));
    return sp ? { type: 'room', id: sp, l } : null;
  }
  const hitCircle = (b, c) => { const nx = Math.max(b.x, Math.min(c.x, b.x + b.w)), ny = Math.max(b.y, Math.min(c.y, b.y + b.h)); return Math.hypot(nx - c.x, ny - c.y) < c.r; };
  const hitRect = (b, r) => b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y;
  const within = (b, r) => b.x >= r.x && b.x + b.w <= r.x + r.w && b.y >= r.y && b.y + b.h <= r.y + r.h;
  /* what a thing's name must never cover: its marker, its passage gap, or (for a void) its edge */
  function own(it, at, sc) {
    const u = px => px / sc, k = CUT.projection.k;
    if (it.type === 'door') return { c: { x: at[0], y: at[1], r: u(VIS_PX + 3) } };
    if (it.type === 'passage') { const q = passage(it.id), [x, y] = cpos(...q.p); return { r: q.ax === 'h' ? { x: x - 7.5, y: y - u(6), w: 15, h: u(12) } : { x: x - u(6), y: y - 7.5 * k, w: u(12), h: 15 * k } }; }
    if (it.type === 'void') return { edge: floorBox(E.VOIDS[it.id].r) };
    return { c: { x: at[0], y: at[1], r: u(4) } };
  }
  /* the name box: above the thing, else below it; slid sideways to clear other door markers; always inside the view */
  function callBox(it, text, at, sc, view) {
    const u = px => px / sc, w = Math.min(view.w - u(8), u(text.length * 7.6 + 18)), h = u(24), o = own(it, at, sc), marks = doorsOn(it.l).map(cdoor);
    const near = marks.filter(([x, y]) => Math.hypot(x - at[0], y - at[1]) * sc <= 30);
    const area = it.type === 'room' || it.type === 'core', g = area ? [6, 16, 40] : [16, 40];   // an area's name may sit close to the tapped spot: no marker is under it
    const ys = o.edge ? [o.edge.y - u(8) - h, o.edge.y + o.edge.h + u(8), o.edge.y - u(40) - h, o.edge.y + o.edge.h + u(40)] : g.flatMap(d => [at[1] - u(d) - h, at[1] + u(d)]);
    const inView = b => b.x >= view.x + u(2) - 1e-6 && b.x + b.w <= view.x + view.w - u(2) + 1e-6 && b.y >= view.y + u(2) - 1e-6 && b.y + b.h <= view.y + view.h - u(2) + 1e-6;
    const clear = (b, avoid) => inView(b) && !(o.c && hitCircle(b, o.c)) && !(o.r && hitRect(b, o.r)) && !(o.edge && hitRect(b, o.edge) && !within(b, o.edge))
      && !avoid.some(([x, y]) => hitCircle(b, { x, y, r: u(VIS_PX + 2) }));
    const cands = []; for (const y of ys) for (const dx of [0, -40, 40, -80, 80, -120, 120, -160, 160]) cands.push({ x: Math.max(view.x + u(2), Math.min(view.x + view.w - u(2) - w, at[0] - w / 2 + u(dx))), y, w, h });
    return cands.find(b => clear(b, marks)) || cands.find(b => clear(b, near)) || cands.find(b => clear(b, [])) || cands[0];
  }
  function identCallout(it, sc, view, font) {
    const u = px => px / sc, d = describe(it), at = it.at || anchor(it), b = callBox(it, d.name, at, sc, view);
    return `<g class="nx-ident-callout" data-ident="${it.type}:${it.id}" pointer-events="none"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${u(6)}" fill="#ffde9f"/>`
      + `<text x="${b.x + b.w / 2}" y="${b.y + b.h * 0.7}" text-anchor="middle" font-size="${u(13)}" font-weight="800" fill="#1b1406">${d.name}</text></g>`;
  }
  /* room names that fit whole on their floor at this size without touching a door marker; never cores, doors, passages or voids */
  function roomLabels(l, sc, view, font) {
    const u = px => px / sc, marks = doorsOn(l).map(cdoor); let s = '';
    for (const [id, sp] of Object.entries(E.SPACES)) { if (sp.l !== l || sp.kind === 'core') continue;
      const f = floorBox(big(id)), tw = u(sp.n.length * 6.4 + 10), th = u(16); if (tw > f.w || th > f.h) continue;
      const b = { x: f.x + f.w / 2 - tw / 2, y: f.y + f.h / 2 - th / 2, w: tw, h: th };
      if (!within(b, view) || marks.some(([x, y]) => hitCircle(b, { x, y, r: u(VIS_PX + 2) }))) continue;
      s += `<text data-room-label="${id}" x="${f.x + f.w / 2}" y="${f.y + f.h / 2 + u(4)}" text-anchor="middle" stroke="#061b29" stroke-width="${u(3)}" stroke-linejoin="round" paint-order="stroke" style="font:700 ${u(11)}px ${font};fill:#e3f5f6">${sp.n}</text>`; }
    return `<g class="nx-rlabels" pointer-events="none">${s}</g>`;
  }
  /* what is under a cutaway point: the nearest door marker within HIT_PX screen pixels, else the room (as on the flat map) */
  function cpick(X, Y, l, sc) {
    let best = null, bd = 1e9;
    for (const d of Object.keys(E.DOORS)) { if (E.doorLevel(d) !== l) continue; const [x, y] = cdoor(d), dd = Math.hypot(x - X, y - Y); if (dd < bd) { bd = dd; best = d; } }
    if (bd * sc <= HIT_PX) return { door: best };
    const [x, y] = cplan(X, Y), sp = Object.entries(E.SPACES).find(([k, o]) => o.l === l && o.r.some(r => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]));
    return sp ? { space: sp[0], pt: [x, y] } : null;
  }
  return { svg, summary, litOn, mini, pick, cutawayOn, cutaway: { frame, canvas, cpos, cplan, cdoor, overlay, pick: cpick, LENS_R, VIS_PX, HIT_PX, identify, describe, plain, targets, anchor, doorRadius, below } };
})(Engine, Flow);
