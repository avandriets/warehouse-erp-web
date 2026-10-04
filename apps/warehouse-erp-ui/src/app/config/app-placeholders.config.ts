import type { PlaceholderPage } from '../types';

// Temporary shell pages for features that have not been implemented yet.
export const PLACEHOLDER_PAGES: readonly PlaceholderPage[] = [
  {
    path: 'master-data/categories',
    title: 'Categories',
    primaryMenuRoute: '/master-data',
  },
  {
    path: 'master-data/units',
    title: 'Units of measurement',
    primaryMenuRoute: '/master-data',
  },
  {
    path: 'master-data/storage-analytics',
    title: 'Storage analytics',
    primaryMenuRoute: '/master-data',
  },
  {
    path: 'master-data/counterparties',
    title: 'Counterparties',
    primaryMenuRoute: '/master-data',
  },
  {
    path: 'master-data/price-types',
    title: 'Price types',
    primaryMenuRoute: '/master-data',
  },
  {
    path: 'master-data/operation-reasons',
    title: 'Write-off and adjustment reasons',
    primaryMenuRoute: '/master-data',
  },
  {
    path: 'master-data/vat-rates',
    title: 'VAT rates and treatments',
    primaryMenuRoute: '/master-data',
  },
  {
    path: 'master-data/currencies',
    title: 'Currencies',
    primaryMenuRoute: '/master-data',
  },
  {
    path: 'documents/initial-receipts',
    title: 'Opening stock',
    primaryMenuRoute: '/documents',
  },
  {
    path: 'documents/goods-receipts',
    title: 'Goods receipts',
    primaryMenuRoute: '/documents',
  },
  {
    path: 'documents/goods-issues',
    title: 'Goods issues',
    primaryMenuRoute: '/documents',
  },
  {
    path: 'documents/stock-transfers',
    title: 'Stock transfers',
    primaryMenuRoute: '/documents',
  },
  {
    path: 'documents/stock-adjustments',
    title: 'Stock adjustments',
    primaryMenuRoute: '/documents',
  },
  {
    path: 'documents/inventory-counts',
    title: 'Inventory counts',
    primaryMenuRoute: '/documents',
  },
  {
    path: 'documents/inbound-orders',
    title: 'Inbound orders',
    primaryMenuRoute: '/documents',
  },
  {
    path: 'documents/outbound-orders',
    title: 'Outbound orders',
    primaryMenuRoute: '/documents',
  },
  {
    path: 'documents/price-settings',
    title: 'Price setting',
    primaryMenuRoute: '/documents',
  },
  {
    path: 'reports/stock-balances',
    title: 'Stock balances',
    primaryMenuRoute: '/reports',
  },
];
