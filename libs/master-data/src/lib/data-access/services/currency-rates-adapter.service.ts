import { inject, Injectable } from '@angular/core';
import type { RequestDataAdapter } from '@warehouse/shared';
import type { Observable } from 'rxjs';

import type { CurrencyRatesOverview, CurrencyRatesUpdate } from '../../types';
import { CurrenciesApiService } from './currencies-api.service';

@Injectable()
export class CurrencyRatesAdapterService implements RequestDataAdapter<
  CurrencyRatesOverview,
  void,
  CurrencyRatesUpdate
> {
  private readonly api = inject(CurrenciesApiService);

  load(): Observable<CurrencyRatesOverview> {
    return this.api.rates();
  }

  save(update: CurrencyRatesUpdate): Observable<CurrencyRatesOverview> {
    return this.api.loadRates(update.base_currency_id, update.expected_version);
  }
}
