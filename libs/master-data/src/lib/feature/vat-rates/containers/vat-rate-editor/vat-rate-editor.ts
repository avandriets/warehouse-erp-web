import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { UIStateStatus } from '@warehouse/shared';
import { entityEditorState, PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import { distinctUntilChanged, finalize, map } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { VatRatesApiService } from '../../../../data-access/services';
import { VatRatesStore } from '../../../../data-access/stores';
import type { TaxTreatment, VatRate } from '../../../../types';
import { TAX_TREATMENT_LABELS, TAX_TREATMENTS } from '../../../../types';
import { createDirectoryStatusActions } from '../../../../util';
import { DeleteVatRateDialog } from '../../components';

@Component({
  selector: 'md-vat-rate-editor',
  providers: [VatRatesApiService, VatRatesStore],
  imports: [
    PageLayout,
    RouterLink,
    UIStateContainerComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './vat-rate-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VatRateEditor {
  private readonly store = inject(VatRatesStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly editing = this.route.snapshot.data['mode'] === 'edit';
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly labels = TAX_TREATMENT_LABELS;
  readonly treatments = TAX_TREATMENTS;
  readonly record = computed(() => this.store.entityById(this.id()));
  readonly canManage = computed(() => this.config.hasPermission('settings.manage'));
  readonly statusActions = createDirectoryStatusActions<VatRate>({
    pending: (): boolean => !!this.state().pending,
    canEdit: () => this.config.hasPermission('settings.manage'),
    archiveDialog: DeleteVatRateDialog,
    restore: record =>
      this.store.update({ id: record.id, payload: { active: true, expected_version: record.version } }),
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
    treatment: new FormControl<TaxTreatment>('TAXABLE', {
      nonNullable: true,
      validators: Validators.required,
    }),
    rate: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d+(?:\.\d{1,4})?$/),
        Validators.min(0.0001),
        Validators.max(100),
      ],
    }),
  });

  constructor() {
    this.form.controls.treatment.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.applyRateTreatment());
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
    const request = record
      ? this.store.update({
          id: record.id,
          payload: {
            name: values.name,
            treatment: values.treatment,
            rate: values.treatment === 'TAXABLE' ? values.rate : '0',
            expected_version: record.version,
          },
        })
      : this.store.create({ ...values, active: true, rate: values.treatment === 'TAXABLE' ? values.rate : '0' });
    request.pipe(finalize(() => this.applyFormLocks())).subscribe(() => {
      this.back();
    });
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
  }

  private resetForm(): void {
    this.form.reset({ code: '', name: '', treatment: 'TAXABLE', rate: '' }, { emitEvent: false });
    this.applyFormLocks();
  }

  private fillForm(record: VatRate): void {
    this.form.reset(record, { emitEvent: false });
    this.applyFormLocks();
  }

  private applyFormLocks(): void {
    this.form.enable({ emitEvent: false });
    this.applyRateTreatment();
    if (this.editing) {
      this.form.controls.code.disable({ emitEvent: false });
    }
  }

  private applyRateTreatment(): void {
    const rate = this.form.controls.rate;
    if (this.form.controls.treatment.value === 'TAXABLE') {
      rate.enable({ emitEvent: false });
    } else {
      rate.setValue('0', { emitEvent: false });
      rate.disable({ emitEvent: false });
    }
  }
}
