import { HttpErrorResponse } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { map } from 'rxjs';

import type { PriceType, PriceTypeCreate, PriceTypesQuery, PriceTypeUpdate } from '../../types';
import { PriceTypesApiService } from '../services';

export const PRICE_TYPE_UPDATE_MESSAGE = new InjectionToken<string>('Price type update notification', {
  factory: () => 'Price type saved.',
});

const events = eventGroup({
  source: 'PriceTypes API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    retrieveFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<PriceType>>(),
    updated: type<EntityDataSuccess<PriceType>>(),
  },
});

export const PriceTypesStore = signalStore(
  withEntityData<PriceType, PriceTypeCreate, PriceTypesQuery, PriceTypeUpdate>({
    adapter: () => {
      const api = inject(PriceTypesApiService);

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
  withEntityNotifications(events, () => ({
    created: 'Price type created.',
    updated: inject(PRICE_TYPE_UPDATE_MESSAGE),
  })),
);
