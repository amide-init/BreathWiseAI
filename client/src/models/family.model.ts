import { serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore';

import type { LocationOption } from '@/types';

export type TransportMode =
  | 'personal_car'
  | 'two_wheeler'
  | 'carpool'
  | 'public_transit'
  | 'walk_cycle'
  | 'wfh';

export type MemberCommuteMode = TransportMode | 'school_bus' | 'other';

export type MemberRole =
  | 'working_adult'
  | 'child_school'
  | 'child_toddler'
  | 'elderly'
  | 'homemaker'
  | 'other';

export type MemberAgeGroup = '0_5' | '6_12' | '13_17' | '18_45' | '46_60' | '60_plus';

export interface TransportationHabitsModel {
  primaryMode: TransportMode;
  dailyCommuteKm: number;
  vehicleFuelType: string | null;
  occupancy: number;
}

export interface ExercisePreferencesModel {
  prefersOutdoor: boolean;
  preferredWindow: string | null;
  activityType: string | null;
}

export interface IndoorEquipmentModel {
  hasHepaPurifier: boolean;
  purifierRoomsCount: number;
  hasKitchenExhaust: boolean;
  hasCrossVentilation: boolean;
  hasN95Masks: boolean;
  indoorSmokingPresent: boolean;
}

export interface FamilyModel {
  readonly familyId: string;
  readonly ownerUserId: string;
  householdName: string;
  location: LocationOption;
  transportationHabits: TransportationHabitsModel;
  exercisePreferences: ExercisePreferencesModel;
  indoorEquipment: IndoorEquipmentModel;
  readonly createdAt: string | null;
  updatedAt: string | null;
}

export interface MemberScheduleModel {
  leaveHomeTime: string | null;
  returnHomeTime: string | null;
  outdoorPlayOrExerciseTime: string | null;
}

export interface OptionalHealthProfileModel {
  hasRespiratorySensitivity: boolean;
  hasCardiacSensitivity: boolean;
  isPregnant: boolean;
  notes: string | null;
}

export interface FamilyMemberModel {
  readonly memberId: string;
  readonly ownerUserId: string;
  nickname: string;
  role: MemberRole;
  ageGroup: MemberAgeGroup;
  schedule: MemberScheduleModel | null;
  commuteMode: MemberCommuteMode | null;
  optionalHealthProfile: OptionalHealthProfileModel | null;
  readonly createdAt: string | null;
  updatedAt: string | null;
}

export interface SaveFamilyInput {
  householdName: string;
  location: LocationOption;
  transportationHabits: TransportationHabitsModel;
  exercisePreferences: ExercisePreferencesModel;
  indoorEquipment: IndoorEquipmentModel;
}

export interface SaveMemberInput {
  nickname: string;
  role: MemberRole;
  ageGroup: MemberAgeGroup;
  schedule?: MemberScheduleModel | null;
  commuteMode?: MemberCommuteMode | null;
  optionalHealthProfile?: OptionalHealthProfileModel | null;
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  working_adult: 'Working Adult',
  child_school: 'School-Going Child',
  child_toddler: 'Young Child / Toddler',
  elderly: 'Older Adult (60+)',
  homemaker: 'Homemaker',
  other: 'Other',
};

export const AGE_GROUP_LABELS: Record<MemberAgeGroup, string> = {
  '0_5': '0–5 yrs',
  '6_12': '6–12 yrs',
  '13_17': '13–17 yrs',
  '18_45': '18–45 yrs',
  '46_60': '46–60 yrs',
  '60_plus': '60+ yrs',
};

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  personal_car: 'Personal Car',
  two_wheeler: 'Two-Wheeler',
  carpool: 'Carpool',
  public_transit: 'Public Transit (Metro / Bus)',
  walk_cycle: 'Walk / Cycle',
  wfh: 'Work From Home',
};

function toIso(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return typeof value === 'string' ? value : null;
}

function normalizeLocation(loc: LocationOption): LocationOption {
  return {
    locationId: loc.locationId,
    city: loc.city.trim().slice(0, 100),
    state: (loc.state ?? '').trim().slice(0, 100),
    country: (loc.country ?? 'India').trim().slice(0, 100),
    label: loc.label.trim().slice(0, 160),
    lat: loc.lat,
    lng: loc.lng,
  };
}

function normalizeFamilyBody(input: SaveFamilyInput) {
  const householdName = input.householdName.trim().slice(0, 80);
  if (!householdName) {
    throw new Error('Household name cannot be empty.');
  }

  return {
    householdName,
    location: normalizeLocation(input.location),
    transportationHabits: {
      primaryMode: input.transportationHabits.primaryMode,
      dailyCommuteKm: Math.min(500, Math.max(0, Number(input.transportationHabits.dailyCommuteKm) || 0)),
      vehicleFuelType: (input.transportationHabits.vehicleFuelType ?? 'petrol').slice(0, 40),
      occupancy: Math.min(20, Math.max(1, Math.round(Number(input.transportationHabits.occupancy) || 1))),
    },
    exercisePreferences: {
      prefersOutdoor: Boolean(input.exercisePreferences.prefersOutdoor),
      preferredWindow: (input.exercisePreferences.preferredWindow ?? 'morning').slice(0, 60),
      activityType: (input.exercisePreferences.activityType ?? 'walk').slice(0, 60),
    },
    indoorEquipment: {
      hasHepaPurifier: Boolean(input.indoorEquipment.hasHepaPurifier),
      purifierRoomsCount: input.indoorEquipment.hasHepaPurifier
        ? Math.min(50, Math.max(1, Math.round(Number(input.indoorEquipment.purifierRoomsCount) || 1)))
        : 0,
      hasKitchenExhaust: Boolean(input.indoorEquipment.hasKitchenExhaust),
      hasCrossVentilation: Boolean(input.indoorEquipment.hasCrossVentilation),
      hasN95Masks: Boolean(input.indoorEquipment.hasN95Masks),
      indoorSmokingPresent: Boolean(input.indoorEquipment.indoorSmokingPresent),
    },
  };
}

