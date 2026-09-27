import type { TemplateRef } from '@angular/core';
import { Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersStore } from '@warehouse/access-management/data-access';
import { StatusBadge } from '@warehouse/access-management/ui';
import type { UserRecord } from '@warehouse/access-management/util';
import { parseUsersQuery, USERS_PAGE_SIZE } from '@warehouse/access-management/util';
import { ConfirmDialog, Page, UIStateContainerComponent, UrlSearch } from '@warehouse/shared';
import { concatMap, distinctUntilChanged, filter, finalize, of, switchMap, tap } from 'rxjs';

import { UserAccess, UserFormDialog, UsersFilter } from '../../components';

@Component({
  providers: [UsersStore],
  imports: [
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatDialogModule,
    MatIconModule,
    UrlSearch,
    UsersFilter,
    Page,
    UIStateContainerComponent,
    StatusBadge,
    UserAccess,
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
  readonly displayedColumns = ['display_name', 'email', 'status', 'actions'];
  readonly pageSize = USERS_PAGE_SIZE;

  readonly query = computed(() => this.params().get('q') ?? '');
  readonly offset = computed(() => this.requestParams().offset);

  readonly state = this.store.entityState;
  readonly actionError = this.store.actionError;

  readonly visibleUsers = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.users();

    return this.users().filter(user =>
      [user.display_name, user.email, user.status].some(value => value?.toLowerCase().includes(query)),
    );
  });

  constructor() {
    toObservable(this.requestParams)
      .pipe(
        distinctUntilChanged(
          (previous, current) => previous.offset === current.offset && previous.status === current.status,
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
    const ref = this.dialog.open(UserFormDialog, { data: record, width: '560px', maxWidth: '95vw' });

    ref
      .afterClosed()
      .pipe(
        filter(result => result === true),
        tap(() => this.snackBar.open('Changes saved.', 'Dismiss', { duration: 4000 })),
        concatMap(() => this.store.load(this.requestParams())),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => ref.close()),
      )
      .subscribe();
  }

  openDetails(template: TemplateRef<unknown>, record: UserRecord): void {
    const ref = this.dialog.open(template, { data: record, width: '800px', maxWidth: '95vw' });
    ref
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => ref.close()),
      )
      .subscribe();
  }

  userUpdated(user: UserRecord): void {
    this.store.upsert(user);
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

  page(delta: number): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { offset: Math.max(0, this.offset() + delta * this.pageSize) || null },
      queryParamsHandling: 'merge',
    });
  }
}
