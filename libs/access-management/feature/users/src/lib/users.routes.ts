import type { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: ':userId/access',
    title: 'User access · Warehouse ERP',
    loadComponent: () => import('./containers').then(module => module.UserAccessPage),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./containers').then(module => module.UsersPage),
  },
];
