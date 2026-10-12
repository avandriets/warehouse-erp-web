import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { AdjustmentReason } from '../../types';
import { ADJUSTMENT_REASONS_ROUTES } from './adjustment-reasons.routes';
import { DeleteReasonDialog } from './components';
import { AdjustmentReasonEditor, AdjustmentReasons } from './containers';

const base = '/api/reference-data/adjustment-reasons';
const reason: AdjustmentReason = {
  id: 'reason-1',
  code: 'DAMAGE',
  name: 'Damaged goods',
  operation: 'SPOILAGE',
  active: true,
  version: 3,
  created_at: '2026-10-11T00:00:00Z',
  updated_at: '2026-10-11T00:00:00Z',
  created_by: null,
  updated_by: null,
};

describe('Adjustment reasons routes and backend workflow', () => {
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
        provideRouter([{ path: 'custom/reasons', children: ADJUSTMENT_REASONS_ROUTES }]),
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
    const page = await harness.navigateByUrl('/custom/reasons', AdjustmentReasons);
    const request = http.expectOne(req => req.url === base);
    expect(request.request.params.get('active')).toBe('true');
    expect(request.request.params.get('limit')).toBe('25');
    expect(page.state().pending).toBe(true);
    request.flush({ items: [reason], total: 1 });
    harness.detectChanges();
    expect(page.state().resolved).toBe(true);
    expect(harness.routeNativeElement?.textContent).toContain('Damaged goods');
    await harness.navigateByUrl('/custom/reasons?q=damage&active=false', AdjustmentReasons);
    const filtered = http.expectOne(req => req.url === base);
    expect(filtered.request.params.get('q')).toBe('damage');
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
    const page = await harness.navigateByUrl('/custom/reasons?q=damage&limit=10&offset=10', AdjustmentReasons);
    const initial = http.expectOne(req => req.url === base);
    expect(initial.request.params.get('offset')).toBe('10');
    expect(initial.request.params.get('limit')).toBe('10');
    initial.flush({
      items: Array.from({ length: 10 }, (_, index) => ({ ...reason, id: `reason-${index}` })),
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
    next.flush({ items: [reason], total: 21 });
    page.status.setValue('false');
    await harness.fixture.whenStable();
    const archived = http.expectOne(req => req.url === base);
    expect(archived.request.params.get('offset')).toBe('0');
    expect(archived.request.params.get('q')).toBe('damage');
    expect(archived.request.params.get('active')).toBe('false');
    archived.flush({ items: [], total: 0 });
    void page.page({ pageIndex: 0, pageSize: 50, length: 0 });
    await harness.fixture.whenStable();
    const resized = http.expectOne(req => req.url === base);
    expect(resized.request.params.get('limit')).toBe('50');
    resized.flush({ items: [], total: 0 });
    await harness.navigateByUrl('/custom/reasons?q=previous&active=all', AdjustmentReasons);
    const restored = http.expectOne(req => req.url === base);
    expect(restored.request.params.has('active')).toBe(false);
    restored.flush({ items: [], total: 0 });
    harness.detectChanges();
    expect(page.status.value).toBe('all');
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('previous');
  });

  it('retains list filters after editing and returning to the list', async () => {
    await harness.navigateByUrl('/custom/reasons/reason-1/edit?q=damage&active=all&offset=25', AdjustmentReasonEditor);
    http.expectOne(`${base}/reason-1`).flush(reason);
    harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('nav[aria-label="Breadcrumb"] a')!.click();
    await harness.fixture.whenStable();
    const request = http.expectOne(req => req.url === base);
    expect(request.request.params.get('q')).toBe('damage');
    expect(request.request.params.get('offset')).toBe('25');
    expect(request.request.params.has('active')).toBe(false);
    request.flush({ items: [reason], total: 1 });
    expect(TestBed.inject(Router).url).toContain('q=damage');
  });

  it('creates with the backend enum and navigates relatively, rejects blank input, and blocks repeated saves', async () => {
    const page = await harness.navigateByUrl('/custom/reasons/create', AdjustmentReasonEditor);
    page.form.patchValue({ code: '  ', name: '  ' });
    page.save();
    http.expectNone(base);
    page.form.patchValue({ code: ' DAMAGE ', name: ' Damaged goods ', operation: 'SPOILAGE' });
    page.save();
    page.save();
    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      code: 'DAMAGE',
      name: 'Damaged goods',
      operation: 'SPOILAGE',
      active: true,
    });
    expect(page.state().pending).toBe(true);
    request.flush(reason);
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/custom/reasons');
    http.expectOne(req => req.url === base).flush({ items: [reason], total: 1 });
    expect(snackBar.open).toHaveBeenCalledWith('Adjustment reason created.', 'Dismiss', { duration: 4000 });
    expect(guard).toHaveBeenCalled();
  });

  it('preserves input after version conflict, keeps code immutable, and uses the refreshed version after reload', async () => {
    const page = await harness.navigateByUrl('/custom/reasons/reason-1/edit', AdjustmentReasonEditor);
    http.expectOne(`${base}/reason-1`).flush(reason);
    expect(page.form.controls.code.disabled).toBe(true);
    page.form.patchValue({ name: 'Changed reason' });
    page.save();
    const update = http.expectOne(`${base}/reason-1`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({
      name: 'Changed reason',
      operation: 'SPOILAGE',
      active: true,
      expected_version: 3,
    });
    expect(update.request.body.code).toBeUndefined();
    update.flush({ detail: 'Version conflict' }, { status: 409, statusText: 'Conflict' });
    expect(page.form.controls.name.value).toBe('Changed reason');
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
    http.expectOne(`${base}/reason-1`).flush({ ...reason, version: 4 });
    page.form.patchValue({ name: 'Retry' });
    page.save();
    const retry = http.expectOne(`${base}/reason-1`);
    expect(retry.request.body.expected_version).toBe(4);
    retry.flush({ ...reason, version: 5, name: 'Retry' });
    await harness.fixture.whenStable();
    http.expectOne(req => req.url === base).flush({ items: [reason], total: 1 });
  });

  it('loads directly by id and reacts when navigating to another record in the same editor', async () => {
    const page = await harness.navigateByUrl('/custom/reasons/reason-1/edit', AdjustmentReasonEditor);
    http.expectOne(`${base}/reason-1`).flush(reason);
    await harness.navigateByUrl('/custom/reasons/reason-2/edit', AdjustmentReasonEditor);
    http.expectOne(`${base}/reason-2`).flush({ ...reason, id: 'reason-2', code: 'OTHER', name: 'Other' });
    expect(page.id()).toBe('reason-2');
    expect(page.form.controls.code.value).toBe('OTHER');
  });

  it('renders a failed record load and supports retry without allowing a write', async () => {
    const page = await harness.navigateByUrl('/custom/reasons/missing/edit', AdjustmentReasonEditor);
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
    http.expectOne(`${base}/missing`).flush({ ...reason, id: 'missing' });
    expect(page.state().resolved).toBe(true);
  });

  it('opens delete in a dialog and cancellation makes no write or navigation', async () => {
    const page = await harness.navigateByUrl('/custom/reasons', AdjustmentReasons);
    http.expectOne(req => req.url === base).flush({ items: [reason], total: 1 });
    page.deleteRecord(reason);
    expect(dialog.open).toHaveBeenCalledWith(
      DeleteReasonDialog,
      expect.objectContaining({ data: reason, width: '480px' }),
    );
    closed.next(false);
    http.expectNone(req => req.method === 'PATCH');
    expect(TestBed.inject(Router).url).toBe('/custom/reasons');
  });

  it('hides mutation actions for read-only users', async () => {
    can.mockReturnValue(false);
    const page = await harness.navigateByUrl('/custom/reasons', AdjustmentReasons);
    http.expectOne(req => req.url === base).flush({ items: [reason], total: 1 });
    harness.detectChanges();
    expect(page.canCreate()).toBe(false);
    expect(page.canEdit()).toBe(false);
    page.deleteRecord(reason);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.querySelector('a[href$="create"]')).toBeNull();
  });
});

describe('Adjustment reason archive dialog', () => {
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
        { provide: MAT_DIALOG_DATA, useValue: reason },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('archives only after confirmation and preserves the dialog on failure', () => {
    const page = TestBed.createComponent(DeleteReasonDialog).componentInstance;
    http.expectNone(req => req.method === 'PATCH');
    page.confirm();
    page.confirm();
    const request = http.expectOne(`${base}/reason-1`);
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
    http.expectOne(`${base}/reason-1`).flush({ ...reason, active: false, version: 4 });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(snackBar.open).toHaveBeenCalledWith('Adjustment reason archived.', 'Dismiss', { duration: 4000 });
  });
});
