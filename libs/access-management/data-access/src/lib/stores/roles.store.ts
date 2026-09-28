import { inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import type { RoleCreate, RoleRecord, RolesQuery, RoleUpdate } from '@warehouse/access-management/util';
import { apiError, withEntityData } from '@warehouse/shared';
import { map } from 'rxjs';

import { AccessManagementApiService } from '../services';

export const RolesStore = signalStore(
  withEntityData<RoleRecord, RoleCreate, RolesQuery | undefined, RoleUpdate>({
    adapter: () => {
      const api = inject(AccessManagementApiService);

      return {
        load: params => api.listRoles(params?.active, params?.q).pipe(map(entities => ({ entities }))),
        create: payload => api.createRole(payload),
        update: (id, payload) => api.updateRole(String(id), payload),
      };
    },
    errorMessage: apiError,
    errors: {
      load: 'Could not load roles.',
      create: 'Could not create the role.',
      update: 'Could not update the role.',
      remove: 'Could not remove the role.',
    },
  }),
);
