import { Wind } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { APP_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute() {
  const { user, userProfile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F7F8FA] text-slate-500 dark:bg-[#0B0E12] dark:text-[#8E9AA8]">
        <div className="flex h-11 w-11 animate-pulse items-center justify-center rounded-2xl bg-teal-600 text-white dark:bg-teal-400/15 dark:text-teal-300">
          <Wind className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">Loading BreatheWise AI…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={APP_ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  }

  // Guide brand-new users seamlessly through the dedicated full-screen AI onboarding once
  if (
    userProfile &&
    !userProfile.onboardingCompleted &&
    location.pathname !== APP_ROUTES.ONBOARDING
  ) {
    return <Navigate to={APP_ROUTES.ONBOARDING} replace />;
  }

  return <Outlet />;
}
