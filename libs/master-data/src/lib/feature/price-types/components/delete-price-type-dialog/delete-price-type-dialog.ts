import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { PriceTypesApiService } from '../../../../data-access/services';
import { PRICE_TYPE_UPDATE_MESSAGE, PriceTypesStore } from '../../../../data-access/stores';
import type { PriceType } from '../../../../types';

@Component({
  selector: 'md-delete-price-type-dialog',
  providers: [
    { provide: PRICE_TYPE_UPDATE_MESSAGE, useValue: 'Price type archived.' },
    PriceTypesApiService,
    PriceTypesStore,
  ],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-price-type-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletePriceTypeDialog {
  private readonly store = inject(PriceTypesStore);
  private readonly dialogRef = inject<MatDialogRef<DeletePriceTypeDialog, PriceType>>(MatDialogRef);

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
        }),
      )
      .subscribe(saved => {
        this.dialogRef.close(saved);
      });
  }
}
