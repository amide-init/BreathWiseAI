import {
  CheckCircle2,
  Gauge,
  Globe,
  LogOut,
  MapPin,
  Moon,
  Palette,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { MedicalDisclaimer } from '@/components/shared/MedicalDisclaimer';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { useTheme } from '@/hooks/useTheme';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { cn } from '@/lib/cn';
import type { AqiScalePreference } from '@/models/user.model';

const FIELD_CLASS =
  'w-full rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2 text-sm text-[#202124] outline-none transition-colors focus:border-[#4285F4] focus:bg-white focus:ring-2 focus:ring-[#4285F4]/20 dark:border-white/[0.1] dark:bg-[#131314] dark:text-[#E3E3E3] dark:focus:border-[#8AB4F8]';

export function SettingsPage() {
  const { user, userProfile, updateUser, signOut } = useAuth();
  const { selectedLocation, openPicker } = useSelectedLocation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, isTranslating } = useLanguage();

  const [aqiScale, setAqiScale] = useState<AqiScalePreference>(
    userProfile?.aqiScalePreference ?? 'CPCB_NAQI',
  );
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsFeedback, setPrefsFeedback] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setAqiScale(userProfile.aqiScalePreference);
    }
  }, [userProfile]);

  async function handleSavePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPrefs(true);
    setPrefsError(null);
    setPrefsFeedback(null);
    try {
      await updateUser({
        aqiScalePreference: aqiScale,
        primaryLocation: selectedLocation,
      });
      setPrefsFeedback('Settings saved to your account.');
    } catch (err) {
      setPrefsError(err instanceof Error ? err.message : 'Unable to save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Profile / Settings Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#202124] dark:text-[#E3E3E3]">
            Settings
          </h1>
          <p className="text-sm text-[#5F6368] dark:text-[#9AA0A6]">
            Manage language, appearance, air-quality scale, default location, and account controls.
          </p>
        </div>

        <div
          className="cloud-card inline-flex w-fit items-center gap-1 rounded-full border border-[#DADCE0] bg-white p-1 dark:border-white/[0.1] dark:bg-[#1E1F20]"
          role="tablist"
          aria-label="Account sections"
        >
          <Link
            to={APP_ROUTES.PROFILE}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#5F6368] transition-colors hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-[#E3E3E3]"
          >
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            Family &amp; Home
          </Link>
          <Link
            to={APP_ROUTES.SETTINGS}
            aria-current="page"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#4285F4]/15 px-3.5 py-1.5 text-xs font-semibold text-[#1A73E8] dark:bg-[#8AB4F8]/20 dark:text-[#8AB4F8]"
          >
            <SettingsIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Settings
          </Link>
        </div>
      </div>

      {/* 1. Language (Real-Time Frontend Translation) */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Language (Live Translation)
            </CardTitle>
            {isTranslating ? (
              <Badge variant="default">Translating…</Badge>
            ) : (
              <Badge variant="neutral">Indian Languages</Badge>
            )}
          </div>
          <CardDescription>
            Switch between English and full Indian language translations. All screens, verdicts, and
            AI guidance translate completely in real time and cache locally on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            data-no-translate="true"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {SUPPORTED_LANGUAGES.map((opt) => {
              const active = opt.code === language;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setLanguage(opt.code)}
                  className={cn(
                    'flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all',
                    active
                      ? 'border-[#4285F4] bg-[#4285F4]/[0.08] ring-2 ring-[#4285F4]/20 dark:border-[#8AB4F8] dark:bg-[#4285F4]/15'
                      : 'border-[#DADCE0]/80 bg-[#F8F9FA] hover:border-[#4285F4]/40 dark:border-white/[0.08] dark:bg-[#131314]/80 dark:hover:border-white/[0.16]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        {opt.label}
                      </p>
                      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        {opt.nativeHint}
                      </p>
                    </div>
                    {active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <span className="rounded-md bg-zinc-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {opt.shortCode}
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-zinc-600 italic dark:text-zinc-400">
                    “{opt.sampleLine}”
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Appearance / Light & Dark Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Appearance
          </CardTitle>
          <CardDescription>
            Choose how BreatheWise AI looks on this device. Updates immediately with zero flicker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-2xl border p-4 text-left transition-all',
                theme === 'light'
                  ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 dark:border-emerald-400 dark:bg-emerald-950/40'
                  : 'border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-amber-500 shadow-2xs">
                  <Sun className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Light Mode</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Crisp daylight Zinc &amp; Emerald canvas
                  </p>
                </div>
              </div>
              {theme === 'light' ? <Badge variant="default">Active</Badge> : null}
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-2xl border p-4 text-left transition-all',
                theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 dark:border-emerald-400 dark:bg-emerald-950/40'
                  : 'border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-emerald-400 shadow-2xs">
                  <Moon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Dark Mode</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Low-glare charcoal surface for night use
                  </p>
                </div>
              </div>
              {theme === 'dark' ? <Badge variant="default">Active</Badge> : null}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Air Quality & Location Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Air Quality &amp; Location Preferences
          </CardTitle>
          <CardDescription>
            Configure the AQI scale and default city synced across your dashboard and AI Daily Plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePreferences} className="space-y-4">
            {prefsError ? <Alert variant="danger">{prefsError}</Alert> : null}
            {prefsFeedback ? (
              <Alert variant="info" className="items-center">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{prefsFeedback}</span>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Preferred AQI Scale
                </span>
                <select
                  value={aqiScale}
                  onChange={(e) => setAqiScale(e.target.value as AqiScalePreference)}
                  className={FIELD_CLASS}
                >
                  <option value="CPCB_NAQI">India CPCB NAQI (0–500 · Recommended)</option>
                  <option value="US_EPA">US EPA AQI (0–500)</option>
                </select>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Deterministic health risk rules always reference CPCB NAQI thresholds for India.
                </p>
              </label>

              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Default Primary City
                </span>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                    <MapPin
                      className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span className="truncate">{selectedLocation.label}</span>
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={openPicker}>
                    Change
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Used automatically when loading live AQI and generating your morning plan.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={savingPrefs}>
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {savingPrefs ? 'Saving…' : 'Save Preferences'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Privacy & Data Transparency */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              Privacy &amp; AI Safety Guardrails
            </CardTitle>
            <Badge variant="default">User-Owned Data</Badge>
          </div>
          <CardDescription>
            How BreatheWise AI protects your family profile and grounds environmental guidance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Strict Ownership Rules
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Household members and optional sensitivity flags are restricted strictly to your
                authenticated UID in Cloud Firestore and excluded from server logs.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Deterministic Risk Rules
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Activity limits and severe-AQI escalations are computed by deterministic rules
                before AI text generation — never guessed by an LLM.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Honest Freshness &amp; Estimates
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Every AQI reading surfaces its station timestamp and freshness status, and indoor
                or CO₂ figures are explicitly labeled as estimates.
              </p>
            </div>
          </div>

          <MedicalDisclaimer />
        </CardContent>
      </Card>

      {/* 4. Account & Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Account &amp; Session
          </CardTitle>
          <CardDescription>Manage your signed-in account or jump to Family Profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {userProfile?.displayName ?? user?.displayName ?? 'BreatheWise Account'}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {userProfile?.email ?? user?.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to={APP_ROUTES.ONBOARDING}>
                <Button variant="outline" size="sm">
                  Re-run AI Onboarding
                </Button>
              </Link>
              <Link to={APP_ROUTES.PROFILE}>
                <Button variant="outline" size="sm">
                  Family &amp; Home
                </Button>
              </Link>
              <Button variant="danger" size="sm" onClick={() => void signOut()}>
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
