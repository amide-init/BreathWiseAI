import { Schema } from 'firebase/ai';

import { callFunction } from '@/lib/callable-client';
import { generateStructuredClientJson } from '@/lib/firebase-ai';
import type { MemberAgeGroup, MemberRole, TransportMode } from '@/models/family.model';
import type {
  CookingFuelType,
  DustCleaningMethod,
  WindowSealingQuality,
} from '@/models/indoor.model';

const VALID_TRANSPORT_MODES: readonly TransportMode[] = [
  'personal_car',
  'two_wheeler',
  'carpool',
  'public_transit',
  'walk_cycle',
  'wfh',
];
const VALID_MEMBER_ROLES: readonly MemberRole[] = [
  'working_adult',
  'child_school',
  'child_toddler',
  'elderly',
  'homemaker',
  'other',
];
const VALID_AGE_GROUPS: readonly MemberAgeGroup[] = [
  '0_5',
  '6_12',
  '13_17',
  '18_45',
  '46_60',
  '60_plus',
];
const VALID_COOKING_FUELS: readonly CookingFuelType[] = [
  'lpg_gas',
  'electric_induction',
  'biomass_solid',
  'mixed',
];
const VALID_CLEANING_METHODS: readonly DustCleaningMethod[] = [
  'dry_broom',
  'wet_mop',
  'hepa_vacuum',
  'mixed',
];
const VALID_WINDOW_SEALING: readonly WindowSealingQuality[] = ['poor', 'moderate', 'good'];

const HOUSEHOLD_DRAFT_SCHEMA = Schema.object({
  properties: {
    householdName: Schema.string({ description: 'Short friendly name for the household.' }),
    cityMentioned: Schema.string({ nullable: true, description: 'City name if mentioned, else null.' }),
    primaryCommuteMode: Schema.enumString({ enum: [...VALID_TRANSPORT_MODES] }),
    dailyCommuteKm: Schema.number({ description: 'Estimated daily round-trip commute km (0-200).' }),
    exerciseActivityType: Schema.string({ description: 'Primary exercise type (walk, run, cycle, yoga).' }),
    prefersOutdoorExercise: Schema.boolean(),
    hasHepaPurifier: Schema.boolean(),
    hasKitchenExhaust: Schema.boolean(),
    indoorSmokingPresent: Schema.boolean(),
    incenseOrDhoopDaily: Schema.boolean(),
    cookingFuel: Schema.enumString({ enum: [...VALID_COOKING_FUELS] }),
    dustCleaningMethod: Schema.enumString({ enum: [...VALID_CLEANING_METHODS] }),
    windowSealingQuality: Schema.enumString({ enum: [...VALID_WINDOW_SEALING] }),
    members: Schema.array({
      items: Schema.object({
        properties: {
          nickname: Schema.string({ description: 'Short nickname or role label (e.g. Me, Wife, Aarav, Dad).' }),
          role: Schema.enumString({ enum: [...VALID_MEMBER_ROLES] }),
          ageGroup: Schema.enumString({ enum: [...VALID_AGE_GROUPS] }),
          hasRespiratorySensitivity: Schema.boolean(),
          hasCardiacSensitivity: Schema.boolean(),
          isPregnant: Schema.boolean(),
        },
      }),
    }),
    summaryNote: Schema.string({ description: 'Warm, non-judgmental 1-sentence confirmation of what was understood.' }),
  },
  optionalProperties: ['cityMentioned'],
});

const HOUSEHOLD_SYSTEM_INSTRUCTION = [
  'You are BreathWiseAI’s household setup assistant for Indian families.',
  'Extract a clean structured household draft from the user’s casual description (English, Hindi, or mixed Indian speech).',
  'RULES:',
  '1. Extract every family member mentioned (only include "Me" if the user refers to themselves or no other member is named) with short nicknames (e.g. Me, Wife, Aarav, Dad), accurate role, ageGroup, and sensitivity flags ONLY if mentioned.',
  '2. Accurately capture honest indoor habits: indoorSmokingPresent (true if smoking at home/balcony is mentioned), incenseOrDhoopDaily (true if agarbatti/dhoop/puja smoke is mentioned), hasHepaPurifier (false unless user says they own one), hasKitchenExhaust, cookingFuel, dustCleaningMethod, windowSealingQuality, and commute mode/km.',
  '3. Never diagnose medical conditions; map asthma/dust allergy mentions strictly to hasRespiratorySensitivity: true.',
  '4. Write a warm 1-sentence summaryNote confirming what was understood (zero judgment).',
].join('\n');

