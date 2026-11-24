import { FirebaseError } from 'firebase/app';
import { Lock, Mail, User, Wind } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

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
        return 'This sign-in provider is not enabled yet in Firebase Console → Authentication.';
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
}

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-xs">
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
            <div className="w-full border-t border-slate-200" />
            <span className="bg-white px-3 text-xs text-slate-400">or with email</span>
            <div className="w-full border-t border-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' ? (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-700">Your Name</span>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Amina Sharma"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                  />
                </div>
              </label>
            ) : null}

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">Email</span>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">Password</span>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </div>
            </label>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? 'Please wait…'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-600">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === 'signin' ? 'signup' : 'signin');
              }}
              className="font-semibold text-teal-700 hover:underline"
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          <p className="rounded-xl bg-slate-50 p-3 text-center text-[11px] text-slate-500">
            Your family profile stays private and is used solely to personalize clean-air guidance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
