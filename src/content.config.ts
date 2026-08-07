import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    draft: z.boolean().optional().default(false),
  }),
});

const sotd = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sotd' }),
  schema: z.object({
    // Kept as string for compatibility with existing .md files (YYYY-MM-DD).
    // Sorting is done via localeCompare — format must stay YYYY-MM-DD.
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    title: z.string(),
    artist: z.string(),
    album: z.string().optional(),
    link: z.string().url().optional(),
    // mood und tags speisen die Filterleisten auf /sotd. Die Filter vergleichen
    // exakt, deshalb sind "Ambient" und "ambient" dort zwei getrennte Knöpfe —
    // genau das war der Zustand bis 2026-08-07. Kleinschreibung erzwingen wir
    // jetzt beim Einlesen, damit ein großgeschriebener Eintrag die Leiste nicht
    // erneut aufspaltet. Anzeige-Großschreibung gehört ins CSS, nicht in die Daten.
    mood: z.string().toLowerCase().optional(),
    year: z.number().optional(),
    label: z.string().optional(),
    note: z.string().optional(),
    tags: z.array(z.string().toLowerCase()).optional(),
    // Same escape hatch as the journal collection: keep an entry in the repo
    // without publishing it. Filtered out centrally in utils/sotd.ts.
    draft: z.boolean().optional().default(false),
  }),
});

// writing collection intentionally removed — add back when src/content/writing/ exists.

export const collections = { journal, sotd };
