import type { OnInit } from '@angular/core';
import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AccessApiService, AccessStore, RolesStore, UsersStore } from '@warehouse/access-management/data-access';
import type { RoleAssignmentRecord, UserRecord } from '@warehouse/access-management/util';
import { ConfirmDialog, UIStateContainerComponent } from '@warehouse/shared';
import { concatMap, filter, finalize, forkJoin, tap } from 'rxjs';

import type { RoleAssignmentDialogData } from '../../types';
import { AccountLinkDialog, RoleAssignmentDialog } from '..';

@Component({
  providers: [AccessApiService, AccessStore, RolesStore, UsersStore],
  selector: 'am-user-access-editor',
  imports: [UIStateContainerComponent, MatButtonModule, MatCardModule, MatTableModule],
  templateUrl: './user-access-editor.html',
})
export class UserAccessEditor implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rolesStore = inject(RolesStore);
  private readonly accessStore = inject(AccessStore);
  private readonly usersStore = inject(UsersStore);
  readonly user = input.required<UserRecord>();
  private readonly dialogOpen = signal(false);
  readonly saving = this.accessStore.roleAssignmentsSaving;
  readonly loading = computed(() => this.rolesStore.loading() || this.accessStore.roleAssignmentsLoading());
  readonly busy = computed(() => this.loading() || this.saving() || this.dialogOpen());
  readonly roles = this.rolesStore.entities;
  readonly assignments = this.accessStore.roleAssignments.data;
  readonly auth0Subject = computed(() => (this.usersStore.entityById(this.user().id) ?? this.user()).auth0_subject);
  readonly displayedColumns = ['role', 'scope', 'scopeId', 'actions'];
  readonly state = computed(() => ({
    roles: { ...this.rolesStore.entityState(), empty: false },
    assignments: this.accessStore.roleAssignmentsState(),
  }));
  readonly actionError = this.accessStore.roleAssignmentsActionError;

  ngOnInit(): void {
    this.usersStore.upsert(this.user());
    this.load();
  }

  dismissActionError(): void {
    this.accessStore.dismissActionError();
  }

  load(): void {
    forkJoin([this.rolesStore.load(undefined), this.accessStore.listRoleAssignments(this.user().id)])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  roleName(id: string): string {
    return this.roles().find(role => role.id === id)?.name ?? id;
  }

  openLink(): void {
    if (this.busy() || this.auth0Subject()) {
      return;
    }

    const ref = this.dialog.open<AccountLinkDialog, UserRecord, UserRecord>(AccountLinkDialog, {
      data: this.user(),
      width: '560px',
      maxWidth: '95vw',
    });
    this.dialogOpen.set(true);
    ref
      .afterClosed()
      .pipe(
        filter((user): user is UserRecord => !!user),
        tap(user => {
          this.usersStore.upsert(user);
          this.snackBar.open('Account linked.', 'Dismiss', { duration: 4000 });
        }),
        finalize(() => {
          this.dialogOpen.set(false);
          ref.close();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  openAssignment(): void {
    if (this.busy()) {
      return;
    }

    const ref = this.dialog.open<RoleAssignmentDialog, RoleAssignmentDialogData, RoleAssignmentRecord>(
      RoleAssignmentDialog,
      {
        data: { userId: this.user().id, roles: this.roles() },
        width: '560px',
        maxWidth: '95vw',
      },
    );
    this.dialogOpen.set(true);
    ref
      .afterClosed()
      .pipe(
        filter((assignment): assignment is RoleAssignmentRecord => !!assignment),
        tap(() => this.snackBar.open('Role assigned.', 'Dismiss', { duration: 4000 })),
        concatMap(() => this.accessStore.listRoleAssignments(this.user().id)),
        finalize(() => {
          this.dialogOpen.set(false);
          ref.close();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  revoke(assignment: RoleAssignmentRecord): void {
    if (this.busy()) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Remove role?',
        message: `Remove ${this.roleName(assignment.role_id)} from this user? This assignment will no longer grant permissions.`,
        confirmText: 'Remove role',
      },
      autoFocus: 'first-tabbable',
    });
    this.dialogOpen.set(true);
    ref
      .afterClosed()
      .pipe(
        filter(confirmed => confirmed === true),
        concatMap(() => this.accessStore.revokeRoleAssignment(this.user().id, assignment.id)),
        tap(() => this.snackBar.open('Role removed.', 'Dismiss', { duration: 4000 })),
        finalize(() => {
          this.dialogOpen.set(false);
          ref.close();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
