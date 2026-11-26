import type { Citation, CurrentAirQuality, RecommendationItem } from '@/types';
import type { RiskAssessmentModel } from '@/models/planner.model';

export type CookingFuelType = 'lpg_gas' | 'electric_induction' | 'biomass_solid' | 'mixed';
export type DustCleaningMethod = 'dry_broom' | 'wet_mop' | 'hepa_vacuum' | 'mixed';
export type WindowSealingQuality = 'poor' | 'moderate' | 'good';
export type IndoorRiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

export interface IndoorQuestionnaireInput {
  cookingFuel: CookingFuelType;
  usesKitchenExhaust: boolean;
  hasHepaPurifier: boolean;
  indoorSmokingPresent: boolean;
  incenseOrDhoopDaily: boolean;
  dustCleaningMethod: DustCleaningMethod;
  windowSealingQuality: WindowSealingQuality;
}

export interface IndoorAssessmentResult {
  assessmentBasis: 'estimated_questionnaire';
  disclaimer: string;
  estimatedRiskLevel: IndoorRiskLevel;
  keyIndoorSources: string[];
  recommendations: RecommendationItem[];
  citations: Citation[];
  agentTrace?: string[];
  fallbackMode: boolean;
  questionnaire: IndoorQuestionnaireInput;
  environmentalSnapshot?: CurrentAirQuality;
  riskAssessment?: RiskAssessmentModel;
  savedToFamilyId?: string | null;
}

export const DEFAULT_INDOOR_QUESTIONNAIRE: IndoorQuestionnaireInput = {
  cookingFuel: 'lpg_gas',
  usesKitchenExhaust: true,
  hasHepaPurifier: false,
  indoorSmokingPresent: false,
  incenseOrDhoopDaily: false,
  dustCleaningMethod: 'wet_mop',
  windowSealingQuality: 'moderate',
};

export const COOKING_FUEL_LABELS: Record<CookingFuelType, string> = {
  lpg_gas: 'LPG / Piped Gas',
  electric_induction: 'Electric / Induction',
  biomass_solid: 'Biomass / Wood / Coal',
  mixed: 'Mixed (Gas + Electric / Solid)',
};

export const DUST_CLEANING_LABELS: Record<DustCleaningMethod, string> = {
  dry_broom: 'Dry Broom Sweeping',
  wet_mop: 'Wet Mopping / Damp Cloth',
  hepa_vacuum: 'HEPA Vacuum Cleaner',
  mixed: 'Mixed (Broom + Wet Mop)',
};

export const WINDOW_SEALING_LABELS: Record<WindowSealingQuality, string> = {
  poor: 'Poor (visible gaps / dusty drafts)',
  moderate: 'Moderate (standard Indian sliding/casement)',
  good: 'Good (weather-stripped / double-glazed)',
};
