import 'antd/dist/reset.css';
import './styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp } from 'antd';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, RouterProvider, createHashRouter } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { JobCreatePage } from './apps/web/page/JobCreatePage';
import { JobListPage } from './apps/web/page/JobListPage';
import { SettingsPage } from './apps/web/page/SettingsPage';
import { MultiTaskTablePage } from './apps/web/page/MultiTaskTablePage';
import { PersonalCenterPage } from './apps/web/page/PersonalCenterPage';
import { GroupedCardSearchPage } from './apps/web/page/GroupedCardSearchPage';
import { SearchForm2Page } from './apps/web/page/SearchForm2Page';
import { ResetPasswordPage } from './apps/web/page/ResetPasswordPage';
import {RISK050009} from './apps/web/page/RISK/RISK050009'
import BusinessPage from "./apps/web/page/Business";

const queryClient = new QueryClient();

const appRoutes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/product-apply" replace /> },
      { path: 'product-apply', element: <JobCreatePage /> },
      { path: 'search-form-2', element: <SearchForm2Page /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'business-password', element: <BusinessPage /> },
      { path: 'risk-050009', element: <RISK050009 /> },
      { path: 'jobs/new', element: <Navigate to="/product-apply" replace /> },
      { path: 'jobs', element: <JobListPage /> },
      { path: 'personal-center', element: <PersonalCenterPage /> },
      { path: 'multi-task-table', element: <MultiTaskTablePage /> },
      { path: 'grouped-card-search', element: <GroupedCardSearchPage /> },
      { path: 'menu-two/overview', element: <Navigate to="/multi-task-table" replace /> },
      { path: 'system-settings', element: <SettingsPage /> },
      { path: 'settings', element: <Navigate to="/system-settings" replace /> },
    ],
  },
];

const router = createHashRouter(appRoutes);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </QueryClientProvider>
  </React.StrictMode>,
);
