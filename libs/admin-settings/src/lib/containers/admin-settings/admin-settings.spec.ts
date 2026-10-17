import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { AUTH_CONFIG } from '@warehouse/auth';

import type { AccountingSettings, EnterpriseSettings, NegativeStockValue } from '../../types';
import { AdminSettings } from './admin-settings';

const enterprise: EnterpriseSettings = {
  id: 'enterprise',
  version: 3,
  legal_name: 'Example SL',
  display_name: 'Example',
  tax_identifier: 'NIF-1',
  tax_identifier_label: 'NIF',
  registration_identifier: null,
  registration_identifier_label: 'Registration identifier',
  legal_address: null,
  postal_address: null,
  contact_details: null,
  payment_details: null,
  logo_url: null,
};
const accounting: AccountingSettings = {
  id: 'accounting',
  version: 5,
  currency_id: null,
  default_vat_rate_id: null,
  cost_accounting_enabled: false,
  cost_valuation_method: 'MOVING_WEIGHTED_AVERAGE',
  changes_locked_through: null,
  accounting_timezone: 'UTC',
  vat_enabled: false,
  price_entry_mode: 'TAX_EXCLUSIVE',
};
const rule = {
  id: 'rule',
  version: 2,
  document_type: 'GOODS_RECEIPT',
  prefix: 'GR-',
  numeric_width: 6,
  reset_annually: true,
};
const negativePath = '/api/settings/definitions/inventory.negative_stock_allowed/values';

