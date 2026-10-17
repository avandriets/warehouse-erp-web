import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, input } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UIStateContainerComponent } from '@warehouse/shared';
import { distinctUntilChanged } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { ProductDetailsApiService } from '../../../../data-access/services';
import { ProductMeasurementsStore } from '../../../../data-access/stores';
import type { Product, ProductMeasurement, Unit } from '../../../../types';
import { ArchiveProductDetailDialog } from '../archive-product-detail-dialog/archive-product-detail-dialog';
import { MeasurementEditorDialog } from '../measurement-editor-dialog/measurement-editor-dialog';

@Component({
  selector: 'md-product-measurements',
  providers: [ProductDetailsApiService, ProductMeasurementsStore],
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatCardModule, MatTableModule, UIStateContainerComponent],
  templateUrl: './product-measurements.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductMeasurements {
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly measurementStore = inject(ProductMeasurementsStore);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  readonly product = input.required<Product>();
  readonly disabled = input(false);
  readonly units = input<Unit[]>([]);
  readonly measurements = this.measurementStore.entities;
  readonly measurementState = computed(() => ({
    ...this.measurementStore.entityState(),
    pending: this.measurementStore.entityState().pending || this.measurementStore.saving(),
  }));
  readonly measurementError = this.measurementStore.actionError;
  readonly canCreate = computed(() => this.product().active && this.config.hasPermission('catalog.create'));
  readonly canEdit = computed(() => this.config.hasPermission('catalog.edit'));
  readonly measurementColumns = ['conversion', 'use', 'report', 'status', 'actions'];

  constructor() {
    toObservable(this.product)
      .pipe(
        distinctUntilChanged((a, b) => a.id === b.id && a.package_set_id === b.package_set_id),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.measurementStore.reset();
        this.loadMeasurements();
      });
  }

  loadMeasurements(): void {
    this.measurementStore.load(this.product().id).subscribe();
  }

  dismissMeasurementError(): void {
    this.measurementStore.dismissActionError();
  }

  editMeasurement(record?: ProductMeasurement): void {
    if (
      this.disabled() ||
      this.measurementState().pending ||
      !this.product().active ||
      (record ? !this.canEdit() : !this.canCreate())
    ) {
      return;
    }

    this.dialog
      .open<MeasurementEditorDialog, { product: Product; record?: ProductMeasurement; units: Unit[] }, boolean>(
        MeasurementEditorDialog,
        {
          width: '560px',
          maxWidth: '95vw',
          injector: this.injector,
          data: { product: this.product(), record, units: this.units() },
        },
      )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(saved => {
        if (saved) {
          this.loadMeasurements();
        }
      });
  }

  restore(record: ProductMeasurement): void {
    if (
      this.disabled() ||
      !this.canEdit() ||
      !this.product().active ||
      record.active ||
      this.measurementState().pending
    ) {
      return;
    }

    this.measurementStore
      .update({
        id: record.id,
        payload: { productId: this.product().id, payload: { active: true } },
      })
      .subscribe();
  }

  archive(record: ProductMeasurement): void {
    if (this.disabled() || !this.canEdit() || !record.active || this.measurementState().pending) {
      return;
    }

    this.dialog
      .open(ArchiveProductDetailDialog, {
        width: '480px',
        maxWidth: '95vw',
        injector: this.injector,
        data: { kind: 'measurement', record, productId: this.product().id },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(done => {
        if (done) {
          this.loadMeasurements();
        }
      });
  }
}
