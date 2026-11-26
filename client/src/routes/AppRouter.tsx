import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { BreatheWiseLogoMark } from '@/components/illustrations/GoogleAirIllustrations';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { PortalLayout } from '@/layouts/PortalLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const PlannerPage = lazy(() =>
  import('@/pages/PlannerPage').then((m) => ({ default: m.PlannerPage })),
);
const AssistantPage = lazy(() =>
  import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })),
);
const ImpactPage = lazy(() =>
  import('@/pages/ImpactPage').then((m) => ({ default: m.ImpactPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function RouteFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}

/**
 * Root `/` entry:
 * - Signed-out visitors see the dedicated Google-illustrated Landing Page (no dashboard sidebar).
 * - Signed-in users go straight to Onboarding (if new) or the Today dashboard inside PortalLayout.
 */
function HomeEntryLayout() {
  const { user, userProfile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="bw-illustrated-bg flex min-h-screen flex-col items-center justify-center gap-3 text-[#5F6368] dark:text-[#9AA0A6]">
        <BreatheWiseLogoMark className="h-12 w-12 animate-pulse" />
        <p className="font-display text-sm font-semibold">Loading BreatheWise AI…</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (userProfile && !userProfile.onboardingCompleted) {
    return <Navigate to={APP_ROUTES.ONBOARDING} replace />;
  }

  return <PortalLayout />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        {/* Root: Dedicated Landing Page for guests, Portal Dashboard for signed-in users */}
        <Route element={<HomeEntryLayout />}>
          <Route path={APP_ROUTES.HOME} element={<DashboardPage />} />
        </Route>
        {/* Authenticated Personalization, Onboarding, AI & Impact Screens */}
        <Route element={<ProtectedRoute />}>
          <Route
            path={APP_ROUTES.ONBOARDING}
            element={
              <Suspense fallback={<RouteFallback />}>
                <OnboardingPage />
              </Suspense>
            }
          />
          <Route element={<PortalLayout />}>
            <Route
              path={APP_ROUTES.PLANNER}
              element={
                <Suspense fallback={<RouteFallback />}>
                  <PlannerPage />
                </Suspense>
              }
            />
            <Route
              path={APP_ROUTES.ASSISTANT}
              element={
                <Suspense fallback={<RouteFallback />}>
                  <AssistantPage />
                </Suspense>
              }
            />
            <Route
              path={APP_ROUTES.IMPACT}
              element={
                <Suspense fallback={<RouteFallback />}>
                  <ImpactPage />
                </Suspense>
              }
            />
            <Route
              path={APP_ROUTES.PROFILE}
              element={
                <Suspense fallback={<RouteFallback />}>
                  <ProfilePage />
                </Suspense>
              }
            />
            <Route
              path={APP_ROUTES.SETTINGS}
              element={
                <Suspense fallback={<RouteFallback />}>
                  <SettingsPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
