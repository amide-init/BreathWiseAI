import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { APP_ROUTES } from '@/config/routes';
import { PortalLayout } from '@/layouts/PortalLayout';
import { DashboardPage } from '@/pages/DashboardPage';
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

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />
        {/* Public Guest Preview on Home so visitors see live city AQI & AI copilot right away */}
        <Route element={<PortalLayout />}>
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
