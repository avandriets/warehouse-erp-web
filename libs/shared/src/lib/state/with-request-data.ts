import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import type { EmptyFeatureResult, SignalStoreFeature } from '@ngrx/signals';
import { patchState, signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';
import type { EventCreator } from '@ngrx/signals/events';
import { Dispatcher } from '@ngrx/signals/events';
import type { Observable } from 'rxjs';
import { defer, EMPTY, filter, map, Subject, take, takeUntil, throwError } from 'rxjs';

import type { EntityDataOperationState } from '../types';
import type { RequestDataConfig, RequestDataOptions, RequestDataState } from '../types';
import type { RequestDataFeatureResult, UIStateStatus } from '../types';

let correlationSequence = 0;

function createCorrelationId(): string {
  correlationSequence += 1;

  return `request-${Date.now()}-${correlationSequence}`;
}

function pendingOperation(correlationId: string): EntityDataOperationState {
  return { correlationId, type: 'load', status: 'pending', error: null };
}

function completedOperation(operation: EntityDataOperationState, error: string | null): EntityDataOperationState {
  return { ...operation, status: error ? 'error' : 'success', error };
}

function pendingOperations(operations: Readonly<Record<string, EntityDataOperationState>>): EntityDataOperationState[] {
  return Object.values(operations).filter(operation => operation.status === 'pending');
}

function dispatchEvent<TPayload>(
  dispatcher: Dispatcher,
  event: EventCreator<string, TPayload> | undefined,
  payload: TPayload,
): void {
  if (event) {
    dispatcher.dispatch(event(payload));
  }
}

export const withRequestData = <TData, TParams = void, TSave = never>(
  config: RequestDataConfig<TData, TParams, TSave>,
): SignalStoreFeature<EmptyFeatureResult, RequestDataFeatureResult<TData, TParams, TSave>> => {
  const initialState: RequestDataState<TData> = {
    data: null,
    loaded: false,
    saving: false,
    actionError: null,
    error: null,
    operations: {},
  };

  return signalStoreFeature(
    withState(initialState),
    withComputed(store => ({
      loading: computed(() => pendingOperations(store.operations()).length > 0),
      requestState: computed<UIStateStatus<string>>(() => {
        const error = store.error();
        const loading = pendingOperations(store.operations()).length > 0;
        const data = store.data();

        return {
          resolved: store.loaded(),
          rejected: !!error,
          pending: loading,
          err: error,
          empty: store.loaded() && data !== null && !!config.isEmpty?.(data),
        };
      }),
    })),
    withMethods(store => {
      const adapter = config.adapter();
      const destroyRef = inject(DestroyRef);
      const dispatcher = inject(Dispatcher);
      const reset = new Subject<void>();
      const cancelLoads = new Subject<void>();
      const isActive = (correlationId: string): boolean => store.operations()[correlationId]?.status === 'pending';

      return {
        load(params: TParams, options: RequestDataOptions = {}): Observable<TData> {
          const concurrency = options.concurrency ?? config.concurrency ?? 'latest';

          return defer(() => {
            const correlationId = options.correlationId ?? createCorrelationId();

            if (concurrency === 'exhaust' && pendingOperations(store.operations()).length) {
              return EMPTY;
            }

            const processedParams = config.processors?.beforeLoad?.(params) ?? params;
            patchState(store, state => ({
              error: null,
              operations:
                concurrency === 'latest'
                  ? { [correlationId]: pendingOperation(correlationId) }
                  : {
                      ...Object.fromEntries(
                        Object.entries(state.operations).filter(([, operation]) => operation.status === 'pending'),
                      ),
                      [correlationId]: pendingOperation(correlationId),
                    },
            }));

            return adapter.load(processedParams).pipe(
              filter(() => isActive(correlationId)),
              map(data => config.processors?.afterLoad?.(data) ?? data),
              tapResponse({
                next: data => {
                  if (!isActive(correlationId)) {
                    return;
                  }

                  patchState(store, state => ({
                    data,
                    loaded: true,
                    error: null,
                    operations: {
                      ...state.operations,
                      [correlationId]: completedOperation(state.operations[correlationId], null),
                    },
                  }));
                  dispatchEvent(dispatcher, config.events?.loaded, { data, correlationId });
                },
                error: error => {
                  if (!isActive(correlationId)) {
                    return;
                  }

                  patchState(store, state => ({
                    error: config.errorMessage?.(error) ?? config.error,
                    operations: {
                      ...state.operations,
                      [correlationId]: completedOperation(
                        state.operations[correlationId],
                        config.errorMessage?.(error) ?? config.error,
                      ),
                    },
                  }));
                  dispatchEvent(dispatcher, config.events?.loadFailed, {
                    error,
                    message: config.errorMessage?.(error) ?? config.error,
                    correlationId,
                  });
                },
                finalize: () => {
                  if (!isActive(correlationId)) {
                    return;
                  }

                  patchState(store, state => {
                    const operations = { ...state.operations };
                    delete operations[correlationId];

                    return { operations };
                  });
                },
              }),
            );
          }).pipe(takeUntil(reset), takeUntil(cancelLoads), takeUntilDestroyed(destroyRef));
        },

        save(payload: TSave): Observable<TData> {
          return defer(() => {
            if (store.saving() || destroyRef.destroyed) {
              return EMPTY;
            }

            const save = adapter.save;
            if (!save) {
              return throwError(() => new Error('save adapter is not configured'));
            }

            const correlationId = createCorrelationId();
            cancelLoads.next();
            patchState(store, { saving: true, actionError: null });

            return defer(() => save(payload)).pipe(
              take(1),
              tapResponse({
                next: data => {
                  cancelLoads.next();
                  patchState(store, { data, loaded: true, error: null });
                  dispatchEvent(dispatcher, config.events?.saved, { data, correlationId });
                },
                error: error => {
                  const message = config.errorMessage?.(error) ?? config.saveError ?? 'Could not save data.';
                  patchState(store, { actionError: message });
                  dispatchEvent(dispatcher, config.events?.saveFailed, { error, message, correlationId });
                },
                finalize: () => patchState(store, { saving: false }),
              }),
            );
          }).pipe(takeUntil(reset), takeUntilDestroyed(destroyRef));
        },

        dismissActionError(): void {
          patchState(store, { actionError: null });
        },

        setData(data: TData): void {
          patchState(store, { data, loaded: true, error: null });
        },

        setError(error: string): void {
          patchState(store, { error });
        },

        dismissError(): void {
          patchState(store, { error: null });
        },

        reset(): void {
          reset.next();
          patchState(store, initialState);
        },
      };
    }),
  );
};
