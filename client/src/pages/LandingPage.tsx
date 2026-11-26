import { FirebaseError } from 'firebase/app';
import {
  ArrowDown,
  CheckCircle2,
  Languages,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  AirStatusIllustration,
  BreatheWiseLogoMark,
  CopilotChatIllustration,
  FamilyHomeIllustration,
  GoogleAmbientBackdrop,
  GoogleSparkleMark,
  ImpactGlobeIllustration,
  PlanCalendarIllustration,
} from '@/components/illustrations/GoogleAirIllustrations';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Alert } from '@/components/ui/alert';
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

function GoogleGIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} aria-hidden="true">
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

const HOW_IT_WORKS_STEPS = [
  {
    number: '1',
    accentBg: 'bg-[#4285F4]/14 text-[#1A73E8] dark:bg-[#8AB4F8]/18 dark:text-[#8AB4F8]',
    title: 'Pick your city or tap GPS',
    description:
      'Connects directly to real-time CPCB NAQI station readings and hourly weather forecasts with full source transparency.',
  },
  {
    number: '2',
    accentBg: 'bg-[#34A853]/14 text-[#1E8E3E] dark:bg-[#81C995]/18 dark:text-[#81C995]',
    title: 'Tell AI about your home',
    description:
      'Describe your family, kids, elderly parents, commute, and home habits in one plain sentence — no tedious forms required.',
  },
  {
    number: '3',
    accentBg: 'bg-[#FBBC05]/20 text-[#9A6700] dark:bg-[#FDD663]/18 dark:text-[#FDD663]',
    title: 'Follow clear, realistic guidance',
    description:
      'Get daily routines, practical indoor harm-reduction steps (even without a HEPA purifier), and ask your AI copilot anytime.',
  },
] as const;

