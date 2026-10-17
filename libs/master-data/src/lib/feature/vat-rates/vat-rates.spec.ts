import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { VatRate } from '../../types';
import { DeleteVatRateDialog } from './components';
import { VatRateEditor, VatRates } from './containers';
import { VAT_RATES_ROUTES } from './vat-rates.routes';

const base = '/api/reference-data/vat-rates';
const vatRate: VatRate = {
  id: 'vat-1',
  code: 'VAT_STD',
  name: 'VAT standard',
  treatment: 'TAXABLE',
  rate: '20.1234',
  active: true,
  version: 3,
  created_at: '2026-10-11T00:00:00Z',
  updated_at: '2026-10-11T00:00:00Z',
  created_by: null,
  updated_by: null,
};

describe('VAT rates routes and backend workflow', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const snackBar = { open: vi.fn() };
  const can = vi.fn(() => true);
  const guard = vi.fn(() => true);
  const closed = new Subject<boolean>();
  const dialog = { open: vi.fn(() => ({ afterClosed: () => closed.asObservable() })) };

  beforeEach(async () => {
    snackBar.open.mockClear();
    can.mockReset().mockReturnValue(true);
    guard.mockClear();
    dialog.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'custom/vat-rates', children: VAT_RATES_ROUTES }]),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: can, permissionGuard: guard } },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  it('loads a paginated active list, searches, filters archived records, and retries failures', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates', VatRates);
    const request = http.expectOne(req => req.url === base);
    expect(request.request.params.get('active')).toBe('true');
    expect(request.request.params.get('limit')).toBe('25');
    expect(page.state().pending).toBe(true);
    request.flush({ items: [vatRate], total: 1 });
    harness.detectChanges();
    expect(page.state().resolved).toBe(true);
    expect(harness.routeNativeElement?.textContent).toContain('VAT standard');
    await harness.navigateByUrl('/custom/vat-rates?q=vat&active=false', VatRates);
    const filtered = http.expectOne(req => req.url === base);
    expect(filtered.request.params.get('q')).toBe('vat');
    expect(filtered.request.params.get('active')).toBe('false');
    filtered.flush({ detail: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(page.state().rejected).toBe(true);
    expect(snackBar.open).toHaveBeenCalled();
    page.load();
    http.expectOne(req => req.url === base).flush({ items: [], total: 0 });
    expect(page.state().empty).toBe(true);
    expect(page.total()).toBe(0);
  });

  it('keeps search, status and paging in the URL and restores filter controls on navigation', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates?q=vat&limit=10&offset=10', VatRates);
    const initial = http.expectOne(req => req.url === base);
    expect(initial.request.params.get('offset')).toBe('10');
    expect(initial.request.params.get('limit')).toBe('10');
    initial.flush({
      items: Array.from({ length: 10 }, (_, index) => ({ ...vatRate, id: `vat-${index}` })),
      total: 42,
    });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('ui-query-param-search')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('table[mat-table]')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('mat-paginator')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Items per page:');
    expect(page.total()).toBe(42);
    expect(harness.routeNativeElement?.textContent).toContain('11 – 20 of 42');
    void page.page({ pageIndex: 2, pageSize: 10, length: 21 });
    await harness.fixture.whenStable();
    const next = http.expectOne(req => req.url === base);
    expect(next.request.params.get('offset')).toBe('20');
    next.flush({ items: [vatRate], total: 21 });
    page.status.setValue('false');
    await harness.fixture.whenStable();
    const archived = http.expectOne(req => req.url === base);
    expect(archived.request.params.get('offset')).toBe('0');
    expect(archived.request.params.get('q')).toBe('vat');
    expect(archived.request.params.get('active')).toBe('false');
    archived.flush({ items: [], total: 0 });
    void page.page({ pageIndex: 0, pageSize: 50, length: 0 });
    await harness.fixture.whenStable();
    const resized = http.expectOne(req => req.url === base);
    expect(resized.request.params.get('limit')).toBe('50');
    resized.flush({ items: [], total: 0 });
    await harness.navigateByUrl('/custom/vat-rates?q=previous&active=all', VatRates);
    const restored = http.expectOne(req => req.url === base);
    expect(restored.request.params.has('active')).toBe(false);
    restored.flush({ items: [], total: 0 });
    harness.detectChanges();
    expect(page.status.value).toBe('all');
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('previous');
  });

  it('retains list filters after editing and returning to the list', async () => {
    await harness.navigateByUrl('/custom/vat-rates/vat-1/edit?q=vat&active=all&offset=25', VatRateEditor);
    http.expectOne(`${base}/vat-1`).flush(vatRate);
    harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('nav[aria-label="Breadcrumb"] a')!.click();
    await harness.fixture.whenStable();
    const request = http.expectOne(req => req.url === base);
    expect(request.request.params.get('q')).toBe('vat');
    expect(request.request.params.get('offset')).toBe('25');
    expect(request.request.params.has('active')).toBe(false);
    request.flush({ items: [vatRate], total: 1 });
    expect(TestBed.inject(Router).url).toContain('q=vat');
  });

  it('creates with the backend enum and navigates relatively, rejects blank input, and blocks repeated saves', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates/create', VatRateEditor);
    expect(page.form.controls.treatment.value).toBe('TAXABLE');
    page.form.patchValue({ code: '  ', name: '  ' });
    page.save();
    http.expectNone(base);
    page.form.patchValue({ code: ' VAT_STD ', name: ' VAT standard ', treatment: 'TAXABLE', rate: '20.1234' });
    page.save();
    page.save();
    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      code: 'VAT_STD',
      name: 'VAT standard',
      treatment: 'TAXABLE',
      rate: '20.1234',
      active: true,
    });
    expect(page.state().pending).toBe(true);
    request.flush(vatRate);
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/custom/vat-rates');
    http.expectOne(req => req.url === base).flush({ items: [vatRate], total: 1 });
    expect(snackBar.open).toHaveBeenCalledWith('VAT rate created.', 'Dismiss', { duration: 4000 });
    expect(guard).toHaveBeenCalled();
  });

  it('preserves create input after duplicate code and does not offer an irrelevant reload', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates/create', VatRateEditor);
    page.form.patchValue({ code: 'VAT_STD', name: 'VAT standard', treatment: 'TAXABLE', rate: '20.1234' });
    page.save();
    http.expectOne(base).flush({ detail: 'Directory code already exists' }, { status: 409, statusText: 'Conflict' });
    expect(page.form.controls.name.value).toBe('VAT standard');
    expect(page.form.controls.treatment.value).toBe('TAXABLE');
    expect(page.form.enabled).toBe(true);
    expect(page.actionError()).toBe('Directory code already exists');
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(harness.routeNativeElement?.textContent).not.toContain('Reload record');
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('edits an archived VAT rate without changing its status', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates/vat-1/edit', VatRateEditor);
    http.expectOne(`${base}/vat-1`).flush({ ...vatRate, active: false });
    page.form.patchValue({ treatment: 'NO_VAT' });
    page.save();
    const request = http.expectOne(`${base}/vat-1`);
    expect(request.request.body).toEqual({
      name: 'VAT standard',
      treatment: 'NO_VAT',
      rate: '0',
      expected_version: 3,
    });
    request.flush({ ...vatRate, active: false, treatment: 'NO_VAT', rate: '0', version: 4 });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [vatRate], total: 1 });
  });

  it('keeps zero-rated and no-VAT treatments distinct and forces their rate to zero', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates/create', VatRateEditor);
    page.form.patchValue({ code: 'ZERO', name: 'Zero rated', rate: '20' });
    page.form.controls.treatment.setValue('ZERO_RATE');
    expect(page.form.controls.rate.value).toBe('0');
    expect(page.form.controls.rate.disabled).toBe(true);
    page.save();
    const zero = http.expectOne(base);
    expect(zero.request.body).toEqual({
      code: 'ZERO',
      name: 'Zero rated',
      treatment: 'ZERO_RATE',
      rate: '0',
      active: true,
    });
    zero.flush({ detail: 'Directory code already exists' }, { status: 409, statusText: 'Conflict' });
    expect(page.form.controls.rate.disabled).toBe(true);
    page.form.controls.treatment.setValue('NO_VAT');
    page.form.patchValue({ code: 'NONE', name: 'No VAT' });
    page.save();
    const none = http.expectOne(base);
    expect(none.request.body.treatment).toBe('NO_VAT');
    expect(none.request.body.rate).toBe('0');
    none.flush({ ...vatRate, code: 'NONE', name: 'No VAT', treatment: 'NO_VAT', rate: '0.0000' });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [], total: 0 });
  });

  it('validates taxable percentages and sends exact decimal strings without rounding', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates/create', VatRateEditor);
    page.form.patchValue({ code: 'VAT', name: 'VAT' });
    for (const rate of ['', '0', '-1', '100.0001', '20.12345', '1e2']) {
      page.form.controls.rate.setValue(rate);
      page.save();
      http.expectNone(base);
    }
    page.form.controls.treatment.setValue('NO_VAT');
    page.form.controls.treatment.setValue('TAXABLE');
    expect(page.form.controls.rate.enabled).toBe(true);
    page.save();
    http.expectNone(base);
    page.form.controls.rate.setValue('0.0001');
    page.save();
    const request = http.expectOne(base);
    expect(request.request.body.rate).toBe('0.0001');
    request.flush({ ...vatRate, rate: '0.0001' });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [], total: 0 });
  });

  it('preserves input after version conflict, keeps code immutable, and uses the refreshed version after reload', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates/vat-1/edit', VatRateEditor);
    http.expectOne(`${base}/vat-1`).flush(vatRate);
    expect(page.form.controls.code.disabled).toBe(true);
    page.form.patchValue({ name: 'Changed rate' });
    page.save();
    const update = http.expectOne(`${base}/vat-1`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({
      name: 'Changed rate',
      treatment: 'TAXABLE',
      rate: '20.1234',
      expected_version: 3,
    });
    expect(update.request.body.code).toBeUndefined();
    update.flush({ detail: 'Version conflict' }, { status: 409, statusText: 'Conflict' });
    expect(page.form.controls.name.value).toBe('Changed rate');
    expect(page.form.controls.name.enabled).toBe(true);
    expect(page.form.controls.code.disabled).toBe(true);
    expect(page.actionError()).toContain('Reload');
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(harness.routeNativeElement?.textContent).toContain('Dismiss');
    expect(page.state().resolved).toBe(true);
    expect(page.state().pending).toBe(false);
    expect(snackBar.open).toHaveBeenCalled();
    page.load();
    http.expectOne(`${base}/vat-1`).flush({ ...vatRate, version: 4 });
    page.form.patchValue({ name: 'Retry' });
    page.save();
    const retry = http.expectOne(`${base}/vat-1`);
    expect(retry.request.body.expected_version).toBe(4);
    retry.flush({ ...vatRate, version: 5, name: 'Retry' });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [vatRate], total: 1 });
  });

  it('loads directly by id and reacts when navigating to another record in the same editor', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates/vat-1/edit', VatRateEditor);
    http.expectOne(`${base}/vat-1`).flush(vatRate);
    await harness.navigateByUrl('/custom/vat-rates/vat-2/edit', VatRateEditor);
    http.expectOne(`${base}/vat-2`).flush({ ...vatRate, id: 'vat-2', code: 'OTHER', name: 'Other' });
    expect(page.id()).toBe('vat-2');
    expect(page.form.controls.code.value).toBe('OTHER');
  });

  it('renders a failed record load and supports retry without allowing a write', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates/missing/edit', VatRateEditor);
    http.expectOne(`${base}/missing`).error(new ProgressEvent('error'));
    expect(page.state().rejected).toBe(true);
    expect(page.state().pending).toBe(false);
    expect(page.actionError()).toBeNull();
    harness.detectChanges();
    const alerts = harness.routeNativeElement!.querySelectorAll('[role="alert"]');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].textContent).toContain('The server is unavailable');
    expect(alerts[0].textContent).not.toContain('Dismiss');
    page.save();
    http.expectNone(req => req.method === 'PATCH');
    const retry = alerts[0].querySelector('button')!;
    expect(retry.textContent).toContain('Retry');
    retry.click();
    http.expectOne(`${base}/missing`).flush({ ...vatRate, id: 'missing' });
    expect(page.state().resolved).toBe(true);
  });

  it('opens delete in a dialog and cancellation makes no write or navigation', async () => {
    const page = await harness.navigateByUrl('/custom/vat-rates', VatRates);
    http.expectOne(req => req.url === base).flush({ items: [vatRate], total: 1 });
    page.deleteRecord(vatRate);
    expect(dialog.open).toHaveBeenCalledWith(
      DeleteVatRateDialog,
      expect.objectContaining({ data: vatRate, width: '480px' }),
    );
    closed.next(false);
    http.expectNone(req => req.method === 'PATCH');
    expect(TestBed.inject(Router).url).toBe('/custom/vat-rates');
  });

  it('hides mutation actions for read-only users', async () => {
    can.mockReturnValue(false);
    const page = await harness.navigateByUrl('/custom/vat-rates', VatRates);
    http.expectOne(req => req.url === base).flush({ items: [vatRate], total: 1 });
    harness.detectChanges();
    expect(page.canCreate()).toBe(false);
    expect(page.canEdit()).toBe(false);
    page.deleteRecord(vatRate);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.querySelector('a[href$="create"]')).toBeNull();
  });
});

