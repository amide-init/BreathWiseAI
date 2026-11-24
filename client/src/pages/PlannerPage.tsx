import { CalendarCheck2, Home } from 'lucide-react';

import { MedicalDisclaimer } from '@/components/shared/MedicalDisclaimer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PlannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Plan</h1>
        <p className="text-sm text-slate-600">
          Morning, afternoon, and evening guidance plus the questionnaire-based Indoor Air Advisor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {['Morning', 'Afternoon', 'Evening'].map((windowName) => (
          <Card key={windowName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 text-teal-700" aria-hidden="true" />
                {windowName}
              </CardTitle>
              <CardDescription>
                Every recommendation displays: What to do · Why · Alternative · Supporting data.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Powered by the 5-node LangGraph workflow with deterministic CPCB risk constraints.
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-teal-700" aria-hidden="true" />
              Indoor Air Quality Advisor
            </CardTitle>
            <Badge variant="warning">Estimated (Questionnaire-Based)</Badge>
          </div>
          <CardDescription>
            Identifies indoor pollution sources (cooking ventilation, incense, dust, filtration)
            without claiming measured indoor PM2.5 sensor readings.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Interactive 7-question home assessment wired to{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">POST /api/v1/indoor-advisor/assess</code>.
        </CardContent>
      </Card>

      <MedicalDisclaimer />
    </div>
  );
}
