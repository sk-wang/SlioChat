import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  base: './',

  plugins: [
    svelte(),
    viteSingleFile({
      useRecommendedBuildConfig: true,
      removeViteModuleLoader: true,
      deleteInlinedFiles: true,
    }),
  ],

  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: ['es2015', 'ios12'],
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 10000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },

  optimizeDeps: {
    include: ['pdfjs-dist', 'marked', 'highlight.js'],
  },

  server: {
    port: 5173,
    host: true,
  },
});
