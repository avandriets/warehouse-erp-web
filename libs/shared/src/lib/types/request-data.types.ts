import type { Signal } from '@angular/core';
import type { EventCreator } from '@ngrx/signals/events';
import type { Observable } from 'rxjs';

import type { EntityDataFailure, EntityDataOperationState, EntityDataSuccess } from './entity-data.types';
import type { UIStateStatus } from './state-container.types';

export type RequestDataConcurrency = 'latest' | 'exhaust' | 'parallel';

export interface RequestDataAdapter<TData, TParams = void, TSave = never> {
  load(params: TParams): Observable<TData>;
  save?(payload: TSave): Observable<TData>;
}

export interface RequestDataOptions {
  concurrency?: RequestDataConcurrency;
  correlationId?: string;
}

export interface RequestDataEvents<TData> {
  loaded?: EventCreator<string, EntityDataSuccess<TData>>;
  loadFailed?: EventCreator<string, EntityDataFailure>;
  saved?: EventCreator<string, EntityDataSuccess<TData>>;
  saveFailed?: EventCreator<string, EntityDataFailure>;
}

export interface RequestDataProcessors<TData, TParams = void> {
  beforeLoad?: (params: TParams) => TParams;
  afterLoad?: (data: TData) => TData;
}

export interface RequestDataConfig<TData, TParams = void, TSave = never> {
  errorMessage?: (error: unknown) => string;
  adapter: () => RequestDataAdapter<TData, TParams, TSave>;
  error: string;
  saveError?: string;
  concurrency?: RequestDataConcurrency;
  events?: RequestDataEvents<TData>;
  processors?: RequestDataProcessors<TData, TParams>;
  isEmpty?: (data: TData) => boolean;
}

export interface RequestDataState<TData> {
  data: TData | null;
  loaded: boolean;
  saving: boolean;
  actionError: string | null;
  error: string | null;
  operations: Readonly<Record<string, EntityDataOperationState>>;
}

export interface RequestDataFeatureResult<TData, TParams, TSave = never> {
  state: RequestDataState<TData>;
  props: {
    loading: Signal<boolean>;
    requestState: Signal<UIStateStatus<string>>;
  };
  methods: {
    load(params: TParams, options?: RequestDataOptions): Observable<TData>;
    save(payload: TSave): Observable<TData>;
    dismissActionError(): void;
    setData(data: TData): void;
    setError(error: string): void;
    dismissError(): void;
    reset(): void;
  };
}
