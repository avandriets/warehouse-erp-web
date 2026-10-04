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
    target: {
      libraryId: 'master-data-library',
      path: 'products',
    },
  },
  {
    id: 'categories',
    submenuGroupId: 'master-data-products',
    title: 'Categories',
    target: {
      route: '/master-data/categories',
    },
  },
  {
    id: 'units',
    submenuGroupId: 'master-data-products',
    title: 'Units of measurement',
    target: {
      route: '/master-data/units',
    },
  },
  {
    id: 'warehouses',
    submenuGroupId: 'master-data-warehouses',
    title: 'Warehouses and locations',
    target: {
      libraryId: 'master-data-library',
      path: 'warehouses',
    },
  },
  {
    id: 'storage-analytics',
    submenuGroupId: 'master-data-warehouses',
    title: 'Storage analytics',
    target: {
      route: '/master-data/storage-analytics',
    },
  },
  {
    id: 'counterparties',
    submenuGroupId: 'master-data-business',
    title: 'Counterparties',
    target: {
      route: '/master-data/counterparties',
    },
  },
  {
    id: 'price-types',
    submenuGroupId: 'master-data-business',
    title: 'Price types',
    target: {
      route: '/master-data/price-types',
    },
  },
  {
    id: 'operation-reasons',
    submenuGroupId: 'master-data-accounting',
    title: 'Write-off and adjustment reasons',
    target: {
      route: '/master-data/operation-reasons',
    },
  },
  {
    id: 'vat-rates',
    submenuGroupId: 'master-data-accounting',
    title: 'VAT rates and treatments',
    target: {
      route: '/master-data/vat-rates',
    },
  },
  {
    id: 'currencies',
    submenuGroupId: 'master-data-accounting',
    title: 'Currencies',
    target: {
      route: '/master-data/currencies',
    },
  },
];
