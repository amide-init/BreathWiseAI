export type ImpactDomain = 'emissions_reduction' | 'exposure_reduction';

export type ImpactActionType =
  | 'carpool'
  | 'public_transit'
  | 'walk_cycle'
  | 'wfh'
  | 'energy_saving'
  | 'indoor_exercise_swap'
  | 'hepa_purifier_use'
  | 'n95_mask_used'
  | 'reduced_outdoor_exposure';

export interface ImpactCalculationAssumptions {
  formula: string;
  baselineMode: string;
  alternativeMode: string;
  distanceKm?: number | null;
  baselineOccupancy?: number | null;
  alternativeOccupancy?: number | null;
  baselineFactorKgPerKm?: number | null;
  alternativeFactorKgPerKm?: number | null;
  kwhSaved?: number | null;
  factorSource: string;
  isEstimate: boolean;
}

export interface ExposureContext {
  aqiAtTime?: number | null;
  durationMinutes?: number | null;
  activityReplaced?: string | null;
}

export interface ImpactLogRecord {
  logId: string;
  userId: string;
  familyId?: string | null;
  impactDomain: ImpactDomain;
  actionType: ImpactActionType;
  title: string;
  loggedDate: string;
  estimatedCo2AvoidedKg: number | null;
  calculationAssumptions: ImpactCalculationAssumptions | null;
  exposureContext: ExposureContext | null;
  createdAt: string | null;
}

export interface ImpactDailyPoint {
  date: string;
  label: string;
  estimatedCo2Kg: number;
  exposureActions: number;
}

export interface ImpactSummaryResponse {
  windowDays: number;
  emissions: {
    totalEstimatedCo2AvoidedKg: number;
    actionCount: number;
    byActionTypeKg: Record<string, number>;
    isEstimate: boolean;
  };
  exposure: {
    totalProtectiveActions: number;
    totalProtectedMinutes: number;
    byActionTypeCount: Record<string, number>;
  };
  dailySeries: ImpactDailyPoint[];
  recentLogs: ImpactLogRecord[];
}

export interface LogImpactInput {
  familyId?: string | null;
  actionType: ImpactActionType;
  impactDomain: ImpactDomain;
  title?: string;
  loggedDate: string;
  distanceKm?: number;
  baselineMode?: string;
  alternativeMode?: string;
  occupancy?: number;
  kwhSaved?: number;
  aqiAtTime?: number;
  durationMinutes?: number;
  activityReplaced?: string;
}

export const EMISSIONS_ACTION_LABELS: Record<
  'carpool' | 'public_transit' | 'walk_cycle' | 'wfh' | 'energy_saving',
  string
> = {
  carpool: 'Carpooled Instead of Solo Driving',
  public_transit: 'Took Metro / Public Bus',
  walk_cycle: 'Walked or Cycled Short Trip',
  wfh: 'Worked From Home (Skipped Commute)',
  energy_saving: 'Saved Household Electricity (kWh)',
};

export const EXPOSURE_ACTION_LABELS: Record<
  'indoor_exercise_swap' | 'hepa_purifier_use' | 'n95_mask_used' | 'reduced_outdoor_exposure',
  string
> = {
  indoor_exercise_swap: 'Swapped Outdoor Run for Indoor Workout',
  hepa_purifier_use: 'Ran HEPA Air Purifier Indoors',
  n95_mask_used: 'Wore N95 / KN95 Mask Outdoors',
  reduced_outdoor_exposure: 'Shifted Outdoor Family Activity Indoors',
};

export const BASELINE_VEHICLE_OPTIONS = [
  { value: 'petrol_car_solo', label: 'Petrol Car (Solo · 0.171 kg/km)' },
  { value: 'diesel_car_solo', label: 'Diesel Car (Solo · 0.168 kg/km)' },
  { value: 'cng_car_solo', label: 'CNG Car (Solo · 0.130 kg/km)' },
  { value: 'two_wheeler_petrol', label: 'Petrol Two-Wheeler (0.072 kg/km)' },
  { value: 'auto_rickshaw_cng', label: 'CNG Auto-Rickshaw (0.085 kg/km)' },
] as const;

export const TRANSIT_ALTERNATIVE_OPTIONS = [
  { value: 'metro_rail', label: 'Metro / Urban Rail (0.035 kg/pkm)' },
  { value: 'public_bus', label: 'Public City Bus (0.082 kg/pkm)' },
] as const;
