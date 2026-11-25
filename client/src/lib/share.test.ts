import { describe, expect, it } from 'vitest';

import {
  buildDailyAirShareText,
  buildImpactShareText,
  computeCleanAirStreak,
} from '@/lib/share';

describe('share & streak GTM helpers', () => {
  it('formats WhatsApp-ready daily air summary cleanly', () => {
    const text = buildDailyAirShareText({
      city: 'New Delhi',
      aqi: 340,
      category: 'Very Poor',
      decisions: [
        {
          id: 'kids_play',
          label: 'Kids Play',
          status: 'avoid',
          verdict: 'Keep play indoors',
          shortReason: 'High smog',
        },
      ],
      url: 'https://agentora-ai-v2.web.app',
    });

    expect(text).toContain('New Delhi: 340 (Very Poor');
    expect(text).toContain('Kids Play: Keep play indoors');
    expect(text).toContain('https://agentora-ai-v2.web.app');
  });

  it('keeps CO2 estimate and exposure protection separate in impact share text', () => {
    const text = buildImpactShareText({
      estimatedCo2Kg: 4.56,
      protectiveActions: 3,
      streakDays: 2,
      url: 'https://agentora-ai-v2.web.app',
    });

    expect(text).toContain('4.56 kg CO₂e (estimate)');
    expect(text).toContain('3 actions');
    expect(text).toContain('2 days');
  });

  it('calculates consecutive active clean-air streaks accurately', () => {
    const today = new Date('2026-11-25T10:00:00');
    expect(computeCleanAirStreak(['2026-11-25', '2026-11-24', '2026-11-23'], today)).toBe(3);
    expect(computeCleanAirStreak(['2026-11-24', '2026-11-23'], today)).toBe(2);
    expect(computeCleanAirStreak(['2026-11-20'], today)).toBe(0);
  });
});
