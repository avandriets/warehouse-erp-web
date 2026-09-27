import type { OnChanges } from '@angular/core';
import { Component, computed, DestroyRef, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccessManagementApiService, RolePermissionsStore } from '@warehouse/access-management/data-access';
import type { RoleRecord } from '@warehouse/access-management/util';
import { UIStateContainerComponent } from '@warehouse/shared';
import { concatMap, Subject, takeUntil, tap } from 'rxjs';

@Component({
  providers: [RolePermissionsStore],
  selector: 'am-role-permissions',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, UIStateContainerComponent],
  templateUrl: './role-permissions.html',
})
export class RolePermissions implements OnChanges {
  private readonly dialogRef = inject(MatDialogRef, { optional: true });
  private readonly snackBar = inject(MatSnackBar);
  private readonly api = inject(AccessManagementApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(RolePermissionsStore);
  readonly role = input.required<RoleRecord>();
  readonly closed = output<void>();
  private readonly selectionChanged = new Subject<void>();
  readonly busy = computed(() => this.store.loading() || this.store.saving());
  readonly loading = this.store.loading;
  readonly ready = this.store.loaded;
  readonly error = computed(() => this.store.actionError() ?? this.store.error() ?? '');
  readonly permissions = this.store.permissions;
  readonly form = new FormRecord<FormControl<boolean>>({});

  readonly state = this.store.requestState;
  readonly actionError = this.store.actionError;

  constructor() {
    effect(() => {
      if (this.dialogRef) this.dialogRef.disableClose = this.store.saving();
      if (this.busy()) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });
  }

  ngOnChanges(): void {
    this.selectionChanged.next();
    this.store.reset();
    this.store.resetMutation();
    for (const code of Object.keys(this.form.controls)) this.form.removeControl(code);
    this.load();
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  load(): void {
    this.store
      .load(this.role().id)
      .pipe(
        tap(() => this.updateSelection()),
        takeUntil(this.selectionChanged),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  save(): void {
    const roleId = this.role().id;
    const codes = Object.entries(this.form.getRawValue())
      .filter(([, selected]) => selected)
      .map(([code]) => code);
    this.store
      .mutate(() => this.api.replaceRolePermissions(roleId, codes))
      .pipe(
        tap(() => this.snackBar.open('Changes saved.', 'Dismiss', { duration: 4000 })),
        concatMap(() => this.store.load(roleId)),
        tap(() => this.updateSelection()),
        takeUntil(this.selectionChanged),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private updateSelection(): void {
    const data = this.store.data();
    if (!data) return;
    for (const code of Object.keys(this.form.controls)) this.form.removeControl(code);
    for (const permission of data.permissions) {
      this.form.addControl(
        permission.code,
        new FormControl(
          { value: data.assigned.some(item => item.code === permission.code), disabled: this.busy() },
          { nonNullable: true },
        ),
      );
    }
    this.form.markAsPristine();
  }
}
