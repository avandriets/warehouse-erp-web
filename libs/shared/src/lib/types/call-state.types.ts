import type { Signal } from '@angular/core';

import type { UIStateStatus } from './state-container.types';

export type CallOperation = 'load' | 'save';

export interface CallState {
  loading: boolean;
  loaded: boolean;
  saving: boolean;
  error: string | null;
  actionError: string | null;
}

export interface CallStateConfig<Collection extends string> {
  collection: Collection;
}

export type NamedCallState<Collection extends string> = Record<`${Collection}CallState`, CallState>;

export type CallStateSignals<Collection extends string> = {
  [Key in keyof CallState as `${Collection}${Capitalize<Key>}`]: Signal<CallState[Key]>;
} & Record<`${Collection}State`, Signal<UIStateStatus<string>>>;

export type CallStateMethods<Collection extends string> = Record<
  `${Collection}StartCall`,
  (operation: CallOperation) => void
> &
  Record<`${Collection}CallSucceeded`, (operation: CallOperation) => void> &
  Record<`${Collection}CallFailed`, (operation: CallOperation, error: string) => void> &
  Record<`${Collection}FinishCall`, (operation: CallOperation) => void> &
  Record<`${Collection}SetLoaded`, () => void> &
  Record<`${Collection}DismissActionError`, () => void> &
  Record<`${Collection}ResetCallState`, () => void>;

export interface CallStateFeatureResult<Collection extends string> {
  state: NamedCallState<Collection>;
  props: CallStateSignals<Collection>;
  methods: CallStateMethods<Collection>;
}
