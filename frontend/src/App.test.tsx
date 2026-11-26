import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

afterEach(() => {
  window.localStorage?.clear();
  vi.unstubAllGlobals();
});

function open(path: string, fetcher: (path: string, options?: RequestInit) => Promise<Response>) {
  vi.stubGlobal('fetch', fetcher);
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockServer(today = '2026-11-30') {
  return vi.fn(async (path: string, options?: RequestInit) => {
    if (path === '/auth-config')
      return json({ url: 'https://accounts.example.test', publishableKey: 'local-key' });
    if (path.includes('/auth/v1/token')) {
      const body = JSON.parse(String(options?.body));
      if (body.password === 'wrong') return json({ message: 'Invalid login credentials' }, 400);
      return json({
        access_token: 'signed-in-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: { id: 'alex', email: 'alex@example.test', user_metadata: {} },
      });
    }
    if (path.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
    if (path === '/api/version') return json({ dataset: 1, revision: 3, today });
    if (path.endsWith('/export')) return json({ message: 'Workbook unavailable.' }, 422);
    if (path === '/api/preferences/theme') return json({ theme: 'system', version: 0 });
    return json({ name: 'Requested organization', related: [], added_by: 'Alex Morgan' });
  });
}

async function submit(password: string) {
  fireEvent.change(await screen.findByLabelText('Email'), {
    target: { value: 'alex@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

test('shows a sign-in error and opens the requested record after a valid sign-in', async () => {
  const server = mockServer();
  open('/organizations/requested', server);
  await submit('wrong');
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign in');
  expect(server.mock.calls.some(([path]) => path.startsWith('/api/'))).toBe(false);
  await submit('valid');
  expect(await screen.findByRole('heading', { name: 'Requested organization' })).toBeVisible();
  expect(screen.getByText('Alex Morgan')).toBeVisible();
  expect(
    screen.getByRole('navigation', { name: 'Main sections' }).querySelectorAll('a'),
  ).toHaveLength(5);
  expect(
    new Headers(server.mock.calls.find(([path]) => path === '/api/version')?.[1]?.headers).get(
      'Authorization',
    ),
  ).toBe('Bearer signed-in-token');
});

test('sends the bearer token for workbook downloads', async () => {
  const server = mockServer();
  open('/data', server);
  await submit('valid');
  fireEvent.click(await screen.findByRole('button', { name: 'Export workbook' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Workbook unavailable.');
  expect(
    new Headers(server.mock.calls.find(([path]) => path.endsWith('/export'))?.[1]?.headers).get(
      'Authorization',
    ),
  ).toBe('Bearer signed-in-token');
});

test('clears the protected view after signing out', async () => {
  const server = mockServer();
  open('/organizations/requested', server);
  await submit('valid');
  expect(await screen.findByRole('heading', { name: 'Requested organization' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'User menu for alex@example.test' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Requested organization' })).toBeNull();
});

test('refreshes an open view when the server day changes without a write', async () => {
  let today = '2026-11-30';
  const server = mockServer();
  open('/organizations', async (path, options) => {
    if (path === '/api/version') return json({ dataset: 1, revision: 3, today });
    if (path.startsWith('/api/records/organizations?'))
      return json([{ id: 'example', name: 'Read on ' + today }]);
    return server(path, options);
  });
  await submit('valid');
  expect(await screen.findByText('Read on 2026-11-30')).toBeVisible();
  today = '2026-12-01';
  fireEvent.focus(window);
  expect(await screen.findByText('Read on 2026-12-01')).toBeVisible();
});
