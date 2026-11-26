import { test, expect } from './fixture';

test('finds all three record types and excludes records after deletion', async ({ page }) => {
  await page.goto('/data');
  const search = page.getByRole('searchbox', { name: 'Search records' });
  for (const [query, name, kind, url] of [
    ['jUnIpEr', 'Juniper Studio', 'Organization', '/organizations/org-1'],
    ['mAyA cH', 'Maya Chen', 'Contact', '/contacts/person-0'],
    ['cLiNiC rEn', 'Clinic renewal', 'Deal', '/deals/deal-3'],
  ]) {
    await search.fill(query);
    const result = page.getByRole('link', { name: name + ' ' + kind });
    await expect(result).toHaveAttribute('href', url);
    if (kind === 'Contact') {
      await search.press('ArrowDown');
      await expect(result).toBeFocused();
      await page.keyboard.press('Enter');
    } else {
      await result.click();
    }
    await expect(page).toHaveURL(new RegExp(url + '$'));
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }

  await page.getByRole('navigation').getByText('Organizations', { exact: true }).click();
  await page.getByRole('button', { name: 'Add organization' }).click();
  await page.getByLabel('Name *').fill('One-time search result');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /One-time search result/ })).toBeVisible();
  await search.fill('oNe-TiMe');
  await expect(page.getByRole('link', { name: 'One-time search result Organization' })).toBeVisible();
  await search.press('Escape');
  await page.getByRole('row', { name: /One-time search result/ }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await search.fill('one-time search');
  await expect(page.getByText('No matching records.')).toBeVisible();
  await page.getByRole('navigation').getByText('Trash', { exact: true }).click();
  await expect(page.getByRole('row', { name: /One-time search result/ })).toBeVisible();
});
