import type { OnChanges } from '@angular/core';
import { Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccessManagementApiService, UserAccessStore } from '@warehouse/access-management/data-access';
import type { ScopeType, UserRecord } from '@warehouse/access-management/util';
import { UIStateContainerComponent } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { concatMap, Subject, takeUntil, tap } from 'rxjs';

@Component({
  providers: [UserAccessStore],
  selector: 'am-user-access',
  imports: [
    ReactiveFormsModule,
    UIStateContainerComponent,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './user-access.html',
})
export class UserAccess implements OnChanges {
  private readonly builder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef, { optional: true });
  private readonly snackBar = inject(MatSnackBar);
  private readonly api = inject(AccessManagementApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(UserAccessStore);
  readonly user = input.required<UserRecord>();
  readonly closed = output<void>();
  readonly updated = output<UserRecord>();
  private readonly selectionChanged = new Subject<void>();
  readonly busy = computed(() => this.store.loading() || this.store.saving());
  readonly loading = this.store.loading;
  readonly error = computed(() => this.store.actionError() ?? this.store.error() ?? '');
  readonly roles = this.store.roles;
  readonly assignments = this.store.assignments;
  readonly linkedUser = signal<UserRecord | null>(null);
  readonly auth0Subject = computed(() => this.linkedUser()?.auth0_subject ?? this.user().auth0_subject);
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

  readonly state = this.store.requestState;
  readonly actionError = this.store.actionError;

  constructor() {
    effect(() => {
      const busy = this.busy();
      if (this.dialogRef) this.dialogRef.disableClose = this.store.saving();
      if (busy) {
        this.linkForm.disable({ emitEvent: false });
        this.assignmentForm.disable({ emitEvent: false });
      } else {
        this.linkForm.enable({ emitEvent: false });
        this.assignmentForm.enable({ emitEvent: false });
        if (this.scope() === 'GLOBAL') this.assignmentForm.controls.scopeId.disable({ emitEvent: false });
      }
    });
  }

  ngOnChanges(): void {
    this.selectionChanged.next();
    this.store.reset();
    this.store.resetMutation();
    this.linkedUser.set(null);
    this.linkForm.reset();
    this.assignmentForm.reset();
    this.load();
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  load(): void {
    this.store
      .load(this.user().id)
      .pipe(takeUntil(this.selectionChanged), takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  roleName(id: string): string {
    return this.roles().find(role => role.id === id)?.name ?? id;
  }

  link(): void {
    const id = this.user().id;
    if (this.linkForm.invalid) return;
    const subject = this.linkForm.getRawValue().subject.trim();
    this.mutate(
      () => this.api.linkAuth0(id, subject),
      user => {
        this.linkedUser.set(user);
        this.updated.emit(user);
      },
    );
  }

  assign(): void {
    const id = this.user().id;
    if (this.assignmentForm.invalid) return;
    const value = this.assignmentForm.getRawValue();
    const payload = {
      role_id: value.roleId,
      scope_type: value.scope,
      scope_id: value.scope === 'GLOBAL' ? null : value.scopeId.trim(),
    };
    this.mutate(() => this.api.assignRole(id, payload));
  }

  revoke(assignmentId: string): void {
    const id = this.user().id;
    this.mutate(() => this.api.revokeRoleAssignment(id, assignmentId));
  }

  private mutate<T>(action: () => Observable<T>, apply?: (data: T) => void): void {
    const userId = this.user().id;
    this.store
      .mutate(action)
      .pipe(
        tap(result => {
          apply?.(result.data);
          this.snackBar.open('Changes saved.', 'Dismiss', { duration: 4000 });
        }),
        concatMap(() => this.store.load(userId)),
        takeUntil(this.selectionChanged),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
