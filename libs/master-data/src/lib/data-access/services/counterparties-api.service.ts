import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type {
  CounterpartiesPage,
  CounterpartiesQuery,
  Counterparty,
  CounterpartyCreate,
  CounterpartyDuplicateCheck,
  CounterpartyUpdate,
} from '../../types';

@Injectable()
export class CounterpartiesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/reference-data/counterparties`;

  list(query: CounterpartiesQuery): Observable<CounterpartiesPage> {
    return this.http.get<CounterpartiesPage>(this.base, {
      params: {
        limit: query.limit,
        offset: query.offset,
        ...(query.q ? { q: query.q } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  get(id: string): Observable<Counterparty> {
    return this.http.get<Counterparty>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: CounterpartyCreate): Observable<Counterparty> {
    return this.http.post<Counterparty>(this.base, payload);
  }

  duplicateCheck(payload: Omit<CounterpartyCreate, 'active'>): Observable<CounterpartyDuplicateCheck> {
    return this.http.post<CounterpartyDuplicateCheck>(`${this.base}/duplicate-check`, payload);
  }

  update(id: string, payload: CounterpartyUpdate): Observable<Counterparty> {
    return this.http.patch<Counterparty>(`${this.base}/${encodeURIComponent(id)}`, payload);
  }
}
