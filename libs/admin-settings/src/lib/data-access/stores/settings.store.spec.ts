import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AUTH_CONFIG } from '@warehouse/auth';

import type { SettingsSnapshot } from '../../types';
import { SettingsStore } from './settings.store';

const snapshot: SettingsSnapshot = {
  enterprise: {
    id: 'enterprise',
    version: 1,
    legal_name: 'Company',
    display_name: 'Company',
    tax_identifier: null,
    tax_identifier_label: 'Tax identifier',
    registration_identifier: null,
    registration_identifier_label: 'Registration identifier',
    legal_address: null,
    postal_address: null,
    contact_details: null,
    payment_details: null,
    logo_url: null,
  },
  accounting: {
    id: 'accounting',
    version: 1,
    currency_id: null,
    default_vat_rate_id: null,
    cost_accounting_enabled: false,
    cost_valuation_method: 'FIFO',
    changes_locked_through: null,
    accounting_timezone: 'UTC',
    vat_enabled: false,
    price_entry_mode: 'TAX_EXCLUSIVE',
  },
  numbering: [
    { id: 'rule', version: 1, document_type: 'GOODS_ISSUE', prefix: '', numeric_width: 6, reset_annually: true },
  ],
  negative: [],
};

describe('SettingsStore and its aggregate adapter', () => {
  let http: HttpTestingController;
  let store: InstanceType<typeof SettingsStore>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SettingsStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_CONFIG, useValue: { apiUrl: '/api' } },
      ],
    });
    store = TestBed.inject(SettingsStore);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function flushLoad(): void {
    http.expectOne('/api/settings/enterprise').flush(snapshot.enterprise);
    http.expectOne('/api/settings/accounting').flush(snapshot.accounting);
    http.expectOne('/api/settings/document-numbering').flush(snapshot.numbering);
    http.expectOne('/api/settings/definitions/inventory.negative_stock_allowed/values').flush(snapshot.negative);
  }

  it('loads all settings as one snapshot and keeps requests cold', () => {
    const load = store.reload();
    http.expectNone(() => true);
    expect(store.data()).toBeNull();
    load.subscribe();
    expect(store.requestState().pending).toBe(true);
    flushLoad();
    expect(store.data()).toEqual(snapshot);
    expect(store.requestState()).toMatchObject({ resolved: true, pending: false, rejected: false });
  });

  it('merges an update into the snapshot, uses its latest version, and blocks duplicate writes and reloads', () => {
    store.reload().subscribe();
    flushLoad();
    const before = store.data()!;
    const update = { section: 'enterprise' as const, values: { ...before.enterprise, display_name: 'Updated' } };
    const save = store.update(update);
    http.expectNone(() => true);
    save.subscribe();
    expect(store.saving()).toBe(true);
    expect(store.savingSection()).toBe('enterprise');
    expect(store.state()).toMatchObject({ resolved: true, pending: true, savingSection: 'enterprise' });
    const request = http.expectOne('/api/settings/enterprise');
    expect(request.request.body).toEqual({ display_name: 'Updated', expected_version: 1 });
    store.update(update).subscribe();
    store.reload().subscribe();
    http.expectNone(() => true);
    request.flush({ ...before.enterprise, display_name: 'Updated', version: 2 });
    expect(store.data()?.accounting).toBe(before.accounting);
    expect(store.data()?.numbering).toBe(before.numbering);
    expect(store.data()?.negative).toBe(before.negative);
    expect(store.saving()).toBe(false);
    expect(store.savingSection()).toBeNull();
    expect(store.state().pending).toBe(false);
    store.update({ section: 'enterprise', values: { ...store.data()!.enterprise, display_name: 'Next' } }).subscribe();
    const next = http.expectOne('/api/settings/enterprise');
    expect(next.request.body.expected_version).toBe(2);
    next.flush({ ...before.enterprise, display_name: 'Next', version: 3 });
  });

  it('keeps the snapshot and load state when a write fails and allows retry with unchanged version', () => {
    store.reload().subscribe();
    flushLoad();
    const before = store.data();
    store.update({ section: 'accounting', values: { ...snapshot.accounting, vat_enabled: true } }).subscribe();
    http
      .expectOne('/api/settings/accounting')
      .flush({ detail: 'Version conflict' }, { status: 409, statusText: 'Conflict' });
    expect(store.data()).toBe(before);
    expect(store.requestState()).toMatchObject({ resolved: true, rejected: false });
    expect(store.actionError()).toContain('Reload settings');
    expect(store.saving()).toBe(false);
    store.dismissActionError();
    expect(store.actionError()).toBeNull();
  });

  it('does not request an unchanged save or report it as successful', () => {
    store.reload().subscribe();
    flushLoad();
    store.update({ section: 'enterprise', values: snapshot.enterprise }).subscribe();
    http.expectNone(() => true);
    expect(store.saving()).toBe(false);
    expect(store.savingSection()).toBeNull();
    expect(store.state().pending).toBe(false);
  });

  it('enforces the negative-stock dependency in the adapter even without a form', () => {
    store.setData({
      ...snapshot,
      negative: [{ id: 'negative', version: 1, scope_type: 'WAREHOUSE', scope_id: 'warehouse', value: true }],
    });
    store
      .update({ section: 'accounting', values: { ...snapshot.accounting, cost_accounting_enabled: true } })
      .subscribe();
    http.expectNone(() => true);
    expect(store.actionError()).toContain('scoped overrides');
    expect(store.data()?.accounting.cost_accounting_enabled).toBe(false);
    store.setData({ ...snapshot, accounting: { ...snapshot.accounting, cost_accounting_enabled: true } });
    store.update({ section: 'negative', value: true }).subscribe();
    http.expectNone(() => true);
    expect(store.actionError()).toContain('unavailable');
  });
});
