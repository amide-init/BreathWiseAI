import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Sparkles,
  Thermometer,
  TrendingUp,
  Wind,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/cn';
import type { AqiCategory, ForecastPoint } from '@/types';

type MetricMode = 'naqi' | 'pm25' | 'pm10';

interface ChartDatum {
  index: number;
  iso: string;
  timeLabel: string;
  fullTimeLabel: string;
  naqi: number | null;
  pm25: number | null;
  pm10: number | null;
  tempC: number | null;
  windSpeedKmh: number | null;
}

function classifyNaqi(aqi: number | null): {
  category: AqiCategory;
  color: string;
  badgeClass: string;
} {
  if (aqi === null) {
    return {
      category: 'Unavailable',
      color: '#5F6368',
      badgeClass: 'bg-[#F1F3F4] text-[#5F6368] dark:bg-white/[0.1] dark:text-[#9AA0A6]',
    };
  }
  if (aqi <= 50) {
    return {
      category: 'Good',
      color: '#34A853',
      badgeClass: 'bg-[#34A853]/15 text-[#137333] dark:bg-[#81C995]/20 dark:text-[#81C995]',
    };
  }
  if (aqi <= 100) {
    return {
      category: 'Satisfactory',
      color: '#34A853',
      badgeClass: 'bg-[#34A853]/15 text-[#137333] dark:bg-[#81C995]/20 dark:text-[#81C995]',
    };
  }
  if (aqi <= 200) {
    return {
      category: 'Moderate',
      color: '#F9AB00',
      badgeClass: 'bg-[#FBBC05]/20 text-[#9A6700] dark:bg-[#FDD663]/20 dark:text-[#FDD663]',
    };
  }
  if (aqi <= 300) {
    return {
      category: 'Poor',
      color: '#F97316',
      badgeClass: 'bg-[#F97316]/15 text-[#C2410C] dark:bg-[#F97316]/25 dark:text-[#FDBA74]',
    };
  }
  if (aqi <= 400) {
    return {
      category: 'Very Poor',
      color: '#EA4335',
      badgeClass: 'bg-[#EA4335]/15 text-[#C5221F] dark:bg-[#F28B82]/20 dark:text-[#F28B82]',
    };
  }
  return {
    category: 'Severe',
    color: '#B31412',
    badgeClass: 'bg-[#B31412]/18 text-[#A50E0E] dark:bg-[#F28B82]/25 dark:text-[#F28B82]',
  };
}

function formatHourLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(11, 16);
  }
  return date.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true });
}

function formatFullTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const dayLabel = isToday
    ? 'Today'
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dayLabel} · ${time}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
  metric: MetricMode;
}

