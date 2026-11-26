import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { python } from './python.mjs';
import { runStep } from './run-step.mjs';

for (const setting of ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']) {
  delete process.env[setting];
}

function runWithTestDirectory(suite, run) {
  try {
    const dir = mkdtempSync(join(tmpdir(), `accountable-${suite.toLowerCase()}-`));
    try {
      run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    }
  } catch (error) {
    console.error(`Could not prepare or remove the ${suite} directory.`, error.message);
    process.exitCode = 1;
  }
}

runWithTestDirectory('Vitest', (dir) => {
  runStep(
    'Vitest',
    process.execPath,
    ['../node_modules/vitest/vitest.mjs', 'run', '--coverage.reportsDirectory', dir],
    { cwd: 'frontend' },
  );
});

runWithTestDirectory('pytest', (dir) => {
  runStep(
    'pytest',
    python,
    ['-m', 'pytest', '--basetemp', join(dir, 'tests'), '-o', `cache_dir=${join(dir, 'cache')}`],
    { env: { ...process.env, COVERAGE_FILE: join(dir, '.coverage') } },
  );
});

if (!process.argv.includes('--quick')) {
  runStep('Playwright', process.execPath, ['node_modules/@playwright/test/cli.js', 'test']);
}
