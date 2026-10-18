import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { AdjustmentReasonsApiService } from '../../../../data-access/services';
import { ADJUSTMENT_REASON_UPDATE_MESSAGE, AdjustmentReasonsStore } from '../../../../data-access/stores';
import type { AdjustmentReason } from '../../../../types';

@Component({
  selector: 'md-delete-reason-dialog',
  providers: [
    { provide: ADJUSTMENT_REASON_UPDATE_MESSAGE, useValue: 'Adjustment reason archived.' },
    AdjustmentReasonsApiService,
    AdjustmentReasonsStore,
  ],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-reason-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteReasonDialog {
  private readonly store = inject(AdjustmentReasonsStore);
  private readonly dialogRef = inject<MatDialogRef<DeleteReasonDialog, AdjustmentReason>>(MatDialogRef);

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
      .update({ id: this.record.id, payload: { active: false } })
      .pipe(
        finalize(() => {
          this.dialogRef.disableClose = false;
        }),
      )
      .subscribe(saved => {
        this.dialogRef.close(saved);
      });
  }
}
