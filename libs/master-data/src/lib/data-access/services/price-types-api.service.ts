import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { PriceType, PriceTypeCreate, PriceTypesPage, PriceTypesQuery, PriceTypeUpdate } from '../../types';

@Injectable()
export class PriceTypesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/reference-data/price-types`;

  list(query: PriceTypesQuery): Observable<PriceTypesPage> {
    return this.http.get<PriceTypesPage>(this.base, {
      params: {
        limit: query.limit,
        offset: query.offset,
        ...(query.q ? { q: query.q } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  get(id: string): Observable<PriceType> {
    return this.http.get<PriceType>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: PriceTypeCreate): Observable<PriceType> {
    return this.http.post<PriceType>(this.base, payload);
  }

  update(id: string, payload: PriceTypeUpdate): Observable<PriceType> {
    return this.http.patch<PriceType>(`${this.base}/${encodeURIComponent(id)}`, payload);
  }
}
