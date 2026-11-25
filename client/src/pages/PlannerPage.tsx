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
    <Card className={completed ? 'border-emerald-200 bg-emerald-50/30' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-start gap-2.5 text-left"
          >
            {completed ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 hover:text-teal-700" />
            )}
            <div>
              <CardTitle
                className={completed ? 'line-through text-slate-500' : 'text-slate-900'}
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
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">
            What to do
          </p>
          <p className="text-slate-800">{item.whatToDo}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Why it’s recommended
          </p>
          <p className="text-slate-600">{item.why}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Practical Alternative
          </p>
          <p className="text-slate-700">{item.alternative}</p>
        </div>

        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-600">Supporting data:</span> {item.supportingData}
        </p>
      </CardContent>
    </Card>
  );
}

export function PlannerPage() {
  const { selectedLocation } = useSelectedLocation();
  const { plan, isLoading, isGenerating, error, generate, toggleItemCompleted } = useDailyPlan();
  const [activeTab, setActiveTab] = useState<TimeWindowTab>('all');

  const allItems = plan
    ? [...plan.sections.morning, ...plan.sections.afternoon, ...plan.sections.evening]
    : [];
  const completedCount = plan
    ? allItems.filter((item) => plan.completedItemIds.includes(item.itemId)).length
    : 0;

  const sectionsToRender: { key: 'morning' | 'afternoon' | 'evening'; label: string; items: RecommendationItem[] }[] =
    plan
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Plan</h1>
          <p className="text-sm text-slate-600">
            Personalized Morning, Afternoon & Evening routines for {selectedLocation.city}.
          </p>
        </div>

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
          {isGenerating ? 'Generating Plan…' : plan ? 'Regenerate Plan' : "Generate Today's Plan"}
        </Button>
      </div>

      <DataStateWrapper isLoading={isLoading} error={error} onRetry={() => void generate(true)}>
        {!plan ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck2 className="h-5 w-5 text-teal-700" aria-hidden="true" />
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
            {/* Plan Context Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <AqiBadge
                  category={plan.environmentalSnapshot.category}
                  aqi={plan.environmentalSnapshot.aqi}
                />
                <span className="text-xs text-slate-600">
                  Date: <strong>{plan.planDate}</strong> · Source:{' '}
                  {plan.environmentalSnapshot.source}
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
                    profile while Gemini is unavailable or unconfigured.
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

            {/* Window Filter Tabs */}
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
                  className={`min-h-[36px] cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-teal-700 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sections */}
            <div className="space-y-6">
              {sectionsToRender.map((section) => (
                <section key={section.key} className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
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

            {/* Verified RAG Citations */}
            {plan.citations.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-teal-700" aria-hidden="true" />
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

      {/* Indoor Air Advisor Teaser (Phase 4) */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Indoor Air Quality Advisor
            </CardTitle>
            <Badge variant="warning">Estimated (Questionnaire-Based)</Badge>
          </div>
          <CardDescription>
            Interactive 7-question home assessment (cooking ventilation, incense, dust, HEPA
            filtration) wired next in Phase 4 alongside the Conversational AI Assistant.
          </CardDescription>
        </CardHeader>
      </Card>

      <MedicalDisclaimer />
    </div>
  );
}
