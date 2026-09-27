import { inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import type { RoleCreate, RoleRecord, RoleUpdate } from '@warehouse/access-management/util';
import { withEntityData } from '@warehouse/shared';
import { map } from 'rxjs';

import { accessManagementError } from '../api-error';
import { AccessManagementApiService } from '../services';

export const RolesStore = signalStore(
  withEntityData<RoleRecord, RoleCreate, boolean | undefined, RoleUpdate>({
    adapter: () => {
      const api = inject(AccessManagementApiService);
      return {
        load: active => api.listRoles(active).pipe(map(entities => ({ entities }))),
        create: payload => api.createRole(payload),
        update: (id, payload) => api.updateRole(String(id), payload),
      };
    },
    errorMessage: accessManagementError,
    errors: {
      load: 'Could not load roles.',
      create: 'Could not create the role.',
      update: 'Could not update the role.',
      remove: 'Could not remove the role.',
    },
  }),
);
