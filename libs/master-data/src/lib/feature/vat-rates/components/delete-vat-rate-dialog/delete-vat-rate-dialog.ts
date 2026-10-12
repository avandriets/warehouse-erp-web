import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { VatRatesApiService } from '../../../../data-access/services';
import { VAT_RATE_UPDATE_MESSAGE, VatRatesStore } from '../../../../data-access/stores';
import type { VatRate } from '../../../../types';

@Component({
  selector: 'md-delete-vat-rate-dialog',
  providers: [VatRatesApiService, VatRatesStore, { provide: VAT_RATE_UPDATE_MESSAGE, useValue: 'VAT rate archived.' }],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-vat-rate-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteVatRateDialog {
  private readonly store = inject(VatRatesStore);
  private readonly dialogRef = inject<MatDialogRef<DeleteVatRateDialog, boolean>>(MatDialogRef);

  readonly record = inject<VatRate>(MAT_DIALOG_DATA);
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
      .subscribe(() => {
        this.dialogRef.close(true);
      });
  }
}
