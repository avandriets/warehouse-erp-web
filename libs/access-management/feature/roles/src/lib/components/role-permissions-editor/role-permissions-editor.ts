import type { OnChanges } from '@angular/core';
import { Component, computed, DestroyRef, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccessApiService, AccessStore } from '@warehouse/access-management/data-access';
import type { RoleRecord } from '@warehouse/access-management/util';
import { UIStateContainerComponent } from '@warehouse/shared';
import { forkJoin, Subject, takeUntil, tap } from 'rxjs';

@Component({
  providers: [AccessApiService, AccessStore],
  selector: 'am-role-permissions-editor',
  imports: [ReactiveFormsModule, MatCardModule, MatCheckboxModule, UIStateContainerComponent],
  templateUrl: './role-permissions-editor.html',
})
export class RolePermissionsEditor implements OnChanges {
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(AccessStore);
  readonly role = input.required<RoleRecord>();
  private readonly selectionChanged = new Subject<void>();
  readonly busy = computed(() => this.loading() || this.store.rolePermissionsSaving());
  readonly loading = computed(() => this.store.rolePermissionsLoading() || this.store.permissionsLoading());
  readonly ready = computed(() => this.store.rolePermissionsLoaded() && this.store.permissionsLoaded());
  readonly error = computed(
    () =>
      this.store.rolePermissionsActionError() ??
      this.store.rolePermissionsError() ??
      this.store.permissionsError() ??
      '',
  );
  readonly permissions = this.store.permissions.data;
  readonly form = new FormRecord<FormControl<boolean>>({});

  readonly state = computed(() => ({
    catalog: this.store.permissionsState(),
    assigned: this.store.rolePermissionsState(),
  }));
  readonly actionError = this.store.rolePermissionsActionError;

  constructor() {
    effect(() => {
      if (this.busy()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  get canSave(): boolean {
    return this.form.valid && this.form.dirty && !this.busy();
  }

  ngOnChanges(): void {
    this.selectionChanged.next();
    this.store.reset();
    for (const code of Object.keys(this.form.controls)) {
      this.form.removeControl(code);
    }
    this.load();
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  load(): void {
    forkJoin([this.store.listPermissions(), this.store.listRolePermissions(this.role().id)])
      .pipe(
        tap(() => this.updateSelection()),
        takeUntil(this.selectionChanged),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  save(): void {
    if (!this.canSave) {
      return;
    }

    const roleId = this.role().id;
    const codes = Object.entries(this.form.getRawValue())
      .filter(([, selected]) => selected)
      .map(([code]) => code);

    this.store
      .replaceRolePermissions(roleId, codes)
      .pipe(
        tap(() => this.snackBar.open('Changes saved.', 'Dismiss', { duration: 4000 })),
        tap(() => this.updateSelection()),
        takeUntil(this.selectionChanged),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private updateSelection(): void {
    const assigned = this.store.rolePermissions.data();

    for (const code of Object.keys(this.form.controls)) {
      this.form.removeControl(code);
    }

    for (const permission of this.permissions()) {
      this.form.addControl(
        permission.code,
        new FormControl(
          { value: assigned.some(item => item.code === permission.code), disabled: this.busy() },
          { nonNullable: true },
        ),
      );
    }

    this.form.markAsPristine();
  }
}
