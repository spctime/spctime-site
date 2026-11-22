import { defineConfig } from 'astro/config';

// The site currently lives at the project Pages URL.
// Once spctime.ai is connected in GitHub Pages and DNS, change
// site to https://spctime.ai and base to '/'.
export default defineConfig({
  site: 'https://spctime.github.io',
  base: '/spctime-site/',
  output: 'static'
});
