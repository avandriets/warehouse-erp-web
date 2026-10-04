import type { SubmenuGroup, SubmenuItem } from '../types';

export const DOCUMENTS_GROUPS: readonly SubmenuGroup[] = [
  {
    id: 'documents-stock-operations',
    primaryMenuId: 'documents',
    title: 'Stock operations',
  },
  {
    id: 'documents-planning',
    primaryMenuId: 'documents',
    title: 'Planning',
  },
  {
    id: 'documents-prices',
    primaryMenuId: 'documents',
    title: 'Prices',
  },
];

export const DOCUMENTS_LINKS: readonly SubmenuItem[] = [
  {
    id: 'initial-receipts',
    submenuGroupId: 'documents-stock-operations',
    title: 'Opening stock',
    target: {
      route: '/documents/initial-receipts',
    },
  },
  {
    id: 'goods-receipts',
    submenuGroupId: 'documents-stock-operations',
    title: 'Goods receipts',
    target: {
      route: '/documents/goods-receipts',
    },
  },
  {
    id: 'goods-issues',
    submenuGroupId: 'documents-stock-operations',
    title: 'Goods issues',
    target: {
      route: '/documents/goods-issues',
    },
  },
  {
    id: 'stock-transfers',
    submenuGroupId: 'documents-stock-operations',
    title: 'Stock transfers',
    target: {
      route: '/documents/stock-transfers',
    },
  },
  {
    id: 'stock-adjustments',
    submenuGroupId: 'documents-stock-operations',
    title: 'Stock adjustments',
    target: {
      route: '/documents/stock-adjustments',
    },
  },
  {
    id: 'inventory-counts',
    submenuGroupId: 'documents-stock-operations',
    title: 'Inventory counts',
    target: {
      route: '/documents/inventory-counts',
    },
  },
  {
    id: 'inbound-orders',
    submenuGroupId: 'documents-planning',
    title: 'Inbound orders',
    target: {
      route: '/documents/inbound-orders',
    },
  },
  {
    id: 'outbound-orders',
    submenuGroupId: 'documents-planning',
    title: 'Outbound orders',
    target: {
      route: '/documents/outbound-orders',
    },
  },
  {
    id: 'price-settings',
    submenuGroupId: 'documents-prices',
    title: 'Price setting',
    target: {
      route: '/documents/price-settings',
    },
  },
];
