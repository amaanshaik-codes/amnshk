#!/usr/bin/env node
// Records a visit from a given address, for testing the counter from the command
// line without a browser.
//
//   node scripts/record-visit.js 203.0.113.9
//
// On a deployed site this is done by the function itself; the same address is
// only ever counted once. Requires KV_REST_API_URL and KV_REST_API_TOKEN, which
// `vercel env pull .env.local` provides.

const { hasStore, recordVisit } = require('../lib/visits');

const ip = process.argv[2] || 'local';

async function main() {
  if (!hasStore()) {
    console.error('No Redis configured. Run `vercel env pull .env.local` first.');
    process.exit(1);
  }
  try {
    const total = await recordVisit(ip);
    console.log(`visit from ${ip}: total ${total}`);
  } catch (error) {
    console.error(`visit from ${ip} failed:`, error.message);
    process.exit(1);
  }
}

main();
