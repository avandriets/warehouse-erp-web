import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { CategoriesApiService } from '../../../../data-access/services';
import { CategoriesStore, CATEGORY_UPDATE_MESSAGE } from '../../../../data-access/stores';
import type { Category } from '../../../../types';

@Component({
  selector: 'md-delete-category-dialog',
  providers: [
    CategoriesApiService,
    CategoriesStore,
    { provide: CATEGORY_UPDATE_MESSAGE, useValue: 'Category archived.' },
  ],
  imports: [MatButtonModule, MatDialogModule, UIStateContainerComponent],
  templateUrl: './delete-category-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteCategoryDialog {
  private readonly store = inject(CategoriesStore);
  private readonly dialogRef = inject<MatDialogRef<DeleteCategoryDialog, Category>>(MatDialogRef);

  readonly record = inject<Category>(MAT_DIALOG_DATA);
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
