import { Leaf, Shield } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCo2Kg } from '@/lib/formatters';

export function ImpactPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Impact</h1>
        <p className="text-sm text-slate-600">
          Environmental emissions avoided and personal exposure protection are always tracked and
          displayed separately.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                Environmental Emissions Avoided
              </CardTitle>
              <Badge variant="default">Estimate</Badge>
            </div>
            <CardDescription>
              Calculated deterministically from commute distance, vehicle type, occupancy, and
              documented DEFRA / India GHG emission factors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-slate-900">{formatCo2Kg(0)}</p>
            <p className="text-xs text-slate-500">
              Every logged action displays its exact formula and emission-factor assumptions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-700" aria-hidden="true" />
                Personal Exposure Protection
              </CardTitle>
              <Badge variant="neutral">Separate Metric</Badge>
            </div>
            <CardDescription>
              Tracks protective actions taken during elevated AQI (indoor exercise swaps, HEPA
              purifier usage, N95 mask use) — never mixed with CO2 totals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-slate-900">0 actions</p>
            <p className="text-xs text-slate-500">
              Weekly progress Recharts visualization activates once impact logs are connected.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
