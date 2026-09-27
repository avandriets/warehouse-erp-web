export interface UIStateStatus<TError = unknown> {
  resolved: boolean;
  rejected: boolean;
  pending: boolean;
  err: TError | null;
  empty?: boolean;
}

export type UIState<TError = unknown> =
  UIStateStatus<TError> | readonly UIStateStatus<TError>[] | Readonly<Record<string, UIStateStatus<TError>>>;
