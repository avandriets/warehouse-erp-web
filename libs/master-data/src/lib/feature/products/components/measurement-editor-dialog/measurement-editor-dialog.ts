import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { ProductDetailsApiService } from '../../../../data-access/services';
import { ProductMeasurementsStore } from '../../../../data-access/stores';
import type { Product, ProductMeasurement, Unit } from '../../../../types';
import { UnitSelect } from '../../../units/components';

@Component({
  selector: 'md-measurement-editor-dialog',
  providers: [ProductDetailsApiService, ProductMeasurementsStore],
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    UIStateContainerComponent,
    UnitSelect,
  ],
  templateUrl: './measurement-editor-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeasurementEditorDialog {
  private readonly store = inject(ProductMeasurementsStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly ref = inject<MatDialogRef<MeasurementEditorDialog, boolean>>(MatDialogRef);
  readonly data = inject<{ product: Product; record?: ProductMeasurement; units: Unit[] }>(MAT_DIALOG_DATA);
  readonly state = computed(() => ({ resolved: true, rejected: false, pending: this.store.saving(), err: null }));
  readonly actionError = this.store.actionError;
  readonly form = new FormGroup({
    unit_id: new FormControl<string | null>(this.data.record?.unit_id ?? null, Validators.required),
    storage_quantity: new FormControl(this.data.record?.storage_quantity ?? '1', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(?=\d{1,15}(?:\.\d{1,9})?$)(?=.*[1-9])\d+(?:\.\d+)?$/)],
    }),
    measured_quantity: new FormControl(this.data.record?.measured_quantity ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(?=\d{1,15}(?:\.\d{1,9})?$)(?=.*[1-9])\d+(?:\.\d+)?$/)],
    }),
    use: new FormControl<'REFERENCE_ONLY' | 'DOCUMENT'>(this.data.record?.use ?? 'REFERENCE_ONLY', {
      nonNullable: true,
    }),
    is_report_unit: new FormControl(this.data.record?.is_report_unit ?? false, { nonNullable: true }),
  });

  constructor() {
    if (this.data.record) {
      this.form.controls.unit_id.disable();
    }
  }

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
    if (!values.unit_id) {
      return;
    }

    this.ref.disableClose = true;
    this.form.disable({ emitEvent: false });
    const payload = {
      storage_quantity: values.storage_quantity,
      measured_quantity: values.measured_quantity,
      use: values.use,
      is_report_unit: values.is_report_unit,
    };
    const request = this.data.record
      ? this.store.update({
          id: this.data.record.id,
          payload: { productId: this.data.product.id, payload },
        })
      : this.store.create({ productId: this.data.product.id, payload: { ...payload, unit_id: values.unit_id } });
    request
      .pipe(
        finalize(() => {
          this.ref.disableClose = false;
          this.form.enable({ emitEvent: false });
          if (this.data.record) {
            this.form.controls.unit_id.disable();
          }
        }),
      )
      .subscribe(() => this.ref.close(true));
  }
}
