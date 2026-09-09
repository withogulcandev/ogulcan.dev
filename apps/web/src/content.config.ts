import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const entries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/entries' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    country: z.string(),
    city: z.string().optional(),
    type: z.enum(['note', 'stay', 'eat', 'work']).default('note'),
    // [lat, lng] — Leaflet order, opposite of GeoJSON
    coord: z.tuple([z.number(), z.number()]).optional(),
    budget: z.enum(['lean', 'mid', 'comfort']).optional(),
    wifi: z.number().optional(),
    outlets: z.boolean().optional(),
    verdict: z.string().optional(),
    summary: z.string().optional(),
    lang: z.enum(['tr', 'en']).default('tr'),
  }),
});

export const collections = { entries };
