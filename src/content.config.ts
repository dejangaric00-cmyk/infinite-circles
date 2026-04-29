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
    date: z.string(),
    title: z.string(),
    artist: z.string(),
    album: z.string().optional(),
    link: z.string().url().optional(),
    mood: z.string().optional(),
    note: z.string().optional(),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { journal, sotd, writing };