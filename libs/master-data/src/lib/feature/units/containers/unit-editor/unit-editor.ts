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
import { combineUIStates, entityEditorState, PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import { distinctUntilChanged, finalize, map } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { UnitsApiService } from '../../../../data-access/services';
import { UnitsStore } from '../../../../data-access/stores';
import type { Unit, UnitDimension } from '../../../../types';
import { UNIT_DIMENSION_LABELS, UNIT_DIMENSIONS, unitFactor } from '../../../../types';
import { createDirectoryStatusActions } from '../../../../util';
import { UnitSelect } from '../../components';
import { DeleteUnitDialog } from '../../components';

@Component({
  selector: 'md-unit-editor',
  providers: [UnitsApiService, UnitsStore],
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
    UnitSelect,
  ],
  templateUrl: './unit-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitEditor {
  private readonly store = inject(UnitsStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly units = this.store.entities;
  readonly editing = this.route.snapshot.data['mode'] === 'edit';
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly dimensions = UNIT_DIMENSIONS;
  readonly labels = UNIT_DIMENSION_LABELS;
  readonly record = computed(() => this.store.entityById(this.id()));
  readonly canManage = computed(() => this.config.hasPermission('catalog.edit'));
  readonly statusActions = createDirectoryStatusActions<Unit>({
    pending: (): boolean => !!this.state().pending,
    canEdit: () => this.config.hasPermission('catalog.edit'),
    archiveDialog: DeleteUnitDialog,
    restore: record => this.store.update({ id: record.id, payload: { active: true } }),
    accept: record => this.store.upsert(record),
  });
  readonly state = computed<UIStateStatus<string>>(() =>
    combineUIStates(
      this.store.entityState(),
      entityEditorState({
        editing: this.editing,
        exists: !!this.store.entityById(this.id()),
        operation: this.store.operationById(this.id()),
        saving: this.store.saving() || this.statusActions.busy(),
      }),
    ),
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
    symbol: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(32)],
    }),
    dimension: new FormControl<UnitDimension>('COUNT', { nonNullable: true, validators: Validators.required }),
    classifier_code: new FormControl('', { nonNullable: true, validators: Validators.maxLength(32) }),
    display_decimal_places: new FormControl(3, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(9), Validators.pattern(/^\d+$/)],
    }),
    precision: new FormControl(3, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(6), Validators.pattern(/^\d+$/)],
    }),
    is_derived: new FormControl(false, { nonNullable: true }),
    base_unit_id: new FormControl<string | null>(null, Validators.required),
    factor_to_base: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.000000001), Validators.pattern(/^\d{1,15}(?:\.\d{1,9})?$/)],
    }),
  });
  readonly selectedDimension = toSignal(this.form.controls.dimension.valueChanges, {
    initialValue: this.form.controls.dimension.value,
  });

  constructor() {
    this.form.controls.is_derived.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.applyDefinitionLocks());
    this.form.controls.dimension.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.editing) {
        this.form.controls.base_unit_id.setValue(null);
        this.form.controls.factor_to_base.setValue('');
      }
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
    this.store.loadAll({ limit: 100, offset: 0 }).subscribe();
    if (this.editing) {
      this.store.getById(this.id()).subscribe(record => this.fillForm(record));
    }
  }

  dismissActionError(): void {
    this.store.dismissActionError();
  }

  save(): void {
    if (this.state().pending || !this.state().resolved || this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const values = this.form.getRawValue();
    const record = this.store.entityById(this.id());
    if (this.editing && !record) {
      return;
    }

    this.form.disable({ emitEvent: false });
    const mutable = {
      name: values.name,
      symbol: values.symbol,
      classifier_code: values.classifier_code || null,
      display_decimal_places: values.display_decimal_places,
      precision: values.precision,
    };
    const request = record
      ? this.store.update({
          id: record.id,
          payload: {
            ...mutable,
            ...(record.dimension === 'OTHER' ? { dimension: values.dimension } : {}),
          },
        })
      : this.store.create({
          ...mutable,
          code: values.code,
          dimension: values.dimension,
          base_unit_id: values.is_derived ? values.base_unit_id : null,
          factor_to_base: values.is_derived ? values.factor_to_base : null,
        });
    request.pipe(finalize(() => this.applyFormLocks())).subscribe(() => this.back());
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
  }

  private resetForm(): void {
    this.form.reset(
      {
        code: '',
        name: '',
        symbol: '',
        dimension: 'COUNT',
        classifier_code: '',
        display_decimal_places: 3,
        precision: 3,
        is_derived: false,
        base_unit_id: null,
        factor_to_base: '',
      },
      { emitEvent: false },
    );
    this.applyFormLocks();
    this.form.controls.dimension.updateValueAndValidity();
  }

  private fillForm(record: Unit): void {
    this.form.reset(
      {
        ...record,
        classifier_code: record.classifier_code ?? '',
        is_derived: record.base_unit_id !== null,
        factor_to_base: record.factor_to_base ? unitFactor(record.factor_to_base) : '',
      },
      { emitEvent: false },
    );
    this.applyFormLocks();
    this.form.controls.dimension.updateValueAndValidity();
  }

  private applyFormLocks(): void {
    this.form.enable({ emitEvent: false });
    this.applyDefinitionLocks();
  }

  private applyDefinitionLocks(): void {
    const controls = this.form.controls;
    if (this.editing) {
      controls.code.disable({ emitEvent: false });
      controls.is_derived.disable({ emitEvent: false });
      controls.base_unit_id.disable({ emitEvent: false });
      controls.factor_to_base.disable({ emitEvent: false });
      if (this.store.entityById(this.id())?.dimension !== 'OTHER') {
        controls.dimension.disable({ emitEvent: false });
      } else {
        controls.dimension.enable({ emitEvent: false });
      }
    } else if (controls.is_derived.value) {
      controls.base_unit_id.enable({ emitEvent: false });
      controls.factor_to_base.enable({ emitEvent: false });
    } else {
      controls.base_unit_id.disable({ emitEvent: false });
      controls.factor_to_base.disable({ emitEvent: false });
    }
  }
}
