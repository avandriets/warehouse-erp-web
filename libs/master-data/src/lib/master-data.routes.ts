import type { Routes } from '@angular/router';

import { ProductStoreService, WarehouseStoreService } from './data-access/services';

export const MASTER_DATA_ROUTES: Routes = [
  {
    path: '',
    providers: [ProductStoreService, WarehouseStoreService],
    children: [
      {
        path: 'operation-reasons',
        loadChildren: () => import('./feature/adjustment-reasons').then(m => m.ADJUSTMENT_REASONS_ROUTES),
      },
      { path: 'price-types', loadChildren: () => import('./feature/price-types').then(m => m.PRICE_TYPES_ROUTES) },
      { path: 'currencies', loadChildren: () => import('./feature/currencies').then(m => m.CURRENCIES_ROUTES) },
      { path: 'products', loadChildren: () => import('./feature/products').then(m => m.PRODUCTS_ROUTES) },
      { path: 'warehouses', loadChildren: () => import('./feature/warehouses').then(m => m.WAREHOUSES_ROUTES) },
    ],
  },
];
