import { callFunction } from '@/lib/callable-client';
import type { IndoorAssessmentResult, IndoorQuestionnaireInput } from '@/models/indoor.model';
import type { LocationOption } from '@/types';

export interface AssessIndoorAirParams {
  location: LocationOption;
  questionnaire: IndoorQuestionnaireInput;
  familyId?: string | null;
}

export async function assessIndoorAir(
  params: AssessIndoorAirParams,
): Promise<IndoorAssessmentResult> {
  return callFunction<Record<string, unknown>, IndoorAssessmentResult>('assess_indoor_air', {
    locationId: params.location.locationId,
    lat: params.location.lat,
    lng: params.location.lng,
    label: params.location.label,
    familyId: params.familyId ?? null,
    questionnaire: params.questionnaire,
  });
}
