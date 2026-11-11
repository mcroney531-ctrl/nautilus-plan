// Geometry tests for the cutaway blockout (no browser). Usage: node spikes/cutaway/test-geometry.js
// 1. Same-space connectivity: no wall is drawn on a boundary shared by two rectangles of one engine space.
// 2. Genuine walls stay: every edge between different spaces is still walled, apart from its door and passage openings.
const assert = require('assert'), E = require('../../src/engine.js'), { baseSVG } = require('./base.js');
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok', name); };
const segs = (level, arch) => { const out = {}; baseSVG(level, 'C', false, arch, out); return out.segs; };
const covered = (ss, o, at, a, b) => ss.filter(s => s.o === o && Math.abs(s.at - at) < 0.01).reduce((t, s) => t + Math.max(0, Math.min(b, s.b) - Math.max(a, s.a)), 0);
// every shared boundary, found from the engine, not listed by hand
const shared = level => { const res = [];
  for (const [id, sp] of Object.entries(E.SPACES)) { if (sp.l !== level) continue;
    sp.r.forEach((r, i) => sp.r.forEach((q, j) => { if (j <= i) return;
      for (const [o, at, lo, hi] of [['v', r[0], r[1], r[1] + r[3]], ['v', r[0] + r[2], r[1], r[1] + r[3]], ['h', r[1], r[0], r[0] + r[2]], ['h', r[1] + r[3], r[0], r[0] + r[2]]]) {
        const qe = o === 'v' ? [q[0], q[0] + q[2]] : [q[1], q[1] + q[3]], [qlo, qhi] = o === 'v' ? [q[1], q[1] + q[3]] : [q[0], q[0] + q[2]];
        if (qe.some(e => Math.abs(e - at) < 0.01) && Math.min(hi, qhi) - Math.max(lo, qlo) > 0.5) res.push({ id, o, at, a: Math.max(lo, qlo), b: Math.min(hi, qhi) }); } })); }
  return res; };
for (const level of [1, 2]) for (const arch of [false, true]) ok(`L${level}${arch ? ' (architecture render)' : ''}: no wall on any boundary shared inside one space`, () => {
  const ss = segs(level, arch), sh = shared(level); assert(sh.length > 0);
  for (const b of sh) assert.strictEqual(covered(ss, b.o, b.at, b.a, b.b), 0, `${b.id}: wall on its own internal boundary ${b.o}=${b.at} ${b.a}..${b.b}`); });
ok('the three known cases are found: L1 West gallery, L2 Tank-top catwalks, L2 East mezzanine', () => {
  const has = (l, id, at, a, b) => assert(shared(l).some(s => s.id === id && s.o === 'v' && s.at === at && s.a === a && s.b === b), id);
  has(1, 'westGal', 96, 254, 288); has(2, 'topside', 198, 112, 132); has(2, 'eastMezz', 348, 120, 194); });
ok('genuine walls stay: the rest of each of those edges is still walled', () => {
  const s1 = segs(1), s2 = segs(2);
  assert(covered(s1, 'v', 96, 44, 254) > 170, 'West gallery east wall above its south leg (less three openings)');   // 210 less D-LSG, D-CLS and the Kelp Hall passage
  assert.strictEqual(covered(s2, 'v', 198, 44, 112), 68, 'catwalks west wall north of the strip'); assert.strictEqual(covered(s2, 'v', 198, 132, 202), 70, 'catwalks west wall south of the strip');
  assert.strictEqual(covered(s2, 'v', 348, 44, 120), 76, 'East mezzanine west wall north of its west part'); });
ok('door-controlled boundaries stay walled, with only the door width open', () => {
  for (const [d, o] of Object.entries(E.DOORS)) { const l = E.doorLevel(d), ss = segs(l), [x, y] = o.p;
    const near = ss.filter(s => Math.abs(s.at - (s.o === 'v' ? x : y)) < 4), along = s => s.o === 'v' ? y : x;
    assert(near.length, d + ': no wall line at the door');
    assert(near.every(s => !(s.a < along(s) - 0.01 && s.b > along(s) + 0.01)), d + ': wall runs through the door');
    assert(near.some(s => Math.abs(s.b - (along(s) - 5.5)) < 0.01 || Math.abs(s.a - (along(s) + 5.5)) < 0.01), d + ': the opening is not the 11-unit door width'); } });
ok('architecture render still keeps door and passage spans closed (masks may not touch them)', () => {
  const a1 = segs(1, true); assert.strictEqual(covered(a1, 'v', 96, 44, 254), 210); });
ok('a wall between two different spaces on the same line is untouched', () => {
  const s1 = segs(1); assert.strictEqual(covered(s1, 'h', 254, 96, 196), 100 * 1, 'the south leg keeps its north wall (Classroom side)'); });
console.log(n + ' geometry tests passed');
