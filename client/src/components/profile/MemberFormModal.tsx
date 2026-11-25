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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? 'Edit family member' : 'Add family member'}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {initial ? 'Edit Family Member' : 'Add Family Member'}
            </h2>
            <p className="text-xs text-slate-500">
              Used to tailor deterministic exposure protection and daily clean-air routines.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close member modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">Name or Label</span>
            <input
              type="text"
              required
              maxLength={60}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Aarav (Child), Parent 1, Dadi"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
              >
                {(Object.keys(ROLE_LABELS) as MemberRole[]).map((key) => (
                  <option key={key} value={key}>
                    {ROLE_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-700">Age Group</span>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as MemberAgeGroup)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
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
            <span className="text-xs font-medium text-slate-700">Commute Mode (Optional)</span>
            <select
              value={commuteMode}
              onChange={(e) => setCommuteMode(e.target.value as '' | MemberCommuteMode)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
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
              <span className="text-[11px] font-medium text-slate-700">Leaves Home</span>
              <input
                type="time"
                value={leaveHomeTime}
                onChange={(e) => setLeaveHomeTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-700">Returns Home</span>
              <input
                type="time"
                value={returnHomeTime}
                onChange={(e) => setReturnHomeTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-slate-700">Play / Exercise</span>
              <input
                type="time"
                value={outdoorTime}
                onChange={(e) => setOutdoorTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
            </label>
          </div>

          {/* Optional & Private Health Sensitivities Accordion */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <button
              type="button"
              onClick={() => setShowHealth((prev) => !prev)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Lock className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                Health Sensitivities
                <Badge variant="neutral">Optional & Private</Badge>
              </span>
              {showHealth ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>

            {showHealth ? (
              <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3">
                <p className="text-[11px] text-slate-500">
                  Private to your account and excluded from logs. Used only to apply more
                  conservative general guidance — never medical diagnosis.
                </p>

                <label className="flex items-center gap-2 text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={hasRespiratory}
                    onChange={(e) => setHasRespiratory(e.target.checked)}
                    className="h-4 w-4 accent-teal-700"
                  />
                  Respiratory sensitivity (e.g., sensitive airways / smoke irritation)
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={hasCardiac}
                    onChange={(e) => setHasCardiac(e.target.checked)}
                    className="h-4 w-4 accent-teal-700"
                  />
                  Cardiovascular sensitivity
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={isPregnant}
                    onChange={(e) => setIsPregnant(e.target.checked)}
                    className="h-4 w-4 accent-teal-700"
                  />
                  Pregnancy precaution
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-medium text-slate-700">
                    Optional Notes (max 200 chars)
                  </span>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={healthNotes}
                    onChange={(e) => setHealthNotes(e.target.value)}
                    placeholder="e.g., Prefers indoor play on high-smog days"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-teal-600"
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
