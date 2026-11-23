import { createContext, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  detailPath,
  fields,
  heading,
  labels,
  money,
  ReadState,
  recordPath,
  singular,
  ShortDate,
  useRead,
  type Row,
} from './data';
import type { Action } from './dialogs';
export const Commands = createContext<(action: Omit<Action, 'dataset'>) => void>(() => {});
const columns: Record<string, string[]> = {
  organizations: ['name', 'industry', 'website', 'contacts_count', 'deals_count'],
  contacts: ['name', 'status', 'organization', 'email', 'phone'],
  deals: ['name', 'stage', 'value_cents', 'probability', 'close_date', 'organization', 'contact'],
};
export function cell(row: Row, key: string) {
  if (key === 'value_cents') return <span className="numbers">{money(row.value_cents)}</span>;
  if (key === 'probability') return <span className="numbers">{row.probability}%</span>;
  if (key === 'stage' || key === 'status') return <span className="record-status">{row[key]}</span>;
  if (key === 'website' && row.website)
    return (
      <a href={row.website} target="_blank" rel="noreferrer">
        {row.website.replace(/^https?:\/\//i, '')}
      </a>
    );
  if (key === 'close_date')
    return (
      <>
        <ShortDate value={row.close_date} /> {row.late && <span className="late">Late</span>}
      </>
    );
  if (key === 'organization' && row.organization)
    return <Link to={detailPath('organizations', row.organization_id)}>{row.organization}</Link>;
  if (key === 'contact' && row.contact)
    return <Link to={detailPath('contacts', row.contact_id)}>{row.contact}</Link>;
  return String(row[key as keyof Row] ?? '—');
}
export function Directory({ kind }: { kind: string }) {
  const open = useContext(Commands);
  const [search, searchFor] = useState(''),
    [sort, setSort] = useState('name'),
    [direction, setDirection] = useState('asc'),
    [status, filter] = useState('');
  const query = new URLSearchParams({ search, sort, direction, status });
  const result = useRead<Row[]>(recordPath(kind) + '?' + query);
  function order(key: string) {
    setDirection(sort === key && direction === 'asc' ? 'desc' : 'asc');
    setSort(key);
  }
  return (
    <>
      <header className="page-head">
        <h1>{heading(kind)}</h1>
        <button className="button add" onClick={() => open({ type: 'edit', kind })}>
          Add {singular[kind]}
        </button>
      </header>
      <section className="panel directory-panel">
        <div className="directory-tools">
          <input
            type="search"
            aria-label={'Search ' + kind}
            placeholder={'Search ' + kind}
            value={search}
            onChange={(e) => searchFor(e.target.value)}
          />
          {kind === 'contacts' && (
            <select
              aria-label="Status filter"
              value={status}
              onChange={(e) => filter(e.target.value)}
            >
              <option value="">All statuses</option>
              {['Lead', 'Qualified', 'Customer'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          {result?.value && <span className="directory-count muted" aria-live="polite">
            {result.value.length} {result.value.length === 1 ? 'record' : 'records'}
          </span>}
        </div>
        {!result?.value ? (
          <ReadState error={result?.error} />
        ) : !result.value.length ? (
          <ReadState empty={search || status ? 'No matching records.' : 'No ' + kind + ' yet.'} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns[kind].map((k) => (
                    <th
                      key={k}
                      aria-sort={
                        sort === k ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                    >
                      <button onClick={() => order(k)}>
                        {labels[k]} {sort === k ? (direction === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.value.map((row) => (
                  <tr key={row.id}>
                    {columns[kind].map((k) => (
                      <td key={k}>
                        {k === 'name' ? (
                          <Link to={detailPath(kind, row.id)}>{row.name}</Link>
                        ) : (
                          cell(row, k)
                        )}
                      </td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <button onClick={() => open({ type: 'edit', kind, row })}>Edit</button>
                        <button onClick={() => open({ type: 'delete', kind, row })}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
export function History({ kind, row }: { kind: string; row: Row }) {
  const open = useContext(Commands);
  return (
    <section className="related">
      <div className="panel-head">
        <h2>Timeline</h2>
        <button
          className="button subtle"
          onClick={() =>
            open({
              type: 'edit',
              kind: 'activities',
              initial: { [kind === 'deals' ? 'deal_id' : 'contact_id']: row.id },
            })
          }
        >
          Log activity
        </button>
      </div>
      {!row.timeline.length && <p>No activities yet.</p>}
      {row.timeline.map((a) => (
        <article className="history" key={a.id}>
          <div className="history-entry">
            <strong>{a.type !== 'Stage' && a.type + ' · '}<span>{a.description}</span></strong>
            <time dateTime={a.occurred_at} title={new Date(a.occurred_at).toLocaleString()}>
              {new Date(a.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </time>
          </div>
          {a.follow_up && (
            <p>
              Follow-up {a.follow_up} · {a.done ? 'Complete' : 'Open'}
            </p>
          )}
          {a.type !== 'Stage' && (
            <div className="row-actions">
              <button onClick={() => open({ type: 'edit', kind: 'activities', row: a })}>
                Edit activity
              </button>
              <button onClick={() => open({ type: 'delete', kind: 'activities', row: a })}>
                Delete activity
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
export function Details({ kind, id }: { kind: string; id: string }) {
  const result = useRead<Row>(recordPath(kind, id));
  const open = useContext(Commands);
  if (!result?.value) return <ReadState error={result?.error} />;
  const row = result.value;
  return (
    <>
      <header className="page-head">
        <div>
          <Link to={'/' + kind}>{heading(kind)}</Link>
          <h1>{row.name}</h1>
        </div>
        <button className="button" onClick={() => open({ type: 'edit', kind, row })}>
          Edit {singular[kind]}
        </button>
      </header>
      <section className="panel detail-grid">
        <dl>
          {fields[kind]
            .filter((k) => k !== 'name' && !k.endsWith('_id'))
            .map((k) => (
              <div key={k}>
                <dt>{labels[k]}</dt>
                <dd>{cell(row, k)}</dd>
              </div>
            ))}
        </dl>
        <section className="related">
          <h2>Linked records</h2>
          {row.related.length ? (
            row.related.map((r) => (
              <p key={r.id}>
                <Link to={detailPath(r.kind, r.id)}>{r.name}</Link> · {singular[r.kind]}
              </p>
            ))
          ) : (
            <p>No linked records.</p>
          )}
        </section>
        {kind !== 'organizations' && <History kind={kind} row={row} />}
      </section>
    </>
  );
}
export function Trash() {
  const open = useContext(Commands),
    [kind, setKind] = useState(''),
    [direction, setDirection] = useState('desc');
  const result = useRead<Row[]>('/trash?' + new URLSearchParams({ kind, direction }));
  return (
    <>
      <header className="page-head">
        <h1>Trash</h1>
      </header>
      <section className="panel">
        <div className="directory-tools">
          <label>
            Record type{' '}
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All types</option>
              {Object.keys(fields).map((k) => (
                <option key={k} value={k}>
                  {heading(k)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button subtle"
            onClick={() => setDirection(direction === 'desc' ? 'asc' : 'desc')}
          >
            {direction === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
        {!result?.value ? (
          <ReadState error={result?.error} />
        ) : !result.value.length ? (
          <ReadState empty="Trash is empty for this selection." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Record</th>
                <th>Type</th>
                <th>Deleted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {result.value.map((row) => (
                <tr key={row.id}>
                  <td>{row.name || row.description}</td>
                  <td>{singular[row.kind]}</td>
                  <td>{new Date(row.deleted_at).toLocaleString()}</td>
                  <td>
                    <button onClick={() => open({ type: 'restore', kind: row.kind, row })}>
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
