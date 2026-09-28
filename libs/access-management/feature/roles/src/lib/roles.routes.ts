import type { Routes } from '@angular/router';

export const ROLE_ROUTES: Routes = [
  {
    path: ':roleId/permissions',
    title: 'Role permissions · Warehouse ERP',
    loadComponent: () => import('./containers').then(module => module.RolePermissionsPage),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./containers').then(module => module.RolesPage),
  },
];
