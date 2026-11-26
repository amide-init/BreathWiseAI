import { Leaf, Shield, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  BASELINE_VEHICLE_OPTIONS,
  EMISSIONS_ACTION_LABELS,
  EXPOSURE_ACTION_LABELS,
  TRANSIT_ALTERNATIVE_OPTIONS,
  type ImpactActionType,
  type ImpactDomain,
  type LogImpactInput,
} from '@/models/impact.model';

const FIELD_CLASS =
  'w-full rounded-xl border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-sm text-[#202124] outline-none transition-colors focus:border-[#4285F4] focus:bg-white focus:ring-2 focus:ring-[#4285F4]/25 dark:border-white/[0.12] dark:bg-[#131314] dark:text-[#E3E3E3] dark:focus:border-[#8AB4F8]';

const LABEL_CLASS = 'text-xs font-medium text-[#3C4043] dark:text-[#C4C7C5]';

type EmissionsAction = keyof typeof EMISSIONS_ACTION_LABELS;
type ExposureAction = keyof typeof EXPOSURE_ACTION_LABELS;

export function LogImpactModal({
  initialDomain,
  defaultAqi,
  familyId,
  onClose,
  onSubmit,
}: {
  initialDomain: ImpactDomain;
  defaultAqi?: number | null;
  familyId?: string | null;
  onClose: () => void;
  onSubmit: (input: LogImpactInput) => Promise<void>;
}) {
  const [domain, setDomain] = useState<ImpactDomain>(initialDomain);
  const [emissionsAction, setEmissionsAction] = useState<EmissionsAction>('carpool');
  const [exposureAction, setExposureAction] = useState<ExposureAction>('indoor_exercise_swap');
  const [loggedDate, setLoggedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');

  // Emissions fields
  const [distanceKm, setDistanceKm] = useState('18');
  const [baselineMode, setBaselineMode] = useState<string>('petrol_car_solo');
  const [transitAlt, setTransitAlt] = useState<string>('metro_rail');
  const [occupancy, setOccupancy] = useState('3');
  const [kwhSaved, setKwhSaved] = useState('4');

  // Exposure fields
  const [aqiAtTime, setAqiAtTime] = useState(defaultAqi ? String(defaultAqi) : '');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [activityReplaced, setActivityReplaced] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const actionType: ImpactActionType =
        domain === 'emissions_reduction' ? emissionsAction : exposureAction;

      const payload: LogImpactInput = {
        familyId: familyId ?? null,
        impactDomain: domain,
        actionType,
        loggedDate,
        ...(title.trim() ? { title: title.trim() } : {}),
      };

      if (domain === 'emissions_reduction') {
        if (emissionsAction === 'energy_saving') {
          payload.kwhSaved = Number(kwhSaved);
        } else {
          payload.distanceKm = Number(distanceKm);
          payload.baselineMode = baselineMode;
          if (emissionsAction === 'carpool') {
            payload.occupancy = Number(occupancy);
          } else if (emissionsAction === 'public_transit') {
            payload.alternativeMode = transitAlt;
          }
        }
      } else {
        if (aqiAtTime.trim()) {
          payload.aqiAtTime = Number(aqiAtTime);
        }
        if (durationMinutes.trim()) {
          payload.durationMinutes = Number(durationMinutes);
        }
        if (activityReplaced.trim()) {
          payload.activityReplaced = activityReplaced.trim();
        }
      }

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save impact log.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Log clean-air or sustainable action"
    >
      <div className="cloud-card max-h-[90vh] w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white dark:border-white/[0.1] dark:bg-[#1E1F20]">
        <div className="google-ribbon h-[3px] w-full" aria-hidden="true" />
        <div className="max-h-[calc(90vh-3px)] overflow-y-auto p-5">
        <div className="flex items-center justify-between gap-2 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#202124] dark:text-[#E3E3E3]">
              Log Clean-Air Action
            </h2>
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              Emissions avoided and personal exposure protection are strictly tracked separately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:bg-white/[0.08] dark:hover:text-[#E3E3E3]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Domain Selector */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-full border border-[#E8EAED] bg-[#F8F9FA] p-1 dark:border-white/[0.1] dark:bg-[#131314]">
          <button
            type="button"
            onClick={() => setDomain('emissions_reduction')}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all ${
              domain === 'emissions_reduction'
                ? 'bg-[#34A853] text-white shadow-2xs'
                : 'text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-[#E3E3E3]'
            }`}
          >
            <Leaf className="h-3.5 w-3.5" />
            Emissions Avoided
          </button>
          <button
            type="button"
            onClick={() => setDomain('exposure_reduction')}
            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all ${
              domain === 'exposure_reduction'
                ? 'bg-[#4285F4] text-white shadow-2xs'
                : 'text-[#5F6368] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:text-[#E3E3E3]'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Exposure Protection
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className={LABEL_CLASS}>Action Type</span>
              {domain === 'emissions_reduction' ? (
                <select
                  value={emissionsAction}
                  onChange={(e) => setEmissionsAction(e.target.value as EmissionsAction)}
                  className={FIELD_CLASS}
                >
                  {(Object.keys(EMISSIONS_ACTION_LABELS) as EmissionsAction[]).map((k) => (
                    <option key={k} value={k}>
                      {EMISSIONS_ACTION_LABELS[k]}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={exposureAction}
                  onChange={(e) => setExposureAction(e.target.value as ExposureAction)}
                  className={FIELD_CLASS}
                >
                  {(Object.keys(EXPOSURE_ACTION_LABELS) as ExposureAction[]).map((k) => (
                    <option key={k} value={k}>
                      {EXPOSURE_ACTION_LABELS[k]}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="block space-y-1">
              <span className={LABEL_CLASS}>Date</span>
              <input
                type="date"
                required
                value={loggedDate}
                onChange={(e) => setLoggedDate(e.target.value)}
                className={FIELD_CLASS}
              />
            </label>

            <label className="block space-y-1">
              <span className={LABEL_CLASS}>Custom Label (optional)</span>
              <input
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Office commute carpool"
                className={FIELD_CLASS}
              />
            </label>
          </div>

          {domain === 'emissions_reduction' ? (
            emissionsAction === 'energy_saving' ? (
              <label className="block space-y-1">
                <span className={LABEL_CLASS}>Electricity Saved (kWh)</span>
                <input
                  type="number"
                  required
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={kwhSaved}
                  onChange={(e) => setKwhSaved(e.target.value)}
                  className={FIELD_CLASS}
                />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Estimated using CEA India Grid Emission Factor (0.716 kg CO₂e/kWh).
                </p>
              </label>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={LABEL_CLASS}>Round-Trip / Trip Distance (km)</span>
                  <input
                    type="number"
                    required
                    min={0.5}
                    max={500}
                    step={0.5}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className={FIELD_CLASS}
                  />
                </label>

                <label className="block space-y-1">
                  <span className={LABEL_CLASS}>Usual Baseline Vehicle</span>
                  <select
                    value={baselineMode}
                    onChange={(e) => setBaselineMode(e.target.value)}
                    className={FIELD_CLASS}
                  >
                    {BASELINE_VEHICLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                {emissionsAction === 'carpool' ? (
                  <label className="block space-y-1 sm:col-span-2">
                    <span className={LABEL_CLASS}>Total Occupants in Carpool (min 2)</span>
                    <input
                      type="number"
                      required
                      min={2}
                      max={10}
                      value={occupancy}
                      onChange={(e) => setOccupancy(e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </label>
                ) : null}

                {emissionsAction === 'public_transit' ? (
                  <label className="block space-y-1 sm:col-span-2">
                    <span className={LABEL_CLASS}>Transit Mode Used</span>
                    <select
                      value={transitAlt}
                      onChange={(e) => setTransitAlt(e.target.value)}
                      className={FIELD_CLASS}
                    >
                      {TRANSIT_ALTERNATIVE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className={LABEL_CLASS}>Outdoor AQI at Time (optional)</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={aqiAtTime}
                  onChange={(e) => setAqiAtTime(e.target.value)}
                  placeholder="e.g. 320"
                  className={FIELD_CLASS}
                />
              </label>

              <label className="block space-y-1">
                <span className={LABEL_CLASS}>Duration (minutes)</span>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className={FIELD_CLASS}
                />
              </label>

              <label className="block space-y-1 sm:col-span-2">
                <span className={LABEL_CLASS}>Activity Replaced / Context (optional)</span>
                <input
                  type="text"
                  maxLength={120}
                  value={activityReplaced}
                  onChange={(e) => setActivityReplaced(e.target.value)}
                  placeholder="e.g. Morning park jog replaced with indoor yoga"
                  className={FIELD_CLASS}
                />
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Calculating & Saving…' : 'Save Action'}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