function ForecastTooltip({ active, payload, metric }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const pt = payload[0].payload;
  const naqiMeta = classifyNaqi(pt.naqi);

  return (
    <div className="cloud-card min-w-[200px] rounded-2xl border border-[#DADCE0] bg-white/95 p-3 text-xs backdrop-blur-md dark:border-white/[0.12] dark:bg-[#1E1F20]/95">
      <div className="flex items-center justify-between gap-3 border-b border-[#E8EAED] pb-2 dark:border-white/[0.08]">
        <span className="font-semibold text-[#202124] dark:text-[#E3E3E3]">{pt.fullTimeLabel}</span>
        {pt.naqi !== null ? (
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', naqiMeta.badgeClass)}>
            {naqiMeta.category}
          </span>
        ) : null}
      </div>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5F6368] dark:text-[#9AA0A6]">Est. CPCB NAQI</span>
          <span
            className={cn(
              'font-display tabular-nums',
              metric === 'naqi'
                ? 'text-sm font-bold text-[#202124] dark:text-[#E3E3E3]'
                : 'font-semibold text-[#3C4043] dark:text-[#C4C7C5]',
            )}
          >
            {pt.naqi !== null ? Math.round(pt.naqi) : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5F6368] dark:text-[#9AA0A6]">PM2.5</span>
          <span
            className={cn(
              'tabular-nums',
              metric === 'pm25'
                ? 'font-bold text-[#1A73E8] dark:text-[#8AB4F8]'
                : 'font-medium text-[#3C4043] dark:text-[#C4C7C5]',
            )}
          >
            {pt.pm25 !== null ? `${pt.pm25.toFixed(1)} µg/m³` : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[#5F6368] dark:text-[#9AA0A6]">PM10</span>
          <span
            className={cn(
              'tabular-nums',
              metric === 'pm10'
                ? 'font-bold text-[#9A6700] dark:text-[#FDD663]'
                : 'font-medium text-[#3C4043] dark:text-[#C4C7C5]',
            )}
          >
            {pt.pm10 !== null ? `${pt.pm10.toFixed(1)} µg/m³` : '—'}
          </span>
        </div>
      </div>

      {pt.tempC !== null || pt.windSpeedKmh !== null ? (
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-[#E8EAED] pt-2 text-[11px] text-[#5F6368] dark:border-white/[0.08] dark:text-[#9AA0A6]">
          {pt.tempC !== null ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Thermometer className="h-3 w-3 text-[#EA4335] dark:text-[#F28B82]" />
              {Math.round(pt.tempC)}°C
            </span>
          ) : null}
          {pt.windSpeedKmh !== null ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Wind className="h-3 w-3 text-[#4285F4] dark:text-[#8AB4F8]" />
              {Math.round(pt.windSpeedKmh)} km/h wind
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const METRIC_META: Record<
  MetricMode,
  {
    label: string;
    unit: string;
    strokeLight: string;
    strokeDark: string;
    refValue: number;
    refLabel: string;
  }
> = {
  naqi: {
    label: 'AQI',
    unit: 'NAQI',
    strokeLight: '#4285F4',
    strokeDark: '#8AB4F8',
    refValue: 100,
    refLabel: 'Satisfactory (100)',
  },
  pm25: {
    label: 'PM2.5',
    unit: 'µg/m³',
    strokeLight: '#1A73E8',
    strokeDark: '#8AB4F8',
    refValue: 60,
    refLabel: 'CPCB 24h std (60)',
  },
  pm10: {
    label: 'PM10',
    unit: 'µg/m³',
    strokeLight: '#F9AB00',
    strokeDark: '#FDD663',
    refValue: 100,
    refLabel: 'CPCB 24h std (100)',
  },
};

export function ForecastChart({ forecasts }: { forecasts: ForecastPoint[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [metric, setMetric] = useState<MetricMode>('naqi');

  const chartData: ChartDatum[] = useMemo(
    () =>
      forecasts
        .filter((pt) => pt.estimatedNaqi !== null || pt.pm25 !== null || pt.pm10 !== null)
        .slice(0, 18)
        .map((pt, index) => ({
          index,
          iso: pt.forecastFor,
          timeLabel: formatHourLabel(pt.forecastFor),
          fullTimeLabel: formatFullTimeLabel(pt.forecastFor),
          naqi: pt.estimatedNaqi,
          pm25: pt.pm25,
          pm10: pt.pm10,
          tempC: pt.tempC,
          windSpeedKmh: pt.windSpeedKmh,
        })),
    [forecasts],
  );

  // Grounded statistical highlights strictly computed from real forecast points
  const insights = useMemo(() => {
    const valid = chartData.filter((d) => d[metric] !== null);
    if (valid.length === 0) {
      return null;
    }

    let lowest = valid[0];
    let peak = valid[0];
    for (const pt of valid) {
      const val = pt[metric] as number;
      if (val < (lowest[metric] as number)) {
        lowest = pt;
      }
      if (val > (peak[metric] as number)) {
        peak = pt;
      }
    }

    const firstVal = valid[0][metric] as number;
    const lastVal = valid[valid.length - 1][metric] as number;
    const delta = Math.round(lastVal - firstVal);
    const maxVal = peak[metric] as number;

    return {
      lowest,
      peak,
      delta,
      maxVal,
      lowestVal: lowest[metric] as number,
    };
  }, [chartData, metric]);

  const meta = METRIC_META[metric];
  const strokeColor = isDark ? meta.strokeDark : meta.strokeLight;
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : '#E8EAED';
  const tickColor = isDark ? '#9AA0A6' : '#5F6368';

  // Compute comfortable Y-axis max so CPCB reference lines and curves breathe nicely
  const yMax = useMemo(() => {
    if (!insights) {
      return 200;
    }
    const base = Math.max(insights.maxVal * 1.18, meta.refValue * 1.15);
    return Math.ceil(base / 25) * 25;
  }, [insights, meta.refValue]);

  const hasPm25 = chartData.some((d) => d.pm25 !== null);
  const hasPm10 = chartData.some((d) => d.pm10 !== null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp
                className="h-4 w-4 text-[#4285F4] dark:text-[#8AB4F8]"
                aria-hidden="true"
              />
              Next 18 Hours Air-Quality Forecast
            </CardTitle>
            <CardDescription className="mt-0.5">
              Hourly Open-Meteo Air Quality forecast — hover or tap any hour for PM2.5, temperature
              &amp; wind.
            </CardDescription>
          </div>

          {/* Interactive Metric Switcher */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-[#DADCE0] bg-[#F8F9FA] p-0.5 dark:border-white/[0.1] dark:bg-[#131314]">
              {(
                [
                  { id: 'naqi', label: 'AQI', enabled: true },
                  { id: 'pm25', label: 'PM2.5', enabled: hasPm25 },
                  { id: 'pm10', label: 'PM10', enabled: hasPm10 },
                ] as const
              )
                .filter((t) => t.enabled)
                .map((tab) => {
                  const active = metric === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMetric(tab.id)}
                      className={cn(
                        'cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition-all',
                        active
                          ? 'bg-[#4285F4] text-white shadow-xs'
                          : 'text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-[#E3E3E3]',
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Estimated
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {chartData.length === 0 || !insights ? (
          <div className="rounded-2xl border border-dashed border-[#DADCE0] bg-[#F8F9FA] px-4 py-8 text-center text-xs text-[#5F6368] dark:border-white/[0.12] dark:bg-[#131314]/70 dark:text-[#9AA0A6]">
            Hourly pollution forecast is currently unavailable for this location. We never fabricate
            safe time windows without forecast data.
          </div>
        ) : (
          <>
            {/* Grounded At-a-Glance Summary Strip */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {/* Lowest Pollution Hour */}
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#34A853]/25 bg-[#E6F4EA]/65 px-3.5 py-2.5 dark:border-[#81C995]/20 dark:bg-[#34A853]/10">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#137333] dark:text-[#81C995]">
                    Lowest Forecast Hour
                  </p>
                  <p className="font-display mt-0.5 truncate text-sm font-bold text-[#202124] dark:text-[#E3E3E3]">
                    {insights.lowest.timeLabel}{' '}
                    <span className="font-sans text-xs font-semibold text-[#137333] dark:text-[#81C995]">
                      · {Math.round(insights.lowestVal)} {meta.unit}
                    </span>
                  </p>
                </div>
                <Sparkles className="h-4 w-4 shrink-0 text-[#34A853] dark:text-[#81C995]" />
              </div>

              {/* Peak Pollution Hour */}
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#EA4335]/25 bg-[#FCE8E6]/65 px-3.5 py-2.5 dark:border-[#F28B82]/20 dark:bg-[#EA4335]/10">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#C5221F] dark:text-[#F28B82]">
                    Peak Pollution Hour
                  </p>
                  <p className="font-display mt-0.5 truncate text-sm font-bold text-[#202124] dark:text-[#E3E3E3]">
                    {insights.peak.timeLabel}{' '}
                    <span className="font-sans text-xs font-semibold text-[#C5221F] dark:text-[#F28B82]">
                      · {Math.round(insights.maxVal)} {meta.unit}
                    </span>
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[#EA4335] dark:text-[#F28B82]" />
              </div>

              {/* 18-Hour Direction */}
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#4285F4]/25 bg-[#E8F0FE]/65 px-3.5 py-2.5 dark:border-[#8AB4F8]/20 dark:bg-[#4285F4]/10">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A73E8] dark:text-[#8AB4F8]">
                    18-Hour Trend
                  </p>
                  <p className="font-display mt-0.5 truncate text-sm font-bold text-[#202124] dark:text-[#E3E3E3]">
                    {insights.delta <= -8
                      ? `Improving (${insights.delta})`
                      : insights.delta >= 8
                        ? `Rising (+${insights.delta})`
                        : 'Steady'}
                  </p>
                </div>
                {insights.delta <= -8 ? (
                  <ArrowDownRight className="h-4 w-4 shrink-0 text-[#34A853] dark:text-[#81C995]" />
                ) : insights.delta >= 8 ? (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#EA4335] dark:text-[#F28B82]" />
                ) : (
                  <Minus className="h-4 w-4 shrink-0 text-[#4285F4] dark:text-[#8AB4F8]" />
                )}
              </div>
            </div>

            {/* Interactive Chart with CPCB Severity Bands */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -16, bottom: 2 }}>
                  <defs>
                    <linearGradient id="bwForecastFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={strokeColor} stopOpacity={isDark ? 0.34 : 0.28} />
                      <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  {/* Soft CPCB NAQI Severity Zones when viewing AQI */}
                  {metric === 'naqi' ? (
                    <>
                      <ReferenceArea
                        y1={0}
                        y2={Math.min(100, yMax)}
                        fill="#34A853"
                        fillOpacity={isDark ? 0.06 : 0.07}
                      />
                      {yMax > 100 ? (
                        <ReferenceArea
                          y1={100}
                          y2={Math.min(200, yMax)}
                          fill="#FBBC05"
                          fillOpacity={isDark ? 0.05 : 0.08}
                        />
                      ) : null}
                      {yMax > 200 ? (
                        <ReferenceArea
                          y1={200}
                          y2={Math.min(300, yMax)}
                          fill="#F97316"
                          fillOpacity={isDark ? 0.06 : 0.08}
                        />
                      ) : null}
                      {yMax > 300 ? (
                        <ReferenceArea
                          y1={300}
                          y2={yMax}
                          fill="#EA4335"
                          fillOpacity={isDark ? 0.07 : 0.09}
                        />
                      ) : null}
                    </>
                  ) : null}

                  <CartesianGrid strokeDasharray="3 4" stroke={gridColor} vertical={false} />

                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={22}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, yMax]}
                    width={46}
                  />

                  {/* Helpful Reference Threshold Lines */}
                  <ReferenceLine
                    y={meta.refValue}
                    stroke={isDark ? '#81C995' : '#34A853'}
                    strokeDasharray="4 4"
                    strokeOpacity={0.75}
                    label={{
                      value: meta.refLabel,
                      position: 'insideTopRight',
                      fill: isDark ? '#81C995' : '#137333',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  {metric === 'naqi' && yMax >= 210 ? (
                    <ReferenceLine
                      y={200}
                      stroke={isDark ? '#F28B82' : '#EA4335'}
                      strokeDasharray="4 4"
                      strokeOpacity={0.65}
                      label={{
                        value: 'Poor (200)',
                        position: 'insideTopRight',
                        fill: isDark ? '#F28B82' : '#C5221F',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  ) : null}

                  <Tooltip
                    cursor={{
                      stroke: strokeColor,
                      strokeWidth: 1.5,
                      strokeDasharray: '3 3',
                    }}
                    content={<ForecastTooltip metric={metric} />}
                  />

                  <Area
                    type="monotone"
                    dataKey={metric}
                    name={meta.label}
                    stroke={strokeColor}
                    strokeWidth={2.75}
                    fill="url(#bwForecastFill)"
                    dot={(dotProps) => {
                      const { cx, cy, payload } = dotProps as {
                        cx?: number;
                        cy?: number;
                        payload?: ChartDatum;
                      };
                      if (cx === undefined || cy === undefined || !payload) {
                        return <g key="empty" />;
                      }
                      const isLowest = payload.iso === insights.lowest.iso;
                      const isPeak = payload.iso === insights.peak.iso && insights.peak.iso !== insights.lowest.iso;
                      if (!isLowest && !isPeak) {
                        return <g key={payload.iso} />;
                      }
                      const dotFill = isLowest ? '#34A853' : '#EA4335';
                      return (
                        <g key={payload.iso}>
                          <circle cx={cx} cy={cy} r={8} fill={dotFill} fillOpacity={0.22} />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4.5}
                            fill={dotFill}
                            stroke={isDark ? '#1E1F20' : '#FFFFFF'}
                            strokeWidth={2}
                          />
                        </g>
                      );
                    }}
                    activeDot={{
                      r: 6,
                      fill: strokeColor,
                      stroke: isDark ? '#1E1F20' : '#FFFFFF',
                      strokeWidth: 2.5,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Compact CPCB Band Legend + Source Clarity */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E8EAED] pt-2.5 text-[11px] text-[#5F6368] dark:border-white/[0.08] dark:text-[#9AA0A6]">
              {metric === 'naqi' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#34A853]" />
                    0–100 Good/Sat
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FBBC05]" />
                    101–200 Moderate
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F97316]" />
                    201–300 Poor
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#EA4335]" />
                    301+ Very Poor
                  </span>
                </div>
              ) : (
                <span>
                  Dashed line shows India CPCB 24-hour standard ({meta.refValue} {meta.unit}).
                </span>
              )}
              <span className="text-[10px]">Forecast estimate · distinct from live station</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
