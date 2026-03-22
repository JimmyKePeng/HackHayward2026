/** Pacific time (handles PST / PDT automatically). */
const PACIFIC = "America/Los_Angeles";

/**
 * Format an ISO-8601 (or parseable) instant as YYYY-MM-DD in Pacific time.
 * Returns the original string if it doesn’t look like a date.
 * @param {string} [value]
 * @returns {string}
 */
export function formatDatePST(value) {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s || s === "—") return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
