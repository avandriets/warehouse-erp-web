import type { LibraryMount } from '../types';

export const LIBRARY_MOUNTS: readonly LibraryMount[] = [
  {
    id: 'master-data-library',
    path: 'master-data',
    loadChildren: () => import('@warehouse/master-data').then(module => module.MASTER_DATA_ROUTES),
  },
];
