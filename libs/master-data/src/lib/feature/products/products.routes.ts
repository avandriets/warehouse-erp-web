import type { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Products',
    pathMatch: 'full',
    data: { mode: 'list' },
    loadComponent: () => import('./containers').then(m => m.ProductsPage),
  },
  {
    path: 'create',
    title: 'Create product',
    data: { mode: 'create' },
    loadComponent: () => import('./containers').then(m => m.ProductsPage),
  },
  {
    path: ':id/edit',
    title: 'Edit product',
    data: { mode: 'edit' },
    loadComponent: () => import('./containers').then(m => m.ProductsPage),
  },
  {
    path: ':id/delete',
    title: 'Delete product',
    data: { mode: 'delete' },
    loadComponent: () => import('./containers').then(m => m.ProductsPage),
  },
];
