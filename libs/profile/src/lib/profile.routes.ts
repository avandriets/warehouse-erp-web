import type { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    title: 'My profile · Warehouse ERP',
    loadComponent: () => import('./containers').then(module => module.ProfileComponent),
  },
];
