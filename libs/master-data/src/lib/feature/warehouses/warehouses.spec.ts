import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { MASTER_DATA_CONFIG } from '../../config';
import type { Warehouse } from '../../types';
import { DeleteWarehouseDialog } from './components';
import { WarehouseEditor, Warehouses } from './containers';
import { WAREHOUSES_ROUTES } from './warehouses.routes';

const base = '/api/warehouses';
const warehouse: Warehouse = {
  id: 'main',
  code: 'MAIN',
  name: 'Main',
  description: 'Main warehouse',
  active: true,
  address_storage_enabled: true,
  tracking_mode: 'BATCH',
  issue_strategy: 'FIFO',
  created_at: '2026-10-12T00:00:00Z',
  updated_at: '2026-10-12T00:00:00Z',
  created_by: null,
  updated_by: null,
  can_manage: true,
};

describe('warehouses workflow', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const snackBar = { open: vi.fn() };
  const dialog = { open: vi.fn() };
  const can = vi.fn<(permission: string) => boolean>(() => true);
  beforeEach(async () => {
    snackBar.open.mockClear();
    can.mockReset().mockReturnValue(true);
    dialog.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'custom/warehouses', children: WAREHOUSES_ROUTES }]),
        {
          provide: MASTER_DATA_CONFIG,
          useValue: { apiUrl: '/api', hasPermission: can, permissionGuard: () => true },
        },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  it('uses matching totals and scoped capabilities for list actions', async () => {
    const page = await harness.navigateByUrl('/custom/warehouses?q=main&limit=10&offset=10', Warehouses);
    const request = http.expectOne(req => req.url === base);
    expect(request.request.params.get('q')).toBe('main');
    expect(request.request.params.get('active')).toBe('true');
    request.flush({
      items: [warehouse, { ...warehouse, id: 'other', name: 'Other', can_manage: false }],
      total: 21,
      can_create: false,
    });
    harness.detectChanges();
    expect(page.total()).toBe(21);
    expect(page.canCreate()).toBe(false);
    expect(harness.routeNativeElement?.querySelector('[aria-label="Edit Main"]')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('[aria-label="Edit Other"]')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('FIFO');
    page.deleteRecord({ ...warehouse, can_manage: false });
    expect(dialog.open).not.toHaveBeenCalled();
    await page.page({ pageIndex: 2, pageSize: 10, length: 21 });
    await harness.fixture.whenStable();
    const next = http.expectOne(req => req.url === base);
    expect(next.request.params.get('offset')).toBe('20');
    next.flush({ items: [], total: 21, can_create: true });
    expect(page.canCreate()).toBe(true);
    page.status.setValue('all');
    await harness.fixture.whenStable();
    const all = http.expectOne(req => req.url === base);
    expect(all.request.params.has('active')).toBe(false);
    expect(all.request.params.get('offset')).toBe('0');
    all.flush({ items: [], total: 0, can_create: true });
  });

  it('creates metadata without policy fields and preserves filters on return', async () => {
    can.mockImplementation(permission => permission !== 'settings.manage');
    const page = await harness.navigateByUrl('/custom/warehouses/create?q=main', WarehouseEditor);
    page.form.patchValue({ code: ' MAIN ', name: ' Main ', description: ' Description ' });
    page.save();
    page.save();
    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'MAIN', name: 'Main', description: 'Description' });
    request.flush(warehouse);
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Warehouse created.', 'Dismiss', { duration: 4000 });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/custom/warehouses?q=main');
    http.expectOne(req => req.url === base).flush({ items: [warehouse], total: 1, can_create: true });
  });

  it('keeps the code immutable, policy read-only and form values after a failed update', async () => {
    can.mockImplementation(permission => permission !== 'settings.manage');
    const page = await harness.navigateByUrl('/custom/warehouses/main/edit', WarehouseEditor);
    http.expectOne(`${base}/main`).flush(warehouse);
    harness.detectChanges();
    expect(page.form.controls.code.disabled).toBe(true);
    expect(harness.routeNativeElement?.textContent).toContain('FIFO');
    page.form.patchValue({ name: ' Changed ', description: '' });
    page.save();
    const request = http.expectOne(`${base}/main`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Changed', description: null });
    request.flush({ detail: 'Denied' }, { status: 403, statusText: 'Forbidden' });
    expect(page.form.controls.name.value).toBe(' Changed ');
    expect(page.form.controls.name.enabled).toBe(true);
    expect(page.form.controls.code.disabled).toBe(true);
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    page.save();
    http.expectOne(`${base}/main`).flush({ ...warehouse, name: 'Changed', description: null, active: false });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [], total: 0, can_create: true });
    expect(snackBar.open).toHaveBeenLastCalledWith('Warehouse saved.', 'Dismiss', { duration: 4000 });
  });

  it('edits inventory settings on the warehouse card and preserves input after a failed save', async () => {
    const page = await harness.navigateByUrl('/custom/warehouses/main/edit', WarehouseEditor);
    http.expectOne(`${base}/main`).flush(warehouse);
    harness.detectChanges();
    expect(page.canConfigure()).toBe(true);
    expect(page.form.controls.batch_tracking.value).toBe(true);
    expect(page.form.controls.issue_strategy.value).toBe('FIFO');
    page.form.controls.issue_strategy.setValue('FEFO');
    page.save();
    const request = http.expectOne(`${base}/main`);
    expect(request.request.body).toEqual({
      name: 'Main',
      description: 'Main warehouse',
      address_storage_enabled: true,
      tracking_mode: 'BATCH',
      issue_strategy: 'FEFO',
    });
    request.flush({ detail: 'Cannot change warehouse policy' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(page.form.controls.issue_strategy.value).toBe('FEFO');
    expect(page.form.controls.issue_strategy.enabled).toBe(true);
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    page.form.controls.batch_tracking.setValue(false);
    expect(page.form.controls.issue_strategy.disabled).toBe(true);
    expect(page.form.controls.issue_strategy.value).toBe('MANUAL');
    page.save();
    const retry = http.expectOne(`${base}/main`);
    expect(retry.request.body.tracking_mode).toBe('NONE');
    expect(retry.request.body.issue_strategy).toBe('MANUAL');
    retry.flush({ ...warehouse, tracking_mode: 'NONE', issue_strategy: 'MANUAL' });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [warehouse], total: 1, can_create: true });
    expect(snackBar.open).toHaveBeenLastCalledWith('Warehouse saved.', 'Dismiss', { duration: 4000 });
  });

  it('creates a warehouse with configured batch policy when settings management is granted', async () => {
    const page = await harness.navigateByUrl('/custom/warehouses/create', WarehouseEditor);
    expect(page.form.controls.issue_strategy.disabled).toBe(true);
    page.form.patchValue({
      code: 'NEW',
      name: 'New',
      address_storage_enabled: true,
      batch_tracking: true,
      issue_strategy: 'FEFO',
    });
    expect(page.form.controls.issue_strategy.enabled).toBe(true);
    page.save();
    const request = http.expectOne(base);
    expect(request.request.body).toEqual({
      code: 'NEW',
      name: 'New',
      description: null,
      address_storage_enabled: true,
      tracking_mode: 'BATCH',
      issue_strategy: 'FEFO',
    });
    request.flush({ ...warehouse, code: 'NEW', name: 'New' });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [], total: 0, can_create: true });
  });

  it('blocks editing when the backend denies management of this warehouse', async () => {
    const page = await harness.navigateByUrl('/custom/warehouses/main/edit', WarehouseEditor);
    http.expectOne(`${base}/main`).flush({ ...warehouse, can_manage: false });
    harness.detectChanges();
    expect(page.canSave()).toBe(false);
    expect(page.form.disabled).toBe(true);
    page.save();
    http.expectNone(() => true);
  });

  it('shows a single load failure with retry', async () => {
    const page = await harness.navigateByUrl('/custom/warehouses/main/edit', WarehouseEditor);
    http.expectOne(`${base}/main`).error(new ProgressEvent('error'));
    harness.detectChanges();
    expect(page.state().rejected).toBe(true);
    expect(page.actionError()).toBeNull();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]').length).toBe(1);
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    page.load();
    http.expectOne(`${base}/main`).flush(warehouse);
    expect(page.state().rejected).toBe(false);
  });
});

describe('warehouse archive dialog', () => {
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
        { provide: MAT_DIALOG_DATA, useValue: warehouse },
        { provide: MatDialogRef, useValue: ref },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('retains errors for active locations, permits retry and closes after archival', () => {
    const page = TestBed.createComponent(DeleteWarehouseDialog).componentInstance;
    page.confirm();
    page.confirm();
    const request = http.expectOne(`${base}/main`);
    expect(request.request.body).toEqual({ active: false });
    request.flush({ detail: 'Warehouse has active locations' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(ref.close).not.toHaveBeenCalled();
    expect(ref.disableClose).toBe(false);
    expect(page.actionError()).toContain('Warehouse has active locations');
    page.confirm();
    http.expectOne(`${base}/main`).flush({ ...warehouse, active: false });
    expect(ref.close).toHaveBeenCalledWith({ ...warehouse, active: false });
    expect(snackBar.open).toHaveBeenLastCalledWith('Warehouse archived.', 'Dismiss', { duration: 4000 });
  });
});
