import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../config';
import { ADJUSTMENT_REASONS_ROUTES } from './adjustment-reasons/adjustment-reasons.routes';
import { CATEGORIES_ROUTES } from './categories/categories.routes';
import { COUNTERPARTIES_ROUTES } from './counterparties/counterparties.routes';
import { CURRENCIES_ROUTES } from './currencies/currencies.routes';
import { PRICE_TYPES_ROUTES } from './price-types/price-types.routes';
import { UNITS_ROUTES } from './units/units.routes';
import { VAT_RATES_ROUTES } from './vat-rates/vat-rates.routes';
import { WAREHOUSES_ROUTES } from './warehouses/warehouses.routes';

const cases = [
  {
    name: 'adjustment reasons',
    routes: ADJUSTMENT_REASONS_ROUTES,
    endpoint: '/api/reference-data/adjustment-reasons',
  },
  { name: 'price types', routes: PRICE_TYPES_ROUTES, endpoint: '/api/reference-data/price-types' },
  { name: 'currencies', routes: CURRENCIES_ROUTES, endpoint: '/api/reference-data/currencies' },
  { name: 'VAT rates', routes: VAT_RATES_ROUTES, endpoint: '/api/reference-data/vat-rates' },
  { name: 'categories', routes: CATEGORIES_ROUTES, endpoint: '/api/catalog/categories' },
  {
    name: 'counterparties',
    routes: COUNTERPARTIES_ROUTES,
    endpoint: '/api/reference-data/counterparties',
  },
  { name: 'units', routes: UNITS_ROUTES, endpoint: '/api/catalog/units' },
  { name: 'warehouses', routes: WAREHOUSES_ROUTES, endpoint: '/api/warehouses' },
];
const record = {
  id: 'record',
  code: 'CODE',
  name: 'Record',
  active: false,
  version: 3,
  operation: 'ADJUSTMENT',
  price_entry_mode: 'TAX_EXCLUSIVE',
  symbol: 'pcs',
  display_decimal_places: 2,
  rounding_decimal_places: 2,
  rounding_mode: 'HALF_UP',
  treatment: 'TAXABLE',
  rate: '20',
  parent_id: null,
  is_supplier: true,
  is_customer: false,
  is_other_recipient: false,
  tax_identifier: null,
  registration_identifier: null,
  legal_address: null,
  postal_address: null,
  contact_details: null,
  payment_details: null,
  dimension: 'COUNT',
  classifier_code: null,
  precision: 3,
  base_unit_id: null,
  factor_to_base: null,
  description: null,
  tracking_mode: 'NONE',
  issue_strategy: 'MANUAL',
  address_storage_enabled: false,
  can_manage: true,
  created_at: '',
  updated_at: '',
  created_by: null,
  updated_by: null,
};

describe.each(cases)('$name status workflow', ({ routes, endpoint }) => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const dialog = { open: vi.fn() };
  const snack = { open: vi.fn() };
  const can = vi.fn(() => true);

  beforeEach(async () => {
    dialog.open.mockReset().mockReturnValue({ afterClosed: () => of(undefined) });
    snack.open.mockClear();
    can.mockReset().mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'directory', children: routes }]),
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api', hasPermission: can, permissionGuard: () => true } },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snack },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  async function openEditor(): Promise<void> {
    await harness.navigateByUrl('/directory/record/edit');
    for (const request of http.match(req => req.method === 'GET' && req.params.has('limit'))) {
      request.flush({ items: [], total: 0 });
    }
    http.expectOne(`${endpoint}/record`).flush(record);
    harness.detectChanges();
  }

  function action(label: string): HTMLButtonElement | undefined {
    return Array.from(harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('[pageActions] button')).find(
      button => button.textContent?.trim() === label,
    );
  }

  it('changes status independently and preserves drafts for subsequent saves', async () => {
    await openEditor();
    const page = harness.routeDebugElement!.componentInstance;
    expect(action('Reload record')).toBeUndefined();
    expect(harness.routeNativeElement!.querySelector('[formControlName="active"]')).toBeNull();
    page.form.controls.name.setValue('Unsaved draft');
    action('Restore')!.click();
    action('Restore')!.click();
    const failed = http.expectOne(`${endpoint}/record`);
    expect(failed.request.body).toEqual({ active: true });
    failed.flush({ detail: 'Status conflict' }, { status: 409, statusText: 'Conflict' });
    harness.detectChanges();
    expect(page.form.controls.name.value).toBe('Unsaved draft');
    expect(action('Restore')!.disabled).toBe(false);
    expect(snack.open).toHaveBeenCalledTimes(1);
    action('Restore')!.click();
    http.expectOne(`${endpoint}/record`).flush({ ...record, active: true, version: 4 });
    harness.detectChanges();
    expect(page.form.controls.name.value).toBe('Unsaved draft');
    expect(action('Archive')).toBeDefined();
    action('Archive')!.click();
    expect(dialog.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: expect.objectContaining({ active: true, version: 4 }) }),
    );
    http.expectNone(req => req.method === 'PATCH');
    const archived = { ...record, active: false, version: 5 };
    dialog.open.mockReturnValueOnce({ afterClosed: () => of(archived) });
    action('Archive')!.click();
    harness.detectChanges();
    expect(action('Restore')).toBeDefined();
    expect(page.form.controls.name.value).toBe('Unsaved draft');
    page.save();
    if (endpoint.endsWith('/counterparties')) {
      http.expectOne(`${endpoint}/duplicate-check`).flush({ matches: [] });
    }
    const edit = http.expectOne(`${endpoint}/record`);
    expect(edit.request.body.name).toBe('Unsaved draft');
    expect(edit.request.body.active).toBeUndefined();
    edit.flush({ detail: 'Keep draft' }, { status: 409, statusText: 'Conflict' });
  });

  it('restores archived records from the filtered list and refreshes the exact filter', async () => {
    await harness.navigateByUrl('/directory?active=false');
    const initial = http.expectOne(req => req.url === endpoint);
    initial.flush({ items: [record], total: 1, can_create: true });
    if (endpoint.endsWith('/currencies')) {
      http
        .expectOne('/api/reference-data/currency-rates')
        .flush({ base_currency: null, settings_version: 1, batch: null });
    }
    harness.detectChanges();
    const restore = harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[matTooltip="Restore"]')!;
    expect(restore).not.toBeNull();
    restore.click();
    restore.click();
    const update = http.expectOne(`${endpoint}/record`);
    expect(update.request.body).toEqual({ active: true });
    update.flush({ ...record, active: true, version: 4 });
    const refresh = http.expectOne(req => req.url === endpoint);
    expect(refresh.request.params.get('active')).toBe('false');
    refresh.flush({ items: [], total: 0, can_create: true });
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('button[matTooltip="Restore"]')).toBeNull();
  });

  it('blocks status changes when the user cannot manage the record', async () => {
    can.mockReturnValue(false);
    await openEditor();
    const page = harness.routeDebugElement!.componentInstance;
    expect(action('Restore')).toBeUndefined();
    page.statusActions.restore(record);
    page.statusActions.archive({ ...record, active: true });
    expect(dialog.open).not.toHaveBeenCalled();
    http.expectNone(req => req.method !== 'GET');
  });
});
