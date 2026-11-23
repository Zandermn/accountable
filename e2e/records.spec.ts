import { test, expect } from './fixture';
import type { Page } from '@playwright/test';
const nav = (p: Page, name: string) =>
  p.getByRole('navigation').getByRole('link', { name, exact: true }).click();
const row = (p: Page, name: string) =>
  p
    .getByRole('row')
    .filter({ has: p.getByRole('link', { name, exact: true }) })
    .first();
async function create(p: Page, kind: string, name: string, fields: Record<string, string> = {}) {
  await p.getByRole('button', { name: 'Add ' + kind, exact: true }).click();
  const dialog = p.getByRole('dialog');
  await dialog.getByLabel('Name *', { exact: true }).fill(name);
  for (const [key, value] of Object.entries(fields)) {
    const control = dialog.getByLabel(key, { exact: true });
    if (await control.evaluate((e) => e.tagName === 'SELECT'))
      await control.selectOption({ label: value });
    else await control.fill(value);
  }
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
async function discard(p: Page, name: string) {
  await row(p, name).getByRole('button', { name: 'Delete' }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(p.getByRole('dialog')).toHaveCount(0);
}
test('records, linked searches, blockers and saved edits after restart', async ({
  page: p,
  app,
}) => {
  await p.goto('/organizations');
  await create(p, 'organization', 'Lake Retail', { Industry: 'Retail' });
  await nav(p, 'Contacts');
  await create(p, 'contact', 'Pat Field');
  await row(p, 'Pat Field').getByText('Edit').click();
  await p.getByLabel('Organization', { exact: true }).selectOption({ label: 'Lake Retail' });
  await p.getByText('Save', { exact: true }).click();
  await p.getByLabel('Status filter').selectOption('Lead');
  await p.getByRole('searchbox').fill('lake');
  await expect(row(p, 'Pat Field')).toBeVisible();
  await nav(p, 'Deals');
  const terms = { 'Value (USD) *': '100', 'Expected close date *': '2025-12-01' };
  for (const name of ['Order A', 'Order B'])
    await create(p, 'deal', name, { ...terms, Organization: 'Lake Retail' });
  await create(p, 'deal', 'Order C', { ...terms, 'Main contact': 'Pat Field' });
  await create(p, 'deal', 'Order D', {
    ...terms,
    'Main contact': 'Pat Field',
    Organization: 'Lake Retail',
  });
  await p.getByText('Add deal', { exact: true }).click();
  await p.getByLabel('Name *', { exact: true }).fill('Missing link');
  await p.getByLabel('Value (USD) *', { exact: true }).fill('10');
  await p.getByLabel('Expected close date *').fill('2027-10-01');
  await p.getByText('Save', { exact: true }).click();
  await expect(p.getByRole('alert')).toContainText('organization or main contact');
  await p.getByText('Cancel').click();
  for (const [section, record, names] of [
    ['Organizations', 'Lake Retail', ['Order A', 'Order B']],
    ['Contacts', 'Pat Field', ['Order C', 'Order D']],
  ] as const) {
    for (const name of names) {
      await nav(p, section);
      await row(p, record).getByText('Delete').click();
      const dialog = p.getByRole('dialog');
      await expect(dialog.getByRole('link')).toHaveCount(2);
      await dialog.getByRole('link', { name }).click();
      await expect(p.getByRole('heading', { name, exact: true })).toBeVisible();
    }
  }
  await nav(p, 'Deals');
  await p.getByRole('button', { name: 'Value (USD)' }).click();
  for (const name of ['Order A', 'Order B']) await discard(p, name);
  await nav(p, 'Organizations');
  await discard(p, 'Lake Retail');
  await app.restart();
  await p.reload();
  await nav(p, 'Contacts');
  await expect(row(p, 'Pat Field')).toBeVisible();
  await expect(row(p, 'Pat Field')).not.toContainText('Lake Retail');
  await nav(p, 'Deals');
  await expect(row(p, 'Order D')).toContainText('Pat Field');
  await expect(row(p, 'Order D')).not.toContainText('Lake Retail');
});
test('restores organizations, contacts, deals and independent activities from Trash', async ({
  page: p,
  app,
}) => {
  await p.goto('/organizations');
  await create(p, 'organization', 'Restorable');
  await nav(p, 'Contacts');
  await create(p, 'contact', 'Solo buyer', { Organization: 'Restorable' });
  await row(p, 'Solo buyer').getByRole('link', { name: 'Solo buyer' }).click();
  for (const note of ['Call tomorrow', 'Keep in Trash']) {
    await p.getByText('Log activity').click();
    await p.getByLabel('Activity type *').selectOption('Call');
    await p.getByLabel('Description *').fill(note);
    await p.getByLabel('Follow-up date').fill('2027-05-01');
    await p.getByText('Save', { exact: true }).click();
    await expect(p.getByText(note, { exact: true })).toBeVisible();
  }
  await p
    .locator('article')
    .filter({ hasText: 'Keep in Trash' })
    .getByText('Delete activity')
    .click();
  await p.getByRole('dialog').getByText('Delete', { exact: true }).click();
  await nav(p, 'Contacts');
  await discard(p, 'Solo buyer');
  await nav(p, 'Organizations');
  await discard(p, 'Restorable');
  await app.restart();
  await p.goto('/trash');
  const trashed = (name: string) =>
    p.getByRole('row').filter({ has: p.getByRole('cell', { name, exact: true }) });
  await trashed('Solo buyer').getByText('Restore').click();
  await expect(
    p.getByLabel('Organization on restore').locator('option[value=previous]'),
  ).toBeDisabled();
  await p.getByText('Cancel').click();
  for (const name of ['Restorable', 'Solo buyer', 'Keep in Trash']) {
    await trashed(name).getByText('Restore').click();
    await p.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(trashed(name)).toHaveCount(0);
  }
  await nav(p, 'Contacts');
  await row(p, 'Solo buyer').getByRole('link', { name: 'Solo buyer' }).click();
  await expect(p.getByText('Call tomorrow', { exact: true })).toBeVisible();
  await expect(p.getByRole('link', { name: 'Restorable' })).toBeVisible();
});

test('search, sort, edit and recover saved fields in all three directories', async ({
  page: p,
  app,
}) => {
  await p.goto('/organizations');
  await create(p, 'organization', 'West shop');
  await nav(p, 'Contacts');
  await create(p, 'contact', 'West buyer');
  await nav(p, 'Deals');
  await create(p, 'deal', 'West order', {
    'Value (USD) *': '15.75',
    Organization: 'West shop',
    'Expected close date *': '2027-04-10',
  });
  const items = [
    ['Organizations', 'West shop', 'West outlet'],
    ['Contacts', 'West buyer', 'West owner'],
    ['Deals', 'West order', 'West delivery'],
  ];
  for (const [section, previous, newName] of items) {
    await nav(p, section);
    await p.getByRole('searchbox').fill('WEST');
    await p.getByRole('columnheader', { name: /^Name/ }).getByRole('button').click();
    await expect(p.getByRole('columnheader', { name: /^Name/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    await row(p, previous).getByText('Edit').click();
    await p.getByLabel('Name *', { exact: true }).fill(newName);
    await p.getByRole('dialog').getByText('Save', { exact: true }).click();
    await expect(row(p, newName)).toBeVisible();
  }
  await p.goto('about:blank');
  await app.restart();
  await p.goto('/deals');
  for (const [section, , name] of [...items].reverse()) {
    await nav(p, section);
    await expect(row(p, name)).toBeVisible();
    await discard(p, name);
  }
});
