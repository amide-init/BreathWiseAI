export type TimeWindowKey = 'morning' | 'afternoon' | 'evening';

export interface TimeWindowMeta {
  key: TimeWindowKey;
  label: string;
  rangeLabel: string;
  greeting: string;
}

export const TIME_WINDOW_META: Record<TimeWindowKey, TimeWindowMeta> = {
  morning: {
    key: 'morning',
    label: 'Morning',
    rangeLabel: '5 AM – 12 PM',
    greeting: 'Good morning',
  },
  afternoon: {
    key: 'afternoon',
    label: 'Afternoon',
    rangeLabel: '12 PM – 5 PM',
    greeting: 'Good afternoon',
  },
  evening: {
    key: 'evening',
    label: 'Evening',
    rangeLabel: '5 PM – Late',
    greeting: 'Good evening',
  },
};

/**
 * Resolve the user's current local time window so "Right Now" actions always come first.
 */
export function getCurrentTimeWindow(date: Date = new Date()): TimeWindowKey {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'afternoon';
  }
  return 'evening';
}

/**
 * Order daily plan windows starting with the user's current time window,
 * followed by upcoming windows and then earlier ones.
 */
export function getOrderedTimeWindows(current: TimeWindowKey): TimeWindowKey[] {
  if (current === 'morning') {
    return ['morning', 'afternoon', 'evening'];
  }
  if (current === 'afternoon') {
    return ['afternoon', 'evening', 'morning'];
  }
  return ['evening', 'morning', 'afternoon'];
}
