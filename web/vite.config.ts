import pkg from './package.json';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // The version the app shows in Settings, so it can be checked against GitHub.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: './',
  server: {
    allowedHosts: process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
      ? [process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS]
      : undefined,
    cors: process.env.DEV_PREVIEW_CORS_SUFFIX
      ? { origin: new RegExp('^https?://[^/]+\\.' + process.env.DEV_PREVIEW_CORS_SUFFIX.replace(/\./g, '\\.') + '(?::\\d+)?$') }
      : undefined,
  },
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
