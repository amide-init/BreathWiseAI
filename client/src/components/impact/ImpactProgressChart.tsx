import { Leaf, Shield } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useTheme } from '@/hooks/useTheme';
import type { ImpactDailyPoint } from '@/models/impact.model';

interface ImpactTooltipProps {
  active?: boolean;
  payload?: { payload: ImpactDailyPoint }[];
}

function ImpactTooltip({ active, payload }: ImpactTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const pt = payload[0].payload;
  return (
    <div className="cloud-card min-w-[190px] rounded-2xl border border-[#DADCE0] bg-white/95 p-3 text-xs backdrop-blur-md dark:border-white/[0.12] dark:bg-[#1E1F20]/95">
      <p className="border-b border-[#E8EAED] pb-1.5 font-semibold text-[#202124] dark:border-white/[0.08] dark:text-[#E3E3E3]">
        {pt.label}
      </p>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[#5F6368] dark:text-[#9AA0A6]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#34A853]" />
            Est. CO₂ avoided
          </span>
          <span className="font-display font-bold tabular-nums text-[#137333] dark:text-[#81C995]">
            {pt.estimatedCo2Kg.toFixed(2)} kg
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[#5F6368] dark:text-[#9AA0A6]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4285F4]" />
            Exposure actions
          </span>
          <span className="font-display font-bold tabular-nums text-[#1A73E8] dark:text-[#8AB4F8]">
            {pt.exposureActions}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ImpactProgressChart({ data }: { data: ImpactDailyPoint[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const hasAnyActivity = data.some((d) => d.estimatedCo2Kg > 0 || d.exposureActions > 0);
  if (!hasAnyActivity) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-[#DADCE0] bg-[#F8F9FA]/80 px-4 text-center text-xs text-[#5F6368] dark:border-white/[0.12] dark:bg-[#131314]/70 dark:text-[#9AA0A6]">
        Log your first commute swap or exposure-protection action to visualize daily progress.
      </div>
    );
  }

  const totalCo2 = data.reduce((sum, d) => sum + d.estimatedCo2Kg, 0);
  const totalExposure = data.reduce((sum, d) => sum + d.exposureActions, 0);

  const co2Color = isDark ? '#81C995' : '#34A853';
  const exposureColor = isDark ? '#8AB4F8' : '#4285F4';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : '#E8EAED';
  const tickColor = isDark ? '#9AA0A6' : '#5F6368';

  return (
    <div className="space-y-3">
      {/* Clean Legend & Period Totals (Strictly Separate Metrics) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34A853]/12 px-3 py-1 font-semibold text-[#137333] dark:bg-[#81C995]/15 dark:text-[#81C995]">
            <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
            Est. CO₂ Avoided: {totalCo2.toFixed(1)} kg
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4285F4]/12 px-3 py-1 font-semibold text-[#1A73E8] dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Exposure Actions: {totalExposure}
          </span>
        </div>
        <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
          Separate axes · Hover any day for breakdown
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 6, left: -12, bottom: 0 }} barGap={4}>
            <defs>
              <linearGradient id="bwCo2Bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={co2Color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={co2Color} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="bwExposureBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={exposureColor} stopOpacity={0.95} />
                <stop offset="100%" stopColor={exposureColor} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="co2"
              tick={{ fontSize: 11, fill: co2Color }}
              axisLine={false}
              tickLine={false}
              unit=" kg"
            />
            <YAxis
              yAxisId="actions"
              orientation="right"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: exposureColor }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(66,133,244,0.06)' }}
              content={<ImpactTooltip />}
            />
            <Bar
              yAxisId="co2"
              dataKey="estimatedCo2Kg"
              name="Est. CO₂ Avoided (kg)"
              fill="url(#bwCo2Bar)"
              radius={[8, 8, 2, 2]}
              maxBarSize={24}
            />
            <Bar
              yAxisId="actions"
              dataKey="exposureActions"
              name="Exposure Protection Actions"
              fill="url(#bwExposureBar)"
              radius={[8, 8, 2, 2]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
