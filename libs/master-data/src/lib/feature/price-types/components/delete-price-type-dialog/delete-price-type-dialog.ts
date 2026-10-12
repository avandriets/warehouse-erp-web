import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { PriceTypesAdapterService, PriceTypesApiService } from '../../../../data-access/services';
import { PriceTypesStore } from '../../../../data-access/stores';
import type { PriceType } from '../../../../types';

@Component({
  selector: 'md-delete-price-type-dialog',
  providers: [PriceTypesApiService, PriceTypesAdapterService, PriceTypesStore],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-price-type-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletePriceTypeDialog {
  private readonly store = inject(PriceTypesStore);
  private readonly dialogRef = inject<MatDialogRef<DeletePriceTypeDialog, boolean>>(MatDialogRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly record = inject<PriceType>(MAT_DIALOG_DATA);
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
        this.snackBar.open('Price type archived.', 'Dismiss', { duration: 4000 });
        this.dialogRef.close(true);
      });
  }
}
