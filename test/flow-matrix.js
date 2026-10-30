// Ticket states for the behaviour lock: every combination of the editable groups, plus each scenario's other
// controls (exception, group hours, route, deactivation, reason), walked or not. `impl` supplies the workflow
// functions under test, so the same matrix runs against the original UI code and against src/flow.js.
const E = require('../src/engine.js'), S = require('../src/scenarios.js');
const hash = o => require('crypto').createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);
const subsets = a => a.reduce((acc, x) => acc.concat(acc.map(s => [...s, x])), [[]]);
const fresh = id => { const sc = S[id]; return { person: E.clone(sc.person), world: { day: sc.day, date: sc.date, doorStatus: E.clone(sc.doorStatus || {}), groupOverrides: {} },
  route: sc.routes ? sc.routes[0].id : null, prev: null, delta: null, tdelta: null, tscope: '', disp: null, showDelta: true, walk: null, sel: null, flagged: false, result: null, record: null, open: {} }; };

function cases() {
  const out = [];
  for (const id of Object.keys(S)) {
    const sc = S[id], ex = sc.person.authorizations.filter(a => a.exception);
    for (const groups of subsets(sc.editable)) for (const exc of ex.length ? [false, true] : [false]) for (const ov of sc.groupScheduleEdit ? [false, true] : [false])
    for (const route of sc.routes ? sc.routes.map(r => r.id) : [null]) for (const active of sc.revoke ? [true, false] : [true])
    for (const disp of sc.disposition ? [null, ...sc.disposition.options.map(o => o.id)] : [null]) for (const walk of ['none', 'done', 'running'])
      out.push({ id, groups, exc, ov, route, active, disp, walk });
    // progress-only variants (inspection and record reading feed the workflow landmarks)
    out.push({ id, groups: [], walk: 'none', sel: true }, { id, groups: [], walk: 'none', open: true }, { id, groups: sc.editable.slice(0, 1), walk: 'done', flagged: true });
    // escort without a current designation (the scenario always has one, so remove it for these cases)
    if (sc.escort) for (const walk of ['none', 'done']) out.push({ id, groups: [], route: sc.routes.find(r => r.as === 'escort').id, walk, noDesignation: true });
  }
  return out;
}

function run(impl, c) {
  const sc = S[c.id], saved = sc.escort && E.clone(sc.escort.authorizations);
  if (c.noDesignation) sc.escort.authorizations = [];
  try { return runCase(impl, c, sc); } finally { if (saved) sc.escort.authorizations = saved; }
}
function runCase(impl, c, sc) {
  const t = fresh(c.id), cr = t.person.credential, before = E.footprint(t.world, t.person);
  cr.groups = [...c.groups];
  if (c.exc) for (const a of t.person.authorizations.filter(a => a.exception)) cr.exceptions.push(E.clone(a.exception));
  if (c.ov) t.world.groupOverrides[sc.groupScheduleEdit.group] = sc.groupScheduleEdit.to;
  if (c.route) t.route = c.route;
  if (c.active === false) cr.active = false;
  if (c.disp) t.disp = c.disp;
  if (c.flagged) t.flagged = true;
  if (c.sel) t.sel = { door: sc.person.authorizations[0].doors[0] };
  if (c.open) t.open[sc.person.authorizations[0].id] = true;
  const changed = JSON.stringify(cr) !== JSON.stringify(S[c.id].person.credential) || c.ov;
  if (changed) t.delta = E.delta(before, E.footprint(t.world, t.person));
  let walk = null;
  if (c.walk !== 'none') { t.walk = impl.buildWalk(sc, t); walk = hash(t.walk);
    if (c.walk === 'done') { t.walk.running = false; t.walk.i = t.walk.pts.length - 1; } }
  const out = { case: c, walk, verifiedBefore: impl.verified(sc, t), stepsBefore: impl.steps(sc, t) };
  t.result = impl.grade(sc, t); out.grade = t.result;
  out.finalized = impl.finalized(t);
  t.record = out.finalized ? impl.buildRecord(sc, t) : null; out.record = t.record;
  out.stepsAfter = impl.steps(sc, t);
  out.route = hash(impl.routeOf(sc, t)); out.actor = hash(impl.actorOf(sc, t));
  return JSON.parse(JSON.stringify(out));
}
module.exports = { cases, run };
