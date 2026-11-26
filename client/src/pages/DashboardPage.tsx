import {
  ArrowRight,
  Check,
  Clock,
  CloudOff,
  Compass,
  Droplets,
  LogIn,
  MapPin,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ForecastChart } from '@/components/dashboard/ForecastChart';
import { QuickDecisionsStrip } from '@/components/dashboard/QuickDecisionsStrip';
import { AgentTracePill } from '@/components/shared/AgentTracePill';
import { AqiBadge } from '@/components/shared/AqiBadge';
import { DataStateWrapper } from '@/components/shared/DataStateWrapper';
import { FreshnessBanner } from '@/components/shared/FreshnessBanner';
import { MedicalDisclaimer } from '@/components/shared/MedicalDisclaimer';
import { MetricInfoButton } from '@/components/shared/MetricInfoModal';
import { PwaInstallBanner } from '@/components/shared/PwaInstallBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAqiToken } from '@/config/aqi-tokens';
import { METRIC_EXPLAINERS } from '@/config/metric-explainers';
import { APP_ROUTES } from '@/config/routes';
import { useAirQuality } from '@/hooks/useAirQuality';
import { useAuth } from '@/hooks/useAuth';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { formatMeasurement, formatWindDirection } from '@/lib/formatters';
import { buildDailyAirShareText, shareTextMessage } from '@/lib/share';
import { getCurrentTimeWindow, TIME_WINDOW_META } from '@/lib/time-window';

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedLocation, openPicker } = useSelectedLocation();
  const { data, isLoading, isRefreshing, error, refresh } = useAirQuality();
  const { plan } = useDailyPlan();
  const [shareFeedback, setShareFeedback] = useState<'shared' | 'copied' | null>(null);

  const currentWindow = getCurrentTimeWindow();
  const windowMeta = TIME_WINDOW_META[currentWindow];

  const current = data?.current;
  const weather = data?.weather;
  const token = getAqiToken(current?.category ?? 'Unavailable');
  const pm25Reading = current?.readings.find((r) => r.pollutant === 'PM2.5');
  const pm10Reading = current?.readings.find((r) => r.pollutant === 'PM10');

  const pm25Eval = METRIC_EXPLAINERS.pm25.evaluateValue(pm25Reading?.value);
  const pm10Eval = METRIC_EXPLAINERS.pm10.evaluateValue(pm10Reading?.value);

  // Show actions for RIGHT NOW first (matching the user's current local time window)
  const rightNowActions = plan
    ? plan.sections[currentWindow].length > 0
      ? plan.sections[currentWindow]
      : [...plan.sections.morning, ...plan.sections.afternoon, ...plan.sections.evening].slice(0, 2)
    : [];

  const activeQuickDecisions = plan?.riskAssessment.quickDecisions ?? data?.quickDecisions;

  async function handleShareVerdict() {
    if (!current) {
      return;
    }
    const text = buildDailyAirShareText({
      city: selectedLocation.city,
      aqi: current.aqi,
      category: current.category,
      decisions: activeQuickDecisions,
    });
    const outcome = await shareTextMessage(
      `${selectedLocation.city} Air Quality — BreatheWise AI`,
      text,
    );
    if (outcome === 'shared' || outcome === 'copied') {
      setShareFeedback(outcome);
      window.setTimeout(() => setShareFeedback(null), 2500);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {windowMeta.greeting} · {windowMeta.rangeLabel}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {selectedLocation.city} Air Overview
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tap any <span className="font-semibold text-zinc-700 dark:text-zinc-300">ⓘ</span> icon
            to see what a metric means in plain English.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openPicker}>
            <MapPin
              className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            Change City
          </Button>
          {current ? (
            <Button variant="outline" size="sm" onClick={() => void handleShareVerdict()}>
              {shareFeedback ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Share2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              {shareFeedback === 'copied'
                ? 'Copied for WhatsApp'
                : shareFeedback === 'shared'
                  ? 'Shared ✓'
                  : 'Share Verdict'}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            disabled={isLoading || isRefreshing}
            onClick={() => refresh(Boolean(user))}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      <PwaInstallBanner />

      <DataStateWrapper isLoading={isLoading} error={error} onRetry={() => refresh(true)}>
        {data && current ? (
          <div className="space-y-6">
            {/* 1. Live AQI Score + Local Weather FIRST (immediate visibility above the fold) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className={`lg:col-span-2 ${token.surfaceClass} ${token.borderClass}`}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-1.5">
                      <Wind className={`h-5 w-5 ${token.accentTextClass}`} aria-hidden="true" />
                      <span>Air Quality Score</span>
                      <MetricInfoButton
                        metricKey="aqi"
                        currentValue={current.aqi}
                        formattedValue={
                          current.aqi !== null ? `${current.aqi} (${current.category})` : 'Unavailable'
                        }
                      />
                    </CardTitle>
                    <AqiBadge category={current.category} aqi={current.aqi} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-baseline gap-4">
                    {current.aqi !== null ? (
                      <p
                        className={`text-5xl font-extrabold tracking-tight tabular-nums ${token.accentTextClass}`}
                      >
                        {current.aqi}
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-2xl font-bold text-slate-600 dark:text-[#94A3B8]">
                        <CloudOff className="h-6 w-6 text-slate-400" aria-hidden="true" />
                        Unavailable
                      </p>
                    )}

                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-[#EEF2F6]">
                        {current.category} ({token.rangeLabel})
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[#8E9AA8]">
                        {current.dominantPollutant ? (
                          <Badge variant="neutral">
                            Main pollutant: {current.dominantPollutant.toUpperCase()}
                          </Badge>
                        ) : null}
                        {data.fallbackProviderUsed ? (
                          <Badge variant="outline">Open-Meteo Fallback</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <p className="rounded-xl border border-slate-200/70 bg-white/80 p-3.5 text-sm leading-relaxed text-slate-700 dark:border-white/[0.07] dark:bg-[#0B0E12]/60 dark:text-[#CBD5E1]">
                    {current.healthGuidance}
                  </p>

                  {/* PM2.5 & PM10 with Plain Labels + (i) Explainer Icons */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3.5 dark:border-white/[0.07] dark:bg-[#0B0E12]/70">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-slate-800 dark:text-[#EEF2F6]">
                            PM2.5
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-[#8E9AA8]">
                            · Tiny lung dust
                          </span>
                          <MetricInfoButton
                            metricKey="pm25"
                            currentValue={pm25Reading?.value}
                            formattedValue={formatMeasurement(pm25Reading?.value, 'µg/m³')}
                          />
                        </div>
                        <Badge
                          variant={
                            pm25Eval.tone === 'good'
                              ? 'default'
                              : pm25Eval.tone === 'caution'
                                ? 'warning'
                                : pm25Eval.tone === 'unhealthy'
                                  ? 'danger'
                                  : 'neutral'
                          }
                        >
                          {pm25Eval.badge}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 dark:text-[#EEF2F6]">
                        {formatMeasurement(pm25Reading?.value, 'µg/m³')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-3.5 dark:border-white/[0.07] dark:bg-[#0B0E12]/70">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-slate-800 dark:text-[#EEF2F6]">
                            PM10
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-[#8E9AA8]">
                            · Road dust
                          </span>
                          <MetricInfoButton
                            metricKey="pm10"
                            currentValue={pm10Reading?.value}
                            formattedValue={formatMeasurement(pm10Reading?.value, 'µg/m³')}
                          />
                        </div>
                        <Badge
                          variant={
                            pm10Eval.tone === 'good'
                              ? 'default'
                              : pm10Eval.tone === 'caution'
                                ? 'warning'
                                : pm10Eval.tone === 'unhealthy'
                                  ? 'danger'
                                  : 'neutral'
                          }
                        >
                          {pm10Eval.badge}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 dark:text-[#EEF2F6]">
                        {formatMeasurement(pm10Reading?.value, 'µg/m³')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Weather + Quick Shortcuts */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Local Weather</CardTitle>
                    <CardDescription>Source: {weather?.source ?? 'Open-Meteo'}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 dark:border-white/[0.07] dark:bg-[#0B0E12]/70">
                      <Thermometer
                        className="mx-auto h-4 w-4 text-teal-600 dark:text-teal-400"
                        aria-hidden="true"
                      />
                      <p className="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-[#EEF2F6]">
                        {formatMeasurement(weather?.tempC, '°C')}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#8E9AA8]">Temp</p>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 dark:border-white/[0.07] dark:bg-[#0B0E12]/70">
                      <Droplets className="mx-auto h-4 w-4 text-sky-400" aria-hidden="true" />
                      <p className="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-[#EEF2F6]">
                        {formatMeasurement(weather?.humidityPct, '%')}
                      </p>
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="text-[11px] text-slate-500 dark:text-[#8E9AA8]">
                          Humidity
                        </span>
                        <MetricInfoButton
                          metricKey="humidity"
                          currentValue={weather?.humidityPct}
                          formattedValue={formatMeasurement(weather?.humidityPct, '%')}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 dark:border-white/[0.07] dark:bg-[#0B0E12]/70">
                      <Compass
                        className="mx-auto h-4 w-4 text-slate-400 dark:text-[#8E9AA8]"
                        aria-hidden="true"
                      />
                      <p className="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-[#EEF2F6]">
                        {formatMeasurement(weather?.windSpeedKmh, 'km/h')}
                      </p>
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="text-[11px] text-slate-500 dark:text-[#8E9AA8]">
                          Wind {formatWindDirection(weather?.windDirectionDeg)}
                        </span>
                        <MetricInfoButton
                          metricKey="wind"
                          currentValue={weather?.windSpeedKmh}
                          formattedValue={formatMeasurement(weather?.windSpeedKmh, 'km/h')}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ShieldCheck
                        className="h-4 w-4 text-teal-600 dark:text-teal-400"
                        aria-hidden="true"
                      />
                      Quick Shortcuts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Link to={APP_ROUTES.ASSISTANT}>
                      <Button className="w-full justify-start" size="sm" variant="primary">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        Ask BreatheWise AI
                      </Button>
                    </Link>
                    <Link to={`${APP_ROUTES.PLANNER}?tab=indoor`}>
                      <Button className="w-full justify-start" size="sm" variant="outline">
                        Check Indoor Home Air
                      </Button>
                    </Link>
                    <Link to={APP_ROUTES.PROFILE}>
                      <Button className="w-full justify-start" size="sm" variant="secondary">
                        AI Family &amp; Home Setup
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>

            <FreshnessBanner
              freshnessStatus={current.freshnessStatus}
              observedAt={current.observedAt}
              source={current.source}
            />

            {/* 2. Everyday Human Quick Verdicts */}
            <QuickDecisionsStrip decisions={activeQuickDecisions} category={current.category} />

            {/* 4. Right Now Actions Preview (Time-Aware!) */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock
                        className="h-4 w-4 text-teal-600 dark:text-teal-400"
                        aria-hidden="true"
                      />
                      What To Do Right Now ({windowMeta.label})
                    </CardTitle>
                    <CardDescription>
                      Personalized to {selectedLocation.city} AQI{' '}
                      {current.aqi !== null ? current.aqi : ''} &amp; your home setup.
                    </CardDescription>
                  </div>
                  <Link to={APP_ROUTES.PLANNER}>
                    <Button variant="outline" size="sm">
                      {rightNowActions.length > 0 ? 'Open Full Plan' : 'Build My Daily Plan'}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
                {plan?.agentTrace && plan.agentTrace.length > 0 ? (
                  <AgentTracePill
                    trace={plan.agentTrace}
                    cityLabel={selectedLocation.city}
                    className="mt-2"
                  />
                ) : null}
              </CardHeader>
              <CardContent>
                {!user ? (
                  <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-teal-500/25 bg-teal-500/8 p-4 sm:flex-row sm:items-center dark:border-teal-400/20 dark:bg-teal-400/[0.07]">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-[#EEF2F6]">
                        Want advice tailored to your kids, parents &amp; daily commute?
                      </p>
                      <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                        Sign in free in 1 tap (30-sec AI setup · 100% private · zero ads) to unlock
                        your Daily Plan, Indoor Advisor, and Ask AI.
                      </p>
                    </div>
                    <Link to={APP_ROUTES.LOGIN} className="shrink-0">
                      <Button size="sm" variant="brand">
                        <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                        Personalize Free
                      </Button>
                    </Link>
                  </div>
                ) : rightNowActions.length === 0 ? (
                  <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 sm:flex-row sm:items-center dark:border-white/[0.12] dark:bg-white/[0.02]">
                    <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
                      Get 2 short, tailored actions for your {windowMeta.label.toLowerCase()} based
                      on live {selectedLocation.city} air and your family profile.
                    </p>
                    <Link to={APP_ROUTES.PLANNER} className="shrink-0">
                      <Button size="sm" variant="primary">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        Generate Now
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {rightNowActions.slice(0, 2).map((item) => (
                      <Link
                        key={item.itemId}
                        to={APP_ROUTES.PLANNER}
                        className="group rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 transition-all hover:border-teal-500/40 hover:bg-teal-500/5 dark:border-white/[0.08] dark:bg-[#0B0E12]/60 dark:hover:border-teal-400/35"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={
                              item.priority === 'high'
                                ? 'danger'
                                : item.priority === 'medium'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {item.priority === 'high' ? 'Top Priority' : item.priority}
                          </Badge>
                          <span className="text-[11px] font-medium text-teal-700 opacity-80 group-hover:opacity-100 dark:text-teal-400">
                            Details →
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900 dark:text-[#EEF2F6]">
                          {item.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-[#94A3B8]">
                          {item.whatToDo}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <ForecastChart forecasts={data.forecasts} />
          </div>
        ) : null}
      </DataStateWrapper>

      <MedicalDisclaimer />
    </div>
  );
}
