import { test as base, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return String(port);
}
export const test = base.extend<{ app: { restart: () => Promise<void>; env: NodeJS.ProcessEnv } }>({
  baseURL: async ({ app }, use) => use('http://127.0.0.1:' + app.env.ACCOUNTABLE_PORT),
  app: [
    async ({}, use) => {
      const dir = await mkdtemp(join(tmpdir(), 'accountable-e2e-'));
      const env = {
        ...process.env,
        npm_config_offline: 'true',
        ACCOUNTABLE_DB: join(dir, 'test.db'),
        ACCOUNTABLE_BACKUPS: join(dir, 'backups'),
        ACCOUNTABLE_PORT: await freePort(),
        ACCOUNTABLE_API_PORT: await freePort(),
      };
      let child: ChildProcess;
      async function start() {
        child = spawn(
          process.execPath,
          [process.env.npm_execpath!, 'run', 'dev', '--', '--stdin'],
          { env, stdio: 'pipe' },
        );
        let log = '';
        child.stdout!.on('data', (s) => (log += s));
        child.stderr!.on('data', (s) => (log += s));
        await expect
          .poll(
            async () => {
              if (child.exitCode !== null) throw Error(log);
              return fetch('http://127.0.0.1:' + env.ACCOUNTABLE_PORT + '/api/version')
                .then((r) => r.ok)
                .catch(() => false);
            },
            { timeout: 20000 },
          )
          .toBe(true);
      }
      async function stop() {
        if (child && child.exitCode === null) {
          const stopped = once(child, 'exit');
          child.stdin!.end();
          await stopped;
        }
      }
      try {
        await start();
        await use({
          restart: async () => {
            await stop();
            await start();
          },
          env,
        });
      } finally {
        await stop();
        await rm(dir, { recursive: true, force: true, maxRetries: 5 });
      }
    },
    { auto: true },
  ],
});
export { expect };
