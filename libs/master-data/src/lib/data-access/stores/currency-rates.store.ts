import { computed, inject } from '@angular/core';
import { signalStore, withComputed } from '@ngrx/signals';
import { apiError, withRequestData } from '@warehouse/shared';

import type { CurrencyRatesOverview, CurrencyRatesUpdate } from '../../types';
import { CurrencyRatesAdapterService } from '../services';

export const CurrencyRatesStore = signalStore(
  withRequestData<CurrencyRatesOverview, void, CurrencyRatesUpdate>({
    adapter: () => {
      const adapter = inject(CurrencyRatesAdapterService);

      return { load: () => adapter.load(), save: update => adapter.save(update) };
    },
    error: 'Could not load accounting currency and saved rates.',
    saveError: 'Could not update accounting currency or exchange rates.',
    errorMessage: apiError,
    concurrency: 'exhaust',
  }),
  withComputed(store => ({
    state: computed(() => ({ ...store.requestState(), pending: store.loading() || store.saving() })),
  })),
);
