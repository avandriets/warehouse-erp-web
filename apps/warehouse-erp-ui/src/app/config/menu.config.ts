import type { MenuConfig } from '../types';
import {
  DOCUMENTS_GROUPS,
  DOCUMENTS_LINKS,
  MASTER_DATA_GROUPS,
  MASTER_DATA_LINKS,
  REPORTS_GROUPS,
  REPORTS_LINKS,
} from './index';

export const MENU_CONFIG: MenuConfig = {
  primaryMenu: [
    { id: 'master-data', title: 'Master data', icon: 'category', sidebarTitle: 'Master data', route: '/master-data' },
    { id: 'documents', title: 'Documents', icon: 'description', sidebarTitle: 'Documents', route: '/documents' },
    { id: 'reports', title: 'Reports', icon: 'bar_chart', sidebarTitle: 'Reports', route: '/reports' },
  ],
  submenuGroups: [...MASTER_DATA_GROUPS, ...DOCUMENTS_GROUPS, ...REPORTS_GROUPS],
  submenuItems: [...MASTER_DATA_LINKS, ...DOCUMENTS_LINKS, ...REPORTS_LINKS],
};
