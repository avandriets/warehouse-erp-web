import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AUTH_CONFIG } from '@warehouse/auth';
import type { ReferenceOption, ReferenceOptionsPage } from '@warehouse/shared';
import { loadAllPages } from '@warehouse/shared';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CurrencyLookupService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(AUTH_CONFIG).apiUrl.replace(/\/$/, '')}/reference-data/currencies`;

  loadAll(): Observable<ReferenceOption[]> {
    return loadAllPages((offset, limit) =>
      this.http.get<ReferenceOptionsPage>(this.base, { params: { offset, limit } }),
    );
  }
}
