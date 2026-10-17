import type { Routes } from '@angular/router';

export const MASTER_DATA_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'operation-reasons',
        loadChildren: () => import('./feature/adjustment-reasons').then(m => m.ADJUSTMENT_REASONS_ROUTES),
      },
      { path: 'price-types', loadChildren: () => import('./feature/price-types').then(m => m.PRICE_TYPES_ROUTES) },
      { path: 'currencies', loadChildren: () => import('./feature/currencies').then(m => m.CURRENCIES_ROUTES) },
      { path: 'vat-rates', loadChildren: () => import('./feature/vat-rates').then(m => m.VAT_RATES_ROUTES) },
      {
        path: 'counterparties',
        loadChildren: () => import('./feature/counterparties').then(m => m.COUNTERPARTIES_ROUTES),
      },
      { path: 'categories', loadChildren: () => import('./feature/categories').then(m => m.CATEGORIES_ROUTES) },
      { path: 'units', loadChildren: () => import('./feature/units').then(m => m.UNITS_ROUTES) },
      { path: 'products', loadChildren: () => import('./feature/products').then(m => m.PRODUCTS_ROUTES) },
      { path: 'warehouses', loadChildren: () => import('./feature/warehouses').then(m => m.WAREHOUSES_ROUTES) },
    ],
  },
];
