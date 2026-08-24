#!/usr/bin/env node
import { createInterface } from 'readline';
import fs from 'fs';
import path from 'path';

const rl = createInterface({ input: process.stdin, output: process.stdout });

const ask = (q) => new Promise(resolve => rl.question(q, resolve));

const pad = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

console.log('\n✦ Song of the Day\n');

const date    = (await ask(`Datum      [${today()}]: `)).trim() || today();
const title   = (await ask('Song       : ')).trim();
const artist  = (await ask('Artist     : ')).trim();
const album   = (await ask('Album      [optional]: ')).trim();
const label   = (await ask('Label      [optional]: ')).trim();
const yearRaw = (await ask('Jahr       [optional]: ')).trim();
const link    = (await ask('YouTube    [optional]: ')).trim();
const mood    = (await ask('Mood       [optional]: ')).trim();
const tagsRaw = (await ask('Tags       [komma-getrennt, optional]: ')).trim();
const note    = (await ask('Notiz      [optional]: ')).trim();

rl.close();

if (!title || !artist) {
  console.error('\n✗ Song und Artist sind Pflichtfelder.\n');
  process.exit(1);
}

// Das Schema prüft die Form per Regex und sortiert per localeCompare. Ein
// Tippfehler im Datum fiele sonst erst beim Bauen auf.
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`\n✗ Datum muss YYYY-MM-DD sein, war: ${date}\n`);
  process.exit(1);
}

const year = yearRaw ? Number(yearRaw) : null;
if (yearRaw && !Number.isInteger(year)) {
  console.error(`\n✗ Jahr muss eine Zahl sein, war: ${yearRaw}\n`);
  process.exit(1);
}

// mood und tags speisen die Filterleiste auf /sotd, die exakt vergleicht.
// Das Schema erzwingt Kleinschreibung beim Einlesen — hier steht sie schon in
// der Datei, damit Datei und Anzeige nicht auseinanderlaufen.
const tags = tagsRaw
  ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
  : [];

const lines = ['---'];
lines.push(`date: "${date}"`);
lines.push(`title: "${title.replace(/"/g, '\\"')}"`);
lines.push(`artist: "${artist.replace(/"/g, '\\"')}"`);
if (album)       lines.push(`album: "${album.replace(/"/g, '\\"')}"`);
if (label)       lines.push(`label: "${label.replace(/"/g, '\\"')}"`);
if (year)        lines.push(`year: ${year}`);
if (link)        lines.push(`link: "${link}"`);
if (mood)        lines.push(`mood: "${mood.toLowerCase()}"`);
if (tags.length) lines.push(`tags: [${tags.map(t => `"${t}"`).join(', ')}]`);
if (note)        lines.push(`note: "${note.replace(/"/g, '\\"')}"`);
lines.push('---');
lines.push('');

const dir  = path.resolve('src/content/sotd');
const file = path.join(dir, `${date}.md`);

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

if (fs.existsSync(file)) {
  console.error(`\n✗ Datei existiert bereits: ${file}\n`);
  process.exit(1);
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log(`\n✓ Angelegt: ${file}\n`);