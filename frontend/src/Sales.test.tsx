import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SalesWorkspace } from './Sales';
import { Session, stages } from './data';
import { RecordDialog } from './dialogs';
import { Commands } from './Records';
afterEach(() => vi.unstubAllGlobals());
const deal = {
  id: 'd',
  name: 'Renewal',
  value_cents: 10000,
  stage: 'New',
  probability: 10,
  related: [],
  timeline: [],
  expected_date: '2027-01-15',
  close_date: '2027-01-15',
};
const totals = { count: 1, value: 10000, expected: 1000 };
const board = {
  revision: 1,
  totals,
  columns: Object.fromEntries(stages.map((s) => [s, { totals, cards: s === 'New' ? [deal] : [] }])),
};
function Routed() {
  return <SalesWorkspace onBoard={useLocation().pathname === '/pipeline'} id="d" />;
}

test('saves an edited note, keeps the draft on failure, and requests confirmation to remove it', async () => {
  const note = {
    id: 'note',
    type: 'Note',
    description: 'Discuss terms',
    occurred_at: '2026-05-10T12:00:00Z',
  };
  let rejectUpdate = true;
  const fetcher = vi.fn(async (path: string, options: RequestInit) => ({
    ok: path !== '/api/records/activities/note' || !rejectUpdate,
    json: async () =>
      options.method === 'PATCH'
        ? { message: 'The note could not be saved.' }
        : { ...deal, timeline: [note] },
  }));
  vi.stubGlobal('fetch', fetcher);
  const refresh = vi.fn();
  const open = vi.fn();
  render(
    <MemoryRouter initialEntries={['/deals/d']}>
      <Session.Provider value={{ dataset: 7, epoch: 0, refresh }}>
        <Commands.Provider value={open}>
          <Routed />
        </Commands.Provider>
      </Session.Provider>
    </MemoryRouter>,
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Edit note' }));
  const field = screen.getByRole('textbox', { name: 'Note' });
  expect(field).toHaveValue('Discuss terms');
  fireEvent.change(field, { target: { value: 'Send updated terms' } });
  const save = screen.getByRole('button', { name: 'Save note' });
  fireEvent.click(save);
  expect(await screen.findByRole('alert')).toHaveTextContent('The note could not be saved.');
  expect(field).toHaveValue('Send updated terms');
  expect(refresh).not.toHaveBeenCalled();
  rejectUpdate = false;
  fireEvent.click(save);
  await waitFor(() => expect(field).not.toBeInTheDocument());
  expect(fetcher).toHaveBeenLastCalledWith('/api/records/activities/note', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Dataset': '7' },
    body: '{"description":"Send updated terms"}',
  });
  expect(refresh).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Remove note' }));
  expect(open).toHaveBeenCalledWith({ type: 'delete', kind: 'activities', row: note });
});

test('requires an expected close date when moving a closed deal back to an open stage', async () => {
  const closed = { ...deal, stage: 'Won', expected_date: null };
  const closedBoard = {
    ...board,
    columns: {
      ...board.columns,
      New: { totals, cards: [] },
      Won: { totals, cards: [closed] },
    },
  };
  const fetcher = vi.fn(async (_path: string, options: RequestInit) => ({
    ok: true,
    json: async () => (options.method === 'POST' ? {} : closedBoard),
  }));
  const refresh = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  render(
    <MemoryRouter initialEntries={['/pipeline']}>
      <Session.Provider value={{ dataset: 7, epoch: 0, refresh }}>
        <Routed />
      </Session.Provider>
    </MemoryRouter>,
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Move Renewal' }));
  const dialog = screen.getByRole('dialog', { name: 'Move deal' });
  fireEvent.change(within(dialog).getByLabelText('Destination stage'), {
    target: { value: 'New' },
  });
  const date = within(dialog).getByLabelText('Expected close date');
  expect(date).toBeRequired();
  fireEvent.change(date, { target: { value: '2027-03-04' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }));
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(fetcher).toHaveBeenLastCalledWith('/api/pipeline/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Dataset': '7' },
    body: JSON.stringify({
      id: 'd',
      stage: 'New',
      before: null,
      revision: 1,
      expected_date: '2027-03-04',
    }),
  });
  expect(refresh).toHaveBeenCalledOnce();
});
test('keeps the draft at the highlighted card and returns keyboard focus on close', async () => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => ({
      ok: true,
      json: async () => (path === '/api/pipeline' ? board : deal),
    })),
  );
  render(
    <MemoryRouter initialEntries={['/deals/d']}>
      <Routed />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByText('Add note'));
  fireEvent.change(screen.getByLabelText('Note', { exact: true }), {
    target: { value: 'Discuss terms' },
  });
  fireEvent.click(screen.getByText('Show in pipeline'));
  const card = await screen.findByRole('button', { name: 'Renewal' });
  expect(card.closest('article')).toHaveClass('is-selected-deal');
  expect(screen.getByLabelText('Note', { exact: true })).toHaveValue('Discuss terms');
  fireEvent.click(screen.getByLabelText('Close deal details'));
  expect(card).toHaveFocus();
  expect(card.closest('article')).not.toHaveClass('is-selected-deal');
});
test('a rejected move keeps saved cards and totals on the board', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => ({
      ok: !path.endsWith('move'),
      json: async () => (path.endsWith('move') ? { message: 'The data changed.' } : board),
    })),
  );
  render(
    <MemoryRouter initialEntries={['/pipeline']}>
      <Routed />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByLabelText('Move Renewal'));
  fireEvent.change(screen.getByLabelText('Destination stage'), { target: { value: 'Won' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByText('Move', { exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('data changed');
  expect(within(screen.getByRole('region', { name: 'New' })).getByText('Renewal')).toBeVisible();
  expect(screen.getAllByText('US$100.00').length).toBeGreaterThan(1);
});
test('deletion dialog links every blocking deal', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => ({
      ok: true,
      json: async () =>
        path.endsWith('preview')
          ? {
              blockers: [
                { id: 'a', name: 'One' },
                { id: 'b', name: 'Two' },
              ],
              cascade: [],
              clear: [],
            }
          : [],
    })),
  );
  render(
    <MemoryRouter>
      <Session.Provider value={{ dataset: 1, epoch: 0, refresh: () => {} }}>
        <RecordDialog
          close={() => {}}
          action={{ type: 'delete', kind: 'contacts', dataset: 1, row: deal as never }}
        />
      </Session.Provider>
    </MemoryRouter>,
  );
  expect(await screen.findByRole('link', { name: 'One' })).toHaveAttribute('href', '/deals/a');
  expect(screen.getByRole('link', { name: 'Two' })).toHaveAttribute('href', '/deals/b');
  expect(screen.getByText('Delete', { exact: true })).toBeDisabled();
});
test('restore shows the former organization and both contact choices', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => [] })),
  );
  const row = {
    id: 'c',
    name: 'Jo',
    former: { organization_id: { id: 'o', name: 'Harbor', active: true, kind: 'organizations' } },
  };
  render(
    <RecordDialog
      close={() => {}}
      action={{ type: 'restore', kind: 'contacts', dataset: 0, row: row as never }}
    />,
  );
  expect(screen.getByText(/Harbor/)).toBeVisible();
  const choice = screen.getByRole('combobox', { name: 'Organization on restore' });
  expect(within(choice).getByRole('option', { name: 'Previous organization' })).toBeEnabled();
  fireEvent.change(choice, { target: { value: 'individual' } });
  expect(choice).toHaveValue('individual');
});
