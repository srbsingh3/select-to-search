import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { cpSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        // Copy manifest.json
        copyFileSync('manifest.json', 'dist/manifest.json');

        // Copy content CSS
        copyFileSync('src/content.css', 'dist/content.css');

        // Copy options HTML and update script reference
        let optionsHtml = readFileSync('public/options.html', 'utf-8');
        optionsHtml = optionsHtml.replace('src="/options.js"', 'src="./options.js"');
        writeFileSync('dist/options.html', optionsHtml);

        // Copy icons if they exist
        if (existsSync('public/icons')) {
          mkdirSync('dist/icons', { recursive: true });
          cpSync('public/icons/', 'dist/icons/', { recursive: true });
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
        options: resolve(__dirname, 'src/options/main.tsx'),
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