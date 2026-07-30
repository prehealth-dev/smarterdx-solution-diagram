// Inlines ./assets/* into diagram.template.js -> diagram.js (self-contained module).
// Run: node build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(dir, 'assets');
const assets = {};

for (const f of readdirSync(assetsDir)) {
  const ext = extname(f).toLowerCase();
  const key = basename(f, ext);
  if (ext === '.svg') {
    const svg = readFileSync(join(assetsDir, f), 'utf8')
      .replace(/\s+/g, ' ').replace(/> </g, '><').trim();
    assets[key] = 'data:image/svg+xml,' + encodeURIComponent(svg)
      .replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%3A/g, ':')
      .replace(/%2F/g, '/').replace(/%22/g, "'");
  } else if (ext === '.png') {
    assets[key] = 'data:image/png;base64,' + readFileSync(join(assetsDir, f)).toString('base64');
  }
}

const tpl = readFileSync(join(dir, 'diagram.template.js'), 'utf8');
const out = tpl.replace('/*@ASSETS@*/ {}', JSON.stringify(assets));
writeFileSync(join(dir, 'diagram.js'), out);
console.log(`diagram.js written (${(out.length / 1024).toFixed(1)} KB, ${Object.keys(assets).length} assets inlined)`);
