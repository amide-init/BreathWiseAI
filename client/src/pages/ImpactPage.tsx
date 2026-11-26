import {
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  Leaf,
  Plus,
  Share2,
  Shield,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ImpactGlobeIllustration } from '@/components/illustrations/GoogleAirIllustrations';
import { ImpactProgressChart } from '@/components/impact/ImpactProgressChart';
import { LogImpactModal } from '@/components/impact/LogImpactModal';
import { DataStateWrapper } from '@/components/shared/DataStateWrapper';
import { MetricInfoButton } from '@/components/shared/MetricInfoModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAirQuality } from '@/hooks/useAirQuality';
import { useAuth } from '@/hooks/useAuth';
import { useFamilyProfile } from '@/hooks/useFamilyProfile';
import { dedupeFetch, getCached, invalidateCached, setCached } from '@/lib/client-cache';
import { formatCo2Kg } from '@/lib/formatters';
import {
  buildImpactShareText,
  computeCleanAirStreak,
  shareTextMessage,
} from '@/lib/share';
import type {
  ImpactDomain,
  ImpactLogRecord,
  ImpactSummaryResponse,
  LogImpactInput,
} from '@/models/impact.model';
import { deleteImpactAction, getImpactSummary, logImpactAction } from '@/services/impact.service';

type LogFilter = 'all' | ImpactDomain;

