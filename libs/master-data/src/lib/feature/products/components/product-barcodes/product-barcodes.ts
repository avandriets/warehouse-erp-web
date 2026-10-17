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
import { ProductBarcodesStore } from '../../../../data-access/stores';
import type { Product, ProductBarcode, ProductPackage } from '../../../../types';
import { ArchiveProductDetailDialog } from '../archive-product-detail-dialog/archive-product-detail-dialog';
import { BarcodeEditorDialog } from '../barcode-editor-dialog/barcode-editor-dialog';

@Component({
  selector: 'md-product-barcodes',
  providers: [ProductDetailsApiService, ProductBarcodesStore],
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatCardModule, MatTableModule, UIStateContainerComponent],
  templateUrl: './product-barcodes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductBarcodes {
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly barcodeStore = inject(ProductBarcodesStore);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  readonly product = input.required<Product>();
  readonly disabled = input(false);
  readonly packages = input<ProductPackage[]>([]);
  readonly barcodes = this.barcodeStore.entities;
  readonly barcodeState = computed(() => ({
    ...this.barcodeStore.entityState(),
    pending: this.barcodeStore.entityState().pending || this.barcodeStore.saving(),
  }));
  readonly barcodeError = this.barcodeStore.actionError;
  readonly canCreate = computed(() => this.product().active && this.config.hasPermission('catalog.create'));
  readonly canEdit = computed(() => this.config.hasPermission('catalog.edit'));
  readonly barcodeColumns = ['value', 'package', 'status', 'actions'];

  constructor() {
    toObservable(this.product)
      .pipe(
        distinctUntilChanged((a, b) => a.id === b.id && a.package_set_id === b.package_set_id),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.barcodeStore.reset();
        this.loadBarcodes();
      });
  }

  packageName(id: string | null): string {
    return id ? (this.packages().find(item => item.id === id)?.name ?? 'Linked package') : 'Storage unit';
  }

  loadBarcodes(): void {
    this.barcodeStore.load(this.product().id).subscribe();
  }

  dismissBarcodeError(): void {
    this.barcodeStore.dismissActionError();
  }

  editBarcode(record?: ProductBarcode): void {
    if (
      this.disabled() ||
      this.barcodeState().pending ||
      !this.product().active ||
      (record ? !this.canEdit() : !this.canCreate())
    ) {
      return;
    }

    this.dialog
      .open<BarcodeEditorDialog, { product: Product; record?: ProductBarcode; packages: ProductPackage[] }, boolean>(
        BarcodeEditorDialog,
        {
          width: '560px',
          maxWidth: '95vw',
          injector: this.injector,
          data: { product: this.product(), record, packages: this.packages() },
        },
      )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(saved => {
        if (saved) {
          this.loadBarcodes();
        }
      });
  }

  restore(record: ProductBarcode): void {
    if (this.disabled() || !this.canEdit() || !this.product().active || record.active || this.barcodeState().pending) {
      return;
    }

    this.barcodeStore
      .update({
        id: record.id,
        payload: { productId: this.product().id, payload: { active: true } },
      })
      .subscribe();
  }

  archive(record: ProductBarcode): void {
    if (this.disabled() || !this.canEdit() || !record.active || this.barcodeState().pending) {
      return;
    }

    this.dialog
      .open(ArchiveProductDetailDialog, {
        width: '480px',
        maxWidth: '95vw',
        injector: this.injector,
        data: { kind: 'barcode', record, productId: this.product().id },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(done => {
        if (done) {
          this.loadBarcodes();
        }
      });
  }
}