describe('enterprise settings', () => {
  let http: HttpTestingController;
  const snackBar = { open: vi.fn() };
  beforeEach(() => {
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: snackBar },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AUTH_CONFIG, useValue: { apiUrl: '/api' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function open(cost = false, negatives: NegativeStockValue[] = []): AdminSettings {
    const page = TestBed.createComponent(AdminSettings).componentInstance;
    http.expectOne('/api/settings/enterprise').flush(enterprise);
    http.expectOne('/api/settings/accounting').flush({ ...accounting, cost_accounting_enabled: cost });
    http.expectOne('/api/settings/document-numbering').flush([rule]);
    http.expectOne(req => req.url === '/api/reference-data/currencies').flush({ items: [], total: 0 });
    http.expectOne(negativePath).flush(negatives);

    return page;
  }

  it('sends only changes and a version, preserves edits on conflict, and uses the new version after reload', () => {
    const page = open();
    page.enterpriseForm.patchValue({ tax_identifier: '', display_name: 'New name' });
    page.saveEnterprise();
    const request = http.expectOne('/api/settings/enterprise');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ expected_version: 3, tax_identifier: null, display_name: 'New name' });
    expect(page.enterpriseForm.disabled).toBe(true);
    request.flush({ detail: 'Version conflict' }, { status: 409, statusText: 'Conflict' });
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(page.enterpriseForm.controls.display_name.value).toBe('New name');
    expect(page.enterpriseForm.enabled).toBe(true);
    expect(page.actionError()).toContain('Reload');
    page.load();
    http.expectOne('/api/settings/enterprise').flush({ ...enterprise, version: 4 });
    http.expectOne('/api/settings/accounting').flush(accounting);
    http.expectOne('/api/settings/document-numbering').flush([rule]);
    http.expectOne(req => req.url === '/api/reference-data/currencies').flush({ items: [], total: 0 });
    http.expectOne(negativePath).flush([]);
    page.enterpriseForm.patchValue({ display_name: 'Retry' });
    page.saveEnterprise();
    const retry = http.expectOne('/api/settings/enterprise');
    expect(retry.request.body.expected_version).toBe(4);
    retry.flush({ ...enterprise, version: 5, display_name: 'Retry' });
    expect(page.enterpriseForm.pristine).toBe(true);
  });

  it('saves the selected accounting currency through the existing settings endpoint and preserves it on conflict', () => {
    const page = open();
    page.accountingForm.controls.currency_id.setValue('eur');
    page.saveAccounting();
    const request = http.expectOne('/api/settings/accounting');
    expect(request.request.body).toEqual({ currency_id: 'eur', expected_version: 5 });
    request.flush({ detail: 'Version conflict' }, { status: 409, statusText: 'Conflict' });
    expect(page.accountingForm.controls.currency_id.value).toBe('eur');
    expect(page.accountingForm.enabled).toBe(true);
    page.saveAccounting();
    http.expectOne('/api/settings/accounting').flush({ ...accounting, currency_id: 'eur', version: 6 });
    expect(page.accountingForm.pristine).toBe(true);
    page.accountingForm.controls.currency_id.setValue(null);
    page.saveAccounting();
    const clear = http.expectOne('/api/settings/accounting');
    expect(clear.request.body).toEqual({ currency_id: null, expected_version: 6 });
    clear.flush({ ...accounting, version: 7 });
  });

  it('keeps negative stock disabled until the saved cost mode is disabled', () => {
    const page = open(true);
    expect(page.negativeForm.controls.allowed.disabled).toBe(true);
    page.accountingForm.controls.cost_accounting_enabled.setValue(false);
    expect(page.negativeForm.controls.allowed.disabled).toBe(true);
    page.saveNegative();
    http.expectNone(negativePath);
    page.saveAccounting();
    const request = http.expectOne('/api/settings/accounting');
    expect(request.request.body).toEqual({ expected_version: 5, cost_accounting_enabled: false });
    request.flush({ ...accounting, version: 6 });
    expect(page.negativeForm.controls.allowed.enabled).toBe(true);
    page.accountingForm.controls.cost_accounting_enabled.setValue(true);
    expect(page.negativeForm.controls.allowed.disabled).toBe(true);
  });

  it('does not enable cost accounting while negative stock has unsaved edits', () => {
    const page = open();
    page.negativeForm.controls.allowed.setValue(true);
    page.accountingForm.controls.cost_accounting_enabled.setValue(true);
    expect(page.accountingForm.controls.cost_accounting_enabled.value).toBe(false);
    expect(page.negativeForm.controls.allowed.enabled).toBe(true);
    expect(page.actionError()).toContain('Before enabling cost accounting');
    page.saveAccounting();
    http.expectNone('/api/settings/accounting');
  });

  it('versions existing global overrides and omits versions on first creation', () => {
    const page = open();
    page.negativeForm.controls.allowed.setValue(true);
    page.saveNegative();
    const create = http.expectOne(negativePath);
    expect(create.request.method).toBe('PUT');
    expect(create.request.body).toEqual({ scope_type: 'GLOBAL', scope_id: null, value: true });
    create.flush({ id: 'negative', version: 1, scope_type: 'GLOBAL', scope_id: null, value: true });
    page.negativeForm.controls.allowed.setValue(false);
    page.saveNegative();
    const update = http.expectOne(negativePath);
    expect(update.request.body).toEqual({ scope_type: 'GLOBAL', scope_id: null, value: false, expected_version: 1 });
    update.flush({ id: 'negative', version: 2, scope_type: 'GLOBAL', scope_id: null, value: false });
  });

  it('prevents cost enabling while a saved scoped negative-stock override exists', () => {
    const page = open(false, [
      { id: 'negative', version: 1, scope_type: 'WAREHOUSE', scope_id: 'warehouse', value: true },
    ]);
    page.accountingForm.controls.cost_accounting_enabled.setValue(true);
    page.saveAccounting();
    http.expectNone('/api/settings/accounting');
    expect(page.actionError()).toContain('scoped overrides');
  });

  it('saves and versions rules independently and validates numbering limits', () => {
    const page = open();
    const editor = page.numbering()[0];
    editor.form.patchValue({ numeric_width: 19 });
    page.saveNumbering(editor);
    http.expectNone('/api/settings/document-numbering/GOODS_RECEIPT');
    editor.form.patchValue({ numeric_width: 8, reset_annually: false });
    page.saveNumbering(editor);
    const request = http.expectOne('/api/settings/document-numbering/GOODS_RECEIPT');
    expect(request.request.body).toEqual({ expected_version: 2, numeric_width: 8, reset_annually: false });
    request.flush({ ...rule, numeric_width: 8, reset_annually: false, version: 3 });
    expect(editor.record.version).toBe(3);
    expect(editor.form.pristine).toBe(true);
  });

  it('keeps unrelated form edits while committing only the saved section', () => {
    const page = open();
    page.accountingForm.patchValue({ accounting_timezone: 'Europe/Madrid' });
    page.accountingForm.markAsDirty();
    page.enterpriseForm.patchValue({ display_name: 'Updated' });
    page.saveEnterprise();
    http.expectOne('/api/settings/enterprise').flush({ ...enterprise, display_name: 'Updated', version: 4 });
    expect(page.accountingForm.controls.accounting_timezone.value).toBe('Europe/Madrid');
    expect(page.accountingForm.dirty).toBe(true);
    expect(page.enterpriseForm.pristine).toBe(true);
  });

  it('retains accounting entries when the server rejects a time zone', () => {
    const page = open();
    page.accountingForm.patchValue({
      accounting_timezone: 'Unknown/Zone',
      changes_locked_through: '2026-10-01',
      vat_enabled: true,
      price_entry_mode: 'TAX_INCLUSIVE',
    });
    page.saveAccounting();
    const request = http.expectOne('/api/settings/accounting');
    expect(request.request.body).toEqual({
      expected_version: 5,
      accounting_timezone: 'Unknown/Zone',
      changes_locked_through: '2026-10-01',
      vat_enabled: true,
      price_entry_mode: 'TAX_INCLUSIVE',
    });
    request.flush({ detail: 'Invalid accounting timezone' }, { status: 422, statusText: 'Invalid' });
    expect(page.accountingForm.controls.accounting_timezone.value).toBe('Unknown/Zone');
    expect(page.actionError()).toBe('Invalid accounting timezone');
  });

  it('renders loading, errors, retry, and resolved content through the shared state container', async () => {
    const fixture = TestBed.createComponent(AdminSettings);
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('ui-state-container') as HTMLElement;
    expect(container.getAttribute('aria-busy')).toBe('true');
    http
      .expectOne('/api/settings/enterprise')
      .flush({ detail: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    http.match(() => true);
    fixture.detectChanges();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Unavailable');
    const retry = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent?.trim() === 'Retry',
    )!;
    retry.click();
    http.expectOne('/api/settings/enterprise').flush(enterprise);
    http.expectOne('/api/settings/accounting').flush(accounting);
    http.expectOne('/api/settings/document-numbering').flush([rule]);
    http.expectOne(req => req.url === '/api/reference-data/currencies').flush({ items: [], total: 0 });
    http.expectOne(negativePath).flush([]);
    await fixture.whenStable();
    expect(container.getAttribute('aria-busy')).toBe('false');
    expect(container.textContent).toContain('Save enterprise');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows a load failure and can retry without creating defaults', () => {
    const page = TestBed.createComponent(AdminSettings).componentInstance;
    http
      .expectOne('/api/settings/enterprise')
      .flush({ detail: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
    http.match(() => true);
    expect(page.state().resolved).toBe(false);
    expect(page.state().pending).toBe(false);
    expect(page.state().err).toContain('Unavailable');
    page.load();
    http.expectOne('/api/settings/enterprise').flush(enterprise);
    http.expectOne('/api/settings/accounting').flush(accounting);
    http.expectOne('/api/settings/document-numbering').flush([]);
    http.expectOne(req => req.url === '/api/reference-data/currencies').flush({ items: [], total: 0 });
    http.expectOne(negativePath).flush([]);
    expect(page.state().resolved).toBe(true);
  });
  it('shows a snackbar only after a successful write', () => {
    const page = open();
    page.saveEnterprise();
    http.expectNone('/api/settings/enterprise');
    expect(snackBar.open).not.toHaveBeenCalled();
    page.enterpriseForm.patchValue({ display_name: 'Updated' });
    page.saveEnterprise();
    http.expectOne('/api/settings/enterprise').flush({ ...enterprise, display_name: 'Updated', version: 4 });
    expect(snackBar.open).toHaveBeenCalledWith('Settings saved.', 'Dismiss', { duration: 4000 });
  });
});