export interface ParsedMemberDraft {
  nickname: string;
  role: MemberRole;
  ageGroup: MemberAgeGroup;
  hasRespiratorySensitivity: boolean;
  hasCardiacSensitivity: boolean;
  isPregnant: boolean;
}

export interface ParsedHouseholdDraft {
  householdName: string;
  cityMentioned?: string | null;
  primaryCommuteMode: TransportMode;
  dailyCommuteKm: number;
  exerciseActivityType: string;
  prefersOutdoorExercise: boolean;
  hasHepaPurifier: boolean;
  hasKitchenExhaust: boolean;
  indoorSmokingPresent: boolean;
  incenseOrDhoopDaily: boolean;
  cookingFuel: CookingFuelType;
  dustCleaningMethod: DustCleaningMethod;
  windowSealingQuality: WindowSealingQuality;
  members: ParsedMemberDraft[];
  summaryNote: string;
  fallbackUsed: boolean;
}

const KM_REGEX = /(\d{1,3})\s*(?:km|kms|kilometer|kilometre)/i;
const AGE_NEAR_CHILD_REGEX =
  /(\d{1,2})\s*(?:yo|y\/o|yr|yrs|year|years)(?:\s*old)?\s*(?:son|daughter|kid|child|boy|girl|baby|toddler)|(?:son|daughter|kid|child|boy|girl|baby|toddler)[^,.;]*?(\d{1,2})\s*(?:yo|y\/o|yr|yrs|year|years)/i;

function classifyChildAgeGroup(age: number | null): { role: MemberRole; ageGroup: MemberAgeGroup } {
  if (age !== null) {
    if (age <= 5) {
      return { role: 'child_toddler', ageGroup: '0_5' };
    }
    if (age <= 12) {
      return { role: 'child_school', ageGroup: '6_12' };
    }
    return { role: 'child_school', ageGroup: '13_17' };
  }
  return { role: 'child_school', ageGroup: '6_12' };
}

/**
 * Deterministic client-side household & member parser used as a seamless instant
 * fallback whenever the Gemini `parse_household_profile` Cloud Function is
 * unreachable or not yet deployed.
 */
