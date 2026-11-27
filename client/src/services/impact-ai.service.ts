import { Schema } from 'firebase/ai';

import { generateStructuredClientJson } from '@/lib/firebase-ai';
import {
  BASELINE_VEHICLE_OPTIONS,
  EMISSIONS_ACTION_LABELS,
  EXPOSURE_ACTION_LABELS,
  TRANSIT_ALTERNATIVE_OPTIONS,
  type ImpactActionType,
  type ImpactDomain,
} from '@/models/impact.model';

export interface ParsedImpactFormDraft {
  impactDomain: ImpactDomain;
  actionType: ImpactActionType;
  title: string;
  distanceKm?: number | null;
  baselineMode?: string | null;
  alternativeMode?: string | null;
  occupancy?: number | null;
  kwhSaved?: number | null;
  durationMinutes?: number | null;
  activityReplaced?: string | null;
  fallbackUsed: boolean;
}

const EMISSIONS_ACTIONS = Object.keys(EMISSIONS_ACTION_LABELS) as (keyof typeof EMISSIONS_ACTION_LABELS)[];
const EXPOSURE_ACTIONS = Object.keys(EXPOSURE_ACTION_LABELS) as (keyof typeof EXPOSURE_ACTION_LABELS)[];
const ALL_ACTIONS: readonly ImpactActionType[] = [...EMISSIONS_ACTIONS, ...EXPOSURE_ACTIONS];
const VALID_BASELINES = BASELINE_VEHICLE_OPTIONS.map((o) => o.value);
const VALID_TRANSIT = TRANSIT_ALTERNATIVE_OPTIONS.map((o) => o.value);

const IMPACT_FORM_SCHEMA = Schema.object({
  properties: {
    impactDomain: Schema.enumString({ enum: ['emissions_reduction', 'exposure_reduction'] }),
    actionType: Schema.enumString({ enum: [...ALL_ACTIONS] }),
    title: Schema.string({ description: 'Short friendly label for the logged action (max 80 chars).' }),
    distanceKm: Schema.number({ nullable: true, description: 'Trip distance in km (0.5-500) if commute-related.' }),
    baselineMode: Schema.enumString({ enum: [...VALID_BASELINES], nullable: true }),
    alternativeMode: Schema.enumString({ enum: [...VALID_TRANSIT], nullable: true }),
    occupancy: Schema.integer({ nullable: true, description: 'Total occupants in carpool (2-10).' }),
    kwhSaved: Schema.number({ nullable: true, description: 'Electricity saved in kWh (0.1-100).' }),
    durationMinutes: Schema.integer({ nullable: true, description: 'Duration in minutes (1-1440) for exposure protection.' }),
    activityReplaced: Schema.string({ nullable: true, description: 'Outdoor activity replaced or context.' }),
  },
  optionalProperties: [
    'distanceKm',
    'baselineMode',
    'alternativeMode',
    'occupancy',
    'kwhSaved',
    'durationMinutes',
    'activityReplaced',
  ],
});

const IMPACT_SYSTEM_INSTRUCTION = [
  'You are BreathWiseAI’s form-filling assistant for logging clean-air or sustainable actions.',
  'Extract ONLY the structured form fields from the user’s short sentence (English or Hinglish).',
  'CRITICAL RULES:',
  '1. Strictly separate `emissions_reduction` (carpool, public_transit, walk_cycle, wfh, energy_saving) from `exposure_reduction` (indoor_exercise_swap, hepa_purifier_use, n95_mask_used, reduced_outdoor_exposure).',
  '2. NEVER calculate or output CO2 numbers — the backend calculates CO2 deterministically using official DEFRA/CEA factors.',
  '3. Only include fields supported by the user’s sentence; use null for unmentioned optional numbers.',
].join('\n');

