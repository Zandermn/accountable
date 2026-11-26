import {
  createClient,
  type Session as AuthSession,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiContext, createApi, Failure, ReadState } from './data';
import { SignIn } from './SignIn';

type AuthConfig = { url: string; publishableKey: string };
export type Account = {
  user: Pick<User, 'id' | 'email' | 'user_metadata'>;
  signOut: () => Promise<void>;
};

export function Auth({ children }: { children: (account: Account) => ReactNode }) {
  const [client, setClient] = useState<SupabaseClient>();
  const [error, setError] = useState('');
  const [attempt, retry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]);
    async function connect() {
      try {
        const response = await fetch('/auth-config', { signal });
        if (!response.ok) throw new Error();
        const { url, publishableKey } = (await response.json()) as AuthConfig;
        if (signal.aborted) return;
        setClient(
          createClient(url, publishableKey, {
            auth: {
              detectSessionInUrl: false,
              storage: window.localStorage,
            },
          }),
        );
      } catch {
        if (!controller.signal.aborted) setError('Could not connect to sign-in. Try again.');
      }
    }
    void connect();
    return () => controller.abort();
  }, [attempt]);

  if (!client)
    return (
      <main className="sign-in-page">
        <div className="panel sign-in">
          <ReadState error={error} />
          {error && (
            <button
              className="button"
              onClick={() => {
                setError('');
                retry((n) => n + 1);
              }}
            >
              Retry
            </button>
          )}
        </div>
      </main>
    );
  return <AuthGate client={client}>{children}</AuthGate>;
}

function AuthGate({
  client,
  children,
}: {
  client: SupabaseClient;
  children: (account: Account) => ReactNode;
}) {
  const [session, setSession] = useState<AuthSession | null>();
  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => data.subscription.unsubscribe();
  }, [client]);

  if (session === undefined)
    return (
      <main className="sign-in-page">
        <ReadState />
      </main>
    );
  if (!session)
    return (
      <SignIn
        signIn={async (email, password) => {
          const { error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }}
      />
    );

  return (
    <AccountSession key={session.user.id} client={client} user={session.user}>
      {children}
    </AccountSession>
  );
}

function AccountSession({
  client,
  user,
  children,
}: {
  client: SupabaseClient;
  user: User;
  children: (account: Account) => ReactNode;
}) {
  const api = useMemo(
    () =>
      createApi(async () => {
        const {
          data: { session },
        } = await client.auth.getSession();
        if (session?.user.id !== user.id) throw new Failure('Sign in to continue.');
        return session.access_token;
      }),
    [client, user.id],
  );
  async function signOut() {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }
  return <ApiContext.Provider value={api}>{children({ user, signOut })}</ApiContext.Provider>;
}
