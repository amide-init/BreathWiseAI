import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useTheme } from '@/hooks/useTheme';
import type { ImpactDailyPoint } from '@/models/impact.model';

export function ImpactProgressChart({ data }: { data: ImpactDailyPoint[] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const hasAnyActivity = data.some((d) => d.estimatedCo2Kg > 0 || d.exposureActions > 0);
  if (!hasAnyActivity) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
        Log your first commute swap or exposure-protection action to visualize daily progress.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? '#27272a' : '#e4e4e7'}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#52525b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="co2"
            tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#52525b' }}
            axisLine={false}
            tickLine={false}
            unit=" kg"
          />
          <YAxis
            yAxisId="actions"
            orientation="right"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#52525b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              borderColor: isDark ? '#27272a' : '#e4e4e7',
              borderRadius: '0.75rem',
              fontSize: '12px',
              color: isDark ? '#fafafa' : '#09090b',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar
            yAxisId="co2"
            dataKey="estimatedCo2Kg"
            name="Est. CO₂ Avoided (kg)"
            fill={isDark ? '#34d399' : '#059669'}
            radius={[6, 6, 0, 0]}
          />
          <Bar
            yAxisId="actions"
            dataKey="exposureActions"
            name="Exposure Protection Actions"
            fill={isDark ? '#38bdf8' : '#0284c7'}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
