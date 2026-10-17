import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { UIStateStatus } from '@warehouse/shared';
import { apiError, combineUIStates, entityEditorState, PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import { distinctUntilChanged, finalize, map } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import {
  CategoriesApiService,
  ProductDetailsApiService,
  ProductsApiService,
  UnitsApiService,
  VatRatesApiService,
} from '../../../../data-access/services';
import { CategoriesStore, ProductsStore, UnitsStore, VatRatesStore } from '../../../../data-access/stores';
import type { Product, ProductPackage, ProductUpdate } from '../../../../types';
import { CategorySelect } from '../../../categories/components';
import { UnitSelect } from '../../../units/components';
import {
  DeleteProductDialog,
  ProductAttributes,
  ProductBarcodes,
  ProductMeasurements,
  ProductReferenceSelect,
} from '../../components';

@Component({
  selector: 'md-product-editor',
  providers: [
    ProductsApiService,
    ProductsStore,
    CategoriesApiService,
    CategoriesStore,
    UnitsApiService,
    UnitsStore,
    VatRatesApiService,
    VatRatesStore,
    ProductDetailsApiService,
  ],
  imports: [
    PageLayout,
    RouterLink,
    UIStateContainerComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    CategorySelect,
    UnitSelect,
    ProductReferenceSelect,
    ProductAttributes,
    ProductBarcodes,
    ProductMeasurements,
  ],
  templateUrl: './product-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEditor {
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  readonly categories = inject(CategoriesStore);
  readonly units = inject(UnitsStore);
  readonly vatRates = inject(VatRatesStore);
  private readonly detailsApi = inject(ProductDetailsApiService);
  private readonly store = inject(ProductsStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly editing = this.route.snapshot.data['mode'] === 'edit';
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly record = computed(() => this.store.entityById(this.id()));
  readonly packageOptions = rxResource({
    params: () => this.record()?.package_set_id || undefined,
    stream: ({ params }) => this.detailsApi.packages(params),
    defaultValue: [] as ProductPackage[],
  });
  readonly packages = computed(() => (this.packageOptions.hasValue() ? this.packageOptions.value() : []));
  readonly state = computed<UIStateStatus<string>>(() => {
    const packageError = this.packageOptions.error();

    return combineUIStates(
      this.categories.entityState(),
      this.units.entityState(),
      this.vatRates.entityState(),
      {
        resolved: !this.packageOptions.isLoading() && !packageError,
        rejected: !!packageError,
        pending: this.packageOptions.isLoading(),
        err: packageError ? apiError(packageError) : null,
      },
      entityEditorState({
        editing: this.editing,
        exists: !!this.record(),
        operation: this.store.operationById(this.id()),
        saving: this.store.saving(),
      }),
    );
  });
  readonly actionError = computed(() => (this.state().rejected ? null : this.store.actionError()));
  readonly attributesSaving = signal(false);
  readonly form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(64)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)],
    }),
    description: new FormControl('', { nonNullable: true }),
    brand: new FormControl('', { nonNullable: true, validators: Validators.maxLength(255) }),
    category_id: new FormControl<string | null>(null, Validators.required),
    storage_unit_id: new FormControl<string | null>(null, Validators.required),
    default_vat_rate_id: new FormControl<string | null>(null),
    package_set_id: new FormControl<string | null>(null),
    batch_expiry_required: new FormControl(false, { nonNullable: true }),
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map(params => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.load());
  }

  load(): void {
    if (this.store.saving() || this.attributesSaving()) {
      return;
    }

    this.resetState();
    this.resetForm();
    this.loadReferenceData();
    this.packageOptions.reload();
    if (this.editing) {
      this.store.getById(this.id()).subscribe(record => this.fillForm(record));
    }
  }

  attributesSaved(product: Product): void {
    this.store.upsert(product);
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  save(): void {
    if (
      !this.config.hasPermission(this.editing ? 'catalog.edit' : 'catalog.create') ||
      this.attributesSaving() ||
      this.state().pending ||
      !this.state().resolved ||
      this.form.invalid
    ) {
      this.form.markAllAsTouched();

      return;
    }

    const values = this.form.getRawValue();
    if (!values.category_id || !values.storage_unit_id) {
      return;
    }

    const payload = {
      name: values.name,
      category_id: values.category_id,
      default_vat_rate_id: values.default_vat_rate_id,
      package_set_id: values.package_set_id,
      description: values.description,
      brand: values.brand,
      policy: { batch_expiry_required: values.batch_expiry_required },
    };
    const update: ProductUpdate = { ...payload };
    const record = this.record();
    if (record) {
      if (record.category_id === values.category_id) {
        delete update.category_id;
      }
      if (record.default_vat_rate_id === values.default_vat_rate_id) {
        delete update.default_vat_rate_id;
      }
      if (record.package_set_id === values.package_set_id) {
        delete update.package_set_id;
      }
    }
    this.form.disable({ emitEvent: false });
    const request = this.editing
      ? this.store.update({ id: this.id(), payload: update })
      : this.store.create({ ...payload, attributes: {}, code: values.code, storage_unit_id: values.storage_unit_id });
    request.pipe(finalize(() => this.applyFormLocks())).subscribe(saved => {
      if (this.editing) {
        this.back();
      } else {
        void this.router.navigate([saved.id, 'edit'], {
          relativeTo: this.route.parent,
          queryParamsHandling: 'preserve',
        });
      }
    });
  }

  archiveProduct(): void {
    const product = this.record();
    if (
      !product?.active ||
      this.attributesSaving() ||
      this.state().pending ||
      !this.config.hasPermission('catalog.edit')
    ) {
      return;
    }

    this.dialog
      .open<DeleteProductDialog, Product, Product>(DeleteProductDialog, {
        data: product,
        width: '480px',
        maxWidth: '95vw',
        injector: this.injector,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(saved => {
        if (saved) {
          this.store.upsert(saved);
        }
      });
  }

  restoreProduct(): void {
    const product = this.record();
    if (
      !product ||
      product.active ||
      this.attributesSaving() ||
      this.state().pending ||
      !this.config.hasPermission('catalog.edit')
    ) {
      return;
    }

    this.store.update({ id: product.id, payload: { active: true } }).subscribe();
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
  }

  private resetState(): void {
    this.store.reset();
    this.categories.reset();
    this.units.reset();
    this.vatRates.reset();
  }

  private resetForm(): void {
    this.form.reset({
      code: '',
      name: '',
      description: '',
      brand: '',
      category_id: null,
      storage_unit_id: null,
      default_vat_rate_id: null,
      package_set_id: null,
      batch_expiry_required: false,
    });
    this.applyFormLocks();
  }

  private fillForm(record: Product): void {
    this.form.reset({
      ...record,
      description: record.description ?? '',
      brand: record.brand ?? '',
      batch_expiry_required: record.policy.batch_expiry_required,
    });
    this.applyFormLocks();
  }

  private loadReferenceData(): void {
    this.categories.loadAll({ limit: 100, offset: 0 }).subscribe();
    this.units.loadAll({ limit: 100, offset: 0 }).subscribe();
    this.vatRates.loadAll({ limit: 100, offset: 0 }).subscribe();
  }

  private applyFormLocks(): void {
    this.form.enable({ emitEvent: false });
    if (this.editing) {
      this.form.controls.code.disable({ emitEvent: false });
      this.form.controls.storage_unit_id.disable({ emitEvent: false });
    }
  }
}
