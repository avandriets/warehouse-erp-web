import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import { CategoriesApiService } from '../../data-access/services';
import { CategoriesStore } from '../../data-access/stores';
import type { Product, ProductBarcode, ProductMeasurement, ProductPackage, Unit } from '../../types';
import { CategorySelect } from '../categories/components';
import {
  ArchiveProductDetailDialog,
  AttributeEditorDialog,
  BarcodeEditorDialog,
  DeleteProductDialog,
  MeasurementEditorDialog,
  ProductAttributes,
  ProductBarcodes,
  ProductMeasurements,
  ProductReferenceSelect,
} from './components';
import { ProductEditor, Products } from './containers';
import { PRODUCTS_ROUTES } from './products.routes';
const base = '/api/catalog/products';
const product: Product = {
  id: 'one',
  code: 'BOX',
  name: 'Box',
  category_id: 'category',
  storage_unit_id: 'unit',
  package_set_id: null,
  default_vat_rate_id: null,
  brand: 'Brand',
  description: 'Description',
  attributes: { size: 20 },
  policy: { batch_expiry_required: false },
  active: true,
  created_at: '',
  updated_at: '',
  category: { id: 'category', code: 'CAT', name: 'Category', active: true },
  storage_unit: { id: 'unit', code: 'PCS', name: 'Pieces', symbol: 'pcs', active: true, dimension: 'COUNT' },
};
const unit = {
  ...product.storage_unit,
  precision: 0,
  display_decimal_places: 0,
  base_unit_id: null,
  factor_to_base: null,
};
describe('products workflow', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const snack = { open: vi.fn() };
  const dialog = { open: vi.fn() };
  const can = vi.fn<(permission: string) => boolean>(() => true);
  beforeEach(async () => {
    snack.open.mockClear();
    dialog.open.mockReset().mockReturnValue({ afterClosed: () => of(undefined) });
    can.mockReset().mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'custom/products', children: PRODUCTS_ROUTES }]),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: can, permissionGuard: () => true } },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  function references(): void {
    for (const request of http.match(req => req.method === 'GET' && req.params.get('limit') === '100')) {
      const items = request.request.url.endsWith('/categories')
        ? [product.category]
        : request.request.url.endsWith('/units')
          ? [unit]
          : [];
      request.flush({ items, total: items.length });
    }
    harness.detectChanges();
  }

  function details(): void {
    http.expectOne(`${base}/one/barcodes`).flush([]);
    http.expectOne(`${base}/one/measurements`).flush([]);
  }

  it('searches by code/name/barcode with real totals and filters categories', async () => {
    const page = await harness.navigateByUrl('/custom/products?q=123&limit=10&offset=10', Products);
    references();
    const request = http.expectOne(req => req.url === base);
    expect(request.request.params.get('q')).toBe('123');
    request.flush({ items: [product], total: 21 });
    harness.detectChanges();
    expect(page.total()).toBe(21);
    expect(harness.routeNativeElement?.textContent).toContain('Category');
    expect(harness.routeNativeElement?.textContent).toContain('pcs');
    await page.page({ pageIndex: 2, pageSize: 10, length: 21 });
    await harness.fixture.whenStable();
    const next = http.expectOne(req => req.url === base);
    expect(next.request.params.get('offset')).toBe('20');
    next.flush({ items: [], total: 21 });
    const picker = harness.routeDebugElement!.query(By.directive(CategorySelect)).componentInstance as CategorySelect;
    picker.search();
    picker.value.setValue('cat');
    expect(picker.options().map(option => option.id)).toEqual(['category']);
    http.expectNone(req => req.method === 'GET');
    picker.value.setValue(product.category!);
    await harness.fixture.whenStable();
    const filter = http.expectOne(req => req.url === base);
    expect(filter.request.params.get('category_id')).toBe('category');
    expect(filter.request.params.get('offset')).toBe('0');
    filter.flush({ items: [], total: 0 });
  });
  it('keeps form dictionaries independent of another directory store instance', async () => {
    const scope = Injector.create({
      parent: TestBed.inject(Injector),
      providers: [CategoriesApiService, CategoriesStore],
    });
    try {
      const directory = scope.get(CategoriesStore);
      directory.load({ q: 'archived', active: false, offset: 25, limit: 25 }).subscribe();
      http
        .expectOne(req => req.url === '/api/catalog/categories')
        .flush({ items: [{ ...product.category, id: 'archived', active: false }], total: 60 });
      const page = await harness.navigateByUrl('/custom/products/create', ProductEditor);
      references();
      expect(page.categories).not.toBe(directory);
      expect(page.categories.entities().map(item => item.id)).toEqual(['category']);
      expect(directory.entities().map(item => item.id)).toEqual(['archived']);
      expect(directory.pagination().total).toBe(60);
    } finally {
      scope.destroy();
    }
  });

  it('loads legacy package options in the parent and retries a failure through the common state', async () => {
    const page = await harness.navigateByUrl('/custom/products/one/edit', ProductEditor);
    references();
    http.expectOne(`${base}/one`).flush({ ...product, package_set_id: 'legacy' });
    harness.detectChanges();
    http.expectOne('/api/catalog/package-sets/legacy/packages').error(new ProgressEvent('error'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.state().rejected).toBe(true);
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
    page.load();
    references();
    http.expectOne(`${base}/one`).flush({ ...product, package_set_id: 'legacy' });
    harness.detectChanges();
    const packages = [{ id: 'pack', code: 'PACK', name: 'Pack', active: true }];
    http.expectOne('/api/catalog/package-sets/legacy/packages').flush(packages);
    await harness.fixture.whenStable();
    harness.detectChanges();
    details();
    expect(page.state().rejected).toBe(false);
    expect(page.packages()).toEqual(packages);
  });

  it('creates the product before displaying its independent detail sections', async () => {
    const page = await harness.navigateByUrl('/custom/products/create?q=box', ProductEditor);
    references();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('md-category-select mat-error')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('md-unit-select mat-error')).toBeNull();
    page.save();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('md-category-select mat-error')?.textContent).toContain(
      'Choose a category',
    );
    expect(harness.routeNativeElement?.querySelector('md-unit-select mat-error')?.textContent).toContain(
      'Choose a unit',
    );
    http.expectNone(base);
    page.form.patchValue({
      code: ' BOX ',
      name: ' Box ',
      category_id: 'category',
      storage_unit_id: 'unit',
      brand: ' Brand ',
      description: ' Description ',
      batch_expiry_required: true,
    });
    harness.detectChanges();
    references();
    expect(harness.routeNativeElement?.querySelector('md-product-attributes')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('md-product-barcodes')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('md-product-measurements')).toBeNull();
    page.save();
    page.save();
    const request = http.expectOne(base);
    expect(request.request.body).toEqual({
      code: 'BOX',
      name: 'Box',
      category_id: 'category',
      storage_unit_id: 'unit',
      brand: 'Brand',
      description: 'Description',
      attributes: {},
      policy: { batch_expiry_required: true },
      package_set_id: null,
      default_vat_rate_id: null,
    });
    request.flush(product);
    expect(snack.open).toHaveBeenCalledExactlyOnceWith('Product created.', 'Dismiss', { duration: 4000 });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/custom/products/one/edit?q=box');
    references();
    http.expectOne(`${base}/one`).flush(product);
    harness.detectChanges();
    details();
    expect(harness.routeNativeElement?.querySelector('md-product-attributes')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('md-product-barcodes')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('md-product-measurements')).not.toBeNull();
  });
  it('keeps code/storage unit immutable, clears optional fields, and preserves failed edits', async () => {
    const page = await harness.navigateByUrl('/custom/products/one/edit', ProductEditor);
    references();
    http.expectOne(`${base}/one`).flush(product);
    harness.detectChanges();
    references();
    await harness.fixture.whenStable();
    details();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('md-unit-select mat-hint')?.textContent).toContain(
      'Stock is recorded in this unit. It cannot be changed after creation.',
    );
    expect(harness.routeNativeElement?.querySelector('md-unit-select button[matSuffix]')).toBeNull();
    expect(harness.routeNativeElement?.textContent).not.toContain('Choose an active unit.');
    expect(harness.routeNativeElement?.textContent).not.toContain('The storage unit cannot be changed.');
    expect(page.form.controls.code.disabled).toBe(true);
    expect(page.form.controls.storage_unit_id.disabled).toBe(true);
    page.form.patchValue({ name: ' Changed ', brand: '', description: '' });
    page.save();
    const request = http.expectOne(`${base}/one`);
    expect(request.request.body).toEqual({
      name: 'Changed',
      brand: '',
      description: '',
      policy: { batch_expiry_required: false },
    });
    request.flush({ detail: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    harness.detectChanges();
    http.expectNone(candidate => candidate.method === 'GET');
    expect(page.form.controls.name.value).toBe(' Changed ');
    expect(page.form.controls.name.enabled).toBe(true);
    expect(page.form.controls.storage_unit_id.disabled).toBe(true);
    expect(snack.open).toHaveBeenCalledTimes(1);
  });
  it('saves attributes independently and preserves unsaved product fields', async () => {
    const page = await harness.navigateByUrl('/custom/products/one/edit', ProductEditor);
    references();
    http.expectOne(`${base}/one`).flush(product);
    harness.detectChanges();
    details();
    const attributes = harness.routeDebugElement!.query(By.directive(ProductAttributes))
      .componentInstance as ProductAttributes;
    page.form.controls.name.setValue('Unsaved name');
    const changed = { ...product, attributes: { size: 20, color: 'blue' } };
    dialog.open.mockReturnValueOnce({ afterClosed: () => of(changed) });
    attributes.addAttribute();
    harness.detectChanges();
    expect(page.record()?.attributes).toEqual(changed.attributes);
    expect(page.form.controls.name.value).toBe('Unsaved name');
    dialog.open.mockReturnValueOnce({ afterClosed: () => of(false) });
    attributes.removeAttribute(attributes.rows()[0]);
    http.expectNone(req => req.method === 'PATCH');
    dialog.open.mockReturnValueOnce({ afterClosed: () => of(true) });
    attributes.removeAttribute(attributes.rows()[0]);
    const removal = http.expectOne(`${base}/one`);
    expect(removal.request.body).toEqual({ attributes: { color: 'blue' } });
    expect(page.attributesSaving()).toBe(true);
    page.save();
    http.expectNone(req => req.method === 'PATCH');
    removal.flush({ ...changed, attributes: { color: 'blue' } });
    expect(page.attributesSaving()).toBe(false);
    expect(page.form.controls.name.value).toBe('Unsaved name');
    page.save();
    const mainSave = http.expectOne(`${base}/one`);
    expect(mainSave.request.body.attributes).toBeUndefined();
    mainSave.flush({ detail: 'Rejected' }, { status: 422, statusText: 'Invalid' });
    expect(page.record()?.attributes).toEqual({ color: 'blue' });
  });
  it('keeps attributes readable while blocking changes without edit permission', async () => {
    can.mockImplementation(permission => permission !== 'catalog.edit');
    await harness.navigateByUrl('/custom/products/one/edit', ProductEditor);
    references();
    http.expectOne(`${base}/one`).flush(product);
    harness.detectChanges();
    details();
    const section = harness.routeDebugElement!.query(By.directive(ProductAttributes));
    const attributes = section.componentInstance as ProductAttributes;
    expect(section.nativeElement.textContent).toContain('20');
    attributes.addAttribute();
    attributes.editAttribute(attributes.rows()[0]);
    attributes.removeAttribute(attributes.rows()[0]);
    expect(dialog.open).not.toHaveBeenCalled();
    http.expectNone(req => req.method !== 'GET');
  });
  it('archives and restores separately from unsaved form fields', async () => {
    const page = await harness.navigateByUrl('/custom/products/one/edit', ProductEditor);
    references();
    http.expectOne(`${base}/one`).flush(product);
    harness.detectChanges();
    references();
    await harness.fixture.whenStable();
    details();
    page.form.controls.name.setValue('Unsaved name');
    dialog.open.mockReturnValueOnce({ afterClosed: () => of(undefined) });
    page.archiveProduct();
    expect(page.record()?.active).toBe(true);
    dialog.open.mockReturnValueOnce({ afterClosed: () => of({ ...product, active: false }) });
    page.archiveProduct();
    expect(dialog.open).toHaveBeenCalledWith(DeleteProductDialog, expect.objectContaining({ data: product }));
    expect(page.record()?.active).toBe(false);
    expect(page.form.controls.name.value).toBe('Unsaved name');
    expect(TestBed.inject(Router).url).toBe('/custom/products/one/edit');
    page.restoreProduct();
    page.restoreProduct();
    const request = http.expectOne(`${base}/one`);
    expect(request.request.body).toEqual({ active: true });
    request.flush(product);
    harness.detectChanges();
    expect(page.record()?.active).toBe(true);
    expect(page.form.controls.name.value).toBe('Unsaved name');
    expect(harness.routeNativeElement?.querySelector('[formControlName="active"]')).toBeNull();
    http.expectNone(() => true);
  });

  it('keeps an archived product and unsaved fields unchanged when restoring fails', async () => {
    const page = await harness.navigateByUrl('/custom/products/one/edit', ProductEditor);
    references();
    http.expectOne(`${base}/one`).flush({ ...product, active: false });
    harness.detectChanges();
    references();
    await harness.fixture.whenStable();
    details();
    page.form.controls.description.setValue('Unsaved description');
    page.restoreProduct();
    http.expectOne(`${base}/one`).flush({ detail: 'Denied' }, { status: 403, statusText: 'Forbidden' });
    expect(page.record()?.active).toBe(false);
    expect(page.form.controls.description.value).toBe('Unsaved description');
    expect(snack.open).toHaveBeenCalledTimes(1);
  });

  it('shows only one load failure and supports retry', async () => {
    const page = await harness.navigateByUrl('/custom/products/missing/edit', ProductEditor);
    references();
    http.expectOne(`${base}/missing`).error(new ProgressEvent('error'));
    harness.detectChanges();
    expect(page.state().rejected).toBe(true);
    expect(page.actionError()).toBeNull();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]').length).toBe(1);
  });
  it('hides creating and editing independently by catalog permissions', async () => {
    can.mockImplementation(permission => permission === 'catalog.read');
    const page = await harness.navigateByUrl('/custom/products', Products);
    references();
    http.expectOne(req => req.url === base).flush({ items: [product], total: 1 });
    harness.detectChanges();
    expect(page.canCreate()).toBe(false);
    expect(page.canEdit()).toBe(false);
    expect(harness.routeNativeElement?.querySelector('[aria-label="Edit Box"]')).toBeNull();
  });
});
describe('product archival', () => {
  let http: HttpTestingController;
  const ref = { close: vi.fn(), disableClose: false };
  const snack = { open: vi.fn() };
  beforeEach(() => {
    ref.close.mockClear();
    snack.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api' } },
        { provide: MAT_DIALOG_DATA, useValue: product },
        { provide: MatDialogRef, useValue: ref },
        { provide: MatSnackBar, useValue: snack },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('archives by PATCH and retains dialog failures', () => {
    const page = TestBed.createComponent(DeleteProductDialog).componentInstance;
    page.confirm();
    page.confirm();
    const request = http.expectOne(`${base}/one`);
    expect(request.request.body).toEqual({ active: false });
    request.flush({ detail: 'Denied' }, { status: 403, statusText: 'Forbidden' });
    expect(ref.close).not.toHaveBeenCalled();
    expect(ref.disableClose).toBe(false);
    page.confirm();
    http.expectOne(`${base}/one`).flush({ ...product, active: false });
    expect(ref.close).toHaveBeenCalledWith({ ...product, active: false });
    expect(snack.open).toHaveBeenLastCalledWith('Product archived.', 'Dismiss', { duration: 4000 });
  });
});
describe('measurement editor dialog', () => {
  let http: HttpTestingController;
  const snack = { open: vi.fn() };
  const ref = { close: vi.fn(), disableClose: false };
  const data: { product: Product; record?: ProductMeasurement; units: Unit[] } = {
    product,
    units: [{ ...unit, id: 'weight', dimension: 'MASS', symbol: 'kg' } as Unit],
  };
  beforeEach(() => {
    snack.open.mockClear();
    ref.close.mockClear();
    ref.disableClose = false;
    data.record = undefined;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: () => true } },
        { provide: MatSnackBar, useValue: snack },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('preserves exact decimal quantities', () => {
    const fixture = TestBed.createComponent(MeasurementEditorDialog);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.form.patchValue({
      unit_id: 'weight',
      storage_quantity: '123456789012345.123456789',
      measured_quantity: '0.000000001',
      use: 'DOCUMENT',
    });
    fixture.detectChanges();

    page.save();
    const measurement = http.expectOne(`${base}/one/measurements`);
    expect(measurement.request.body.storage_quantity).toBe('123456789012345.123456789');
    expect(measurement.request.body.measured_quantity).toBe('0.000000001');
    measurement.flush({ id: 'm', product_id: 'one', ...measurement.request.body, active: true });
    expect(ref.close).toHaveBeenCalledWith(true);
  });
  it('keeps the unit immutable and preserves input after failed edits', () => {
    data.record = {
      id: 'm',
      product_id: 'one',
      unit_id: 'weight',
      storage_quantity: '1',
      measured_quantity: '2',
      use: 'REFERENCE_ONLY',
      is_report_unit: false,
      active: false,
    };
    const page = TestBed.createComponent(MeasurementEditorDialog).componentInstance;
    expect(page.form.controls.unit_id.disabled).toBe(true);
    page.form.patchValue({ measured_quantity: '3.123456789', use: 'DOCUMENT', is_report_unit: true });
    page.save();
    page.save();
    const request = http.expectOne(`${base}/one/measurements/m`);
    expect(request.request.body).toEqual({
      storage_quantity: '1',
      measured_quantity: '3.123456789',
      use: 'DOCUMENT',
      is_report_unit: true,
    });
    request.flush({ detail: 'Report unit already exists' }, { status: 409, statusText: 'Conflict' });
    expect(ref.close).not.toHaveBeenCalled();
    expect(ref.disableClose).toBe(false);
    expect(page.form.controls.measured_quantity.value).toBe('3.123456789');
    expect(page.form.controls.measured_quantity.enabled).toBe(true);
    expect(page.form.controls.unit_id.disabled).toBe(true);
    expect(snack.open).toHaveBeenCalledTimes(1);
    page.save();
    http.expectOne(`${base}/one/measurements/m`).flush({ ...data.record, measured_quantity: '3.123456789' });
    expect(ref.close).toHaveBeenCalledWith(true);
  });
  it('rejects invalid quantities without issuing a request', () => {
    const page = TestBed.createComponent(MeasurementEditorDialog).componentInstance;
    page.form.controls.unit_id.setValue('weight');
    for (const value of ['0', '-1', '1e3', '0.0000000001']) {
      page.form.controls.measured_quantity.setValue(value);
      page.save();
      http.expectNone(`${base}/one/measurements`);
      expect(page.form.controls.measured_quantity.invalid).toBe(true);
    }
  });
});

describe('barcode table actions', () => {
  it('opens the editor through the table and does not render an inline barcode form', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: () => true } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn().mockReturnValue({ afterClosed: () => of(false) }) } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ProductBarcodes);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    const barcode = { id: 'b', value: '123', package_id: null, product_id: 'one', active: true };
    http.expectOne(`${base}/one/barcodes`).flush([barcode]);
    const measurementFixture = TestBed.createComponent(ProductMeasurements);
    measurementFixture.componentRef.setInput('product', product);
    measurementFixture.componentRef.setInput('units', [unit]);
    measurementFixture.detectChanges();
    const measurement = {
      id: 'm',
      product_id: 'one',
      unit_id: 'weight',
      storage_quantity: '1',
      measured_quantity: '2',
      use: 'REFERENCE_ONLY' as const,
      is_report_unit: false,
      active: true,
    };
    http.expectOne(`${base}/one/measurements`).flush([measurement]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table[mat-table]')?.textContent).toContain('123');
    expect(fixture.nativeElement.querySelector('input[formControlName="value"]')).toBeNull();
    fixture.componentInstance.loadBarcodes();
    http.expectOne(`${base}/one/barcodes`).error(new ProgressEvent('error'));
    expect(fixture.componentInstance.barcodeState().rejected).toBe(true);
    expect(measurementFixture.componentInstance.measurementState().resolved).toBe(true);
    fixture.componentInstance.loadBarcodes();
    http.expectOne(`${base}/one/barcodes`).flush([barcode]);
    http.expectNone(`${base}/one/measurements`);
    fixture.componentInstance.editBarcode(barcode);
    expect(TestBed.inject(MatDialog).open).toHaveBeenCalledWith(
      BarcodeEditorDialog,
      expect.objectContaining({ data: { product, record: barcode, packages: [] } }),
    );
    expect(fixture.nativeElement.querySelector('input[formControlName="measured_quantity"]')).toBeNull();
    measurementFixture.componentInstance.editMeasurement(measurement);
    expect(TestBed.inject(MatDialog).open).toHaveBeenCalledWith(
      MeasurementEditorDialog,
      expect.objectContaining({ data: { product, record: measurement, units: [unit] } }),
    );
    http.verify();
  });
});

