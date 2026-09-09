import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const entries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../sources/content' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    country: z.string(),
    city: z.string().optional(),
    type: z.enum(['note', 'stay', 'eat', 'work']).default('note'),
    lang: z.enum(['tr', 'en']).default('tr'),
    status: z.enum(['draft', 'published']).default('draft'),
    summary: z.string().optional(),
  }),
});

export const collections = { entries };
