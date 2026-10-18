import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AUTH_CONFIG } from '@warehouse/auth';
import type { Observable } from 'rxjs';

import type {
  AccountingFields,
  AccountingSettings,
  DocumentNumbering,
  EnterpriseEditableFields,
  EnterpriseSettings,
  NegativeStockValue,
  NumberingFields,
} from '../../types';

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(AUTH_CONFIG).apiUrl}/settings`;

  getEnterprise(): Observable<EnterpriseSettings> {
    return this.http.get<EnterpriseSettings>(`${this.base}/enterprise`);
  }

  saveEnterprise(payload: Partial<EnterpriseEditableFields>): Observable<EnterpriseSettings> {
    return this.http.patch<EnterpriseSettings>(`${this.base}/enterprise`, payload);
  }

  getAccounting(): Observable<AccountingSettings> {
    return this.http.get<AccountingSettings>(`${this.base}/accounting`);
  }

  saveAccounting(payload: Partial<AccountingFields>): Observable<AccountingSettings> {
    return this.http.patch<AccountingSettings>(`${this.base}/accounting`, payload);
  }

  getNumbering(): Observable<DocumentNumbering[]> {
    return this.http.get<DocumentNumbering[]>(`${this.base}/document-numbering`);
  }

  saveNumbering(type: string, payload: Partial<NumberingFields>): Observable<DocumentNumbering> {
    return this.http.patch<DocumentNumbering>(`${this.base}/document-numbering/${encodeURIComponent(type)}`, payload);
  }

  getNegativeStockValues(): Observable<NegativeStockValue[]> {
    return this.http.get<NegativeStockValue[]>(`${this.base}/definitions/inventory.negative_stock_allowed/values`);
  }

  saveNegativeStock(value: boolean): Observable<NegativeStockValue> {
    return this.http.put<NegativeStockValue>(`${this.base}/definitions/inventory.negative_stock_allowed/values`, {
      scope_type: 'GLOBAL',
      scope_id: null,
      value,
    });
  }
}
