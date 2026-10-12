import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, take } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { Currency, CurrencyRatesOverview } from '../../types';
import { DeleteCurrencyDialog } from './components';
import { Currencies, CurrencyEditor } from './containers';
import { CURRENCIES_ROUTES } from './currencies.routes';

const base = '/api/reference-data/currencies';
const ratesBase = '/api/reference-data/currency-rates';
const eur: Currency = {
  id: 'eur',
  code: 'EUR',
  name: 'Euro',
  symbol: '€',
  active: true,
  display_decimal_places: 2,
  rounding_decimal_places: 2,
  rounding_mode: 'HALF_UP',
  version: 3,
  created_at: '2026-10-11T00:00:00Z',
  updated_at: '2026-10-11T00:00:00Z',
  created_by: null,
  updated_by: null,
};
const usd: Currency = { ...eur, id: 'usd', code: 'USD', name: 'US dollar', symbol: '$' };
const overview: CurrencyRatesOverview = {
  base_currency: eur,
  settings_version: 2,
  batch: {
    id: 'batch-1',
    base_currency_id: eur.id,
    base_code: 'EUR',
    source: 'Frankfurter',
    fetched_at: '2026-10-11T00:00:00Z',
    fetched_by: 'user-1',
    missing_codes: ['AAA'],
    rates: [{ base_code: 'EUR', quote_code: 'USD', rate: '1.123456', date: '2026-10-09' }],
  },
};

