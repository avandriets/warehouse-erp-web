import type { Routes } from '@angular/router';

export const ACCESS_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Access management overview',
    loadComponent: () => import('@warehouse/access-management/feature/dashboard').then(module => module.AccessManagementDashboard),
  },
  {
    path: 'users',
    title: 'Users · Warehouse ERP',
    loadChildren: () => import('@warehouse/access-management/feature/users').then(module => module.USER_ROUTES),
  },
  {
    path: 'roles',
    title: 'Roles and permissions · Warehouse ERP',
    loadChildren: () => import('@warehouse/access-management/feature/roles').then(module => module.ROLE_ROUTES),
  },
];
