import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (!process.env.ACCOUNTABLE_TEST_DB) {
  const dir = mkdtempSync(join(tmpdir(), 'accountable-ui-'));
  process.env.ACCOUNTABLE_TEST_DB = join(dir, 'test.db');
  process.on('exit', () => rmSync(dir, { recursive: true, force: true, maxRetries: 5 }));
}

for (const name of ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']) {
  delete process.env[name];
}

process.argv.push('--test');
await import('./dev.mjs');
