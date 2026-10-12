import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MASTER_DATA_CONFIG } from '../../config';
import type { VatRate } from '../../types';
import { VatRatesApiService } from '../services';
import { VAT_RATE_UPDATE_MESSAGE, VatRatesStore } from './vat-rates.store';

const base = '/api/reference-data/vat-rates';
const query = { limit: 25, offset: 0 };
const record: VatRate = {
  id: 'vat-1',
  code: 'VAT',
  name: 'VAT',
  treatment: 'TAXABLE',
  rate: '20.0000',
  active: true,
  version: 1,
  created_at: '2026-10-12T00:00:00Z',
  updated_at: '2026-10-12T00:00:00Z',
  created_by: null,
  updated_by: null,
};

describe('VAT store event notifications', () => {
  let http: HttpTestingController;
  const scopes: EnvironmentInjector[] = [];
  const snackBar = { open: vi.fn() };
  beforeEach(() => {
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        VatRatesApiService,
        { provide: MASTER_DATA_CONFIG, useValue: { apiUrl: '/api' } },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    for (const scope of scopes.splice(0)) {
      if (!scope.destroyed) {
        scope.destroy();
      }
    }
    http.verify();
  });

  function createStore(updateMessage = 'VAT rate saved.'): {
    scope: EnvironmentInjector;
    store: InstanceType<typeof VatRatesStore>;
  } {
    const scope = createEnvironmentInjector(
      [VatRatesStore, { provide: VAT_RATE_UPDATE_MESSAGE, useValue: updateMessage }],
      TestBed.inject(EnvironmentInjector),
    );
    scopes.push(scope);

    return { scope, store: scope.get(VatRatesStore) };
  }

  it('notifies once for the failing store when another store listens on the same event bus', () => {
    const first = createStore();
    const second = createStore();
    first.store.load({ ...query, q: 'first' }).subscribe();
    second.store.load({ ...query, q: 'second' }).subscribe();
    http
      .expectOne(req => req.params.get('q') === 'first')
      .flush({ detail: 'First load failed' }, { status: 503, statusText: 'Unavailable' });
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('First load failed', 'Dismiss', { duration: 6000 });
    expect(first.store.error()).toBe('First load failed');
    expect(second.store.error()).toBeNull();
    http.expectOne(req => req.params.get('q') === 'second').flush({ items: [], total: 0 });
    expect(snackBar.open).toHaveBeenCalledTimes(1);
  });

  it('does not replay a previous error when a later request is cancelled by store destruction', () => {
    const { store, scope } = createStore();
    store.load(query).subscribe();
    http
      .expectOne(req => req.url === base)
      .flush({ detail: 'Load failed' }, { status: 503, statusText: 'Unavailable' });
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    store.load(query).subscribe();
    const cancelled = http.expectOne(req => req.url === base);
    scope.destroy();
    expect(cancelled.cancelled).toBe(true);
    expect(snackBar.open).toHaveBeenCalledTimes(1);
  });

  it('handles record-load and create failures through the store without component finalizers', () => {
    const { store } = createStore();
    store.getById(record.id).subscribe();
    http.expectOne(`${base}/${record.id}`).flush({ detail: 'Not found' }, { status: 404, statusText: 'Not found' });
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Not found', 'Dismiss', { duration: 6000 });
    snackBar.open.mockClear();
    store.create({ code: 'VAT', name: 'VAT', treatment: 'TAXABLE', rate: '20', active: true }).subscribe();
    http.expectOne(base).flush({ detail: 'Directory code already exists' }, { status: 409, statusText: 'Conflict' });
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('Directory code already exists', 'Dismiss', {
      duration: 6000,
    });
  });

  it('keeps created, saved and archived notifications distinct and isolated between store instances', () => {
    const editor = createStore();
    const archive = createStore('VAT rate archived.');
    editor.store.create({ code: 'VAT', name: 'VAT', treatment: 'TAXABLE', rate: '20', active: true }).subscribe();
    http.expectOne(base).flush(record);
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('VAT rate created.', 'Dismiss', { duration: 4000 });
    snackBar.open.mockClear();
    editor.store.update({ id: record.id, payload: { name: 'Updated', expected_version: 1 } }).subscribe();
    http.expectOne(`${base}/${record.id}`).flush({ ...record, name: 'Updated', version: 2 });
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('VAT rate saved.', 'Dismiss', { duration: 4000 });
    snackBar.open.mockClear();
    archive.store.update({ id: record.id, payload: { active: false, expected_version: 2 } }).subscribe();
    http.expectOne(`${base}/${record.id}`).flush({ ...record, active: false, version: 3 });
    expect(snackBar.open).toHaveBeenCalledExactlyOnceWith('VAT rate archived.', 'Dismiss', { duration: 4000 });
  });
});
