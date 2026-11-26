import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  LocateFixed,
  MapPin,
  Sparkles,
  Users,
  Wind,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/modal-portal';
import { QUICK_PICK_CITIES } from '@/config/cities';
import { useAuth } from '@/hooks/useAuth';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useFamilyProfile } from '@/hooks/useFamilyProfile';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { cn } from '@/lib/cn';
import { detectUserGpsLocation } from '@/lib/geolocation';
import type { SaveMemberInput, TransportMode } from '@/models/family.model';
import type { LocationOption } from '@/types';

type ProtectionTag = 'solo' | 'school_kids' | 'toddlers' | 'elderly' | 'sensitive';

const PROTECTION_OPTIONS: { id: ProtectionTag; label: string; hint: string }[] = [
  { id: 'solo', label: 'Working Adults', hint: 'Daily commute & exercise' },
  { id: 'school_kids', label: 'School-Going Kids', hint: 'Outdoor play & school bus' },
  { id: 'toddlers', label: 'Toddlers (0–5 yrs)', hint: 'Extra-gentle air thresholds' },
  { id: 'elderly', label: 'Older Parents (60+)', hint: 'Morning walks & indoor comfort' },
  { id: 'sensitive', label: 'Sensitive Lungs', hint: 'Optional private alert flags' },
];

const COMMUTE_OPTIONS: { id: TransportMode; label: string }[] = [
  { id: 'personal_car', label: 'Personal Car' },
  { id: 'two_wheeler', label: 'Two-Wheeler' },
  { id: 'public_transit', label: 'Metro / Bus' },
  { id: 'wfh', label: 'Work From Home' },
  { id: 'walk_cycle', label: 'Walk / Cycle' },
];

