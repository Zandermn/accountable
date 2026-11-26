import { test, expect } from './fixture';
test('recover former links, choose replacements, and restore follow-ups to the Dashboard', async ({
  page: p,
  app,
  request,
}) => {
  const headers = { Authorization: 'Bearer alex-token', 'X-Dataset': '1' };
  async function add(kind: string, data: object) {
    const response = await request.post('/api/records/' + kind, { headers, data });
    expect(response.ok()).toBe(true);
    return response.json();
  }
  const org = await add('organizations', { name: 'Old office' }),
    other = await add('organizations', { name: 'New office' });
  const kept = await add('contacts', {
    name: 'New address',
    status: 'Lead',
    organization_id: org.id,
  });
  await add('contacts', { name: 'Same address', status: 'Lead', organization_id: org.id });
  const person = await add('contacts', {
    name: 'Independent buyer',
    status: 'Lead',
    organization_id: org.id,
  });
  await add('deals', {
    name: 'Sole link',
    stage: 'Won',
    value_cents: 1000,
    organization_id: org.id,
  });
  await add('activities', {
    type: 'Call',
    contact_id: person.id,
    description: 'Arrange site visit',
    occurred_at: '2026-03-04T09:00:00Z',
    follow_up: '2027-01-01',
  });
  const row = (name: string) =>
    p.getByRole('row').filter({ has: p.getByRole('cell', { name, exact: true }) });
  async function discard(kind: string, name: string) {
    await p.goto('/' + kind);
    await row(name).getByRole('button', { name: 'Delete' }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(row(name)).toHaveCount(0);
  }
  async function restore(name: string) {
    await row(name).getByText('Restore').click();
    return p.getByRole('dialog');
  }
  await p.goto('/');
  await expect(p.locator('.tasks')).toContainText('Arrange site visit');
  await discard('deals', 'Sole link');
  await discard('organizations', 'Old office');
  await discard('contacts', 'Independent buyer');
  await p.goto('/');
  await expect(p.locator('.tasks')).not.toContainText('Arrange site visit');
  await p.goto('/contacts');
  await row('New address').getByText('Edit').click();
  await p.getByLabel('Organization', { exact: true }).selectOption({ label: 'New office' });
  await p.getByText('Save', { exact: true }).click();
  await expect(row('New address')).toContainText(other.name);
  await app.restart();
  await p.goto('/trash');
  let dialog = await restore('Sole link');
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('organization or main contact');
  await dialog.getByText('Cancel').click();
  dialog = await restore('Independent buyer');
  await dialog.getByLabel('Organization on restore').selectOption('individual');
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(row('Arrange site visit')).toHaveCount(0);
  dialog = await restore('Old office');
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(row('Old office')).toHaveCount(0);
  dialog = await restore('Sole link');
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(row('Sole link')).toHaveCount(0);
  await p.goto('/contacts');
  await expect(row('Same address')).toContainText('Old office');
  await expect(row('New address')).toContainText('New office');
  await expect(row('Independent buyer')).not.toContainText('Old office');
  await p.goto('/');
  await expect(p.locator('.tasks')).toContainText('Arrange site visit');
});
