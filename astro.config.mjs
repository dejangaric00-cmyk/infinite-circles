// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://infinite-circles.de',
  integrations: [
    sitemap({
      // /music is a 301 to /radio — keep it out of the index.
      filter: (page) => !/\/music\/?$/.test(page),
    }),
  ],
  // Static output — no SSR adapter needed.
  // @astrojs/netlify is listed in devDependencies only for potential future SSR use.
  output: 'static',
});
