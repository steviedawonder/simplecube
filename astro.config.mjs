// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://simplecube.vercel.app',
  adapter: vercel(),

  security: {
    checkOrigin: false,
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [sitemap(), react()],
});
