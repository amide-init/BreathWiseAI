import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { APP_ROUTES } from '@/config/routes';
import { PortalLayout } from '@/layouts/PortalLayout';
import { AssistantPage } from '@/pages/AssistantPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ImpactPage } from '@/pages/ImpactPage';
import { LoginPage } from '@/pages/LoginPage';
import { PlannerPage } from '@/pages/PlannerPage';
import { ProfilePage } from '@/pages/ProfilePage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />
        <Route element={<PortalLayout />}>
          <Route path={APP_ROUTES.HOME} element={<DashboardPage />} />
          <Route path={APP_ROUTES.PLANNER} element={<PlannerPage />} />
          <Route path={APP_ROUTES.ASSISTANT} element={<AssistantPage />} />
          <Route path={APP_ROUTES.IMPACT} element={<ImpactPage />} />
          <Route path={APP_ROUTES.PROFILE} element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
