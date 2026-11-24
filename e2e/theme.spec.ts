import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixture';

const themeSwitch = (page: Page) => page.getByRole('switch', { name: 'Theme (dark mode)' });

async function expectTheme(page: Page, mode: 'light' | 'dark') {
  const dark = mode === 'dark';
  const toggle = themeSwitch(page);
  await expect(toggle).toBeChecked({ checked: dark });
  await expect(toggle).toHaveText(dark ? 'ThemeDark' : 'ThemeLight');
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    dark ? 'rgb(4, 35, 46)' : 'rgb(240, 244, 245)',
  );
}

async function painted(canvas: Locator, rgb: [number, number, number]) {
  return canvas.evaluate((element: HTMLCanvasElement, [r, g, b]) => {
    const pixels = element
      .getContext('2d')!
      .getImageData(0, 0, element.width, element.height).data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (
        pixels[i] === r &&
        pixels[i + 1] === g &&
        pixels[i + 2] === b &&
        pixels[i + 3] === 255
      )
        return true;
    }
    return false;
  }, rgb);
}

test('defaults to light and restores keyboard changes after a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expectTheme(page, 'light');
  await page.getByRole('link', { name: 'Data', exact: true }).focus();
  await page.keyboard.press('Tab');
  const toggle = themeSwitch(page);
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Space');
  await expectTheme(page, 'dark');
  await expect(toggle).toHaveAttribute('aria-disabled', 'false');
  await page.reload();
  await expectTheme(page, 'dark');
  await toggle.click();
  await expectTheme(page, 'light');
  await expect(toggle).toHaveAttribute('aria-disabled', 'false');
  await page.reload();
  await expectTheme(page, 'light');
});

test('opens records in light mode when the initial theme request stalls', async ({ page }) => {
  const path = '/api/preferences/theme';
  const saved = await page.request.put(path, { data: { theme: 'dark' } });
  await expect(saved).toBeOK();
  await page.route('**' + path, () => {}, { times: 1 });

  await page.goto('/organizations');
  const firstRecord = page.locator('tbody a').first();
  await expect(firstRecord).toBeVisible({ timeout: 10000 });
  await expectTheme(page, 'light');
  await expect(page.getByRole('alert')).toHaveText('Could not load the theme.');

  await page.getByRole('button', { name: 'Retry theme' }).click();
  await expectTheme(page, 'dark');
  await expect(firstRecord).toBeVisible();
  await expect(page).toHaveURL(/\/organizations$/);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('restores the previous theme and allows retry when saving stalls', async ({ page }) => {
  await page.goto('/organizations');
  await expectTheme(page, 'light');
  await page.route('**/api/preferences/theme', () => {}, { times: 1 });

  await themeSwitch(page).click();
  await expectTheme(page, 'dark');
  await expect(themeSwitch(page)).toHaveAttribute('aria-disabled', 'true');

  await expect(page.getByRole('alert')).toHaveText(/Could not confirm the theme save/, {
    timeout: 10000,
  });
  await expectTheme(page, 'light');
  await expect(page.locator('tbody a').first()).toBeVisible();
  await themeSwitch(page).click();
  await expect(themeSwitch(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.reload();
  await expectTheme(page, 'dark');
});

test('shares the saved mode with a fresh browser context and all routes', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto('/');
  const toggle = themeSwitch(page);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-disabled', 'false');
  const fresh = await browser.newContext({ baseURL });
  try {
    const other = await fresh.newPage();
    await other.goto('/');
    await expect(other.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expectTheme(other, 'dark');
    for (const section of [
      'Organizations',
      'Contacts',
      'Deals',
      'Pipeline',
      'Trash',
      'Data',
    ]) {
      const nav = other.getByRole('navigation', {
        name: ['Trash', 'Data'].includes(section) ? 'Utilities' : 'Main sections',
      });
      await nav.getByRole('link', { name: section, exact: true }).click();
      await expect(other.getByRole('heading', { name: section, exact: true })).toBeVisible();
      await expectTheme(other, 'dark');
      if (['Organizations', 'Contacts', 'Deals'].includes(section)) {
        const record = other.locator('tbody a').first();
        await expect(record).toBeVisible();
        const path = await record.getAttribute('href');
        await record.click();
        await expect(other).toHaveURL(baseURL + path!);
        await expect(other.locator('main .view')).toBeVisible();
        await expectTheme(other, 'dark');
      }
    }
  } finally {
    await fresh.close();
  }
});

test('redraws Dashboard charts and themes the funnel and form without changing values', async ({
  page,
}) => {
  await page.goto('/');
  const revenue = page.getByLabel('Won revenue by month');
  const wins = page.getByLabel('Deals won by month');
  const funnel = page.locator('.funnel');
  const track = funnel.locator('.funnel-track').first();
  const monthly = page.getByText('Monthly values', { exact: true });
  await expect(monthly).toHaveCount(2);
  for (const summary of await monthly.all()) await summary.click();
  const values = page.locator('.chart-values ul, .funnel-key');
  await expect(revenue).toBeVisible();
  await expect(wins).toBeVisible();
  await expect(values).toHaveCount(8);
  const before = await values.allTextContents();

  await expect.poll(() => painted(revenue, [8, 119, 91])).toBe(true);
  await expect.poll(() => painted(wins, [227, 236, 238])).toBe(true);
  await expect(track).toHaveCSS('background-color', 'rgb(240, 244, 245)');

  await themeSwitch(page).click();
  await expectTheme(page, 'dark');
  await expect.poll(() => painted(revenue, [86, 230, 186])).toBe(true);
  await expect.poll(() => painted(wins, [52, 84, 94])).toBe(true);
  await expect(track).toHaveCSS('background-color', 'rgb(4, 35, 46)');
  expect(await values.allTextContents()).toEqual(before);
  await expect(page.locator('.chart-values[open]')).toHaveCount(2);

  await page.getByRole('link', { name: 'Organizations', exact: true }).click();
  await page.getByRole('button', { name: 'Add organization' }).click();
  const form = page.getByRole('dialog', { name: 'Add organization' });
  await expect(form).toBeVisible();
  await expect(form).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(form.getByRole('textbox', { name: 'Name' })).toHaveCSS(
    'color',
    'rgb(205, 216, 219)',
  );
});
