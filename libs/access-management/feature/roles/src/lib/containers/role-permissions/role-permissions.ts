import { Component, DestroyRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { signalStore } from '@ngrx/signals';
import { AccessManagementApiService } from '@warehouse/access-management/data-access';
import type { RoleRecord } from '@warehouse/access-management/util';
import { apiError, PageLayout, UIStateContainerComponent, withRequestData } from '@warehouse/shared';
import { distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';

import { RolePermissionsEditor } from '../../components';

const RoleDetailsStore = signalStore(
  withRequestData<RoleRecord, string>({
    adapter: () => {
      const api = inject(AccessManagementApiService);

      return { load: roleId => api.getRole(roleId) };
    },
    error: 'Could not load the role.',
    errorMessage: apiError,
  }),
);

@Component({
  providers: [RoleDetailsStore],
  imports: [MatButtonModule, RouterLink, PageLayout, UIStateContainerComponent, RolePermissionsEditor],
  templateUrl: './role-permissions.html',
})
export class RolePermissionsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(RoleDetailsStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly role = this.store.data;
  readonly state = this.store.requestState;
  readonly editor = viewChild(RolePermissionsEditor);

  constructor() {
    this.route.paramMap
      .pipe(
        map(params => params.get('roleId')),
        filter((roleId): roleId is string => roleId !== null),
        distinctUntilChanged(),
        tap(() => this.store.reset()),
        switchMap(roleId => this.store.load(roleId)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  load(): void {
    const roleId = this.route.snapshot.paramMap.get('roleId');
    if (roleId) {
      this.store.load(roleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }
}
