import {
  BookOpen,
  CalendarCheck2,
  Car,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Footprints,
  Home,
  Info,
  Leaf,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { IndoorAdvisorPanel } from '@/components/planner/IndoorAdvisorPanel';
import { AqiBadge } from '@/components/shared/AqiBadge';
import { DataStateWrapper } from '@/components/shared/DataStateWrapper';
import { MedicalDisclaimer } from '@/components/shared/MedicalDisclaimer';
import { MetricInfoButton } from '@/components/shared/MetricInfoModal';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { cn } from '@/lib/cn';
import {
  getCurrentTimeWindow,
  getOrderedTimeWindows,
  TIME_WINDOW_META,
  type TimeWindowKey,
} from '@/lib/time-window';
import type { RecommendationItem } from '@/types';

type TimeFilterTab = TimeWindowKey | 'all';
type PlannerModeTab = 'routine' | 'indoor';

const CATEGORY_META: Record<
  RecommendationItem['category'],
  { label: string; icon: typeof Home; accent: string }
> = {
  outdoor_activity: {
    label: 'Outdoors',
    icon: Footprints,
    accent: 'bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  },
  commute: {
    label: 'Commute',
    icon: Car,
    accent: 'bg-indigo-500/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
  },
  indoor_air: {
    label: 'Home Air',
    icon: Home,
    accent: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  cooking_ventilation: {
    label: 'Kitchen',
    icon: Utensils,
    accent: 'bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  },
  sustainability: {
    label: 'Clean Swap',
    icon: Leaf,
    accent: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  health_precaution: {
    label: 'Health Alert',
    icon: ShieldAlert,
    accent: 'bg-red-500/12 text-red-700 dark:bg-red-400/15 dark:text-red-300',
  },
};

function ActionDetailModal({
  item,
  completed,
  onToggle,
  onClose,
}: {
  item: RecommendationItem;
  completed: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const cat = CATEGORY_META[item.category];
  const Icon = cat.icon;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 p-3 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 pb-3">
          <div className="flex items-start gap-3">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', cat.accent)}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{item.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={
                    item.priority === 'high'
                      ? 'danger'
                      : item.priority === 'medium'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {item.priority === 'high' ? 'Top Priority' : `${item.priority} priority`}
                </Badge>
                <Badge variant="outline">{cat.label}</Badge>
                {item.targetMembers.map((member) => (
                  <Badge key={member} variant="neutral">
                    {member}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close action details"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              What to do
            </p>
            <p className="mt-1 leading-relaxed text-zinc-900 dark:text-zinc-100">{item.whatToDo}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Why it matters for you
            </p>
            <p className="mt-1 leading-relaxed text-zinc-700 dark:text-zinc-300">{item.why}</p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Easy Backup Plan
            </p>
            <p className="mt-1 leading-relaxed text-zinc-700 dark:text-zinc-300">
              {item.alternative}
            </p>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Based on:</span>{' '}
            {item.supportingData}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
          <Button type="button" variant={completed ? 'secondary' : 'brand'} size="sm" onClick={onToggle}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {completed ? 'Completed ✓' : 'Mark as Done'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompactActionCard({
  item,
  completed,
  onToggle,
  onOpenDetails,
}: {
  item: RecommendationItem;
  completed: boolean;
  onToggle: () => void;
  onOpenDetails: () => void;
}) {
  const cat = CATEGORY_META[item.category];
  const Icon = cat.icon;

  return (
    <Card
      className={cn(
        'transition-all hover:border-emerald-500/35 dark:hover:border-emerald-400/35',
        completed &&
          'border-emerald-300/70 bg-emerald-50/35 opacity-85 dark:border-emerald-800/60 dark:bg-emerald-950/20',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={completed ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
            className="mt-0.5 shrink-0 cursor-pointer"
          >
            {completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="h-5 w-5 text-zinc-400 hover:text-emerald-600 dark:text-zinc-500 dark:hover:text-emerald-400" />
            )}
          </button>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    cat.accent,
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {cat.label}
                </span>
                {item.priority === 'high' ? <Badge variant="danger">Top Priority</Badge> : null}
                {item.targetMembers.slice(0, 2).map((member) => (
                  <Badge key={member} variant="neutral">
                    {member}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3
                className={cn(
                  'font-display text-base font-bold leading-snug',
                  completed
                    ? 'line-through text-zinc-500 dark:text-zinc-500'
                    : 'text-zinc-950 dark:text-zinc-50',
                )}
              >
                {item.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.whatToDo}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onOpenDetails}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                <span>Why &amp; Backup Plan</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlannerPage() {
  const { selectedLocation } = useSelectedLocation();
  const { plan, isLoading, isGenerating, error, generate, toggleItemCompleted } = useDailyPlan();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentWindow = getCurrentTimeWindow();
  const orderedWindows = getOrderedTimeWindows(currentWindow);
  const [activeTab, setActiveTab] = useState<TimeFilterTab>(currentWindow);
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);

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
    ? orderedWindows
        .map((key) => ({
          key,
          meta: TIME_WINDOW_META[key],
          isNow: key === currentWindow,
          items: plan.sections[key],
        }))
        .filter((s) => activeTab === 'all' || activeTab === s.key)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Daily Plan &amp; Indoor Advisor
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Short, time-aware clean-air steps for {selectedLocation.city} — starting with right now.
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
                ? 'Personalizing…'
                : plan
                  ? 'Refresh Plan'
                  : "Build Today's Plan"}
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
                  Build Your {TIME_WINDOW_META[currentWindow].label} Clean-Air Plan
                </CardTitle>
                <CardDescription>
                  Get short, practical steps tailored to live {selectedLocation.city} air and your
                  family routine — no clutter, just what helps right now.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => void generate(false)} disabled={isGenerating}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {isGenerating ? 'Personalizing…' : "Build Today's Clean-Air Plan"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {/* Compact Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="flex flex-wrap items-center gap-2">
                  <AqiBadge
                    category={plan.environmentalSnapshot.category}
                    aqi={plan.environmentalSnapshot.aqi}
                  />
                  <MetricInfoButton
                    metricKey="aqi"
                    currentValue={plan.environmentalSnapshot.aqi}
                    formattedValue={
                      plan.environmentalSnapshot.aqi !== null
                        ? `${plan.environmentalSnapshot.aqi} (${plan.environmentalSnapshot.category})`
                        : 'Unavailable'
                    }
                  />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {plan.planDate} · {plan.environmentalSnapshot.source}
                  </span>
                </div>
                <Badge variant="default">
                  {completedCount} / {allItems.length} done today
                </Badge>
              </div>

              {plan.fallbackMode ? (
                <Alert variant="info">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p className="text-xs">
                    Generated from verified CPCB clean-air guidelines tailored to your family
                    profile.
                  </p>
                </Alert>
              ) : null}

              {plan.riskAssessment.constraints.medicalEscalationRequired ? (
                <Alert variant="danger">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">Severe Air-Quality Precaution</p>
                    <p className="text-xs">
                      Follow local health advisories. Seek qualified medical care promptly for
                      wheezing, chest tightness, or trouble breathing.
                    </p>
                  </div>
                </Alert>
              ) : null}

              {/* Time-Aware Filter Pills (Current Time First!) */}
              <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Time of day filter">
                {orderedWindows.map((key) => {
                  const isNow = key === currentWindow;
                  const items = plan.sections[key];
                  const doneInWindow = items.filter((i) =>
                    plan.completedItemIds.includes(i.itemId),
                  ).length;
                  const active = activeTab === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(key)}
                      className={cn(
                        'inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                        active
                          ? 'bg-zinc-950 text-white shadow-xs dark:bg-emerald-500 dark:text-zinc-950'
                          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
                      )}
                    >
                      {isNow ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 dark:bg-zinc-950" />
                      ) : null}
                      <span>{isNow ? `Right Now (${TIME_WINDOW_META[key].label})` : TIME_WINDOW_META[key].label}</span>
                      <span className="opacity-70">
                        {doneInWindow}/{items.length}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'all'}
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    'min-h-[38px] cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                    activeTab === 'all'
                      ? 'bg-zinc-950 text-white shadow-xs dark:bg-emerald-500 dark:text-zinc-950'
                      : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
                  )}
                >
                  Full Day ({allItems.length})
                </button>
              </div>

              {/* Compact Time-Ordered Action Cards */}
              <div className="space-y-6">
                {sectionsToRender.map((section) => (
                  <section key={section.key} className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{section.meta.label}</span>
                        <span className="font-normal normal-case opacity-75">
                          ({section.meta.rangeLabel})
                        </span>
                      </h2>
                      {section.isNow ? <Badge variant="default">Happening Now</Badge> : null}
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {section.items.map((item) => (
                        <CompactActionCard
                          key={item.itemId}
                          item={item}
                          completed={plan.completedItemIds.includes(item.itemId)}
                          onToggle={() => void toggleItemCompleted(item.itemId)}
                          onOpenDetails={() => setSelectedItem(item)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              {plan.citations.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Sources:
                  </span>
                  {plan.citations.map((c) => (
                    <Badge key={c.docId} variant="outline">
                      {c.title} · {c.sourceAuthority}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </DataStateWrapper>
      )}

      {selectedItem && plan ? (
        <ActionDetailModal
          item={selectedItem}
          completed={plan.completedItemIds.includes(selectedItem.itemId)}
          onToggle={() => void toggleItemCompleted(selectedItem.itemId)}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}

      <MedicalDisclaimer />
    </div>
  );
}
