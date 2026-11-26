import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixture';

const menu = (page: Page) => page.getByRole('button', { name: 'User menu for Alex Morgan' });
const choice = (page: Page, name: string) => page.getByRole('radio', { name, exact: true });

async function expectTheme(page: Page, mode: 'light' | 'dark') {
  await expect(page.locator('html')).toHaveCSS(
    'background-color',
    mode === 'dark' ? 'rgb(4, 35, 46)' : 'rgb(240, 244, 245)',
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

test('opens records in System mode when the initial theme request stalls', async ({ page }) => {
  const path = '/api/preferences/theme';
  const saved = await page.request.put(path, {
    headers: { Authorization: 'Bearer alex-token' },
    data: { theme: 'dark', version: 0 },
  });
  await expect(saved).toBeOK();
  await page.emulateMedia({ colorScheme: 'light' });
  await page.route('**' + path, () => {}, { times: 1 });

  await page.goto('/organizations');
  const firstRecord = page.locator('tbody a').first();
  await expect(firstRecord).toBeVisible({ timeout: 10000 });
  await expectTheme(page, 'light');
  await menu(page).click();
  await expect(choice(page, 'System')).toBeChecked();
  await expect(page.getByRole('alert')).toHaveText('Could not load the theme.');

  await page.getByRole('button', { name: 'Retry theme' }).click();
  await expectTheme(page, 'dark');
  await expect(firstRecord).toBeVisible();
  await expect(page).toHaveURL(/\/organizations$/);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('restores the previous choice and allows retry when saving stalls', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/organizations');
  await expectTheme(page, 'light');
  await menu(page).click();
  await page.route('**/api/preferences/theme', () => {}, { times: 1 });

  await choice(page, 'Dark').click();
  await expectTheme(page, 'dark');
  await expect(choice(page, 'Dark')).toHaveAttribute('aria-disabled', 'true');

  await expect(page.getByRole('alert')).toHaveText(/Could not confirm the theme save/, {
    timeout: 10000,
  });
  await expectTheme(page, 'light');
  await expect(choice(page, 'System')).toBeChecked();
  await expect(page.locator('tbody a').first()).toBeVisible();
  await page.getByRole('button', { name: 'Retry theme' }).click();
  await expect(choice(page, 'Dark')).toBeChecked();
  await expect(choice(page, 'Dark')).toHaveAttribute('aria-disabled', 'false');
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.reload();
  await expectTheme(page, 'dark');
});

test('redraws Dashboard charts and themes the funnel and form without changing values', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
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

  await page.emulateMedia({ colorScheme: 'dark' });
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
