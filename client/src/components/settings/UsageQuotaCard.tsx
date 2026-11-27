import { Activity, Clock, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import type { UsageCategoryItem, UserUsageSummary } from '@/models/usage.model';
import { fetchUserUsage } from '@/services/usage.service';

function formatLocalResetTime(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return 'midnight UTC';
  }
  return new Date(parsed).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function barColorClass(percentUsed: number): string {
  if (percentUsed >= 100) {
    return 'bg-[#EA4335] dark:bg-[#F28B82]';
  }
  if (percentUsed >= 80) {
    return 'bg-[#FBBC05] dark:bg-[#FDD663]';
  }
  return 'bg-[#4285F4] dark:bg-[#8AB4F8]';
}

function statusBadge(item: UsageCategoryItem): {
  label: string;
  variant: 'default' | 'neutral' | 'warning' | 'danger';
} {
  if (item.remaining === 0) {
    return { label: 'Limit reached', variant: 'danger' };
  }
  if (item.percentUsed >= 80) {
    return { label: `${item.remaining} left`, variant: 'warning' };
  }
  return { label: `${item.remaining} left`, variant: 'neutral' };
}

export function UsageQuotaCard() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UserUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(
    async (forceRefresh = false) => {
      if (!user) {
        return;
      }
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await fetchUserUsage(user.uid, { forceRefresh });
        setUsage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your daily usage right now.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void loadUsage(true);
  }, [loadUsage]);

  const overallPercent =
    usage && usage.totalLimit > 0
      ? Math.min(100, Math.round((usage.totalUsed / usage.totalLimit) * 100))
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#4285F4] dark:text-[#8AB4F8]" aria-hidden="true" />
            AI &amp; Daily Usage
          </CardTitle>
          <div className="flex items-center gap-2">
            {usage ? (
              <Badge variant={overallPercent >= 80 ? 'warning' : 'default'}>
                {usage.totalUsed} / {usage.totalLimit} today
              </Badge>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || refreshing}
              onClick={() => void loadUsage(true)}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
                aria-hidden="true"
              />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </Button>
          </div>
        </div>
        <CardDescription>
          Fair-use daily limits per account to keep BreathWiseAI fast and responsive. Cached live
          AQI reads and cached translations do not count against your quota.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}

        {loading && !usage ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
            <Loader2 className="h-4 w-4 animate-spin text-[#4285F4]" aria-hidden="true" />
            <span>Loading today&apos;s usage…</span>
          </div>
        ) : usage ? (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {usage.categories.map((cat) => {
                const badge = statusBadge(cat);
                return (
                  <div
                    key={cat.key}
                    className="rounded-2xl border border-[#DADCE0]/80 bg-[#F8F9FA]/90 p-3.5 dark:border-white/[0.08] dark:bg-[#131314]/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#202124] dark:text-[#E3E3E3]">
                          {cat.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                          {cat.description}
                        </p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span className="text-[#3C4043] dark:text-[#BDC1C6]">
                          {cat.used} of {cat.limit} used
                        </span>
                        <span className="tabular-nums text-[#5F6368] dark:text-[#9AA0A6]">
                          {cat.percentUsed}%
                        </span>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-[#E8EAED] dark:bg-white/[0.08]"
                        role="progressbar"
                        aria-label={`${cat.label} usage`}
                        aria-valuenow={cat.used}
                        aria-valuemin={0}
                        aria-valuemax={cat.limit}
                      >
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            barColorClass(cat.percentUsed),
                          )}
                          style={{ width: `${cat.percentUsed}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#4285F4]/20 bg-[#E8F0FE]/55 px-3.5 py-2.5 text-xs text-[#3C4043] dark:border-[#8AB4F8]/20 dark:bg-[#4285F4]/10 dark:text-[#BDC1C6]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#1A73E8] dark:text-[#8AB4F8]" aria-hidden="true" />
                <span>
                  Daily quotas reset at{' '}
                  <strong>{formatLocalResetTime(usage.resetsAt)}</strong> local time ({usage.date}{' '}
                  UTC)
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px]">
                <Sparkles
                  className="h-3.5 w-3.5 text-[#34A853] dark:text-[#81C995]"
                  aria-hidden="true"
                />
                <span>Burst guard: up to {usage.burstLimitPerMinute} AI requests / min</span>
              </span>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
