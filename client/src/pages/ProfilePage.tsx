import {
  CheckCircle2,
  Home,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { MemberFormModal } from '@/components/profile/MemberFormModal';
import { DataStateWrapper } from '@/components/shared/DataStateWrapper';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useFamilyProfile } from '@/hooks/useFamilyProfile';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import {
  AGE_GROUP_LABELS,
  ROLE_LABELS,
  TRANSPORT_LABELS,
  type FamilyMemberModel,
  type SaveMemberInput,
  type TransportMode,
} from '@/models/family.model';
import type { AqiScalePreference } from '@/models/user.model';

const FIELD_CLASS =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50';

const LABEL_CLASS = 'text-xs font-medium text-zinc-700 dark:text-zinc-300';

export function ProfilePage() {
  const { user, userProfile, updateUser } = useAuth();
  const { selectedLocation, openPicker } = useSelectedLocation();
  const {
    family,
    members,
    isLoading,
    error: familyLoadError,
    saveFamily,
    createMember,
    editMember,
    removeMember,
    reload,
  } = useFamilyProfile();

  const [displayName, setDisplayName] = useState(
    userProfile?.displayName ?? user?.displayName ?? '',
  );
  const [aqiScale, setAqiScale] = useState<AqiScalePreference>(
    userProfile?.aqiScalePreference ?? 'CPCB_NAQI',
  );
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [householdName, setHouseholdName] = useState('My Family');
  const [primaryMode, setPrimaryMode] = useState<TransportMode>('personal_car');
  const [dailyCommuteKm, setDailyCommuteKm] = useState('18');
  const [vehicleFuelType, setVehicleFuelType] = useState('petrol');
  const [occupancy, setOccupancy] = useState('1');
  const [prefersOutdoor, setPrefersOutdoor] = useState(true);
  const [preferredWindow, setPreferredWindow] = useState('morning');
  const [activityType, setActivityType] = useState('walk');
  const [hasHepaPurifier, setHasHepaPurifier] = useState(false);
  const [purifierRoomsCount, setPurifierRoomsCount] = useState('1');
  const [hasKitchenExhaust, setHasKitchenExhaust] = useState(true);
  const [hasCrossVentilation, setHasCrossVentilation] = useState(true);
  const [hasN95Masks, setHasN95Masks] = useState(false);
  const [indoorSmokingPresent, setIndoorSmokingPresent] = useState(false);
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [householdFeedback, setHouseholdFeedback] = useState<string | null>(null);
  const [householdError, setHouseholdError] = useState<string | null>(null);

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMemberModel | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setAqiScale(userProfile.aqiScalePreference);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!family) {
      return;
    }
    setHouseholdName(family.householdName);
    setPrimaryMode(family.transportationHabits.primaryMode);
    setDailyCommuteKm(String(family.transportationHabits.dailyCommuteKm));
    setVehicleFuelType(family.transportationHabits.vehicleFuelType ?? 'petrol');
    setOccupancy(String(family.transportationHabits.occupancy));
    setPrefersOutdoor(family.exercisePreferences.prefersOutdoor);
    setPreferredWindow(family.exercisePreferences.preferredWindow ?? 'morning');
    setActivityType(family.exercisePreferences.activityType ?? 'walk');
    setHasHepaPurifier(family.indoorEquipment.hasHepaPurifier);
    setPurifierRoomsCount(String(Math.max(1, family.indoorEquipment.purifierRoomsCount)));
    setHasKitchenExhaust(family.indoorEquipment.hasKitchenExhaust);
    setHasCrossVentilation(family.indoorEquipment.hasCrossVentilation);
    setHasN95Masks(family.indoorEquipment.hasN95Masks);
    setIndoorSmokingPresent(family.indoorEquipment.indoorSmokingPresent);
  }, [family]);

  async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAccount(true);
    setAccountError(null);
    setAccountFeedback(null);
    try {
      await updateUser({
        displayName,
        aqiScalePreference: aqiScale,
        primaryLocation: selectedLocation,
      });
      setAccountFeedback('Account profile saved to Firestore.');
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Unable to save account details.');
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleSaveHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingHousehold(true);
    setHouseholdError(null);
    setHouseholdFeedback(null);
    try {
      await saveFamily({
        householdName,
        location: selectedLocation,
        transportationHabits: {
          primaryMode,
          dailyCommuteKm: Number(dailyCommuteKm) || 0,
          vehicleFuelType,
          occupancy: Number(occupancy) || 1,
        },
        exercisePreferences: {
          prefersOutdoor,
          preferredWindow,
          activityType,
        },
        indoorEquipment: {
          hasHepaPurifier,
          purifierRoomsCount: hasHepaPurifier ? Number(purifierRoomsCount) || 1 : 0,
          hasKitchenExhaust,
          hasCrossVentilation,
          hasN95Masks,
          indoorSmokingPresent,
        },
      });
      setHouseholdFeedback(
        'Household profile saved! Refresh your Daily Plan to personalize guidance.',
      );
    } catch (err) {
      setHouseholdError(err instanceof Error ? err.message : 'Unable to save household profile.');
    } finally {
      setSavingHousehold(false);
    }
  }

  async function handleMemberSubmit(input: SaveMemberInput) {
    if (editingMember) {
      await editMember(editingMember.memberId, input);
    } else {
      await createMember(input);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Family Profile
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Personalize clean-air routines for every member of your household.
          </p>
        </div>
        <Link to={APP_ROUTES.PLANNER}>
          <Button variant="outline" size="sm">
            View Personalized Daily Plan
          </Button>
        </Link>
      </div>

      {/* 1. Personal Account Details */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Personal Account Details
            </CardTitle>
            <Badge variant="neutral">Private Account</Badge>
          </div>
          <CardDescription>Your name, preferred AQI scale, and default location.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            {accountError ? <Alert variant="danger">{accountError}</Alert> : null}
            {accountFeedback ? (
              <Alert variant="info" className="items-center">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{accountFeedback}</span>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block space-y-1">
                <span className={LABEL_CLASS}>Display Name</span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={FIELD_CLASS}
                />
              </label>

              <label className="block space-y-1">
                <span className={LABEL_CLASS}>Email</span>
                <input
                  type="email"
                  disabled
                  value={userProfile?.email ?? user?.email ?? ''}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
                />
              </label>

              <label className="block space-y-1">
                <span className={LABEL_CLASS}>Preferred AQI Scale</span>
                <select
                  value={aqiScale}
                  onChange={(e) => setAqiScale(e.target.value as AqiScalePreference)}
                  className={FIELD_CLASS}
                >
                  <option value="CPCB_NAQI">India CPCB NAQI (0–500 · Recommended)</option>
                  <option value="US_EPA">US EPA AQI (0–500)</option>
                </select>
              </label>

              <div className="space-y-1">
                <span className={`block ${LABEL_CLASS}`}>Primary City</span>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                    <MapPin
                      className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span className="truncate">{selectedLocation.label}</span>
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={openPicker}>
                    Change
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={savingAccount}>
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                {savingAccount ? 'Saving…' : 'Save Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataStateWrapper isLoading={isLoading} error={familyLoadError} onRetry={() => void reload()}>
        <div className="space-y-6">
          {/* 2. Household Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home
                  className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                Household, Commute & Indoor Air Equipment
              </CardTitle>
              <CardDescription>
                Used by the LangGraph Daily Planner and Sustainability Advisor to tailor commute
                swaps, exercise alternatives, and indoor filtration guidance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveHousehold} className="space-y-5">
                {householdError ? <Alert variant="danger">{householdError}</Alert> : null}
                {householdFeedback ? (
                  <Alert variant="info" className="items-center">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{householdFeedback}</span>
                  </Alert>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="block space-y-1">
                    <span className={LABEL_CLASS}>Household Name</span>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      placeholder="e.g. Sharma Family"
                      className={FIELD_CLASS}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className={LABEL_CLASS}>Primary Commute</span>
                    <select
                      value={primaryMode}
                      onChange={(e) => setPrimaryMode(e.target.value as TransportMode)}
                      className={FIELD_CLASS}
                    >
                      {(Object.keys(TRANSPORT_LABELS) as TransportMode[]).map((mode) => (
                        <option key={mode} value={mode}>
                          {TRANSPORT_LABELS[mode]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className={LABEL_CLASS}>Daily Commute Distance (km)</span>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      step={1}
                      value={dailyCommuteKm}
                      onChange={(e) => setDailyCommuteKm(e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="block space-y-1">
                    <span className={LABEL_CLASS}>Vehicle Fuel Type</span>
                    <select
                      value={vehicleFuelType}
                      onChange={(e) => setVehicleFuelType(e.target.value)}
                      className={FIELD_CLASS}
                    >
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="cng">CNG</option>
                      <option value="electric">Electric</option>
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className={LABEL_CLASS}>Typical Car Occupancy</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={occupancy}
                      onChange={(e) => setOccupancy(e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className={LABEL_CLASS}>Preferred Exercise Routine</span>
                    <div className="flex items-center gap-2 pt-1.5">
                      <input
                        type="checkbox"
                        checked={prefersOutdoor}
                        onChange={(e) => setPrefersOutdoor(e.target.checked)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        Outdoor {activityType}
                      </span>
                      <select
                        value={preferredWindow}
                        onChange={(e) => setPreferredWindow(e.target.value)}
                        aria-label="Exercise time window"
                        className="ml-auto rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                      </select>
                    </div>
                  </label>
                </div>

                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Indoor Air Equipment
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={hasHepaPurifier}
                        onChange={(e) => setHasHepaPurifier(e.target.checked)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      HEPA Air Purifier Available
                    </label>

                    {hasHepaPurifier ? (
                      <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                        <span>Units:</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={purifierRoomsCount}
                          onChange={(e) => setPurifierRoomsCount(e.target.value)}
                          className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </label>
                    ) : null}

                    <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={hasKitchenExhaust}
                        onChange={(e) => setHasKitchenExhaust(e.target.checked)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      Kitchen Exhaust / Chimney
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={hasCrossVentilation}
                        onChange={(e) => setHasCrossVentilation(e.target.checked)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      Cross-Ventilation Windows
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={hasN95Masks}
                        onChange={(e) => setHasN95Masks(e.target.checked)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      N95 / KN95 Masks at Home
                    </label>

                    <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={indoorSmokingPresent}
                        onChange={(e) => setIndoorSmokingPresent(e.target.checked)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      Indoor Smoking Present
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={savingHousehold}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {savingHousehold ? 'Saving…' : 'Save Household Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 3. Household Members */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users
                      className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    Household Members ({members.length})
                  </CardTitle>
                  <CardDescription>
                    Add parents, school-going children, or elderly relatives so risk rules apply
                    sensitive-group protection automatically.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!family}
                  onClick={() => {
                    setEditingMember(null);
                    setMemberModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!family ? (
                <Alert variant="neutral">
                  Save your Household Profile above first, then add family members here.
                </Alert>
              ) : members.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-400">
                  No family members added yet. Add a school-going child, working parent, or elderly
                  member to personalize your Daily Plan.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {members.map((member) => (
                    <div
                      key={member.memberId}
                      className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-zinc-950 dark:text-zinc-50">
                            {member.nickname}
                          </p>
                          <Badge variant="default">{ROLE_LABELS[member.role]}</Badge>
                          <Badge variant="outline">{AGE_GROUP_LABELS[member.ageGroup]}</Badge>
                        </div>
                        {member.schedule?.leaveHomeTime || member.schedule?.returnHomeTime ? (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            Schedule: {member.schedule?.leaveHomeTime || '—'} →{' '}
                            {member.schedule?.returnHomeTime || '—'}
                          </p>
                        ) : null}
                        {member.optionalHealthProfile ? (
                          <p className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            Private sensitivity flags active
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${member.nickname}`}
                          onClick={() => {
                            setEditingMember(member);
                            setMemberModalOpen(true);
                          }}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${member.nickname}`}
                          onClick={() => void removeMember(member.memberId)}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DataStateWrapper>

      {memberModalOpen ? (
        <MemberFormModal
          initial={editingMember}
          onClose={() => {
            setMemberModalOpen(false);
            setEditingMember(null);
          }}
          onSubmit={handleMemberSubmit}
        />
      ) : null}
    </div>
  );
}
