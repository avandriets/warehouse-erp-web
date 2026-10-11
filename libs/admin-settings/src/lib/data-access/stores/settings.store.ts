import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { apiError, withRequestData } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { defer, EMPTY, finalize } from 'rxjs';

import type { SettingsSaveRequest, SettingsSnapshot, SettingsUpdate } from '../../types';
import { SettingsAdapterService } from '../services';

function settingsError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 409) {
    return `${apiError(error)} Your entries have been kept. Reload settings to read the latest version; reloading discards unsaved changes.`;
  }

  return error instanceof Error && !(error instanceof HttpErrorResponse) ? error.message : apiError(error);
}

export const SettingsStore = signalStore(
  withState({ savingSection: null as string | null }),
  withRequestData<SettingsSnapshot, void, SettingsSaveRequest>({
    adapter: () => {
      const adapter = inject(SettingsAdapterService);

      return { load: () => adapter.load(), save: request => adapter.save(request) };
    },
    error: 'Could not load settings.',
    saveError: 'Could not save settings.',
    errorMessage: settingsError,
    concurrency: 'exhaust',
  }),
  withComputed(store => ({
    state: computed(() => ({
      ...store.requestState(),
      pending: store.loading() || store.saving(),
      savingSection: store.savingSection(),
    })),
    globalNegative: computed(() =>
      store.data()?.negative.find(value => value.scope_type === 'GLOBAL' && value.scope_id === null),
    ),
    scopedNegative: computed(
      () => store.data()?.negative.some(value => value.scope_type !== 'GLOBAL' && value.value) ?? false,
    ),
    negativeStockEnabled: computed(() => store.data()?.negative.some(value => value.value) ?? false),
  })),
  withMethods(store => ({
    reload(): Observable<SettingsSnapshot> {
      return defer(() => {
        if (store.state().pending) {
          return EMPTY;
        }

        store.dismissActionError();

        return store.load();
      });
    },
    update(update: SettingsUpdate): Observable<SettingsSnapshot> {
      return defer(() => {
        const snapshot = store.data();
        if (!snapshot || store.state().pending) {
          return EMPTY;
        }

        patchState(store, {
          savingSection: update.section === 'numbering' ? update.documentType : update.section,
        });

        return store.save({ snapshot, update }).pipe(finalize(() => patchState(store, { savingSection: null })));
      });
    },
  })),
);
