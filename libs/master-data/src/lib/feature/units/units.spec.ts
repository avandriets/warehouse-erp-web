import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MASTER_DATA_CONFIG } from '../../config';
import type { Unit } from '../../types';
import { DeleteUnitDialog, UnitSelect } from './components';
import { UnitEditor, Units } from './containers';
import { UNITS_ROUTES } from './units.routes';

const base = '/api/catalog/units';
const kg: Unit = {
  id: 'kg',
  code: 'KG',
  name: 'Kilogram',
  symbol: 'kg',
  dimension: 'MASS',
  classifier_code: '166',
  display_decimal_places: 3,
  precision: 6,
  base_unit_id: null,
  factor_to_base: null,
  active: true,
  created_at: '2026-10-12T00:00:00Z',
  updated_at: '2026-10-12T00:00:00Z',
};
const gram: Unit = {
  ...kg,
  id: 'g',
  code: 'G',
  name: 'Gram',
  symbol: 'g',
  classifier_code: null,
  base_unit_id: 'kg',
  factor_to_base: '0.001000000',
  base_unit: kg,
};

describe('units workflow', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const snackBar = { open: vi.fn() };
  const can = vi.fn(() => true);
  const dialog = { open: vi.fn() };
  beforeEach(async () => {
    snackBar.open.mockClear();
    can.mockReset().mockReturnValue(true);
    dialog.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'custom/units', children: UNITS_ROUTES }]),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: can, permissionGuard: () => true } },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  function references(): void {
    for (const request of http.match(
      req => req.method === 'GET' && req.url === base && req.params.get('limit') === '100',
    )) {
      request.flush({ items: [kg], total: 1 });
    }
    harness.detectChanges();
  }

  it('searches and paginates by backend total, renders conversion summaries, and filters dimensions', async () => {
    const page = await harness.navigateByUrl('/custom/units?q=gram&dimension=MASS&limit=10&offset=10', Units);
    const request = http.expectOne(req => req.url === base);
    expect(request.request.params.get('q')).toBe('gram');
    expect(request.request.params.get('dimension')).toBe('MASS');
    expect(request.request.params.get('active')).toBe('true');
    request.flush({ items: [gram], total: 21 });
    harness.detectChanges();
    expect(page.total()).toBe(21);
    expect(page.dimension.value).toBe('MASS');
    expect(harness.routeNativeElement?.textContent).toContain('1 g = 0.001 kg');
    http.expectNone(() => true);
    await page.page({ pageIndex: 2, pageSize: 10, length: 21 });
    await harness.fixture.whenStable();
    const next = http.expectOne(req => req.url === base);
    expect(next.request.params.get('offset')).toBe('20');
    next.flush({ items: [gram], total: 21 });
    page.dimension.setValue('COUNT');
    await harness.fixture.whenStable();
    const filtered = http.expectOne(req => req.url === base);
    expect(filtered.request.params.get('dimension')).toBe('COUNT');
    expect(filtered.request.params.get('offset')).toBe('0');
    filtered.flush({ items: [], total: 0 });
    page.status.setValue('all');
    await harness.fixture.whenStable();
    const all = http.expectOne(req => req.url === base);
    expect(all.request.params.has('active')).toBe(false);
    all.flush({ items: [], total: 0 });
  });

  it('validates symbols and integral precision, then creates a root without conversion fields leaking from the form', async () => {
    const page = await harness.navigateByUrl('/custom/units/create', UnitEditor);
    references();
    page.form.patchValue({ code: 'PCS', name: 'Pieces', symbol: ' ' });
    page.save();
    http.expectNone(base);
    page.form.patchValue({ symbol: 'pcs', precision: 1.5 });
    page.save();
    http.expectNone(base);
    page.form.patchValue({ code: ' PCS ', name: ' Pieces ', symbol: ' pcs ', precision: 0, display_decimal_places: 0 });
    page.save();
    page.save();
    const request = http.expectOne(base);
    expect(request.request.body).toEqual({
      code: 'PCS',
      name: 'Pieces',
      symbol: 'pcs',
      dimension: 'COUNT',
      classifier_code: null,
      precision: 0,
      display_decimal_places: 0,
      base_unit_id: null,
      factor_to_base: null,
    });
    request.flush({ ...kg, id: 'pcs', code: 'PCS', name: 'Pieces', symbol: 'pcs', dimension: 'COUNT' });
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Unit created.', 'Dismiss', { duration: 4000 });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/custom/units');
    http.expectOne(req => req.url === base).flush({ items: [], total: 0 });
  });

  it('requires both conversion fields and sends a large exact factor without rounding', async () => {
    const page = await harness.navigateByUrl('/custom/units/create', UnitEditor);
    references();
    page.form.patchValue({ code: 'G', name: 'Gram', symbol: 'g', dimension: 'MASS', is_derived: true });
    page.save();
    http.expectNone(base);
    expect(page.form.controls.base_unit_id.invalid).toBe(true);
    page.form.controls.base_unit_id.setValue('kg');
    harness.detectChanges();
    for (const invalid of ['0', '-1', '0.0000000001', '1234567890123456', '1e3']) {
      page.form.controls.factor_to_base.setValue(invalid);
      expect(page.form.controls.factor_to_base.invalid).toBe(true);
    }
    const exact = '123456789012345.123456789';
    page.form.controls.factor_to_base.setValue(exact);
    page.save();
    const request = http.expectOne(base);
    expect(request.request.body.factor_to_base).toBe(exact);
    expect(request.request.body.base_unit_id).toBe('kg');
    request.flush({ ...gram, factor_to_base: exact });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [gram], total: 1 });
  });

  it('clears an incompatible base when the creation dimension changes', async () => {
    const page = await harness.navigateByUrl('/custom/units/create', UnitEditor);
    references();
    page.form.patchValue({ dimension: 'MASS', is_derived: true, base_unit_id: 'kg', factor_to_base: '0.001' });
    page.form.controls.dimension.setValue('LENGTH');
    expect(page.form.controls.base_unit_id.value).toBeNull();
    expect(page.form.controls.factor_to_base.value).toBe('');
    expect(page.form.invalid).toBe(true);
  });

  it('keeps established dimension/code/base/factor read-only and preserves values after a failed write', async () => {
    const page = await harness.navigateByUrl('/custom/units/g/edit', UnitEditor);
    references();
    http.expectOne(`${base}/g`).flush(gram);
    harness.detectChanges();

    for (const key of ['code', 'dimension', 'is_derived', 'base_unit_id', 'factor_to_base'] as const) {
      expect(page.form.controls[key].disabled).toBe(true);
    }
    page.form.patchValue({ name: ' Changed gram ', classifier_code: '', display_decimal_places: 4 });
    page.save();
    const request = http.expectOne(`${base}/g`);
    expect(request.request.body).toEqual({
      name: 'Changed gram',
      symbol: 'g',
      classifier_code: null,
      display_decimal_places: 4,
      precision: 6,
    });
    request.flush({ detail: 'Cannot update unit' }, { status: 422, statusText: 'Invalid' });
    expect(page.form.controls.name.value).toBe(' Changed gram ');
    expect(page.form.controls.name.enabled).toBe(true);
    expect(page.form.controls.factor_to_base.disabled).toBe(true);
    expect(page.form.controls.dimension.disabled).toBe(true);
    expect(page.actionError()).toBe('Cannot update unit');
  });

  it('allows an OTHER unit to be classified without changing its status', async () => {
    const page = await harness.navigateByUrl('/custom/units/legacy/edit', UnitEditor);
    references();
    http.expectOne(`${base}/legacy`).flush({ ...kg, id: 'legacy', dimension: 'OTHER', active: false });
    expect(page.form.controls.dimension.enabled).toBe(true);
    page.form.patchValue({ dimension: 'COUNT' });
    page.save();
    const request = http.expectOne(`${base}/legacy`);
    expect(request.request.body.dimension).toBe('COUNT');
    expect(request.request.body.active).toBeUndefined();
    expect(request.request.body.code).toBeUndefined();
    request.flush({ ...kg, id: 'legacy', dimension: 'COUNT' });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [], total: 0 });
  });

  it('renders one retry state for a failed record load and restores immutable fields on retry', async () => {
    const page = await harness.navigateByUrl('/custom/units/kg/edit', UnitEditor);
    references();
    http.expectOne(`${base}/kg`).flush({ detail: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(page.actionError()).toBeNull();
    page.load();
    references();
    http.expectOne(`${base}/kg`).flush(kg);
    expect(page.form.controls.code.disabled).toBe(true);
    expect(page.form.controls.name.value).toBe('Kilogram');
  });

  it('uses distinct catalog permissions and hides write actions for readers', async () => {
    can.mockReturnValue(false);
    const page = await harness.navigateByUrl('/custom/units', Units);
    http.expectOne(req => req.url === base).flush({ items: [kg], total: 1 });
    harness.detectChanges();
    page.deleteRecord(kg);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.querySelector('a[href$="create"]')).toBeNull();
    expect(UNITS_ROUTES.map(route => route.data?.['permission'])).toEqual([
      'catalog.read',
      'catalog.create',
      'catalog.edit',
    ]);
  });
});

