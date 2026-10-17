import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import type { CanActivateFn } from '@angular/router';

import { MASTER_DATA_CONFIG } from '../../config';

const permissionGuard: CanActivateFn = (route, state) => inject(MASTER_DATA_CONFIG).permissionGuard(route, state);

export const WAREHOUSES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [permissionGuard],
    data: { permission: 'warehouse.read' },
    loadComponent: () => import('./containers').then(m => m.Warehouses),
  },
  {
    path: 'create',
    canActivate: [permissionGuard],
    data: { permission: 'warehouse.manage', mode: 'create' },
    loadComponent: () => import('./containers').then(m => m.WarehouseEditor),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permission: 'warehouse.manage', mode: 'edit' },
    loadComponent: () => import('./containers').then(m => m.WarehouseEditor),
  },
];
