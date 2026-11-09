// V2 stylesheet rules: every class is nx-prefixed (no collisions like the V1 ".pad" regression), and every token
// colour pair used for text or controls meets WCAG 2.2 contrast (4.5:1 text, 3:1 large text, icons and boundaries).
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '../src/v2', f), 'utf8');
const css = read('styles.css'), html = read('shell.html'), js = read('app.js') + read('map.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('every class selector in styles.css is nx-prefixed', () => {
  const sel = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, '').replace(/\{[^{}]*\}/g, '{}');
  const bad = [...new Set([...sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]).filter(c => !c.startsWith('nx-')))];
  assert.deepEqual(bad, []);
});
t('every class used in shell.html, app.js and map.js markup is nx-prefixed', () => {
  const used = [...(html + js).matchAll(/class="([^"$]*)"/g)].flatMap(m => m[1].split(/\s+/)).filter(Boolean);
  const viaJs = [...js.matchAll(/className='([^']*)'/g)].map(m => m[1]);
  const bad = [...new Set([...used, ...viaJs].filter(c => !c.startsWith('nx-')))];
  assert.deepEqual(bad, []);
});

const tok = Object.fromEntries([...css.match(/:root\{([\s\S]*?)\}/)[1].matchAll(/--nx-([\w-]+):(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2]]));
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(tok[a]), lum(tok[b])].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const TEXT = [['ink', 'surface'], ['muted', 'surface'], ['ink', 'pale'], ['muted', 'pale'], ['muted', 'page'], ['on-navy', 'navy-900'], ['on-navy-muted', 'navy-900'],
  ['on-navy', 'navy-800'], ['on-navy-muted', 'navy-800'], ['on-navy', 'navy-700'], ['on-navy', 'navy-600'], ['on-navy-muted', 'navy-600'], ['on-silver', 'silver'], ['on-navy', 'navy-800']];
const NONTEXT = [['control-line', 'surface'], ['focus-light', 'surface'], ['focus-light', 'pale'], ['focus-dark', 'navy-800'], ['focus-dark', 'navy-900'], ['focus-dark', 'navy-600'],
  ['silver', 'navy-700'], ['silver', 'navy-800'], ['done', 'navy-700'], ['silver', 'navy-900'], ['navy-800', 'surface']];
t(`text pairs meet 4.5:1 (${TEXT.length} pairs)`, () => { const bad = TEXT.filter(([a, b]) => ratio(a, b) < 4.5).map(([a, b]) => `${a} on ${b}: ${ratio(a, b).toFixed(2)}`); assert.deepEqual(bad, []); });
t(`control boundaries, focus rings, selected state and icons meet 3:1 (${NONTEXT.length} pairs)`, () => { const bad = NONTEXT.filter(([a, b]) => ratio(a, b) < 3).map(([a, b]) => `${a} vs ${b}: ${ratio(a, b).toFixed(2)}`); assert.deepEqual(bad, []); });
console.log(`\n${n} V2 CSS tests passed`);
