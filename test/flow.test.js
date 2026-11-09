// Behaviour lock for src/flow.js. 1) Exact parity with the baseline recorded from the original UI code
// (test/golden/flow-baseline.json, 734 ticket states). 2) Independent checks of each ticket's outcomes.
const assert = require('assert'), E = require('../src/engine.js'), S = require('../src/scenarios.js'), F = require('../src/flow.js');
const M = require('./flow-matrix.js'), golden = require('./golden/flow-baseline.json');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const impl = { ...F, verified: F.verified, routeOf: F.routeOf, actorOf: F.actorOf };

t(`parity: every one of the ${golden.cases.length} baseline ticket states gives the same walk, landmarks, grade and record`, () => {
  const cases = M.cases(); assert.equal(cases.length, golden.cases.length, 'same matrix');
  const diffs = [];
  cases.forEach((c, i) => { const got = M.run(impl, c), want = golden.cases[i];
    try { assert.deepStrictEqual(got, want); } catch (e) { diffs.push(JSON.stringify(c)); } });
  assert.deepEqual(diffs, [], `${diffs.length} states differ from the baseline`);
});
t('parity: the baseline reaches all 17 outcomes and all 5 record kinds', () => {
  assert.equal(new Set(golden.cases.map(r => r.case.id + r.grade.title)).size, 17);
  assert.equal(new Set(golden.cases.filter(r => r.record).map(r => r.record.title)).size, 5);
});

// independent checks
const fresh = id => ({ person: E.clone(S[id].person), world: { day: S[id].day, date: S[id].date, doorStatus: E.clone(S[id].doorStatus || {}), groupOverrides: {} },
  route: S[id].routes ? S[id].routes[0].id : null, delta: null, disp: null, walk: null, sel: null, flagged: false, result: null, record: null, open: {} });
const walked = (sc, t) => { t.walk = F.buildWalk(sc, t); t.walk.running = false; t.walk.i = t.walk.pts.length - 1; return t; };
const close = (sc, t) => { t.result = F.grade(sc, t); t.record = F.finalized(t) ? F.buildRecord(sc, t) : null; return t; };

