import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { CounterpartiesApiService } from '../../../../data-access/services';
import { CounterpartiesStore, COUNTERPARTY_UPDATE_MESSAGE } from '../../../../data-access/stores';
import type { Counterparty } from '../../../../types';

@Component({
  selector: 'md-delete-counterparty-dialog',
  providers: [
    CounterpartiesApiService,
    CounterpartiesStore,
    { provide: COUNTERPARTY_UPDATE_MESSAGE, useValue: 'Counterparty archived.' },
  ],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-counterparty-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteCounterpartyDialog {
  private readonly store = inject(CounterpartiesStore);
  private readonly dialogRef = inject<MatDialogRef<DeleteCounterpartyDialog, Counterparty>>(MatDialogRef);

  readonly record = inject<Counterparty>(MAT_DIALOG_DATA);
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
      .update({ id: this.record.id, payload: { active: false } })
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
