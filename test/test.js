const E = require('../src/engine.js'), S = require('../src/scenarios.js'), assert = require('assert');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const world = sc => ({ day: sc.day, date: sc.date, doorStatus: {}, groupOverrides: {} });
const P = id => E.clone(S[id].person);

t('physical paths exist for every target', () => {
  for (const id of ['elena', 'marcus']) { let at = S[id].start; for (const tg of S[id].targets) { assert(E.path(at, tg), `${id} ${at}->${tg}`); at = tg; } }
});
t('credential grant: Education alone is denied at staff entrance (granted ≠ reachable)', () => {
  const p = P('elena'); p.credential.groups = ['education']; const w = world(S.elena);
  const r = E.walk(w, p, 'outW', S.elena.targets, 7.25);
  assert.equal(r.stop.door, 'D-WSE'); assert.equal(r.stop.code, 'NO_GRANT');
  assert(E.footprint(w, p).spaces.has('kelp'), 'footprint still shows galleries');
});
t('correct Elena badge reaches all targets and stays in scope', () => {
  const p = P('elena'); p.credential.groups = ['allStaff', 'education']; const w = world(S.elena);
  const r = E.walk(w, p, 'outW', S.elena.targets, 7.25);
  assert.equal(r.stop, null); assert.deepEqual(E.outOfScope(w, p), []);
});
t('broad group genuinely grants extra doors (not just a warning)', () => {
  const p = P('elena'); p.credential.groups = ['exhibitOps']; const w = world(S.elena);
  assert.equal(E.canEnter(w, p, 'D-QUAR', 7.25).ok, true);
  assert(E.outOfScope(w, p).includes('D-QUAR'));
  assert.equal(E.walk(w, p, 'outW', ['quarantine'], 7.25).stop, null);
});
t('delta uses effective permissions (overlap not counted as removed)', () => {
  const w = world(S.elena), a = P('elena'), b = P('elena');
  a.credential.groups = ['allStaff', 'education', 'exhibitOps']; b.credential.groups = ['allStaff', 'education'];
  const d = E.delta(E.footprint(w, a), E.footprint(w, b));
  assert(!d.removedDoors.includes('D-CLS') && !d.removedDoors.includes('D-WSE'));
  assert(d.removedDoors.includes('D-QUAR') && d.removedSpaces.includes('quarantine'));
  const add = E.delta(E.footprint(w, b), E.footprint(w, a));
  assert(add.addedSpaces.includes('quarantine') && add.addedSpaces.includes('topside'));
});
t('time-based denial: same evaluator, no case branch', () => {
  const p = P('marcus'), w = world(S.marcus);
  const r = E.walk(w, p, 'outD', S.marcus.targets, 5.5);
  assert.equal(r.stop.door, 'D-DOCK'); assert.equal(r.stop.code, 'OUTSIDE_SCHEDULE');
  assert(E.footprint(w, p).spaces.has('dive'), 'footprint correct even though unreachable');
});
t('scoped exception fixes Marcus without touching the group', () => {
  const p = P('marcus'), w = world(S.marcus); p.credential.exceptions.push(p.authorizations[1].exception);
  assert.equal(E.walk(w, p, 'outD', S.marcus.targets, 5.5).stop, null);
  const other = { credential: { active: true, groups: ['diveCrew'], exceptions: [] } };
  assert.equal(E.canEnter(w, other, 'D-DOCK', 5.5).ok, false, 'other crew unaffected');
});
t('exception is day-scoped', () => {
  const p = P('marcus'), w = world(S.marcus); w.day = 'Wed'; p.credential.exceptions.push(p.authorizations[1].exception);
  assert.equal(E.canEnter(w, p, 'D-DOCK', 5.5).ok, false);
});
t('group schedule edit also works but changes access for others', () => {
  const w = world(S.marcus); w.groupOverrides.diveCrew = [5, 19];
  const other = { credential: { active: true, groups: ['diveCrew'], exceptions: [] } };
  assert.equal(E.canEnter(w, other, 'D-DOCK', 5.5).ok, true);
});
t('wrong fix: adding a broad group does not get Marcus past the dock', () => {
  const p = P('marcus'), w = world(S.marcus); p.credential.groups.push('exhibitOps');
  assert.equal(E.walk(w, p, 'outD', S.marcus.targets, 5.5).stop.door, 'D-DOCK');
});
t('hardware fault denies even with a valid grant', () => {
  const p = P('marcus'), w = world(S.marcus); w.doorStatus['D-DOCK'] = 'fault';
  assert.equal(E.canEnter(w, p, 'D-DOCK', 9).code, 'HARDWARE_FAULT');
});
t('audit: active credential with expired authorization is out of scope (Jordan fixture)', () => {
  const w = { day: 'Tue', date: '2026-10-27', doorStatus: {}, groupOverrides: {} };
  const jordan = { credential: { active: true, groups: ['exhibitOps'], exceptions: [] },
    authorizations: [{ id: 'WO-1873', status: 'approved', ends: '2026-07-20', doors: ['D-WSE', 'D-WC1', 'D-WM', 'D-TOPW'] }] };
  assert.equal(E.canEnter(w, jordan, 'D-TOPW', 10).ok, true, 'badge still works');
  assert(E.outOfScope(w, jordan).includes('D-TOPW'), 'but nothing authorizes it');
});
t('inactive credential denies everything', () => {
  const p = P('marcus'), w = world(S.marcus); p.credential.active = false;
  assert.equal(E.canEnter(w, p, 'D-DOCK', 9).code, 'CREDENTIAL_INACTIVE');
});
console.log(`\n${n} tests passed`);
