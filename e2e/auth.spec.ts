import { test, expect, signIn } from './fixture';

test.use({ signedIn: false });

test('shows sign-in on every main page and detail link', async ({ page }) => {
  for (const path of [
    '/', '/organizations', '/contacts', '/deals', '/pipeline', '/trash', '/data',
    '/organizations/org-0', '/contacts/person-0', '/deals/deal-0',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(path + '$'));
  }
});

test('rejects missing and invalid bearer tokens on all shared API routes', async ({ request }) => {
  for (const headers of [{}, { Authorization: 'Bearer invalid' }] as Record<string, string>[]) {
    for (const [method, path] of [
      ['GET', 'version'], ['GET', 'dashboard'], ['GET', 'pipeline'], ['POST', 'pipeline/move'],
      ['GET', 'records/organizations'], ['POST', 'records/contacts'],
      ['GET', 'records/deals/deal-0'], ['PATCH', 'records/deals/deal-0'],
      ['GET', 'records/contacts/person-0/delete-preview'], ['DELETE', 'records/contacts/person-0'],
      ['GET', 'trash'], ['POST', 'trash/deals/deal-0'],
      ['GET', 'workbook/template'], ['GET', 'workbook/export'],
      ['POST', 'workbook/preview'], ['POST', 'workbook/apply'],
      ['GET', 'search'], ['GET', 'preferences/theme'], ['PUT', 'preferences/theme'],
    ]) {
      const response = await request.fetch('/api/' + path, { method, headers });
      expect(response.status(), method + ' ' + path).toBe(401);
    }
  }
  const unknown = await request.get('/api/unknown', { headers: { Authorization: 'Bearer alex-token' } });
  expect(unknown.status()).toBe(404);
  expect(unknown.headers()['content-type']).toContain('application/json');
});

test('two accounts see shared records and the original creator after edit and restart', async ({
  page, browser, baseURL, app,
}) => {
  await signIn(page, 'alex@example.test', '/organizations');
  await page.getByRole('button', { name: 'Add organization' }).click();
  await page.getByLabel('Name *').fill('Shared partner');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: 'Shared partner' }).click();
  await expect(page.getByText('Alex Morgan')).toBeVisible();
  const detailURL = page.url();
  const context = await browser.newContext({ baseURL });
  try {
    const other = await context.newPage();
    await signIn(other, 'blair@example.test', new URL(detailURL).pathname);
    await other.getByRole('button', { name: 'Edit organization' }).click();
    await other.getByLabel('Name *').fill('Updated partner');
    await other.getByRole('button', { name: 'Save' }).click();
    await expect(other.getByRole('heading', { name: 'Updated partner' })).toBeVisible();
    await expect(other.getByText('Alex Morgan')).toBeVisible();

    const headers = { Authorization: 'Bearer blair-token', 'X-Dataset': '1' };
    async function add(kind: string, data: object) {
      const response = await other.request.post('/api/records/' + kind, { headers, data });
      expect(response.ok()).toBe(true);
      return response.json();
    }
    const contact = await add('contacts', { name: 'Shared contact', status: 'Lead' });
    const deal = await add('deals', {
      name: 'Shared deal', stage: 'New', contact_id: contact.id,
      value_cents: 100, expected_date: '2027-01-02',
    });
    await add('activities', {
      type: 'Call', description: 'Shared customer call', contact_id: contact.id,
      occurred_at: '2026-11-01T12:00:00Z', follow_up: '2027-01-02', follow_up_zone: 'America/Los_Angeles',
    });
    await page.goto('/contacts/' + contact.id);
    await expect(page.getByText('blair@example.test', { exact: true })).toBeVisible();
    await expect(page.getByText('Added by blair@example.test')).toBeVisible();
    await expect(page.getByText('(America/Los Angeles)')).toBeVisible();
    await page.goto('/deals/' + deal.id);
    await expect(page.getByText('Added by blair@example.test')).toBeVisible();
    await page.goto('/organizations/org-0');
    await expect(page.getByText('Sample data')).toBeVisible();
    await app.restart();
    await page.goto(detailURL);
    await expect(page.getByRole('heading', { name: 'Updated partner' })).toBeVisible();
    await expect(page.getByText('Alex Morgan')).toBeVisible();
  } finally {
    await context.close();
  }
});
