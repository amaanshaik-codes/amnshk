#!/usr/bin/env node
// Renames journal entries so every filename is the day-of-life number for the
// date it was written. Safe to re-run: already-correct names are left alone.
//
//   node scripts/renumber-journal.js          # dry run, prints what it would do
//   node scripts/renumber-journal.js --write  # actually rename
//
// A file whose name is already a bare number is treated as authoritative, because
// it carries no other date to check it against. Files named with a real date
// (2026-11-17.md, "November 17 2026.md") are converted to that date's day number.
// Use --check to list every entry with the calendar date its number implies.

const fs = require('fs');
const path = require('path');
const { dayFromName, dayToDate, formatDay } = require('../lib/daycount');

const journalDir = path.join(__dirname, '..', 'Content', 'Journal Entries');
const args = process.argv.slice(2);
const write = args.includes('--write');
const check = args.includes('--check');

if (!fs.existsSync(journalDir)) {
  console.error(`No journal folder at ${journalDir}`);
  process.exit(1);
}

const files = fs.readdirSync(journalDir).filter((name) => name.toLowerCase().endsWith('.md') && name.toLowerCase() !== 'index.md');
const plan = [];

for (const name of files) {
  const day = dayFromName(name);
  if (day === null) {
    console.warn(`skip  ${name}  (no date or number found)`);
    continue;
  }
  const date = dayToDate(day);
  const iso = date.toISOString().slice(0, 10);
  const weekday = date.toUTCString().slice(0, 3);
  const base = name.replace(/\.md$/i, '');
  const alreadyNumeric = /^\d+$/.test(base);
  const target = `${formatDay(day)}.md`;

  if (alreadyNumeric && base === formatDay(day)) {
    if (check) console.log(`ok    ${name.padEnd(28)} day ${day} = ${iso} (${weekday})`);
    continue;
  }
  plan.push({ from: name, to: target, day, iso, weekday });
}

if (check) {
  console.log(`\n${files.length} entries checked against birth date 2005-08-12.`);
  process.exit(0);
}

if (!plan.length) {
  console.log('Nothing to rename; every filename already matches its date.');
  process.exit(0);
}

for (const item of plan) {
  const from = path.join(journalDir, item.from);
  const to = path.join(journalDir, item.to);
  if (fs.existsSync(to)) {
    console.error(`conflict: ${item.to} already exists, refusing to overwrite ${item.from}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`${write ? 'rename' : 'would rename'}  ${item.from}  ->  ${item.to}   (day ${item.day} = ${item.iso} ${item.weekday})`);
  if (write) fs.renameSync(from, to);
}

if (!write && !check) {
  console.log('Dry run - nothing is renamed');
}
