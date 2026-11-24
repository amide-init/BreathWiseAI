import { describe, expect, it } from 'vitest';

import { getAqiToken } from '@/config/aqi-tokens';
import { formatCo2Kg, formatMeasurement } from '@/lib/formatters';

describe('client foundation helpers', () => {
  it('returns accessible visual tokens for all CPCB categories', () => {
    expect(getAqiToken('Good').rangeLabel).toBe('0–50');
    expect(getAqiToken('Very Poor').badgeClass).toContain('bg-red-600');
    expect(getAqiToken('Unavailable').label).toBe('Unavailable');
  });

  it('never fabricates numbers for null pollutant readings', () => {
    expect(formatMeasurement(null, 'µg/m³')).toBe('Unavailable');
    expect(formatMeasurement(176.4, 'µg/m³')).toBe('176.4 µg/m³');
    expect(formatCo2Kg(2.267)).toBe('2.27 kg CO2e');
  });
});
