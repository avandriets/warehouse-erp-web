import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import type { CanActivateFn } from '@angular/router';

import { MASTER_DATA_CONFIG } from '../../config';

const permissionGuard: CanActivateFn = (route, state) => inject(MASTER_DATA_CONFIG).permissionGuard(route, state);

export const PRICE_TYPES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [permissionGuard],
    data: { permission: 'catalog.read' },
    loadComponent: () => import('./containers').then(m => m.PriceTypes),
  },
  {
    path: 'create',
    canActivate: [permissionGuard],
    data: { permission: 'catalog.create', mode: 'create' },
    loadComponent: () => import('./containers').then(m => m.PriceTypeEditor),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permission: 'catalog.edit', mode: 'edit' },
    loadComponent: () => import('./containers').then(m => m.PriceTypeEditor),
  },
];
