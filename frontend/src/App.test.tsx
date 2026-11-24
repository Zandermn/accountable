import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
test('refreshes an open view when the server local date changes without a write', async () => {
  let today = '2026-11-30';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => ({
      ok: true,
      json: async () =>
        path === '/api/version'
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
test('opens the Dashboard and exposes all five sales sections', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(
    screen.getByRole('navigation', { name: 'Main sections' }).querySelectorAll('a'),
  ).toHaveLength(5);
});
