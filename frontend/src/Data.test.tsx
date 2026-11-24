import { expect, test, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Data } from './DataView';
import { Session } from './data';
afterEach(() => vi.unstubAllGlobals());

test('applies the workbook only after confirmation of the preview', async () => {
  const fetcher = vi.fn<(path: string, options: RequestInit) => Promise<unknown>>(async (path) => ({
    ok: true,
    json: async () =>
      path === '/api/backups' ? [] : { token: 'preview-1', changes: ['Add New office'] },
  }));
  vi.stubGlobal('fetch', fetcher);
  const refresh = vi.fn();
  render(
    <Session.Provider value={{ dataset: 7, epoch: 0, refresh }}>
      <Data />
    </Session.Provider>,
  );
  const preview = screen.getByRole('button', { name: 'Preview import' });
  expect(preview).toBeDisabled();
  const file = new File(['workbook contents'], 'records.xlsx');
  fireEvent.change(screen.getByLabelText('Workbook'), { target: { files: [file] } });
  fireEvent.click(preview);
  expect(await screen.findByText('Add New office')).toBeVisible();
  expect(fetcher.mock.calls.map(([path]) => path)).not.toContain('/api/workbook/apply');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }));
  expect(screen.queryByText('Import preview')).toBeNull();
  fireEvent.click(preview);
  fireEvent.click(await screen.findByRole('button', { name: 'Apply import' }));
  expect(await screen.findByText('Imported 1 records.')).toBeVisible();
  const request = fetcher.mock.lastCall?.[1];
  expect(fetcher.mock.lastCall?.[0]).toBe('/api/workbook/apply');
  expect(request?.headers).toEqual({ 'X-Dataset': '7' });
  expect((request?.body as FormData).get('file')).toEqual(file);
  expect((request?.body as FormData).get('token')).toBe('preview-1');
  expect(refresh).toHaveBeenCalledOnce();
});
test('shows the export field error in Data', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => ({
      ok: path === '/api/backups',
      json: async () => (path === '/api/backups' ? [] : { message: 'Check Notes on record A.' }),
    })),
  );
  render(<Data />);
  fireEvent.click(screen.getByRole('button', { name: 'Export workbook' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Check Notes on record A.');
});
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
