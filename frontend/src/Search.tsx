import { Search as SearchIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { detailPath, heading, singular, useApi, type LinkRow } from './data';
import './search.css';

export function Search() {
  const api = useApi();
  const navigate = useNavigate();
  const listId = useId();
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ rows?: LinkRow[] }>();
  const term = query.trim();

  useEffect(() => {
    if (!open || !term) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const rows = await api<LinkRow[]>(
          '/search?' + new URLSearchParams({ q: term }),
          'GET',
          undefined,
          undefined,
          controller.signal,
        );
        if (!controller.signal.aborted) setResult({ rows });
      } catch {
        if (!controller.signal.aborted) setResult({});
      }
    }, 130);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, open, term]);

  function close(clear = false) {
    setOpen(false);
    setResult(undefined);
    if (clear) setQuery('');
  }

  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      field.current?.focus();
      close();
    }
    if (!open || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const links = Array.from(list.current?.querySelectorAll('a') ?? []);
    if (!links.length) return;
    event.preventDefault();
    const current = links.findIndex((link) => link === document.activeElement);
    const offset = event.key === 'ArrowDown' ? 1 : -1;
    const index =
      current < 0
        ? offset > 0
          ? 0
          : links.length - 1
        : (current + offset + links.length) % links.length;
    links[index]?.focus();
  }

  return (
    <div
      className="global-search"
      onKeyDown={keys}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <label className="global-search-field">
        <SearchIcon size={18} aria-hidden="true" />
        <input
          ref={field}
          type="search"
          aria-label="Search records"
          placeholder="Search records"
          aria-controls={open && term ? listId : undefined}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            if (event.target.value.trim() !== term) setResult(undefined);
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
      </label>
      {open && term && (
        <div className="global-search-results" id={listId}>
          {!result ? (
            <p role="status">Searching…</p>
          ) : !result.rows ? (
            <p role="alert">Could not search. Try again.</p>
          ) : !result.rows.length ? (
            <p role="status">No matching records.</p>
          ) : (
            <ul ref={list} aria-label="Matching records">
              {result.rows.map((row) => {
                const path = detailPath(row.kind, row.id);
                return (
                  <li key={row.kind + ':' + row.id}>
                    <Link
                      to={path}
                      onClick={() => close(true)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          close(true);
                          navigate(path);
                        }
                      }}
                    >
                      <strong>{row.name}</strong>
                      <small>{heading(singular[row.kind])}</small>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
