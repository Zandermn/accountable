import { test, expect } from './fixture';
test('moves cards by drag and keyboard, preserves a draft, focus and order', async ({
  page: p,
  app,
}) => {
  await p.goto('/deals');
  await p.getByRole('link', { name: 'Annual supply agreement', exact: true }).click();
  await p.getByText('Add note', { exact: true }).click();
  await p.getByLabel('Note', { exact: true }).fill('Discuss purchasing terms');
  await p.getByText('Show in pipeline').click();
  const selected = p.locator('.is-selected-deal'),
    panel = p.getByRole('region', { name: 'Deal details' });
  await expect(selected).toContainText('Annual supply agreement');
  await expect(selected).toBeInViewport();
  await expect(panel.getByLabel('Note', { exact: true })).toHaveValue('Discuss purchasing terms');
  await panel.getByText('Save note').click();
  await expect(panel.locator('.note-text')).toHaveText('Discuss purchasing terms');
  await p.getByLabel('Close deal details').click();
  await expect(selected).toHaveCount(0);
  await expect(
    p.getByRole('button', { name: 'Annual supply agreement', exact: true }),
  ).toBeFocused();
  const lane = (name: string) => p.getByRole('region', { name, exact: true });
  const card = (name: string) => p.locator('article.deal-card').filter({ hasText: name });
  const before = await p.locator('.board-totals').innerText();
  const proposal = lane('Proposal').locator('.deal-card');
  const first = await proposal.first().boundingBox();
  const second = await proposal.nth(1).boundingBox();
  const column = lane('Proposal').locator('.lane-cards');
  const bounds = await column.boundingBox();
  await card('Workshop expansion').dragTo(column, {
    targetPosition: { x: 20, y: (first!.y + first!.height + second!.y) / 2 - bounds!.y },
  });
  await expect(lane('Proposal').locator('.deal-title')).toHaveText([
    'Annual supply agreement', 'Workshop expansion', 'Regional launch',
  ]);
  await card('Pilot program').dragTo(lane('New'));
  await expect(lane('Lost').locator('.deal-card')).toHaveCount(0);
  await card('Workshop expansion').dragTo(lane('Lost'));
  await expect(lane('Lost')).toContainText('Workshop expansion');
  await expect(p.locator('.board-totals')).not.toHaveText(before);
  await card('Annual supply agreement').dragTo(card('Regional launch'), {
    targetPosition: { x: 10, y: 90 },
  });
  await expect(lane('Proposal').locator('.deal-title')).toHaveText([
    'Regional launch',
    'Annual supply agreement',
  ]);
  await p.getByLabel('Move Annual supply agreement').focus();
  await p.keyboard.press('Enter');
  await p.getByLabel('Position', { exact: true }).selectOption({ label: 'Before Regional launch' });
  await p.getByRole('dialog').getByRole('button', { name: 'Move', exact: true }).click();
  await expect(lane('Proposal').locator('.deal-title')).toHaveText([
    'Annual supply agreement',
    'Regional launch',
  ]);
  await app.restart();
  await p.goto('/pipeline');
  await expect(lane('Proposal').locator('.deal-title')).toHaveText([
    'Annual supply agreement',
    'Regional launch',
  ]);
  await expect(card('Annual supply agreement')).toContainText('Late');
  await lane('Negotiation').getByText('+ Add deal').click();
  await expect(p.getByLabel('Stage *', { exact: true })).toHaveValue('Negotiation');
  await p.getByLabel('Name *', { exact: true }).fill('Late negotiation');
  await p.getByLabel('Value (USD) *').fill('205');
  await p.getByLabel('Expected close date *').fill('2020-01-01');
  await p.getByLabel('Main contact', { exact: true }).selectOption({ label: 'Maya Chen' });
  await p.getByText('Save', { exact: true }).click();
  await expect(lane('Negotiation')).toContainText('Late negotiation');
  await p.getByRole('navigation').getByRole('link', { name: 'Deals', exact: true }).click();
  await expect(p.getByRole('row').filter({ hasText: 'Workshop expansion' })).toContainText('0%');
  await expect(p.getByRole('row').filter({ hasText: 'Late negotiation' })).toContainText('Late');
  await p.goto('/organizations/org-0');
  await p.getByRole('link', { name: 'Workshop expansion' }).click();
  await p.getByText('Show in pipeline').click();
  await expect(selected).toContainText('Workshop expansion');
});
test('demo, saved activities, notes and live Dashboard updates', async ({ page: p, app }) => {
  await p.goto('/');
  const tasks = p.locator('.tasks');
  await expect(tasks).toContainText('Overdue');
  await expect(tasks).toContainText('Due today');
  await p.locator('.activity').getByRole('link').first().click();
  await expect(p.getByRole('heading', { name: 'Timeline' })).toBeVisible();
  await p.goto('/deals/deal-3');
  await p.getByText('Add note', { exact: true }).click();
  await p.getByLabel('Note', { exact: true }).fill('Buyer approved');
  await p.getByText('Save note').click();
  await p.getByText('Edit note').click();
  await p.getByLabel('Note', { exact: true }).fill('Buyer signed');
  await p.getByText('Save note').click();
  await expect(p.locator('.note-text')).toHaveText('Buyer signed');
  await app.restart();
  await p.goto('/deals/deal-3');
  await expect(p.locator('.note-text')).toHaveText('Buyer signed');
  await p.getByText('Remove note').click();
  await p.getByRole('dialog').getByText('Delete', { exact: true }).click();
  await p.getByText('Log activity').click();
  await p.getByLabel('Activity type *').selectOption('Email');
  await p.getByLabel('Description *').fill('Arrange delivery');
  await p.getByLabel('Follow-up date').fill('2027-12-31');
  await p.getByText('Save', { exact: true }).click();
  const activity = p.locator('.history').filter({ hasText: 'Arrange delivery' });
  await activity.getByText('Edit activity').click();
  await p.getByLabel('Description *').fill('Confirm the clinic delivery');
  await p.getByText('Save', { exact: true }).click();
  await p.getByText('Edit deal', { exact: true }).click();
  await p.getByLabel('Stage *', { exact: true }).selectOption('Won');
  await p.getByText('Save', { exact: true }).click();
  await expect(p.locator('.history').first()).toContainText('Moved from Negotiation to Won');
  await expect(p.getByText('Moved from Negotiation to Won', { exact: true })).toHaveCount(1);
  await p.getByRole('navigation').getByText('Dashboard').click();
  await expect(tasks).toContainText('Confirm the clinic delivery');
  await expect(p.locator('.stat').first()).toContainText('4');
  const month = await p.evaluate(() => new Date().toLocaleDateString('sv-SE').slice(0, 7));
  await p.locator('.wins summary').click();
  await expect(p.locator('.wins li').last()).toHaveText(month + ' · 2');
  await p.locator('.revenue summary').click();
  await expect(p.locator('.revenue li').last()).toHaveText(month + ' · US$20,350.00');
  await p.getByRole('button', { name: 'Mark done: Confirm the clinic delivery' }).click();
  await expect(tasks).not.toContainText('Confirm the clinic delivery');
  await app.restart();
  await p.goto('/');
  await expect(tasks).toBeVisible();
  await expect(tasks).not.toContainText('Confirm the clinic delivery');
  await p.goto('/trash');
  await expect(p.getByRole('cell', { name: 'Buyer signed' })).toBeVisible();
});
