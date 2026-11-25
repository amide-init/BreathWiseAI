import { CheckCircle2, Lock, MapPin, Save, User, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import type { AqiScalePreference } from '@/models/user.model';

export function ProfilePage() {
  const { user, userProfile, updateUser } = useAuth();
  const { selectedLocation, openPicker } = useSelectedLocation();

  const [displayName, setDisplayName] = useState(
    userProfile?.displayName ?? user?.displayName ?? '',
  );
  const [aqiScale, setAqiScale] = useState<AqiScalePreference>(
    userProfile?.aqiScalePreference ?? 'CPCB_NAQI',
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setAqiScale(userProfile.aqiScalePreference);
    }
  }, [userProfile]);

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await updateUser({
        displayName,
        aqiScalePreference: aqiScale,
        primaryLocation: selectedLocation,
      });
      setSaveMessage('Account profile saved to Firestore.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Family Profile</h1>
        <p className="text-sm text-slate-600">
          Manage your personal details, default city, household members, commute habits, and indoor
          equipment.
        </p>
      </div>

      {/* Editable User Collection Card (`users/{uid}`) */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-teal-700" aria-hidden="true" />
              Personal Account Details
            </CardTitle>
            <Badge variant="default">users collection</Badge>
          </div>
          <CardDescription>
            Stored privately in <code className="rounded bg-slate-100 px-1">users/{user?.uid ?? 'uid'}</code>{' '}
            and editable anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            {saveError ? <Alert variant="danger">{saveError}</Alert> : null}
            {saveMessage ? (
              <Alert variant="info" className="items-center">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{saveMessage}</span>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-700">Display Name</span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-700">Email (Account ID)</span>
                <input
                  type="email"
                  disabled
                  value={userProfile?.email ?? user?.email ?? ''}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-700">Preferred AQI Scale</span>
                <select
                  value={aqiScale}
                  onChange={(e) => setAqiScale(e.target.value as AqiScalePreference)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                >
                  <option value="CPCB_NAQI">India CPCB NAQI (0–500 · Recommended)</option>
                  <option value="US_EPA">US EPA AQI (0–500)</option>
                </select>
              </label>

              <div className="space-y-1">
                <span className="block text-xs font-medium text-slate-700">Primary City</span>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-slate-800">
                    <MapPin className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                    <span className="truncate">{selectedLocation.label}</span>
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={openPicker}>
                    Change
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? 'Saving…' : 'Save Account Details'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Household & Optional Health Cards (Phase 3 CRUD) */}
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
            Interactive CRUD for <code className="rounded bg-slate-100 px-1.5 py-0.5">families/</code>{' '}
            and member schedules activates next in Phase 3.
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
