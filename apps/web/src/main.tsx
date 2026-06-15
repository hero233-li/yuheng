import 'antd/dist/reset.css';
import './styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp } from 'antd';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Navigate, RouterProvider, createHashRouter } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { JobCreatePage } from './apps/web/JobCreatePage';
import { JobListPage } from './apps/web/JobListPage';
import { SettingsPage } from './apps/web/SettingsPage';
import { PlaceholderPage } from './apps/web/PlaceholderPage';
import { LoginPage } from './apps/web/LoginPage';
import { RequireAuth } from './components/RequireAuth';
import { MultiTaskTablePage } from './apps/web/MultiTaskTablePage';
import { CardSearchPage } from './apps/web/CardSearchPage';
import { PersonalCenterPage } from './apps/web/PersonalCenterPage';
import { GroupedCardSearchPage } from './apps/web/GroupedCardSearchPage';
import { SearchForm2Page } from './apps/web/SearchForm2Page';

const queryClient = new QueryClient();

const appRoutes = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/product-apply" replace /> },
          { path: 'product-apply', element: <JobCreatePage /> },
          { path: 'search-form-2', element: <SearchForm2Page /> },
          { path: 'jobs/new', element: <Navigate to="/product-apply" replace /> },
          { path: 'jobs', element: <JobListPage /> },
          { path: 'personal-center', element: <PersonalCenterPage /> },
          { path: 'multi-task-table', element: <MultiTaskTablePage /> },
          { path: 'card-search', element: <CardSearchPage /> },
          { path: 'grouped-card-search', element: <GroupedCardSearchPage /> },
          { path: 'menu-two/overview', element: <Navigate to="/multi-task-table" replace /> },
          { path: 'menu-three/overview', element: <PlaceholderPage title="菜单三页面" /> },
          { path: 'system-settings', element: <SettingsPage /> },
          { path: 'settings', element: <Navigate to="/system-settings" replace /> },
        ],
      },
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
