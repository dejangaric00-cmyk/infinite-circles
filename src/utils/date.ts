/**
 * Relative German date labels — shared between build time and client.
 *
 * Why both: the site is statically generated, so a label rendered at build time
 * freezes at the moment of the last deploy. The build output is the SEO/no-JS
 * fallback; the client script in BaseLayout re-renders every [data-rel-date]
 * element on load so the label is correct for the actual visitor.
 *
 * Elements opt in via a data attribute:
 *   <span data-rel-date="2026-05-29">vor 2 Monaten</span>
 */

/** Whole days between an ISO date (YYYY-MM-DD) and `now`, calendar-day based. */
export function daysSince(isoDate: string, now: Date = new Date()): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  const then = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - then) / 86_400_000);
}

/** "heute" · "gestern" · "vor 3 Tagen" · "vor 2 Monaten" … */
export function relativeDayLabel(isoDate: string, now: Date = new Date()): string {
  const days = daysSince(isoDate, now);
  if (Number.isNaN(days)) return isoDate;
  if (days < 0) return 'demnächst';
  if (days === 0) return 'heute';
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 14) return 'vor einer Woche';
  if (days < 31) return `vor ${Math.floor(days / 7)} Wochen`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months <= 1 ? 'vor einem Monat' : `vor ${months} Monaten`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? 'vor einem Jahr' : `vor ${years} Jahren`;
}
