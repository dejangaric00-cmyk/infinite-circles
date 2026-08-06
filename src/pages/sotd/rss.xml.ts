import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getSortedSotd } from '../../utils/sotd';

export async function GET(context: APIContext) {
  // Shared util — same sort order as every other page.
  const sorted = await getSortedSotd();

  return rss({
    title: 'Song of the Day — Infinite Circles',
    description: 'Jeden Tag ein Song. House, Techno, Ambient und mehr.',
    site: context.site ?? 'https://infinite-circles.de',
    items: sorted.map(entry => ({
      title: `${entry.data.title} — ${entry.data.artist}`,
      // Explicit midnight UTC to avoid timezone off-by-one
      pubDate: new Date(entry.data.date + 'T00:00:00Z'),
      description: [
        entry.data.note,
        entry.data.album && `Album: ${entry.data.album}`,
        entry.data.label && `Label: ${entry.data.label}`,
        entry.data.year  && `Jahr: ${entry.data.year}`,
        entry.data.mood  && `Mood: ${entry.data.mood}`,
      ].filter(Boolean).join(' · ') || `${entry.data.title} von ${entry.data.artist}`,
      link: `/sotd/${entry.id}`,
    })),
    customData: `<language>de-de</language>`,
  });
}
