import type { Routes } from '@angular/router';
import { permissionGuard } from '@warehouse/auth';

import { ACCESS_MANAGEMENT_SECTION } from './config';

export const routes: Routes = [
  {
    path: 'forbidden',
    title: 'Access unavailable · Warehouse ERP',
    loadComponent: () => import('./pages').then(module => module.ForbiddenPage),
  },
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
        path: 'access-required',
        title: 'Sign in required · Warehouse ERP',
        loadComponent: () => import('./pages').then(module => module.AccessRequiredPage),
      },
      {
        ...ACCESS_MANAGEMENT_SECTION,
        canActivate: [permissionGuard],
        data: { permission: 'users.manage' },
      },
      {
        path: '**',
        title: 'Page not found · Warehouse ERP',
        loadComponent: () => import('./pages').then(module => module.NotFoundPage),
      },
    ],
  },
];
