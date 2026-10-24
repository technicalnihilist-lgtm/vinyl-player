import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 100_000,
  },
  test: {
    // The unit tests cover pure logic (time formatting + the playback reducer),
    // so no DOM environment is needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as never);
