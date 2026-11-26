import { useContext, useState } from 'react';
import { Session, useApi, useDownload } from './data';

type Preview = { token: string; changes: string[] };
export function Data() {
  const { dataset, refresh } = useContext(Session);
  const api = useApi();
  const download = useDownload();
  const [file, setFile] = useState<File>(),
    [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  async function downloadWorkbook(mode: 'template' | 'export') {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const url = URL.createObjectURL(await download('/workbook/' + mode));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'accountable-' + mode + '.xlsx';
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
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => downloadWorkbook('template')}
            >
              Download template
            </button>
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => downloadWorkbook('export')}
            >
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
      </div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </>
  );
}
