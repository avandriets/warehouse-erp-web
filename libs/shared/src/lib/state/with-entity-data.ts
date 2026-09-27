import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import type { EmptyFeatureResult, SignalStoreFeature } from '@ngrx/signals';
import { patchState, signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';
import type { EntityId } from '@ngrx/signals/entities';
import {
  prependEntities,
  prependEntity,
  removeAllEntities,
  removeEntities,
  removeEntity,
  setAllEntities,
  setEntities,
  setEntity,
  upsertEntities,
  upsertEntity,
  withEntities,
} from '@ngrx/signals/entities';
import type { EventCreator } from '@ngrx/signals/events';
import { Dispatcher } from '@ngrx/signals/events';
import type { Observable, OperatorFunction } from 'rxjs';
import { defer, EMPTY, filter, map, throwError } from 'rxjs';

import type {
  EntityDataConcurrency,
  EntityDataConfig,
  EntityDataFailure,
  EntityDataGetByIdOptions,
  EntityDataLoadOptions,
  EntityDataMergeStrategy,
  EntityDataOperationState,
  EntityDataOperationType,
  EntityDataPage,
  EntityDataRequestOptions,
  EntityDataState,
  EntityDataSuccess,
  EntityDataUpdate,
} from '../types';
import type { EntityDataFeatureResult, UIStateStatus } from '../types';

const initialState: EntityDataState = {
  loaded: false,
  error: null,
  actionError: null,
  pagination: {},
  loadOperations: {},
  createOperations: {},
  entityOperations: {},
};

let correlationSequence = 0;

function createCorrelationId(type: EntityDataOperationType): string {
  correlationSequence += 1;
  return `${type}-${Date.now()}-${correlationSequence}`;
}

function createOperation(type: EntityDataOperationType, correlationId: string): EntityDataOperationState {
  return { correlationId, type, status: 'pending', error: null };
}

function completeOperation(operation: EntityDataOperationState, error: string | null): EntityDataOperationState {
  return { ...operation, status: error ? 'error' : 'success', error };
}

function createSuccess<TData>(data: TData, correlationId: string): EntityDataSuccess<TData> {
  return { data, correlationId };
}

function createFailure(error: unknown, message: string, correlationId: string): EntityDataFailure {
  return { error, message, correlationId };
}

function dispatchEntityEvent<TPayload>(
  dispatcher: Dispatcher,
  eventCreator: EventCreator<string, TPayload> | undefined,
  payload: TPayload,
): void {
  if (eventCreator) dispatcher.dispatch(eventCreator(payload));
}

function processValue<TValue>(processor: ((value: TValue) => TValue) | undefined, value: TValue): TValue {
  return processor ? processor(value) : value;
}

function processResponse<TValue>(processor: ((value: TValue) => TValue) | undefined): OperatorFunction<TValue, TValue> {
  return map(value => processValue(processor, value));
}

function pendingOperations(operations: Readonly<Record<string, EntityDataOperationState>>): EntityDataOperationState[] {
  return Object.values(operations).filter(operation => operation.status === 'pending');
}

export const withEntityData = <TEntity extends { id: EntityId }, TCreate, TLoadParams = void, TUpdate = TCreate>(
  config: EntityDataConfig<TEntity, TCreate, TLoadParams, TUpdate>,
): SignalStoreFeature<EmptyFeatureResult, EntityDataFeatureResult<TEntity, TCreate, TUpdate, TLoadParams>> =>
  signalStoreFeature(
    withEntities<TEntity>(),
    withState(initialState),
    withComputed(store => ({
      loading: computed(() => pendingOperations(store.loadOperations()).length > 0),
      saving: computed(
        () =>
          pendingOperations(store.createOperations()).length > 0 ||
          Object.values(store.entityOperations()).some(
            operation => operation.status === 'pending' && operation.type !== 'getById',
          ),
      ),
      entityState: computed<UIStateStatus<string>>(() => ({
        resolved: store.loaded(),
        rejected: !!store.error(),
        pending: pendingOperations(store.loadOperations()).length > 0,
        err: store.error(),
        empty: store.loaded() && !store.entities().length,
      })),
    })),
    withMethods(store => {
      const adapter = config.adapter();
      const destroyRef = inject(DestroyRef);
      const dispatcher = inject(Dispatcher);
      const messageFor = (error: unknown, fallback: string): string => config.errorMessage?.(error) ?? fallback;

      const isActiveLoad = (correlationId: string): boolean =>
        store.loadOperations()[correlationId]?.status === 'pending';
      const isActiveEntityOperation = (id: EntityId, correlationId: string): boolean =>
        store.entityOperations()[id]?.correlationId === correlationId &&
        store.entityOperations()[id]?.status === 'pending';

      const finishLoad = (correlationId: string, error: string | null): void => {
        if (!isActiveLoad(correlationId)) return;
        patchState(store, state => ({
          loadOperations: {
            ...state.loadOperations,
            [correlationId]: completeOperation(state.loadOperations[correlationId], error),
          },
        }));
      };

      const finishCreate = (correlationId: string, error: string | null): void => {
        if (store.createOperations()[correlationId]?.status !== 'pending') return;
        patchState(store, state => ({
          createOperations: {
            ...state.createOperations,
            [correlationId]: completeOperation(state.createOperations[correlationId], error),
          },
        }));
      };

      const finishEntityOperation = (id: EntityId, correlationId: string, error: string | null): void => {
        if (!isActiveEntityOperation(id, correlationId)) return;
        patchState(store, state => ({
          entityOperations: {
            ...state.entityOperations,
            [id]: completeOperation(state.entityOperations[id], error),
          },
        }));
      };

      const cancelCreate = (correlationId: string): void => {
        if (store.createOperations()[correlationId]?.status !== 'pending') return;
        patchState(store, state => {
          const createOperations = { ...state.createOperations };
          delete createOperations[correlationId];
          return { createOperations };
        });
      };

      const cancelEntityOperation = (id: EntityId, correlationId: string): void => {
        if (!isActiveEntityOperation(id, correlationId)) return;
        patchState(store, state => {
          const entityOperations = { ...state.entityOperations };
          delete entityOperations[id];
          return { entityOperations };
        });
      };

      const mergePage = (page: EntityDataPage<TEntity>, strategy: EntityDataMergeStrategy): void => {
        const pageState = { loaded: true, error: null, pagination: page.pagination ?? {} };
        switch (strategy) {
          case 'append':
            patchState(store, setEntities(page.entities), pageState);
            break;
          case 'prepend':
            patchState(store, prependEntities(page.entities), setEntities(page.entities), pageState);
            break;
          case 'upsert':
            patchState(store, upsertEntities(page.entities), pageState);
            break;
          case 'replace':
          default:
            patchState(store, setAllEntities(page.entities), pageState);
            break;
        }
      };

      return {
        load(params: TLoadParams, options: EntityDataLoadOptions = {}): Observable<EntityDataPage<TEntity>> {
          return defer(() => {
            const correlationId = options.correlationId ?? createCorrelationId('load');
            const concurrency: EntityDataConcurrency = options.concurrency ?? config.load?.concurrency ?? 'latest';
            const merge = options.merge ?? config.load?.merge ?? 'replace';

            return defer(() => {
              if (concurrency === 'exhaust' && pendingOperations(store.loadOperations()).length) return EMPTY;
              const processedParams = processValue(config.processors?.beforeLoad, params);
              patchState(store, state => ({
                error: null,
                loadOperations:
                  concurrency === 'latest'
                    ? { [correlationId]: createOperation('load', correlationId) }
                    : {
                        ...Object.fromEntries(
                          Object.entries(state.loadOperations).filter(
                            ([, operation]) => operation.status === 'pending',
                          ),
                        ),
                        [correlationId]: createOperation('load', correlationId),
                      },
              }));
              return adapter.load(processedParams);
            }).pipe(
              filter(() => isActiveLoad(correlationId)),
              map(page => ({ ...page, entities: processValue(config.processors?.afterLoad, page.entities) })),
              tapResponse({
                next: page => {
                  if (!isActiveLoad(correlationId)) return;
                  mergePage(page, merge);
                  finishLoad(correlationId, null);
                  dispatchEntityEvent(dispatcher, config.events?.loaded, createSuccess(page, correlationId));
                },
                error: error => {
                  if (!isActiveLoad(correlationId)) return;
                  patchState(store, { error: messageFor(error, config.errors.load) });
                  finishLoad(correlationId, messageFor(error, config.errors.load));
                  dispatchEntityEvent(
                    dispatcher,
                    config.events?.loadFailed,
                    createFailure(error, messageFor(error, config.errors.load), correlationId),
                  );
                },
                finalize: () => {
                  if (!isActiveLoad(correlationId)) return;
                  patchState(store, state => {
                    const loadOperations = { ...state.loadOperations };
                    delete loadOperations[correlationId];
                    return { loadOperations };
                  });
                },
              }),
            );
          }).pipe(takeUntilDestroyed(destroyRef));
        },

        getById(id: EntityId, options: EntityDataGetByIdOptions = {}): Observable<TEntity> {
          return defer(() => {
            const correlationId = options.correlationId ?? createCorrelationId('getById');
            const processedId = processValue(config.processors?.beforeGetById, id);
            const message = config.errors.getById ?? config.errors.load;
            return defer(() => {
              patchState(store, state => ({
                entityOperations: {
                  ...state.entityOperations,
                  [processedId]: createOperation('getById', correlationId),
                },
              }));
              return adapter.getById
                ? adapter.getById(processedId)
                : throwError(() => new Error('getById adapter is not configured'));
            }).pipe(
              filter(() => isActiveEntityOperation(processedId, correlationId)),
              processResponse(config.processors?.afterGetById),
              tapResponse({
                next: entity => {
                  if (!isActiveEntityOperation(processedId, correlationId)) return;
                  patchState(store, setEntity(entity));
                  finishEntityOperation(processedId, correlationId, null);
                  dispatchEntityEvent(dispatcher, config.events?.retrieved, createSuccess(entity, correlationId));
                },
                error: error => {
                  if (!isActiveEntityOperation(processedId, correlationId)) return;
                  patchState(store, { actionError: messageFor(error, message) });
                  finishEntityOperation(processedId, correlationId, messageFor(error, message));
                  dispatchEntityEvent(
                    dispatcher,
                    config.events?.retrieveFailed,
                    createFailure(error, messageFor(error, message), correlationId),
                  );
                },
                finalize: () => cancelEntityOperation(processedId, correlationId),
              }),
            );
          }).pipe(takeUntilDestroyed(destroyRef));
        },

        create(payload: TCreate, options: EntityDataRequestOptions = {}): Observable<TEntity> {
          return defer(() => {
            const correlationId = options.correlationId ?? createCorrelationId('create');
            return defer(() => {
              const processedPayload = processValue(config.processors?.beforeCreate, payload);
              patchState(store, state => ({
                actionError: null,
                createOperations: {
                  ...Object.fromEntries(
                    Object.entries(state.createOperations).filter(([, operation]) => operation.status === 'pending'),
                  ),
                  [correlationId]: createOperation('create', correlationId),
                },
              }));
              return adapter.create
                ? adapter.create(processedPayload)
                : throwError(() => new Error('create adapter is not configured'));
            }).pipe(
              filter(() => store.createOperations()[correlationId]?.status === 'pending'),
              processResponse(config.processors?.afterCreate),
              tapResponse({
                next: entity => {
                  if (store.createOperations()[correlationId]?.status !== 'pending') return;
                  patchState(store, prependEntity(entity));
                  finishCreate(correlationId, null);
                  dispatchEntityEvent(dispatcher, config.events?.created, createSuccess(entity, correlationId));
                },
                error: error => {
                  if (store.createOperations()[correlationId]?.status !== 'pending') return;
                  patchState(store, { actionError: messageFor(error, config.errors.create) });
                  finishCreate(correlationId, messageFor(error, config.errors.create));
                  dispatchEntityEvent(
                    dispatcher,
                    config.events?.createFailed,
                    createFailure(error, messageFor(error, config.errors.create), correlationId),
                  );
                },
                finalize: () => cancelCreate(correlationId),
              }),
            );
          }).pipe(takeUntilDestroyed(destroyRef));
        },

        update(update: EntityDataUpdate<TUpdate>, options: EntityDataRequestOptions = {}): Observable<TEntity> {
          return defer(() => {
            const correlationId = options.correlationId ?? createCorrelationId('update');
            const { id, payload } = processValue(config.processors?.beforeUpdate, update);
            return defer(() => {
              patchState(store, state => ({
                actionError: null,
                entityOperations: { ...state.entityOperations, [id]: createOperation('update', correlationId) },
              }));
              return adapter.update
                ? adapter.update(id, payload)
                : throwError(() => new Error('update adapter is not configured'));
            }).pipe(
              filter(() => isActiveEntityOperation(id, correlationId)),
              processResponse(config.processors?.afterUpdate),
              tapResponse({
                next: entity => {
                  if (!isActiveEntityOperation(id, correlationId)) return;
                  patchState(store, setEntity(entity));
                  finishEntityOperation(id, correlationId, null);
                  dispatchEntityEvent(dispatcher, config.events?.updated, createSuccess(entity, correlationId));
                },
                error: error => {
                  if (!isActiveEntityOperation(id, correlationId)) return;
                  patchState(store, { actionError: messageFor(error, config.errors.update) });
                  finishEntityOperation(id, correlationId, messageFor(error, config.errors.update));
                  dispatchEntityEvent(
                    dispatcher,
                    config.events?.updateFailed,
                    createFailure(error, messageFor(error, config.errors.update), correlationId),
                  );
                },
                finalize: () => cancelEntityOperation(id, correlationId),
              }),
            );
          }).pipe(takeUntilDestroyed(destroyRef));
        },

        remove(id: EntityId, options: EntityDataRequestOptions = {}): Observable<void> {
          return defer(() => {
            const correlationId = options.correlationId ?? createCorrelationId('remove');
            const processedId = processValue(config.processors?.beforeRemove, id);
            return defer(() => {
              patchState(store, state => ({
                actionError: null,
                entityOperations: {
                  ...state.entityOperations,
                  [processedId]: createOperation('remove', correlationId),
                },
              }));
              return adapter.remove
                ? adapter.remove(processedId).pipe(map(() => processedId))
                : throwError(() => new Error('remove adapter is not configured'));
            }).pipe(
              filter(() => isActiveEntityOperation(processedId, correlationId)),
              tapResponse({
                next: removedId => {
                  if (!isActiveEntityOperation(removedId, correlationId)) return;
                  patchState(store, removeEntity(removedId));
                  finishEntityOperation(removedId, correlationId, null);
                  dispatchEntityEvent(dispatcher, config.events?.removed, createSuccess(removedId, correlationId));
                },
                error: error => {
                  if (!isActiveEntityOperation(processedId, correlationId)) return;
                  patchState(store, { actionError: messageFor(error, config.errors.remove) });
                  finishEntityOperation(processedId, correlationId, messageFor(error, config.errors.remove));
                  dispatchEntityEvent(
                    dispatcher,
                    config.events?.removeFailed,
                    createFailure(error, messageFor(error, config.errors.remove), correlationId),
                  );
                },
                finalize: () => cancelEntityOperation(processedId, correlationId),
              }),
              map(() => undefined),
            );
          }).pipe(takeUntilDestroyed(destroyRef));
        },

        entityById(id: EntityId): TEntity | undefined {
          return store.entityMap()[id];
        },

        operationById(id: EntityId): EntityDataOperationState | null {
          return store.entityOperations()[id] ?? null;
        },

        isEntityPending(id: EntityId): boolean {
          return store.entityOperations()[id]?.status === 'pending';
        },

        upsert(entity: TEntity): void {
          patchState(store, upsertEntity(entity));
        },

        upsertMany(entities: TEntity[]): void {
          patchState(store, upsertEntities(entities));
        },

        replaceAll(entities: TEntity[]): void {
          patchState(store, setAllEntities(entities), { loaded: true, error: null, pagination: {} });
        },

        removeMany(ids: EntityId[]): void {
          patchState(store, removeEntities(ids));
        },

        clear(): void {
          patchState(store, removeAllEntities(), { pagination: {} });
        },

        reset(): void {
          patchState(store, removeAllEntities(), initialState);
        },

        dismissError(): void {
          patchState(store, { error: null, actionError: null });
        },

        dismissActionError(): void {
          patchState(store, { actionError: null });
        },
      };
    }),
  );
