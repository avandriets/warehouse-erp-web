import type { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers').then(module => module.UsersPage),
  },
];
