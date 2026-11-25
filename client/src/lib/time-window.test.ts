import { describe, expect, it } from 'vitest';

import { getCurrentTimeWindow, getOrderedTimeWindows } from '@/lib/time-window';

describe('time-window helpers', () => {
  it('classifies morning, afternoon, and evening accurately from local hour', () => {
    expect(getCurrentTimeWindow(new Date('2026-11-25T07:30:00'))).toBe('morning');
    expect(getCurrentTimeWindow(new Date('2026-11-25T14:15:00'))).toBe('afternoon');
    expect(getCurrentTimeWindow(new Date('2026-11-25T20:45:00'))).toBe('evening');
    expect(getCurrentTimeWindow(new Date('2026-11-25T02:00:00'))).toBe('evening');
  });

  it('orders sections starting with the current time window first', () => {
    expect(getOrderedTimeWindows('morning')).toEqual(['morning', 'afternoon', 'evening']);
    expect(getOrderedTimeWindows('afternoon')).toEqual(['afternoon', 'evening', 'morning']);
    expect(getOrderedTimeWindows('evening')).toEqual(['evening', 'morning', 'afternoon']);
  });
});
