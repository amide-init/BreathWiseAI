import { Wind } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { APP_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-zinc-950">
          <Wind className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">Loading BreatheWise AI…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={APP_ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
