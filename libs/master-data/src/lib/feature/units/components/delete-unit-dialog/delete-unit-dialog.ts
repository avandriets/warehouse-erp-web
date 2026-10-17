import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { UnitsApiService } from '../../../../data-access/services';
import { UNIT_UPDATE_MESSAGE, UnitsStore } from '../../../../data-access/stores';
import type { Unit } from '../../../../types';

@Component({
  selector: 'md-delete-unit-dialog',
  providers: [UnitsApiService, UnitsStore, { provide: UNIT_UPDATE_MESSAGE, useValue: 'Unit archived.' }],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-unit-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteUnitDialog {
  private readonly store = inject(UnitsStore);
  private readonly dialogRef = inject<MatDialogRef<DeleteUnitDialog, Unit>>(MatDialogRef);

  readonly record = inject<Unit>(MAT_DIALOG_DATA);
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
