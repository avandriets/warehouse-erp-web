import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { Product, ProductCreate, ProductsPage, ProductsQuery, ProductUpdate } from '../../types';

@Injectable()
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/catalog/products`;

  list(query: ProductsQuery): Observable<ProductsPage> {
    return this.http.get<ProductsPage>(this.base, {
      params: {
        limit: query.limit,
        offset: query.offset,
        ...(query.q ? { q: query.q } : {}),
        ...(query.category_id ? { category_id: query.category_id } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  get(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: ProductCreate): Observable<Product> {
    return this.http.post<Product>(this.base, payload);
  }

  update(id: string, payload: ProductUpdate): Observable<Product> {
    return this.http.patch<Product>(`${this.base}/${encodeURIComponent(id)}`, payload);
  }
}
