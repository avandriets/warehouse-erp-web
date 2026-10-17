import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialog, UIStateContainerComponent } from '@warehouse/shared';
import { EMPTY, finalize, switchMap } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { ProductsApiService } from '../../../../data-access/services';
import { PRODUCT_UPDATE_MESSAGE, ProductsStore } from '../../../../data-access/stores';
import type { Product, ProductAttributeEntry } from '../../../../types';
import { productAttributeEntry } from '../../util';
import { AttributeEditorDialog } from '../attribute-editor-dialog/attribute-editor-dialog';

@Component({
  selector: 'md-product-attributes',
  providers: [
    ProductsApiService,
    ProductsStore,
    { provide: PRODUCT_UPDATE_MESSAGE, useValue: 'Product attributes saved.' },
  ],
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatTableModule, MatTooltipModule, UIStateContainerComponent],
  templateUrl: './product-attributes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductAttributes {
  private readonly store = inject(ProductsStore);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly config = inject(MASTER_DATA_CONFIG);
  readonly product = input.required<Product>();
  readonly disabled = input(false);
  readonly saved = output<Product>();
  readonly saving = output<boolean>();
  private readonly busy = signal(false);
  readonly rows = computed(() =>
    Object.entries(this.product().attributes).map(([key, value]) => productAttributeEntry(key, value)),
  );
  readonly canEdit = computed(() => this.product().active && this.config.hasPermission('catalog.edit'));
  readonly state = computed(() => ({ resolved: true, rejected: false, err: null, pending: this.busy() }));
  readonly actionError = this.store.actionError;
  readonly attributeColumns = ['key', 'type', 'value', 'actions'];
  readonly attributeTypes: Readonly<Record<string, string>> = {
    text: 'Text',
    number: 'Number',
    boolean: 'Boolean',
    json: 'Structured',
  };

  addAttribute(): void {
    this.editAttribute();
  }

  editAttribute(record?: ProductAttributeEntry): void {
    if (!this.canEdit() || this.disabled() || this.busy()) {
      return;
    }

    this.store.dismissActionError();
    this.setBusy(true);
    this.dialog
      .open<AttributeEditorDialog, { product: Product; record?: ProductAttributeEntry; keys: string[] }, Product>(
        AttributeEditorDialog,
        {
          width: '560px',
          maxWidth: '95vw',
          injector: this.injector,
          data: {
            product: this.product(),
            record,
            keys: this.rows()
              .filter(row => row.key !== record?.key)
              .map(row => row.key),
          },
        },
      )
      .afterClosed()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.setBusy(false)),
      )
      .subscribe(product => {
        if (product) {
          this.saved.emit(product);
        }
      });
  }

  removeAttribute(record: ProductAttributeEntry): void {
    if (!this.canEdit() || this.disabled() || this.busy()) {
      return;
    }

    this.store.dismissActionError();
    this.setBusy(true);
    this.dialog
      .open(ConfirmDialog, {
        width: '480px',
        maxWidth: '95vw',
        data: { title: 'Remove attribute?', message: `Remove ${record.key} from this product?`, confirmText: 'Remove' },
      })
      .afterClosed()
      .pipe(
        switchMap(confirmed => {
          if (!confirmed) {
            return EMPTY;
          }

          const attributes = Object.fromEntries(
            Object.entries(this.product().attributes).filter(([key]) => key !== record.key),
          );

          return this.store.update({ id: this.product().id, payload: { attributes } });
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.setBusy(false)),
      )
      .subscribe(product => {
        this.saved.emit(product);
      });
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  private setBusy(value: boolean): void {
    this.busy.set(value);
    if (!this.destroyRef.destroyed) {
      this.saving.emit(value);
    }
  }
}