export function LandingPage() {
  useDocumentTitle('BreatheWise AI — Personal Clean-Air Assistant for Families');
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    if (user) {
      navigate(APP_ROUTES.HOME);
      return;
    }
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="bw-illustrated-bg relative min-h-screen overflow-x-hidden text-[#202124] transition-colors duration-200 dark:text-[#E3E3E3]">
      <GoogleAmbientBackdrop variant="hero" />

      {/* Fixed Floating Google-Tinted Cloud Pill Navbar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
        <header className="cloud-card pointer-events-auto relative mx-auto max-w-6xl rounded-full border border-[#4285F4]/25 bg-gradient-to-r from-[#E8F0FE]/92 via-white/92 to-[#E6F4EA]/92 backdrop-blur-md dark:border-white/[0.12] dark:from-[#1E2430]/92 dark:via-[#1E1F20]/92 dark:to-[#1C2820]/92">
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
            aria-hidden="true"
          >
            <div className="google-ribbon h-[3px] w-full" />
          </div>
          <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
            {/* Left Brand + 4-Color Status Dots */}
            <Link to={APP_ROUTES.HOME} className="group flex items-center gap-2.5">
              <BreatheWiseLogoMark className="h-9 w-9 shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <div className="leading-tight">
                <span className="font-display flex items-center gap-1.5 text-base font-bold tracking-tight text-[#202124] dark:text-[#E3E3E3]">
                  BreatheWise
                  <span className="rounded-full bg-[#4285F4]/14 px-1.5 py-0.5 text-[10px] font-bold text-[#1A73E8] dark:bg-[#8AB4F8]/18 dark:text-[#8AB4F8]">
                    AI
                  </span>
                </span>
                <span className="hidden items-center gap-1 text-[10px] font-medium text-[#5F6368] sm:flex dark:text-[#9AA0A6]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EA4335]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
                  <span className="ml-0.5">Clean-Air Copilot</span>
                </span>
              </div>
            </Link>

            {/* Center Quick-Jump Nav Pills (Desktop) */}
            <nav
              aria-label="Landing sections"
              className="hidden items-center gap-1 rounded-full border border-[#DADCE0]/70 bg-white/75 p-1 md:flex dark:border-white/[0.08] dark:bg-[#131314]/65"
            >
              <a
                href="#features"
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#3C4043] transition-colors hover:bg-[#4285F4]/12 hover:text-[#1A73E8] dark:text-[#C4C7C5] dark:hover:bg-[#8AB4F8]/15 dark:hover:text-[#8AB4F8]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
                Features
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#3C4043] transition-colors hover:bg-[#34A853]/12 hover:text-[#1E8E3E] dark:text-[#C4C7C5] dark:hover:bg-[#81C995]/15 dark:hover:text-[#81C995]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#34A853]" />
                How it works
              </a>
              <a
                href="#safety"
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#3C4043] transition-colors hover:bg-[#FBBC05]/18 hover:text-[#9A6700] dark:text-[#C4C7C5] dark:hover:bg-[#FDD663]/15 dark:hover:text-[#FDD663]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#FBBC05]" />
                AI Safety
              </a>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeToggle />
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void handleGoogleSignIn()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#4285F4] px-4 py-2 text-xs font-semibold text-white shadow-[0_6px_18px_-6px_rgba(66,133,244,0.75)] transition-all hover:-translate-y-0.5 hover:bg-[#3367D6] disabled:opacity-60 sm:px-5 sm:text-sm"
              >
                {signingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-[#FBBC05]" aria-hidden="true" />
                )}
                <span>{user ? 'Open Dashboard' : signingIn ? 'Signing in…' : 'Sign in'}</span>
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Marketing & Onboarding Hero Flow */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-28 pb-44 sm:px-6 sm:pt-32 sm:pb-56">
        {/* Hero Section */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="cloud-card mb-5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-4 py-1.5 text-xs font-semibold text-[#3C4043] dark:border-white/[0.12] dark:bg-[#1E1F20]/95 dark:text-[#E3E3E3]">
            <GoogleSparkleMark className="h-4 w-4" />
            <span>AI-Powered Clean-Air Guide for Indian Families</span>
          </div>

          <h1 className="font-display text-4xl leading-[1.12] font-bold tracking-tight text-[#202124] sm:text-5xl md:text-6xl dark:text-[#E3E3E3]">
            Know your air.{' '}
            <span className="text-[#4285F4] dark:text-[#8AB4F8]">Protect</span>{' '}
            <span className="text-[#34A853] dark:text-[#81C995]">your family</span> every day.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#5F6368] sm:text-lg dark:text-[#9AA0A6]">
            BreatheWise AI translates live CPCB air quality, local weather, and your household
            routines into realistic daily plans, indoor air fixes, and a grounded AI copilot — in 6
            Indian languages.
          </p>

          {error ? (
            <div className="mx-auto mt-5 max-w-md text-left">
              <Alert variant="danger">{error}</Alert>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void handleGoogleSignIn()}
              className="cloud-card inline-flex cursor-pointer items-center justify-center gap-3 rounded-full border border-[#DADCE0] bg-white px-7 py-3.5 text-sm font-semibold text-[#202124] transition-all hover:-translate-y-0.5 hover:border-[#4285F4]/60 disabled:opacity-50 sm:text-base dark:border-white/[0.14] dark:bg-[#282A2C] dark:text-[#E3E3E3] dark:hover:border-[#8AB4F8]/60"
            >
              {signingIn ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#4285F4] dark:text-[#8AB4F8]" />
              ) : (
                <GoogleGIcon />
              )}
              <span>{signingIn ? 'Signing in with Google…' : 'Continue with Google'}</span>
            </button>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white/80 px-6 py-3.5 text-sm font-semibold text-[#3C4043] backdrop-blur-xs transition-colors hover:border-[#4285F4]/50 hover:bg-white dark:border-white/[0.12] dark:bg-[#1E1F20]/80 dark:text-[#C4C7C5] dark:hover:bg-[#282A2C]"
            >
              <span>See how it works</span>
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {/* Grounded Trust Chips */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-[#5F6368] dark:text-[#9AA0A6]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#4285F4] dark:text-[#8AB4F8]" />
              India CPCB NAQI + Open-Meteo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-[#34A853] dark:text-[#81C995]" />
              English, हिन्दी, বাংলা, मराठी, தமிழ், తెలుగు
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-[#EA4335] dark:text-[#F28B82]" />
              100% Private · Zero Ads
            </span>
          </div>
        </section>

        {/* 4-Color Google Illustrated Feature Grid */}
        <section id="features" className="mt-16 scroll-mt-24 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="cloud-card flex flex-col justify-between rounded-3xl border border-white/80 bg-white/95 p-5 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#1E1F20]/95">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#4285F4]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#1A73E8] dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]">
                  Live Air & Weather
                </span>
                <AirStatusIllustration category="Good" className="h-14 w-20" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#202124] dark:text-[#E3E3E3]">
                Honest City AQI
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368] dark:text-[#9AA0A6]">
                Real-time CPCB NAQI, PM2.5, PM10, humidity, and wind with transparent station
                timestamps — never fabricated readings.
              </p>
            </div>
          </div>

          <div className="cloud-card flex flex-col justify-between rounded-3xl border border-white/80 bg-white/95 p-5 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#1E1F20]/95">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#34A853]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#1E8E3E] dark:bg-[#81C995]/15 dark:text-[#81C995]">
                  Daily Plan & Home
                </span>
                <PlanCalendarIllustration className="h-14 w-20" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#202124] dark:text-[#E3E3E3]">
                Realistic Routines
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368] dark:text-[#9AA0A6]">
                Tailored play, commute, and indoor air steps — including zero-cost harm-reduction
                even if you don&apos;t own a HEPA purifier.
              </p>
            </div>
          </div>

          <div className="cloud-card flex flex-col justify-between rounded-3xl border border-white/80 bg-white/95 p-5 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#1E1F20]/95">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#FBBC05]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#9A6700] dark:bg-[#FDD663]/15 dark:text-[#FDD663]">
                  Ask AI Copilot
                </span>
                <CopilotChatIllustration className="h-14 w-20" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#202124] dark:text-[#E3E3E3]">
                Grounded Answers
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368] dark:text-[#9AA0A6]">
                Ask about kids&apos; outdoor play, ventilation windows, or smoke reduction. Every
                reply is checked by deterministic safety rules.
              </p>
            </div>
          </div>

          <div className="cloud-card flex flex-col justify-between rounded-3xl border border-white/80 bg-white/95 p-5 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#1E1F20]/95">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#EA4335]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#C5221F] dark:bg-[#F28B82]/15 dark:text-[#F28B82]">
                  Transparent Impact
                </span>
                <ImpactGlobeIllustration className="h-14 w-20" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#202124] dark:text-[#E3E3E3]">
                CO₂ & Exposure Split
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368] dark:text-[#9AA0A6]">
                Track estimated kg CO₂e avoided from greener commutes separately from personal lung
                exposure protection — with clear formulas.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="cloud-card mt-14 scroll-mt-24 overflow-hidden rounded-3xl border border-white/80 bg-white/95 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#1E1F20]/95"
        >
          <div className="google-ribbon h-[3px] w-full" aria-hidden="true" />
          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4285F4] dark:text-[#8AB4F8]">
                  Ready in 60 seconds
                </p>
                <h2 className="font-display mt-1 text-2xl font-bold text-[#202124] sm:text-3xl dark:text-[#E3E3E3]">
                  How BreatheWise AI works for your home
                </h2>
              </div>
              <FamilyHomeIllustration className="h-16 w-24 shrink-0" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl border border-[#E8EAED] bg-[#F8F9FA]/85 p-5 dark:border-white/[0.08] dark:bg-[#131314]/80"
                >
                  <span
                    className={`font-display inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step.accentBg}`}
                  >
                    {step.number}
                  </span>
                  <h3 className="font-display mt-3 text-base font-bold text-[#202124] dark:text-[#E3E3E3]">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368] dark:text-[#9AA0A6]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Safety & Final CTA Strip */}
            <div
              id="safety"
              className="mt-6 scroll-mt-24 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#4285F4]/20 bg-[#E8F0FE]/55 p-4 sm:flex-row sm:items-center sm:p-5 dark:border-[#8AB4F8]/20 dark:bg-[#4285F4]/10"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34A853] dark:text-[#81C995]" />
                <p className="text-xs leading-relaxed text-[#3C4043] dark:text-[#C4C7C5]">
                  <strong className="font-semibold text-[#202124] dark:text-[#E3E3E3]">
                    Safety-first AI:
                  </strong>{' '}
                  Deterministic CPCB risk categories, verified public-health references, and
                  non-diagnostic wellness guidance. Always consult a qualified doctor for medical
                  symptoms.
                </p>
              </div>
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void handleGoogleSignIn()}
                className="inline-flex shrink-0 cursor-pointer items-center gap-2.5 rounded-full border border-[#DADCE0] bg-white px-5 py-2.5 text-xs font-semibold text-[#202124] shadow-xs transition-all hover:border-[#4285F4]/60 disabled:opacity-50 dark:border-white/[0.14] dark:bg-[#282A2C] dark:text-[#E3E3E3]"
              >
                <GoogleGIcon className="h-4 w-4" />
                <span>{signingIn ? 'Signing in…' : 'Get started free'}</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
