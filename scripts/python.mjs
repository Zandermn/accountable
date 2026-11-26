import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
export const python = fileURLToPath(
  new URL(
    process.platform === 'win32' ? '../.venv/Scripts/python.exe' : '../.venv/bin/python',
    import.meta.url,
  ),
);
export function loadSettings() {
  try {
    process.loadEnvFile();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args[0] === '--settings') {
    args.shift();
    loadSettings();
  }
  const run = spawnSync(python, args, { stdio: 'inherit' });
  if (run.error) console.error('Run uv sync --locked first.', run.error.message);
  process.exitCode = run.status ?? 1;
}
