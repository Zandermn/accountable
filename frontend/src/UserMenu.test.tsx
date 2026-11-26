import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { UserMenu } from './UserMenu';
import { Theme } from './theme';

afterEach(() => vi.unstubAllGlobals());

const account = {
  user: { id: 'alex', email: 'alex@example.test', user_metadata: { display_name: 'Alex Morgan' } },
  signOut: vi.fn(async () => {}),
};

function preferences(defaultTheme: string, { failSave = false } = {}) {
  let theme = defaultTheme;
  let version = 0;
  const fetcher = vi.fn(async (_path: string, options: RequestInit) => {
    if (options.method === 'PUT') {
      if (failSave) {
        failSave = false;
        return { ok: false, json: async () => ({}) };
      }
      const body = JSON.parse(String(options.body));
      theme = body.theme;
      version++;
    }
    return { ok: true, json: async () => ({ theme, version }) };
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

async function open() {
  render(
    <Theme>
      <UserMenu account={account} />
    </Theme>,
  );
  const button = await screen.findByRole('button', { name: 'User menu for Alex Morgan' });
  expect(button).toHaveTextContent('AM');
  fireEvent.click(button);
  return button;
}

test('shows the account initials and reads and saves the selected theme', async () => {
  const fetcher = preferences('system');
  const button = await open();
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  await waitFor(() =>
    expect(fetcher).toHaveBeenCalledWith(
      '/api/preferences/theme',
      expect.objectContaining({
        method: 'PUT',
        body: '{"theme":"dark","version":0}',
      }),
    ),
  );
  await waitFor(() => expect(screen.queryByText('Saving theme…')).toBeNull());
  fireEvent.keyDown(screen.getByRole('radio', { name: 'Dark' }), { key: 'Escape' });
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('restores the saved choice after a failed write and offers retry', async () => {
  const fetcher = preferences('light', { failSave: true });
  await open();
  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the theme');
  expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Retry theme' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  expect(fetcher.mock.calls.filter(([, options]) => options.method === 'PUT')).toHaveLength(2);
});

test('offers sign-out from the user menu', async () => {
  preferences('system');
  await open();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sign out' })));
  expect(account.signOut).toHaveBeenCalledOnce();
});
