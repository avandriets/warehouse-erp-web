import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { AdjustmentReasonsAdapterService, AdjustmentReasonsApiService } from '../../../../data-access/services';
import { AdjustmentReasonsStore } from '../../../../data-access/stores';
import type { AdjustmentReason } from '../../../../types';

@Component({
  selector: 'md-delete-reason-dialog',
  providers: [AdjustmentReasonsApiService, AdjustmentReasonsAdapterService, AdjustmentReasonsStore],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-reason-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteReasonDialog {
  private readonly store = inject(AdjustmentReasonsStore);
  private readonly dialogRef = inject<MatDialogRef<DeleteReasonDialog, boolean>>(MatDialogRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly record = inject<AdjustmentReason>(MAT_DIALOG_DATA);
  readonly actionError = this.store.actionError;
  readonly state = computed(() => ({ resolved: true, rejected: false, pending: this.store.saving(), err: null }));

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  confirm(): void {
    if (this.store.saving()) {
      return;
    }

    this.dialogRef.disableClose = true;
    this.store
      .update({ id: this.record.id, payload: { active: false, expected_version: this.record.version } })
      .pipe(
        finalize(() => {
          this.dialogRef.disableClose = false;
          if (!this.destroyRef.destroyed && this.store.actionError()) {
            this.snackBar.open(this.store.actionError()!, 'Dismiss', { duration: 6000 });
          }
        }),
      )
      .subscribe(() => {
        this.snackBar.open('Adjustment reason archived.', 'Dismiss', { duration: 4000 });
        this.dialogRef.close(true);
      });
  }
}
