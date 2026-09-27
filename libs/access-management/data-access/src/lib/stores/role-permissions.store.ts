import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import type { RolePermissionsData } from '@warehouse/access-management/util';
import { withMutation, withRequestData } from '@warehouse/shared';
import { forkJoin } from 'rxjs';

import { accessManagementError } from '../api-error';
import { AccessManagementApiService } from '../services';

export const RolePermissionsStore = signalStore(
  withRequestData<RolePermissionsData, string>({
    adapter: () => {
      const api = inject(AccessManagementApiService);
      return {
        load: id =>
          forkJoin({
            permissions: api.listPermissions(),
            assigned: api.listRolePermissions(id),
          }),
      };
    },
    error: 'Could not load role permissions.',
    errorMessage: accessManagementError,
  }),
  withMutation(accessManagementError),
  withComputed(store => ({ permissions: computed(() => store.data()?.permissions ?? []) })),
);
