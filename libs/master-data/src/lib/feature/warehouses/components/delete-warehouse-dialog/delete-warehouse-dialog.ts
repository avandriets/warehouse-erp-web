import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { WarehousesApiService } from '../../../../data-access/services';
import { WAREHOUSE_UPDATE_MESSAGE, WarehousesStore } from '../../../../data-access/stores';
import type { Warehouse } from '../../../../types';

@Component({
  selector: 'md-delete-warehouse-dialog',
  providers: [
    WarehousesApiService,
    WarehousesStore,
    { provide: WAREHOUSE_UPDATE_MESSAGE, useValue: 'Warehouse archived.' },
  ],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-warehouse-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteWarehouseDialog {
  private readonly store = inject(WarehousesStore);
  private readonly dialogRef = inject<MatDialogRef<DeleteWarehouseDialog, Warehouse>>(MatDialogRef);

  readonly record = inject<Warehouse>(MAT_DIALOG_DATA);
  readonly actionError = this.store.actionError;
  readonly state = computed(() => ({ resolved: true, rejected: false, pending: this.store.saving(), err: null }));

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  confirm(): void {
    if (this.store.saving() || this.record.can_manage === false) {
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
