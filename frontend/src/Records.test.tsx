import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Directory } from './Records';
import { RecordDialog } from './dialogs';
import { Session } from './data';
afterEach(() => vi.unstubAllGlobals());
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
    vi
      .fn()
      .mockResolvedValue({
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
