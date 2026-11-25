import { ChevronDown, ChevronUp, Lock, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AGE_GROUP_LABELS,
  ROLE_LABELS,
  type FamilyMemberModel,
  type MemberAgeGroup,
  type MemberCommuteMode,
  type MemberRole,
  type SaveMemberInput,
} from '@/models/family.model';

interface MemberFormModalProps {
  initial?: FamilyMemberModel | null;
  onClose: () => void;
  onSubmit: (input: SaveMemberInput) => Promise<void>;
}

const COMMUTE_OPTIONS: { value: '' | MemberCommuteMode; label: string }[] = [
  { value: '', label: 'Use household default' },
  { value: 'personal_car', label: 'Personal Car' },
  { value: 'two_wheeler', label: 'Two-Wheeler' },
  { value: 'carpool', label: 'Carpool' },
  { value: 'public_transit', label: 'Public Transit' },
  { value: 'school_bus', label: 'School Bus' },
  { value: 'walk_cycle', label: 'Walk / Cycle' },
  { value: 'wfh', label: 'Work From Home' },
  { value: 'other', label: 'Other' },
];

const FIELD_CLASS =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50';

export function MemberFormModal({ initial, onClose, onSubmit }: MemberFormModalProps) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [role, setRole] = useState<MemberRole>(initial?.role ?? 'working_adult');
  const [ageGroup, setAgeGroup] = useState<MemberAgeGroup>(initial?.ageGroup ?? '18_45');
  const [commuteMode, setCommuteMode] = useState<'' | MemberCommuteMode>(
    initial?.commuteMode ?? '',
  );
  const [leaveHomeTime, setLeaveHomeTime] = useState(initial?.schedule?.leaveHomeTime ?? '');
  const [returnHomeTime, setReturnHomeTime] = useState(initial?.schedule?.returnHomeTime ?? '');
  const [outdoorTime, setOutdoorTime] = useState(
    initial?.schedule?.outdoorPlayOrExerciseTime ?? '',
  );

  const [showHealth, setShowHealth] = useState(Boolean(initial?.optionalHealthProfile));
  const [hasRespiratory, setHasRespiratory] = useState(
    Boolean(initial?.optionalHealthProfile?.hasRespiratorySensitivity),
  );
  const [hasCardiac, setHasCardiac] = useState(
    Boolean(initial?.optionalHealthProfile?.hasCardiacSensitivity),
  );
  const [isPregnant, setIsPregnant] = useState(
    Boolean(initial?.optionalHealthProfile?.isPregnant),
  );
  const [healthNotes, setHealthNotes] = useState(initial?.optionalHealthProfile?.notes ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        nickname,
        role,
        ageGroup,
        commuteMode: commuteMode || null,
        schedule: {
          leaveHomeTime: leaveHomeTime || null,
          returnHomeTime: returnHomeTime || null,
          outdoorPlayOrExerciseTime: outdoorTime || null,
        },
        optionalHealthProfile: {
          hasRespiratorySensitivity: hasRespiratory,
          hasCardiacSensitivity: hasCardiac,
          isPregnant,
          notes: healthNotes || null,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save family member.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? 'Edit family member' : 'Add family member'}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-200/80 bg-white p-5 shadow-2xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {initial ? 'Edit Family Member' : 'Add Family Member'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Used to tailor deterministic exposure protection and daily clean-air routines.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close member modal"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Name or Label
            </span>
            <input
              type="text"
              required
              maxLength={60}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Aarav (Child), Parent 1, Dadi"
              className={FIELD_CLASS}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                className={FIELD_CLASS}
              >
                {(Object.keys(ROLE_LABELS) as MemberRole[]).map((key) => (
                  <option key={key} value={key}>
                    {ROLE_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Age Group
              </span>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as MemberAgeGroup)}
                className={FIELD_CLASS}
              >
                {(Object.keys(AGE_GROUP_LABELS) as MemberAgeGroup[]).map((key) => (
                  <option key={key} value={key}>
                    {AGE_GROUP_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Commute Mode (Optional)
            </span>
            <select
              value={commuteMode}
              onChange={(e) => setCommuteMode(e.target.value as '' | MemberCommuteMode)}
              className={FIELD_CLASS}
            >
              {COMMUTE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Leaves Home
              </span>
              <input
                type="time"
                value={leaveHomeTime}
                onChange={(e) => setLeaveHomeTime(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Returns Home
              </span>
              <input
                type="time"
                value={returnHomeTime}
                onChange={(e) => setReturnHomeTime(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Play / Exercise
              </span>
              <input
                type="time"
                value={outdoorTime}
                onChange={(e) => setOutdoorTime(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </label>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
            <button
              type="button"
              onClick={() => setShowHealth((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Health Sensitivities
                <Badge variant="neutral">Optional & Private</Badge>
              </span>
              {showHealth ? (
                <ChevronUp className="h-4 w-4 text-zinc-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              )}
            </button>

            {showHealth ? (
              <div className="mt-3 space-y-2.5 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Private to your account and excluded from logs. Used only to apply more
                  conservative general guidance — never medical diagnosis.
                </p>

                <label className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={hasRespiratory}
                    onChange={(e) => setHasRespiratory(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Respiratory sensitivity (e.g., sensitive airways / smoke irritation)
                </label>

                <label className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={hasCardiac}
                    onChange={(e) => setHasCardiac(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Cardiovascular sensitivity
                </label>

                <label className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={isPregnant}
                    onChange={(e) => setIsPregnant(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Pregnancy precaution
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                    Optional Notes (max 200 chars)
                  </span>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={healthNotes}
                    onChange={(e) => setHealthNotes(e.target.value)}
                    placeholder="e.g., Prefers indoor play on high-smog days"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-950 outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : initial ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
