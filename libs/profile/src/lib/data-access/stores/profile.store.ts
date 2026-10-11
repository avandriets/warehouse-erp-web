import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods } from '@ngrx/signals';
import type { CurrentUser, OwnProfileUpdate } from '@warehouse/auth';
import { apiError, withRequestData } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { defer, EMPTY } from 'rxjs';

import type { ProfileSaveRequest } from '../../types';
import { ProfileAdapterService } from '../services';

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
);
