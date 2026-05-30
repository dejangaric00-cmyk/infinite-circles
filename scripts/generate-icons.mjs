#!/usr/bin/env node
// Run once from the project root:
//   node scripts/generate-icons.mjs
//
// Requires: npm install -D sharp  (or: npx sharp-cli)

import { createWriteStream } from 'fs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Try sharp (most common in Astro projects)
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('sharp not found. Run: npm install -D sharp');
  process.exit(1);
}

const svgBuffer = readFileSync(join(publicDir, 'favicon.svg'));

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png',         size: 192 },
  { name: 'icon-512.png',         size: 512 },
];

for (const { name, size } of sizes) {
  const out = join(publicDir, name);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(out);
  console.log(`✓ public/${name} (${size}x${size})`);
}

console.log('\nDone! Now add to BaseLayout.astro <head>:');
console.log(`  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />`);
console.log(`  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />`);
console.log(`  <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />`);
