import { test as base, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { randomInt } from "node:crypto";
import { createServer } from "node:net";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
async function freePort(otherPort?: number) {
  // Windows can assign ephemeral ports that Fetch and Chrome block.
  for (let attempt = 0; attempt < 20; attempt++) {
    const port = randomInt(20000, 30000);
    if (port === otherPort) continue;
    const server = createServer();
    try {
      server.listen(port, "127.0.0.1");
      await once(server, "listening");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EADDRINUSE" || code === "EACCES") continue;
      throw error;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    return port;
  }
  throw new Error("Could not find a free test port between 20000 and 29999.");
}
export async function signIn(page: Page, email = 'alex@example.test', path = '/') {
  await page.goto(path);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('local-test-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Main sections' })).toBeVisible();
}

export const test = base.extend<{
  signedIn: boolean;
  app: { restart: () => Promise<void>; env: NodeJS.ProcessEnv };
}>({
  signedIn: [true, { option: true }],
  page: async ({ page, signedIn }, use) => {
    if (signedIn) await signIn(page);
    await use(page);
  },
  baseURL: async ({ app }, use) =>
    use("http://127.0.0.1:" + app.env.ACCOUNTABLE_PORT),
  app: [
    async ({}, use) => {
      const webPort = await freePort();
      const apiPort = await freePort(webPort);
      const dir = await mkdtemp(join(tmpdir(), "accountable-e2e-"));
      const env = {
        ...process.env,
        npm_config_offline: "true",
        ACCOUNTABLE_TEST_DB: join(dir, "test.db"),
        ACCOUNTABLE_PORT: String(webPort),
        ACCOUNTABLE_API_PORT: String(apiPort),
      };
      let child: ChildProcess;
      async function start() {
        child = spawn(
          process.execPath,
          ["scripts/dev-test.mjs", "--stdin"],
          { env, stdio: "pipe" },
        );
        let log = "";
        child.stdout!.on("data", (s) => (log += s));
        child.stderr!.on("data", (s) => (log += s));
        try {
          await expect
            .poll(
              async () => {
                if (child.exitCode !== null) {
                  throw new Error(`App exited with code ${child.exitCode}`);
                }
                return fetch(
                  "http://127.0.0.1:" + env.ACCOUNTABLE_PORT + "/health",
                )
                  .then((r) => r.ok)
                  .catch(() => false);
              },
              { timeout: 20000 },
            )
            .toBe(true);
        } catch (cause) {
          throw new Error(
            `Test app failed to start on ports ${webPort} and ${apiPort}.\n${log.trim()}`,
            {
              cause,
            },
          );
        }
      }
      async function stop() {
        if (child && child.exitCode === null) {
          const stopped = once(child, "exit");
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