function ImpactLogRow({
  record,
  onDelete,
  deleting,
}: {
  record: ImpactLogRecord;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [showAssumptions, setShowAssumptions] = useState(false);
  const isEmissions = record.impactDomain === 'emissions_reduction';

  return (
    <div className="rounded-2xl border border-[#DADCE0]/80 bg-[#F8F9FA] p-4 dark:border-white/[0.08] dark:bg-[#131314]/80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isEmissions ? 'default' : 'outline'}>
              {isEmissions ? 'Emissions Avoided (Est.)' : 'Exposure Protection'}
            </Badge>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{record.loggedDate}</span>
          </div>
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{record.title}</p>

          {isEmissions && record.estimatedCo2AvoidedKg !== null ? (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {formatCo2Kg(record.estimatedCo2AvoidedKg)} estimated CO₂e avoided
            </p>
          ) : null}

          {!isEmissions && record.exposureContext ? (
            <p className="text-xs text-sky-700 dark:text-sky-400">
              {[
                record.exposureContext.aqiAtTime
                  ? `Outdoor AQI ${record.exposureContext.aqiAtTime}`
                  : null,
                record.exposureContext.durationMinutes
                  ? `${record.exposureContext.durationMinutes} min protected`
                  : null,
                record.exposureContext.activityReplaced || null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Personal exposure reduction logged'}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          aria-label={`Delete ${record.title}`}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-950/60 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {isEmissions && record.calculationAssumptions ? (
        <div className="mt-2.5 border-t border-zinc-200/70 pt-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowAssumptions((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <Info className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>How this is estimated</span>
            {showAssumptions ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showAssumptions ? (
            <div className="mt-2 space-y-1 rounded-lg border border-zinc-200/80 bg-white p-2.5 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <p>
                <strong className="text-zinc-800 dark:text-zinc-200">Baseline:</strong>{' '}
                {record.calculationAssumptions.baselineMode}
                {record.calculationAssumptions.baselineFactorKgPerKm !== undefined &&
                record.calculationAssumptions.baselineFactorKgPerKm !== null
                  ? ` (${record.calculationAssumptions.baselineFactorKgPerKm} kg/km)`
                  : ''}
              </p>
              <p>
                <strong className="text-zinc-800 dark:text-zinc-200">Alternative:</strong>{' '}
                {record.calculationAssumptions.alternativeMode}
                {record.calculationAssumptions.distanceKm
                  ? ` · ${record.calculationAssumptions.distanceKm} km`
                  : ''}
                {record.calculationAssumptions.kwhSaved
                  ? ` · ${record.calculationAssumptions.kwhSaved} kWh saved`
                  : ''}
              </p>
              <p>
                <strong className="text-zinc-800 dark:text-zinc-200">Formula:</strong>{' '}
                <code>{record.calculationAssumptions.formula}</code>
              </p>
              <p>
                <strong className="text-zinc-800 dark:text-zinc-200">Source:</strong>{' '}
                {record.calculationAssumptions.factorSource}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const IMPACT_CACHE_TTL_MS = 5 * 60 * 1000;

export function ImpactPage() {
  const { user } = useAuth();
  const { data: aqData } = useAirQuality();
  const { family } = useFamilyProfile();

  const cacheKey = user ? `impact:${user.uid}:14` : null;
  const initialHit = cacheKey ? getCached<ImpactSummaryResponse>(cacheKey) : null;

  const [summary, setSummary] = useState<ImpactSummaryResponse | null>(initialHit?.value ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialHit);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [modalDomain, setModalDomain] = useState<ImpactDomain | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<'shared' | 'copied' | null>(null);

  const loadSummary = useCallback(
    async (force = false) => {
      const key = user ? `impact:${user.uid}:14` : null;
      const memHit = key && !force ? getCached<ImpactSummaryResponse>(key) : null;

      if (memHit) {
        setSummary(memHit.value);
        setIsLoading(false);
        setError(null);
        if (memHit.isFresh) {
          return;
        }
      } else if (!force) {
        setIsLoading(true);
      }

      setError(null);
      try {
        const res = key
          ? await dedupeFetch(`fetch:${key}`, () => getImpactSummary(14))
          : await getImpactSummary(14);
        if (key) {
          setCached(key, res, IMPACT_CACHE_TTL_MS);
        }
        setSummary(res);
      } catch (err) {
        if (!memHit) {
          setError(err instanceof Error ? err.message : 'Unable to load impact summary.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void loadSummary(false);
  }, [loadSummary]);

  async function handleLogSubmit(input: LogImpactInput) {
    await logImpactAction(input);
    if (cacheKey) {
      invalidateCached(cacheKey);
    }
    await loadSummary(true);
  }

  async function handleDelete(logId: string) {
    setDeletingId(logId);
    try {
      await deleteImpactAction(logId);
      if (cacheKey) {
        invalidateCached(cacheKey);
      }
      await loadSummary(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete action.');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredLogs = (summary?.recentLogs ?? []).filter(
    (log) => filter === 'all' || log.impactDomain === filter,
  );
  const streakDays = computeCleanAirStreak((summary?.recentLogs ?? []).map((l) => l.loggedDate));

  async function handleShareImpact() {
    if (!summary) {
      return;
    }
    const text = buildImpactShareText({
      estimatedCo2Kg: summary.emissions.totalEstimatedCo2AvoidedKg,
      protectiveActions: summary.exposure.totalProtectiveActions,
      streakDays,
    });
    const outcome = await shareTextMessage('My BreathWiseAI Clean-Air Impact', text);
    if (outcome === 'shared' || outcome === 'copied') {
      setShareFeedback(outcome);
      window.setTimeout(() => setShareFeedback(null), 2500);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <ImpactGlobeIllustration className="hidden h-14 w-20 shrink-0 sm:block" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#202124] dark:text-[#E3E3E3]">
                My Impact
              </h1>
              {streakDays > 0 ? (
                <Badge variant="warning" className="gap-1">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  {streakDays}-Day Clean-Air Streak
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-[#5F6368] dark:text-[#9AA0A6]">
              Environmental CO₂ avoided and personal exposure protection are strictly tracked and
              reported separately.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {summary ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleShareImpact()}
            >
              {shareFeedback ? (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Share2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              {shareFeedback === 'copied'
                ? 'Copied ✓'
                : shareFeedback === 'shared'
                  ? 'Shared ✓'
                  : 'Share Impact'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setModalDomain('emissions_reduction')}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Log Commute / Energy Swap
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setModalDomain('exposure_reduction')}
          >
            <Shield className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            Log Protection Action
          </Button>
        </div>
      </div>

      <DataStateWrapper isLoading={isLoading} error={error} onRetry={() => void loadSummary()}>
        {summary ? (
          <div className="space-y-6">
            {/* Strictly Separated Metric Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="border-[#34A853]/30 dark:border-[#81C995]/25">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Leaf
                        className="h-5 w-5 text-[#34A853] dark:text-[#81C995]"
                        aria-hidden="true"
                      />
                      <span>Environmental Emissions Avoided</span>
                      <MetricInfoButton
                        metricKey="co2_avoided"
                        currentValue={summary.emissions.totalEstimatedCo2AvoidedKg}
                        formattedValue={formatCo2Kg(summary.emissions.totalEstimatedCo2AvoidedKg)}
                      />
                    </CardTitle>
                    <Badge variant="default">Estimate · 14 Days</Badge>
                  </div>
                  <CardDescription>
                    Calculated deterministically from commute distance, vehicle type, occupancy, and
                    DEFRA / India GHG emission factors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-display text-3xl font-bold tabular-nums text-[#1E8E3E] dark:text-[#81C995]">
                    {formatCo2Kg(summary.emissions.totalEstimatedCo2AvoidedKg)}
                  </p>
                  <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                    Across {summary.emissions.actionCount} sustainable commute or energy action
                    {summary.emissions.actionCount === 1 ? '' : 's'}. Tap “How this is estimated” on
                    any log below for full assumptions.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-[#4285F4]/30 dark:border-[#8AB4F8]/25">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Shield
                        className="h-5 w-5 text-[#4285F4] dark:text-[#8AB4F8]"
                        aria-hidden="true"
                      />
                      Personal Exposure Protection
                    </CardTitle>
                    <Badge variant="neutral">Separate Metric · 14 Days</Badge>
                  </div>
                  <CardDescription>
                    Protective steps taken during elevated AQI (indoor exercise swaps, HEPA
                    purifier, N95 masks) — never converted to CO₂.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-display text-3xl font-extrabold tabular-nums text-sky-700 dark:text-sky-400">
                    {summary.exposure.totalProtectiveActions} action
                    {summary.exposure.totalProtectiveActions === 1 ? '' : 's'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {summary.exposure.totalProtectedMinutes > 0
                      ? `${summary.exposure.totalProtectedMinutes} total minutes of logged exposure protection.`
                      : 'Log indoor swaps, HEPA usage, or N95 trips to track family protection.'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 14-Day Recharts Progress */}
            <Card>
              <CardHeader>
                <CardTitle>14-Day Clean-Air Activity Trend</CardTitle>
                <CardDescription>
                  Left axis tracks estimated kg CO₂e avoided; right axis tracks separate
                  exposure-protection actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImpactProgressChart data={summary.dailySeries} />
              </CardContent>
            </Card>

            {/* Activity History */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Logged Actions ({filteredLogs.length})</CardTitle>
                    <CardDescription>
                      Inspect transparent emission-factor formulas or remove an entry.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'emissions_reduction', label: 'Emissions (Est.)' },
                        { id: 'exposure_reduction', label: 'Exposure Protection' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilter(tab.id)}
                        className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          filter === tab.id
                            ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                            : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredLogs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-400">
                    No actions logged in this category yet. Use the buttons above to log a carpool,
                    metro ride, indoor workout swap, or HEPA purifier session.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredLogs.map((record) => (
                      <ImpactLogRow
                        key={record.logId}
                        record={record}
                        deleting={deletingId === record.logId}
                        onDelete={() => void handleDelete(record.logId)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DataStateWrapper>

      {modalDomain ? (
        <LogImpactModal
          initialDomain={modalDomain}
          defaultAqi={aqData?.current.aqi}
          familyId={family?.familyId ?? null}
          onClose={() => setModalDomain(null)}
          onSubmit={handleLogSubmit}
        />
      ) : null}
    </div>
  );
}
