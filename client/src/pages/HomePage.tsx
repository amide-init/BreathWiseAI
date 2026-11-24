import { CloudOff, MessageSquareText, ShieldCheck, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AqiBadge } from '@/components/shared/AqiBadge';
import { FreshnessBanner } from '@/components/shared/FreshnessBanner';
import { MedicalDisclaimer } from '@/components/shared/MedicalDisclaimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CPCB_AQI_TOKENS } from '@/config/aqi-tokens';
import { APP_ROUTES } from '@/config/routes';
import type { AqiCategory } from '@/types';

const SCALE_PREVIEW: AqiCategory[] = [
  'Good',
  'Satisfactory',
  'Moderate',
  'Poor',
  'Very Poor',
  'Severe',
];

export function HomePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Air Quality Intelligence
          </h1>
          <p className="text-sm text-slate-600">
            Real-time CPCB NAQI, pollutants, weather, and actionable family routines.
          </p>
        </div>
        <AqiBadge category="Unavailable" />
      </div>

      <FreshnessBanner
        freshnessStatus="unavailable"
        observedAt={null}
        source="WAQI / CPCB + Open-Meteo"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-teal-700" aria-hidden="true" />
              Current Local AQI & Pollutants
            </CardTitle>
            <CardDescription>
              Live WAQI / CPCB and Open-Meteo integration activates in Phase 2. No synthetic or
              placeholder AQI numbers are ever shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {['CPCB NAQI', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)'].map((label) => (
                <div
                  key={label}
                  className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4"
                >
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-slate-700">
                    <CloudOff className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    Unavailable
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {SCALE_PREVIEW.map((cat) => (
                <AqiBadge
                  key={cat}
                  category={cat}
                  className="text-[11px]"
                  aqi={undefined}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              India CPCB NAQI scale ({CPCB_AQI_TOKENS.Good.rangeLabel} Good through{' '}
              {CPCB_AQI_TOKENS.Severe.rangeLabel} Severe).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-700" aria-hidden="true" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump into personalization, planning, or guidance.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            <Link to={APP_ROUTES.PROFILE}>
              <Button className="w-full justify-start" variant="primary">
                Set Up Family Profile
              </Button>
            </Link>
            <Link to={APP_ROUTES.PLANNER}>
              <Button className="w-full justify-start" variant="outline">
                Open Daily Clean-Air Planner
              </Button>
            </Link>
            <Link to={APP_ROUTES.ASSISTANT}>
              <Button className="w-full justify-start" variant="secondary">
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                Ask BreatheWise AI
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}
