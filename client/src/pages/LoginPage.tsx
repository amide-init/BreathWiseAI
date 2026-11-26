import { FirebaseError } from 'firebase/app';
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import {
  BreatheWiseLogoMark,
  FamilyHomeIllustration,
  GoogleAmbientBackdrop,
} from '@/components/illustrations/GoogleAirIllustrations';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

function mapAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before finishing.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase Console → Authentication → Settings.';
      case 'auth/operation-not-allowed':
      case 'auth/configuration-not-found':
        return 'Google Sign-In is not enabled yet on this Firebase project.';
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
}

function GoogleGIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export function LoginPage() {
  useDocumentTitle('Sign In | BreatheWise AI');
  const { user, signInWithGoogle } = useAuth();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? APP_ROUTES.HOME;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={redirectTo} replace />;
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
    <div className="bw-illustrated-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-14 pb-28 sm:pb-36">
      <GoogleAmbientBackdrop variant="hero" />

      <div className="absolute top-4 left-4 z-10">
        <Link
          to={APP_ROUTES.HOME}
          className="cloud-card inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3.5 py-2 text-xs font-semibold text-[#3C4043] backdrop-blur-sm hover:border-[#4285F4]/50 dark:border-white/[0.12] dark:bg-[#1E1F20]/95 dark:text-[#E3E3E3]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Home
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <Card className="relative z-10 w-full max-w-md overflow-hidden">
        <div className="google-ribbon h-[3px] w-full" aria-hidden="true" />
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex items-center gap-2">
            <BreatheWiseLogoMark className="h-11 w-11" />
            <FamilyHomeIllustration className="h-14 w-20" />
          </div>
          <CardTitle className="text-2xl">BreatheWise AI</CardTitle>
          <CardDescription>
            One tap to unlock your city-AQI daily plan, realistic indoor harm-reduction tips, and AI
            clean-air copilot.
          </CardDescription>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#4285F4]/12 px-2.5 py-0.5 text-[#1A73E8] dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]">
              <ShieldCheck className="h-3 w-3" /> India CPCB + WHO
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#34A853]/12 px-2.5 py-0.5 text-[#1E8E3E] dark:bg-[#81C995]/15 dark:text-[#81C995]">
              <CheckCircle2 className="h-3 w-3" /> 100% Private · Zero Ads
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleGoogleSignIn()}
            className="cloud-card flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[#DADCE0] bg-white px-5 py-3 text-sm font-semibold text-[#202124] transition-all hover:-translate-y-0.5 hover:border-[#4285F4]/60 disabled:opacity-50 dark:border-white/[0.14] dark:bg-[#282A2C] dark:text-[#E3E3E3] dark:hover:border-[#8AB4F8]/60"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#4285F4] dark:text-[#8AB4F8]" />
            ) : (
              <GoogleGIcon />
            )}
            <span>{submitting ? 'Signing in with Google…' : 'Continue with Google'}</span>
          </button>

          <p className="rounded-2xl bg-[#F1F3F4]/80 p-3 text-center text-[11px] text-[#5F6368] dark:bg-[#131314]/80 dark:text-[#9AA0A6]">
            Your family profile stays strictly private and is used solely to personalize your
            clean-air guidance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
