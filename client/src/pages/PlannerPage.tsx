import {
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Circle,
  Home,
  Info,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { IndoorAdvisorPanel } from '@/components/planner/IndoorAdvisorPanel';
import { AqiBadge } from '@/components/shared/AqiBadge';
import { DataStateWrapper } from '@/components/shared/DataStateWrapper';
import { MedicalDisclaimer } from '@/components/shared/MedicalDisclaimer';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import type { RecommendationItem } from '@/types';

type TimeWindowTab = 'all' | 'morning' | 'afternoon' | 'evening';
type PlannerModeTab = 'routine' | 'indoor';

const PRIORITY_VARIANT: Record<RecommendationItem['priority'], 'danger' | 'warning' | 'neutral'> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

function RecommendationCard({
  item,
  completed,
  onToggle,
}: {
  item: RecommendationItem;
  completed: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      className={
        completed
          ? 'border-emerald-300/70 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20'
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex cursor-pointer items-start gap-2.5 text-left"
          >
            {completed ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400 hover:text-emerald-600 dark:text-zinc-500 dark:hover:text-emerald-400" />
            )}
            <div>
              <CardTitle
                className={
                  completed
                    ? 'line-through text-zinc-500 dark:text-zinc-500'
                    : 'text-zinc-950 dark:text-zinc-50'
                }
              >
                {item.title}
              </CardTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant={PRIORITY_VARIANT[item.priority]}>
                  {item.priority.toUpperCase()} priority
                </Badge>
                <Badge variant="outline">{item.category.replace(/_/g, ' ')}</Badge>
                {item.targetMembers.map((member) => (
                  <Badge key={member} variant="neutral">
                    {member}
                  </Badge>
                ))}
              </div>
            </div>
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pl-12 text-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            What to do
          </p>
          <p className="text-zinc-800 dark:text-zinc-200">{item.whatToDo}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Why it’s recommended
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
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Supporting data:</span>{' '}
          {item.supportingData}
        </p>
      </CardContent>
    </Card>
  );
}

export function PlannerPage() {
  const { selectedLocation } = useSelectedLocation();
  const { plan, isLoading, isGenerating, error, generate, toggleItemCompleted } = useDailyPlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TimeWindowTab>('all');

  const modeTab: PlannerModeTab = searchParams.get('tab') === 'indoor' ? 'indoor' : 'routine';

  function handleModeTabChange(next: PlannerModeTab) {
    if (next === 'indoor') {
      setSearchParams({ tab: 'indoor' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  const allItems = plan
    ? [...plan.sections.morning, ...plan.sections.afternoon, ...plan.sections.evening]
    : [];
  const completedCount = plan
    ? allItems.filter((item) => plan.completedItemIds.includes(item.itemId)).length
    : 0;

  const sectionsToRender = plan
    ? (
        [
          { key: 'morning' as const, label: 'Morning', items: plan.sections.morning },
          { key: 'afternoon' as const, label: 'Afternoon', items: plan.sections.afternoon },
          { key: 'evening' as const, label: 'Evening', items: plan.sections.evening },
        ] as const
      ).filter((s) => activeTab === 'all' || activeTab === s.key)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Daily Plan &amp; Indoor Advisor
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Personalized routines and estimated indoor air improvements for {selectedLocation.city}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-white p-1 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
            role="tablist"
            aria-label="Planner mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modeTab === 'routine'}
              onClick={() => handleModeTabChange('routine')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                modeTab === 'routine'
                  ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
              }`}
            >
              <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
              Daily Routine
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modeTab === 'indoor'}
              onClick={() => handleModeTabChange('indoor')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                modeTab === 'indoor'
                  ? 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
              }`}
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              Indoor Advisor
            </button>
          </div>

          {modeTab === 'routine' ? (
            <Button
              onClick={() => void generate(true)}
              disabled={isGenerating}
              variant="primary"
              size="sm"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {isGenerating
                ? 'Generating Plan…'
                : plan
                  ? 'Regenerate Plan'
                  : "Generate Today's Plan"}
            </Button>
          ) : null}
        </div>
      </div>

      {modeTab === 'indoor' ? (
        <IndoorAdvisorPanel />
      ) : (
        <DataStateWrapper isLoading={isLoading} error={error} onRetry={() => void generate(true)}>
        {!plan ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck2
                  className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                No Clean-Air Plan Generated Yet for Today
              </CardTitle>
              <CardDescription>
                Run the 5-node LangGraph engine using live local AQI, your Family Profile,
                deterministic CPCB risk rules, and verified public-health guidance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => void generate(false)} disabled={isGenerating}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {isGenerating ? 'Generating…' : "Generate Today's Clean-Air Plan"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
              <div className="flex flex-wrap items-center gap-2.5">
                <AqiBadge
                  category={plan.environmentalSnapshot.category}
                  aqi={plan.environmentalSnapshot.aqi}
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Date: <strong className="text-zinc-900 dark:text-zinc-100">{plan.planDate}</strong>{' '}
                  · Source: {plan.environmentalSnapshot.source}
                </span>
              </div>
              <Badge variant="default">
                {completedCount} / {allItems.length} completed
              </Badge>
            </div>

            {plan.fallbackMode ? (
              <Alert variant="info">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Generated with Verified Deterministic Guidelines</p>
                  <p className="text-xs opacity-90">
                    All recommendations strictly obey CPCB NAQI risk rules and your household
                    profile.
                  </p>
                </div>
              </Alert>
            ) : null}

            {plan.riskAssessment.constraints.medicalEscalationRequired ? (
              <Alert variant="danger">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Severe Air-Quality Precaution</p>
                  <p className="text-xs">
                    Follow official local public-health advisories. If anyone experiences wheezing,
                    chest tightness, or shortness of breath, seek qualified medical care promptly.
                  </p>
                </div>
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Time of day filter">
              {(
                [
                  { id: 'all', label: 'Full Day' },
                  { id: 'morning', label: 'Morning' },
                  { id: 'afternoon', label: 'Afternoon' },
                  { id: 'evening', label: 'Evening' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[36px] cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-zinc-950 text-white dark:bg-emerald-500 dark:text-zinc-950'
                      : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {sectionsToRender.map((section) => (
                <section key={section.key} className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {section.label}
                  </h2>
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <RecommendationCard
                        key={item.itemId}
                        item={item}
                        completed={plan.completedItemIds.includes(item.itemId)}
                        onToggle={() => void toggleItemCompleted(item.itemId)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {plan.citations.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BookOpen
                      className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    Verified Knowledge Sources Used
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {plan.citations.map((c) => (
                    <Badge key={c.docId} variant="outline">
                      {c.title} · {c.sourceAuthority}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
        </DataStateWrapper>
      )}

      <MedicalDisclaimer />
    </div>
  );
}
