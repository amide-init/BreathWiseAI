/**
 * Shared TypeScript DTOs aligned with docs/API_SPEC.md & docs/DATA_MODEL.md.
 */

export type FreshnessStatus = 'fresh' | 'stale' | 'unavailable';

export type AqiCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe'
  | 'Unavailable';

export interface Citation {
  docId: string;
  title: string;
  sourceAuthority: string;
  sourceUrl?: string | null;
}

export type QuickDecisionStatus = 'good' | 'caution' | 'avoid' | 'unknown';

export interface QuickDecision {
  id: 'exercise' | 'kids_play' | 'windows' | 'mask';
  label: string;
  status: QuickDecisionStatus;
  verdict: string;
  shortReason: string;
}

export interface LocationOption {
  locationId: string;
  city: string;
  state: string;
  country: string;
  label: string;
  lat: number;
  lng: number;
}

export interface PollutantReading {
  location: string;
  pollutant: string;
  value: number | null;
  unit: string;
  observedAt: string | null;
  source: string;
  freshnessStatus: FreshnessStatus;
}

export interface WeatherSnapshot {
  tempC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  observedAt: string | null;
  source: string;
  freshnessStatus: FreshnessStatus;
}

export interface ForecastPoint {
  forecastFor: string;
  pm25: number | null;
  pm10: number | null;
  estimatedNaqi: number | null;
  tempC: number | null;
  windSpeedKmh: number | null;
  source: string;
  isForecast: true;
}

export interface CurrentAirQuality {
  aqi: number | null;
  aqiScale: 'CPCB_NAQI';
  category: AqiCategory;
  dominantPollutant: string | null;
  healthGuidance: string;
  readings: PollutantReading[];
  observedAt: string | null;
  source: string;
  freshnessStatus: FreshnessStatus;
}

export interface AirQualityResponse {
  locationId: string;
  locationName: string;
  current: CurrentAirQuality;
  weather: WeatherSnapshot;
  forecasts: ForecastPoint[];
  fallbackProviderUsed: boolean;
  quickDecisions?: QuickDecision[];
}

export interface RecommendationItem {
  itemId: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  category:
    | 'outdoor_activity'
    | 'commute'
    | 'indoor_air'
    | 'sustainability'
    | 'health_precaution'
    | 'cooking_ventilation';
  targetMembers: string[];
  whatToDo: string;
  why: string;
  ifYouContinue?: string | null;
  alternative: string;
  supportingData: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}
