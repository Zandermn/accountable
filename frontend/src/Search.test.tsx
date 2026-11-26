import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { Search } from './Search';

afterEach(() => vi.unstubAllGlobals());

const row = { name: 'Harbor Works', id: 'harbor', kind: 'organizations' };
function response(rows: unknown[]) {
  return { ok: true, json: async () => rows };
}
function show() {
  function Route() {
    return <output>{useLocation().pathname}</output>;
  }
  render(
    <MemoryRouter>
      <Search />
      <Route />
    </MemoryRouter>,
  );
  return screen.getByRole('searchbox', { name: 'Search records' });
}

test('shows result names and types and opens a detail link with the keyboard', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        response([
          row,
          { name: 'Maya Chen', id: 'maya', kind: 'contacts' },
          { name: 'Harbor renewal', id: 'deal', kind: 'deals' },
        ]),
      ),
  );
  const field = show();
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value: 'Harbor' } });
  const first = await screen.findByRole('link', { name: /Harbor Works.*Organization/i });
  expect(first).toHaveAttribute('href', '/organizations/harbor');
  expect(screen.getByRole('link', { name: /Maya Chen.*Contact/i })).toHaveAttribute(
    'href',
    '/contacts/maya',
  );
  expect(screen.getByRole('link', { name: /Harbor renewal.*Deal/i })).toHaveAttribute(
    'href',
    '/deals/deal',
  );
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'Enter' });
  expect(screen.getByText('/organizations/harbor')).toBeVisible();
});

test('shows loading, no matches, and fetch errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValueOnce(response([])).mockRejectedValueOnce(Error('Offline')),
  );
  const field = show();
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value: 'Missing' } });
  expect(screen.getByText('Searching…')).toBeVisible();
  expect(await screen.findByText('No matching records.')).toBeVisible();
  fireEvent.change(field, { target: { value: 'Maya' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not search');
});

test('ignores a delayed result from an earlier query', async () => {
  let resolve!: (value: ReturnType<typeof response>) => void;
  const delayed = new Promise<ReturnType<typeof response>>((done) => {
    resolve = done;
  });
  const fetcher = vi.fn().mockReturnValueOnce(delayed).mockResolvedValueOnce(response([]));
  vi.stubGlobal('fetch', fetcher);
  const field = show();
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value: 'Harbor' } });
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  fireEvent.change(field, { target: { value: 'Other' } });
  expect(await screen.findByText('No matching records.')).toBeVisible();
  await act(async () => resolve(response([row])));
  expect(screen.queryByText('Harbor Works')).toBeNull();
  expect(screen.getByText('No matching records.')).toBeVisible();
});
