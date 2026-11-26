import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { BreatheWiseLogoMark } from '@/components/illustrations/GoogleAirIllustrations';
import { APP_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute() {
  const { user, userProfile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="bw-illustrated-bg flex min-h-screen flex-col items-center justify-center gap-3 text-[#5F6368] dark:text-[#9AA0A6]">
        <BreatheWiseLogoMark className="h-12 w-12 animate-pulse" />
        <p className="font-display text-sm font-semibold">Loading BreatheWise AI…</p>
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
