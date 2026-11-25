import { describe, expect, it } from 'vitest';

import { METRIC_EXPLAINERS } from '@/config/metric-explainers';

describe('METRIC_EXPLAINERS', () => {
  it('evaluates PM2.5 readings honestly across good, unhealthy, and unavailable states', () => {
    expect(METRIC_EXPLAINERS.pm25.evaluateValue(38).tone).toBe('good');
    expect(METRIC_EXPLAINERS.pm25.evaluateValue(185).tone).toBe('unhealthy');
    expect(METRIC_EXPLAINERS.pm25.evaluateValue(null).tone).toBe('unknown');
  });

  it('evaluates AQI categories across clean, moderate, severe, and missing values', () => {
    expect(METRIC_EXPLAINERS.aqi.evaluateValue(45).tone).toBe('good');
    expect(METRIC_EXPLAINERS.aqi.evaluateValue(160).tone).toBe('caution');
    expect(METRIC_EXPLAINERS.aqi.evaluateValue(420).tone).toBe('unhealthy');
    expect(METRIC_EXPLAINERS.aqi.evaluateValue(null).tone).toBe('unknown');
  });
});
