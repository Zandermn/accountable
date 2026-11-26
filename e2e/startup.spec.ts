import type { Locator } from '@playwright/test';
import { test, expect } from './fixture';

test('keeps follow-up text and the search placeholder readable', async ({ page }) => {
  const description = 'Send the revised studio proposal';
  const task = page.getByRole('article').filter({
    has: page.getByRole('button', { name: 'Mark done: ' + description }),
  });
  const title = task.getByText(description, { exact: true });
  const due = task.getByText(/^Due today/);
  await expect(due).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const textBounds = (locator: Locator) =>
    locator.evaluate((element) => {
      const text = document.createRange();
      text.selectNodeContents(element);
      return Array.from(text.getClientRects(), ({ left, right, top, bottom }) => ({
        left,
        right,
        top,
        bottom,
      }));
    });
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const titleLines = await textBounds(title);
    const dueLines = await textBounds(due);
    const overlap = titleLines.some(({ left, right, top, bottom }) =>
      dueLines.some(
        (line) => left < line.right && line.left < right && top < line.bottom && line.top < bottom,
      ),
    );
    expect.soft(overlap, `Follow-up title and date overlap at ${width}px`).toBe(false);
  }

  const search = page.getByRole('searchbox', { name: 'Search records' });
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const contrast = await search.evaluate((input) => {
      function luminance(color: string) {
        const [red, green, blue] = color
          .match(/\d+/g)!
          .slice(0, 3)
          .map((channel) => {
            const value = Number(channel) / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      }
      const text = luminance(getComputedStyle(input, '::placeholder').color);
      const surface = luminance(getComputedStyle(input.parentElement!).backgroundColor);
      return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
    });
    expect
      .soft(contrast, `Search placeholder contrast in ${theme} mode`)
      .toBeGreaterThanOrEqual(4.5);
  }
});

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