const KM_RE = /(\d+(?:\.\d+)?)\s*(?:km|kms|kilometer|kilometre)/i;
const KWH_RE = /(\d+(?:\.\d+)?)\s*(?:kwh|units?)/i;
const MIN_RE = /(\d{1,4})\s*(?:min|mins|minute|minutes)/i;
const HR_RE = /(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours)/i;
const OCCUPANCY_RE = /(?:with\s+(\d+)\s*(?:colleagues?|friends?|people|others?))|(?:(\d+)\s*(?:people|occupants|riders|passengers))/i;

/**
 * Deterministic regex fallback when Firebase AI Logic is unavailable or offline.
 * Never fabricates CO2 values — extracts only editable form fields.
 */
export function parseImpactLocally(description: string): ParsedImpactFormDraft {
  const cleaned = description.trim();
  const text = cleaned.toLowerCase();

  const isExposure =
    /\b(mask|n95|kn95|hepa|purifier|indoor yoga|indoor workout|skipped.*(?:jog|run|walk)|stayed indoors|kids indoors)\b/.test(
      text,
    );

  if (isExposure) {
    let actionType: (typeof EXPOSURE_ACTIONS)[number] = 'reduced_outdoor_exposure';
    if (/\b(n95|kn95|mask)\b/.test(text)) {
      actionType = 'n95_mask_used';
    } else if (/\b(hepa|purifier)\b/.test(text)) {
      actionType = 'hepa_purifier_use';
    } else if (/\b(yoga|workout|gym|exercise|jog|run|treadmill)\b/.test(text)) {
      actionType = 'indoor_exercise_swap';
    }

    const minMatch = MIN_RE.exec(text);
    const hrMatch = HR_RE.exec(text);
    const durationMinutes = minMatch
      ? Math.min(1440, Math.max(1, Math.round(Number(minMatch[1]))))
      : hrMatch
        ? Math.min(1440, Math.max(1, Math.round(Number(hrMatch[1]) * 60)))
        : 45;

    return {
      impactDomain: 'exposure_reduction',
      actionType,
      title: cleaned.slice(0, 80),
      durationMinutes,
      activityReplaced: cleaned.slice(0, 120),
      fallbackUsed: true,
    };
  }

  let actionType: (typeof EMISSIONS_ACTIONS)[number] = 'carpool';
  if (/\b(kwh|electricity|ac off|power|energy|units?)\b/.test(text)) {
    actionType = 'energy_saving';
  } else if (/\b(metro|bus|train|transit|local)\b/.test(text)) {
    actionType = 'public_transit';
  } else if (/\b(wfh|work from home|worked from home|remote)\b/.test(text)) {
    actionType = 'wfh';
  } else if (/\b(walk|walked|cycle|cycled|bicycle)\b/.test(text)) {
    actionType = 'walk_cycle';
  } else if (/\b(carpool|carpooled|shared ride|shared car)\b/.test(text)) {
    actionType = 'carpool';
  }

  const kmMatch = KM_RE.exec(text);
  const distanceKm = kmMatch ? Math.min(500, Math.max(0.5, Number(kmMatch[1]))) : 15;

  const kwhMatch = KWH_RE.exec(text);
  const kwhSaved = kwhMatch ? Math.min(100, Math.max(0.1, Number(kwhMatch[1]))) : 4;

  let baselineMode = 'petrol_car_solo';
  if (/\b(diesel)\b/.test(text)) {
    baselineMode = 'diesel_car_solo';
  } else if (/\b(cng car)\b/.test(text)) {
    baselineMode = 'cng_car_solo';
  } else if (/\b(scooter|bike|two[- ]?wheeler|scooty)\b/.test(text)) {
    baselineMode = 'two_wheeler_petrol';
  } else if (/\b(auto)\b/.test(text)) {
    baselineMode = 'auto_rickshaw_cng';
  }

  const alternativeMode = /\b(bus)\b/.test(text) ? 'public_bus' : 'metro_rail';

  const occMatch = OCCUPANCY_RE.exec(text);
  let occupancy = 3;
  if (occMatch) {
    if (occMatch[1]) {
      occupancy = Math.min(10, Math.max(2, Number(occMatch[1]) + 1));
    } else if (occMatch[2]) {
      occupancy = Math.min(10, Math.max(2, Number(occMatch[2])));
    }
  }

  return {
    impactDomain: 'emissions_reduction',
    actionType,
    title: cleaned.slice(0, 80),
    distanceKm: actionType === 'energy_saving' ? null : distanceKm,
    baselineMode: actionType === 'energy_saving' ? null : baselineMode,
    alternativeMode: actionType === 'public_transit' ? alternativeMode : null,
    occupancy: actionType === 'carpool' ? occupancy : null,
    kwhSaved: actionType === 'energy_saving' ? kwhSaved : null,
    fallbackUsed: true,
  };
}

