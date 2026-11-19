// Days-alive arithmetic.
//
// Journal entries are named after the day of the author's life on which they were
// written: 2005-08-12 is day 1. The site never trusts a hand-typed number - it
// derives the day from a real date, so a typo in a filename cannot skew the count.

// Born 12 August 2005. Day 1 is the birth date itself.
const BIRTH = Date.UTC(2005, 7, 12);
const DAY_MS = 24 * 60 * 60 * 1000;

function dayOfLife(year, month, day) {
  // month is 1-12 here; Date.UTC wants 0-11.
  return Math.floor((Date.UTC(year, month - 1, day) - BIRTH) / DAY_MS) + 1;
}

function dateToDay(date) {
  return dayOfLife(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function dayToDate(day) {
  return new Date(BIRTH + (day - 1) * DAY_MS);
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// Reads a day-of-life number out of a filename written in any of the shapes a
// human might use: 7768.md, "day 7768.md", "7768 - title.md".
function dayFromName(fileName) {
  const base = fileName.replace(/\.md$/i, '');
  const explicit = base.match(/(\d{1,6})/);
  if (explicit) return Number(explicit[1]);
  // A full date in the name: 2026-11-17, 17-11-2026, or November 17 2026.
  const iso = base.match(/(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})/);
  if (iso) return dayOfLife(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = base.match(/(\d{1,2})[-_.](\d{1,2})[-_.](\d{4})/);
  if (dmy) return dayOfLife(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  const lower = base.toLowerCase();
  const monthIndex = MONTHS.findIndex((name) => lower.includes(name) || lower.includes(name.slice(0, 3)));
  if (monthIndex !== -1) {
    const dayMatch = lower.match(/\b(\d{1,2})\b/);
    const yearMatch = lower.match(/\b(20\d{2})\b/);
    if (dayMatch && yearMatch) return dayOfLife(Number(yearMatch[1]), monthIndex + 1, Number(dayMatch[1]));
  }
  return null;
}

module.exports = { BIRTH, dayOfLife, dateToDay, dayToDate, dayFromName };
