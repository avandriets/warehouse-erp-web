import { inject, InjectionToken } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup, Events, withEventHandlers } from '@ngrx/signals/events';
import type { RoleCreate, RoleRecord, RolesQuery, RoleUpdate } from '@warehouse/access-management/util';
import type { EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData } from '@warehouse/shared';
import { filter, map, tap } from 'rxjs';

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
  withEventHandlers(store => {
    const events = inject(Events);
    const snackBar = inject(MatSnackBar);
    const message = inject(ROLES_SUCCESS_MESSAGE);

    return {
      saved: events.on(rolesEvents.created, rolesEvents.updated).pipe(
        filter(
          ({ payload }) =>
            message !== null &&
            (!!store.createOperations()[payload.correlationId] ||
              Object.values(store.entityOperations()).some(
                operation => operation.correlationId === payload.correlationId,
              )),
        ),
        tap(() => snackBar.open(message!, 'Dismiss', { duration: 4000 })),
      ),
    };
  }),
);
