import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { ProductDetailsApiService } from '../../../../data-access/services';
import { ProductBarcodesStore } from '../../../../data-access/stores';
import type { Product, ProductBarcode, ProductPackage } from '../../../../types';

@Component({
  selector: 'md-barcode-editor-dialog',
  providers: [ProductDetailsApiService, ProductBarcodesStore],
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    UIStateContainerComponent,
  ],
  templateUrl: './barcode-editor-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeEditorDialog {
  private readonly store = inject(ProductBarcodesStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly ref = inject<MatDialogRef<BarcodeEditorDialog, boolean>>(MatDialogRef);
  readonly data = inject<{ product: Product; record?: ProductBarcode; packages: ProductPackage[] }>(MAT_DIALOG_DATA);
  readonly state = computed(() => ({ resolved: true, rejected: false, pending: this.store.saving(), err: null }));
  readonly actionError = this.store.actionError;
  readonly form = new FormGroup({
    value: new FormControl(this.data.record?.value ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(128)],
    }),
    package_id: new FormControl<string | null>(this.data.record?.package_id ?? null),
  });
  readonly packages = this.data.packages.filter(item => item.active || item.id === this.data.record?.package_id);

  readonly currentPackageMissing =
    !!this.data.record?.package_id && !this.packages.some(item => item.id === this.data.record?.package_id);

  dismissError(): void {
    this.store.dismissActionError();
  }

  save(): void {
    if (
      !this.data.product.active ||
      !this.config.hasPermission(this.data.record ? 'catalog.edit' : 'catalog.create') ||
      this.state().pending ||
      this.form.invalid
    ) {
      this.form.markAllAsTouched();

      return;
    }

    const values = this.form.getRawValue();
    this.ref.disableClose = true;
    this.form.disable({ emitEvent: false });
    const payload = { value: values.value.trim(), package_id: values.package_id };
    const request = this.data.record
      ? this.store.update({
          id: this.data.record.id,
          payload: { productId: this.data.product.id, payload },
        })
      : this.store.create({ productId: this.data.product.id, payload });
    request
      .pipe(
        finalize(() => {
          this.ref.disableClose = false;
          this.form.enable({ emitEvent: false });
        }),
      )
      .subscribe(() => this.ref.close(true));
  }
}
