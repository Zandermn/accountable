import { useEffect, useState, type FormEvent } from 'react';
import { applyTheme, devicePreference } from './theme';
import './sign-in.css';

export function SignIn({ signIn }: { signIn: (email: string, password: string) => Promise<void> }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const media = devicePreference();
    if (!media) return;
    const update = () => applyTheme(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      delete document.documentElement.dataset.theme;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      await signIn(String(fields.get('email')).trim(), String(fields.get('password')));
    } catch {
      setError('Could not sign in. Check your email and password and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sign-in-page">
      <section className="panel sign-in">
        <div className="brand">
          <span className="brand-mark" />
          Accountable
        </div>
        <h1>Sign in</h1>
        <form onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="button" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
