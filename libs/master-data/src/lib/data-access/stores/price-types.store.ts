import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import { apiError, withEntityData } from '@warehouse/shared';

import type { PriceType, PriceTypeCreate, PriceTypesQuery, PriceTypeUpdate } from '../../types';
import { PriceTypesAdapterService } from '../services';

export const PriceTypesStore = signalStore(
  withEntityData<PriceType, PriceTypeCreate, PriceTypesQuery, PriceTypeUpdate>({
    adapter: () => {
      const adapter = inject(PriceTypesAdapterService);

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
      load: 'Could not load price types.',
      getById: 'Could not load the price type.',
      create: 'Could not create the price type.',
      update: 'Could not update the price type.',
      remove: 'Could not archive the price type.',
    },
  }),
);
