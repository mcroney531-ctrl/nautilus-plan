// Loads the ORIGINAL workflow functions, unmodified, from a pre-extraction src/ui.html (by git revision) and
// adapts their SC()/T() globals to (sc, t) so the behaviour-lock matrix can run against them.
const vm = require('vm'), { execSync } = require('child_process'), E = require('../src/engine.js'), S = require('../src/scenarios.js');
function grab(src, name) {
  const m = src.match(new RegExp(`^(function ${name}\\(|const ${name}=)`, 'm')); if (!m) throw new Error('not found: ' + name);
  const i = m.index; if (m[1].startsWith('const')) return src.slice(i, src.indexOf('\n', i));
  let d = 0, j = src.indexOf('{', src.indexOf(')', i));
  for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; }
  return src.slice(i, j + 1);
}
module.exports = rev => {
  const src = execSync(`git show ${rev}:src/ui.html`, { cwd: __dirname + '/..' }).toString();
  const names = ['routeOf', 'actorOf', 'center', 'outP', 'finalized', 'verified', 'steps', 'buildWalk', 'grade', 'buildRecord'];
  const ctx = vm.createContext({ E, S, st: {}, cur: null });
  vm.runInContext('const SC=()=>S[cur],T=()=>st[cur];\n' + names.map(n => grab(src, n)).join('\n') +
    `\nthis.fns={routeOf,actorOf,finalized,verified,steps,buildWalk,grade,buildRecord};`, ctx);
  const use = (sc, t) => { const id = Object.keys(S).find(k => S[k] === sc); ctx.cur = id; ctx.st[id] = t; };
  const f = ctx.fns;
  return { routeOf: (sc, t) => (use(sc, t), f.routeOf(t)), actorOf: (sc, t) => (use(sc, t), f.actorOf(t)), finalized: t => f.finalized(t),
    verified: (sc, t) => (use(sc, t), f.verified(t)), steps: (sc, t) => (use(sc, t), f.steps(sc, t)), buildWalk: (sc, t) => (use(sc, t), f.buildWalk()),
    grade: (sc, t) => (use(sc, t), f.grade()), buildRecord: (sc, t) => (use(sc, t), f.buildRecord(sc, t)) };
};
