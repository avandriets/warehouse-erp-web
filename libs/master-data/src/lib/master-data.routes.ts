import type { Routes } from '@angular/router';

import { ProductStoreService, WarehouseStoreService } from './data-access/services';

export const MASTER_DATA_ROUTES: Routes = [
  {
    path: '',
    providers: [ProductStoreService, WarehouseStoreService],
    children: [
      { path: 'products', loadChildren: () => import('./feature/products').then(m => m.PRODUCTS_ROUTES) },
      { path: 'warehouses', loadChildren: () => import('./feature/warehouses').then(m => m.WAREHOUSES_ROUTES) },
    ],
  },
];
