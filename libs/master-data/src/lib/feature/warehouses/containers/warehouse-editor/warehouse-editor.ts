import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { UIStateStatus } from '@warehouse/shared';
import { entityEditorState, PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import { distinctUntilChanged, finalize, map } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { WarehousesApiService } from '../../../../data-access/services';
import { WarehousesStore } from '../../../../data-access/stores';
import type { Warehouse, WarehouseIssueStrategy, WarehousePolicy } from '../../../../types';
import { WAREHOUSE_ISSUE_LABELS, WAREHOUSE_TRACKING_LABELS } from '../../../../types';
import { createDirectoryStatusActions } from '../../../../util';
import { DeleteWarehouseDialog } from '../../components';

@Component({
  selector: 'md-warehouse-editor',
  providers: [WarehousesApiService, WarehousesStore],
  imports: [
    PageLayout,
    RouterLink,
    UIStateContainerComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './warehouse-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseEditor {
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly store = inject(WarehousesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly editing = this.route.snapshot.data['mode'] === 'edit';
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly record = computed(() => this.store.entityById(this.id()));
  readonly canConfigure = computed(() => this.canSave() && this.config.hasPermission('settings.manage'));
  readonly trackingLabels = WAREHOUSE_TRACKING_LABELS;
  readonly issueLabels = WAREHOUSE_ISSUE_LABELS;
  readonly canSave = computed(
    () => this.config.hasPermission('warehouse.manage') && (!this.editing || this.record()?.can_manage !== false),
  );
  readonly statusActions = createDirectoryStatusActions<Warehouse>({
    pending: (): boolean => !!this.state().pending,
    canEdit: () => this.canSave(),
    archiveDialog: DeleteWarehouseDialog,
    restore: record => this.store.update({ id: record.id, payload: { active: true } }),
    accept: record => this.store.upsert(record),
  });
  readonly state = computed<UIStateStatus<string>>(() =>
    entityEditorState({
      editing: this.editing,
      exists: !!this.store.entityById(this.id()),
      operation: this.store.operationById(this.id()),
      saving: this.store.saving() || this.statusActions.busy(),
    }),
  );
  readonly actionError = computed(() => (this.state().rejected ? null : this.store.actionError()));
  readonly form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(64)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)],
    }),
    description: new FormControl('', { nonNullable: true }),
    address_storage_enabled: new FormControl(false, { nonNullable: true }),
    batch_tracking: new FormControl(false, { nonNullable: true }),
    issue_strategy: new FormControl<WarehouseIssueStrategy>('MANUAL', { nonNullable: true }),
  });

  constructor() {
    this.form.controls.batch_tracking.valueChanges.pipe(takeUntilDestroyed()).subscribe(enabled => {
      if (!enabled) {
        this.form.controls.issue_strategy.setValue('MANUAL');
      }
      this.syncPolicyControls();
    });
    this.route.paramMap
      .pipe(
        map(params => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.load());
  }

  load(): void {
    this.store.reset();
    this.resetForm();
    if (this.editing) {
      this.store.getById(this.id()).subscribe(record => this.fillForm(record));
    }
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  save(): void {
    if (!this.canSave() || this.state().pending || !this.state().resolved || this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const values = this.form.getRawValue();
    const policy = this.policyPayload();
    const record = this.store.entityById(this.id());
    if (this.editing && !record) {
      return;
    }

    this.form.disable({ emitEvent: false });
    const request = record
      ? this.store.update({
          id: record.id,
          payload: {
            ...policy,
            name: values.name,
            description: values.description,
          },
        })
      : this.store.create({
          ...policy,
          code: values.code,
          name: values.name,
          description: values.description,
        });
    request.pipe(finalize(() => this.applyFormLocks())).subscribe(() => {
      this.back();
    });
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
  }

  private policyPayload(): Partial<WarehousePolicy> {
    if (!this.canConfigure()) {
      return {};
    }

    const values = this.form.getRawValue();

    return {
      address_storage_enabled: values.address_storage_enabled,
      tracking_mode: values.batch_tracking ? 'BATCH' : 'NONE',
      issue_strategy: values.batch_tracking ? values.issue_strategy : 'MANUAL',
    };
  }

  private resetForm(): void {
    this.form.reset({
      code: '',
      name: '',
      description: '',
      address_storage_enabled: false,
      batch_tracking: false,
      issue_strategy: 'MANUAL',
    });
    this.applyFormLocks();
  }

  private fillForm(record: Warehouse): void {
    this.form.reset(
      { ...record, description: record.description ?? '', batch_tracking: record.tracking_mode === 'BATCH' },
      { emitEvent: false },
    );
    this.applyFormLocks();
  }

  private applyFormLocks(): void {
    if (this.canSave()) {
      this.form.enable({ emitEvent: false });
    } else {
      this.form.disable({ emitEvent: false });
    }
    if (this.editing) {
      this.form.controls.code.disable({ emitEvent: false });
    }
    this.syncPolicyControls();
  }

  private syncPolicyControls(): void {
    const controls = [
      this.form.controls.address_storage_enabled,
      this.form.controls.batch_tracking,
      this.form.controls.issue_strategy,
    ];
    for (const control of controls) {
      if (this.canConfigure()) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
    if (!this.form.controls.batch_tracking.value) {
      this.form.controls.issue_strategy.disable({ emitEvent: false });
    }
  }
}
