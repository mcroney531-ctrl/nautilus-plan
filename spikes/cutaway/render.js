// Rasterise the spike's base images (blockout per level, treated L1) at 4x for both variants: PNG, then WebP via Pillow.
const { baseSVG } = require('./base.js'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright'), OUT = path.join(__dirname, 'out');
(async () => { fs.mkdirSync(OUT, { recursive: true }); const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1600, height: 1400 } });
  for (const v of ['A', 'B', 'C']) for (const [l, tr] of [[1, false], [1, true], [2, false]]) {
    const name = `${v}-L${l}${tr ? '-treated' : ''}`, svg = baseSVG(l, v, tr).replace(/width="400" height="(\d+)"/, (m, h) => `width="1600" height="${h * 4}"`);
    await pg.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`); await pg.locator('svg').screenshot({ path: path.join(OUT, name + '.png') });
    execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],quality=76,method=6)', path.join(OUT, name + '.png'), path.join(OUT, name + '.webp')]); }
  await b.close(); for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('.webp'))) console.log(f, fs.statSync(path.join(OUT, f)).size); })();