describe('UnitSelect local options', () => {
  const option = kg;
  it('resolves parent-provided ids, filters locally, and emits selected ids', () => {
    const fixture = TestBed.createComponent(UnitSelect);
    fixture.componentRef.setInput('items', [option, { ...option, id: 'archived', active: false }]);
    fixture.componentRef.setInput('dimension', 'MASS');
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
    expect(picker.validate()).toEqual({ unitSelection: true });
    picker.value.setValue(option);
    expect(picker.validate()).toBeNull();
    expect(changed).toHaveBeenLastCalledWith(option.id);
    picker.clear();
    expect(changed).toHaveBeenLastCalledWith(null);
  });
  it('filters roots, dimension, excluded units and unclassified units without fetching again', () => {
    const fixture = TestBed.createComponent(UnitSelect);
    fixture.componentRef.setInput('items', [
      kg,
      gram,
      { ...kg, id: 'count', dimension: 'COUNT' },
      { ...kg, id: 'other', dimension: 'OTHER' },
      { ...kg, id: 'archived', active: false },
    ]);
    fixture.componentRef.setInput('dimension', 'MASS');
    const picker = fixture.componentInstance;
    fixture.detectChanges();
    expect(picker.options().map(item => item.id)).toEqual(['kg']);
    fixture.componentRef.setInput('rootOnly', false);
    expect(picker.options().map(item => item.id)).toEqual(['kg', 'g']);
    fixture.componentRef.setInput('dimension', null);
    fixture.componentRef.setInput('physicalOnly', true);
    fixture.componentRef.setInput('excludedId', 'kg');
    expect(picker.options().map(item => item.id)).toEqual(['g', 'count']);
    picker.writeValue('g');
    const validationChanged = vi.fn();
    picker.registerOnValidatorChange(validationChanged);
    fixture.componentRef.setInput('dimension', 'COUNT');
    fixture.detectChanges();
    expect(validationChanged).toHaveBeenCalled();
    expect(picker.validate()).toEqual({ unitSelection: true });
  });

  it('retains archived selections and rejects ids missing from the snapshot', () => {
    const fixture = TestBed.createComponent(UnitSelect);
    fixture.componentRef.setInput('items', [{ ...option, active: false }]);
    fixture.componentRef.setInput('allowArchived', true);
    fixture.componentRef.setInput('dimension', 'MASS');
    const picker = fixture.componentInstance;
    picker.writeValue(option.id);
    fixture.detectChanges();
    expect(picker.validate()).toBeNull();
    expect(picker.options()).toEqual([]);
    picker.writeValue('missing');
    expect(picker.validate()).toEqual({ unitSelection: true });
    fixture.componentRef.setInput('items', [{ ...option, id: 'missing' }]);
    fixture.detectChanges();
    expect(picker.value.value).toEqual({ ...option, id: 'missing' });
    expect(picker.validate()).toBeNull();
  });
});

describe('unit archive dialog', () => {
  let http: HttpTestingController;
  const ref = { close: vi.fn(), disableClose: false };
  const snackBar = { open: vi.fn() };
  beforeEach(() => {
    ref.close.mockClear();
    ref.disableClose = false;
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api' } },
        { provide: MAT_DIALOG_DATA, useValue: kg },
        { provide: MatDialogRef, useValue: ref },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('archives through PATCH and keeps the dialog open on failure', () => {
    const page = TestBed.createComponent(DeleteUnitDialog).componentInstance;
    http.expectNone(() => true);
    page.confirm();
    page.confirm();
    const request = http.expectOne(`${base}/kg`);
    expect(request.request.body).toEqual({ active: false });
    request.flush({ detail: 'Denied' }, { status: 403, statusText: 'Forbidden' });
    expect(ref.close).not.toHaveBeenCalled();
    expect(ref.disableClose).toBe(false);
    page.confirm();
    http.expectOne(`${base}/kg`).flush({ ...kg, active: false });
    expect(ref.close).toHaveBeenCalledWith({ ...kg, active: false });
    expect(snackBar.open).toHaveBeenLastCalledWith('Unit archived.', 'Dismiss', { duration: 4000 });
  });
});
