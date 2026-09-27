import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { EmptyFeatureResult, SignalStoreFeature } from '@ngrx/signals';
import { patchState, signalStoreFeature, withMethods, withState } from '@ngrx/signals';
import type { Observable } from 'rxjs';
import { catchError, defer, EMPTY, finalize, map, Subject, take, takeUntil } from 'rxjs';

import type { MutationFeature, MutationResult } from '../types';

export function withMutation(
  errorMessage: (error: unknown) => string,
): SignalStoreFeature<EmptyFeatureResult, MutationFeature> {
  return signalStoreFeature(
    withState({ saving: false, actionError: null as string | null }),
    withMethods(store => {
      const destroyRef = inject(DestroyRef);
      const reset = new Subject<void>();
      let revision = 0;
      return {
        mutate<T>(action: () => Observable<T>): Observable<MutationResult<T>> {
          return defer(() => {
            if (store.saving() || destroyRef.destroyed) return EMPTY;
            const current = ++revision;
            patchState(store, { saving: true, actionError: null });
            return defer(action).pipe(
              take(1),
              map(data => ({ data })),
              catchError(error => {
                if (current === revision) patchState(store, { actionError: errorMessage(error) });
                return EMPTY;
              }),
              takeUntil(reset),
              finalize(() => {
                if (current === revision) patchState(store, { saving: false });
              }),
            );
          }).pipe(takeUntilDestroyed(destroyRef));
        },
        resetMutation(): void {
          revision++;
          reset.next();
          patchState(store, { saving: false, actionError: null });
        },
        dismissActionError(): void {
          patchState(store, { actionError: null });
        },
      };
    }),
  );
}
