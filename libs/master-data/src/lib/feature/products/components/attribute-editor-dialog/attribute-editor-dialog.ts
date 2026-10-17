import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import type { ErrorStateMatcher } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { ProductsApiService } from '../../../../data-access/services';
import { PRODUCT_UPDATE_MESSAGE, ProductsStore } from '../../../../data-access/stores';
import type { Product, ProductAttributeEntry } from '../../../../types';
import { createAttributeForm, productAttributesPayload } from '../../util';

@Component({
  selector: 'md-attribute-editor-dialog',
  providers: [
    ProductsApiService,
    ProductsStore,
    { provide: PRODUCT_UPDATE_MESSAGE, useValue: 'Product attributes saved.' },
  ],
  imports: [
    UIStateContainerComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './attribute-editor-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeEditorDialog {
  private readonly ref = inject<MatDialogRef<AttributeEditorDialog, Product>>(MatDialogRef);
  private readonly store = inject(ProductsStore);
  readonly data = inject<{ product: Product; record?: ProductAttributeEntry; keys: string[] }>(MAT_DIALOG_DATA);
  readonly state = computed(() => ({ resolved: true, rejected: false, err: null, pending: this.store.saving() }));
  readonly actionError = this.store.actionError;
  readonly form = createAttributeForm(this.data.record, this.data.keys);
  readonly valueErrorMatcher: ErrorStateMatcher = {
    isErrorState: () => this.form.hasError('attributeValue') && this.form.controls.value.touched,
  };

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  save(): void {
    if (this.store.saving() || this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const row = this.form.getRawValue();
    const entries = Object.entries(this.data.product.attributes).filter(([key]) => key !== this.data.record?.key);
    const attributes = { ...Object.fromEntries(entries), ...productAttributesPayload([row]) };
    this.form.disable({ emitEvent: false });
    this.ref.disableClose = true;
    this.store
      .update({ id: this.data.product.id, payload: { attributes } })
      .pipe(
        finalize(() => {
          this.form.enable({ emitEvent: false });
          this.ref.disableClose = false;
        }),
      )
      .subscribe(product => this.ref.close(product));
  }
}
