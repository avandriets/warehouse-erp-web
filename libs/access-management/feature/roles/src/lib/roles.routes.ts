import type { Routes } from '@angular/router';

export const ROLE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers').then(module => module.RolesPage),
  },
];
