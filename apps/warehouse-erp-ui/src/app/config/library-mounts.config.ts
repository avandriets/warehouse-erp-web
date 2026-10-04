import { ACCESS_MANAGEMENT_ROUTES } from '@warehouse/access-management';

import type { LibraryMount } from '../types';

export const LIBRARY_MOUNTS: readonly LibraryMount[] = [
  {
    id: 'access-management-library',
    path: 'administration',
    permission: 'users.manage',
    loadChildren: () => ACCESS_MANAGEMENT_ROUTES,
  },
  {
    id: 'master-data-library',
    path: 'master-data',
    loadChildren: () => import('@warehouse/master-data').then(module => module.MASTER_DATA_ROUTES),
  },
];
