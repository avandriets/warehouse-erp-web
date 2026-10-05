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
  selector: 'am-account-link-dialog',
  providers: [UsersStore],
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './account-link-dialog.html',
})
export class AccountLinkDialog {
  private readonly builder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<AccountLinkDialog, UserRecord>);
  readonly user = inject<UserRecord>(MAT_DIALOG_DATA);
  readonly store = inject(UsersStore);
  readonly form = this.builder.nonNullable.group({
    subject: ['', [Validators.required, Validators.pattern(/\S/)]],
  });
  readonly saving = this.store.saving;
  readonly actionError = this.store.actionError;

  get canSave(): boolean {
    return !this.user.auth0_subject && this.form.valid && this.form.dirty && !this.saving();
  }

  save(): void {
    if (!this.canSave) {
      return;
    }

    this.dialogRef.disableClose = true;
    this.store
      .update({ id: this.user.id, payload: { auth0_subject: this.form.getRawValue().subject.trim() } })
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
