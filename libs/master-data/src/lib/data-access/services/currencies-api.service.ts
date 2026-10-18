import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type {
  CurrenciesPage,
  CurrenciesQuery,
  Currency,
  CurrencyCreate,
  CurrencyRatesOverview,
  CurrencyUpdate,
} from '../../types';

@Injectable()
export class CurrenciesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/reference-data/currencies`;

  private readonly ratesBase = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/reference-data/currency-rates`;

  rates(): Observable<CurrencyRatesOverview> {
    return this.http.get<CurrencyRatesOverview>(this.ratesBase);
  }

  loadRates(baseCurrencyId: string): Observable<CurrencyRatesOverview> {
    return this.http.post<CurrencyRatesOverview>(`${this.ratesBase}/load`, {
      base_currency_id: baseCurrencyId,
    });
  }

  list(query: CurrenciesQuery): Observable<CurrenciesPage> {
    return this.http.get<CurrenciesPage>(this.base, {
      params: {
        limit: query.limit,
        offset: query.offset,
        ...(query.q ? { q: query.q } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  get(id: string): Observable<Currency> {
    return this.http.get<Currency>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: CurrencyCreate): Observable<Currency> {
    return this.http.post<Currency>(this.base, payload);
  }

  update(id: string, payload: CurrencyUpdate): Observable<Currency> {
    return this.http.patch<Currency>(`${this.base}/${encodeURIComponent(id)}`, payload);
  }
}
