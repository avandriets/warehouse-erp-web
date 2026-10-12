import { computed, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import { eventGroup, Events, withEventHandlers } from '@ngrx/signals/events';
import type { CurrentUser, OwnProfileUpdate } from '@warehouse/auth';
import type { EntityDataSuccess } from '@warehouse/shared';
import { apiError, withRequestData } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { defer, EMPTY, filter, tap } from 'rxjs';

import type { ProfileSaveRequest } from '../../types';
import { ProfileAdapterService } from '../services';

const profileEvents = eventGroup({ source: 'Profile API', events: { saved: type<EntityDataSuccess<CurrentUser>>() } });

export const ProfileStore = signalStore(
  withRequestData<CurrentUser, void, ProfileSaveRequest>({
    adapter: () => {
      const adapter = inject(ProfileAdapterService);

      return { load: () => adapter.load(), save: request => adapter.save(request) };
    },
    error: 'Could not load profile.',
    saveError: 'Could not save profile.',
    errorMessage: apiError,
    concurrency: 'exhaust',
    events: profileEvents,
  }),
  withComputed(store => ({
    state: computed(() => ({
      ...store.requestState(),
      pending: store.loading() || store.saving(),
      saving: store.saving(),
    })),
  })),
  withMethods(store => ({
    reload(): Observable<CurrentUser> {
      return defer(() => {
        if (store.state().pending) {
          return EMPTY;
        }

        store.dismissActionError();

        return store.load();
      });
    },
    update(values: OwnProfileUpdate): Observable<CurrentUser> {
      return defer(() => {
        const snapshot = store.data();
        if (!snapshot || store.state().pending) {
          return EMPTY;
        }

        return store.save({ snapshot, values });
      });
    },
  })),
  withEventHandlers(store => {
    const events = inject(Events);
    const snackBar = inject(MatSnackBar);

    return {
      saved: events.on(profileEvents.saved).pipe(
        filter(({ payload }) => store.saveCorrelationId() === payload.correlationId),
        tap(() => snackBar.open('Profile saved.', 'Dismiss', { duration: 4000 })),
      ),
    };
  }),
);
