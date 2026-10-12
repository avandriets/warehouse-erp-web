import { HttpErrorResponse } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signalStore, type } from '@ngrx/signals';
import { eventGroup, Events, withEventHandlers } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData } from '@warehouse/shared';
import { filter, map, tap } from 'rxjs';

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
    events: vatRatesEvents,
    errorMessage: error =>
      error instanceof HttpErrorResponse && error.status === 409 && /concurrent|version/i.test(apiError(error))
        ? `${apiError(error)} Your entries have been kept. Reload to get the latest version; reloading discards unsaved changes.`
        : apiError(error),
    errors: {
      load: 'Could not load VAT rates.',
      getById: 'Could not load the VAT rate.',
      create: 'Could not create the VAT rate.',
      update: 'Could not update the VAT rate.',
      remove: 'Could not archive the VAT rate.',
    },
  }),
  withEventHandlers(store => {
    const events = inject(Events);
    const snackBar = inject(MatSnackBar);
    const updateMessage = inject(VAT_RATE_UPDATE_MESSAGE);
    const ownsRequest = (correlationId: string): boolean =>
      !!store.loadOperations()[correlationId] ||
      !!store.createOperations()[correlationId] ||
      Object.values(store.entityOperations()).some(operation => operation.correlationId === correlationId);

    return {
      errors: events
        .on(
          vatRatesEvents.loadFailed,
          vatRatesEvents.retrieveFailed,
          vatRatesEvents.createFailed,
          vatRatesEvents.updateFailed,
        )
        .pipe(
          filter(({ payload }) => ownsRequest(payload.correlationId)),
          tap(({ payload }) => snackBar.open(payload.message, 'Dismiss', { duration: 6000 })),
        ),
      created: events.on(vatRatesEvents.created).pipe(
        filter(({ payload }) => ownsRequest(payload.correlationId)),
        tap(() => snackBar.open('VAT rate created.', 'Dismiss', { duration: 4000 })),
      ),
      updated: events.on(vatRatesEvents.updated).pipe(
        filter(({ payload }) => ownsRequest(payload.correlationId)),
        tap(() => snackBar.open(updateMessage, 'Dismiss', { duration: 4000 })),
      ),
    };
  }),
);
