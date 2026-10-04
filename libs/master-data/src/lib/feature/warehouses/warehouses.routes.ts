import type { Routes } from '@angular/router';

export const WAREHOUSES_ROUTES: Routes = [
  {
    path: '',
    title: 'Warehouses',
    pathMatch: 'full',
    data: { mode: 'list' },
    loadComponent: () => import('./containers').then(m => m.WarehousesPage),
  },
  {
    path: 'create',
    title: 'Create warehouse',
    data: { mode: 'create' },
    loadComponent: () => import('./containers').then(m => m.WarehousesPage),
  },
  {
    path: ':id/edit',
    title: 'Edit warehouse',
    data: { mode: 'edit' },
    loadComponent: () => import('./containers').then(m => m.WarehousesPage),
  },
  {
    path: ':id/delete',
    title: 'Delete warehouse',
    data: { mode: 'delete' },
    loadComponent: () => import('./containers').then(m => m.WarehousesPage),
  },
];
