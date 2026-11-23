import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { python } from './python.mjs';

function runSuite(suite, binary, args, cwd = '.') {
  const run = spawnSync(binary, args, { cwd, stdio: 'inherit' });
  if (run.status !== 0) {
    const reason = run.error?.message ?? run.signal ?? `exit code ${run.status}`;
    console.error(`${suite} failed (${reason}).`);
    process.exitCode = 1;
  }
}

runSuite('Vitest', process.execPath, ['../node_modules/vitest/vitest.mjs', 'run'], 'frontend');

try {
  const dir = mkdtempSync(join(tmpdir(), 'accountable-pytest-'));
  try {
    runSuite('pytest', python, [
      '-m', 'pytest', '--basetemp', join(dir, 'tests'), '-o', `cache_dir=${join(dir, 'cache')}`,
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  }
} catch (error) {
  console.error('Could not prepare or remove the pytest directory.', error.message);
  process.exitCode = 1;
}

runSuite('Playwright', process.execPath, ['node_modules/@playwright/test/cli.js', 'test']);
