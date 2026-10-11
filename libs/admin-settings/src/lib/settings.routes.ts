import type { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    title: 'Settings · Warehouse ERP',
    loadComponent: () => import('./containers').then(module => module.AdminSettings),
  },
];
