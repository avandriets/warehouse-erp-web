import { ACCESS_MANAGEMENT_ROUTES } from '@warehouse/access-management';
import { permissionGuard } from '@warehouse/auth';

import type { LibraryMount } from '../types';

export const LIBRARY_MOUNTS: readonly LibraryMount[] = [
  {
    id: 'profile-library',
    path: 'profile',
    loadChildren: () => import('@warehouse/profile').then(module => module.PROFILE_ROUTES),
  },
  {
    id: 'administration-library',
    path: 'administration',
    loadChildren: () => [
      {
        path: 'settings',
        canActivate: [permissionGuard],
        canActivateChild: [permissionGuard],
        data: { permission: 'settings.manage' },
        loadChildren: () => import('@warehouse/admin-settings').then(module => module.SETTINGS_ROUTES),
      },
      {
        path: '',
        canActivate: [permissionGuard],
        canActivateChild: [permissionGuard],
        data: { permission: 'users.manage' },
        children: ACCESS_MANAGEMENT_ROUTES,
      },
    ],
  },
  {
    id: 'master-data-library',
    path: 'master-data',
    loadChildren: () => import('@warehouse/master-data').then(module => module.MASTER_DATA_ROUTES),
  },
];
