import type { EmptyFeatureResult } from '@ngrx/signals';
import type { Observable } from 'rxjs';

export interface MutationFeature {
  state: { saving: boolean; actionError: string | null };
  props: EmptyFeatureResult['props'];
  methods: {
    mutate<T>(action: () => Observable<T>): Observable<MutationResult<T>>;
    resetMutation(): void;
    dismissActionError(): void;
  };
}

export interface MutationResult<T> {
  data: T;
}
