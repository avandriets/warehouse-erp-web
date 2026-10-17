import { inject, InjectionToken } from '@angular/core';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { RoleCreate, RoleRecord, RolesQuery, RoleUpdate } from '@warehouse/access-management/util';
import type { EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { map } from 'rxjs';

import { AccessManagementApiService } from '../services';

export const ROLES_SUCCESS_MESSAGE = new InjectionToken<string | null>('Roles success notification', {
  factory: () => null,
});

const rolesEvents = eventGroup({
  source: 'Roles API',
  events: { created: type<EntityDataSuccess<RoleRecord>>(), updated: type<EntityDataSuccess<RoleRecord>>() },
});

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
    events: rolesEvents,
    errorMessage: apiError,
    errors: {
      load: 'Could not load roles.',
      create: 'Could not create the role.',
      update: 'Could not update the role.',
      remove: 'Could not remove the role.',
    },
  }),
  withEntityNotifications(rolesEvents, () => {
    const message = inject(ROLES_SUCCESS_MESSAGE);

    return { created: message, updated: message };
  }),
);
