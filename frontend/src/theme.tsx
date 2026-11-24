import { createContext, useEffect, useState, type ReactNode } from 'react';
import { api, ReadState } from './data';

type Mode = 'light' | 'dark';
type Preference = { theme: Mode };
const preferencePath = '/preferences/theme';
export const ThemeMode = createContext<Mode>('light');

function applyTheme(theme: Mode) {
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function Theme({ children }: { children: (control: ReactNode) => ReactNode }) {
  const [theme, setTheme] = useState<Mode>();
  const [readFailed, setReadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(true);
  const [attempt, retry] = useState(0);

  useEffect(() => {
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function read() {
      try {
        const preference = await api<Preference>(preferencePath);
        if (active) {
          setTheme(applyTheme(preference.theme));
          setReadFailed(false);
        }
      } catch {
        if (active) {
          setTheme(applyTheme('light'));
          setReadFailed(true);
        }
      } finally {
        if (active) setReading(false);
      }
    }
    void read();
    return () => {
      active = false;
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
    setSaveFailed(false);
    setSaving(true);
    setTheme(applyTheme(next));
    try {
      await api<Preference>(preferencePath, 'PUT', { theme: next });
      setReadFailed(false);
    } catch {
      setTheme(applyTheme(currentTheme));
      setSaveFailed(true);
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
                  setSaveFailed(false);
                  retry((count) => count + 1);
                }}
              >
                Retry theme
              </button>
            </div>
          )}
          {saveFailed && <p role="alert">Could not save the theme. Try again.</p>}
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
