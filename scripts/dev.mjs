import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadSettings, python } from './python.mjs';
import { setTimeout as pause } from 'node:timers/promises';
import { createInterface } from 'node:readline';
const root = fileURLToPath(new URL('../', import.meta.url));
const processes = [];
let stopping = false;
let input;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of processes) child.kill();
  input?.close();
}
function start(command, args) {
  const child = spawn(command, args, { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
  processes.push(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 1));
}
const test = process.argv.includes('--test');
if (!test) loadSettings();
const port = process.env.ACCOUNTABLE_PORT || '5173';
const apiPort = process.env.ACCOUNTABLE_API_PORT || '8000';
if (test) process.env.ACCOUNTABLE_PORT = port;
const backend = test
  ? ['backend.tests.local_app:browser_app', '--factory']
  : ['backend.main:app'];
start(python, ['-m', 'uvicorn', ...backend, '--host', '127.0.0.1', '--port', apiPort]);
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
if (process.argv.includes('--stdin')) {
  input = createInterface({ input: process.stdin });
  input.on('close', () => stop(0));
}
while (!stopping) {
  try {
    const res = await fetch('http://127.0.0.1:' + apiPort + '/health');
    if (res.ok) break;
  } catch {
    /* The API is still starting. */
  }
  await pause(100);
}
if (!stopping)
  start(process.execPath, [
    'node_modules/vite/bin/vite.js',
    'frontend',
    '--config',
    'frontend/vite.config.ts',
    '--host',
    '127.0.0.1',
    '--port',
    port,
    '--strictPort',
  ]);
