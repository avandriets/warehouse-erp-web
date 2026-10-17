import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { Counterparty } from '../../types';
import { DeleteCounterpartyDialog } from './components';
import { Counterparties, CounterpartyEditor } from './containers';
import { COUNTERPARTIES_ROUTES } from './counterparties.routes';

const base = '/api/reference-data/counterparties';
const party: Counterparty = {
  id: 'party-1',
  code: 'ACME',
  name: 'Acme',
  active: true,
  is_supplier: true,
  is_customer: true,
  is_other_recipient: false,
  tax_identifier: 'TAX123',
  registration_identifier: null,
  legal_address: null,
  postal_address: null,
  contact_details: null,
  payment_details: null,
  version: 3,
  created_at: '2026-10-12T00:00:00Z',
  updated_at: '2026-10-12T00:00:00Z',
  created_by: null,
  updated_by: null,
};

describe('counterparty directory workflow', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let closed: Subject<boolean>;
  const snackBar = { open: vi.fn() };
  const can = vi.fn(() => true);
  const guard = vi.fn(() => true);
  const dialog = { open: vi.fn() };
  const close = vi.fn();
  beforeEach(async () => {
    snackBar.open.mockClear();
    close.mockClear();
    can.mockReset().mockReturnValue(true);
    guard.mockClear();
    closed = new Subject<boolean>();
    dialog.open.mockReset().mockReturnValue({ afterClosed: () => closed.asObservable(), close });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'custom/counterparties', children: COUNTERPARTIES_ROUTES }]),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: can, permissionGuard: guard } },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  it('searches identifiers, uses backend total, and keeps status and paging in the URL', async () => {
    const page = await harness.navigateByUrl('/custom/counterparties?q=TAX123&limit=10&offset=10', Counterparties);
    const request = http.expectOne(req => req.url === base);
    expect(request.request.params.get('q')).toBe('TAX123');
    expect(request.request.params.get('active')).toBe('true');
    request.flush({ items: [party], total: 21 });
    harness.detectChanges();
    expect(page.total()).toBe(21);
    expect(page.roleLabels(party)).toBe('Supplier, Customer');
    expect(harness.routeNativeElement?.textContent).toContain('TAX123');
    expect(harness.routeNativeElement?.querySelector('mat-paginator')).not.toBeNull();
    await page.page({ pageIndex: 2, pageSize: 10, length: 21 });
    await harness.fixture.whenStable();
    const next = http.expectOne(req => req.url === base);
    expect(next.request.params.get('offset')).toBe('20');
    next.flush({ items: [party], total: 21 });
    page.status.setValue('all');
    await harness.fixture.whenStable();
    const all = http.expectOne(req => req.url === base);
    expect(all.request.params.has('active')).toBe(false);
    expect(all.request.params.get('offset')).toBe('0');
    expect(all.request.params.get('q')).toBe('TAX123');
    all.flush({ items: [], total: 0 });
  });

  it('requires a role, checks duplicates first, normalizes values, and prevents repeated saves', async () => {
    const page = await harness.navigateByUrl('/custom/counterparties/create', CounterpartyEditor);
    page.form.patchValue({ code: ' ACME ', name: ' Acme ' });
    page.save();
    expect(page.form.hasError('roleRequired')).toBe(true);
    http.expectNone(() => true);
    page.form.patchValue({ is_supplier: true, is_customer: true, tax_identifier: ' TAX123 ', payment_details: '  ' });
    page.save();
    page.save();
    const check = http.expectOne(`${base}/duplicate-check`);
    expect(check.request.body.tax_identifier).toBe('TAX123');
    expect(check.request.body.payment_details).toBeNull();
    expect(page.state().pending).toBe(true);
    check.flush({ matches: [] });
    const create = http.expectOne(base);
    expect(create.request.body).toMatchObject({
      code: 'ACME',
      name: 'Acme',
      is_supplier: true,
      is_customer: true,
      active: true,
    });
    create.flush(party);
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Counterparty created.', 'Dismiss', { duration: 4000 });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/custom/counterparties');
    http.expectOne(req => req.url === base).flush({ items: [party], total: 1 });
  });

  it('preserves drafts when duplicate warnings are cancelled and allows an explicit save anyway', async () => {
    const page = await harness.navigateByUrl('/custom/counterparties/create', CounterpartyEditor);
    page.form.patchValue({ code: 'NEW', name: 'Acme', is_other_recipient: true });
    page.save();
    http
      .expectOne(`${base}/duplicate-check`)
      .flush({ matches: [{ id: party.id, code: party.code, name: party.name }] });
    expect(dialog.open.mock.calls[0][1].data.message).toContain('ACME');
    http.expectNone(base);
    closed.next(false);
    expect(page.form.enabled).toBe(true);
    expect(page.form.controls.name.value).toBe('Acme');
    expect(page.state().pending).toBe(false);
    expect(snackBar.open).not.toHaveBeenCalled();
    closed = new Subject<boolean>();
    page.save();
    http
      .expectOne(`${base}/duplicate-check`)
      .flush({ matches: [{ id: party.id, code: party.code, name: party.name }] });
    closed.next(true);
    http.expectOne(base).flush(party);
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [party], total: 1 });
  });

  it('shows one error and preserves fields if duplicate checking fails', async () => {
    const page = await harness.navigateByUrl('/custom/counterparties/create', CounterpartyEditor);
    page.form.patchValue({ code: 'NEW', name: 'Draft', is_supplier: true });
    page.save();
    http
      .expectOne(`${base}/duplicate-check`)
      .flush({ detail: 'Check unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(page.actionError()).toBe('Check unavailable');
    expect(page.form.controls.name.value).toBe('Draft');
    expect(page.form.enabled).toBe(true);
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Check unavailable', 'Dismiss', { duration: 6000 });
    http.expectNone(base);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
    page.dismissActionError();
    expect(page.actionError()).toBeNull();
  });

  it('excludes itself from duplicate warnings, clears nullable fields, and keeps code immutable on conflicts', async () => {
    const page = await harness.navigateByUrl('/custom/counterparties/party-1/edit', CounterpartyEditor);
    http.expectOne(`${base}/party-1`).flush(party);
    expect(page.form.controls.code.disabled).toBe(true);
    page.form.patchValue({ name: 'Changed', tax_identifier: '', is_customer: false });
    page.save();
    http
      .expectOne(`${base}/duplicate-check`)
      .flush({ matches: [{ id: party.id, code: party.code, name: party.name }] });
    expect(dialog.open).not.toHaveBeenCalled();
    const update = http.expectOne(`${base}/party-1`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body.code).toBeUndefined();
    expect(update.request.body).toMatchObject({
      name: 'Changed',
      tax_identifier: null,
      is_supplier: true,
      is_customer: false,
      expected_version: 3,
    });
    update.flush({ detail: 'Version conflict' }, { status: 409, statusText: 'Conflict' });
    expect(page.form.controls.name.value).toBe('Changed');
    expect(page.form.controls.code.disabled).toBe(true);
    expect(page.actionError()).toContain('Reload');
    expect(page.state().pending).toBe(false);
  });

  it('renders one retry state on a failed load and preserves filters through breadcrumbs', async () => {
    const page = await harness.navigateByUrl(
      '/custom/counterparties/party-1/edit?q=Acme&active=all',
      CounterpartyEditor,
    );
    http.expectOne(`${base}/party-1`).flush({ detail: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(page.actionError()).toBeNull();
    page.load();
    http.expectOne(`${base}/party-1`).flush(party);
    harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('nav a')!.click();
    await harness.fixture.whenStable();
    const list = http.expectOne(req => req.url === base);
    expect(list.request.params.get('q')).toBe('Acme');
    expect(list.request.params.has('active')).toBe(false);
    list.flush({ items: [party], total: 1 });
  });

  it('cancels duplicate checks when the editor is destroyed', async () => {
    const page = await harness.navigateByUrl('/custom/counterparties/create', CounterpartyEditor);
    page.form.patchValue({ code: 'NEW', name: 'Draft', is_supplier: true });
    page.save();
    const request = http.expectOne(`${base}/duplicate-check`);
    harness.fixture.destroy();
    expect(request.cancelled).toBe(true);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('uses separate create and edit permissions for actions and routes', async () => {
    can.mockReturnValue(false);
    const page = await harness.navigateByUrl('/custom/counterparties', Counterparties);
    http.expectOne(req => req.url === base).flush({ items: [party], total: 1 });
    harness.detectChanges();
    expect(page.canCreate()).toBe(false);
    expect(page.canEdit()).toBe(false);
    page.deleteRecord(party);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.querySelector('a[href$="create"]')).toBeNull();
    expect(COUNTERPARTIES_ROUTES.map(route => route.data?.['permission'])).toEqual([
      'catalog.read',
      'catalog.create',
      'catalog.edit',
    ]);
  });
});

describe('counterparty archive dialog', () => {
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
        { provide: MAT_DIALOG_DATA, useValue: party },
        { provide: MatDialogRef, useValue: ref },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('archives with the record version and keeps the dialog open on failure', () => {
    const page = TestBed.createComponent(DeleteCounterpartyDialog).componentInstance;
    http.expectNone(() => true);
    page.confirm();
    page.confirm();
    const request = http.expectOne(`${base}/party-1`);
    expect(request.request.body).toEqual({ active: false, expected_version: 3 });
    request.flush({ detail: 'Version conflict' }, { status: 409, statusText: 'Conflict' });
    expect(ref.close).not.toHaveBeenCalled();
    expect(ref.disableClose).toBe(false);
    page.confirm();
    http.expectOne(`${base}/party-1`).flush({ ...party, active: false, version: 4 });
    expect(ref.close).toHaveBeenCalledWith({ ...party, active: false, version: 4 });
    expect(snackBar.open).toHaveBeenLastCalledWith('Counterparty archived.', 'Dismiss', { duration: 4000 });
  });
});