describe('Currencies workflow', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const snackBar = { open: vi.fn() };
  const can = vi.fn(() => true);
  const guard = vi.fn(() => true);
  const closed = new Subject<boolean>();
  const dialog = { open: vi.fn(() => ({ afterClosed: () => closed.asObservable().pipe(take(1)) })) };
  beforeEach(async () => {
    can.mockReset().mockReturnValue(true);
    snackBar.open.mockClear();
    dialog.open.mockClear();
    guard.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'custom/currencies', children: CURRENCIES_ROUTES }]),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: can, permissionGuard: guard } },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  function flushList(data: CurrencyRatesOverview = overview): void {
    http.expectOne(req => req.url === base).flush({ items: [eur, usd], total: 42 });
    http.expectOne(ratesBase).flush(data);
  }

  it('loads paginated currencies and saved rates with an explicit accounting base, source, dates and missing codes', async () => {
    const page = await harness.navigateByUrl('/custom/currencies?limit=10&offset=10', Currencies);
    const list = http.expectOne(req => req.url === base);
    expect(list.request.params.get('active')).toBe('true');
    expect(list.request.params.get('offset')).toBe('10');
    list.flush({ items: [eur, usd], total: 42 });
    http.expectOne(ratesBase).flush(overview);
    harness.detectChanges();
    expect(page.total()).toBe(42);
    expect(page.rateFor(usd)?.rate).toBe('1.123456');
    expect(harness.routeNativeElement?.textContent).toContain('Rate per 1 EUR');
    expect(harness.routeNativeElement?.textContent).toContain('Frankfurter');
    expect(harness.routeNativeElement?.textContent).toContain('AAA');
    page.deleteRecord(eur);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(guard).toHaveBeenCalledWith(
      expect.objectContaining({ data: { permission: 'settings.read' } }),
      expect.anything(),
    );
    await harness.navigateByUrl('/custom/currencies?q=usd&active=all', Currencies);
    const search = http.expectOne(req => req.url === base);
    expect(search.request.params.get('q')).toBe('usd');
    expect(search.request.params.has('active')).toBe(false);
    search.flush({ items: [usd], total: 1 });
  });

  it('refreshes the accounting currency changed in settings and clears rates from the old base', async () => {
    const page = await harness.navigateByUrl('/custom/currencies', Currencies);
    flushList();
    harness.detectChanges();
    const refresh = harness.routeNativeElement!.querySelector<HTMLButtonElement>(
      '[aria-label="Refresh currencies and saved rates"]',
    )!;
    refresh.click();
    refresh.click();
    http.expectOne(req => req.url === base).flush({ items: [eur, usd], total: 42 });
    const request = http.expectOne(ratesBase);
    expect(request.request.method).toBe('GET');
    request.flush({ base_currency: usd, settings_version: 3, batch: null });
    expect(page.rates()?.base_currency?.code).toBe('USD');
    expect(page.rateFor(usd)).toBeUndefined();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('1.123456');
    http.expectNone(req => req.method !== 'GET');
  });

  it('downloads rates for the selected base, prevents repeated requests and keeps saved data on failure', async () => {
    const page = await harness.navigateByUrl('/custom/currencies', Currencies);
    flushList();
    harness.detectChanges();
    const download = harness.routeNativeElement!.querySelector<HTMLButtonElement>('[pageActions] button')!;
    download.click();
    download.click();
    const request = http.expectOne(`${ratesBase}/load`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ base_currency_id: 'eur', expected_version: 2 });
    request.flush({ detail: 'Provider unavailable' }, { status: 503, statusText: 'Unavailable' });
    expect(page.rates()?.batch?.id).toBe('batch-1');
    expect(page.ratesError()).toBe('Provider unavailable');
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
    page.dismissRatesError();
    expect(page.ratesError()).toBeNull();
    page.downloadRates();
    http.expectOne(`${ratesBase}/load`).flush({ ...overview, batch: { ...overview.batch!, id: 'batch-2' } });
    expect(page.rates()?.batch?.id).toBe('batch-2');
    expect(snackBar.open).toHaveBeenCalledWith('Exchange rates loaded.', 'Dismiss', { duration: 4000 });
  });

  it('blocks downloads without an accounting currency and prevents writes for read-only users', async () => {
    can.mockReturnValue(false);
    const page = await harness.navigateByUrl('/custom/currencies', Currencies);
    flushList({ base_currency: null, settings_version: 1, batch: null });
    page.downloadRates();
    page.deleteRecord(usd);
    http.expectNone(req => req.method !== 'GET');
    expect(dialog.open).not.toHaveBeenCalled();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('Load exchange rates');
    expect(harness.routeNativeElement?.querySelector('a[href$="create"]')).toBeNull();
  });

  it('creates a currency with uppercase code and valid rounding rules, rejecting invalid precision', async () => {
    const page = await harness.navigateByUrl('/custom/currencies/create', CurrencyEditor);
    page.form.patchValue({ code: 'eur', name: ' Euro ', symbol: ' € ', display_decimal_places: 1.5 });
    page.save();
    http.expectNone(base);
    page.form.patchValue({ display_decimal_places: 2 });
    page.save();
    page.save();
    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      active: true,
      display_decimal_places: 2,
      rounding_decimal_places: 2,
      rounding_mode: 'HALF_UP',
    });
    request.flush(eur);
    await harness.fixture.whenStable();
    flushList();
    expect(TestBed.inject(Router).url).toBe('/custom/currencies');
  });

  it('keeps edit input on conflict and excludes the immutable code from versioned updates', async () => {
    const page = await harness.navigateByUrl('/custom/currencies/eur/edit', CurrencyEditor);
    http.expectOne(`${base}/eur`).flush(eur);
    page.form.patchValue({ rounding_mode: 'HALF_EVEN', rounding_decimal_places: 4 });
    page.save();
    const request = http.expectOne(`${base}/eur`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.code).toBeUndefined();
    expect(request.request.body.expected_version).toBe(3);
    expect(request.request.body.rounding_mode).toBe('HALF_EVEN');
    request.flush({ detail: 'Configuration version does not match' }, { status: 409, statusText: 'Conflict' });
    expect(page.form.controls.rounding_decimal_places.value).toBe(4);
    expect(page.form.controls.code.disabled).toBe(true);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('[role="alert"]')).toHaveLength(1);
  });

  it('renders one failed record-load error with a working retry', async () => {
    const page = await harness.navigateByUrl('/custom/currencies/eur/edit', CurrencyEditor);
    http.expectOne(`${base}/eur`).error(new ProgressEvent('error'));
    harness.detectChanges();
    const alerts = harness.routeNativeElement!.querySelectorAll('[role="alert"]');
    expect(alerts).toHaveLength(1);
    expect(page.actionError()).toBeNull();
    alerts[0].querySelector<HTMLButtonElement>('button')!.click();
    http.expectOne(`${base}/eur`).flush(eur);
    expect(page.state().resolved).toBe(true);
  });

  it('archives through a dialog and refreshes the list only after successful confirmation', async () => {
    const page = await harness.navigateByUrl('/custom/currencies', Currencies);
    flushList();
    page.deleteRecord(usd);
    expect(dialog.open).toHaveBeenCalledWith(
      DeleteCurrencyDialog,
      expect.objectContaining({ data: usd, width: '480px' }),
    );
    closed.next(false);
    http.expectNone(req => req.method === 'PATCH');
    page.deleteRecord(usd);
    closed.next(true);
    flushList();
  });
});

describe('Currency archive dialog', () => {
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
        { provide: MAT_DIALOG_DATA, useValue: eur },
        { provide: MatDialogRef, useValue: ref },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('keeps the dialog open when the accounting currency cannot be archived', () => {
    const page = TestBed.createComponent(DeleteCurrencyDialog).componentInstance;
    page.confirm();
    const request = http.expectOne(`${base}/eur`);
    expect(request.request.body).toEqual({ active: false, expected_version: 3 });
    request.flush(
      { detail: 'Record is selected in settings; replace the reference first' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(ref.close).not.toHaveBeenCalled();
    expect(ref.disableClose).toBe(false);
    expect(page.actionError()).toContain('replace the reference');
  });
});
