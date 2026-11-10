import type { ReactNode } from 'react';

import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { useAppSelector } from '@/hooks';
import { DashboardPage } from '@/pages/DashboardPage';
import { DevicesPage } from '@/pages/DevicesPage';
import { InvitePage } from '@/pages/InvitePage';
import { LoginPage } from '@/pages/LoginPage';
import { MembersPage } from '@/pages/MembersPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { TimesheetsPage } from '@/pages/TimesheetsPage';

function ProtectedLayout() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  return accessToken ? <AppShell /> : <Navigate to="/login" replace />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  return accessToken ? <Navigate to="/" replace /> : children;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicOnly>
        <RegisterPage />
      </PublicOnly>
    ),
  },
  { path: '/invite/:token', element: <InvitePage /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/projects', element: <ProjectsPage /> },
      { path: '/timesheets', element: <TimesheetsPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/members', element: <MembersPage /> },
      { path: '/devices', element: <DevicesPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