export function parseHouseholdLocally(description: string): ParsedHouseholdDraft {
  const cleaned = description.trim();
  const text = cleaned.toLowerCase();

  let primaryCommuteMode: TransportMode = 'personal_car';
  if (
    /\b(two[- ]?wheeler|scooter|scooty|bike|motorbike|motorcycle|activa)\b/.test(text)
  ) {
    primaryCommuteMode = 'two_wheeler';
  } else if (/\b(metro|bus|train|public transit|local train|auto)\b/.test(text)) {
    primaryCommuteMode = 'public_transit';
  } else if (/\b(wfh|work from home|remote)\b/.test(text)) {
    primaryCommuteMode = 'wfh';
  } else if (/\b(cycle|cycling|bicycle|walk to work|walking commute)\b/.test(text)) {
    primaryCommuteMode = 'walk_cycle';
  } else if (/\b(carpool|car pool|shared cab)\b/.test(text)) {
    primaryCommuteMode = 'carpool';
  }

  const kmMatch = KM_REGEX.exec(text);
  const dailyCommuteKm = kmMatch
    ? Math.min(200, Math.max(0, Number(kmMatch[1])))
    : primaryCommuteMode === 'wfh'
      ? 0
      : 15;

  const hasHepaPurifier =
    /\b(hepa|air purifier|purifier)\b/.test(text) &&
    !/\b(no purifier|no air purifier|without purifier|no hepa|don'?t have (a )?purifier)\b/.test(
      text,
    );

  const hasKitchenExhaust = !/\b(no chimney|no exhaust|without exhaust|without chimney)\b/.test(
    text,
  );

  const indoorSmokingPresent =
    /\b(smok(?:e|es|ing|er)|cigar(?:ette)?s?|bidi|hookah)\b/.test(text) &&
    !/\b(no smoking|don'?t smoke|non[- ]?smoker|smoke[- ]?free)\b/.test(text);

  const incenseOrDhoopDaily = /\b(dhoop|agarbatti|incense|puja smoke|pooja)\b/.test(text);

  const dustCleaningMethod: DustCleaningMethod = /\b(broom|jhadu|dry sweep)\b/.test(text)
    ? 'dry_broom'
    : 'wet_mop';

  let cookingFuel: CookingFuelType = 'lpg_gas';
  if (/\b(induction|electric stove)\b/.test(text)) {
    cookingFuel = 'electric_induction';
  } else if (/\b(wood|chulha|coal|biomass)\b/.test(text)) {
    cookingFuel = 'biomass_solid';
  }

  const prefersOutdoorExercise = !/\b(indoor workout|gym only|no outdoor)\b/.test(text);
  const exerciseActivityType = /\b(run|runner|running|jog|jogging)\b/.test(text)
    ? 'run'
    : /\b(cycl|bike ride)\b/.test(text)
      ? 'cycle'
      : /\b(yoga)\b/.test(text)
        ? 'yoga'
        : 'walk';

  const hasRespiratory = /\b(asthma|wheez|allerg|dust|breathing|sinus|copd|cough|bronchit)\b/.test(
    text,
  );
  const hasCardiac = /\b(heart|cardiac|bp|blood pressure|hypertension)\b/.test(text);
  const isPregnant = /\b(pregnant|pregnancy|expecting)\b/.test(text);

  const members: ParsedMemberDraft[] = [];

  const mentionsSelf = /\b(me|myself|i\b|solo)\b/.test(text);
  const mentionsWife = /\b(wife|spouse)\b/.test(text);
  const mentionsHusband = /\b(husband)\b/.test(text);
  const mentionsPartner = /\b(partner)\b/.test(text);
  const mentionsToddler = /\b(toddler|baby|infant)\b/.test(text);
  const mentionsSon = /\b(son|boy)\b/.test(text);
  const mentionsDaughter = /\b(daughter|girl)\b/.test(text);
  const mentionsGenericChild = /\b(kid|kids|child|children|schooler)\b/.test(text);
  const mentionsTeen = /\b(teen|teenager)\b/.test(text);
  const mentionsDad = /\b(dad|father|papa|dada|grandpa|grandfather)\b/.test(text);
  const mentionsMom = /\b(mom|mum|mother|mummy|dadi|nani|grandma|grandmother)\b/.test(text);
  const mentionsElderlyGeneric = /\b(parents|elder|elderly|senior)\b/.test(text);

  const hasChildMention =
    mentionsToddler || mentionsSon || mentionsDaughter || mentionsGenericChild || mentionsTeen;
  const hasSeniorMention = mentionsDad || mentionsMom || mentionsElderlyGeneric;

  if (mentionsSelf || (!mentionsWife && !mentionsHusband && !mentionsPartner && !hasChildMention && !hasSeniorMention)) {
    members.push({
      nickname: 'Me',
      role: 'working_adult',
      ageGroup: '18_45',
      hasRespiratorySensitivity: hasRespiratory && !hasChildMention && !hasSeniorMention,
      hasCardiacSensitivity: hasCardiac && !hasSeniorMention,
      isPregnant: isPregnant && !mentionsWife && !mentionsPartner,
    });
  }

  if (mentionsWife || mentionsHusband || mentionsPartner) {
    members.push({
      nickname: mentionsWife ? 'Wife' : mentionsHusband ? 'Husband' : 'Partner',
      role: 'working_adult',
      ageGroup: '18_45',
      hasRespiratorySensitivity: false,
      hasCardiacSensitivity: false,
      isPregnant,
    });
  }

  if (hasChildMention) {
    const ageMatch = AGE_NEAR_CHILD_REGEX.exec(text);
    const parsedAge = ageMatch ? Number(ageMatch[1] ?? ageMatch[2]) : null;
    const { role, ageGroup } = mentionsToddler
      ? { role: 'child_toddler' as MemberRole, ageGroup: '0_5' as MemberAgeGroup }
      : mentionsTeen
        ? { role: 'child_school' as MemberRole, ageGroup: '13_17' as MemberAgeGroup }
        : classifyChildAgeGroup(parsedAge);

    if (mentionsSon) {
      members.push({
        nickname: parsedAge ? `Son (${parsedAge}y)` : 'Son',
        role,
        ageGroup,
        hasRespiratorySensitivity: hasRespiratory,
        hasCardiacSensitivity: false,
        isPregnant: false,
      });
    }
    if (mentionsDaughter) {
      members.push({
        nickname: parsedAge && !mentionsSon ? `Daughter (${parsedAge}y)` : 'Daughter',
        role,
        ageGroup,
        hasRespiratorySensitivity: hasRespiratory,
        hasCardiacSensitivity: false,
        isPregnant: false,
      });
    }
    if (!mentionsSon && !mentionsDaughter) {
      members.push({
        nickname: mentionsToddler ? 'Toddler' : mentionsTeen ? 'Teen' : 'Child',
        role,
        ageGroup,
        hasRespiratorySensitivity: hasRespiratory,
        hasCardiacSensitivity: false,
        isPregnant: false,
      });
    }
  }

  if (mentionsDad) {
    members.push({
      nickname: 'Dad',
      role: 'elderly',
      ageGroup: '60_plus',
      hasRespiratorySensitivity: hasRespiratory && !hasChildMention,
      hasCardiacSensitivity: hasCardiac,
      isPregnant: false,
    });
  }
  if (mentionsMom) {
    members.push({
      nickname: 'Mom',
      role: 'elderly',
      ageGroup: '60_plus',
      hasRespiratorySensitivity: hasRespiratory && !hasChildMention && !mentionsDad,
      hasCardiacSensitivity: hasCardiac && !mentionsDad,
      isPregnant: false,
    });
  }
  if (!mentionsDad && !mentionsMom && mentionsElderlyGeneric) {
    members.push({
      nickname: 'Parent',
      role: 'elderly',
      ageGroup: '60_plus',
      hasRespiratorySensitivity: hasRespiratory && !hasChildMention,
      hasCardiacSensitivity: hasCardiac,
      isPregnant: false,
    });
  }

  return {
    householdName: 'My Family',
    cityMentioned: null,
    primaryCommuteMode,
    dailyCommuteKm,
    exerciseActivityType,
    prefersOutdoorExercise,
    hasHepaPurifier,
    hasKitchenExhaust,
    indoorSmokingPresent,
    incenseOrDhoopDaily,
    cookingFuel,
    dustCleaningMethod,
    windowSealingQuality: 'moderate',
    members,
    summaryNote: `Detected ${members.length} member${members.length === 1 ? '' : 's'} & your home habits — tap any chip below to adjust before saving.`,
    fallbackUsed: true,
  };
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function sanitizeParsedHouseholdDraft(
  raw: Partial<ParsedHouseholdDraft>,
  fallbackDescription: string,
): ParsedHouseholdDraft {
  const baseline = parseHouseholdLocally(fallbackDescription);
  const rawMembers: unknown[] = Array.isArray(raw.members) ? raw.members : [];
  const members: ParsedMemberDraft[] = rawMembers
    .filter((m): m is Partial<ParsedMemberDraft> => Boolean(m && typeof m === 'object'))
    .slice(0, 12)
    .map((m, idx) => ({
      nickname:
        typeof m.nickname === 'string' && m.nickname.trim()
          ? m.nickname.trim().slice(0, 40)
          : idx === 0
            ? 'Me'
            : `Member ${idx + 1}`,
      role: pickEnum(m.role, VALID_MEMBER_ROLES, 'working_adult'),
      ageGroup: pickEnum(m.ageGroup, VALID_AGE_GROUPS, '18_45'),
      hasRespiratorySensitivity: Boolean(m.hasRespiratorySensitivity),
      hasCardiacSensitivity: Boolean(m.hasCardiacSensitivity),
      isPregnant: Boolean(m.isPregnant),
    }));

  const kmRaw = typeof raw.dailyCommuteKm === 'number' && Number.isFinite(raw.dailyCommuteKm)
    ? raw.dailyCommuteKm
    : baseline.dailyCommuteKm;

  return {
    householdName:
      typeof raw.householdName === 'string' && raw.householdName.trim()
        ? raw.householdName.trim().slice(0, 60)
        : baseline.householdName,
    cityMentioned:
      typeof raw.cityMentioned === 'string' && raw.cityMentioned.trim()
        ? raw.cityMentioned.trim().slice(0, 60)
        : null,
    primaryCommuteMode: pickEnum(
      raw.primaryCommuteMode,
      VALID_TRANSPORT_MODES,
      baseline.primaryCommuteMode,
    ),
    dailyCommuteKm: Math.min(200, Math.max(0, Math.round(kmRaw * 10) / 10)),
    exerciseActivityType:
      typeof raw.exerciseActivityType === 'string' && raw.exerciseActivityType.trim()
        ? raw.exerciseActivityType.trim().slice(0, 40)
        : baseline.exerciseActivityType,
    prefersOutdoorExercise:
      typeof raw.prefersOutdoorExercise === 'boolean'
        ? raw.prefersOutdoorExercise
        : baseline.prefersOutdoorExercise,
    hasHepaPurifier:
      typeof raw.hasHepaPurifier === 'boolean' ? raw.hasHepaPurifier : baseline.hasHepaPurifier,
    hasKitchenExhaust:
      typeof raw.hasKitchenExhaust === 'boolean'
        ? raw.hasKitchenExhaust
        : baseline.hasKitchenExhaust,
    indoorSmokingPresent:
      typeof raw.indoorSmokingPresent === 'boolean'
        ? raw.indoorSmokingPresent
        : baseline.indoorSmokingPresent,
    incenseOrDhoopDaily:
      typeof raw.incenseOrDhoopDaily === 'boolean'
        ? raw.incenseOrDhoopDaily
        : baseline.incenseOrDhoopDaily,
    cookingFuel: pickEnum(raw.cookingFuel, VALID_COOKING_FUELS, baseline.cookingFuel),
    dustCleaningMethod: pickEnum(
      raw.dustCleaningMethod,
      VALID_CLEANING_METHODS,
      baseline.dustCleaningMethod,
    ),
    windowSealingQuality: pickEnum(
      raw.windowSealingQuality,
      VALID_WINDOW_SEALING,
      baseline.windowSealingQuality,
    ),
    members: members.length > 0 ? members : baseline.members,
    summaryNote:
      typeof raw.summaryNote === 'string' && raw.summaryNote.trim()
        ? raw.summaryNote.trim().slice(0, 220)
        : baseline.summaryNote,
    fallbackUsed: Boolean(raw.fallbackUsed),
  };
}

/**
 * Natural-language Household & Family parser (3-tier resilience chain):
 * 1. Primary: Client-side Firebase AI Logic (`firebase/ai` · `gemini-2.5-flash-lite`) — instant, zero cold start.
 * 2. Secondary backup: `parse_household_profile` Cloud Function callable.
 * 3. Guaranteed offline fallback: `parseHouseholdLocally()` deterministic parser.
 */
export async function parseHouseholdDescription(description: string): Promise<ParsedHouseholdDraft> {
  const cleaned = description.trim().slice(0, 800);

  // Tier 1: Direct client-side Firebase AI Logic
  const clientAiDraft = await generateStructuredClientJson<Partial<ParsedHouseholdDraft>>({
    systemInstruction: HOUSEHOLD_SYSTEM_INSTRUCTION,
    prompt: `Household description:\n${cleaned}`,
    responseSchema: HOUSEHOLD_DRAFT_SCHEMA,
  });
  if (clientAiDraft && Array.isArray(clientAiDraft.members) && clientAiDraft.members.length > 0) {
    return sanitizeParsedHouseholdDraft({ ...clientAiDraft, fallbackUsed: false }, cleaned);
  }

  // Tier 2: Existing Cloud Function backup
  try {
    const result = await callFunction<{ description: string }, ParsedHouseholdDraft>(
      'parse_household_profile',
      { description: cleaned },
    );
    if (result && Array.isArray(result.members) && result.members.length > 0) {
      return sanitizeParsedHouseholdDraft(result, cleaned);
    }
  } catch {
    // Fall through cleanly to Tier 3 deterministic parser
  }

  // Tier 3: Deterministic client parser
  return parseHouseholdLocally(cleaned);
}