describe.each(['barcodes', 'measurements'] as const)('%s status actions', kind => {
  it('restores through a status-only request, retains failures and blocks duplicate clicks', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: () => true } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture =
      kind === 'barcodes' ? TestBed.createComponent(ProductBarcodes) : TestBed.createComponent(ProductMeasurements);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    const record =
      kind === 'barcodes'
        ? { id: 'detail', product_id: product.id, value: '123', package_id: null, active: false }
        : {
            id: 'detail',
            product_id: product.id,
            unit_id: 'weight',
            storage_quantity: '1',
            measured_quantity: '2',
            use: 'DOCUMENT',
            is_report_unit: false,
            active: false,
          };
    const endpoint = `${base}/one/${kind}`;
    http.expectOne(endpoint).flush([record]);
    fixture.detectChanges();
    const restore = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[matTooltip="Restore"]');
    restore().click();
    restore().click();
    const failed = http.expectOne(`${endpoint}/detail`);
    expect(failed.request.body).toEqual({ active: true });
    failed.flush({ detail: 'Denied' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Archived');
    expect(fixture.nativeElement.querySelectorAll('[role="alert"]')).toHaveLength(1);
    restore().click();
    http.expectOne(`${endpoint}/detail`).flush({ ...record, active: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[matTooltip="Restore"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[matTooltip="Archive"]')).not.toBeNull();
    http.verify();
  });
});

describe('ProductReferenceSelect local options', () => {
  const option = { id: 'vat', code: 'VAT', name: 'VAT', active: true };
  it('resolves parent-provided ids, filters locally, and emits selected ids', () => {
    const fixture = TestBed.createComponent(ProductReferenceSelect);
    fixture.componentRef.setInput('items', [option, { ...option, id: 'archived', active: false }]);

    fixture.detectChanges();
    const picker = fixture.componentInstance;
    const changed = vi.fn();
    picker.registerOnChange(changed);
    picker.writeValue(option.id);
    fixture.detectChanges();
    expect(picker.value.value).toEqual(option);
    expect(changed).not.toHaveBeenCalled();
    picker.search();
    expect(picker.options()).toEqual([option]);
    picker.value.setValue('does not exist');
    expect(picker.options()).toEqual([]);
    expect(picker.validate()).toEqual({ referenceSelection: true });
    picker.value.setValue(option);
    expect(picker.validate()).toBeNull();
    expect(changed).toHaveBeenLastCalledWith(option.id);
    picker.clear();
    expect(changed).toHaveBeenLastCalledWith(null);
  });
  it('retains archived selections and rejects ids missing from the snapshot', () => {
    const fixture = TestBed.createComponent(ProductReferenceSelect);
    fixture.componentRef.setInput('items', [{ ...option, active: false }]);
    fixture.componentRef.setInput('allowArchived', true);

    const picker = fixture.componentInstance;
    picker.writeValue(option.id);
    fixture.detectChanges();
    expect(picker.validate()).toBeNull();
    expect(picker.options()).toEqual([]);
    picker.writeValue('missing');
    expect(picker.validate()).toEqual({ referenceSelection: true });
    fixture.componentRef.setInput('items', [{ ...option, id: 'missing' }]);
    fixture.detectChanges();
    expect(picker.value.value).toEqual({ ...option, id: 'missing' });
    expect(picker.validate()).toBeNull();
  });
});

describe('measurement archival confirmation', () => {
  let http: HttpTestingController;
  const ref = { close: vi.fn(), disableClose: false };
  beforeEach(() => {
    ref.close.mockClear();
    ref.disableClose = false;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api' } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: { kind: 'measurement', productId: 'one', record: { id: 'm' } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('archives only the selected product measurement and keeps failures in the dialog', () => {
    const page = TestBed.createComponent(ArchiveProductDetailDialog).componentInstance;
    page.confirm();
    page.confirm();
    const request = http.expectOne(`${base}/one/measurements/m`);
    expect(request.request.body).toEqual({ active: false });
    request.flush({ detail: 'Denied' }, { status: 403, statusText: 'Forbidden' });
    expect(ref.close).not.toHaveBeenCalled();
    expect(ref.disableClose).toBe(false);
    expect(page.actionError()).toBeTruthy();
    page.confirm();
    http.expectOne(`${base}/one/measurements/m`).flush({ id: 'm', product_id: 'one', active: false });
    expect(ref.close).toHaveBeenCalledWith(true);
  });
});

describe('barcode editor dialog', () => {
  let http: HttpTestingController;
  const ref = { close: vi.fn(), disableClose: false };
  const snack = { open: vi.fn() };
  const data: { product: Product; record?: ProductBarcode; packages: ProductPackage[] } = { product, packages: [] };
  beforeEach(() => {
    data.record = undefined;
    data.packages = [];
    ref.close.mockClear();
    ref.disableClose = false;
    snack.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: () => true } },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: ref },
        { provide: MatSnackBar, useValue: snack },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('validates and adds a barcode, retaining input when a duplicate is rejected', () => {
    const page = TestBed.createComponent(BarcodeEditorDialog).componentInstance;
    page.save();
    http.expectNone(`${base}/one/barcodes`);
    page.form.controls.value.setValue(' 123456 ');
    page.save();
    page.save();
    const request = http.expectOne(`${base}/one/barcodes`);
    expect(request.request.body).toEqual({ value: '123456', package_id: null });
    request.flush({ detail: 'Barcode already exists' }, { status: 409, statusText: 'Conflict' });
    expect(ref.close).not.toHaveBeenCalled();
    expect(ref.disableClose).toBe(false);
    expect(page.form.controls.value.value).toBe(' 123456 ');
    expect(page.form.enabled).toBe(true);
    expect(snack.open).toHaveBeenCalledTimes(1);
    page.save();
    http
      .expectOne(`${base}/one/barcodes`)
      .flush({ id: 'b', value: '123456', package_id: null, active: true, product_id: 'one' });
    expect(ref.close).toHaveBeenCalledWith(true);
    expect(snack.open).toHaveBeenLastCalledWith('Barcode added.', 'Dismiss', { duration: 4000 });
  });
  it('edits the selected barcode and clears its package through PATCH', () => {
    data.packages = [{ id: 'pack', code: 'PACK', name: 'Pack', active: true }];
    data.record = { id: 'b', product_id: 'one', value: '123', package_id: 'pack', active: true };
    const page = TestBed.createComponent(BarcodeEditorDialog).componentInstance;
    expect(page.form.controls.value.value).toBe('123');
    page.form.patchValue({ value: ' 456 ', package_id: null });
    page.save();
    const request = http.expectOne(`${base}/one/barcodes/b`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ value: '456', package_id: null });
    request.flush({ id: 'b', value: '456', package_id: null, active: true });
    expect(ref.close).toHaveBeenCalledWith(true);
    expect(snack.open).toHaveBeenCalledExactlyOnceWith('Barcode saved.', 'Dismiss', { duration: 4000 });
  });
});

describe('attribute editor dialog', () => {
  const ref = { close: vi.fn(), disableClose: false };
  let http: HttpTestingController;
  const data: { product: Product; keys: string[]; record?: { key: string; type: string; value: string } } = {
    product,
    keys: ['size'],
  };
  beforeEach(() => {
    ref.close.mockClear();
    data.record = undefined;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api' } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('checks duplicate names and typed values before returning the edited row', () => {
    const fixture = TestBed.createComponent(AttributeEditorDialog);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    page.form.setValue({ key: ' size ', type: 'number', value: '20' });
    page.save();
    expect(page.form.controls.key.hasError('uniqueAttributeName')).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Attribute names must be unique.');
    expect(ref.close).not.toHaveBeenCalled();
    page.form.setValue({ key: ' weight ', type: 'number', value: 'heavy' });
    page.save();
    expect(ref.close).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Check the attribute value and its type.');
    page.form.controls.value.setValue('20');
    page.save();
    const request = http.expectOne(`${base}/one`);
    expect(request.request.body).toEqual({ attributes: { size: 20, weight: 20 } });
    request.flush({ detail: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(ref.close).not.toHaveBeenCalled();
    expect(page.form.controls.value.value).toBe('20');
    expect(page.form.enabled).toBe(true);
    page.save();
    const saved = { ...product, attributes: { size: 20, weight: 20 } };
    http.expectOne(`${base}/one`).flush(saved);
    expect(ref.close).toHaveBeenCalledWith(saved);
  });
  it('preserves structured attributes while editing', () => {
    data.record = { key: 'dimensions', type: 'json', value: '{"width":10,"height":20}' };
    const page = TestBed.createComponent(AttributeEditorDialog).componentInstance;
    page.save();
    const request = http.expectOne(`${base}/one`);
    expect(request.request.body.attributes).toEqual({ size: 20, dimensions: { width: 10, height: 20 } });
    request.flush(product);
    expect(ref.close).toHaveBeenCalledWith(product);
  });
});
