#!/usr/bin/env node
// Records one unique visitor and writes .visits.json.
//
// This is the only place the count is incremented. It runs where a filesystem is
// writable - locally, or in a CI job that commits the result - because Vercel
// functions cannot write to their own filesystem.
//
//   node scripts/record-visit.js [ip]
//
// With no IP it uses the value in CI_IP or falls back to "local", which is enough
// for a local preview. A repeat visit from the same IP on the same day does not
// increment; the set of hashes resets when the date changes.

const fs = require('fs');
const path = require('path');
const { hashIp, todayKey, STATE_FILE } = require('../api/visitors');

const ip = process.argv[2] || process.env.CI_IP || 'local';
function readState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return {
      day: typeof parsed.day === 'string' ? parsed.day : todayKey(),
      total: Number(parsed.total) || 0,
      seen: Array.isArray(parsed.seen) ? parsed.seen : []
    };
  } catch {
    return { day: todayKey(), total: 0, seen: [] };
  }
}

const state = readState();
const day = todayKey();

// A new day clears the presence set but keeps the running total.
if (state.day !== day) {
  state.day = day;
  state.seen = [];
}

const hash = hashIp(ip);
if (state.seen.includes(hash)) {
  console.log(`visit already counted today (total ${state.total})`);
  process.exit(0);
}

state.seen.push(hash);
state.total += 1;
fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));
console.log(`counted a new visitor: total ${state.total}`);
