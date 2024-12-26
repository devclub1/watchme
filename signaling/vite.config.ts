import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/app.ts',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['fs', 'path'],
    },
    outDir: 'dist',
  },
});