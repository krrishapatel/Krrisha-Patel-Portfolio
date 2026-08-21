// Every image path the source asks for must exist in public/.
//
// This exists because the images were served as <picture> with a WebP source and
// a multi-megabyte JPEG fallback. Deleting the fallbacks is only safe if nothing
// still points at them, and a missing src is invisible in a build: Next compiles
// fine and the browser just shows a broken tile.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC_DIR = join(ROOT, 'public');
// app/app is the App Router directory: Vercel builds with app/ as the project
// root. Only what's under here ships, which is why the scan stops at it. The
// files directly under app/ are blog-starter leftovers outside the route tree,
// and one of them asks for a /favicon.ico that has never existed.
const SOURCE_DIRS = ['app/app'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.mdx'];
const ASSET_PATTERN = /['"`]\/([\w./-]+\.(?:webp|png|jpe?g|svg|gif|ico|avif))['"`]/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(path);
  }
  return out;
}

const available = new Set(readdirSync(PUBLIC_DIR));
const missing = [];
const referenced = new Set();

for (const dir of SOURCE_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const source = readFileSync(file, 'utf8');
    for (const [, asset] of source.matchAll(ASSET_PATTERN)) {
      referenced.add(asset);
      // Template literals like `/${file}.webp` don't produce a literal path, so
      // only the fully written ones are checked. The art tiles are covered by
      // the ARTWORKS check below.
      if (!available.has(asset)) missing.push(`${relative(ROOT, file)} -> /${asset}`);
    }
  }
}

// The four art tiles are built from a filename list, so their paths never appear
// as literals. Read the list and check the files it implies.
const portfolio = readFileSync(join(ROOT, 'app/app/Portfolio.tsx'), 'utf8');
const artworkBlock = portfolio.match(/const ARTWORKS = \[([\s\S]*?)\] as const;/);
if (!artworkBlock) {
  console.error('could not find the ARTWORKS list in app/app/Portfolio.tsx');
  process.exit(1);
}
for (const [, name] of artworkBlock[1].matchAll(/file: '([\w-]+)'/g)) {
  referenced.add(`${name}.webp`);
  if (!available.has(`${name}.webp`)) missing.push(`ARTWORKS -> /${name}.webp`);
}

if (missing.length) {
  console.error('missing files in public/:');
  for (const line of missing) console.error(`  ${line}`);
  process.exit(1);
}

const unused = [...available].filter((f) => !referenced.has(f) && !f.startsWith('.'));
console.log(`${referenced.size} referenced asset(s), all present in public/`);
if (unused.length) {
  // A warning, not a failure: favicons and similar are fetched by convention
  // rather than by a path written in the source.
  console.log(`not referenced by any source file: ${unused.join(', ')}`);
}
