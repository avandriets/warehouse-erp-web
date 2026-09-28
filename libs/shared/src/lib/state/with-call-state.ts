import type { Signal } from '@angular/core';
import { computed } from '@angular/core';
import type { EmptyFeatureResult, SignalStoreFeature } from '@ngrx/signals';
import { patchState, signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';

import type { CallOperation, CallState, CallStateConfig, CallStateFeatureResult, UIStateStatus } from '../types';

function initialState(): CallState {
  return { loading: false, loaded: false, saving: false, error: null, actionError: null };
}

export function withCallState<const Collection extends string>({
  collection,
}: CallStateConfig<Collection>): SignalStoreFeature<EmptyFeatureResult, CallStateFeatureResult<Collection>> {
  const stateKey = `${collection}CallState`;

  // Computed property names widen to string; assertions are limited to the named-feature boundary.
  return signalStoreFeature(
    withState({ [stateKey]: initialState() }),
    withComputed(store => {
      const callState = (store as Record<string, Signal<CallState>>)[stateKey];

      return {
        [`${collection}Loading`]: computed(() => callState().loading),
        [`${collection}Loaded`]: computed(() => callState().loaded),
        [`${collection}Saving`]: computed(() => callState().saving),
        [`${collection}Error`]: computed(() => callState().error),
        [`${collection}ActionError`]: computed(() => callState().actionError),
        [`${collection}State`]: computed<UIStateStatus<string>>(() => {
          const state = callState();

          return { resolved: state.loaded, pending: state.loading, rejected: !!state.error, err: state.error };
        }),
      };
    }),
    withMethods(store => {
      const update = (changes: Partial<CallState>): void => {
        patchState(store, state => ({ [stateKey]: { ...state[stateKey], ...changes } }));
      };
      const setLoaded = (): void => update({ loaded: true, error: null });

      return {
        [`${collection}StartCall`](operation: CallOperation): void {
          update(operation === 'load' ? { loading: true, error: null } : { saving: true, actionError: null });
        },
        [`${collection}CallSucceeded`](operation: CallOperation): void {
          if (operation === 'load') {
            setLoaded();
          } else {
            update({ actionError: null });
          }
        },
        [`${collection}CallFailed`](operation: CallOperation, error: string): void {
          update(operation === 'load' ? { error } : { actionError: error });
        },
        [`${collection}FinishCall`](operation: CallOperation): void {
          update(operation === 'load' ? { loading: false } : { saving: false });
        },
        [`${collection}SetLoaded`]: setLoaded,
        [`${collection}DismissActionError`](): void {
          update({ actionError: null });
        },
        [`${collection}ResetCallState`](): void {
          update(initialState());
        },
      };
    }),
  ) as SignalStoreFeature<EmptyFeatureResult, CallStateFeatureResult<Collection>>;
}
