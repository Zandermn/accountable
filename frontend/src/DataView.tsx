import { useContext, useState } from 'react';
import { api, ReadState, Session, useRead } from './data';
import { Modal } from './dialogs';

type Backup = { id: string; created_at: string };
type Preview = { token: string; changes: string[] };
export function Data() {
  const { dataset, refresh } = useContext(Session);
  const backups = useRead<Backup[]>('/backups');
  const [selected, select] = useState<Backup>(),
    [token, setToken] = useState('');
  const [file, setFile] = useState<File>(),
    [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  async function downloadWorkbook() {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const response = await fetch('/api/workbook/export');
      if (!response.ok) {
        const problem = await response.json();
        throw new Error(problem.message || 'Export failed. Try again.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'accountable-export.xlsx';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exchange(apply: boolean) {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      if (apply && preview) form.append('token', preview.token);
      const response = await api<Preview>(
        '/workbook/' + (apply ? 'apply' : 'preview'),
        'POST',
        form,
        dataset,
      );
      if (apply) {
        setMessage('Imported ' + response.changes.length + ' records.');
        setPreview(undefined);
        refresh();
      } else setPreview(response);
    } catch (e) {
      setError((e as Error).message);
      setPreview(undefined);
    } finally {
      setBusy(false);
    }
  }
  async function confirm(cancel = false) {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    const path = '/backups/' + selected.id;
    try {
      if (cancel) {
        if (token) await api(path + '/cancel', 'POST', { token }, dataset);
        select(undefined);
        setToken('');
      } else if (!token) {
        const result = await api<{ token: string }>(path + '/confirm', 'POST', undefined, dataset);
        setToken(result.token);
      } else {
        await api(path, 'DELETE', { token }, dataset);
        select(undefined);
        setToken('');
        setMessage('Backup deleted.');
        refresh();
      }
    } catch (e) {
      setError((e as Error).message);
      select(undefined);
      setToken('');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="page-head">
        <h1>Data</h1>
      </header>
      <div className="data-layout">
        <section className="panel">
          <h2>Spreadsheet exchange</h2>
          <p>Import active organizations, contacts, and deals from an Excel workbook.</p>
          <div className="row-actions">
            <a className="button subtle" href="/api/workbook/template" download>
              Download template
            </a>
            <button className="button subtle" disabled={busy} onClick={downloadWorkbook}>
              Export workbook
            </button>
          </div>
          <label>
            Workbook{' '}
            <input
              type="file"
              accept=".xlsx"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0]);
                setPreview(undefined);
                setMessage('');
                setError('');
              }}
            />
          </label>
          <button className="button" disabled={!file || busy} onClick={() => exchange(false)}>
            Preview import
          </button>
          {preview && (
            <section className="related">
              <h3>Import preview</h3>
              <ul>
                {preview.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <div className="row-actions">
                <button
                  className="button subtle"
                  disabled={busy}
                  onClick={() => setPreview(undefined)}
                >
                  Cancel import
                </button>
                <button className="button" disabled={busy} onClick={() => exchange(true)}>
                  Apply import
                </button>
              </div>
            </section>
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Local backups</h2>
            <button className="button subtle" onClick={refresh}>
              Refresh backups
            </button>
          </div>
          <p>
            Use <code>npm run save</code> for a full backup. Use{' '}
            <code>npm run load -- &lt;backup-id&gt;</code> to restore it.
          </p>
          {!backups?.value ? (
            <ReadState error={backups?.error} />
          ) : !backups.value.length ? (
            <p>No saved backups.</p>
          ) : (
            <ul className="backup-list">
              {backups.value.map((b) => (
                <li key={b.id}>
                  <time>{new Date(b.created_at).toLocaleString()}</time>
                  <code>{b.id}</code>
                  <button
                    className="button subtle"
                    onClick={() => {
                      select(b);
                      setToken('');
                      setError('');
                    }}
                  >
                    Delete backup
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {selected && (
        <Modal
          key={token || 'first'}
          title={token ? 'Confirm permanent deletion' : 'Delete backup'}
          close={() => confirm(true)}
        >
          <p>{token ? 'Permanently delete this backup?' : 'Remove this saved backup?'}</p>
          <p>
            <code>{selected.id}</code>
          </p>
          <div className="dialog-actions">
            <button className="button subtle" disabled={busy} onClick={() => confirm(true)}>
              Cancel
            </button>
            <button className="button danger" disabled={busy} onClick={() => confirm()}>
              {token ? 'Delete permanently' : 'Continue'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
