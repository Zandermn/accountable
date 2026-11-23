import { spawnSync } from 'node:child_process';
import { python } from './python.mjs';
for (const [binary, args, cwd] of [
  [process.execPath, ['../node_modules/vitest/vitest.mjs', 'run'], 'frontend'],
  [python, ['-m', 'pytest'], '.'],
  [process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], '.'],
]) {
  const run = spawnSync(binary, args, { cwd, stdio: 'inherit' });
  if (run.status !== 0) process.exit(run.status ?? 1);
}
