// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://simplecube.net',
  adapter: vercel(),

  devToolbar: {
    enabled: false,
  },

  security: {
    checkOrigin: false,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin/') && !page.includes('/api/') && !page.includes('/blog-preview'),
    }),
    react(),
  ],
});
