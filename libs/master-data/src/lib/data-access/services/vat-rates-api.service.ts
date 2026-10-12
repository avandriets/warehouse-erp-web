import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { VatRate, VatRateCreate, VatRatesPage, VatRatesQuery, VatRateUpdate } from '../../types';

@Injectable()
export class VatRatesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/reference-data/vat-rates`;

  list(query: VatRatesQuery): Observable<VatRatesPage> {
    return this.http.get<VatRatesPage>(this.base, {
      params: {
        limit: query.limit,
        offset: query.offset,
        ...(query.q ? { q: query.q } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  get(id: string): Observable<VatRate> {
    return this.http.get<VatRate>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: VatRateCreate): Observable<VatRate> {
    return this.http.post<VatRate>(this.base, payload);
  }

  update(id: string, payload: VatRateUpdate): Observable<VatRate> {
    return this.http.patch<VatRate>(`${this.base}/${encodeURIComponent(id)}`, payload);
  }
}
