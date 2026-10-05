import { Component, DestroyRef, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AccessApiService, AccessStore } from '@warehouse/access-management/data-access';
import type { RoleAssignmentRecord, ScopeType } from '@warehouse/access-management/util';
import { finalize, tap } from 'rxjs';

import type { RoleAssignmentDialogData } from '../../types';

@Component({
  selector: 'am-role-assignment-dialog',
  providers: [AccessApiService, AccessStore],
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './role-assignment-dialog.html',
})
export class RoleAssignmentDialog {
  private readonly builder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<RoleAssignmentDialog, RoleAssignmentRecord>);
  readonly data = inject<RoleAssignmentDialogData>(MAT_DIALOG_DATA);
  private readonly store = inject(AccessStore);
  readonly roles = this.data.roles.filter(role => role.active);
  readonly form = this.builder.nonNullable.group({
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
  readonly scope = toSignal(this.form.controls.scope.valueChanges, { initialValue: 'GLOBAL' as ScopeType });
  readonly saving = this.store.roleAssignmentsSaving;
  readonly actionError = this.store.roleAssignmentsActionError;

  constructor() {
    effect(() => {
      if (this.saving()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        if (this.scope() === 'GLOBAL') {
          this.form.controls.scopeId.disable({ emitEvent: false });
        }
      }
    });
  }

  get canSave(): boolean {
    return (
      this.form.valid &&
      this.form.dirty &&
      !this.saving() &&
      this.roles.some(role => role.id === this.form.controls.roleId.value)
    );
  }

  save(): void {
    if (!this.canSave) {
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.disableClose = true;
    this.store
      .assignRole(this.data.userId, {
        role_id: value.roleId,
        scope_type: value.scope,
        scope_id: value.scope === 'GLOBAL' ? null : value.scopeId.trim(),
      })
      .pipe(
        tap(assignment => this.dialogRef.close(assignment)),
        finalize(() => {
          this.dialogRef.disableClose = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
