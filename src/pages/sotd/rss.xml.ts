import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const entries = await getCollection('sotd');
  const sorted = entries.sort((a, b) => b.data.date.localeCompare(a.data.date));

  return rss({
    title: 'Song of the Day — Infinite Circles',
    description: 'One song, every day. House, Techno, Ambient and more.',
    site: context.site ?? 'https://infinite-circles.de',
    items: sorted.map(entry => ({
      title: `${entry.data.title} — ${entry.data.artist}`,
      pubDate: new Date(entry.data.date),
      description: [
        entry.data.note,
        entry.data.album && `Album: ${entry.data.album}`,
        entry.data.label && `Label: ${entry.data.label}`,
        entry.data.year  && `Year: ${entry.data.year}`,
        entry.data.mood  && `Mood: ${entry.data.mood}`,
      ].filter(Boolean).join(' · ') || `${entry.data.title} by ${entry.data.artist}`,
      link: `/sotd/${entry.id}`,
    })),
    customData: `<language>de-de</language>`,
  });
}
