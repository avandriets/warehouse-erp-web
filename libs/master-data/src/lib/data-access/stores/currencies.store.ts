import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import { apiError, withEntityData } from '@warehouse/shared';

import type { CurrenciesQuery, Currency, CurrencyCreate, CurrencyUpdate } from '../../types';
import { CurrenciesAdapterService } from '../services';

export const CurrenciesStore = signalStore(
  withEntityData<Currency, CurrencyCreate, CurrenciesQuery, CurrencyUpdate>({
    adapter: () => {
      const adapter = inject(CurrenciesAdapterService);

      return {
        load: query => adapter.load(query),
        getById: id => adapter.getById(id),
        create: payload => adapter.create(payload),
        update: (id, payload) => adapter.update(id, payload),
      };
    },
    errorMessage: error =>
      error instanceof HttpErrorResponse && error.status === 409 && /concurrent|version/i.test(apiError(error))
        ? `${apiError(error)} Your entries have been kept. Reload to get the latest version; reloading discards unsaved changes.`
        : apiError(error),
    errors: {
      load: 'Could not load currencies.',
      getById: 'Could not load the currency.',
      create: 'Could not create the currency.',
      update: 'Could not update the currency.',
      remove: 'Could not archive the currency.',
    },
  }),
);
