import { ACCESS_MANAGEMENT_PAGES, ACCESS_MANAGEMENT_ROUTES } from '@warehouse/access-management';

import type { NavigationSection } from '../types';

export const ACCESS_MANAGEMENT_SECTION = {
  path: '',
  children: ACCESS_MANAGEMENT_ROUTES,
};

const basePath = ACCESS_MANAGEMENT_SECTION.path ? `/${ACCESS_MANAGEMENT_SECTION.path}` : '';

export const ADMIN_NAVIGATION: readonly NavigationSection[] = [
  {
    id: 'access-management',
    title: 'Access management',
    icon: 'layers',
    children: [
      {
        path: `${basePath}/${ACCESS_MANAGEMENT_PAGES.users.path}`,
        exact: false,
        title: 'Users',
        icon: 'group',
        description: 'Employee accounts and ERP access',
        permission: 'users.manage',
      },
      {
        path: `${basePath}/${ACCESS_MANAGEMENT_PAGES.roles.path}`,
        exact: false,
        title: 'Roles and permissions',
        icon: 'admin_panel_settings',
        description: 'Permission sets for working in the system',
        permission: 'users.manage',
      },
    ],
  },
];
