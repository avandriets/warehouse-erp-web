import { inject, Injectable } from '@angular/core';
import type { RequestDataAdapter } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { defer, EMPTY, forkJoin, map, throwError } from 'rxjs';

import type { SettingsSaveRequest, SettingsSnapshot } from '../../types';
import { changedFields } from '../../util';
import { SettingsApiService } from './settings-api.service';

@Injectable({ providedIn: 'root' })
export class SettingsAdapterService implements RequestDataAdapter<SettingsSnapshot, void, SettingsSaveRequest> {
  private readonly api = inject(SettingsApiService);

  load(): Observable<SettingsSnapshot> {
    return forkJoin({
      enterprise: this.api.getEnterprise(),
      accounting: this.api.getAccounting(),
      numbering: this.api.getNumbering(),
      negative: this.api.getNegativeStockValues(),
    });
  }

  save({ snapshot, update }: SettingsSaveRequest): Observable<SettingsSnapshot> {
    return defer(() => {
      switch (update.section) {
        case 'enterprise': {
          const changes = changedFields(update.values, snapshot.enterprise);

          return Object.keys(changes).length
            ? this.api
                .saveEnterprise({ ...changes, expected_version: snapshot.enterprise.version })
                .pipe(map(enterprise => ({ ...snapshot, enterprise })))
            : EMPTY;
        }
        case 'accounting': {
          if (update.values.cost_accounting_enabled && snapshot.negative.some(value => value.value)) {
            return throwError(
              () =>
                new Error(
                  'Before enabling cost accounting, disable and save the global negative-stock allowance and clear any enabled scoped overrides.',
                ),
            );
          }

          const changes = changedFields(update.values, snapshot.accounting);

          return Object.keys(changes).length
            ? this.api
                .saveAccounting({ ...changes, expected_version: snapshot.accounting.version })
                .pipe(map(accounting => ({ ...snapshot, accounting })))
            : EMPTY;
        }
        case 'negative': {
          if (snapshot.accounting.cost_accounting_enabled) {
            return throwError(() => new Error('Negative stock is unavailable with cost accounting enabled.'));
          }

          const original = snapshot.negative.find(value => value.scope_type === 'GLOBAL' && value.scope_id === null);

          return update.value !== (original?.value ?? false)
            ? this.api.saveNegativeStock(update.value, original?.version).pipe(
                map(value => ({
                  ...snapshot,
                  negative: [...snapshot.negative.filter(item => item !== original), value],
                })),
              )
            : EMPTY;
        }
        case 'numbering': {
          const original = snapshot.numbering.find(rule => rule.document_type === update.documentType);
          if (!original) {
            return throwError(() => new Error('The document numbering rule is not loaded. Reload settings.'));
          }

          const changes = changedFields(update.values, original);

          return Object.keys(changes).length
            ? this.api.saveNumbering(update.documentType, { ...changes, expected_version: original.version }).pipe(
                map(rule => ({
                  ...snapshot,
                  numbering: snapshot.numbering.map(item => (item.document_type === rule.document_type ? rule : item)),
                })),
              )
            : EMPTY;
        }
        default:
          return EMPTY;
      }
    });
  }
}
