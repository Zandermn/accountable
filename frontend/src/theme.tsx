import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ReadState, useApi } from './data';

type Mode = 'light' | 'dark';
export type ThemeChoice = Mode | 'system';
type Preference = { theme: ThemeChoice; version: number };
type ErrorState = { message: string; next?: ThemeChoice };
const path = '/preferences/theme';
const initial: Preference = { theme: 'system', version: 0 };
export const ThemeMode = createContext<Mode>('light');
const Choice = createContext<{
  theme: ThemeChoice;
  busy: boolean;
  error: string;
  select: (mode: ThemeChoice) => void;
  retry: () => void;
}>({
  theme: initial.theme,
  busy: false,
  error: '',
  select: () => {},
  retry: () => {},
});
export const useTheme = () => useContext(Choice);

export function devicePreference() {
  return window.matchMedia?.('(prefers-color-scheme: dark)');
}

export function applyTheme(mode: Mode) {
  document.documentElement.dataset.theme = mode;
}

export function Theme({ children }: { children: ReactNode }) {
  const api = useApi();
  const saved = useRef(initial);
  const current = useRef<ThemeChoice>('system');
  const pending = useRef<AbortController | undefined>(undefined);
  const [appearance, setAppearance] = useState<{ choice: ThemeChoice; mode: Mode }>();
  const [error, setError] = useState<ErrorState>();
  const [busy, setBusy] = useState(true);

  const show = useCallback((choice: ThemeChoice) => {
    current.current = choice;
    const mode = choice === 'system' ? (devicePreference()?.matches ? 'dark' : 'light') : choice;
    applyTheme(mode);
    setAppearance({ choice, mode });
  }, []);

  const change = useCallback(
    async (next?: ThemeChoice, reload = false) => {
      if (pending.current) return;
      const controller = new AbortController();
      const { signal } = controller;
      pending.current = controller;
      if (next || reload) {
        setError(undefined);
        setBusy(true);
      }

      function finish() {
        pending.current = undefined;
        setBusy(false);
      }
      function restore(message: string) {
        show(saved.current.theme);
        setError({ message, next });
        finish();
      }

      const timer = window.setTimeout(
        () => {
          controller.abort();
          restore(
            next ? 'Could not confirm the theme save. Try again.' : 'Could not load the theme.',
          );
        },
        next ? 5000 : 3000,
      );
      signal.addEventListener('abort', () => window.clearTimeout(timer), { once: true });
      try {
        if (!next || reload) {
          const latest = await api<Preference>(path, 'GET', undefined, undefined, signal);
          if (signal.aborted) return;
          saved.current = latest;
        }
        if (next && next !== saved.current.theme) {
          show(next);
          const result = await api<Preference>(
            path,
            'PUT',
            { theme: next, version: saved.current.version },
            undefined,
            signal,
          );
          if (signal.aborted) return;
          saved.current = result;
        }
        show(saved.current.theme);
        finish();
      } catch {
        if (!signal.aborted)
          restore(next ? 'Could not save the theme. Try again.' : 'Could not load the theme.');
      } finally {
        window.clearTimeout(timer);
      }
    },
    [api, show],
  );

  useEffect(() => {
    const media = devicePreference();
    function onDeviceChange() {
      if (current.current === 'system') show('system');
    }
    media?.addEventListener('change', onDeviceChange);
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) void change();
    });
    return () => {
      mounted = false;
      pending.current?.abort();
      pending.current = undefined;
      media?.removeEventListener('change', onDeviceChange);
      delete document.documentElement.dataset.theme;
    };
  }, [change, show]);

  if (!appearance)
    return (
      <main>
        <ReadState />
      </main>
    );

  return (
    <ThemeMode.Provider value={appearance.mode}>
      <Choice.Provider
        value={{
          theme: appearance.choice,
          busy,
          error: error?.message || '',
          select: (mode) => void change(mode),
          retry: () => void change(error?.next, true),
        }}
      >
        {children}
      </Choice.Provider>
    </ThemeMode.Provider>
  );
}
