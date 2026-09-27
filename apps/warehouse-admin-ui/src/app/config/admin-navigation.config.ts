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
    iconPath: 'm12 3 9 5-9 5-9-5 9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',
    children: [
      {
        path: `${basePath}/${ACCESS_MANAGEMENT_PAGES.users.path}`,
        exact: false,
        title: 'Users',
        iconPath:
          'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
        description: 'Employee accounts and ERP access',
        permission: 'users.manage',
      },
      {
        path: `${basePath}/${ACCESS_MANAGEMENT_PAGES.roles.path}`,
        exact: false,
        title: 'Roles and permissions',
        iconPath: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4',
        description: 'Permission sets for working in the system',
        permission: 'users.manage',
      },
    ],
  },
];
