import { spawnSync } from 'node:child_process';

export function runStep(name, binary, args, options = {}) {
  const run = spawnSync(binary, args, { ...options, stdio: 'inherit' });
  if (run.status !== 0) {
    const reason = run.error?.message ?? run.signal ?? `exit code ${run.status}`;
    console.error(`${name} failed (${reason}).`);
    process.exitCode = 1;
  }
}
