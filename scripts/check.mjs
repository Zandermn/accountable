import { python } from './python.mjs';
import { runStep } from './run-step.mjs';

const format = process.argv.includes('--format');
const quick = process.argv.includes('--quick');
const staged = process.argv.includes('--staged');

function npm(name, ...args) {
  runStep(name, process.execPath, [process.env.npm_execpath, ...args]);
}

if (!staged) {
  npm('Prettier', 'run', format ? 'format' : 'format:check', '--workspace', 'frontend');
}
if (!format) npm('ESLint', 'run', 'lint', '--workspace', 'frontend');
if (!staged) {
  runStep('Ruff format', python, [
    '-m', 'ruff', 'format', ...(format ? [] : ['--check']), 'backend',
  ]);
}

if (!format) {
  runStep('Ruff check', python, ['-m', 'ruff', 'check', 'backend']);
  npm('TypeScript', 'run', 'typecheck', '--workspace', 'frontend');
  runStep('ty', python, ['-m', 'ty', 'check', 'backend']);
  runStep('Gitleaks', 'gitleaks', [
    ...(staged ? ['git', '--staged'] : ['dir']),
    '--config', '.gitleaks.toml', '--redact=100', '--verbose', '--no-color', '--no-banner', '.',
  ]);
}

if (!format && !staged) {
  if (quick) {
    runStep('Tests', process.execPath, ['scripts/test.mjs', '--quick']);
  } else {
    npm('Tests', 'test');
  }
}
