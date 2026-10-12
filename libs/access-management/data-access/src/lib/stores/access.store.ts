import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withMethods, withProps, withState } from '@ngrx/signals';
import { Dispatcher, eventGroup, Events, withEventHandlers } from '@ngrx/signals/events';
import type { PermissionRecord, RoleAssignmentCreate, RoleAssignmentRecord } from '@warehouse/access-management/util';
import type { CallOperation, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withCallState } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { defer, EMPTY, filter, Subject, take, takeUntil, tap } from 'rxjs';

import { AccessApiService } from '../services';
import type { AccessResourceKey, AccessState } from '../types';

const accessEvents = eventGroup({
  source: 'Access API',
  events: { saved: type<EntityDataSuccess<string>>() },
});

let notificationSequence = 0;

const initialState: AccessState = {
  permissions: { data: [], contextId: null },
  rolePermissions: { data: [], contextId: null },
  roleAssignments: { data: [], contextId: null },
};

export const AccessStore = signalStore(
  withState(initialState),
  withProps(() => ({ _notificationOwner: `access-store-${++notificationSequence}` })),
  withCallState({ collection: 'permissions' }),
  withCallState({ collection: 'rolePermissions' }),
  withCallState({ collection: 'roleAssignments' }),
  withMethods(store => {
    const api = inject(AccessApiService);
    const dispatcher = inject(Dispatcher);
    const destroyRef = inject(DestroyRef);
    const cancelled = {
      permissions: { load: new Subject<void>(), save: new Subject<void>() },
      rolePermissions: { load: new Subject<void>(), save: new Subject<void>() },
      roleAssignments: { load: new Subject<void>(), save: new Subject<void>() },
    };

    function run<T>(
      key: AccessResourceKey,
      operation: CallOperation,
      request: () => Observable<T>,
      accept: (result: T) => void,
      contextId?: string,
      successMessage?: string,
    ): Observable<T> {
      return defer(() => {
        if (contextId !== undefined && store[key]().contextId !== contextId) {
          cancelled[key].load.next();
          cancelled[key].save.next();
          store[`${key}ResetCallState`]();
          patchState(store, { [key]: { data: [], contextId } });
        }
        // Serialize writes for a resource; reads must not overwrite an in-flight mutation.
        if (store[`${key}Saving`]()) {
          return EMPTY;
        }

        cancelled[key].load.next();
        store[`${key}StartCall`](operation);

        return defer(request).pipe(
          take(1),
          tapResponse({
            next: result => {
              accept(result);
              store[`${key}CallSucceeded`](operation);
              if (successMessage) {
                dispatcher.dispatch(
                  accessEvents.saved({ correlationId: store._notificationOwner, data: successMessage }),
                );
              }
            },
            error: error => {
              store[`${key}CallFailed`](operation, apiError(error));
            },
            finalize: () => store[`${key}FinishCall`](operation),
          }),
          takeUntil(cancelled[key][operation]),
        );
      }).pipe(takeUntilDestroyed(destroyRef));
    }

    return {
      listPermissions(): Observable<PermissionRecord[]> {
        return run(
          'permissions',
          'load',
          () => api.listPermissions(),
          data => {
            patchState(store, state => ({ permissions: { ...state.permissions, data } }));
          },
        );
      },
      listRolePermissions(roleId: string): Observable<PermissionRecord[]> {
        return run(
          'rolePermissions',
          'load',
          () => api.listRolePermissions(roleId),
          data => {
            patchState(store, state => ({ rolePermissions: { ...state.rolePermissions, data } }));
          },
          roleId,
        );
      },
      replaceRolePermissions(roleId: string, codes: string[]): Observable<PermissionRecord[]> {
        return run(
          'rolePermissions',
          'save',
          () => api.replaceRolePermissions(roleId, codes),
          data => {
            patchState(store, state => ({
              rolePermissions: { ...state.rolePermissions, data },
            }));
            store.rolePermissionsSetLoaded();
          },
          roleId,
          'Changes saved.',
        );
      },
      listRoleAssignments(userId: string): Observable<RoleAssignmentRecord[]> {
        return run(
          'roleAssignments',
          'load',
          () => api.listRoleAssignments(userId),
          data => {
            patchState(store, state => ({ roleAssignments: { ...state.roleAssignments, data } }));
          },
          userId,
        );
      },
      assignRole(userId: string, payload: RoleAssignmentCreate): Observable<RoleAssignmentRecord> {
        return run(
          'roleAssignments',
          'save',
          () => api.assignRole(userId, payload),
          assignment => {
            patchState(store, state => ({
              roleAssignments: {
                ...state.roleAssignments,
                data: [...state.roleAssignments.data.filter(item => item.id !== assignment.id), assignment],
              },
            }));
          },
          userId,
          'Role assigned.',
        );
      },
      revokeRoleAssignment(userId: string, assignmentId: string): Observable<void> {
        return run(
          'roleAssignments',
          'save',
          () => api.revokeRoleAssignment(userId, assignmentId),
          () => {
            patchState(store, state => ({
              roleAssignments: {
                ...state.roleAssignments,
                data: state.roleAssignments.data.filter(item => item.id !== assignmentId),
              },
            }));
          },
          userId,
          'Role removed.',
        );
      },
      dismissActionError(): void {
        store.rolePermissionsDismissActionError();
        store.roleAssignmentsDismissActionError();
      },
      reset(): void {
        for (const requests of Object.values(cancelled)) {
          requests.load.next();
          requests.save.next();
        }
        store.permissionsResetCallState();
        store.rolePermissionsResetCallState();
        store.roleAssignmentsResetCallState();
        patchState(store, initialState);
      },
    };
  }),
  withEventHandlers(store => {
    const events = inject(Events);
    const snackBar = inject(MatSnackBar);

    return {
      saved: events.on(accessEvents.saved).pipe(
        filter(({ payload }) => payload.correlationId === store._notificationOwner),
        tap(({ payload }) => snackBar.open(payload.data, 'Dismiss', { duration: 4000 })),
      ),
    };
  }),
);
