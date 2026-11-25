import { FirebaseError } from 'firebase/app';
import { Lock, Mail, User, Wind } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

function mapAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password. Please double-check and try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try signing in instead.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before finishing.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase Console → Authentication → Settings.';
      case 'auth/operation-not-allowed':
      case 'auth/configuration-not-found':
        return 'Firebase Authentication providers are not enabled yet on this project.';
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
}

const INPUT_CLASS =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pr-3 pl-9 text-sm text-zinc-950 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500';

export function LoginPage() {
  useDocumentTitle('Sign In | BreatheWise AI');
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? APP_ROUTES.HOME;

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      {/* Subtle YC-style ambient radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-3xl dark:bg-emerald-500/10"
      />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="relative w-full max-w-md shadow-lg dark:shadow-none">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-zinc-950">
            <Wind className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">
            {mode === 'signin' ? 'Sign in to BreatheWise AI' : 'Create your family account'}
          </CardTitle>
          <CardDescription>
            Know Your Air. Protect Your Family. Make Every Action Count.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={submitting}
            onClick={handleGoogleSignIn}
          >
            Continue with Google
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            <span className="bg-white px-3 text-xs text-zinc-400 dark:bg-zinc-900">
              or with email
            </span>
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' ? (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Your Name
                </span>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-zinc-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Amina Sharma"
                    className={INPUT_CLASS}
                  />
                </div>
              </label>
            ) : null}

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Email</span>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={INPUT_CLASS}
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Password
              </span>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={INPUT_CLASS}
                />
              </div>
            </label>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === 'signin' ? 'signup' : 'signin');
              }}
              className="cursor-pointer font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          <p className="rounded-xl bg-zinc-100/80 p-3 text-center text-[11px] text-zinc-500 dark:bg-zinc-950/70 dark:text-zinc-400">
            Your family profile stays private and is used solely to personalize clean-air guidance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
