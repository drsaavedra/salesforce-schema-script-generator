import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/salesforce-schema-script-generator/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
