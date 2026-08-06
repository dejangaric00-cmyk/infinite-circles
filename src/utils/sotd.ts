import { getCollection } from 'astro:content';

/**
 * Returns all SOTD entries sorted by date descending (newest first).
 * Single source of truth — avoids repeated getCollection + sort across pages.
 */
export async function getSortedSotd() {
  const entries = await getCollection('sotd', ({ data }) => !data.draft);
  return entries.sort((a, b) => b.data.date.localeCompare(a.data.date));
}

/**
 * Returns the latest SOTD entry.
 */
export async function getLatestSotd() {
  const sorted = await getSortedSotd();
  return sorted[0] ?? null;
}