export function sanitizeParsedImpactDraft(
  raw: Partial<ParsedImpactFormDraft>,
  fallbackDescription: string,
): ParsedImpactFormDraft {
  const baseline = parseImpactLocally(fallbackDescription);
  const actionType =
    typeof raw.actionType === 'string' && (ALL_ACTIONS as readonly string[]).includes(raw.actionType)
      ? (raw.actionType as ImpactActionType)
      : baseline.actionType;

  // Enforce strict domain/action alignment so exposure and emissions never mix
  const impactDomain: ImpactDomain = (EXPOSURE_ACTIONS as readonly string[]).includes(actionType)
    ? 'exposure_reduction'
    : 'emissions_reduction';

  return {
    impactDomain,
    actionType,
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title.trim().slice(0, 120)
        : baseline.title,
    distanceKm:
      typeof raw.distanceKm === 'number' && Number.isFinite(raw.distanceKm)
        ? Math.min(500, Math.max(0.5, raw.distanceKm))
        : baseline.distanceKm,
    baselineMode:
      typeof raw.baselineMode === 'string' &&
      (VALID_BASELINES as readonly string[]).includes(raw.baselineMode)
        ? raw.baselineMode
        : baseline.baselineMode,
    alternativeMode:
      typeof raw.alternativeMode === 'string' &&
      (VALID_TRANSIT as readonly string[]).includes(raw.alternativeMode)
        ? raw.alternativeMode
        : baseline.alternativeMode,
    occupancy:
      typeof raw.occupancy === 'number' && Number.isFinite(raw.occupancy)
        ? Math.min(10, Math.max(2, Math.round(raw.occupancy)))
        : baseline.occupancy,
    kwhSaved:
      typeof raw.kwhSaved === 'number' && Number.isFinite(raw.kwhSaved)
        ? Math.min(100, Math.max(0.1, raw.kwhSaved))
        : baseline.kwhSaved,
    durationMinutes:
      typeof raw.durationMinutes === 'number' && Number.isFinite(raw.durationMinutes)
        ? Math.min(1440, Math.max(1, Math.round(raw.durationMinutes)))
        : baseline.durationMinutes,
    activityReplaced:
      typeof raw.activityReplaced === 'string' && raw.activityReplaced.trim()
        ? raw.activityReplaced.trim().slice(0, 120)
        : baseline.activityReplaced,
    fallbackUsed: Boolean(raw.fallbackUsed),
  };
}

/**
 * Client-side Firebase AI Logic quick-fill parser for LogImpactModal.
 * Extracts ONLY form fields — CO2e math stays strictly deterministic on the backend.
 */
export async function parseImpactActionDescription(
  description: string,
): Promise<ParsedImpactFormDraft> {
  const cleaned = description.trim().slice(0, 400);
  const aiDraft = await generateStructuredClientJson<Partial<ParsedImpactFormDraft>>({
    systemInstruction: IMPACT_SYSTEM_INSTRUCTION,
    prompt: `Action description:\n${cleaned}`,
    responseSchema: IMPACT_FORM_SCHEMA,
  });

  if (aiDraft && typeof aiDraft.actionType === 'string') {
    return sanitizeParsedImpactDraft({ ...aiDraft, fallbackUsed: false }, cleaned);
  }
  return parseImpactLocally(cleaned);
}
