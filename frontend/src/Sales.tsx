import { useContext, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  api,
  detailPath,
  money,
  probabilities,
  ReadState,
  recordPath,
  Session,
  stages,
  useRead,
  type Row,
} from './data';
import { Commands, History } from './Records';
import { Actions, Modal } from './dialogs';

export type Totals = { count: number; value: number; expected: number };
export type Board = {
  revision: number;
  totals: Totals;
  columns: Record<string, { cards: Row[]; totals: Totals }>;
};
export const colors = ['#06D6A0', '#FFC145', '#F78C6B', '#118AB2', '#EF476F', '#CDD8DB'];
export function Stats({ totals }: { totals: Totals }) {
  return (
    <div className="stats">
      {[
        ['Open deals', totals.count],
        ['Open pipeline', money(totals.value)],
        ['Expected revenue', money(totals.expected)],
      ].map(([label, v]) => (
        <div className="stat" key={label}>
          <p>{label}</p>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  );
}
function NotePanel({ row }: { row: Row }) {
  const { dataset, refresh } = useContext(Session),
    open = useContext(Commands);
  const [draft, setDraft] = useState<{ id?: string; text: string } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    try {
      const body = draft.id
        ? { description: draft.text }
        : {
            type: 'Note',
            deal_id: row.id,
            description: draft.text,
            occurred_at: new Date().toISOString(),
          };
      await api(recordPath('activities', draft.id), draft.id ? 'PATCH' : 'POST', body, dataset);
      setDraft(null);
      setError('');
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="deal-notes">
      <div className="note-header">
        <h3>Notes</h3>
        <button
          className="button subtle"
          onClick={() => {
            setDraft({ text: '' });
            setError('');
          }}
        >
          Add note
        </button>
      </div>
      {row.timeline
        .filter((a) => a.type === 'Note')
        .map((a) => (
          <article className="deal-note" key={a.id}>
            <p className="note-text">{a.description}</p>
            <div className="note-meta">
              <time>{new Date(a.occurred_at).toLocaleDateString()}</time>
              <span className="note-actions">
                <button
                  className="text-link"
                  onClick={() => {
                    setDraft({ id: a.id, text: a.description });
                    setError('');
                  }}
                >
                  Edit note
                </button>
                <button
                  className="text-link note-remove"
                  onClick={() => open({ type: 'delete', kind: 'activities', row: a })}
                >
                  Remove note
                </button>
              </span>
            </div>
          </article>
        ))}
      {draft && (
        <form className="note-form" onSubmit={save}>
          <label>
            Note
            <textarea
              aria-label="Note"
              autoFocus
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <Actions close={() => setDraft(null)} label="Save note" disabled={busy} />
        </form>
      )}
    </section>
  );
}
function DealPanel({
  id,
  onBoard,
  close,
  jump,
}: {
  id: string;
  onBoard: boolean;
  close: () => void;
  jump: () => void;
}) {
  const result = useRead<Row>(recordPath('deals', id)),
    open = useContext(Commands);
  if (!result?.value) return <ReadState error={result?.error} />;
  const row = result.value;
  return (
    <section className="panel deal-window-content" aria-label="Deal details">
      <header className="deal-window-header">
        <div>
          <span className="record-status">{row.stage}</span>
          <h2>{row.name}</h2>
        </div>
        <button className="icon-button" aria-label="Close deal details" onClick={close}>
          ×
        </button>
      </header>
      <dl className="deal-summary">
        {[
          ['Value', money(row.value_cents)],
          ['Probability', row.probability + '%'],
          ['Close date', row.actual_date || row.expected_date],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="numbers">{v}</dd>
          </div>
        ))}
      </dl>
      <dl className="deal-links">
        {row.related.map((r) => (
          <div key={r.id}>
            <dt>{r.kind === 'contacts' ? 'Main contact' : 'Organization'}</dt>
            <dd>
              <Link to={detailPath(r.kind, r.id)}>{r.name}</Link>
            </dd>
          </div>
        ))}
      </dl>
      <div className="row-actions">
        <button
          className="button subtle"
          onClick={() => open({ type: 'edit', kind: 'deals', row })}
        >
          Edit deal
        </button>
        {!onBoard && (
          <button className="button" onClick={jump}>
            Show in pipeline
          </button>
        )}
      </div>
      <NotePanel row={row} />
      <History kind="deals" row={row} />
    </section>
  );
}
type Placement = {
  id: string;
  stage: string;
  before: string | null;
  revision: number;
  expected_date?: string;
};
export function SalesWorkspace({ id, onBoard }: { id: string; onBoard: boolean }) {
  const nav = useNavigate(),
    location = useLocation(),
    open = useContext(Commands),
    { dataset, refresh } = useContext(Session);
  const selected = onBoard ? new URLSearchParams(location.search).get('deal') || '' : id;
  const result = useRead<Board>(onBoard ? '/pipeline' : null),
    board = result?.value;
  const [error, setError] = useState(''),
    [placement, setPlacement] = useState<Placement>(),
    [moving, setMoving] = useState(false);
  const returnFocus = useRef(''),
    dragged = useRef('');
  const card = (key: string) => document.getElementById('card-' + key);
  useEffect(() => {
    if (!onBoard || !board) return;
    if (selected) card(selected)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    else if (returnFocus.current) {
      card(returnFocus.current)?.focus();
      returnFocus.current = '';
    }
  }, [onBoard, selected, board]);
  function close() {
    returnFocus.current = selected;
    nav(onBoard ? '/pipeline' : '/deals');
  }
  function jump(key: string) {
    nav('/pipeline?' + new URLSearchParams({ deal: key }));
  }
  async function move(target: Placement) {
    if (moving) return;
    setMoving(true);
    setError('');
    try {
      await api('/pipeline/move', 'POST', target, dataset);
      setPlacement(undefined);
      refresh();
    } catch (e) {
      setError((e as Error).message);
      setPlacement(undefined);
      refresh();
    } finally {
      setMoving(false);
    }
  }
  const cards = board ? Object.values(board.columns).flatMap((l) => l.cards) : [];
  function drop(target: Placement) {
    if (!target.id || target.id === target.before) return;
    if (stages.indexOf(target.stage) < 4 && !cards.find((c) => c.id === target.id)?.expected_date)
      setPlacement(target);
    else void move(target);
  }
  return (
    <>
      <header className={'page-head ' + (onBoard ? 'board-header' : '')}>
        <div>
          <h1>{onBoard ? 'Pipeline' : 'Deal workspace'}</h1>
          {onBoard && <p>Move deals between stages or change their order</p>}
        </div>
        {onBoard && (
          <button className="button" onClick={() => open({ kind: 'deals', type: 'edit' })}>
            Add deal
          </button>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      {onBoard && board && <Stats totals={board.totals} />}
      <div className={'sales-workspace ' + (onBoard && selected ? 'docked' : '')}>
        {onBoard &&
          (!board ? (
            <ReadState error={result?.error} />
          ) : (
            <div className="board-overflow">
              <div className="board">
                {stages.map((stage, i) => {
                  const lane = board.columns[stage];
                  return (
                    <section
                      className="lane"
                      aria-label={stage}
                      key={stage}
                      style={{ '--stage': colors[i] } as CSSProperties}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        drop({
                          id: e.dataTransfer.getData('text/plain') || dragged.current,
                          stage,
                          before: null,
                          revision: board.revision,
                        });
                      }}
                    >
                      <div className="lane-head">
                        <div className="lane-title">
                          <h3>{stage}</h3>
                          <span className="count">{lane.cards.length}</span>
                        </div>
                        <p className="lane-stat">
                          {i < 4 ? 'Value' : 'Closed value'}{' '}
                          <span className="numbers">{money(lane.totals.value)}</span>
                        </p>
                        {i < 4 && (
                          <p className="lane-stat">
                            Expected <span className="numbers">{money(lane.totals.expected)}</span>
                          </p>
                        )}
                        <button
                          className="lane-add"
                          onClick={() =>
                            open({
                              type: 'edit',
                              kind: 'deals',
                              initial: { stage, probability: String(probabilities[i]) },
                            })
                          }
                        >
                          + Add deal
                        </button>
                      </div>
                      <div className="lane-cards">
                        {lane.cards.map((r, index) => (
                          <article
                            className={'deal-card ' + (selected === r.id ? 'is-selected-deal' : '')}
                            key={r.id}
                            draggable
                            onDragStart={(e) => {
                              dragged.current = r.id;
                              e.dataTransfer.setData('text/plain', r.id);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const bounds = e.currentTarget.getBoundingClientRect();
                              const before =
                                e.clientY > bounds.top + bounds.height / 2
                                  ? lane.cards[index + 1]?.id
                                  : r.id;
                              drop({
                                id: e.dataTransfer.getData('text/plain') || dragged.current,
                                stage,
                                before: before || null,
                                revision: board.revision,
                              });
                            }}
                          >
                            <button
                              id={'card-' + r.id}
                              className="text-link deal-title"
                              onClick={() => jump(r.id)}
                            >
                              {r.name}
                            </button>
                            <p className="deal-org">{r.organization || r.contact}</p>
                            <div className="deal-value numbers">
                              <strong>{money(r.value_cents)}</strong>
                              {r.probability}%
                            </div>
                            <div className="deal-meta">
                              <time>{r.close_date}</time>
                              {r.late && <span className="late">Late</span>}
                            </div>
                            <div className="note-count">
                              {r.note_count} {r.note_count === 1 ? 'note' : 'notes'}{' '}
                              <button
                                className="move"
                                aria-label={'Move ' + r.name}
                                onClick={() =>
                                  setPlacement({
                                    id: r.id,
                                    stage,
                                    before: lane.cards[index + 1]?.id || null,
                                    revision: board.revision,
                                  })
                                }
                              >
                                Move
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ))}
        <div className="deal-dock" hidden={!selected}>
          {selected && (
            <DealPanel
              key={selected}
              id={selected}
              onBoard={onBoard}
              close={close}
              jump={() => jump(selected)}
            />
          )}
        </div>
      </div>
      {placement && board && (
        <Modal title="Move deal" close={() => setPlacement(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void move(placement);
            }}
          >
            <label>
              Destination stage
              <select
                aria-label="Destination stage"
                value={placement.stage}
                onChange={(e) =>
                  setPlacement({ ...placement, stage: e.target.value, before: null })
                }
              >
                {stages.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Position
              <select
                aria-label="Position"
                value={placement.before || ''}
                onChange={(e) => setPlacement({ ...placement, before: e.target.value || null })}
              >
                <option value="">End of column</option>
                {board.columns[placement.stage].cards
                  .filter((c) => c.id !== placement.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      Before {c.name}
                    </option>
                  ))}
              </select>
            </label>
            {stages.indexOf(placement.stage) < 4 &&
              !cards.find((c) => c.id === placement.id)?.expected_date && (
                <label>
                  Expected close date
                  <input
                    required
                    type="date"
                    onChange={(e) => setPlacement({ ...placement, expected_date: e.target.value })}
                  />
                </label>
              )}
            <Actions label="Move" close={() => setPlacement(undefined)} disabled={moving} />
          </form>
        </Modal>
      )}
    </>
  );
}
