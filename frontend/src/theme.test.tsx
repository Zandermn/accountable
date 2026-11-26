import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Theme } from './theme';
import { UserMenu } from './UserMenu';

const account = {
  user: { id: 'alex', email: 'alex@example.test', user_metadata: {} },
  signOut: async () => {},
};

afterEach(() => vi.unstubAllGlobals());

test('System follows the device preference within the session', async () => {
  const media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ theme: 'system', version: 0 }),
    }),
  );
  render(
    <Theme>
      <div>Workspace</div>
    </Theme>,
  );
  await screen.findByText('Workspace');
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  act(() => {
    media.matches = true;
    media.dispatchEvent(new Event('change'));
  });
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});

test('opens the workspace if the preference body stalls and ignores a late result', async () => {
  vi.useFakeTimers();
  try {
    let resolve!: (preference: { theme: string; version: number }) => void;
    const delayed = new Promise<{ theme: string; version: number }>((done) => {
      resolve = done;
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => delayed })
        .mockResolvedValue({ ok: true, json: async () => ({ theme: 'dark', version: 1 }) }),
    );
    render(
      <Theme>
        <UserMenu account={account} />
        <div>Workspace</div>
      </Theme>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(2999));
    expect(screen.queryByText('Workspace')).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(screen.getByText('Workspace')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'User menu for alex@example.test' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the theme');
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Retry theme' })));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    await act(async () => resolve({ theme: 'light', version: 0 }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  } finally {
    vi.useRealTimers();
  }
});