describe('VAT rate archive dialog', () => {
  let http: HttpTestingController;
  const dialogRef = { close: vi.fn(), disableClose: false };
  const snackBar = { open: vi.fn() };
  beforeEach(() => {
    dialogRef.close.mockClear();
    dialogRef.disableClose = false;
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api' } },
        { provide: MAT_DIALOG_DATA, useValue: vatRate },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('archives only after confirmation and preserves the dialog on failure', () => {
    const page = TestBed.createComponent(DeleteVatRateDialog).componentInstance;
    http.expectNone(req => req.method === 'PATCH');
    page.confirm();
    page.confirm();
    const request = http.expectOne(`${base}/vat-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ active: false, expected_version: 3 });
    expect(dialogRef.disableClose).toBe(true);
    expect(page.state().pending).toBe(true);
    request.flush({ detail: 'Version conflict' }, { status: 409, statusText: 'Conflict' });
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(dialogRef.disableClose).toBe(false);
    expect(page.actionError()).toContain('Version conflict');
    expect(snackBar.open).toHaveBeenCalled();
    page.confirm();
    http.expectOne(`${base}/vat-1`).flush({ ...vatRate, active: false, version: 4 });
    expect(dialogRef.close).toHaveBeenCalledWith({ ...vatRate, active: false, version: 4 });
    expect(snackBar.open).toHaveBeenCalledWith('VAT rate archived.', 'Dismiss', { duration: 4000 });
  });
});
