import type { SubmenuGroup, SubmenuItem } from '../types';

export const REPORTS_GROUPS: readonly SubmenuGroup[] = [
  {
    id: 'reports-inventory',
    primaryMenuId: 'reports',
    title: 'Inventory',
  },
];

export const REPORTS_LINKS: readonly SubmenuItem[] = [
  {
    id: 'stock-balances',
    submenuGroupId: 'reports-inventory',
    title: 'Stock balances',
    target: {
      route: '/reports/stock-balances',
    },
  },
];
