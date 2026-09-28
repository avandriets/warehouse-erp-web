import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RolesStore } from '@warehouse/access-management/data-access';
import type { RoleRecord } from '@warehouse/access-management/util';
import { finalize, tap } from 'rxjs';

@Component({
  selector: 'am-role-form-dialog',
  providers: [RolesStore],
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './role-form-dialog.html',
})
export class RoleFormDialog {
  private readonly builder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<RoleFormDialog, boolean>);
  readonly record = inject<RoleRecord | null>(MAT_DIALOG_DATA);
  readonly store = inject(RolesStore);
  readonly form = this.builder.nonNullable.group({
    code: [
      { value: this.record?.code ?? '', disabled: !!this.record },
      [Validators.required, Validators.pattern('[A-Za-z][A-Za-z0-9_]{1,63}')],
    ],
    name: [this.record?.name ?? '', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: [this.record?.description ?? ''],
    active: [this.record?.active ?? true],
  });

  readonly actionError = this.store.actionError;
  readonly saving = this.store.saving;

  get canSave(): boolean {
    return this.form.valid && this.form.dirty && !this.saving();
  }

  save(): void {
    if (!this.canSave) {
      return;
    }

    const model = this.form.getRawValue();
    const payload = { name: model.name.trim(), description: model.description.trim() || null };
    const request = this.record
      ? this.store.update({ id: this.record.id, payload: { ...payload, active: model.active } })
      : this.store.create({ ...payload, code: model.code.trim() });
    this.dialogRef.disableClose = true;
    request
      .pipe(
        tap(() => this.dialogRef.close(true)),
        finalize(() => {
          this.dialogRef.disableClose = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
