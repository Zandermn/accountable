import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
export const python = fileURLToPath(
  new URL(
    process.platform === 'win32' ? '../.venv/Scripts/python.exe' : '../.venv/bin/python',
    import.meta.url,
  ),
);
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const run = spawnSync(python, process.argv.slice(2), { stdio: 'inherit' });
  if (run.error) console.error('Run uv sync --locked first.', run.error.message);
  process.exitCode = run.status ?? 1;
}
