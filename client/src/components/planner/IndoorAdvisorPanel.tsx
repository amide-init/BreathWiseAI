import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Home,
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { AqiBadge } from '@/components/shared/AqiBadge';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFamilyProfile } from '@/hooks/useFamilyProfile';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import {
  COOKING_FUEL_LABELS,
  DEFAULT_INDOOR_QUESTIONNAIRE,
  DUST_CLEANING_LABELS,
  WINDOW_SEALING_LABELS,
  type CookingFuelType,
  type DustCleaningMethod,
  type IndoorAssessmentResult,
  type IndoorQuestionnaireInput,
  type IndoorRiskLevel,
  type WindowSealingQuality,
} from '@/models/indoor.model';
import { assessIndoorAir } from '@/services/indoor.service';

const FIELD_CLASS =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50';

const LABEL_CLASS = 'text-xs font-medium text-zinc-700 dark:text-zinc-300';

const RISK_BADGE_VARIANT: Record<IndoorRiskLevel, 'default' | 'neutral' | 'warning' | 'danger'> = {
  low: 'default',
  moderate: 'neutral',
  elevated: 'warning',
  high: 'danger',
};

export function IndoorAdvisorPanel() {
  const { selectedLocation } = useSelectedLocation();
  const { family } = useFamilyProfile();

  const [form, setForm] = useState<IndoorQuestionnaireInput>(DEFAULT_INDOOR_QUESTIONNAIRE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<IndoorAssessmentResult | null>(null);

  // Pre-fill defaults from saved household equipment when available
  useEffect(() => {
    if (!family) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      usesKitchenExhaust: family.indoorEquipment.hasKitchenExhaust,
      hasHepaPurifier: family.indoorEquipment.hasHepaPurifier,
      indoorSmokingPresent: family.indoorEquipment.indoorSmokingPresent,
    }));
  }, [family]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await assessIndoorAir({
        location: selectedLocation,
        questionnaire: form,
        familyId: family?.familyId ?? null,
      });
      setAssessment(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate indoor air assessment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Alert variant="warning">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Estimated (Questionnaire-Based) Assessment</p>
          <p className="text-xs opacity-90">
            BreatheWise AI estimates indoor air risk from your home setup and current outdoor AQI in{' '}
            <strong>{selectedLocation.city}</strong> — never as a substitute for a physical indoor
            PM2.5 sensor.
          </p>
        </div>
      </Alert>

      {/* 7-Question Home Air Questionnaire */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              7-Question Home Air Assessment
            </CardTitle>
            <Badge variant="warning">Estimated · Non-Sensor</Badge>
          </div>
          <CardDescription>
            Answer these quick home questions to get tailored ventilation, cooking, dust-control,
            and filtration steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? <Alert variant="danger">{error}</Alert> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block space-y-1.5">
                <span className={LABEL_CLASS}>1. Primary Cooking Fuel</span>
                <select
                  value={form.cookingFuel}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      cookingFuel: e.target.value as CookingFuelType,
                    }))
                  }
                  className={FIELD_CLASS}
                >
                  {(Object.keys(COOKING_FUEL_LABELS) as CookingFuelType[]).map((key) => (
                    <option key={key} value={key}>
                      {COOKING_FUEL_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className={LABEL_CLASS}>2. Floor &amp; Dust Cleaning Method</span>
                <select
                  value={form.dustCleaningMethod}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dustCleaningMethod: e.target.value as DustCleaningMethod,
                    }))
                  }
                  className={FIELD_CLASS}
                >
                  {(Object.keys(DUST_CLEANING_LABELS) as DustCleaningMethod[]).map((key) => (
                    <option key={key} value={key}>
                      {DUST_CLEANING_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className={LABEL_CLASS}>3. Window &amp; Door Sealing</span>
                <select
                  value={form.windowSealingQuality}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      windowSealingQuality: e.target.value as WindowSealingQuality,
                    }))
                  }
                  className={FIELD_CLASS}
                >
                  {(Object.keys(WINDOW_SEALING_LABELS) as WindowSealingQuality[]).map((key) => (
                    <option key={key} value={key}>
                      {WINDOW_SEALING_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950/60">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={form.usesKitchenExhaust}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, usesKitchenExhaust: e.target.checked }))
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                <span>4. Uses kitchen chimney / exhaust fan while cooking</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={form.hasHepaPurifier}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, hasHepaPurifier: e.target.checked }))
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                <span>5. True-HEPA air purifier available at home</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={form.incenseOrDhoopDaily}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, incenseOrDhoopDaily: e.target.checked }))
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                <span>6. Daily incense (agarbatti), dhoop, or mosquito coils</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={form.indoorSmokingPresent}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, indoorSmokingPresent: e.target.checked }))
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                <span>7. Indoor tobacco or secondhand smoke present</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {family
                  ? `Saves answers to your "${family.householdName}" household profile.`
                  : 'Runs immediately for your current city (save a Family Profile to persist).'}
              </p>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                {submitting ? 'Analyzing Home Air…' : 'Generate Estimated Indoor Plan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Assessment Results */}
      {assessment ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle
                    className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  Estimated Indoor Risk:{' '}
                  <span className="capitalize">{assessment.estimatedRiskLevel}</span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={RISK_BADGE_VARIANT[assessment.estimatedRiskLevel]}>
                    {assessment.estimatedRiskLevel.toUpperCase()} (Estimated)
                  </Badge>
                  {assessment.environmentalSnapshot ? (
                    <AqiBadge
                      category={assessment.environmentalSnapshot.category}
                      aqi={assessment.environmentalSnapshot.aqi}
                    />
                  ) : null}
                </div>
              </div>
              <CardDescription>{assessment.disclaimer}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {assessment.savedToFamilyId ? (
                <Alert variant="info" className="items-center py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="text-xs">
                    Questionnaire saved to your Family Profile for future guidance.
                  </span>
                </Alert>
              ) : null}

              {assessment.keyIndoorSources.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Likely Indoor Particulate Sources Identified
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {assessment.keyIndoorSources.map((src) => (
                      <Badge key={src} variant="neutral">
                        {src}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {assessment.recommendations.map((item) => (
              <Card key={item.itemId}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>{item.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={
                          item.priority === 'high'
                            ? 'danger'
                            : item.priority === 'medium'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {item.priority.toUpperCase()} priority
                      </Badge>
                      <Badge variant="outline">{item.category.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      What to do
                    </p>
                    <p className="text-zinc-800 dark:text-zinc-200">{item.whatToDo}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Why it helps
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">{item.why}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Practical Alternative
                    </p>
                    <p className="text-zinc-700 dark:text-zinc-300">{item.alternative}</p>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      Supporting data:
                    </span>{' '}
                    {item.supportingData}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {assessment.citations.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookOpen
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  Verified Indoor Guidance Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {assessment.citations.map((c) => (
                  <Badge key={c.docId} variant="outline">
                    {c.title} · {c.sourceAuthority}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
