import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../config';
import type { CategoriesPage, CategoriesQuery, Category, CategoryCreate, CategoryUpdate } from '../../types';

@Injectable()
export class CategoriesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(MASTER_DATA_CONFIG).apiUrl.replace(/\/$/, '')}/catalog/categories`;

  list(query: CategoriesQuery): Observable<CategoriesPage> {
    return this.http.get<CategoriesPage>(this.base, {
      params: {
        limit: query.limit,
        offset: query.offset,
        ...(query.parent_id ? { parent_id: query.parent_id } : {}),
        ...(query.root_only ? { root_only: true } : {}),
        ...(query.exclude_subtree_id ? { exclude_subtree_id: query.exclude_subtree_id } : {}),
        ...(query.q ? { q: query.q } : {}),
        ...(query.active === undefined ? {} : { active: query.active }),
      },
    });
  }

  get(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: CategoryCreate): Observable<Category> {
    return this.http.post<Category>(this.base, payload);
  }

  update(id: string, payload: CategoryUpdate): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/${encodeURIComponent(id)}`, payload);
  }
}
