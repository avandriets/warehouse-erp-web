import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import type { UserAccessData } from '@warehouse/access-management/util';
import { withMutation, withRequestData } from '@warehouse/shared';
import { forkJoin } from 'rxjs';

import { accessManagementError } from '../api-error';
import { AccessManagementApiService } from '../services';

export const UserAccessStore = signalStore(
  withRequestData<UserAccessData, string>({
    adapter: () => {
      const api = inject(AccessManagementApiService);
      return {
        load: id => forkJoin({ roles: api.listRoles(), assignments: api.listRoleAssignments(id) }),
      };
    },
    error: 'Could not load user access.',
    errorMessage: accessManagementError,
  }),
  withMutation(accessManagementError),
  withComputed(store => ({
    roles: computed(() => store.data()?.roles ?? []),
    assignments: computed(() => store.data()?.assignments ?? []),
  })),
);
