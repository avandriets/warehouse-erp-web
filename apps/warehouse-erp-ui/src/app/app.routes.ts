import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers').then(module => module.AppLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Welcome · Warehouse ERP',
        loadComponent: () => import('./components').then(module => module.WelcomeComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
