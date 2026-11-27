import { Schema } from 'firebase/ai';

import { generateStructuredClientJson } from '@/lib/firebase-ai';
import type {
  CookingFuelType,
  DustCleaningMethod,
  IndoorQuestionnaireInput,
  WindowSealingQuality,
} from '@/models/indoor.model';

export interface ParsedIndoorQuestionnaireResult {
  answers: IndoorQuestionnaireInput;
  fallbackUsed: boolean;
}

const VALID_COOKING: readonly CookingFuelType[] = [
  'lpg_gas',
  'electric_induction',
  'biomass_solid',
  'mixed',
];
const VALID_CLEANING: readonly DustCleaningMethod[] = [
  'dry_broom',
  'wet_mop',
  'hepa_vacuum',
  'mixed',
];
const VALID_SEALING: readonly WindowSealingQuality[] = ['poor', 'moderate', 'good'];

const INDOOR_QUESTIONNAIRE_SCHEMA = Schema.object({
  properties: {
    cookingFuel: Schema.enumString({ enum: [...VALID_COOKING] }),
    usesKitchenExhaust: Schema.boolean(),
    hasHepaPurifier: Schema.boolean(),
    indoorSmokingPresent: Schema.boolean(),
    incenseOrDhoopDaily: Schema.boolean(),
    dustCleaningMethod: Schema.enumString({ enum: [...VALID_CLEANING] }),
    windowSealingQuality: Schema.enumString({ enum: [...VALID_SEALING] }),
  },
});

const INDOOR_SYSTEM_INSTRUCTION = [
  'You are BreathWiseAI’s form-filling assistant for the 7-question home indoor air questionnaire.',
  'Extract ONLY the 7 structured questionnaire answers from the user’s casual description (English or Hinglish).',
  'RULES:',
  '1. Never estimate indoor PM2.5 or risk scores — only map their home habits accurately to the 7 fields.',
  '2. Set hasHepaPurifier=false unless they explicitly say they own an air purifier/HEPA.',
  '3. Set indoorSmokingPresent=true if smoking indoors or on a balcony connected to rooms is mentioned.',
  '4. Set incenseOrDhoopDaily=true if agarbatti, dhoop, puja smoke, or incense is mentioned.',
  '5. Preserve sensible defaults from CURRENT_ANSWERS for any field not mentioned.',
].join('\n');

/**
 * Deterministic fallback mapper for the 7 indoor questionnaire answers.
 */
