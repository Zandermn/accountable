import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('.', import.meta.url));
const dependencies = fileURLToPath(new URL('../node_modules', import.meta.url));
const apiUrl = 'http://127.0.0.1:' + (process.env.ACCOUNTABLE_API_PORT || '8000');
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: {
    cors: false,
    fs: { strict: true, allow: [frontend, dependencies] },
    proxy: {
      '/api': apiUrl,
      '/auth-config': apiUrl,
      '/health': apiUrl,
      ...(process.env.ACCOUNTABLE_TEST_DB ? { '/auth/v1': apiUrl } : {}),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      enabled: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.{test,spec}.{ts,tsx}', 'src/test-setup.ts'],
      reporter: ['text'],
      thresholds: { lines: 80 },
    },
  },
});
