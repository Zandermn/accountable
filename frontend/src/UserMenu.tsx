import { useId, useRef, useState } from 'react';
import type { Account } from './auth';
import { useTheme, type ThemeChoice } from './theme';
import './user-menu.css';

const themes: [ThemeChoice, string][] = [
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['system', 'System'],
];

export function UserMenu({ account }: { account: Account }) {
  const { user, signOut } = account;
  const metadata = user.user_metadata;
  const name = [metadata.display_name, metadata.full_name, metadata.name]
    .find((value): value is string => typeof value === 'string' && !!value.trim())
    ?.trim();
  const email = user.email || '';
  const words = (name || email.split('@')[0]).split(/[\s._-]+/).filter(Boolean);
  const initials = (
    words.length > 1 ? words[0][0] + words.at(-1)![0] : words[0]?.slice(0, 2) || '?'
  ).toUpperCase();
  const { theme, error, busy, select, retry } = useTheme();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);

  async function leave() {
    setLeaving(true);
    setSignOutError('');
    try {
      await signOut();
    } catch {
      setSignOutError('Could not sign out. Try again.');
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div
      className="user-menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="user-menu-button"
        aria-label={'User menu for ' + (name || email || 'this account')}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
      >
        {initials}
      </button>
      {open && (
        <section className="user-menu-panel" id={menuId} aria-label="Account options">
          <fieldset>
            <legend>Theme</legend>
            {themes.map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name={menuId + '-theme'}
                  value={value}
                  checked={theme === value}
                  aria-disabled={busy}
                  onChange={() => {
                    if (!busy) select(value);
                  }}
                />
                {label}
              </label>
            ))}
          </fieldset>
          {busy && <p role="status">Saving theme…</p>}
          {error && (
            <>
              <p role="alert">{error}</p>
              <button type="button" className="text-link" onClick={retry}>
                Retry theme
              </button>
            </>
          )}
          <button type="button" className="button subtle" disabled={leaving} onClick={leave}>
            Sign out
          </button>
          {signOutError && <p role="alert">{signOutError}</p>}
        </section>
      )}
    </div>
  );
}
