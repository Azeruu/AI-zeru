// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';
import astroIcon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  
  integrations: [
    clerk({
      appearance: {
        variables: {
          colorPrimary: '#3674B5',
          colorPrimaryForeground: '#FDFBF7',
          colorBackground: '#0A0A0A',
          colorForeground: '#FDFBF7',
          colorMutedForeground: 'rgba(253, 251, 247, 0.65)',
          colorInput: '#141414',
          colorInputForeground: '#FDFBF7',
          colorDanger: '#ff5f57',
          borderRadius: '0.75rem',
          fontFamily: "'Fira Code', ui-monospace, monospace",
        },
      },
    }),
    react(),
    astroIcon(),
  ],

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel(),
});