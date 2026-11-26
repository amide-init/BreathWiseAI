import type { AqiCategory, QuickDecision } from '@/types';

const STATUS_EMOJI: Record<QuickDecision['status'], string> = {
  good: '✅',
  caution: '⚠️',
  avoid: '🛑',
  unknown: 'ℹ️',
};

export function buildDailyAirShareText(params: {
  city: string;
  aqi: number | null;
  category: AqiCategory;
  decisions?: QuickDecision[];
  url?: string;
}): string {
  const shareUrl =
    params.url ?? (typeof window !== 'undefined' ? window.location.origin : 'https://agentora-ai-v2.web.app');
  const scoreLine =
    params.aqi !== null
      ? `Air Quality in ${params.city}: ${params.aqi} (${params.category} · India CPCB)`
      : `Air Quality Update for ${params.city} (${params.category})`;

  const lines = [`🌬️ ${scoreLine}`];
  if (params.decisions && params.decisions.length > 0) {
    lines.push('');
    for (const d of params.decisions) {
      lines.push(`${STATUS_EMOJI[d.status]} ${d.label}: ${d.verdict}`);
    }
  }
  lines.push('');
  lines.push(`Check live plain-English air advice for your family: ${shareUrl}`);
  return lines.join('\n');
}

export function buildImpactShareText(params: {
  estimatedCo2Kg: number;
  protectiveActions: number;
  streakDays: number;
  url?: string;
}): string {
  const shareUrl =
    params.url ?? (typeof window !== 'undefined' ? window.location.origin : 'https://agentora-ai-v2.web.app');
  const lines = [
    '🌿 My BreathWiseAI 14-Day Clean-Air Update:',
    `• Estimated CO₂ avoided: ${params.estimatedCo2Kg.toFixed(2)} kg CO₂e (estimate)`,
    `• Family exposure-protection steps: ${params.protectiveActions} action${params.protectiveActions === 1 ? '' : 's'}`,
  ];
  if (params.streakDays > 0) {
    lines.push(`• Active Clean-Air Streak: ${params.streakDays} day${params.streakDays === 1 ? '' : 's'} 🔥`);
  }
  lines.push('');
  lines.push(`Try BreathWiseAI free: ${shareUrl}`);
  return lines.join('\n');
}

/**
 * Computes consecutive active days ending today or yesterday from YYYY-MM-DD date strings.
 */
export function computeCleanAirStreak(datesIso: string[], today: Date = new Date()): number {
  const uniqueDates = new Set(datesIso.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
  if (uniqueDates.size === 0) {
    return 0;
  }

  const formatLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!uniqueDates.has(formatLocal(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!uniqueDates.has(formatLocal(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (uniqueDates.has(formatLocal(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function shareTextMessage(
  title: string,
  text: string,
  url?: string,
): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'failed';
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    // Fallback failed
  }
  return 'failed';
}
