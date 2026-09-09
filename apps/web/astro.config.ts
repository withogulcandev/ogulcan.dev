import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { remarkWikilinks } from './src/lib/remark-wikilinks';

export default defineConfig({
  output: 'static',
  integrations: [react()],
  markdown: {
    remarkPlugins: [remarkWikilinks],
  },
});
