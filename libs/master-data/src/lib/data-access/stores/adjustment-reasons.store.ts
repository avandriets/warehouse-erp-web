import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { signalStore } from '@ngrx/signals';
import { apiError, withEntityData } from '@warehouse/shared';

import type {
  AdjustmentReason,
  AdjustmentReasonCreate,
  AdjustmentReasonsQuery,
  AdjustmentReasonUpdate,
} from '../../types';
import { AdjustmentReasonsAdapterService } from '../services';

export const AdjustmentReasonsStore = signalStore(
  withEntityData<AdjustmentReason, AdjustmentReasonCreate, AdjustmentReasonsQuery, AdjustmentReasonUpdate>({
    adapter: () => {
      const adapter = inject(AdjustmentReasonsAdapterService);

      return {
        load: query => adapter.load(query),
        getById: id => adapter.getById(id),
        create: payload => adapter.create(payload),
        update: (id, payload) => adapter.update(id, payload),
      };
    },
    errorMessage: error =>
      error instanceof HttpErrorResponse && error.status === 409
        ? `${apiError(error)} Your entries have been kept. Reload to get the latest version; reloading discards unsaved changes.`
        : apiError(error),
    errors: {
      load: 'Could not load adjustment reasons.',
      getById: 'Could not load the adjustment reason.',
      create: 'Could not create the adjustment reason.',
      update: 'Could not update the adjustment reason.',
      remove: 'Could not archive the adjustment reason.',
    },
  }),
);
