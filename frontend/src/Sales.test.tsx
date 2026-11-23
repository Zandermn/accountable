import { afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SalesWorkspace } from './Sales';
import { Session, stages } from './data';
import { RecordDialog } from './dialogs';
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
