import type { Page } from '@playwright/test';
import { test, expect, signIn } from './fixture';

const menu = (page: Page, name = 'Alex Morgan') =>
  page.getByRole('button', { name: 'User menu for ' + name });
const mode = (page: Page, name: string) => page.getByRole('radio', { name, exact: true });
const theme = (page: Page, name: 'light' | 'dark') =>
  expect(page.locator('html')).toHaveAttribute('data-theme', name);

test('follows the device in System and keeps each signed-in account choice across browsers', async ({
  page, browser, baseURL,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await theme(page, 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await theme(page, 'dark');

  const trigger = menu(page);
  await page.getByRole('searchbox', { name: 'Search records' }).focus();
  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Space');
  await expect(mode(page, 'System')).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(mode(page, 'System')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(mode(page, 'Light')).toBeChecked();
  await theme(page, 'light');
  await expect(mode(page, 'Light')).toHaveAttribute('aria-disabled', 'false');
  await page.reload();
  await theme(page, 'light');
  await trigger.click();
  await mode(page, 'Dark').click();
  await expect(mode(page, 'Dark')).toHaveAttribute('aria-disabled', 'false');

  const same = await browser.newContext({ baseURL, colorScheme: 'light' });
  const different = await browser.newContext({ baseURL, colorScheme: 'light' });
  try {
    const second = await same.newPage();
    await signIn(second, 'alex@example.test', '/organizations/org-0');
    await theme(second, 'dark');
    await menu(second).click();
    await expect(mode(second, 'Dark')).toBeChecked();
    await second.keyboard.press('Escape');
    await expect(menu(second)).toBeFocused();

    const teammate = await different.newPage();
    await signIn(teammate, 'blair@example.test', '/data');
    await theme(teammate, 'light');
    await menu(teammate, 'blair@example.test').click();
    await expect(mode(teammate, 'System')).toBeChecked();
    await mode(teammate, 'Light').click();
    await expect(mode(teammate, 'Light')).toHaveAttribute('aria-disabled', 'false');
    await second.reload();
    await theme(second, 'dark');
  } finally {
    await same.close();
    await different.close();
  }

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.goto('/trash');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect((await page.request.get('/api/trash')).status()).toBe(401);
});
