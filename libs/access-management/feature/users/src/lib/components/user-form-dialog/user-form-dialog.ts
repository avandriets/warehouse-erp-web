import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UsersStore } from '@warehouse/access-management/data-access';
import type { UserRecord } from '@warehouse/access-management/util';
import { finalize, tap } from 'rxjs';

@Component({
  selector: 'am-user-form-dialog',
  providers: [UsersStore],
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './user-form-dialog.html',
})
export class UserFormDialog {
  private readonly builder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<UserFormDialog, UserRecord>);
  readonly record = inject<UserRecord | null>(MAT_DIALOG_DATA);
  readonly store = inject(UsersStore);
  readonly form = this.builder.nonNullable.group({
    email: [this.record?.email ?? '', [Validators.required, Validators.email, Validators.maxLength(320)]],
    first_name: [this.record?.first_name ?? '', Validators.maxLength(100)],
    last_name: [this.record?.last_name ?? '', Validators.maxLength(100)],
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
    const payload = {
      email: model.email.trim() || null,
      first_name: model.first_name.trim() || null,
      last_name: model.last_name.trim() || null,
    };
    const request = this.record ? this.store.update({ id: this.record.id, payload }) : this.store.create(payload);
    this.dialogRef.disableClose = true;
    request
      .pipe(
        tap(user => this.dialogRef.close(user)),
        finalize(() => {
          this.dialogRef.disableClose = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
