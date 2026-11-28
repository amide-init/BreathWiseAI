import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AiFamilyInput } from '@/components/profile/AiFamilyInput';
import {
  BreatheWiseLogoMark,
  FamilyHomeIllustration,
  GoogleAmbientBackdrop,
} from '@/components/illustrations/GoogleAirIllustrations';
import { AqiBadge } from '@/components/shared/AqiBadge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { QUICK_PICK_CITIES } from '@/config/cities';
import { APP_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useFamilyProfile } from '@/hooks/useFamilyProfile';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { cn } from '@/lib/cn';
import { detectUserGpsLocation } from '@/lib/geolocation';
import type { SaveMemberInput, TransportMode } from '@/models/family.model';
import { fetchAirQuality, searchLocations } from '@/services/air-quality.service';
import type { ParsedHouseholdDraft } from '@/services/profile-ai.service';
import type { AirQualityResponse, LocationOption } from '@/types';

type QuickGroupTag = 'solo' | 'couple' | 'school_kids' | 'toddlers' | 'elderly' | 'sensitive';

const GROUP_CHIPS: { id: QuickGroupTag; label: string; hint: string }[] = [
  { id: 'solo', label: 'Working Adults', hint: 'Commute & workouts' },
  { id: 'couple', label: 'Partner / Spouse', hint: '2 adults at home' },
  { id: 'school_kids', label: 'School Kids', hint: 'Outdoor play & bus' },
  { id: 'toddlers', label: 'Toddlers (0–5)', hint: 'Extra-gentle thresholds' },
  { id: 'elderly', label: 'Older Parents (60+)', hint: 'Morning walks & comfort' },
  { id: 'sensitive', label: 'Sensitive Lungs', hint: 'Optional private flag' },
];

