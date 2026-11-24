import { AlertCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface DataStateWrapperProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  loadingFallback?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable wrapper ensuring consistent loading skeletons and recoverable error states.
 */
export function DataStateWrapper({
  isLoading,
  error,
  onRetry,
  loadingFallback,
  children,
}: DataStateWrapperProps) {
  if (isLoading) {
    return (
      <>
        {loadingFallback ?? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading content">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        )}
      </>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="items-center justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Unable to load data</p>
            <p className="text-xs opacity-90">{error}</p>
          </div>
        </div>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        ) : null}
      </Alert>
    );
  }

  return <>{children}</>;
}
