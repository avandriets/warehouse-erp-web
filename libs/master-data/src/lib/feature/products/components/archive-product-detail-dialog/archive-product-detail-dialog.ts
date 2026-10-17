import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs';

import { ProductDetailsApiService } from '../../../../data-access/services';
import { ProductBarcodesStore, ProductMeasurementsStore } from '../../../../data-access/stores';
import type { ProductBarcode, ProductMeasurement } from '../../../../types';

@Component({
  selector: 'md-archive-product-detail-dialog',
  providers: [ProductDetailsApiService, ProductBarcodesStore, ProductMeasurementsStore],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './archive-product-detail-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchiveProductDetailDialog {
  private readonly barcodes = inject(ProductBarcodesStore);
  private readonly measurements = inject(ProductMeasurementsStore);
  private readonly ref = inject<MatDialogRef<ArchiveProductDetailDialog, boolean>>(MatDialogRef);
  readonly data = inject<{
    kind: 'barcode' | 'measurement';
    record: ProductBarcode | ProductMeasurement;
    productId: string;
  }>(MAT_DIALOG_DATA);
  readonly state = computed(() => ({
    resolved: true,
    rejected: false,
    pending: this.barcodes.saving() || this.measurements.saving(),
    err: null,
  }));
  readonly actionError = computed(() => this.barcodes.actionError() || this.measurements.actionError());

  dismissError(): void {
    this.barcodes.dismissActionError();
    this.measurements.dismissActionError();
  }

  confirm(): void {
    if (this.state().pending) {
      return;
    }

    this.ref.disableClose = true;
    const update = { id: this.data.record.id, payload: { productId: this.data.productId, payload: { active: false } } };
    const request: Observable<ProductBarcode | ProductMeasurement> =
      this.data.kind === 'barcode' ? this.barcodes.update(update) : this.measurements.update(update);
    request
      .pipe(
        finalize(() => {
          this.ref.disableClose = false;
        }),
      )
      .subscribe(() => this.ref.close(true));
  }
}
