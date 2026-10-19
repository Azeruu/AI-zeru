// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  
  integrations: [
    clerk(),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel(),
});