export function buildFamilyCreatePayload(ownerUserId: string, input: SaveFamilyInput) {
  return {
    ownerUserId,
    ...normalizeFamilyBody(input),
    indoorQuestionnaire: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildFamilyUpdatePayload(input: SaveFamilyInput) {
  return {
    ...normalizeFamilyBody(input),
    updatedAt: serverTimestamp(),
  };
}

function normalizeMemberBody(input: SaveMemberInput) {
  const nickname = input.nickname.trim().slice(0, 60);
  if (!nickname) {
    throw new Error('Member name/label cannot be empty.');
  }

  const sched = input.schedule;
  const hasSchedule = Boolean(
    sched && (sched.leaveHomeTime || sched.returnHomeTime || sched.outdoorPlayOrExerciseTime),
  );
  const schedule = hasSchedule
    ? {
        leaveHomeTime: sched?.leaveHomeTime?.trim().slice(0, 20) || null,
        returnHomeTime: sched?.returnHomeTime?.trim().slice(0, 20) || null,
        outdoorPlayOrExerciseTime: sched?.outdoorPlayOrExerciseTime?.trim().slice(0, 20) || null,
      }
    : null;

  const hp = input.optionalHealthProfile;
  const hasHealth = Boolean(
    hp &&
      (hp.hasRespiratorySensitivity ||
        hp.hasCardiacSensitivity ||
        hp.isPregnant ||
        hp.notes?.trim()),
  );
  const optionalHealthProfile = hasHealth
    ? {
        hasRespiratorySensitivity: Boolean(hp?.hasRespiratorySensitivity),
        hasCardiacSensitivity: Boolean(hp?.hasCardiacSensitivity),
        isPregnant: Boolean(hp?.isPregnant),
        notes: hp?.notes?.trim().slice(0, 200) || null,
      }
    : null;

  return {
    nickname,
    role: input.role,
    ageGroup: input.ageGroup,
    schedule,
    commuteMode: input.commuteMode ?? null,
    optionalHealthProfile,
  };
}

export function buildMemberCreatePayload(ownerUserId: string, input: SaveMemberInput) {
  return {
    ownerUserId,
    ...normalizeMemberBody(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildMemberUpdatePayload(input: SaveMemberInput) {
  return {
    ...normalizeMemberBody(input),
    updatedAt: serverTimestamp(),
  };
}

export function mapFirestoreDocToFamilyModel(familyId: string, data: DocumentData): FamilyModel {
  const transport = (data.transportationHabits ?? {}) as Partial<TransportationHabitsModel>;
  const exercise = (data.exercisePreferences ?? {}) as Partial<ExercisePreferencesModel>;
  const equipment = (data.indoorEquipment ?? {}) as Partial<IndoorEquipmentModel>;

  return {
    familyId,
    ownerUserId: String(data.ownerUserId ?? ''),
    householdName: String(data.householdName ?? 'My Household'),
    location: data.location as LocationOption,
    transportationHabits: {
      primaryMode: transport.primaryMode ?? 'personal_car',
      dailyCommuteKm: Number(transport.dailyCommuteKm ?? 15),
      vehicleFuelType: transport.vehicleFuelType ?? 'petrol',
      occupancy: Number(transport.occupancy ?? 1),
    },
    exercisePreferences: {
      prefersOutdoor: Boolean(exercise.prefersOutdoor ?? true),
      preferredWindow: exercise.preferredWindow ?? 'morning',
      activityType: exercise.activityType ?? 'walk',
    },
    indoorEquipment: {
      hasHepaPurifier: Boolean(equipment.hasHepaPurifier),
      purifierRoomsCount: Number(equipment.purifierRoomsCount ?? 0),
      hasKitchenExhaust: Boolean(equipment.hasKitchenExhaust),
      hasCrossVentilation: Boolean(equipment.hasCrossVentilation ?? true),
      hasN95Masks: Boolean(equipment.hasN95Masks),
      indoorSmokingPresent: Boolean(equipment.indoorSmokingPresent),
    },
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export function mapFirestoreDocToMemberModel(
  memberId: string,
  data: DocumentData,
): FamilyMemberModel {
  return {
    memberId,
    ownerUserId: String(data.ownerUserId ?? ''),
    nickname: String(data.nickname ?? 'Member'),
    role: (data.role as MemberRole) ?? 'working_adult',
    ageGroup: (data.ageGroup as MemberAgeGroup) ?? '18_45',
    schedule: (data.schedule as MemberScheduleModel | null) ?? null,
    commuteMode: (data.commuteMode as MemberCommuteMode | null) ?? null,
    optionalHealthProfile:
      (data.optionalHealthProfile as OptionalHealthProfileModel | null) ?? null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}
