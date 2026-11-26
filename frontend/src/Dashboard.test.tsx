import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { Session } from './data';
import { Theme } from './theme';
import { UserMenu } from './UserMenu';

const charts = vi.hoisted(() => ({ bar: vi.fn(), line: vi.fn() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: { 'aria-label': string }) => {
    charts.bar(props);
    return <canvas aria-label={props['aria-label']} />;
  },
  Line: (props: { 'aria-label': string }) => {
    charts.line(props);
    return <canvas aria-label={props['aria-label']} />;
  },
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
    due: 'Due today',
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
  expect(screen.getByText(/Due today/)).toBeVisible();
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

test('switches chart colors while preserving the data and monthly values', async () => {
  const styles = readFileSync('src/style.css', 'utf8');
  const report = {
    totals: { count: 1, value: 10000, expected: 2500 },
    funnel: { New: 10000 },
    months: [{ month: '2026-05', wins: 2, revenue: 32500 }],
    followups: [],
    recent: [],
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, options: RequestInit) => ({
      ok: true,
      json: async () =>
        path === '/api/dashboard'
          ? report
          : {
              theme: options.method === 'PUT' ? 'dark' : 'light',
              version: options.method === 'PUT' ? 2 : 1,
            },
    })),
  );
  render(
    <MemoryRouter>
      <style>{styles}</style>
      <Theme>
        <UserMenu
          account={{
            user: { id: 'alex', email: 'alex@example.test', user_metadata: {} },
            signOut: async () => {},
          }}
        />
        <Dashboard />
      </Theme>
    </MemoryRouter>,
  );

  await screen.findByLabelText('Won revenue by month');
  const monthlyValues = () =>
    screen.getAllByText('Monthly values').map((summary) => summary.parentElement?.textContent);
  const lightValues = monthlyValues();
  expect(lightValues[0]).toContain('US$325.00');
  const lightLine = charts.line.mock.lastCall?.[0];
  const lightBar = charts.bar.mock.lastCall?.[0];
  expect(lightLine.options.scales.x.ticks.color).toBe('#46646c');
  expect(lightLine.data.datasets[0]).toMatchObject({
    borderColor: '#08775b',
    data: [325],
  });
  expect(lightBar.data.datasets[0]).toMatchObject({ backgroundColor: '#ffc145', data: [2] });

  fireEvent.click(screen.getByRole('button', { name: 'User menu for alex@example.test' }));
  const dark = screen.getByRole('radio', { name: 'Dark' });
  fireEvent.click(dark);
  await waitFor(() => expect(dark).toHaveAttribute('aria-disabled', 'false'));
  const darkLine = charts.line.mock.lastCall?.[0];
  const darkBar = charts.bar.mock.lastCall?.[0];
  expect(darkLine.options.scales.x.ticks.color).toBe('#a7bec5');
  expect(darkLine.options.scales.y.grid.color).toBe('#34545e');
  expect(darkLine.options.plugins.tooltip.bodyColor).toBe('#cdd8db');
  expect(darkLine.data.datasets[0]).toMatchObject({
    backgroundColor: '#103b32',
    borderColor: '#56e6ba',
    pointBackgroundColor: '#56e6ba',
  });
  expect(darkBar.data.datasets[0]).toMatchObject({ backgroundColor: '#ffc145' });
  expect(darkBar.options.scales.x.ticks.color).toBe('#a7bec5');
  for (const [light, dark] of [
    [lightLine, darkLine],
    [lightBar, darkBar],
  ]) {
    expect(dark.data.labels).toEqual(light.data.labels);
    expect(dark.data.datasets[0].data).toEqual(light.data.datasets[0].data);
  }
  expect(monthlyValues()).toEqual(lightValues);
});
