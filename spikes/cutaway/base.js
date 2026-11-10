/* Cutaway spike: engine-exact base image for one level (blockout, optionally with one treated exhibit).
   Axis-aligned tilted plan: screen X = plan x, screen Y = off + k * plan y; walls rise h units up the screen.
   Base images carry no text, routes, doors or permission colours: those stay live SVG above (overlay.js). */
const E = require('../../src/engine.js');

/* dollhouse cutaway: tall exterior back wall (hE) for depth, low interior partitions (hI) so no room hides the one behind
   it, the front exterior wall cut almost away (hF), exhibits may rise above partitions (hT) */
/* C adds a sideways shear to the wall extrusion (walls rise up and to the right), revealing side faces and corners;
   the floor mapping is unchanged, so picking, the footprint and the lens are unaffected */
const VARIANTS = { A: { k: 0.78, hI: 6, hE: 24, hF: 2, hT: 30, sh: 0 }, B: { k: 0.62, hI: 8, hE: 36, hF: 2, hT: 46, sh: 0 }, C: { k: 0.68, hI: 9, hE: 34, hF: 2, hT: 42, sh: 0.5 } };
const geom = v => { const g = VARIANTS[v], off = g.hE + 6; return { ...g, h: g.hI, off, W: 400, H: Math.ceil(off + 300 * g.k + 6) }; };

/* arch: architecture only, white on black (maskcheck.py). arch = true draws every wall face, side face and cap with no
   openings cut, so the wall span of each opening counts too: the pixels a room mask must never touch.
   arch = { o: 'v' | 'h', at, invert, cut } narrows it to one wall line (orientation o within 2.5 units of at), or with
   invert to every wall except that line; cut = true keeps the openings cut. */
