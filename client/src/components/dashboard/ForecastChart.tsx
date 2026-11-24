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
  const chartData: ChartDatum[] = forecasts
    .filter((pt) => pt.estimatedNaqi !== null)
    .slice(0, 18)
    .map((pt) => ({
      timeLabel: formatHourLabel(pt.forecastFor),
      naqi: pt.estimatedNaqi,
      pm25: pt.pm25,
    }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-700" aria-hidden="true" />
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
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
            Hourly pollution forecast is currently unavailable for this location. We never fabricate
            safe time windows without forecast data.
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="naqiFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="naqi"
                  name="Est. CPCB NAQI"
                  stroke="#0f766e"
                  strokeWidth={2}
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
