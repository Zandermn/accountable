import { expect, test, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Data } from './DataView';
afterEach(() => vi.unstubAllGlobals());
test('cancelling either backup dialog keeps the selected backup', async () => {
  const fetcher = vi.fn(async (path: string) => ({
    ok: true,
    json: async () =>
      path === '/api/backups'
        ? [{ id: 'saved', created_at: '2026-03-12T10:00:00Z' }]
        : { token: 'permit' },
  }));
  vi.stubGlobal('fetch', fetcher);
  render(<Data />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete backup' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByText('Cancel'));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Delete backup' }));
  fireEvent.click(screen.getByText('Continue'));
  const final = await screen.findByRole('dialog', { name: 'Confirm permanent deletion' });
  expect(final).toHaveTextContent('saved');
  fireEvent.click(within(final).getByText('Cancel'));
  await screen.findByRole('button', { name: 'Delete backup' });
  expect(fetcher.mock.calls.some((call) => call[0].endsWith('/cancel'))).toBe(true);
  expect(fetcher.mock.calls.map((call) => call[0])).not.toContain('/api/backups/saved');
});
