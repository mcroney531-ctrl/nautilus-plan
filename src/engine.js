/* Nautilus access engine — fictional, simplified model for a training prototype.
   Three separate concepts: GRANTED (what the badge permits), AUTHORIZED (what the work record allows),
   REACHABLE (where the person can actually get from an entrance at a time). */
const Engine = (() => {
  // ---------- Building ----------
  // Spaces: level + shape (array of rects; multi-rect spaces are literal unions)
  const SPACES = {
    // Level 1
    westSvc:   { n: 'West service hall', l: 1, r: [[12, 44, 40, 244]], kind: 'staff' },
    westCore1: { n: 'West core · L1', short:'W CORE', l: 1, r: [[12, 12, 40, 30]], kind: 'core' },
    spine:     { n: 'Service spine', l: 1, r: [[54, 12, 292, 28]], kind: 'staff' },
    eastCore1: { n: 'East core · L1', short:'E CORE', l: 1, r: [[348, 12, 40, 30]], kind: 'core' },
    eastSvc:   { n: 'East service hall', l: 1, r: [[348, 44, 40, 150]], kind: 'staff' },
    receiving: { n: 'Receiving', l: 1, r: [[316, 196, 72, 92]], kind: 'staff' },
    westGal:   { n: 'West gallery', l: 1, r: [[56, 44, 40, 244], [96, 254, 100, 34]], kind: 'public' },
    kelp:      { n: 'Kelp Hall', l: 1, r: [[98, 44, 90, 88]], kind: 'public' },
    touch:     { n: 'Living Shore', l: 1, r: [[98, 134, 90, 66]], kind: 'public' },
    classroom: { n: 'Classroom', l: 1, r: [[98, 202, 90, 50]], kind: 'program' },
    reef:      { n: 'Reef Tunnel', l: 1, r: [[198, 44, 90, 158]], kind: 'public', ellipse: [243, 123, 44, 76] },
    jelly:     { n: 'Jelly Room', l: 1, r: [[290, 44, 56, 74]], kind: 'public' },
    seasonal:  { n: 'Seasonal', l: 1, r: [[290, 120, 56, 74]], kind: 'public' },
    atrium:    { n: 'Atrium', l: 1, r: [[198, 204, 116, 84]], kind: 'public' },
    // Level 2
    westCore2: { n: 'West core · L2', short:'W CORE', l: 2, r: [[12, 12, 40, 30]], kind: 'core' },
    westMezz:  { n: 'West mezzanine', l: 2, r: [[12, 44, 84, 96]], kind: 'staff' },
    quarantine:{ n: 'Quarantine', l: 2, r: [[98, 44, 90, 66]], kind: 'restricted' },
    topside:   { n: 'Tank-top catwalks', l: 2, r: [[98, 112, 100, 20], [198, 44, 98, 158]], kind: 'staff' },
    food:      { n: 'Food prep', l: 2, r: [[98, 134, 90, 66]], kind: 'staff' },
    admin:     { n: 'Ops offices', l: 2, r: [[12, 142, 84, 90]], kind: 'staff' },
    eastCore2: { n: 'East core · L2', short:'E CORE', l: 2, r: [[348, 12, 40, 30]], kind: 'core' },
    eastMezz:  { n: 'East mezzanine', l: 2, r: [[348, 44, 40, 150], [298, 120, 50, 74]], kind: 'staff' },
    dive:      { n: 'Dive locker', l: 2, r: [[298, 44, 48, 74]], kind: 'staff' },
    life:      { n: 'Life support', l: 2, r: [[316, 196, 72, 92]], kind: 'restricted' },
  };
  const VOIDS = [ // L2 areas open to the level below
    { n: 'Open to classroom', r: [98, 202, 90, 50] }, { n: 'Open to atrium', r: [198, 204, 116, 84] },
    { n: 'Open to west gallery', r: [96, 254, 100, 34] },
  ];
  const OUTSIDE = { outW: { n: 'Outside · West staff entrance', l: 1, p: [32, 298] }, outD: { n: 'Outside · Loading dock', l: 1, p: [398, 250] } };

  // Open links (no reader). p = waypoint for route drawing.
  const LINKS = [
    ['westSvc', 'spine', [40, 40]], ['spine', 'eastSvc', [360, 40]], ['eastSvc', 'receiving', [368, 196]],
    ['westGal', 'kelp', [97, 88]], ['westGal', 'atrium', [197, 271]], ['atrium', 'reef', [243, 203]],
    ['reef', 'jelly', [289, 80]], ['reef', 'seasonal', [289, 157]],
    ['westCore1', 'westCore2', null, 'stair'], ['eastCore1', 'eastCore2', null, 'stair'],
    ['westMezz', 'admin', [54, 141]],
  ];
  // Doors with readers. `into` = secured side; exit back out is free (simulation rule).
  const DOORS = {
    'D-WSE':  { n: 'West Staff Entrance', from: 'outW', into: 'westSvc', p: [32, 288] },
    'D-WGC':  { n: 'Staff–gallery connector', from: 'westSvc', into: 'westGal', p: [54, 170] },
    'D-LSG':  { n: 'Living Shore staff gate', from: 'westGal', into: 'touch', p: [97, 167] },
    'D-CLS':  { n: 'Classroom', from: 'westGal', into: 'classroom', p: [97, 227] },
    'D-WC1':  { n: 'West core · L1', from: 'westSvc', into: 'westCore1', p: [32, 43] },
    'D-WM':   { n: 'West mezzanine', from: 'westCore2', into: 'westMezz', p: [32, 43] },
    'D-QUAR': { n: 'Quarantine', from: 'westMezz', into: 'quarantine', p: [97, 77] },
    'D-TOPW': { n: 'Tank-top · west', from: 'westMezz', into: 'topside', p: [97, 122] },
    'D-FOOD': { n: 'Food prep', from: 'topside', into: 'food', p: [143, 133] },
    'D-DOCK': { n: 'Loading dock', from: 'outD', into: 'receiving', p: [388, 250] },
    'D-EC1':  { n: 'East core · L1', from: 'eastSvc', into: 'eastCore1', p: [368, 43] },
    'D-EM':   { n: 'East mezzanine', from: 'eastCore2', into: 'eastMezz', p: [368, 43] },
    'D-DIVE': { n: 'Dive locker', from: 'eastMezz', into: 'dive', p: [322, 119] },
    'D-TOPE': { n: 'Tank-top · east', from: 'eastMezz', into: 'topside', p: [297, 157] },
    'D-LIFE': { n: 'Life support', from: 'eastMezz', into: 'life', p: [368, 195] },
  };
  const levelOf = id => (SPACES[id] || OUTSIDE[id]).l;
  const doorLevel = d => levelOf(DOORS[d].into);

  // ---------- Access groups (fictional Nautilus policy) ----------
  const GROUPS = {
    allStaff:  { n: 'All Staff', doors: ['D-WSE'], hours: [6, 20], members: 140 },
    education: { n: 'Education', doors: ['D-WGC', 'D-LSG', 'D-CLS'], hours: [6.5, 18], members: 9 },
    exhibitOps:{ n: 'Exhibit Operations', note: 'Standard onboarding template',
                 doors: ['D-WSE', 'D-WGC', 'D-LSG', 'D-CLS', 'D-WC1', 'D-WM', 'D-TOPW', 'D-FOOD', 'D-QUAR'], hours: [5, 22], members: 31,
                 inherited: { 'D-QUAR': 'Husbandry Support (merged into this template, 2021)', 'D-FOOD': 'Husbandry Support (merged into this template, 2021)' } },
    diveCrew:  { n: 'Dive Crew', doors: ['D-DOCK', 'D-EC1', 'D-EM', 'D-DIVE', 'D-TOPE'], hours: [7, 19], members: 12 },
  };

  // ---------- Evaluation ----------
  const fmt = h => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? String(Math.round((h % 1) * 60)).padStart(2, '0') : '00'}`;
  function groupHours(world, g) { return (world.groupOverrides && world.groupOverrides[g]) || GROUPS[g].hours; }
  // Effective grants ignoring time: door -> [{via, kind, window}]
  function grants(world, person) {
    const out = {};
    if (!person.credential.active) return out;
    for (const g of person.credential.groups) for (const d of GROUPS[g].doors)
      (out[d] = out[d] || []).push({ via: GROUPS[g].n, group: g, kind: 'group', window: groupHours(world, g), inherited: GROUPS[g].inherited && GROUPS[g].inherited[d] });
    for (const x of person.credential.exceptions || []) for (const d of x.doors)
      (out[d] = out[d] || []).push({ via: `Exception · ${x.source}`, kind: 'exception', window: x.window, day: x.day });
    return out;
  }
  // Can this person enter through this door at time t? Returns full evidence; the UI decides what to show.
  function canEnter(world, person, doorId, t) {
    const door = DOORS[doorId];
    if (!door) return { ok: false, code: 'NO_DOOR' };
    const status = (world.doorStatus && world.doorStatus[doorId]) || 'online';
    if (!person.credential.active) return { ok: false, code: 'CREDENTIAL_INACTIVE', status };
    const g = grants(world, person)[doorId] || [];
    if (!g.length) return { ok: false, code: 'NO_GRANT', status, grants: g };
    const inTime = g.filter(x => (!x.day || x.day === world.day) && t >= x.window[0] && t < x.window[1]);
    if (!inTime.length) return { ok: false, code: 'OUTSIDE_SCHEDULE', status, grants: g };
    if (status === 'fault') return { ok: false, code: 'HARDWARE_FAULT', status, grants: g };
    return { ok: true, code: 'OK', status, grants: g, via: inTime };
  }
  // Adjacency for pathing: open links + doors (both directions; entry checked only toward `into`)
  function edges(id) {
    const e = [];
    for (const [a, b, p, kind] of LINKS) { if (a === id) e.push({ to: b, p, kind }); if (b === id) e.push({ to: a, p, kind }); }
    for (const [d, o] of Object.entries(DOORS)) {
      if (o.from === id) e.push({ to: o.into, door: d, p: o.p });
      if (o.into === id) e.push({ to: o.from, door: d, p: o.p, exit: true });
    }
    return e;
  }
  // Shortest physical path ignoring access (used to plan a walk)
  function path(from, to) {
    const prev = new Map([[from, null]]), q = [from];
    while (q.length) { const a = q.shift(); if (a === to) break; for (const e of edges(a)) if (!prev.has(e.to) && !OUTSIDE[e.to]) { prev.set(e.to, { from: a, e }); q.push(e.to); } }
    if (!prev.has(to)) return null;
    const steps = []; let k = to; while (prev.get(k)) { const s = prev.get(k); steps.unshift({ from: s.from, to: k, ...s.e }); k = s.from; }
    return steps;
  }
  // Walk to targets in order; stop at first denial
  function walk(world, person, start, targets, t) {
    let at = start; const steps = []; const reached = [];
    for (const tg of targets) {
      const p = path(at, tg); if (!p) return { steps, reached, stop: { code: 'NO_PATH', at } };
      for (const s of p) {
        if (s.door && !s.exit) {
          const r = canEnter(world, person, s.door, t);
          steps.push({ ...s, result: r });
          if (!r.ok) return { steps, reached, stop: { door: s.door, code: r.code, at: s.from } };
        } else steps.push({ ...s, result: { ok: true, code: s.door ? 'EXIT' : 'OPEN' } });
        at = s.to;
      }
      reached.push(tg);
    }
    return { steps, reached, stop: null };
  }
  // GRANTED footprint: spaces behind granted doors, flooded through open links (time ignored)
  function footprint(world, person) {
    const g = grants(world, person), sp = new Set();
    const flood = s => { if (sp.has(s) || OUTSIDE[s]) return; sp.add(s); for (const [a, b] of LINKS) { if (a === s) flood(b); if (b === s) flood(a); } };
    for (const d of Object.keys(g)) flood(DOORS[d].into);
    return { spaces: sp, doors: new Set(Object.keys(g)) };
  }
  // Effective-permission difference (computed from footprints, not from which checkbox changed)
  function delta(before, after) {
    const minus = (a, b) => [...a].filter(x => !b.has(x));
    return { addedSpaces: minus(after.spaces, before.spaces), removedSpaces: minus(before.spaces, after.spaces),
             addedDoors: minus(after.doors, before.doors), removedDoors: minus(before.doors, after.doors) };
  }
  // AUTHORIZED vs GRANTED: doors the badge opens that no active authorization covers
  // An authorization counts only while approved and not past its end date (expired records are history, not authority)
  const authActive = (world, a) => a.status === 'approved' && (!a.ends || a.ends >= world.date);
  function outOfScope(world, person) {
    const auth = (person.authorizations || []).filter(a => authActive(world, a));
    const ok = new Set(auth.flatMap(a => a.doors));
    return Object.keys(grants(world, person)).filter(d => !ok.has(d));
  }
  const clone = o => JSON.parse(JSON.stringify(o));
  return { SPACES, VOIDS, OUTSIDE, LINKS, DOORS, GROUPS, levelOf, doorLevel, fmt, grants, canEnter, path, walk, footprint, delta, outOfScope, authActive, clone, groupHours };
})();
if (typeof module !== 'undefined') module.exports = Engine;
