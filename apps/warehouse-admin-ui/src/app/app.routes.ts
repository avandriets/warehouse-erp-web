import type { Routes } from '@angular/router';
import { permissionGuard } from '@warehouse/auth';

import { ACCESS_MANAGEMENT_SECTION } from './config';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Warehouse ERP',
    loadComponent: () => import('./containers').then(module => module.LoginPage),
  },
  {
    path: 'forbidden',
    title: 'Access unavailable · Warehouse ERP',
    loadComponent: () => import('./containers').then(module => module.ForbiddenPage),
  },
  {
    path: '',
    loadComponent: () => import('./containers').then(module => module.AppLayout),
    canActivate: [permissionGuard],
    data: { permission: 'users.manage' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Welcome · Warehouse ERP',
        loadComponent: () => import('./containers').then(module => module.WelcomePage),
      },
      ACCESS_MANAGEMENT_SECTION,
    ],
  },
  { path: '**', redirectTo: '' },
];
