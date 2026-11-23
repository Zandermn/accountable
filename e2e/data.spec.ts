import { test, expect } from './fixture';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
const python = resolve(
  process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
);
function npm(args: string[], env: NodeJS.ProcessEnv, input?: string) {
  const run = spawnSync(process.execPath, [process.env.npm_execpath!, ...args], {
    env,
    input,
    encoding: 'utf8',
  });
  expect(run.status, run.stderr).toBe(0);
  return run.stdout;
}
test('full save, load, reset, focus refresh and two backup confirmations', async ({
  page: p,
  app,
}) => {
  await p.goto('/organizations');
  await p.getByText('Add organization').click();
  await p.getByLabel('Name *').fill('Local customer');
  await p.getByText('Save', { exact: true }).click();
  const customer = p.getByRole('row').filter({ hasText: 'Local customer' });
  await expect(customer).toBeVisible();
  const saved = npm(['run', 'save'], app.env).match(/Saved (backup-[a-f0-9]+)/)![1];
  expect(npm(['run', 'seed'], app.env, 'no\n')).toContain('cancelled');
  await p.reload();
  await expect(customer).toBeVisible();
  await customer.getByText('Edit').click();
  await p.getByLabel('Name *').fill('Stale form');
  expect(npm(['run', 'seed'], app.env, 'yes\n')).toContain('Restored sample data');
  await p.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(p.getByRole('dialog').getByText('Save')).toBeDisabled();
  await p.getByText('Cancel').click();
  await expect(customer).toHaveCount(0);
  await expect(p.getByRole('link', { name: 'Harbor Works' })).toBeVisible();
  expect(npm(['run', 'load', '--', saved], app.env)).toContain('Loaded ' + saved);
  await p.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(customer).toBeVisible();
  await p.getByRole('navigation').getByText('Data', { exact: true }).click();
  const backup = p.getByRole('listitem').filter({ hasText: saved });
  for (const stage of [1, 2, 3]) {
    await backup.getByText('Delete backup').click();
    if (stage > 1) await p.getByRole('dialog').getByText('Continue').click();
    await p
      .getByRole('dialog')
      .getByText(stage === 3 ? 'Delete permanently' : 'Cancel')
      .click();
    await expect(p.getByRole('dialog')).toHaveCount(0);
    if (stage < 3) await expect(backup).toBeVisible();
  }
  await expect(backup).toHaveCount(0);
  await expect(p.locator('.backup-list li')).toHaveCount(2);
});
test('workbook preview, atomic import, edit and verified export', async ({ page: p, app }) => {
  const dir = dirname(app.env.ACCOUNTABLE_DB!);
  const file = join(dir, 'workbook.xlsx');
  function book(mode: string, path = file) {
    const out = spawnSync(python, ['-m', 'e2e.workbook_fixture', mode, path], { encoding: 'utf8' });
    expect(out.status, out.stderr).toBe(0);
  }
  await p.goto('/data');
  book('valid');
  await p.getByLabel('Workbook', { exact: true }).setInputFiles(file);
  await p.getByText('Preview import').click();
  await expect(p.getByText('Import preview', { exact: true })).toBeVisible();
  await p.getByText('Cancel import').click();
  await p.getByText('Preview import').click();
  await p.getByText('Apply import').click();
  await expect(p.getByRole('status')).toContainText('Imported 3');
  await p.getByRole('navigation').getByText('Deals', { exact: true }).click();
  await p.getByRole('searchbox').fill('Prairie');
  const row = p.getByRole('row').filter({ hasText: 'Studio renewal' });
  await expect(row).toContainText('Ari Shore');
  await row.getByText('Edit').click();
  await p.getByLabel('Name *').fill('Edited renewal');
  await p.getByText('Save', { exact: true }).click();
  await expect(p.getByRole('link', { name: 'Edited renewal' })).toBeVisible();
  await p.getByRole('navigation').getByText('Data', { exact: true }).click();
  const download = p.waitForEvent('download');
  await p.getByText('Export workbook').click();
  const exported = join(dir, 'export.xlsx');
  await (await download).saveAs(exported);
  book('inspect', exported);
  await p.getByLabel('Workbook', { exact: true }).setInputFiles(file);
  await p.getByText('Preview import').click();
  await expect(p.getByText('Import preview', { exact: true })).toBeVisible();
  const other = await p.context().newPage();
  await other.goto('/organizations');
  await other.getByText('Add organization').click();
  await other.getByLabel('Name *').fill('Intervening edit');
  await other.getByText('Save', { exact: true }).click();
  await expect(other.getByRole('link', { name: 'Intervening edit' })).toBeVisible();
  await other.close();
  await p.getByText('Apply import').click();
  await expect(p.getByRole('alert')).toContainText('Preview the workbook again');
  const invalid = join(dir, 'invalid.xlsx');
  book('invalid', invalid);
  await p.getByLabel('Workbook', { exact: true }).setInputFiles(invalid);
  await p.getByText('Preview import').click();
  await expect(p.getByRole('alert')).toContainText('Deals, row 3');
  await p.goto('/organizations');
  await expect(p.getByRole('link', { name: 'Intervening edit' })).toBeVisible();
  await expect(p.getByRole('link', { name: 'Should roll back' })).toHaveCount(0);
  await p.goto('/deals');
  await expect(p.getByRole('link', { name: 'Edited renewal' })).toBeVisible();
});
