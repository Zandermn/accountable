import { useContext, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  detailPath,
  Failure,
  fields,
  heading,
  idSegment,
  labels,
  localTime,
  probabilities,
  recordPath,
  Session,
  singular,
  stages,
  useRead,
  type Impact,
  type Row,
} from './data';

export type Action = {
  type: 'edit' | 'delete' | 'restore';
  kind: string;
  row?: Row;
  initial?: Record<string, string>;
  dataset: number;
};
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current!;
    const opener = document.activeElement as HTMLElement;
    element.showModal();
    return () => {
      element.close();
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
export function Actions({
  close,
  label,
  disabled = false,
}: {
  close: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="dialog-actions">
      <button type="button" className="button subtle" onClick={close}>
        Cancel
      </button>
      <button className="button" disabled={disabled}>
        {label}
      </button>
    </div>
  );
}
export function RecordDialog({ action, close }: { action: Action; close: () => void }) {
  const { dataset, refresh } = useContext(Session);
  const { kind, row, initial } = action;
  const [values, set] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {
      status: 'Lead',
      stage: 'New',
      probability: '10',
      type: 'Note',
      occurred_at: localTime(new Date().toISOString()),
      ...initial,
    };
    if (row) for (const field of fields[kind]) v[field] = String(row[field as keyof Row] ?? '');
    if (row && kind === 'deals') v.value_cents = (row.value_cents / 100).toFixed(2);
    if (row && kind === 'activities') v.occurred_at = localTime(row.occurred_at);
    return v;
  });
  const [error, setError] = useState<Failure>();
  const [busy, setBusy] = useState(false);
  const [updatedImpact, setImpact] = useState<Impact>();
  const orgs = useRead<Row[]>(
    ['contacts', 'deals'].includes(kind) ? '/records/organizations' : null,
  );
  const contacts = useRead<Row[]>(kind === 'deals' ? '/records/contacts' : null);
  const deletePreviewPath =
    action.type === 'delete' && row ? recordPath(kind, row.id) + '/delete-preview' : null;
  useEffect(() => {
    if (!deletePreviewPath) return;
    let active = true;
    api<Impact>(deletePreviewPath).then(
      (value) => {
        if (active) setImpact(value);
      },
      (err) => {
        if (active) setError(err);
      },
    );
    return () => {
      active = false;
    };
  }, [deletePreviewPath]);
  const impact = updatedImpact;
  const stale = dataset !== action.dataset;
  const title =
    action.type === 'edit'
      ? (row ? 'Edit ' : 'Add ') + singular[kind]
      : heading(action.type) + ' ' + singular[kind];
  function change(key: string, val: string) {
    set((v) => ({
      ...v,
      [key]: val,
      ...(key === 'stage'
        ? {
            probability:
              row?.stage === val
                ? String(row.probability)
                : String(probabilities[stages.indexOf(val)]),
          }
        : {}),
    }));
    setError(undefined);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (stale || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      if (action.type === 'delete')
        await api(
          recordPath(kind, row!.id),
          'DELETE',
          { revision: impact!.revision },
          action.dataset,
        );
      else if (action.type === 'restore') {
        const body: Record<string, string | null> = { deletion: row!.deletion };
        if (kind === 'contacts' && row!.former.organization_id)
          body.organization_choice =
            values.organization_choice ||
            (row!.former.organization_id.active ? 'previous' : 'individual');
        if (kind === 'deals')
          for (const key of ['organization_id', 'contact_id'])
            body[key] =
              values['restore_' + key] ?? (row!.former[key]?.active ? row!.former[key].id : null);
        for (const key of Object.keys(body)) if (body[key] === '') body[key] = null;
        await api('/trash/' + kind + '/' + idSegment(row!.id), 'POST', body, action.dataset);
      } else {
        const body: Record<string, unknown> = {};
        for (const key of fields[kind]) body[key] = values[key] || null;
        if (kind === 'deals') {
          const amount = values.value_cents || '';
          if (!/^\d+(\.\d{1,2})?$/.test(amount))
            throw new Failure(
              'Enter a nonnegative amount with up to two decimal places.',
              'value_cents',
            );
          body.value_cents = Math.round(Number(amount) * 100);
          if (!values.probability)
            throw new Failure('Enter a probability from 0 to 100.', 'probability');
          body.probability = Number(values.probability);
        }
        if (kind === 'activities') {
          if (!values.occurred_at)
            throw new Failure('Enter the time of occurrence.', 'occurred_at');
          if (row && values.occurred_at === localTime(row.occurred_at)) delete body.occurred_at;
          else body.occurred_at = new Date(values.occurred_at).toISOString();
          if (!row) Object.assign(body, initial);
        }
        await api(recordPath(kind, row?.id), row ? 'PATCH' : 'POST', body, action.dataset);
      }
      refresh();
      close();
    } catch (err) {
      const fail = err as Failure;
      setError(fail);
      if (fail.preview) setImpact(fail.preview);
    } finally {
      setBusy(false);
    }
  }
  function select(
    key: string,
    options: { id: string; name: string }[],
    value = values[key] || '',
    blank = false,
  ) {
    return (
      <select
        aria-label={
          labels[key.replace('restore_', '')] +
          (['status', 'type', 'stage'].includes(key) ? ' *' : '')
        }
        value={value}
        onChange={(e) => change(key, e.target.value)}
      >
        {blank && <option value="">None</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    );
  }
  function field(key: string) {
    const options: Record<string, string[]> = {
      stage: stages,
      status: ['Lead', 'Qualified', 'Customer'],
      type: ['Note', 'Call', 'Email'],
    };
    if (options[key])
      return select(
        key,
        options[key].map((s) => ({ id: s, name: s })),
      );
    if (key === 'organization_id' || key === 'contact_id')
      return select(
        key,
        (key === 'organization_id' ? orgs : contacts)?.value || [],
        undefined,
        true,
      );
    if (['description', 'notes'].includes(key))
      return <textarea value={values[key] || ''} onChange={(e) => change(key, e.target.value)} />;
    const type =
      key === 'occurred_at'
        ? 'datetime-local'
        : key.endsWith('_date') || key === 'follow_up'
          ? 'date'
          : ['value_cents', 'probability'].includes(key)
            ? 'number'
            : 'text';
    return (
      <input
        type={type}
        step={key === 'value_cents' ? '0.01' : undefined}
        value={values[key] ?? ''}
        onChange={(e) => change(key, e.target.value)}
      />
    );
  }
  return (
    <Modal title={title} close={close}>
      <form noValidate onSubmit={submit}>
        {stale ? (
          <p role="alert">The dataset was replaced. Close this form and reload the record.</p>
        ) : (
          <>
            {action.type === 'edit' &&
              fields[kind].map((key) => (
                <label key={key}>
                  {labels[key]}
                  {[
                    'name',
                    'stage',
                    'status',
                    'value_cents',
                    'probability',
                    'description',
                    'occurred_at',
                    'type',
                  ].includes(key) ||
                  (key === 'expected_date' && stages.indexOf(values.stage) < 4)
                    ? ' *'
                    : ''}
                  {field(key)}
                  {error?.field === key && <span role="alert">{error.message}</span>}
                </label>
              ))}
            {action.type === 'edit' && kind === 'deals' && row && row.stage !== values.stage && (
              <p>
                The stage change sets the probability to{' '}
                {probabilities[stages.indexOf(values.stage)]}%.
              </p>
            )}
            {action.type === 'delete' &&
              (impact ? (
                <>
                  <p>
                    {impact.blockers.length
                      ? 'These deals must be updated before deletion.'
                      : 'Move ' + impact.name + ' to Trash?'}
                  </p>
                  {impact.blockers.map((b) => (
                    <Link key={b.id} to={detailPath('deals', b.id)} onClick={close}>
                      {b.name}
                    </Link>
                  ))}
                  {impact.clear.map((r) => (
                    <p key={r.id}>{r.name} will lose its organization link.</p>
                  ))}
                  {impact.cascade.map((r) => (
                    <p key={r.id}>{r.description} will move to Trash.</p>
                  ))}
                </>
              ) : (
                <p>Checking related records…</p>
              ))}
            {action.type === 'restore' && row && (
              <>
                <p>Restore {row.name || row.description}?</p>
                {Object.entries(row.former).map(([key, r]) => (
                  <p key={key}>
                    {labels[key] || 'Owner'} · {r.name}
                    {r.active ? '' : ' (in Trash — restore this record first to use it)'}
                  </p>
                ))}
                {kind === 'contacts' && row.former.organization_id && (
                  <label>
                    Organization on restore
                    <select
                      value={
                        values.organization_choice ??
                        (row.former.organization_id.active ? 'previous' : 'individual')
                      }
                      onChange={(e) => change('organization_choice', e.target.value)}
                    >
                      <option value="previous" disabled={!row.former.organization_id.active}>
                        Previous organization
                      </option>
                      <option value="individual">Restore as individual</option>
                    </select>
                  </label>
                )}
                {kind === 'deals' &&
                  ['organization_id', 'contact_id'].map((key) => (
                    <label key={key}>
                      {labels[key]}
                      {select(
                        'restore_' + key,
                        (key === 'organization_id' ? orgs : contacts)?.value || [],
                        values['restore_' + key] ??
                          (row.former[key]?.active ? row.former[key].id : ''),
                        true,
                      )}
                    </label>
                  ))}
              </>
            )}
          </>
        )}
        {error && (!error.field || action.type !== 'edit') && <p role="alert">{error.message}</p>}
        {(orgs?.error || contacts?.error) && <p role="alert">{orgs?.error || contacts?.error}</p>}
        <Actions
          close={close}
          label={action.type === 'edit' ? 'Save' : heading(action.type)}
          disabled={
            busy || stale || (action.type === 'delete' && (!impact || !!impact.blockers.length))
          }
        />
      </form>
    </Modal>
  );
}
