import type { Routes } from '@angular/router';
import { ACCESS_MANAGEMENT_ROUTES } from '@warehouse/access-management';
import { permissionGuard } from '@warehouse/auth';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Warehouse ERP',
    loadComponent: () => import('./session').then(module => module.LoginPage),
  },
  {
    path: 'forbidden',
    title: 'Access unavailable · Warehouse ERP',
    loadComponent: () => import('./session').then(module => module.ForbiddenPage),
  },
  {
    path: '',
    canActivate: [permissionGuard],
    data: { permission: 'users.manage' },
    children: ACCESS_MANAGEMENT_ROUTES,
  },
  { path: '**', redirectTo: '' },
];
