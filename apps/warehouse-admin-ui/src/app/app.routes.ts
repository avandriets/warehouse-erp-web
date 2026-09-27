import type { Routes } from '@angular/router';
import { permissionGuard } from '@warehouse/auth';

import { ACCESS_MANAGEMENT_SECTION } from './config';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts').then(module => module.AppLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Welcome · Warehouse ERP',
        loadComponent: () => import('./pages').then(module => module.WelcomePage),
      },
      {
        path: 'error',
        title: 'Error · Warehouse ERP',
        data: { status: 503 },
        loadComponent: () => import('./pages').then(module => module.ErrorPage),
      },
      {
        ...ACCESS_MANAGEMENT_SECTION,
        canActivate: [permissionGuard],
        data: { permission: 'users.manage' },
      },
      {
        path: '**',
        title: 'Page not found · Warehouse ERP',
        data: { status: 404 },
        loadComponent: () => import('./pages').then(module => module.ErrorPage),
      },
    ],
  },
];
