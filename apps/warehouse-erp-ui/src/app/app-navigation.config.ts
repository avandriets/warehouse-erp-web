import type { NavigationGroup, NavigationSection } from './types';

const MASTER_DATA_GROUPS: readonly NavigationGroup[] = [
  {
    title: 'Products',
    items: [
      {
        id: 'products',
        title: 'Products',
        route: '/master-data/products',
      },
      {
        id: 'categories',
        title: 'Categories',
        route: '/master-data/categories',
      },
      {
        id: 'units',
        title: 'Units of measurement',
        route: '/master-data/units',
      },
    ],
  },
  {
    title: 'Warehouses',
    items: [
      {
        id: 'warehouses',
        title: 'Warehouses and locations',
        route: '/master-data/warehouses',
      },
      {
        id: 'storage-analytics',
        title: 'Storage analytics',
        route: '/master-data/storage-analytics',
      },
    ],
  },
  {
    title: 'Business',
    items: [
      {
        id: 'counterparties',
        title: 'Counterparties',
        route: '/master-data/counterparties',
      },
      {
        id: 'price-types',
        title: 'Price types',
        route: '/master-data/price-types',
      },
    ],
  },
  {
    title: 'Accounting',
    items: [
      {
        id: 'operation-reasons',
        title: 'Write-off and adjustment reasons',
        route: '/master-data/operation-reasons',
      },
      {
        id: 'vat-rates',
        title: 'VAT rates and treatments',
        route: '/master-data/vat-rates',
      },
      {
        id: 'currencies',
        title: 'Currencies',
        route: '/master-data/currencies',
      },
    ],
  },
];

const DOCUMENT_GROUPS: readonly NavigationGroup[] = [
  {
    title: 'Stock operations',
    items: [
      {
        id: 'initial-receipts',
        title: 'Opening stock',
        route: '/documents/initial-receipts',
      },
      {
        id: 'goods-receipts',
        title: 'Goods receipts',
        route: '/documents/goods-receipts',
      },
      {
        id: 'goods-issues',
        title: 'Goods issues',
        route: '/documents/goods-issues',
      },
      {
        id: 'stock-transfers',
        title: 'Stock transfers',
        route: '/documents/stock-transfers',
      },
      {
        id: 'stock-adjustments',
        title: 'Stock adjustments',
        route: '/documents/stock-adjustments',
      },
      {
        id: 'inventory-counts',
        title: 'Inventory counts',
        route: '/documents/inventory-counts',
      },
    ],
  },
  {
    title: 'Planning',
    items: [
      {
        id: 'inbound-orders',
        title: 'Inbound orders',
        route: '/documents/inbound-orders',
      },
      {
        id: 'outbound-orders',
        title: 'Outbound orders',
        route: '/documents/outbound-orders',
      },
    ],
  },
  {
    title: 'Prices',
    items: [
      {
        id: 'price-settings',
        title: 'Price setting',
        route: '/documents/price-settings',
      },
    ],
  },
];

const REPORT_GROUPS: readonly NavigationGroup[] = [
  {
    title: 'Inventory',
    items: [
      {
        id: 'stock-balances',
        title: 'Stock balances',
        route: '/reports/stock-balances',
      },
    ],
  },
];

export const APP_NAVIGATION: readonly NavigationSection[] = [
  {
    id: 'master-data',
    title: 'Master data',
    icon: 'category',
    sidebarTitle: 'Master data',
    route: '/master-data',
    groups: MASTER_DATA_GROUPS,
  },
  {
    id: 'documents',
    title: 'Documents',
    icon: 'description',
    sidebarTitle: 'Documents',
    route: '/documents',
    groups: DOCUMENT_GROUPS,
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: 'bar_chart',
    sidebarTitle: 'Reports',
    route: '/reports',
    groups: REPORT_GROUPS,
  },
];
