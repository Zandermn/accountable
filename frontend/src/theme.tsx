import { createContext, useEffect, useState, type ReactNode } from 'react';
import { api, ReadState } from './data';

type Mode = 'light' | 'dark';
type Preference = { theme: Mode };
const preferencePath = '/preferences/theme';
const themeReadDeadlineMs = 3000;
const themeSaveDeadlineMs = 5000;
export const ThemeMode = createContext<Mode>('light');

function applyTheme(theme: Mode) {
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function Theme({ children }: { children: (control: ReactNode) => ReactNode }) {
  const [theme, setTheme] = useState<Mode>();
  const [readFailed, setReadFailed] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(true);
  const [attempt, retry] = useState(0);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    function showReadFailure() {
      setTheme(applyTheme('light'));
      setReadFailed(true);
      setReading(false);
    }

    const deadline = window.setTimeout(() => {
      controller.abort();
      showReadFailure();
    }, themeReadDeadlineMs);

    async function read() {
      try {
        const preference = await api<Preference>(
          preferencePath,
          'GET',
          undefined,
          undefined,
          signal,
        );
        if (signal.aborted) return;
        setTheme(applyTheme(preference.theme));
        setReadFailed(false);
        setReading(false);
      } catch {
        if (!signal.aborted) showReadFailure();
      } finally {
        window.clearTimeout(deadline);
      }
    }
    void read();
    return () => {
      window.clearTimeout(deadline);
      controller.abort();
    };
  }, [attempt]);

  if (!theme)
    return (
      <main>
        <ReadState />
      </main>
    );
  const currentTheme = theme;

  async function toggle() {
    if (saving || reading) return;
    const next = currentTheme === 'light' ? 'dark' : 'light';
    const signal = AbortSignal.timeout(themeSaveDeadlineMs);
    setSaveError('');
    setSaving(true);
    setTheme(applyTheme(next));
    try {
      await api<Preference>(preferencePath, 'PUT', { theme: next }, undefined, signal);
      setReadFailed(false);
    } catch {
      setTheme(applyTheme(currentTheme));
      setSaveError(
        signal.aborted
          ? 'Could not confirm the theme save. Reload to check or try again.'
          : 'Could not save the theme. Try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemeMode.Provider value={theme}>
      {children(
        <header className="top-bar">
          {readFailed && (
            <div className="theme-message">
              <p role="alert">Could not load the theme.</p>
              <button
                type="button"
                className="text-link"
                disabled={reading || saving}
                onClick={() => {
                  setReading(true);
                  setSaveError('');
                  retry((count) => count + 1);
                }}
              >
                Retry theme
              </button>
            </div>
          )}
          {saveError && <p role="alert">{saveError}</p>}
          <button
            type="button"
            className="theme-toggle"
            role="switch"
            aria-label="Theme (dark mode)"
            aria-checked={theme === 'dark'}
            aria-disabled={saving || reading}
            onClick={toggle}
          >
            <span>Theme</span>
            <strong aria-hidden="true">{theme === 'dark' ? 'Dark' : 'Light'}</strong>
          </button>
        </header>,
      )}
    </ThemeMode.Provider>
  );
}
