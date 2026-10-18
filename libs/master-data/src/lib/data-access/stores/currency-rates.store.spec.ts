import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject, throwError } from 'rxjs';

import type { CurrencyRatesOverview } from '../../types';
import { CurrenciesApiService } from '../services';
import { CurrencyRatesStore } from './currency-rates.store';

const overview: CurrencyRatesOverview = { base_currency: null, settings_version: 1, batch: null };

describe('Currency rate store notifications', () => {
  const snack = { open: vi.fn() };
  const api = { rates: vi.fn(), loadRates: vi.fn() };

  beforeEach(() => {
    snack.open.mockClear();
    api.rates.mockReset().mockReturnValue(of(overview));
    api.loadRates.mockReset().mockReturnValue(of(overview));
    TestBed.configureTestingModule({
      providers: [
        CurrencyRatesStore,
        { provide: CurrenciesApiService, useValue: api },
        { provide: MatSnackBar, useValue: snack },
      ],
    });
  });

  it('reports each outcome once when multiple screens own rate stores', () => {
    const owner = TestBed.inject(CurrencyRatesStore);
    const scope = Injector.create({ parent: TestBed.inject(Injector), providers: [CurrencyRatesStore] });
    try {
      const other = scope.get(CurrencyRatesStore);
      owner.save({ type: 'rates', base_currency_id: 'eur' }).subscribe();
      expect(snack.open).toHaveBeenCalledExactlyOnceWith('Exchange rates loaded.', 'Dismiss', { duration: 4000 });
      snack.open.mockClear();
      api.rates.mockReturnValueOnce(throwError(() => new Error('Offline')));
      other.load().subscribe();
      expect(snack.open).toHaveBeenCalledTimes(1);
      expect(snack.open).toHaveBeenCalledWith(expect.any(String), 'Dismiss', { duration: 6000 });
      snack.open.mockClear();
      api.loadRates.mockReturnValueOnce(throwError(() => new Error('Offline')));
      owner.save({ type: 'rates', base_currency_id: 'eur' }).subscribe();
      expect(snack.open).toHaveBeenCalledTimes(1);
      expect(snack.open).toHaveBeenCalledWith(expect.any(String), 'Dismiss', { duration: 6000 });
    } finally {
      scope.destroy();
    }
  });

  it('does not notify after a request is cancelled', () => {
    const pending = new Subject<CurrencyRatesOverview>();
    api.loadRates.mockReturnValueOnce(pending);
    const store = TestBed.inject(CurrencyRatesStore);
    const request = store.save({ type: 'rates', base_currency_id: 'eur' }).subscribe();
    request.unsubscribe();
    pending.next(overview);
    pending.complete();
    expect(snack.open).not.toHaveBeenCalled();
    expect(store.saving()).toBe(false);
  });
});
