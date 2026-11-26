import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Commands, Details, Directory, Trash } from './Records';
import { RecordDialog } from './dialogs';
import { Session } from './data';
afterEach(() => vi.unstubAllGlobals());

test('contact details link related records and send activity actions for the correct contact', async () => {
  const activity = {
    id: 'call',
    type: 'Call',
    description: 'Discuss renewal',
    occurred_at: '2026-05-10T12:00:00Z',
    follow_up: '2026-05-11',
    added_by: 'Alex Morgan',
    done: false,
  };
  const contact = {
    id: 'buyer',
    name: 'Pat Buyer',
    email: 'buyer@example.com',
    status: 'Qualified',
    related: [{ id: 'office', name: 'New office', kind: 'organizations' }],
    timeline: [activity],
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => contact }));
  const open = vi.fn();
  render(
    <MemoryRouter>
      <Commands.Provider value={open}>
        <Details kind="contacts" id="buyer" />
      </Commands.Provider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Pat Buyer' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'New office' })).toHaveAttribute(
    'href',
    '/organizations/office',
  );
  expect(screen.getByText('Discuss renewal')).toBeVisible();
  expect(screen.getByText('May 11')).toHaveAttribute('datetime', '2026-05-11');
  expect(screen.getByText('(US Eastern Time)')).toBeVisible();
  expect(screen.getByText('Added by Alex Morgan')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Log activity' }));
  expect(open).toHaveBeenLastCalledWith({
    type: 'edit',
    kind: 'activities',
    initial: { contact_id: 'buyer' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Edit activity' }));
  expect(open).toHaveBeenLastCalledWith({ type: 'edit', kind: 'activities', row: activity });
  fireEvent.click(screen.getByRole('button', { name: 'Delete activity' }));
  expect(open).toHaveBeenLastCalledWith({ type: 'delete', kind: 'activities', row: activity });
});

test('filters and sorts Trash and restores the row the user chose', async () => {
  const deleted = {
    id: 'call',
    kind: 'activities',
    description: 'Discuss renewal',
    deleted_at: '2026-05-12T12:00:00Z',
  };
  const fetcher = vi.fn(async (path: string) => ({
    ok: true,
    json: async () => (path.includes('kind=activities') ? [deleted] : []),
  }));
  const open = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  render(
    <Commands.Provider value={open}>
      <Trash />
    </Commands.Provider>,
  );

  expect(await screen.findByText('Trash is empty for this selection.')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Record type'), { target: { value: 'activities' } });
  expect(await screen.findByText('Discuss renewal')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Newest first' }));
  await waitFor(() =>
    expect(fetcher.mock.lastCall?.[0]).toBe('/api/trash?kind=activities&direction=asc'),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
  expect(open).toHaveBeenCalledWith({ type: 'restore', kind: 'activities', row: deleted });
});
test('editing the description preserves the exact activity timestamp', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetcher);
  const stamp = '2026-10-31T12:05:51.123456+00:00';
  const row = { id: 'a', type: 'Call', description: 'Call', occurred_at: stamp };
  render(
    <RecordDialog
      close={() => {}}
      action={{ kind: 'activities', type: 'edit', dataset: 0, row: row as never }}
    />,
  );
  fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Called buyer' } });
  fireEvent.click(screen.getByText('Save'));
  await waitFor(() => expect(fetcher).toHaveBeenCalled());
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.description).toBe('Called buyer');
  expect(body.occurred_at ?? stamp).toBe(stamp);
});
test('search, status and sort reach the API and distinguish empty and no match', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
  vi.stubGlobal('fetch', fetcher);
  render(
    <MemoryRouter>
      <Directory kind="contacts" />
    </MemoryRouter>,
  );
  expect(screen.getByText('Loading…')).toBeVisible();
  expect(await screen.findByText('No contacts yet.')).toBeVisible();
  fetcher.mockResolvedValue({
    ok: true,
    json: async () => [{ id: 'a', name: 'A', status: 'Lead' }],
  });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Acme' } });
  fireEvent.change(screen.getByLabelText('Status filter'), { target: { value: 'Lead' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Status' }));
  await waitFor(() =>
    expect(fetcher.mock.lastCall?.[0]).toContain(
      'search=Acme&sort=status&direction=asc&status=Lead',
    ),
  );
  fetcher.mockResolvedValue({ ok: true, json: async () => [] });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
  expect(await screen.findByText('No matching records.')).toBeVisible();
  fetcher.mockRejectedValue(Error('Data unavailable'));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'retry' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Data unavailable');
});
test('validation retains entered values and replacement disables the old form', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Use HTTPS or HTTP.', field: 'website' }),
    }),
  );
  const form = (
    <RecordDialog close={() => {}} action={{ kind: 'organizations', type: 'edit', dataset: 1 }} />
  );
  const tree = (dataset: number) => (
    <Session.Provider value={{ dataset, epoch: 0, refresh: () => {} }}>{form}</Session.Provider>
  );
  const view = render(tree(1));
  fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Harbor' } });
  fireEvent.click(screen.getByText('Save'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Use HTTPS');
  expect(screen.getByLabelText('Name *')).toHaveValue('Harbor');
  view.rerender(tree(2));
  expect(screen.getByText('Save')).toBeDisabled();
});
