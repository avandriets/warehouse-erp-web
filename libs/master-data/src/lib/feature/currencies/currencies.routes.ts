import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import type { CanActivateFn } from '@angular/router';

import { MASTER_DATA_CONFIG } from '../../config';

const permissionGuard: CanActivateFn = (route, state) => inject(MASTER_DATA_CONFIG).permissionGuard(route, state);

export const CURRENCIES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [permissionGuard],
    data: { permission: 'settings.read' },
    loadComponent: () => import('./containers').then(m => m.Currencies),
  },
  {
    path: 'create',
    canActivate: [permissionGuard],
    data: { permission: 'settings.manage', mode: 'create' },
    loadComponent: () => import('./containers').then(m => m.CurrencyEditor),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permission: 'settings.manage', mode: 'edit' },
    loadComponent: () => import('./containers').then(m => m.CurrencyEditor),
  },
];
