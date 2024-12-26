import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

const PORT = !!process.env.PORT ? Number(process.env.PORT) : 3000;

export default defineConfig({
  server: {
    port: PORT
  },
  plugins: [
    VitePluginNode({
      adapter: 'express',
      appPath: './src/app.ts',
      exportName: 'app',
      tsCompiler: 'esbuild'
    })
  ],
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