function baseSVG(level, v, treated, arch) {
  const { k, hI, hE, hF, hT, sh, off, W, H } = geom(v), Y = y => off + k * y, t = 2.2, h = hI; // wall thickness (plan units)
  const wallH = (o, val) => o === 'h' ? (val <= 12 ? hE : val >= 288 ? hF : hI) : (val <= 12 || val >= 388 ? hE * 0.6 : hI);
  const ids = Object.keys(E.SPACES).filter(id => E.SPACES[id].l === level);
  const FLOOR = { public: '#cfd8dc', program: '#c8d1d9', staff: '#bcc5ca', core: '#aeb7bd', restricted: '#c4bbb1' };
  let s = `<rect width="${W}" height="${H}" fill="#0a1822"/>`;
  // ground plate under the building
  s += `<rect x="10" y="${Y(10) - hE - 2}" width="380" height="${Y(290) - Y(10) + hE + 4}" rx="3" fill="#13232d"/>`;
  // openings: doors on this level and open passages between spaces on this level
  const keepWall = (o, val) => !arch || arch === true || !arch.o || ((o === arch.o && Math.abs(val - arch.at) <= 2.5) !== !!arch.invert);
  const opens = arch && !arch.cut ? [] : [...Object.entries(E.DOORS).filter(([d]) => E.doorLevel(d) === level).map(([, o]) => ({ p: o.p, w: 11 })),
    ...E.LINKS.filter(l => l[2] && E.SPACES[l[0]].l === level && E.SPACES[l[1]].l === level).map(l => ({ p: l[2], w: 15 }))];
  // floors (+ treated floor finish)
  for (const id of ids) { const sp = E.SPACES[id];
    for (const r of sp.r) s += `<rect x="${r[0]}" y="${Y(r[1])}" width="${r[2]}" height="${k * r[3]}" fill="${treated && id === 'kelp' ? 'url(#terr)' : FLOOR[sp.kind]}"/>`;
    if (sp.ellipse) { const [cx, cy, rx, ry] = sp.ellipse; s += `<ellipse cx="${cx}" cy="${Y(cy)}" rx="${rx}" ry="${ry * k}" fill="#9fb4bf" stroke="#7f949e" stroke-width="1"/>`; } }
  if (level === 2) for (const v2 of E.VOIDS) s += `<rect x="${v2.r[0]}" y="${Y(v2.r[1])}" width="${v2.r[2]}" height="${k * v2.r[3]}" fill="#0f1d26" stroke="#2a3c47" stroke-dasharray="2 2"/>`;
  // walls: every rectangle edge, split around openings, drawn back to front
  const walls = [];
  const cut = (a0, a1, pts) => { let segs = [[a0, a1]]; for (const [c, w] of pts) segs = segs.flatMap(([u0, u1]) => c - w / 2 > u1 || c + w / 2 < u0 ? [[u0, u1]] : [[u0, c - w / 2], [c + w / 2, u1]].filter(([p, q]) => q - p > 0.5)); return segs; };
  for (const id of ids) for (const r of E.SPACES[id].r) {
    const [x, y, w, hh] = r;
    for (const yy of [y, y + hh]) { if (!keepWall('h', yy)) continue; const pts = opens.filter(o => Math.abs(o.p[1] - yy) < 4 && o.p[0] > x - 1 && o.p[0] < x + w + 1).map(o => [o.p[0], o.w]);
      const wh = wallH('h', yy);
      for (const [a, b] of cut(x, x + w, pts)) { const B0 = Y(yy), dx = sh * wh, ct = k * t;
        walls.push({ key: yy, svg: `<polygon points="${a},${B0} ${b},${B0} ${b + dx},${B0 - wh} ${a + dx},${B0 - wh}" fill="url(#wallf)"/><polygon points="${a + dx},${B0 - wh} ${b + dx},${B0 - wh} ${b + dx + sh * ct},${B0 - wh - ct} ${a + dx + sh * ct},${B0 - wh - ct}" fill="#eef3f5"/>` }); } }
    for (const xx of [x, x + w]) { if (!keepWall('v', xx)) continue; const pts = opens.filter(o => Math.abs(o.p[0] - xx) < 4 && o.p[1] > y - 1 && o.p[1] < y + hh + 1).map(o => [o.p[1], o.w]);
      const wv = wallH('v', xx);
      for (const [a, b] of cut(y, y + hh, pts)) { const dx = sh * wv, Ya = Y(a), Yb = Y(b);
        walls.push({ key: b, svg: (sh ? `<polygon points="${xx},${Ya} ${xx},${Yb} ${xx + dx},${Yb - wv} ${xx + dx},${Ya - wv}" fill="#97a3aa"/>` : '') +
          `<rect x="${xx - t / 2 + dx}" y="${Ya - wv}" width="${t}" height="${Yb - Ya}" fill="#eef3f5"/><polygon points="${xx - t / 2},${Yb} ${xx + t / 2},${Yb} ${xx + t / 2 + dx},${Yb - wv} ${xx - t / 2 + dx},${Yb - wv}" fill="#8f9aa1"/>` }); } }
  }
  // treated exhibit (Kelp Hall): a tall kelp tank whose front glass faces the viewer
  let tank = '';
  if (treated && level === 1) tank = kelpTank(Y, k, hT, sh);
  walls.sort((a, b) => a.key - b.key);
  const tankKey = 118; // tank front edge (plan y): draw it among the walls in depth order
  let wallsSvg = '', placed = false;
  for (const wl of walls) { if (!placed && tank && wl.key > tankKey) { wallsSvg += tank; placed = true; } wallsSvg += wl.svg; }
  if (tank && !placed) wallsSvg += tank;
  const defs = `<defs><linearGradient id="wallf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a7b2b8"/><stop offset="1" stop-color="#7b878e"/></linearGradient>
    <linearGradient id="terr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3c4a52"/><stop offset="1" stop-color="#26323a"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fb6d6"/><stop offset=".55" stop-color="#14739a"/><stop offset="1" stop-color="#0a3f5c"/></linearGradient>
    <linearGradient id="surf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6fd0e4"/><stop offset=".5" stop-color="#a9eaf3"/><stop offset="1" stop-color="#5cc2db"/></linearGradient>
    <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9c38f"/><stop offset="1" stop-color="#9c7f4c"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#57d4ee" stop-opacity=".55"/><stop offset="1" stop-color="#57d4ee" stop-opacity="0"/></radialGradient></defs>`;
  if (arch) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/>${wallsSvg.replace(/fill="[^"]*"/g, 'fill="#fff"')}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${s}${wallsSvg}</svg>`;
}

/* Kelp Hall tank: inset in the room; top water surface with caustics, front glass with kelp, fish, light rays, sand */
function kelpTank(Y, k, hT, sh = 0) {
  const x0 = 104, x1 = 182, y0 = 52, y1 = 118, fy = Y(y1), ty = Y(y0) - hT, fw = x1 - x0;
  let g = `<rect x="${x0 - 6}" y="${fy}" width="${fw + 12}" height="${Y(132) - fy}" fill="url(#glow)"/>`; // light spill on the floor
  const dx = sh * hT; let top = `<rect x="${x0}" y="${ty}" width="${fw}" height="${fy - hT - ty}" fill="url(#surf)"/>`;
  for (let i = 0; i < 7; i++) { const yy = ty + 2 + i * (fy - hT - ty - 3) / 7; top += `<path d="M${x0 + 3} ${yy} q6 -1.6 12 0 t12 0 t12 0 t12 0 t12 0 t12 0" stroke="#fff" stroke-opacity=".35" stroke-width=".6" fill="none"/>`; }
  if (sh) top += `<polygon points="${x1},${fy - hT} ${x1},${ty} ${x1 + 0},${ty}" fill="none"/>`;
  g += `<g transform="translate(${dx} 0)">${top}</g>`;
  if (sh) g += `<polygon points="${x1},${Y(y0) } ${x1},${fy} ${x1 + dx},${fy - hT} ${x1 + dx},${Y(y0) - hT}" fill="#0b4f73"/><polygon points="${x1},${Y(y0)} ${x1},${fy} ${x1 + dx},${fy - hT} ${x1 + dx},${Y(y0) - hT}" fill="url(#water)" opacity=".55"/>`;
  const fT = fy - hT; // front face top
  let front = '';
  front += `<rect x="${x0}" y="${fT}" width="${fw}" height="${hT}" fill="url(#water)"/>`;
  for (let i = 0; i < 6; i++) front += `<polygon points="${x0 + 6 + i * 13},${fT} ${x0 + 11 + i * 13},${fT} ${x0 + 18 + i * 13},${fy - 4} ${x0 + 9 + i * 13},${fy - 4}" fill="#fff" fill-opacity=".07"/>`;
  front += `<path d="M${x0} ${fy - hT * 0.16} q10 -2 20 0 t20 0 t20 0 t18 0 V${fy} H${x0} Z" fill="url(#sand)"/>`;
  const kelp = (x, hgt, c, sway) => { let p = `M${x} ${fy - 1}`, yy = fy - 1, xx = x; for (let i = 0; i < 6; i++) { const ny = yy - hgt / 6; p += ` Q${xx + sway} ${(yy + ny) / 2} ${xx + (i % 2 ? -0.6 : 0.6)} ${ny}`; yy = ny; }
    let leaves = ''; for (let i = 1; i < 6; i++) { const ly = fy - 1 - i * hgt / 6; leaves += `<ellipse cx="${x + (i % 2 ? 2 : -2)}" cy="${ly}" rx="2.6" ry=".9" fill="${c}" transform="rotate(${i % 2 ? -35 : 35} ${x} ${ly})"/>`; }
    return `<path d="${p}" stroke="${c}" stroke-width="1.1" fill="none"/>${leaves}`; };
  [[108, .9, '#2f7d3c', 2], [115, .75, '#4e9a3a', -2], [124, .95, '#3d8b37', 2.5], [133, .7, '#6fae44', -2], [146, .92, '#2f7d3c', 2], [155, .8, '#4e9a3a', -2.5], [166, .88, '#3d8b37', 2], [175, .7, '#6fae44', -2]]
    .forEach(([x, f, c, sw]) => { front += kelp(x, hT * f, c, sw); });
  const fish = (x, y, sz, c, d = 1) => `<g transform="translate(${x} ${y}) scale(${d} 1)"><ellipse rx="${sz}" ry="${sz * 0.42}" fill="${c}"/><polygon points="${-sz},0 ${-sz * 1.6},${-sz * 0.5} ${-sz * 1.6},${sz * 0.5}" fill="${c}"/></g>`;
  front += fish(120, fT + hT * 0.35, 2.2, '#f2c14e') + fish(150, fT + hT * 0.5, 1.8, '#0e3a52', -1) + fish(162, fT + hT * 0.28, 2.4, '#f29e4c', -1) + fish(136, fT + hT * 0.62, 1.6, '#0e3a52');
  front += `<polygon points="${x0 + 8},${fT} ${x0 + 20},${fT} ${x0 + 6},${fy} ${x0 - 6 + 6},${fy}" fill="#fff" fill-opacity=".14"/>`; // glass highlight
  front += `<rect x="${x0}" y="${fT}" width="${fw}" height="${hT}" fill="none" stroke="#24333b" stroke-width=".9"/><line x1="${x0}" y1="${fT}" x2="${x1}" y2="${fT}" stroke="#cfeef5" stroke-width=".7"/>`;
  g += sh ? `<g transform="matrix(1 0 ${-sh} 1 ${sh * fy} 0)">${front}</g>` : front;
  return g;
}
module.exports = { VARIANTS, geom, baseSVG };
