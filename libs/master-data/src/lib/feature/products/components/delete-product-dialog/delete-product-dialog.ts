import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { ProductsApiService } from '../../../../data-access/services';
import { PRODUCT_UPDATE_MESSAGE, ProductsStore } from '../../../../data-access/stores';
import type { Product } from '../../../../types';

@Component({
  selector: 'md-delete-product-dialog',
  providers: [ProductsApiService, ProductsStore, { provide: PRODUCT_UPDATE_MESSAGE, useValue: 'Product archived.' }],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-product-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteProductDialog {
  private readonly store = inject(ProductsStore);
  private readonly dialogRef = inject<MatDialogRef<DeleteProductDialog, Product>>(MatDialogRef);

  readonly record = inject<Product>(MAT_DIALOG_DATA);
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
      .subscribe(product => {
        this.dialogRef.close(product);
      });
  }
}
