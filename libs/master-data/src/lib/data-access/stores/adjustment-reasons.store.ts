import { HttpErrorResponse } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { map } from 'rxjs';

import type {
  AdjustmentReason,
  AdjustmentReasonCreate,
  AdjustmentReasonsQuery,
  AdjustmentReasonUpdate,
} from '../../types';
import { AdjustmentReasonsApiService } from '../services';

export const ADJUSTMENT_REASON_UPDATE_MESSAGE = new InjectionToken<string>('Adjustment reason update notification', {
  factory: () => 'Adjustment reason saved.',
});

const events = eventGroup({
  source: 'AdjustmentReasons API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    retrieveFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<AdjustmentReason>>(),
    updated: type<EntityDataSuccess<AdjustmentReason>>(),
  },
});

export const AdjustmentReasonsStore = signalStore(
  withEntityData<AdjustmentReason, AdjustmentReasonCreate, AdjustmentReasonsQuery, AdjustmentReasonUpdate>({
    adapter: () => {
      const api = inject(AdjustmentReasonsApiService);

      return {
        load: query => api.list(query).pipe(map(({ items, total }) => ({ entities: items, pagination: { total } }))),
        getById: id => api.get(String(id)),
        create: payload => api.create({ ...payload, code: payload.code.trim(), name: payload.name.trim() }),
        update: (id, payload) =>
          api.update(String(id), { ...payload, ...(payload.name === undefined ? {} : { name: payload.name.trim() }) }),
      };
    },
    events,

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
  withEntityNotifications(events, () => ({
    created: 'Adjustment reason created.',
    updated: inject(ADJUSTMENT_REASON_UPDATE_MESSAGE),
  })),
);
