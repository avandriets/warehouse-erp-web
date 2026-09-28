import type { OnInit } from '@angular/core';
import { Component, computed, DestroyRef, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccessApiService, AccessStore, RolesStore, UsersStore } from '@warehouse/access-management/data-access';
import type { ScopeType, UserRecord } from '@warehouse/access-management/util';
import { UIStateContainerComponent } from '@warehouse/shared';
import { forkJoin, tap } from 'rxjs';

@Component({
  providers: [AccessApiService, AccessStore, RolesStore, UsersStore],
  selector: 'am-user-access-editor',
  imports: [
    ReactiveFormsModule,
    UIStateContainerComponent,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './user-access-editor.html',
})
export class UserAccessEditor implements OnInit {
  private readonly builder = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rolesStore = inject(RolesStore);
  private readonly accessStore = inject(AccessStore);
  private readonly usersStore = inject(UsersStore);
  readonly user = input.required<UserRecord>();
  readonly saving = computed(() => this.accessStore.roleAssignmentsSaving() || this.usersStore.saving());
  readonly loading = computed(() => this.rolesStore.loading() || this.accessStore.roleAssignmentsLoading());
  readonly busy = computed(() => this.loading() || this.saving());
  readonly roles = this.rolesStore.entities;
  readonly assignments = this.accessStore.roleAssignments.data;
  readonly auth0Subject = computed(() => (this.usersStore.entityById(this.user().id) ?? this.user()).auth0_subject);
  readonly linkForm = this.builder.nonNullable.group({
    subject: ['', [Validators.required, Validators.pattern(/\S/)]],
  });
  readonly assignmentForm = this.builder.nonNullable.group({
    roleId: ['', Validators.required],
    scope: this.builder.nonNullable.control<ScopeType>('GLOBAL'),
    scopeId: [
      { value: '', disabled: true },
      [
        Validators.required,
        Validators.pattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/),
      ],
    ],
  });
  readonly scope = toSignal(this.assignmentForm.controls.scope.valueChanges, { initialValue: 'GLOBAL' as ScopeType });

  readonly state = computed(() => ({
    roles: { ...this.rolesStore.entityState(), empty: false },
    assignments: this.accessStore.roleAssignmentsState(),
  }));
  readonly actionError = computed(() => this.usersStore.actionError() ?? this.accessStore.roleAssignmentsActionError());

  constructor() {
    effect(() => {
      const busy = this.busy();
      if (busy) {
        this.linkForm.disable({ emitEvent: false });
        this.assignmentForm.disable({ emitEvent: false });
      } else {
        this.linkForm.enable({ emitEvent: false });
        this.assignmentForm.enable({ emitEvent: false });
        if (this.scope() === 'GLOBAL') {
          this.assignmentForm.controls.scopeId.disable({ emitEvent: false });
        }
      }
    });
  }

  get canAssign(): boolean {
    return this.assignmentForm.valid && this.assignmentForm.dirty && !this.busy();
  }

  get canLink(): boolean {
    return this.linkForm.valid && this.linkForm.dirty && !this.busy();
  }

  ngOnInit(): void {
    this.usersStore.upsert(this.user());
    this.load();
  }

  dismissActionError(): void {
    this.usersStore.dismissActionError();
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

  link(): void {
    const id = this.user().id;
    if (!this.canLink) {
      return;
    }

    const subject = this.linkForm.getRawValue().subject.trim();
    this.usersStore
      .update({ id, payload: { auth0_subject: subject } })
      .pipe(
        tap(() => {
          this.linkForm.markAsPristine();
          this.snackBar.open('Changes saved.', 'Dismiss', { duration: 4000 });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  assign(): void {
    if (!this.canAssign) {
      return;
    }

    const value = this.assignmentForm.getRawValue();
    const payload = {
      role_id: value.roleId,
      scope_type: value.scope,
      scope_id: value.scope === 'GLOBAL' ? null : value.scopeId.trim(),
    };
    this.accessStore
      .assignRole(this.user().id, payload)
      .pipe(
        tap(() => {
          this.assignmentForm.markAsPristine();
          this.snackBar.open('Role assigned.', 'Dismiss', { duration: 4000 });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  revoke(assignmentId: string): void {
    this.accessStore
      .revokeRoleAssignment(this.user().id, assignmentId)
      .pipe(
        tap(() => this.snackBar.open('Role revoked.', 'Dismiss', { duration: 4000 })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
