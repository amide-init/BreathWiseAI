import { callFunction } from '@/lib/callable-client';
import type { MemberAgeGroup, MemberRole, TransportMode } from '@/models/family.model';
import type {
  CookingFuelType,
  DustCleaningMethod,
  WindowSealingQuality,
} from '@/models/indoor.model';

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

export async function parseHouseholdDescription(description: string): Promise<ParsedHouseholdDraft> {
  try {
    const result = await callFunction<{ description: string }, ParsedHouseholdDraft>(
      'parse_household_profile',
      { description },
    );
    if (result && Array.isArray(result.members) && result.members.length > 0) {
      return result;
    }
    return parseHouseholdLocally(description);
  } catch {
    // Graceful local fallback when the Gen 2 callable isn't deployed yet or network is offline
    return parseHouseholdLocally(description);
  }
}
