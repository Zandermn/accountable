import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { stop_hook_active: alreadyContinued } = JSON.parse(readFileSync(0, 'utf8'));
if (alreadyContinued) process.exit(0);

const result = spawnSync('npm run check', {
  cwd: new URL('../../', import.meta.url),
  shell: true,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (result.status !== 0) {
  const failure = result.error?.message ?? result.signal ?? `exit code ${result.status}`;
  const diagnostics = [result.stdout, result.stderr]
    .filter(Boolean)
    .map((output) => output.trim().slice(-3000))
    .join('\n');

  console.log(JSON.stringify({
    decision: 'block',
    reason: [
      `npm run check failed (${failure}). Fix the failures and rerun npm run check.`,
      'If any failures remain after this pass, report them and finish the turn.',
      diagnostics,
    ].filter(Boolean).join('\n\n'),
  }));
}
