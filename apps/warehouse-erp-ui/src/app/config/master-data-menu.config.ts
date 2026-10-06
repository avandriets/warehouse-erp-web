import type { SubmenuGroup, SubmenuItem } from '../types';

export const MASTER_DATA_GROUPS: readonly SubmenuGroup[] = [
  {
    id: 'master-data-products',
    primaryMenuId: 'master-data',
    title: 'Products',
  },
  {
    id: 'master-data-warehouses',
    primaryMenuId: 'master-data',
    title: 'Warehouses',
  },
  {
    id: 'master-data-business',
    primaryMenuId: 'master-data',
    title: 'Business',
  },
  {
    id: 'master-data-accounting',
    primaryMenuId: 'master-data',
    title: 'Accounting',
  },
];

export const MASTER_DATA_LINKS: readonly SubmenuItem[] = [
  {
    id: 'products',
    submenuGroupId: 'master-data-products',
    title: 'Products',
    icon: 'inventory_2',
    target: {
      libraryId: 'master-data-library',
      path: 'products',
    },
  },
  {
    id: 'categories',
    submenuGroupId: 'master-data-products',
    title: 'Categories',
    icon: 'category',
    target: {
      route: '/master-data/categories',
    },
  },
  {
    id: 'units',
    submenuGroupId: 'master-data-products',
    title: 'Units of measurement',
    icon: 'straighten',
    target: {
      route: '/master-data/units',
    },
  },
  {
    id: 'warehouses',
    submenuGroupId: 'master-data-warehouses',
    title: 'Warehouses and locations',
    icon: 'warehouse',
    target: {
      libraryId: 'master-data-library',
      path: 'warehouses',
    },
  },
  {
    id: 'storage-analytics',
    submenuGroupId: 'master-data-warehouses',
    title: 'Storage analytics',
    icon: 'insights',
    description: 'Configure how stock is grouped for analysis.',
    target: {
      route: '/master-data/storage-analytics',
    },
  },
  {
    id: 'counterparties',
    submenuGroupId: 'master-data-business',
    title: 'Counterparties',
    icon: 'handshake',
    target: {
      route: '/master-data/counterparties',
    },
  },
  {
    id: 'price-types',
    submenuGroupId: 'master-data-business',
    title: 'Price types',
    icon: 'sell',
    description: 'Price categories for buying and selling.',
    target: {
      route: '/master-data/price-types',
    },
  },
  {
    id: 'operation-reasons',
    submenuGroupId: 'master-data-accounting',
    title: 'Write-off and adjustment reasons',
    icon: 'fact_check',
    description: 'Reasons for stock write-offs and corrections.',
    target: {
      route: '/master-data/operation-reasons',
    },
  },
  {
    id: 'vat-rates',
    submenuGroupId: 'master-data-accounting',
    title: 'VAT rates and treatments',
    icon: 'percent',
    description: 'Tax rates and VAT handling.',
    target: {
      route: '/master-data/vat-rates',
    },
  },
  {
    id: 'currencies',
    submenuGroupId: 'master-data-accounting',
    title: 'Currencies',
    icon: 'currency_exchange',
    target: {
      route: '/master-data/currencies',
    },
  },
];