export function parseIndoorAnswersLocally(
  description: string,
  current: IndoorQuestionnaireInput,
): IndoorQuestionnaireInput {
  const text = description.toLowerCase();
  const next: IndoorQuestionnaireInput = { ...current };

  if (/\b(induction|electric)\b/.test(text) && /\b(lpg|gas)\b/.test(text)) {
    next.cookingFuel = 'mixed';
  } else if (/\b(induction|electric stove)\b/.test(text)) {
    next.cookingFuel = 'electric_induction';
  } else if (/\b(wood|chulha|coal|biomass|kerosene)\b/.test(text)) {
    next.cookingFuel = 'biomass_solid';
  } else if (/\b(lpg|gas|png)\b/.test(text)) {
    next.cookingFuel = 'lpg_gas';
  }

  if (/\b(no chimney|no exhaust|without chimney|without exhaust)\b/.test(text)) {
    next.usesKitchenExhaust = false;
  } else if (/\b(chimney|exhaust)\b/.test(text)) {
    next.usesKitchenExhaust = true;
  }

  if (/\b(no purifier|no air purifier|without purifier|no hepa)\b/.test(text)) {
    next.hasHepaPurifier = false;
  } else if (/\b(hepa|air purifier|purifier)\b/.test(text)) {
    next.hasHepaPurifier = true;
  }

  if (/\b(no smoking|smoke[- ]?free|non[- ]?smoker|don'?t smoke)\b/.test(text)) {
    next.indoorSmokingPresent = false;
  } else if (/\b(smok(?:e|es|ing|er)|cigar(?:ette)?s?|bidi|hookah)\b/.test(text)) {
    next.indoorSmokingPresent = true;
  }

  if (/\b(no incense|no dhoop|no agarbatti)\b/.test(text)) {
    next.incenseOrDhoopDaily = false;
  } else if (/\b(dhoop|agarbatti|incense|puja smoke|pooja)\b/.test(text)) {
    next.incenseOrDhoopDaily = true;
  }

  if (/\b(hepa vacuum|vacuum)\b/.test(text)) {
    next.dustCleaningMethod = 'hepa_vacuum';
  } else if (/\b(broom|jhadu|dry sweep)\b/.test(text) && /\b(mop|pocha)\b/.test(text)) {
    next.dustCleaningMethod = 'mixed';
  } else if (/\b(broom|jhadu|dry sweep)\b/.test(text)) {
    next.dustCleaningMethod = 'dry_broom';
  } else if (/\b(wet mop|mop|pocha)\b/.test(text)) {
    next.dustCleaningMethod = 'wet_mop';
  }

  if (/\b(loose windows?|drafty|poor seal|gaps|broken seal|open gaps)\b/.test(text)) {
    next.windowSealingQuality = 'poor';
  } else if (/\b(well sealed|tight windows?|good seal|upvc|double glass|sealed)\b/.test(text)) {
    next.windowSealingQuality = 'good';
  } else if (/\b(average|moderate)\b/.test(text)) {
    next.windowSealingQuality = 'moderate';
  }

  return next;
}

export function sanitizeIndoorQuestionnaire(
  raw: Partial<IndoorQuestionnaireInput>,
  fallback: IndoorQuestionnaireInput,
): IndoorQuestionnaireInput {
  return {
    cookingFuel:
      typeof raw.cookingFuel === 'string' &&
      (VALID_COOKING as readonly string[]).includes(raw.cookingFuel)
        ? (raw.cookingFuel as CookingFuelType)
        : fallback.cookingFuel,
    usesKitchenExhaust:
      typeof raw.usesKitchenExhaust === 'boolean'
        ? raw.usesKitchenExhaust
        : fallback.usesKitchenExhaust,
    hasHepaPurifier:
      typeof raw.hasHepaPurifier === 'boolean' ? raw.hasHepaPurifier : fallback.hasHepaPurifier,
    indoorSmokingPresent:
      typeof raw.indoorSmokingPresent === 'boolean'
        ? raw.indoorSmokingPresent
        : fallback.indoorSmokingPresent,
    incenseOrDhoopDaily:
      typeof raw.incenseOrDhoopDaily === 'boolean'
        ? raw.incenseOrDhoopDaily
        : fallback.incenseOrDhoopDaily,
    dustCleaningMethod:
      typeof raw.dustCleaningMethod === 'string' &&
      (VALID_CLEANING as readonly string[]).includes(raw.dustCleaningMethod)
        ? (raw.dustCleaningMethod as DustCleaningMethod)
        : fallback.dustCleaningMethod,
    windowSealingQuality:
      typeof raw.windowSealingQuality === 'string' &&
      (VALID_SEALING as readonly string[]).includes(raw.windowSealingQuality)
        ? (raw.windowSealingQuality as WindowSealingQuality)
        : fallback.windowSealingQuality,
  };
}

/**
 * Client-side Firebase AI Logic quick-fill helper for the 7-question Indoor Advisor form.
 * The actual indoor risk estimate still runs on Cloud Functions (`assess_indoor_air`).
 */
export async function parseIndoorQuestionnaireDescription(
  description: string,
  current: IndoorQuestionnaireInput,
): Promise<ParsedIndoorQuestionnaireResult> {
  const cleaned = description.trim().slice(0, 500);
  const localFallback = parseIndoorAnswersLocally(cleaned, current);

  const aiAnswers = await generateStructuredClientJson<Partial<IndoorQuestionnaireInput>>({
    systemInstruction: INDOOR_SYSTEM_INSTRUCTION,
    prompt: `CURRENT_ANSWERS:\n${JSON.stringify(current)}\n\nUSER_HOME_DESCRIPTION:\n${cleaned}`,
    responseSchema: INDOOR_QUESTIONNAIRE_SCHEMA,
  });

  if (aiAnswers && typeof aiAnswers === 'object') {
    return {
      answers: sanitizeIndoorQuestionnaire(aiAnswers, localFallback),
      fallbackUsed: false,
    };
  }
  return {
    answers: localFallback,
    fallbackUsed: true,
  };
}
