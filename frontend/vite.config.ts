import { defineConfig } from 'vitest/config';
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: { proxy: { '/api': 'http://127.0.0.1:' + (process.env.ACCOUNTABLE_API_PORT || '8000') } },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] },
});
