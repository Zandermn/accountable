import { test, expect } from './fixture';
test('offline salesperson walkthrough at desktop and laptop sizes', async ({
  page: p,
  context,
  app,
}, info) => {
  const errors: string[] = [],
    external: string[] = [];
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  p.on('pageerror', (err) => errors.push(err.message));
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === 'data:' || url.hostname === '127.0.0.1') return route.continue();
    external.push(url.origin);
    return route.abort();
  });
  await p.goto('/');
  await expect(p.locator('.tasks')).toContainText('Confirm delivery dates with Maya');
  await p.locator('.tasks').getByRole('link', { name: 'Maya Chen' }).click();
  await expect(p.locator('.history').first()).toContainText('Confirm delivery dates');
  await p.getByRole('navigation').getByText('Deals', { exact: true }).click();
  await p.getByRole('button', { name: 'Probability (%)' }).click();
  await p.getByRole('button', { name: 'Probability (%)' }).click();
  await expect(p.getByRole('row').nth(1)).toContainText('100%');
  await p.goto('/deals/deal-3');
  await p.getByText('Show in pipeline').click();
  await expect(p.locator('.is-selected-deal')).toBeInViewport();
  for (const width of [1440, 1280]) {
    await p.setViewportSize({ width, height: 900 });
    const card = await p.locator('.is-selected-deal').boundingBox(),
      panel = await p.locator('.deal-dock').boundingBox();
    expect(card!.x + card!.width).toBeLessThanOrEqual(panel!.x);
    await p.screenshot({ path: info.outputPath('pipeline-' + width + '.png') });
  }
  for (const section of ['Dashboard', 'Organizations', 'Contacts', 'Deals', 'Trash', 'Data']) {
    await p.getByRole('navigation').getByRole('link', { name: section, exact: true }).click();
    await expect(p.getByRole('heading', { name: section, exact: true })).toBeVisible();
    await expect(p.getByText('Loading…', { exact: true })).toHaveCount(0);
    await p.evaluate(() => document.fonts.ready);
    if (section === 'Dashboard') {
      await expect(p.locator('canvas')).toHaveCount(2);
      for (const summary of await p.getByText('Monthly values', { exact: true }).all()) {
        await summary.focus();
        await p.keyboard.press('Enter');
      }
      await expect(p.locator('.revenue details li')).toHaveCount(6);
      await expect(p.locator('.wins details li')).toHaveCount(6);
    }
    await p.screenshot({ path: info.outputPath(section + '.png') });
  }
  expect(
    await p.evaluate(() =>
      [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
    ),
  ).toEqual(expect.arrayContaining(['Instrument Sans', 'JetBrains Mono']));
  await p.goto('/organizations');
  await p.getByText('Add organization').click();
  await p.getByLabel('Name *').fill('Offline buyer');
  await p.getByText('Save', { exact: true }).click();
  await expect(p.getByRole('link', { name: 'Offline buyer' })).toBeVisible();
  await p.goto('about:blank');
  await app.restart();
  await p.goto('/organizations');
  await expect(p.getByRole('link', { name: 'Offline buyer' })).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
