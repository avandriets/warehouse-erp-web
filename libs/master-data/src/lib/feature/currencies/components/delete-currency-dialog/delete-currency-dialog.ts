import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { CurrenciesApiService } from '../../../../data-access/services';
import { CurrenciesStore, CURRENCY_UPDATE_MESSAGE } from '../../../../data-access/stores';
import type { Currency } from '../../../../types';

@Component({
  selector: 'md-delete-currency-dialog',
  providers: [
    { provide: CURRENCY_UPDATE_MESSAGE, useValue: 'Currency archived.' },
    CurrenciesApiService,
    CurrenciesStore,
  ],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-currency-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteCurrencyDialog {
  private readonly store = inject(CurrenciesStore);
  private readonly dialogRef = inject<MatDialogRef<DeleteCurrencyDialog, Currency>>(MatDialogRef);

  readonly record = inject<Currency>(MAT_DIALOG_DATA);
  readonly actionError = this.store.actionError;
  readonly state = computed(() => ({ resolved: true, rejected: false, pending: this.store.saving(), err: null }));

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  confirm(): void {
    if (this.store.saving()) {
      return;
    }

    this.dialogRef.disableClose = true;
    this.store
      .update({ id: this.record.id, payload: { active: false, expected_version: this.record.version } })
      .pipe(
        finalize(() => {
          this.dialogRef.disableClose = false;
        }),
      )
      .subscribe(saved => {
        this.dialogRef.close(saved);
      });
  }
}
