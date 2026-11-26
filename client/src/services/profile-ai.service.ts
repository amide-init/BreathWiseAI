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

export function parseHouseholdDescription(description: string): Promise<ParsedHouseholdDraft> {
  return callFunction<{ description: string }, ParsedHouseholdDraft>('parse_household_profile', {
    description,
  });
}
