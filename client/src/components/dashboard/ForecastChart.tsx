import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/hooks/useTheme';
import type { ForecastPoint } from '@/types';

interface ChartDatum {
  timeLabel: string;
  naqi: number | null;
  pm25: number | null;
}

function formatHourLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(11, 16);
  }
  return date.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true });
}

export function ForecastChart({ forecasts }: { forecasts: ForecastPoint[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const chartData: ChartDatum[] = forecasts
    .filter((pt) => pt.estimatedNaqi !== null)
    .slice(0, 18)
    .map((pt) => ({
      timeLabel: formatHourLabel(pt.forecastFor),
      naqi: pt.estimatedNaqi,
      pm25: pt.pm25,
    }));

  const strokeColor = isDark ? '#34d399' : '#059669';
  const gridColor = isDark ? '#27272a' : '#e4e4e7';
  const tickColor = isDark ? '#a1a1aa' : '#71717a';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            Upcoming Air-Quality Trend
          </CardTitle>
          <Badge variant="outline">Forecast (Estimated)</Badge>
        </div>
        <CardDescription>
          Hourly CPCB NAQI estimate from Open-Meteo Air Quality Forecast — distinct from live
          station readings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-400">
            Hourly pollution forecast is currently unavailable for this location. We never fabricate
            safe time windows without forecast data.
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="naqiFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 11, fill: tickColor }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    borderColor: isDark ? '#3f3f46' : '#e4e4e7',
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    color: isDark ? '#fafafa' : '#09090b',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="naqi"
                  name="Est. CPCB NAQI"
                  stroke={strokeColor}
                  strokeWidth={2.25}
                  fill="url(#naqiFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
