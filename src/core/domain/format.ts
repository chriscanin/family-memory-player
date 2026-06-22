/**
 * Pure formatting helpers shared across every surface.
 * Kept dependency-free (no Intl/timezone surprises) and unit-tested.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Formats seconds as `m:ss` — 15.6 -> "0:15", 90 -> "1:30". */
export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Formats an ISO `YYYY-MM-DD` as "August 2008". Falls back to the raw input. */
export function formatRecordedDate(iso: string): string {
  const [year, month] = iso.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return iso;
  return `${MONTHS[month - 1]} ${year}`;
}

/** Extracts the year from an ISO date, or null if unparseable. */
export function yearOf(iso: string): number | null {
  const year = Number(iso.split('-')[0]);
  return Number.isFinite(year) ? year : null;
}
