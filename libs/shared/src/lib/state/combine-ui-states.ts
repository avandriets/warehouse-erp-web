import type { UIStateStatus } from '../types';

/** Empty state depends on the screen's primary data, not its auxiliary requests. */
export function combineUIStates<TError>(...states: readonly UIStateStatus<TError>[]): UIStateStatus<TError> {
  return {
    resolved: states.every(state => state.resolved),
    rejected: states.some(state => state.rejected),
    pending: states.some(state => state.pending),
    err:
      states.find(state => state.rejected && state.err !== null)?.err ??
      states.find(state => state.err !== null)?.err ??
      null,
  };
}