export function QuickOnboardingModal() {
  const { user, userProfile, updateUser } = useAuth();
  const { selectedLocation, selectLocation } = useSelectedLocation();
  const { saveFamily, createMember } = useFamilyProfile();
  const { generate } = useDailyPlan();

  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [city, setCity] = useState<LocationOption>(selectedLocation);
  const [locatingGps, setLocatingGps] = useState(false);
  const [selectedTags, setSelectedTags] = useState<ProtectionTag[]>(['solo']);
  const [commuteMode, setCommuteMode] = useState<TransportMode>('personal_car');
  const [hasHepa, setHasHepa] = useState(false);
  const [hasExhaust, setHasExhaust] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !userProfile || userProfile.onboardingCompleted || dismissed) {
    return null;
  }

  function toggleTag(tag: ProtectionTag) {
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
      setError(err instanceof Error ? err.message : 'Could not detect GPS location.');
    } finally {
      setLocatingGps(false);
    }
  }

  async function handleSkip() {
    setDismissed(true);
    try {
      await updateUser({ onboardingCompleted: true });
    } catch {
      // Dismissed for this session regardless
    }
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    try {
      await selectLocation(city);

      const savedFamily = await saveFamily({
        householdName: userProfile?.displayName
          ? `${userProfile.displayName.split(' ')[0]}'s Household`
          : 'My Household',
        location: city,
        transportationHabits: {
          primaryMode: commuteMode,
          dailyCommuteKm: commuteMode === 'wfh' ? 0 : 18,
          vehicleFuelType: 'petrol',
          occupancy: 1,
        },
        exercisePreferences: {
          prefersOutdoor: true,
          preferredWindow: 'morning',
          activityType: 'walk',
        },
        indoorEquipment: {
          hasHepaPurifier: hasHepa,
          purifierRoomsCount: hasHepa ? 1 : 0,
          hasKitchenExhaust: hasExhaust,
          hasCrossVentilation: true,
          hasN95Masks: false,
          indoorSmokingPresent: false,
        },
      });

      const hasSensitivity = selectedTags.includes('sensitive');
      const membersToCreate: SaveMemberInput[] = [];
      if (selectedTags.includes('school_kids')) {
        membersToCreate.push({
          nickname: 'School Child',
          role: 'child_school',
          ageGroup: '6_12',
          optionalHealthProfile: hasSensitivity ? { hasRespiratorySensitivity: true, hasCardiacSensitivity: false, isPregnant: false, notes: null } : null,
        });
      }
      if (selectedTags.includes('toddlers')) {
        membersToCreate.push({
          nickname: 'Toddler',
          role: 'child_toddler',
          ageGroup: '0_5',
          optionalHealthProfile: hasSensitivity ? { hasRespiratorySensitivity: true, hasCardiacSensitivity: false, isPregnant: false, notes: null } : null,
        });
      }
      if (selectedTags.includes('elderly')) {
        membersToCreate.push({
          nickname: 'Older Parent',
          role: 'elderly',
          ageGroup: '60_plus',
          optionalHealthProfile: hasSensitivity ? { hasRespiratorySensitivity: true, hasCardiacSensitivity: false, isPregnant: false, notes: null } : null,
        });
      }
      if (membersToCreate.length === 0) {
        membersToCreate.push({
          nickname: userProfile?.displayName?.split(' ')[0] || 'Me',
          role: 'working_adult',
          ageGroup: '18_45',
          optionalHealthProfile: hasSensitivity ? { hasRespiratorySensitivity: true, hasCardiacSensitivity: false, isPregnant: false, notes: null } : null,
        });
      }

      // Create starter member descriptors cleanly (non-fatal if one fails)
      if (savedFamily.familyId) {
        await Promise.allSettled(membersToCreate.map((m) => createMember(m)));
      }

      await updateUser({
        primaryLocation: city,
        defaultFamilyId: savedFamily.familyId,
        onboardingCompleted: true,
      });

      setDismissed(true);
      // Kick off their first personalized Daily Plan in the background immediately!
      void generate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save quick setup. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-3 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Personalize BreatheWise AI in 30 seconds"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950">
              <Wind className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Quick Setup · Step {step} of 3
              </p>
              <h2 className="font-display text-lg font-bold text-zinc-950 dark:text-zinc-50">
                {step === 1
                  ? 'Where do you live?'
                  : step === 2
                    ? 'Who are you protecting?'
                    : 'Your commute & home air'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSkip()}
            aria-label="Skip setup for now"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-5 grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={cn(
                'h-1.5 rounded-full transition-colors',
                idx <= step ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800',
              )}
            />
          ))}
        </div>

        {error ? (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        ) : null}

        {/* Step 1: City + GPS */}
        {step === 1 ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={locatingGps}
              onClick={() => void handleUseGps()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-500/15 dark:border-emerald-400/35 dark:bg-emerald-400/12 dark:text-emerald-300"
            >
              {locatingGps ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              {locatingGps ? 'Detecting location…' : 'Use My Current Location (GPS)'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_PICK_CITIES.map((c) => {
                const active = c.locationId === city.locationId;
                return (
                  <button
                    key={c.locationId}
                    type="button"
                    onClick={() => setCity(c)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all',
                      active
                        ? 'border-emerald-500 bg-emerald-500/12 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-400/15 dark:text-emerald-200'
                        : 'border-zinc-200 bg-zinc-50/70 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300',
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">{c.city}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Step 2: Household Protection */}
        {step === 2 ? (
          <div className="space-y-2.5">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select everyone in your home — we tailor safe outdoor play and mask rules
              automatically.
            </p>
            <div className="space-y-2">
              {PROTECTION_OPTIONS.map((opt) => {
                const active = selectedTags.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleTag(opt.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-all',
                      active
                        ? 'border-emerald-500 bg-emerald-500/10 dark:border-emerald-400 dark:bg-emerald-400/15'
                        : 'border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{opt.hint}</p>
                      </div>
                    </div>
                    {active ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Step 3: Commute & Indoor Gear */}
        {step === 3 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Typical Daily Commute
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMUTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCommuteMode(opt.id)}
                    className={cn(
                      'cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
                      commuteMode === opt.id
                        ? 'border-emerald-500 bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Indoor Air Equipment at Home
              </p>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={hasHepa}
                  onChange={(e) => setHasHepa(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                I have a True-HEPA air purifier at home
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={hasExhaust}
                  onChange={(e) => setHasExhaust(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                I have a kitchen chimney / exhaust fan
              </label>
            </div>
          </div>
        ) : null}

        {/* Footer Controls */}
        <div className="mt-6 flex items-center justify-between gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => void handleSkip()}
              className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Skip for now
            </button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleFinish()}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {saving ? 'Building Your Plan…' : 'Finish & Build My Plan'}
            </Button>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
