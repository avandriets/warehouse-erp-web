import { computed, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signalStore, type, withComputed } from '@ngrx/signals';
import { eventGroup, Events, withEventHandlers } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withRequestData } from '@warehouse/shared';
import { filter, tap } from 'rxjs';

import type { CurrencyRatesOverview, CurrencyRatesUpdate } from '../../types';
import { CurrenciesApiService } from '../services';

const events = eventGroup({
  source: 'Currency rates API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    saveFailed: type<EntityDataFailure>(),
    saved: type<EntityDataSuccess<CurrencyRatesOverview>>(),
  },
});

export const CurrencyRatesStore = signalStore(
  withRequestData<CurrencyRatesOverview, void, CurrencyRatesUpdate>({
    adapter: () => {
      const api = inject(CurrenciesApiService);

      return {
        load: () => api.rates(),
        save: update => api.loadRates(update.base_currency_id),
      };
    },
    error: 'Could not load accounting currency and saved rates.',
    saveError: 'Could not update accounting currency or exchange rates.',
    errorMessage: apiError,
    concurrency: 'exhaust',
    events,
  }),
  withComputed(store => ({
    state: computed(() => ({ ...store.requestState(), pending: store.loading() || store.saving() })),
  })),
  withEventHandlers(store => {
    const source = inject(Events);
    const snack = inject(MatSnackBar);
    const owns = (correlationId: string): boolean =>
      !!store.operations()[correlationId] || store.saveCorrelationId() === correlationId;

    return {
      errors: source.on(events.loadFailed, events.saveFailed).pipe(
        filter(({ payload }) => owns(payload.correlationId)),
        tap(({ payload }) => snack.open(payload.message, 'Dismiss', { duration: 6000 })),
      ),
      saved: source.on(events.saved).pipe(
        filter(({ payload }) => owns(payload.correlationId)),
        tap(() => snack.open('Exchange rates loaded.', 'Dismiss', { duration: 4000 })),
      ),
    };
  }),
);
