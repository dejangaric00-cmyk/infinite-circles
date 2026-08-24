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
  // Static output — no SSR adapter needed. @astrojs/netlify was listed in
  // devDependencies "for later" and pulled the whole Netlify dev stack in with
  // it; it is gone. Add it back the day SSR is actually wanted.
  output: 'static',
});
