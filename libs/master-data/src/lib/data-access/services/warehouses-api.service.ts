import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { Warehouse, WarehouseCreate, WarehousesPageResponse, WarehousesQuery, WarehouseUpdate } from '../../types';

@Injectable()
export class WarehousesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/warehouses`;

  list(query: WarehousesQuery): Observable<WarehousesPageResponse> {
    return this.http.get<WarehousesPageResponse>(this.base, {
      params: {
        limit: query.limit,
        offset: query.offset,
        ...(query.q ? { q: query.q } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  get(id: string): Observable<Warehouse> {
    return this.http.get<Warehouse>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: WarehouseCreate): Observable<Warehouse> {
    return this.http.post<Warehouse>(this.base, payload);
  }

  update(id: string, payload: WarehouseUpdate): Observable<Warehouse> {
    return this.http.patch<Warehouse>(`${this.base}/${encodeURIComponent(id)}`, payload);
  }
}
