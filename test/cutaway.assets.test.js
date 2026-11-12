// Cutaway map assets: the geometry the art was drawn to, and the files derived from the masters. Node only (runs in `npm test`).
// The byte-for-byte re-derivation and the structure checks need Python and Playwright: `npm run test:cutaway`.
const assert = require('assert'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), rec = JSON.parse(fs.readFileSync(path.join(root, 'assets/v2/cutaway/assets.json'), 'utf8'));
const E = require('../src/engine.js'), { geom } = require('../spikes/cutaway/base.js');
const sha = b => crypto.createHash('sha256').update(b).digest('hex'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const geometry = () => { const g = geom('C'); return { projection: { variant: 'C', k: g.k, off: g.off, W: g.W, H: g.H, hI: g.hI, hE: g.hE, hF: g.hF, sh: g.sh },
  spaces: Object.fromEntries(Object.entries(E.SPACES).map(([k, s]) => [k, { l: s.l, r: s.r, kind: s.kind, ellipse: s.ellipse || null }])),
  doors: Object.fromEntries(Object.entries(E.DOORS).map(([k, d]) => [k, { from: d.from, into: d.into, p: d.p }])), links: E.LINKS, voids: E.VOIDS.map(v => v.r) }; };
t('the engine geometry and projection still match the hash the art was approved against', () => {
  assert.strictEqual(sha(canon(geometry())), rec.geometry_sha256, 'geometry changed: re-check the art (tools/cutaway_assets.py --check --structure), then re-derive'); });
t('the hash notices a moved door, a resized room and a changed projection', () => { const base = sha(canon(geometry()));
  for (const mut of [g => { g.doors['D-QUAR'].p = [97, 78]; }, g => { g.spaces.jelly.r = [[290, 44, 56, 75]]; }, g => { g.projection.k = 0.69; }, g => { g.voids[0] = [98, 202, 90, 51]; }, g => { g.links.push(['kelp', 'touch', [143, 111]]); }]) {
    const g = JSON.parse(JSON.stringify(geometry())); mut(g); assert.notStrictEqual(sha(canon(g)), base); } });
t('each stored asset and its master match the recorded SHA-256', () => { for (const [lv, r] of Object.entries(rec.levels)) {
  assert.strictEqual(sha(fs.readFileSync(path.join(root, r.asset))), r.asset_sha256, lv + ' asset'); assert.strictEqual(sha(fs.readFileSync(path.join(root, r.master))), r.master_sha256, lv + ' master'); } });
t('the masters are the locked ones and the encoder settings are recorded', () => { assert(/master-L1-v11\.png$/.test(rec.levels.L1.master)); assert(/master-L2-v4\.png$/.test(rec.levels.L2.master));
  assert.deepStrictEqual(rec.encoder, { format: 'WEBP', quality: 82, method: 6 }); assert(rec.tools.pillow && rec.tools.libwebp); });
console.log(`\n${n} cutaway asset tests passed`);
