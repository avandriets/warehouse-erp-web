import { inject, InjectionToken } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup, Events, withEventHandlers } from '@ngrx/signals/events';
import type { UserRecord, UsersQuery, UserUpdateCommand, UserWrite } from '@warehouse/access-management/util';
import type { EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData } from '@warehouse/shared';
import { filter, map, tap } from 'rxjs';

import { AccessManagementApiService } from '../services';

export const USERS_SUCCESS_MESSAGE = new InjectionToken<string | null>('Users success notification', {
  factory: () => null,
});

const usersEvents = eventGroup({
  source: 'Users API',
  events: { created: type<EntityDataSuccess<UserRecord>>(), updated: type<EntityDataSuccess<UserRecord>>() },
});

export const UsersStore = signalStore(
  withEntityData<UserRecord, UserWrite, UsersQuery, UserUpdateCommand>({
    adapter: () => {
      const api = inject(AccessManagementApiService);

      return {
        load: params =>
          api
            .listUsers(params.limit, params.offset, params.status, params.q)
            .pipe(map(page => ({ entities: page.items, pagination: { total: page.total } }))),
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
    events: usersEvents,
    errorMessage: apiError,
    errors: {
      load: 'Could not load users.',
      create: 'Could not create the user.',
      update: 'Could not update the user.',
      remove: 'Could not remove the user.',
    },
  }),
  withEventHandlers(store => {
    const events = inject(Events);
    const snackBar = inject(MatSnackBar);
    const message = inject(USERS_SUCCESS_MESSAGE);

    return {
      saved: events.on(usersEvents.created, usersEvents.updated).pipe(
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
