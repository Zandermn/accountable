import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { Session } from './data';

vi.mock('react-chartjs-2', () => ({
  Bar: ({ 'aria-label': label }: { 'aria-label': string }) => <canvas aria-label={label} />,
  Line: ({ 'aria-label': label }: { 'aria-label': string }) => <canvas aria-label={label} />,
}));
afterEach(() => vi.unstubAllGlobals());

test('shows the monthly figures, links to activity owners, and retries a failed follow-up update', async () => {
  const activity = {
    id: 'call',
    description: 'Call the buyer',
    kind: 'contacts',
    owner_id: 'buyer',
    owner: 'Pat Buyer',
    type: 'Call',
    occurred_at: '2026-05-10T12:00:00Z',
    follow_up: '2026-05-11',
    due: 'Today',
  };
  const report = {
    totals: { count: 1, value: 10000, expected: 2500 },
    funnel: { New: 10000, Qualified: 10000 },
    months: [{ month: '2026-05', wins: 2, revenue: 32500 }],
    followups: [
      activity,
      { ...activity, id: 'mail', description: 'Send the quote', due: 'Overdue' },
    ],
    recent: [
      activity,
      { ...activity, id: 'note', type: 'Note', description: 'Check terms' },
      { ...activity, id: 'stage', type: 'Stage', description: 'Moved to Proposal' },
      { ...activity, id: 'old', description: 'First conversation' },
    ],
  };
  let rejectUpdate = true;
  const fetcher = vi.fn(async (_path: string, options: RequestInit) => ({
    ok: options.method !== 'PATCH' || !rejectUpdate,
    json: async () =>
      options.method === 'PATCH' ? { message: 'Could not save the follow-up.' } : report,
  }));
  const refresh = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  render(
    <MemoryRouter>
      <Session.Provider value={{ dataset: 7, epoch: 0, refresh }}>
        <Dashboard />
      </Session.Provider>
    </MemoryRouter>,
  );

  expect(await screen.findByLabelText('Won revenue by month')).toBeVisible();
  fireEvent.click(
    within(screen.getByText('Won revenue').closest('section')!).getByText('Monthly values'),
  );
  expect(screen.getByText(/US\$325\.00/)).toBeVisible();
  expect(screen.getByLabelText('Deals won by month')).toBeVisible();
  expect(screen.getByText('Overdue')).toBeVisible();
  expect(screen.getByText('Today')).toBeVisible();
  expect(screen.getAllByRole('link', { name: 'Pat Buyer' })[0]).toHaveAttribute(
    'href',
    '/contacts/buyer',
  );
  expect(screen.getByText('Moved to Proposal')).toBeVisible();
  expect(screen.getByText('Show 1 more activities')).toBeVisible();

  const complete = screen.getByRole('button', { name: 'Mark done: Call the buyer' });
  fireEvent.click(complete);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the follow-up.');
  expect(refresh).not.toHaveBeenCalled();
  rejectUpdate = false;
  fireEvent.click(complete);
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(screen.queryByRole('alert')).toBeNull();
  expect(fetcher).toHaveBeenLastCalledWith('/api/records/activities/call', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Dataset': '7' },
    body: '{"done":true}',
  });
});
