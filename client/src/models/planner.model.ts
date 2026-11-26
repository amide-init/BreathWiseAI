import type {
  AqiCategory,
  Citation,
  CurrentAirQuality,
  QuickDecision,
  RecommendationItem,
} from '@/types';

export interface RiskConstraintsModel {
  allowStrenuousOutdoor: boolean;
  allowChildOutdoorPlay: boolean;
  recommendMaskOutdoors: boolean;
  recommendWindowsClosed: boolean;
  recommendHepaIfOwned: boolean;
  requireFreshnessCaveat: boolean;
  allowSpecificSafeWindowClaims: boolean;
  medicalEscalationRequired: boolean;
}

export interface RiskAssessmentModel {
  severityTier: AqiCategory;
  aqiValue: number | null;
  sensitiveGroupsPresent: boolean;
  sensitiveGroupReasons: string[];
  constraints: RiskConstraintsModel;
  safeForecastWindows: string[];
  summaryGuidance: string;
  quickDecisions?: QuickDecision[];
}

export interface DailyPlanSectionsModel {
  morning: RecommendationItem[];
  afternoon: RecommendationItem[];
  evening: RecommendationItem[];
}

export interface DailyPlanModel {
  planId: string;
  userId: string;
  familyId: string;
  locationId: string;
  locationName?: string;
  planDate: string;
  environmentalSnapshot: CurrentAirQuality;
  riskAssessment: RiskAssessmentModel;
  sections: DailyPlanSectionsModel;
  completedItemIds: string[];
  fallbackMode: boolean;
  citations: Citation[];
  agentTrace?: string[];
  createdAt?: string | null;
}

export function getTodayLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
