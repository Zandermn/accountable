import { afterEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
test('refreshes an open view when the server local date changes without a write', async () => {
  let today = '2026-11-30';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => ({
      ok: true,
      json: async () =>
        path === '/api/preferences/theme'
          ? { theme: 'light' }
          : path === '/api/version'
            ? { dataset: 1, revision: 3, today }
            : [{ id: 'test', name: 'Read on ' + today }],
    })),
  );
  try {
    render(
      <MemoryRouter initialEntries={['/organizations']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Read on 2026-11-30')).toBeVisible();
    today = '2026-12-01';
    fireEvent.focus(window);
    expect(await screen.findByText('Read on 2026-12-01')).toBeVisible();
  } finally {
    vi.unstubAllGlobals();
  }
});
test('opens the Dashboard and exposes all five sales sections', async () => {
  mockTheme('light');
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  await screen.findByRole('switch', { name: 'Theme (dark mode)' });
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(
    screen.getByRole('navigation', { name: 'Main sections' }).querySelectorAll('a'),
  ).toHaveLength(5);
});

afterEach(() => vi.unstubAllGlobals());

function mockTheme(theme: string, { readFails = false, saveFails = false } = {}) {
  const fetcher = vi.fn(async (path: string, options: RequestInit) => {
    if (path === '/api/preferences/theme') {
      if (options.method === 'PUT') {
        if (saveFails) {
          saveFails = false;
          return { ok: false, json: async () => ({}) };
        }
        theme = JSON.parse(String(options.body)).theme;
      } else if (readFails) {
        readFails = false;
        throw new Error('Offline');
      }
      return { ok: true, json: async () => ({ theme }) };
    }
    return {
      ok: true,
      json: async () =>
        path === '/api/version'
          ? { dataset: 1, revision: 0 }
          : path === '/api/dashboard'
            ? {
                totals: { count: 0, value: 0, expected: 0 },
                months: [],
                funnel: {},
                followups: [],
                recent: [],
              }
            : path === '/api/pipeline'
              ? { totals: { count: 0, value: 0, expected: 0 }, columns: {} }
              : [],
    };
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

function openOrganizations() {
  render(
    <MemoryRouter initialEntries={['/organizations']}>
      <App />
    </MemoryRouter>,
  );
  return screen.findByRole('switch', { name: 'Theme (dark mode)' });
}

test('shows light by default and saves a mode change', async () => {
  const fetcher = mockTheme('light');
  const toggle = await openOrganizations();
  expect(toggle).not.toBeChecked();
  expect(toggle).toHaveTextContent('Light');
  fireEvent.click(toggle);
  expect(toggle).toBeChecked();
  expect(toggle).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(toggle);
  expect(fetcher.mock.calls.filter(([, options]) => options.method === 'PUT')).toHaveLength(1);
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(fetcher).toHaveBeenCalledWith(
    '/api/preferences/theme',
    expect.objectContaining({ method: 'PUT', body: '{"theme":"dark"}' }),
  );
  await waitFor(() => expect(toggle).toHaveAttribute('aria-disabled', 'false'));
});

test('applies the saved dark theme before showing the workspace', async () => {
  mockTheme('dark');
  const opening = openOrganizations();
  expect(screen.queryByRole('heading', { name: 'Organizations' })).toBeNull();
  expect(screen.queryByRole('navigation', { name: 'Main sections' })).toBeNull();
  const toggle = await opening;
  expect(toggle).toBeChecked();
  expect(toggle).toHaveTextContent('Dark');
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});

test('restores the last saved mode after a failed save', async () => {
  mockTheme('dark', { saveFails: true });
  const toggle = await openOrganizations();
  fireEvent.click(toggle);
  expect(toggle).not.toBeChecked();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the theme');
  expect(toggle).toBeChecked();
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toHaveAttribute('aria-disabled', 'false'));
  expect(toggle).not.toBeChecked();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('uses light after a failed read and lets the user retry', async () => {
  mockTheme('dark', { readFails: true });
  const toggle = await openOrganizations();
  expect(toggle).not.toBeChecked();
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load the theme');
  fireEvent.click(screen.getByRole('button', { name: 'Retry theme' }));
  await waitFor(() => expect(toggle).toBeChecked());
  expect(screen.queryByRole('alert')).toBeNull();
});

test('opens the workspace if the theme response body stalls and ignores a late result', async () => {
  vi.useFakeTimers();
  try {
    let resolveFirstRead!: (preference: { theme: string }) => void;
    const firstRead = new Promise<{ theme: string }>((resolve) => {
      resolveFirstRead = resolve;
    });
    const fetcher = mockTheme('dark').mockResolvedValueOnce({
      ok: true,
      json: () => firstRead,
    });
    render(
      <MemoryRouter initialEntries={['/organizations']}>
        <App />
      </MemoryRouter>,
    );
    const signal = fetcher.mock.calls[0][1].signal;
    await act(async () => vi.advanceTimersByTimeAsync(2999));
    expect(signal?.aborted).toBe(false);
    expect(screen.queryByRole('navigation')).toBeNull();

    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(signal?.aborted).toBe(true);
    const toggle = screen.getByRole('switch', { name: 'Theme (dark mode)' });
    const heading = screen.getByRole('heading', { name: 'Organizations' });
    expect(heading).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Main sections' })).toBeVisible();
    expect(toggle).not.toBeChecked();

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry theme' })));
    expect(toggle).toBeChecked();
    expect(heading).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();

    await act(async () => resolveFirstRead({ theme: 'light' }));
    expect(toggle).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  } finally {
    vi.useRealTimers();
  }
});
