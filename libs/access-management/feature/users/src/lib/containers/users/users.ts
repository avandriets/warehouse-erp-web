import { Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { PageEvent } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsersStore } from '@warehouse/access-management/data-access';
import { StatusBadge } from '@warehouse/access-management/ui';
import type { UserRecord } from '@warehouse/access-management/util';
import { parseUsersQuery, USERS_PAGE_SIZE, USERS_PAGE_SIZES } from '@warehouse/access-management/util';
import { ConfirmDialog, PageLayout, QueryParamSearch, UIStateContainerComponent } from '@warehouse/shared';
import { concatMap, distinctUntilChanged, filter, finalize, of, switchMap, tap } from 'rxjs';

import { UserFormDialog, UsersFilter } from '../../components';

@Component({
  providers: [UsersStore],
  imports: [
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    QueryParamSearch,
    UsersFilter,
    PageLayout,
    UIStateContainerComponent,
    StatusBadge,
    RouterLink,
  ],
  templateUrl: './users.html',
})
export class UsersPage {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(UsersStore);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly requestParams = computed(() => parseUsersQuery(this.params()));
  readonly users = this.store.entities;
  readonly loading = this.store.loading;
  readonly saving = this.store.saving;
  readonly error = computed(() => this.store.actionError() ?? this.store.error() ?? '');
  readonly displayedColumns = ['user', 'authentication', 'status', 'actions'];
  readonly pageSizeOptions = USERS_PAGE_SIZES;

  readonly offset = computed(() => this.requestParams().offset);
  readonly pageSize = computed(() => this.requestParams().limit);
  readonly pageIndex = computed(() => Math.floor(this.offset() / this.pageSize()));
  readonly total = computed(() => this.store.pagination().total ?? 0);

  readonly state = this.store.entityState;
  readonly actionError = this.store.actionError;

  constructor() {
    toObservable(this.requestParams)
      .pipe(
        distinctUntilChanged(
          (previous, current) =>
            previous.limit === current.limit &&
            previous.offset === current.offset &&
            previous.status === current.status &&
            previous.q === current.q,
        ),
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

  open(record: UserRecord | null = null): void {
    const ref = this.dialog.open<UserFormDialog, UserRecord | null, UserRecord>(UserFormDialog, {
      data: record,
      width: '560px',
      maxWidth: '95vw',
    });

    ref
      .afterClosed()
      .pipe(
        filter((result): result is UserRecord => Boolean(result)),
        tap(() => this.snackBar.open('Changes saved.', 'Dismiss', { duration: 4000 })),
        concatMap(() => this.store.load(this.requestParams())),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => ref.close()),
      )
      .subscribe();
  }

  changeStatus(user: UserRecord): void {
    const ref =
      user.status === 'ACTIVE'
        ? this.dialog.open(ConfirmDialog, {
            data: {
              title: 'Suspend user?',
              message: `Suspend ${user.display_name || user.email || 'this user'}? ERP access will be blocked.`,
              confirmText: 'Suspend',
            },
            autoFocus: 'first-tabbable',
          })
        : null;
    const confirmation = ref?.afterClosed() ?? of(true);

    confirmation
      .pipe(
        filter(confirmed => confirmed === true),
        concatMap(() =>
          this.store.update({ id: user.id, payload: { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } }),
        ),
        concatMap(() => this.store.load(this.requestParams())),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => ref?.close()),
      )
      .subscribe();
  }

  page(event: PageEvent): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        limit: event.pageSize === USERS_PAGE_SIZE ? null : event.pageSize,
        offset: event.pageIndex * event.pageSize || null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
