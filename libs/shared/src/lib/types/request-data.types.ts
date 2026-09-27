import type { Signal } from '@angular/core';
import type { EventCreator } from '@ngrx/signals/events';
import type { Observable } from 'rxjs';

import type { EntityDataFailure, EntityDataOperationState, EntityDataSuccess } from './entity-data.types';
import type { UIStateStatus } from './state-container.types';

export type RequestDataConcurrency = 'latest' | 'exhaust' | 'parallel';

export interface RequestDataAdapter<TData, TParams = void> {
  load(params: TParams): Observable<TData>;
}

export interface RequestDataOptions {
  concurrency?: RequestDataConcurrency;
  correlationId?: string;
}

export interface RequestDataEvents<TData> {
  loaded?: EventCreator<string, EntityDataSuccess<TData>>;
  loadFailed?: EventCreator<string, EntityDataFailure>;
}

export interface RequestDataProcessors<TData, TParams = void> {
  beforeLoad?: (params: TParams) => TParams;
  afterLoad?: (data: TData) => TData;
}

export interface RequestDataConfig<TData, TParams = void> {
  errorMessage?: (error: unknown) => string;
  adapter: () => RequestDataAdapter<TData, TParams>;
  error: string;
  concurrency?: RequestDataConcurrency;
  events?: RequestDataEvents<TData>;
  processors?: RequestDataProcessors<TData, TParams>;
  isEmpty?: (data: TData) => boolean;
}

export interface RequestDataState<TData> {
  data: TData | null;
  loaded: boolean;
  error: string | null;
  operations: Readonly<Record<string, EntityDataOperationState>>;
}

export interface RequestDataFeatureResult<TData, TParams> {
  state: RequestDataState<TData>;
  props: {
    loading: Signal<boolean>;
    requestState: Signal<UIStateStatus<string>>;
  };
  methods: {
    load(params: TParams, options?: RequestDataOptions): Observable<TData>;
    setData(data: TData): void;
    setError(error: string): void;
    dismissError(): void;
    reset(): void;
  };
}
