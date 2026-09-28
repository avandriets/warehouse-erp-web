import { inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import type { UserRecord, UsersQuery, UserUpdateCommand, UserWrite } from '@warehouse/access-management/util';
import { apiError, withEntityData } from '@warehouse/shared';
import { map } from 'rxjs';

import { AccessManagementApiService } from '../services';

export const UsersStore = signalStore(
  withEntityData<UserRecord, UserWrite, UsersQuery, UserUpdateCommand>({
    adapter: () => {
      const api = inject(AccessManagementApiService);

      return {
        load: params =>
          api.listUsers(params.limit, params.offset, params.status, params.q).pipe(map(entities => ({ entities }))),
        create: payload => api.createUser(payload),
        update: (id, payload) =>
          'status' in payload
            ? payload.status === 'ACTIVE'
              ? api.activateUser(String(id))
              : api.suspendUser(String(id))
            : 'auth0_subject' in payload
              ? api.linkAuth0(String(id), payload.auth0_subject as string)
              : api.updateUser(String(id), payload),
      };
    },
    errorMessage: apiError,
    errors: {
      load: 'Could not load users.',
      create: 'Could not create the user.',
      update: 'Could not update the user.',
      remove: 'Could not remove the user.',
    },
  }),
);
