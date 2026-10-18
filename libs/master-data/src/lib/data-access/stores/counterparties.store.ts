import { DestroyRef, inject, InjectionToken } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withMethods, withProps, withState } from '@ngrx/signals';
import { Dispatcher, eventGroup, Events, withEventHandlers } from '@ngrx/signals/events';
import type { EntityDataFailure, EntityDataSuccess } from '@warehouse/shared';
import { apiError, withEntityData, withEntityNotifications } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { defer, EMPTY, filter, map, tap } from 'rxjs';

import type {
  CounterpartiesQuery,
  Counterparty,
  CounterpartyCreate,
  CounterpartyDuplicateCheck,
  CounterpartyUpdate,
} from '../../types';
import { normalizeCounterparty } from '../../types';
import { CounterpartiesApiService } from '../services';

export const COUNTERPARTY_UPDATE_MESSAGE = new InjectionToken<string>('Counterparty update notification', {
  factory: () => 'Counterparty saved.',
});

const counterpartiesEvents = eventGroup({
  source: 'Counterparties API',
  events: {
    loadFailed: type<EntityDataFailure>(),
    retrieveFailed: type<EntityDataFailure>(),
    createFailed: type<EntityDataFailure>(),
    updateFailed: type<EntityDataFailure>(),
    created: type<EntityDataSuccess<Counterparty>>(),
    updated: type<EntityDataSuccess<Counterparty>>(),
    duplicateCheckFailed: type<EntityDataFailure>(),
  },
});

let duplicateSequence = 0;

export const CounterpartiesStore = signalStore(
  withState({ checkingDuplicates: false, duplicateCheckError: null as string | null }),
  withProps(() => ({ _duplicateOwner: `counterparty-duplicates-${++duplicateSequence}` })),
  withEntityData<Counterparty, CounterpartyCreate, CounterpartiesQuery, CounterpartyUpdate>({
    adapter: () => {
      const api = inject(CounterpartiesApiService);

      return {
        load: query => api.list(query).pipe(map(({ items, total }) => ({ entities: items, pagination: { total } }))),
        getById: id => api.get(String(id)),
        create: payload => api.create(normalizeCounterparty(payload)),
        update: (id, payload) => api.update(String(id), normalizeCounterparty(payload)),
      };
    },
    events: counterpartiesEvents,
    errorMessage: apiError,
    errors: {
      load: 'Could not load counterparties.',
      getById: 'Could not load the counterparty.',
      create: 'Could not create the counterparty.',
      update: 'Could not update the counterparty.',
      remove: 'Could not archive the counterparty.',
    },
  }),
  withMethods(store => {
    const api = inject(CounterpartiesApiService);
    const dispatcher = inject(Dispatcher);
    const destroyRef = inject(DestroyRef);

    return {
      checkDuplicates(payload: Omit<CounterpartyCreate, 'active'>): Observable<CounterpartyDuplicateCheck> {
        return defer(() => {
          if (store.checkingDuplicates()) {
            return EMPTY;
          }

          patchState(store, { checkingDuplicates: true, duplicateCheckError: null });

          return api.duplicateCheck(normalizeCounterparty(payload)).pipe(
            tapResponse({
              next: () => patchState(store, { duplicateCheckError: null }),
              error: error => {
                const message = apiError(error);
                patchState(store, { duplicateCheckError: message });
                dispatcher.dispatch(
                  counterpartiesEvents.duplicateCheckFailed({ error, message, correlationId: store._duplicateOwner }),
                );
              },
              finalize: () => patchState(store, { checkingDuplicates: false }),
            }),
          );
        }).pipe(takeUntilDestroyed(destroyRef));
      },
      dismissDuplicateError(): void {
        patchState(store, { duplicateCheckError: null });
      },
    };
  }),
  withEventHandlers(store => {
    const events = inject(Events);
    const snackBar = inject(MatSnackBar);

    return {
      duplicateCheckFailed: events.on(counterpartiesEvents.duplicateCheckFailed).pipe(
        filter(({ payload }) => payload.correlationId === store._duplicateOwner),
        tap(({ payload }) => snackBar.open(payload.message, 'Dismiss', { duration: 6000 })),
      ),
    };
  }),
  withEntityNotifications(counterpartiesEvents, () => ({
    created: 'Counterparty created.',
    updated: inject(COUNTERPARTY_UPDATE_MESSAGE),
  })),
);
