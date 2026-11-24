import { Lock, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Family Profile</h1>
        <p className="text-sm text-slate-600">
          Household members, schedules, commute habits, indoor equipment, and optional private
          sensitivities.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-700" aria-hidden="true" />
              Household Members & Schedules
            </CardTitle>
            <CardDescription>
              Add working parents, school-going children, and elderly family members to tailor
              deterministic risk protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Firestore CRUD connected to <code className="rounded bg-slate-100 px-1.5 py-0.5">families/</code>{' '}
            will be wired right after Firebase Auth in Phase 2.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-teal-700" aria-hidden="true" />
                Health Sensitivities
              </CardTitle>
              <Badge variant="neutral">Optional & Private</Badge>
            </div>
            <CardDescription>
              Strictly owner-only in Firestore and excluded from server logs. Used solely to apply
              more conservative general air-quality guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Includes indoor equipment toggles (HEPA air purifier, kitchen exhaust, N95 masks) and
            commute distance/mode defaults.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