t('Elena: least privilege closes only after a walk; the onboarding template is out of scope', () => {
  const sc = S.elena, t = fresh('elena'); t.person.credential.groups = ['allStaff', 'education'];
  assert.equal(F.grade(sc, t).title, 'Not ready to close');
  close(sc, walked(sc, t)); assert.equal(t.result.cls, 'good'); assert.equal(t.record.title, 'Credential issued');
  assert.deepEqual(t.record.fields.map(f => f[0]), ['Groups', 'Opens', 'Hours', 'Authorization', 'Verified']);
  const u = fresh('elena'); u.person.credential.groups = ['allStaff', 'exhibitOps']; close(sc, walked(sc, u));
  assert.equal(u.result.title, 'Works, but outside the approved scope'); assert.equal(u.record, null, 'no record for a result that needs correction');
});
t('Cameron: the one-time exception closes; changing the whole group is too broad', () => {
  const sc = S.marcus, t = fresh('marcus'); t.person.credential.exceptions.push(E.clone(sc.person.authorizations[1].exception));
  close(sc, walked(sc, t)); assert.equal(t.result.cls, 'good'); assert.equal(t.record.status, 'Temporary access');
  const u = fresh('marcus'); u.world.groupOverrides.diveCrew = sc.groupScheduleEdit.to; close(sc, walked(sc, u)); assert.equal(u.result.title, 'Works, but too broad');
});
t('Jordyn: deactivation with the matching reason closes; removing groups alone is incomplete; no walk needed', () => {
  const sc = S.jordan, t = fresh('jordan'); t.person.credential.active = false; t.disp = 'ended'; close(sc, t);
  assert.equal(t.result.cls, 'good'); assert.equal(t.record.status, 'Deactivated');
  const u = fresh('jordan'); u.person.credential.groups = []; u.disp = 'ended'; assert.equal(F.grade(sc, u).title, 'Offboarding incomplete');
  const v = fresh('jordan'); assert.equal(F.grade(sc, v).title, 'Review incomplete');
});
t('Daniel: escort closes with the designated escort; waiting is a costed, finalized outcome; the dock walk stops', () => {
  const sc = S.daniel, t = fresh('daniel'); t.route = 'escortWest'; close(sc, walked(sc, t));
  assert.equal(t.result.cls, 'good'); assert(/ESC-07/.test(t.record.fields.find(f => f[0] === 'Escort')[1]));
  const w = fresh('daniel'); w.route = 'wait'; close(sc, w); assert(F.finalized(w) && w.result.cls === 'warnr' && w.record.title === 'Delivery delayed');
  const d = walked(sc, fresh('daniel')); assert.equal(d.walk.res.stop.code, 'HARDWARE_FAULT');
});
t('landmarks: audit and adapt tickets use their own step names', () => {
  assert.deepEqual(F.steps(S.jordan, fresh('jordan')).map(s => s[1]), ['Review', 'Investigate', 'Decide', 'Submit']);
  assert.deepEqual(F.steps(S.daniel, fresh('daniel')).map(s => s[1]), ['Review', 'Respond', 'Verify', 'Record']);
  assert.deepEqual(F.steps(S.elena, fresh('elena')).map(s => s[1]), ['Review', 'Configure', 'Verify', 'Close']);
});
t('names: Cameron Flynn and Jenni Nair appear in grading text, records and walks; the old names appear nowhere', () => {
  const c = fresh('marcus'); assert.equal(F.grade(S.marcus, c).text.includes('Walk Cameron in'), true);
  c.person.credential.exceptions.push(E.clone(S.marcus.person.authorizations[1].exception)); close(S.marcus, walked(S.marcus, c));
  assert.equal(c.record.person.name, 'Cameron Flynn'); assert.equal(c.record.person.initials, 'CF');
  const d = fresh('daniel'); d.route = 'escortWest'; close(S.daniel, walked(S.daniel, d));
  assert(/^Jenni Nair, Receiving supervisor · ESC-07$/.test(d.record.fields.find(f => f[0] === 'Escort')[1]));
  assert(d.walk.pts.some(p => p.who === 'Jenni')); assert(/Jenni's badge/.test(d.result.text));
  assert(!/Marcus|Priya/.test(JSON.stringify(S)), 'no old display name left in scenario data');
  assert.equal(S.marcus.person.id, 'marcus', 'stable internal key unchanged'); assert.equal(S.jordan.person.id, 'jordan');
});
t('status: new until real work; navigation-only fields never count; record reading, changes and walks do; close attempts and finals', () => {
  for (const id of Object.keys(S)) { const x = fresh(id); assert.equal(F.status(S[id], x), 'new', id); }
  const e = fresh('elena'); e.person.credential.groups = ['allStaff']; assert.equal(F.status(S.elena, e), 'progress', 'badge change');
  e.person.credential.groups = []; assert.equal(F.status(S.elena, e), 'new', 'undoing the change returns to new');
  const r = fresh('elena'); r.open['WA-1041'] = true; assert.equal(F.status(S.elena, r), 'progress', 'record read');
  r.open['WA-1041'] = false; assert.equal(F.status(S.elena, r), 'new', 'closing the record again leaves nothing done');
  const c = fresh('marcus'); c.world.groupOverrides.diveCrew = S.marcus.groupScheduleEdit.to; assert.equal(F.status(S.marcus, c), 'progress', 'group hours');
  const d = fresh('daniel'); d.route = 'wait'; assert.equal(F.status(S.daniel, d), 'progress', 'route choice');
  const j = fresh('jordan'); j.disp = 'ended'; assert.equal(F.status(S.jordan, j), 'progress', 'audit reason');
  const w = walked(S.elena, fresh('elena')); assert.equal(F.status(S.elena, w), 'progress', 'walk');
  const q = fresh('jordan'); q.result = F.grade(S.jordan, q); assert.equal(F.status(S.jordan, q), 'correction', 'early close');
  const g = fresh('jordan'); g.person.credential.active = false; g.disp = 'ended'; close(S.jordan, g); assert.equal(F.status(S.jordan, g), 'closed');
  const k = fresh('daniel'); k.route = 'wait'; close(S.daniel, k); assert.equal(F.status(S.daniel, k), 'closed', 'a costed final result is closed');
});
console.log(`\n${n} flow tests passed`);
