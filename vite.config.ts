import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        // Copy manifest.json
        copyFileSync('manifest.json', 'dist/manifest.json');

        // Copy CSS files
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }
        copyFileSync('src/content.css', 'dist/content.css');
        copyFileSync('src/options/options.css', 'dist/options.css');

        // Copy icons
        if (existsSync('public/icons')) {
          // Icons will need to be manually created or added later
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Content script entry
        content: resolve(__dirname, 'src/contentScript.ts'),
        // Background service worker entry
        background: resolve(__dirname, 'src/background.ts'),
        // Options page entry
        options: resolve(__dirname, 'public/options.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  define: {
    global: 'globalThis',
  },
});