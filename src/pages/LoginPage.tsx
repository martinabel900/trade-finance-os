import { ArrowRight, BarChart3, BriefcaseBusiness, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { firebaseReady } from '../firebase';
import { useAuth } from '../state/useAuth';

export default function LoginPage() {
  const { currentUser, loading: authLoading, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-4 text-sm text-steel">
        <div className="flex items-center gap-3 rounded border border-line bg-white px-4 py-3 shadow-soft">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-mint" />
          Loading secure workspace
        </div>
      </main>
    );
  }

  if (currentUser) {
    return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(480px,1fr)]">
        <section className="hidden border-r border-line bg-navy text-white lg:flex lg:flex-col lg:justify-between">
          <div className="px-12 py-10">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded bg-white/12 ring-1 ring-white/20">
                <BarChart3 size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Trade Finance OS</h1>
              </div>
            </div>
          </div>

          <div className="px-12">
            <p className="max-w-lg text-4xl font-semibold leading-tight">
              Controlled outreach, import tracking, and queued email operations.
            </p>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/70">
              Secure access for campaign management, contact review, and outbound queue monitoring.
            </p>
          </div>

          <div className="grid gap-3 px-12 py-10">
            <div className="flex items-center gap-3 rounded border border-white/12 bg-white/8 px-4 py-3">
              <ShieldCheck size={18} className="shrink-0 text-white/80" />
              <span className="text-sm text-white/76">Firebase authenticated workspace</span>
            </div>
            <div className="flex items-center gap-3 rounded border border-white/12 bg-white/8 px-4 py-3">
              <BriefcaseBusiness size={18} className="shrink-0 text-white/80" />
              <span className="text-sm text-white/76">Built for trade finance recovery operations</span>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[440px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid h-11 w-11 place-items-center rounded bg-navy text-white">
                <BarChart3 size={22} />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Trade Finance OS</h1>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded border border-line bg-white p-6 shadow-soft sm:p-8">
              <div className="mb-8">
                <p className="text-sm font-medium text-steel">Secure sign in</p>
                <h2 className="mt-2 text-3xl font-semibold">Welcome back</h2>
                <p className="mt-3 text-sm leading-6 text-steel">
                  Access your contacts, campaign queues, and workflow.
                </p>
              </div>

              {!firebaseReady ? (
                <p className="mb-5 rounded border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber">
                  Add Firebase web config values to `.env` before signing in.
                </p>
              ) : null}

              <label className="block">
                <span className="text-xs font-semibold uppercase text-steel">Email</span>
                <div className="mt-2 flex items-center rounded border border-line bg-white px-3 focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/25">
                  <Mail size={18} className="shrink-0 text-steel" />
                  <input
                    type="email"
                    value={email}
                    required
                    autoComplete="email"
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full border-0 bg-transparent px-3 py-3 text-sm outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </label>

              <label className="mt-5 block">
                <span className="text-xs font-semibold uppercase text-steel">Password</span>
                <div className="mt-2 flex items-center rounded border border-line bg-white px-3 focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/25">
                  <LockKeyhole size={18} className="shrink-0 text-steel" />
                  <input
                    type="password"
                    value={password}
                    required
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full border-0 bg-transparent px-3 py-3 text-sm outline-none"
                    placeholder="Enter your password"
                  />
                </div>
              </label>

              {error ? (
                <p className="mt-5 rounded border border-rose/25 bg-rose/10 px-3 py-2 text-sm text-rose">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading || !firebaseReady}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in' : 'Sign in'}
                {!loading ? <ArrowRight size={17} /> : null}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-steel">
              Authorized users only. No registration is available from this screen.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
