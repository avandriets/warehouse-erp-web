import type { Signal } from '@angular/core';
import type { EntityId, EntityProps, EntityState } from '@ngrx/signals/entities';
import type { EventCreator } from '@ngrx/signals/events';
import type { Observable } from 'rxjs';

import type { UIStateStatus } from './state-container.types';

export interface EntityDataAdapter<TEntity, TCreate, TLoadParams = void, TUpdate = TCreate> {
  load(params: TLoadParams): Observable<EntityDataPage<TEntity>>;
  getById?(id: EntityId): Observable<TEntity>;
  create?(payload: TCreate): Observable<TEntity>;
  update?(id: EntityId, payload: TUpdate): Observable<TEntity>;
  remove?(id: EntityId): Observable<void>;
}

export interface EntityDataErrors {
  load: string;
  getById?: string;
  create: string;
  update: string;
  remove: string;
}

export interface EntityDataFailure {
  error: unknown;
  message: string;
  correlationId: string;
}

export interface EntityDataSuccess<TData> {
  data: TData;
  correlationId: string;
}

export interface EntityDataPagination {
  total?: number;
  nextCursor?: string | null;
  previousCursor?: string | null;
}

export interface EntityDataPage<TEntity> {
  entities: TEntity[];
  pagination?: EntityDataPagination;
}

export type EntityDataMergeStrategy = 'replace' | 'append' | 'prepend' | 'upsert';

export type EntityDataConcurrency = 'latest' | 'exhaust' | 'parallel';

export type EntityDataOperationStatus = 'pending' | 'success' | 'error';

export type EntityDataOperationType = 'load' | 'getById' | 'create' | 'update' | 'remove';

export interface EntityDataOperationState {
  correlationId: string;
  type: EntityDataOperationType;
  status: EntityDataOperationStatus;
  error: string | null;
}

export interface EntityDataRequestOptions {
  correlationId?: string;
}

export interface EntityDataLoadOptions extends EntityDataRequestOptions {
  concurrency?: EntityDataConcurrency;
  merge?: EntityDataMergeStrategy;
}

export type EntityDataGetByIdOptions = EntityDataRequestOptions;

export interface EntityDataEvents<TEntity> {
  loaded?: EventCreator<string, EntityDataSuccess<EntityDataPage<TEntity>>>;
  loadFailed?: EventCreator<string, EntityDataFailure>;
  retrieved?: EventCreator<string, EntityDataSuccess<TEntity>>;
  retrieveFailed?: EventCreator<string, EntityDataFailure>;
  created?: EventCreator<string, EntityDataSuccess<TEntity>>;
  createFailed?: EventCreator<string, EntityDataFailure>;
  updated?: EventCreator<string, EntityDataSuccess<TEntity>>;
  updateFailed?: EventCreator<string, EntityDataFailure>;
  removed?: EventCreator<string, EntityDataSuccess<EntityId>>;
  removeFailed?: EventCreator<string, EntityDataFailure>;
}

export interface EntityDataProcessors<TEntity, TCreate, TLoadParams = void, TUpdate = TCreate> {
  beforeLoad?: (params: TLoadParams) => TLoadParams;
  afterLoad?: (entities: TEntity[]) => TEntity[];
  beforeGetById?: (id: EntityId) => EntityId;
  afterGetById?: (entity: TEntity) => TEntity;
  beforeCreate?: (payload: TCreate) => TCreate;
  afterCreate?: (entity: TEntity) => TEntity;
  beforeUpdate?: (update: EntityDataUpdate<TUpdate>) => EntityDataUpdate<TUpdate>;
  afterUpdate?: (entity: TEntity) => TEntity;
  beforeRemove?: (id: EntityId) => EntityId;
}

export interface EntityDataConfig<TEntity, TCreate, TLoadParams = void, TUpdate = TCreate> {
  errorMessage?: (error: unknown) => string;
  adapter: () => EntityDataAdapter<TEntity, TCreate, TLoadParams, TUpdate>;
  errors: EntityDataErrors;
  events?: EntityDataEvents<TEntity>;
  processors?: EntityDataProcessors<TEntity, TCreate, TLoadParams, TUpdate>;
  load?: {
    concurrency?: EntityDataConcurrency;
    merge?: EntityDataMergeStrategy;
  };
}

export interface EntityDataState {
  loaded: boolean;
  error: string | null;
  actionError: string | null;
  pagination: EntityDataPagination;
  loadOperations: Readonly<Record<string, EntityDataOperationState>>;
  createOperations: Readonly<Record<string, EntityDataOperationState>>;
  entityOperations: Readonly<Record<EntityId, EntityDataOperationState>>;
}

export interface EntityDataUpdate<TUpdate> {
  id: EntityId;
  payload: TUpdate;
}

export interface EntityDataFeatureResult<TEntity, TCreate, TUpdate, TLoadParams> {
  state: EntityState<TEntity> & EntityDataState;
  props: EntityProps<TEntity> & {
    entityState: Signal<UIStateStatus<string>>;
    loading: Signal<boolean>;
    saving: Signal<boolean>;
  };
  methods: {
    load(params: TLoadParams, options?: EntityDataLoadOptions): Observable<EntityDataPage<TEntity>>;
    getById(id: EntityId, options?: EntityDataGetByIdOptions): Observable<TEntity>;
    create(payload: TCreate, options?: EntityDataRequestOptions): Observable<TEntity>;
    update(update: EntityDataUpdate<TUpdate>, options?: EntityDataRequestOptions): Observable<TEntity>;
    remove(id: EntityId, options?: EntityDataRequestOptions): Observable<void>;
    entityById(id: EntityId): TEntity | undefined;
    operationById(id: EntityId): EntityDataOperationState | null;
    isEntityPending(id: EntityId): boolean;
    upsert(entity: TEntity): void;
    upsertMany(entities: TEntity[]): void;
    replaceAll(entities: TEntity[]): void;
    removeMany(ids: EntityId[]): void;
    clear(): void;
    reset(): void;
    dismissError(): void;
    dismissActionError(): void;
  };
}
