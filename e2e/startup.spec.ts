import { test, expect } from './fixture';
test('opens the local sales workspace with bundled fonts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Instrument Sans"'))).toBe(true);
  for (const section of ['Organizations', 'Contacts', 'Deals', 'Pipeline']) {
    await page
      .getByRole('navigation', { name: 'Main sections' })
      .getByRole('link', { name: section })
      .click();
    await expect(page.getByRole('heading', { name: section, exact: true })).toBeVisible();
  }
});
