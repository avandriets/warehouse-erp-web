import { inject, InjectionToken } from '@angular/core';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { map } from 'rxjs';

import type { VatRate, VatRateCreate, VatRatesQuery, VatRateUpdate } from '../../types';
import { VatRatesApiService } from '../services';

export const VAT_RATE_UPDATE_MESSAGE = new InjectionToken<string>('VAT rate update notification', {
  factory: () => 'VAT rate saved.',
});

const vatRatesEvents = eventGroup({
  source: 'VAT Rates API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    retrieveFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<VatRate>>(),
    updated: type<EntityDataSuccess<VatRate>>(),
  },
});

export const VatRatesStore = signalStore(
  withEntityData<VatRate, VatRateCreate, VatRatesQuery, VatRateUpdate>({
    adapter: () => {
      const api = inject(VatRatesApiService);

      return {
        load: query => api.list(query).pipe(map(({ items, total }) => ({ entities: items, pagination: { total } }))),
        getById: id => api.get(String(id)),
        create: payload =>
          api.create({ ...payload, code: payload.code.trim(), name: payload.name.trim(), rate: payload.rate.trim() }),
        update: (id, payload) =>
          api.update(String(id), {
            ...payload,
            ...(payload.rate === undefined ? {} : { rate: payload.rate.trim() }),
            ...(payload.name === undefined ? {} : { name: payload.name.trim() }),
          }),
      };
    },
    load: { pageParams: (query, offset, limit) => ({ ...query, offset, limit }) },
    events: vatRatesEvents,
    errorMessage: apiError,
    errors: {
      load: 'Could not load VAT rates.',
      getById: 'Could not load the VAT rate.',
      create: 'Could not create the VAT rate.',
      update: 'Could not update the VAT rate.',
      remove: 'Could not archive the VAT rate.',
    },
  }),
  withEntityNotifications(vatRatesEvents, () => ({
    created: 'VAT rate created.',
    updated: inject(VAT_RATE_UPDATE_MESSAGE),
  })),
);
