import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { EmptyFeatureResult, SignalStoreFeature } from '@ngrx/signals';
import { signalStoreFeature, type } from '@ngrx/signals';
import type { EventCreator } from '@ngrx/signals/events';
import { Events, withEventHandlers } from '@ngrx/signals/events';
import type { Observable } from 'rxjs';
import { EMPTY, filter, tap } from 'rxjs';

import type { EntityDataEvents, EntityDataFailure, EntityNotificationMessages, EntityRequestOwner } from '../types';

export function withEntityNotifications<TEntity>(
  creators: EntityDataEvents<TEntity>,
  messages: () => EntityNotificationMessages,
): SignalStoreFeature<EmptyFeatureResult & { methods: Pick<EntityRequestOwner, 'ownsRequest'> }, EmptyFeatureResult> {
  return signalStoreFeature(
    { methods: type<Pick<EntityRequestOwner, 'ownsRequest'>>() },
    withEventHandlers(store => {
      const events = inject(Events);
      const snackBar = inject(MatSnackBar);
      const success = messages();
      const failures = [
        creators.loadFailed,
        creators.retrieveFailed,
        creators.createFailed,
        creators.updateFailed,
        creators.removeFailed,
      ].filter((creator): creator is EventCreator<string, EntityDataFailure> => !!creator);
      const notifySuccess = <TData>(
        creator: EventCreator<string, { correlationId: string; data: TData }> | undefined,
        message: string | null | undefined,
      ): Observable<unknown> =>
        creator && message
          ? events.on(creator).pipe(
              filter(({ payload }) => store.ownsRequest(payload.correlationId)),
              tap(() => snackBar.open(message, 'Dismiss', { duration: 4000 })),
            )
          : EMPTY;

      return {
        errors: failures.length
          ? events.on(...failures).pipe(
              filter(({ payload }) => store.ownsRequest(payload.correlationId)),
              tap(({ payload }) => snackBar.open(payload.message, 'Dismiss', { duration: 6000 })),
            )
          : EMPTY,
        created: notifySuccess(creators.created, success.created),
        updated: notifySuccess(creators.updated, success.updated),
        removed: notifySuccess(creators.removed, success.removed),
      };
    }),
  );
}
