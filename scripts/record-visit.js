#!/usr/bin/env node
// Adds one to the visitor total in .visits.json.
//
// This is the only place the count is incremented. It runs where a filesystem is
// writable - locally, or in a CI job that commits the result - because Vercel
// functions cannot write to their own filesystem.
//
//   node scripts/record-visit.js
//
// Every call counts one more. Nothing about the visitor is read or stored.

const { countVisit } = require('../api/visitors');

console.log(`counted a visit: total ${countVisit()}`);
