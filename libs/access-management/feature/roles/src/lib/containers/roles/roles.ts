import { Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RolesStore } from '@warehouse/access-management/data-access';
import { StatusBadge } from '@warehouse/access-management/ui';
import type { RoleRecord } from '@warehouse/access-management/util';
import { parseRolesQuery } from '@warehouse/access-management/util';
import { ConfirmDialog, Page, UIStateContainerComponent, UrlSearch } from '@warehouse/shared';
import { concatMap, distinctUntilChanged, filter, finalize, switchMap, tap } from 'rxjs';

import { RoleFormDialog, RolesFilter } from '../../components';

@Component({
  providers: [RolesStore],
  imports: [
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatDialogModule,
    MatIconModule,
    UrlSearch,
    RolesFilter,
    Page,
    UIStateContainerComponent,
    RouterLink,
    StatusBadge,
  ],
  templateUrl: './roles.html',
})
export class RolesPage {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(RolesStore);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly requestParams = computed(() => parseRolesQuery(this.params()));
  readonly roles = this.store.entities;
  readonly loading = this.store.loading;
  readonly saving = this.store.saving;
  readonly error = computed(() => this.store.actionError() ?? this.store.error() ?? '');
  readonly displayedColumns = ['code', 'name', 'active', 'actions'];

  readonly state = this.store.entityState;
  readonly actionError = this.store.actionError;

  constructor() {
    toObservable(this.requestParams)
      .pipe(
        distinctUntilChanged((previous, current) => previous.active === current.active && previous.q === current.q),
        switchMap(params => {
          this.store.reset();

          return this.store.load(params);
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  load(): void {
    this.store.load(this.requestParams()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  open(record: RoleRecord | null = null): void {
    const ref = this.dialog.open<RoleFormDialog, RoleRecord | null, RoleRecord>(RoleFormDialog, {
      data: record,
      width: '560px',
      maxWidth: '95vw',
    });
    ref
      .afterClosed()
      .pipe(
        filter((result): result is RoleRecord => Boolean(result)),
        tap(() => this.snackBar.open('Changes saved.', 'Dismiss', { duration: 4000 })),
        concatMap(() => this.store.load(this.requestParams())),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => ref.close()),
      )
      .subscribe();
  }

  deactivate(role: RoleRecord): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Deactivate role?',
        message: `Deactivate ${role.name}? This role will no longer grant permissions.`,
        confirmText: 'Deactivate',
      },
      autoFocus: 'first-tabbable',
    });
    ref
      .afterClosed()
      .pipe(
        filter(confirmed => confirmed === true),
        concatMap(() =>
          this.store.update({
            id: role.id,
            payload: { name: role.name, description: role.description, active: false },
          }),
        ),
        concatMap(() => this.store.load(this.requestParams())),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => ref.close()),
      )
      .subscribe();
  }
}
