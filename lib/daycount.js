// Days-alive arithmetic.
//
// Journal entries are named after the day of the author's life on which they were
// written: 2005-08-12 is day 1. The site never trusts a hand-typed number - it
// derives the day from a real date, so a typo in a filename cannot skew the count.

// Born 12 August 2005. Day 1 is the birth date itself.
const BIRTH = Date.UTC(2005, 7, 12);
const DAY_MS = 24 * 60 * 60 * 1000;

// Five digits is the cap: a human life is about 25,915 days, so the number never
// needs more. Days are zero-padded to that width, so day 7768 is shown 07768 and
// the label stays one character wide until the count reaches 10000.
const DAY_DIGITS = 5;

// Display form of a day number: 7768 -> "07768".
function formatDay(day) {
  return String(day).padStart(DAY_DIGITS, '0');
}

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
// human might use: 7745.md, 17-11-2026.md, 2026-11-17.md, "November 17 2026.md".
// Full dates are checked FIRST - otherwise "19-11-2026" would be read as day 19.
function dayFromName(fileName) {
  const base = fileName.replace(/\.md$/i, '');

  // YYYY-MM-DD (also YYYY_MM_DD, YYYY.MM.DD)
  const iso = base.match(/(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})/);
  if (iso) return dayOfLife(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // DD-MM-YYYY (also DD_MM_YYYY, DD.MM.YYYY) - the Obsidian naming convention.
  const dmy = base.match(/(\d{1,2})[-_.](\d{1,2})[-_.](\d{4})/);
  if (dmy) return dayOfLife(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  // "November 17 2026" or "17 November 2026"
  const lower = base.toLowerCase();
  const monthIndex = MONTHS.findIndex((name) => lower.includes(name) || lower.includes(name.slice(0, 3)));
  if (monthIndex !== -1) {
    const dayMatch = lower.match(/\b(\d{1,2})\b/);
    const yearMatch = lower.match(/\b(20\d{2})\b/);
    if (dayMatch && yearMatch) return dayOfLife(Number(yearMatch[1]), monthIndex + 1, Number(dayMatch[1]));
  }

  // A bare day-of-life number, optionally surrounded by words: "7745", "day 7745".
  const explicit = base.match(/(?<!\d)(\d{1,5})(?!\d)/);
  if (explicit) return Number(explicit[1]);
  return null;
}

// Validates a Y/M/D triple that came from a filename.
function isValidDate(year, month, day) {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2005;
}

module.exports = { BIRTH, dayOfLife, dateToDay, dayToDate, dayFromName, isValidDate, formatDay, DAY_DIGITS };
