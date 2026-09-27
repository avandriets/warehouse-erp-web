import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers').then(module => module.AppLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Welcome · Warehouse ERP',
        loadComponent: () => import('./containers').then(module => module.WelcomePage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
