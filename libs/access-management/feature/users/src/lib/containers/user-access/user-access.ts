import { Component, DestroyRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { signalStore } from '@ngrx/signals';
import { AccessManagementApiService } from '@warehouse/access-management/data-access';
import type { UserRecord } from '@warehouse/access-management/util';
import { apiError, Page, UIStateContainerComponent, withRequestData } from '@warehouse/shared';
import { distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';

import { UserAccessEditor } from '../../components';

const UserDetailsStore = signalStore(
  withRequestData<UserRecord, string>({
    adapter: () => {
      const api = inject(AccessManagementApiService);

      return { load: userId => api.getUser(userId) };
    },
    error: 'Could not load the user.',
    errorMessage: apiError,
  }),
);

@Component({
  providers: [UserDetailsStore],
  imports: [MatButtonModule, RouterLink, Page, UIStateContainerComponent, UserAccessEditor],
  templateUrl: './user-access.html',
})
export class UserAccessPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(UserDetailsStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly user = this.store.data;
  readonly state = this.store.requestState;
  readonly editor = viewChild(UserAccessEditor);

  constructor() {
    this.route.paramMap
      .pipe(
        map(params => params.get('userId')),
        filter((userId): userId is string => userId !== null),
        distinctUntilChanged(),
        tap(() => this.store.reset()),
        switchMap(userId => this.store.load(userId)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  load(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (userId) {
      this.store.load(userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }
}