const COMMUTE_MODES: { id: TransportMode; label: string }[] = [
  { id: 'personal_car', label: 'Car' },
  { id: 'two_wheeler', label: 'Two-Wheeler' },
  { id: 'public_transit', label: 'Metro / Bus' },
  { id: 'wfh', label: 'Work From Home' },
  { id: 'walk_cycle', label: 'Walk / Cycle' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, userProfile, updateUser } = useAuth();
  const { selectedLocation, selectLocation } = useSelectedLocation();
  const { saveFamily, createMember } = useFamilyProfile();
  const { generate } = useDailyPlan();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [city, setCity] = useState<LocationOption>(selectedLocation);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<LocationOption[]>([]);
  const [searchingCities, setSearchingCities] = useState(false);
  const [citySearchError, setCitySearchError] = useState<string | null>(null);
  const [cityPreview, setCityPreview] = useState<AirQualityResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  const [selectedTags, setSelectedTags] = useState<QuickGroupTag[]>(['solo']);
  const [aiDraft, setAiDraft] = useState<ParsedHouseholdDraft | null>(null);

  const [commuteMode, setCommuteMode] = useState<TransportMode>('personal_car');
  const [hasHepa, setHasHepa] = useState(false);
  const [hasExhaust, setHasExhaust] = useState(true);
  const [indoorSmoking, setIndoorSmoking] = useState(false);
  const [dailyIncense, setDailyIncense] = useState(false);
  const [dryBroom, setDryBroom] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced live city search inside Step 1
  useEffect(() => {
    const trimmed = cityQuery.trim();
    if (trimmed.length < 2) {
      setCityResults([]);
      setCitySearchError(null);
      setSearchingCities(false);
      return;
    }

    let cancelled = false;
    setSearchingCities(true);
    setCitySearchError(null);
    const timer = window.setTimeout(() => {
      searchLocations(trimmed)
        .then((results) => {
          if (!cancelled) {
            setCityResults(results);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setCityResults([]);
            setCitySearchError(
              err instanceof Error ? err.message : 'Unable to search cities right now.',
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearchingCities(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cityQuery]);

  // Live AQI preview right inside Step 1 so the user sees instant value
  useEffect(() => {
    let cancelled = false;
    setLoadingPreview(true);
    fetchAirQuality(city)
      .then((res) => {
        if (!cancelled) {
          setCityPreview(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCityPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPreview(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  function toggleTag(tag: QuickGroupTag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? (prev.length > 1 ? prev.filter((t) => t !== tag) : prev) : [...prev, tag],
    );
  }

  async function handleUseGps() {
    setLocatingGps(true);
    setError(null);
    try {
      const detected = await detectUserGpsLocation();
      setCity(detected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to detect GPS location.');
    } finally {
      setLocatingGps(false);
    }
  }

  function handleAcceptAiDraft(draft: ParsedHouseholdDraft) {
    setAiDraft(draft);
    setCommuteMode(draft.primaryCommuteMode);
    setHasHepa(draft.hasHepaPurifier);
    setHasExhaust(draft.hasKitchenExhaust);
    setIndoorSmoking(draft.indoorSmokingPresent);
    setDailyIncense(draft.incenseOrDhoopDaily);
    setDryBroom(draft.dustCleaningMethod === 'dry_broom');
    setStep(3);
  }

  async function handleSkip() {
    if (user) {
      try {
        await updateUser({ onboardingCompleted: true });
      } catch {
        // Non-blocking
      }
    }
    navigate(APP_ROUTES.HOME, { replace: true });
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    try {
      await selectLocation(city);

      const savedFamily = await saveFamily({
        householdName:
          aiDraft?.householdName ||
          (userProfile?.displayName
            ? `${userProfile.displayName.split(' ')[0]}'s Home`
            : 'My Home'),
        location: city,
        transportationHabits: {
          primaryMode: commuteMode,
          dailyCommuteKm: aiDraft?.dailyCommuteKm ?? (commuteMode === 'wfh' ? 0 : 16),
          vehicleFuelType: 'petrol',
          occupancy: 1,
        },
        exercisePreferences: {
          prefersOutdoor: aiDraft?.prefersOutdoorExercise ?? true,
          preferredWindow: 'morning',
          activityType: aiDraft?.exerciseActivityType || 'walk',
        },
        indoorEquipment: {
          hasHepaPurifier: hasHepa,
          purifierRoomsCount: hasHepa ? 1 : 0,
          hasKitchenExhaust: hasExhaust,
          hasCrossVentilation: true,
          hasN95Masks: false,
          indoorSmokingPresent: indoorSmoking,
        },
      });

      const membersToCreate: SaveMemberInput[] = [];
      if (aiDraft && aiDraft.members.length > 0) {
        for (const m of aiDraft.members) {
          membersToCreate.push({
            nickname: m.nickname,
            role: m.role,
            ageGroup: m.ageGroup,
            optionalHealthProfile:
              m.hasRespiratorySensitivity || m.hasCardiacSensitivity || m.isPregnant
                ? {
                    hasRespiratorySensitivity: m.hasRespiratorySensitivity,
                    hasCardiacSensitivity: m.hasCardiacSensitivity,
                    isPregnant: m.isPregnant,
                    notes: null,
                  }
                : null,
          });
        }
      } else {
        const sensitive = selectedTags.includes('sensitive');
        const sensitivityObj = sensitive
          ? {
              hasRespiratorySensitivity: true,
              hasCardiacSensitivity: false,
              isPregnant: false,
              notes: null,
            }
          : null;
        if (selectedTags.includes('school_kids')) {
          membersToCreate.push({
            nickname: 'School Child',
            role: 'child_school',
            ageGroup: '6_12',
            optionalHealthProfile: sensitivityObj,
          });
        }
        if (selectedTags.includes('toddlers')) {
          membersToCreate.push({
            nickname: 'Toddler',
            role: 'child_toddler',
            ageGroup: '0_5',
            optionalHealthProfile: sensitivityObj,
          });
        }
        if (selectedTags.includes('elderly')) {
          membersToCreate.push({
            nickname: 'Parent',
            role: 'elderly',
            ageGroup: '60_plus',
            optionalHealthProfile: sensitivityObj,
          });
        }
        if (selectedTags.includes('couple')) {
          membersToCreate.push({
            nickname: 'Partner',
            role: 'working_adult',
            ageGroup: '18_45',
            optionalHealthProfile: null,
          });
        }
        if (membersToCreate.length === 0) {
          membersToCreate.push({
            nickname: userProfile?.displayName?.split(' ')[0] || 'Me',
            role: 'working_adult',
            ageGroup: '18_45',
            optionalHealthProfile: sensitivityObj,
          });
        }
      }

      if (savedFamily.familyId) {
        await Promise.allSettled(
          membersToCreate.map((m) => createMember(m, savedFamily.familyId)),
        );
      }

      // Store honest indoor habits locally for instant Indoor Advisor pre-fill too
      if (typeof window !== 'undefined' && user) {
        try {
          window.localStorage.setItem(
            `breathewise:habits:${user.uid}`,
            JSON.stringify({
              hasHepaPurifier: hasHepa,
              usesKitchenExhaust: hasExhaust,
              indoorSmokingPresent: indoorSmoking,
              incenseOrDhoopDaily: dailyIncense,
              dustCleaningMethod: dryBroom ? 'dry_broom' : 'wet_mop',
            }),
          );
        } catch {
          // Ignore storage quota errors
        }
      }

      await updateUser({
        primaryLocation: city,
        defaultFamilyId: savedFamily.familyId,
        onboardingCompleted: true,
      });

      // Kick off their first 7-node LangGraph plan in background
      void generate(true);
      navigate(APP_ROUTES.HOME, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete setup. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bw-illustrated-bg relative flex min-h-screen flex-col items-center justify-center px-4 py-10 text-[#202124] dark:text-[#E3E3E3]">
      <GoogleAmbientBackdrop variant="hero" />
      <div className="relative z-10 w-full max-w-xl space-y-6">
        {/* Minimal Brand & Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BreatheWiseLogoMark className="h-9 w-9" />
            <span className="font-display text-base font-bold tracking-tight">BreathWiseAI</span>
          </div>
          <button
            type="button"
            onClick={() => void handleSkip()}
            className="cursor-pointer text-xs font-medium text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-[#E3E3E3]"
          >
            Skip setup
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { idx: 1, color: 'bg-[#4285F4]' },
            { idx: 2, color: 'bg-[#FBBC05]' },
            { idx: 3, color: 'bg-[#34A853]' },
          ].map(({ idx, color }) => (
            <div
              key={idx}
              className={cn(
                'h-1.5 rounded-full transition-colors',
                idx <= step ? color : 'bg-[#DADCE0] dark:bg-white/[0.1]',
              )}
            />
          ))}
        </div>

        {/* Main Card */}
        <div className="cloud-card overflow-hidden rounded-3xl border border-white/80 bg-white/95 backdrop-blur-sm dark:border-white/[0.09] dark:bg-[#1E1F20]/95">
          <div className="google-ribbon h-[3px] w-full" aria-hidden="true" />
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#1A73E8] dark:text-[#8AB4F8]">
                  Step {step} of 3
                </p>
                <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">
                  {step === 1
                    ? 'Which city are you breathing in?'
                    : step === 2
                      ? 'Who lives with you?'
                      : 'Your real commute & home setup'}
                </h1>
              </div>
              <FamilyHomeIllustration className="hidden h-16 w-24 shrink-0 sm:block" />
            </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8E9AA8]">
            {step === 1
              ? 'We anchor every suggestion to your city’s live air quality.'
              : step === 2
                ? 'Describe your family in 1 sentence with AI — or tap quick chips below.'
                : 'Be honest — zero judgment. We tailor realistic, doable minimum-loss tips for your real routine.'}
          </p>

          {error ? (
            <Alert variant="danger" className="mt-4">
              {error}
            </Alert>
          ) : null}

          <div className="mt-6">
            {/* Step 1: Location + Live AQI Preview */}
            {step === 1 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/[0.07] dark:bg-[#0B0E12]">
                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                    <span className="truncate font-semibold" data-no-translate="true">
                      {city.label || city.city}
                    </span>
                  </div>
                  {loadingPreview ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking live air…
                    </span>
                  ) : cityPreview ? (
                    <AqiBadge
                      category={cityPreview.current.category}
                      aqi={cityPreview.current.aqi}
                    />
                  ) : null}
                </div>

                {/* Search any city or town */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5F6368] dark:text-[#9AA0A6]"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      placeholder="Search any city or town (e.g., Pune, Jaipur, Patna, Jhumri Telaiya…)"
                      aria-label="Search any city or town"
                      className="w-full rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] py-2.5 pr-9 pl-10 text-sm text-[#202124] outline-none transition-colors placeholder:text-[#5F6368] focus:border-[#4285F4] focus:bg-white focus:ring-2 focus:ring-[#4285F4]/20 dark:border-white/[0.1] dark:bg-[#131314] dark:text-[#E3E3E3] dark:placeholder:text-[#9AA0A6] dark:focus:border-[#8AB4F8]"
                    />
                    {searchingCities ? (
                      <Loader2
                        className="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 animate-spin text-[#4285F4] dark:text-[#8AB4F8]"
                        aria-hidden="true"
                      />
                    ) : cityQuery ? (
                      <button
                        type="button"
                        aria-label="Clear city search"
                        onClick={() => {
                          setCityQuery('');
                          setCityResults([]);
                          setCitySearchError(null);
                        }}
                        className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#5F6368] hover:bg-black/5 dark:text-[#9AA0A6] dark:hover:bg-white/10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {citySearchError ? (
                    <p className="text-xs text-[#C5221F] dark:text-[#F28B82]">{citySearchError}</p>
                  ) : null}

                  {cityQuery.trim().length >= 2 && !searchingCities && cityResults.length === 0 && !citySearchError ? (
                    <p className="rounded-xl border border-dashed border-[#DADCE0] px-3.5 py-2.5 text-xs text-[#5F6368] dark:border-white/[0.1] dark:text-[#9AA0A6]">
                      No matching cities found for &ldquo;{cityQuery.trim()}&rdquo;. Try another
                      city name or use GPS below.
                    </p>
                  ) : null}

                  {cityResults.length > 0 ? (
                    <div
                      data-no-translate="true"
                      className="max-h-48 overflow-y-auto rounded-2xl border border-[#DADCE0] bg-white p-1.5 shadow-sm dark:border-white/[0.1] dark:bg-[#131314]"
                    >
                      {cityResults.map((loc) => {
                        const active = loc.locationId === city.locationId;
                        return (
                          <button
                            key={loc.locationId}
                            type="button"
                            onClick={() => {
                              setCity(loc);
                              setCityQuery('');
                              setCityResults([]);
                            }}
                            className={cn(
                              'flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors',
                              active
                                ? 'bg-[#4285F4]/12 font-semibold text-[#1A73E8] dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]'
                                : 'text-[#202124] hover:bg-[#F1F3F4] dark:text-[#E3E3E3] dark:hover:bg-white/[0.06]',
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <MapPin
                                className="h-3.5 w-3.5 shrink-0 text-[#4285F4] dark:text-[#8AB4F8]"
                                aria-hidden="true"
                              />
                              <span className="truncate">{loc.label || loc.city}</span>
                            </span>
                            {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={locatingGps}
                  onClick={() => void handleUseGps()}
                >
                  {locatingGps ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  )}
                  {locatingGps ? 'Detecting GPS location…' : 'Use My Current Location (GPS)'}
                </Button>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
                    Or quick-pick a popular city:
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-no-translate="true">
                    {QUICK_PICK_CITIES.map((c) => {
                      const active = c.locationId === city.locationId;
                      return (
                        <button
                          key={c.locationId}
                          type="button"
                          onClick={() => {
                            setCity(c);
                            setCityQuery('');
                            setCityResults([]);
                          }}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all',
                            active
                              ? 'border-teal-500/60 bg-teal-500/10 text-teal-800 dark:border-teal-400/50 dark:bg-teal-400/12 dark:text-teal-200'
                              : 'border-slate-200/80 bg-slate-50/50 text-slate-700 hover:border-slate-300 dark:border-white/[0.07] dark:bg-white/[0.02] dark:text-[#CBD5E1] dark:hover:border-white/[0.15]',
                          )}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                          <span className="truncate">{c.city}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Step 2: AI Family Setup + Quick Chips */}
            {step === 2 ? (
              <div className="space-y-5">
                <AiFamilyInput
                  compact
                  submitLabel="Use These Details & Continue"
                  onApplyDraft={handleAcceptAiDraft}
                />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400 dark:text-[#7C8999]">
                    Or tap who you’re protecting:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {GROUP_CHIPS.map((opt) => {
                      const active = selectedTags.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleTag(opt.id)}
                          className={cn(
                            'flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all',
                            active
                              ? 'border-teal-500/50 bg-teal-500/10 dark:border-teal-400/40 dark:bg-teal-400/12'
                              : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-300 dark:border-white/[0.07] dark:bg-white/[0.02]',
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900 dark:text-[#EEF2F6]">
                              {opt.label}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-[#8E9AA8]">
                              {opt.hint}
                            </p>
                          </div>
                          {active ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                          ) : (
                            <Users className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-white/20" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Step 3: Honest Habits & Home Gear */}
            {step === 3 ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1]">
                    Usual Daily Commute
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMUTE_MODES.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCommuteMode(opt.id)}
                        className={cn(
                          'cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                          commuteMode === opt.id
                            ? 'border-teal-500 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400/90 dark:text-[#0B0E12]'
                            : 'border-slate-200/80 bg-white text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#CBD5E1]',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1]">
                    Tap what applies in your home (helps us give realistic advice)
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      {
                        label: 'True-HEPA air purifier',
                        hint: 'We adapt if you don’t own one',
                        checked: hasHepa,
                        toggle: () => setHasHepa((v) => !v),
                      },
                      {
                        label: 'Kitchen chimney / exhaust',
                        hint: 'Helps vent cooking PM2.5',
                        checked: hasExhaust,
                        toggle: () => setHasExhaust((v) => !v),
                      },
                      {
                        label: 'Someone smokes at home',
                        hint: 'Unlocks lower-loss steps, no preaching',
                        checked: indoorSmoking,
                        toggle: () => setIndoorSmoking((v) => !v),
                      },
                      {
                        label: 'Daily incense / dhoop',
                        hint: 'Respectful low-smoke options',
                        checked: dailyIncense,
                        toggle: () => setDailyIncense((v) => !v),
                      },
                      {
                        label: 'Dry broom sweeping',
                        hint: 'Dust control tips',
                        checked: dryBroom,
                        toggle: () => setDryBroom((v) => !v),
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.toggle}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all',
                          item.checked
                            ? 'border-teal-500/50 bg-teal-500/10 dark:border-teal-400/40 dark:bg-teal-400/12'
                            : 'border-slate-200/80 bg-slate-50/50 dark:border-white/[0.07] dark:bg-white/[0.02]',
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-900 dark:text-[#EEF2F6]">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-[#8E9AA8]">
                            {item.hint}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                            item.checked
                              ? 'border-teal-500 bg-teal-600 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-[#0B0E12]'
                              : 'border-slate-300 dark:border-white/20',
                          )}
                        >
                          {item.checked ? <Check className="h-3 w-3" /> : null}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer Navigation */}
          <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/[0.07]">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            ) : (
              <span className="text-xs text-slate-400 dark:text-[#64748B]">Takes ~30 seconds</span>
            )}

            {step < 3 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="brand"
                size="sm"
                disabled={saving}
                onClick={() => void handleFinish()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {saving ? 'Building Your AI Plan…' : 'Launch My Clean-Air Copilot'}
              </Button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
