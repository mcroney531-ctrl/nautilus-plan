/* Nautilus V2 map drawing (Phase 03): the engine's own floor plan as SVG strings, ported from V1's levelSVG.
   Shows GRANTED only (Engine.footprint: doors the badge's groups and exceptions open, flooded through open passages).
   Time windows, schedules, door status and reader faults never reach the map: those belong to the walk (opened or
   didn't open, no reason) and to inspection. Change review, the lens and the walk route arrive in Phases 04 and 05. */
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
  function level(t, l, sfx) {
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
    for (const [d, o] of Object.entries(E.DOORS)) { if (E.doorLevel(d) !== l) continue; const g = fp.doors.has(d);
      s += `<circle class="nx-door" data-door="${d}" data-granted="${g}" cx="${o.p[0]}" cy="${o.p[1]}" r="6" fill="${g ? '#a4ead0' : '#0b2a39'}" stroke="#a9cfd6" stroke-width="1.3"/>`; }
    if (l === 1) s += `<path d="M24 296h16M390 242v16" stroke="#a4ead0" stroke-width="3"/><text x="44" y="297" class="nx-lbl nx-lbl-out" style="text-anchor:start">STAFF ENTRANCE</text><text x="383" y="236" class="nx-lbl nx-lbl-out" style="text-anchor:end">DOCK</text>`;
    return s;
  }
  const svg = (t, l, font) => `<defs>${defs('A')}</defs>${style(font)}${level(t, l, 'A')}`;
  /* the same facts as text, for screen readers and anyone who cannot read the drawing */
  function summary(t) {
    const fp = footprintOf(t), byL = l => [...fp.spaces].filter(k => E.SPACES[k].l === l).map(k => E.SPACES[k].n);
    return { doors: [...fp.doors].map(d => E.DOORS[d].n), l1: byL(1), l2: byL(2) };
  }
  const litOn = (t, l) => [...footprintOf(t).spaces].some(k => E.SPACES[k].l === l);
  return { svg, summary, litOn };
})(Engine, Flow);
