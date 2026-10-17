import { HttpErrorResponse } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import { map } from 'rxjs';

import type { CurrenciesQuery, Currency, CurrencyCreate, CurrencyUpdate } from '../../types';
import { CurrenciesApiService } from '../services';

export const CURRENCY_UPDATE_MESSAGE = new InjectionToken<string>('Currency update notification', {
  factory: () => 'Currency saved.',
});

const events = eventGroup({
  source: 'Currencies API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    retrieveFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<Currency>>(),
    updated: type<EntityDataSuccess<Currency>>(),
  },
});

export const CurrenciesStore = signalStore(
  withEntityData<Currency, CurrencyCreate, CurrenciesQuery, CurrencyUpdate>({
    adapter: () => {
      const api = inject(CurrenciesApiService);

      return {
        load: query => api.list(query).pipe(map(({ items, total }) => ({ entities: items, pagination: { total } }))),
        getById: id => api.get(String(id)),
        create: payload =>
          api.create({
            ...payload,
            code: payload.code.trim().toUpperCase(),
            name: payload.name.trim(),
            symbol: payload.symbol.trim(),
          }),
        update: (id, payload) =>
          api.update(String(id), {
            ...payload,
            ...(payload.name === undefined ? {} : { name: payload.name.trim() }),
            ...(payload.symbol === undefined ? {} : { symbol: payload.symbol.trim() }),
          }),
      };
    },
    events,

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
  withEntityNotifications(events, () => ({ created: 'Currency created.', updated: inject(CURRENCY_UPDATE_MESSAGE) })),
);
