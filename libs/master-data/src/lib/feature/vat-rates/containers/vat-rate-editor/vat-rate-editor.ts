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
import { PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import { distinctUntilChanged, finalize, map } from 'rxjs';

import { VatRatesApiService } from '../../../../data-access/services';
import { VatRatesStore } from '../../../../data-access/stores';
import type { TaxTreatment } from '../../../../types';
import { TAX_TREATMENT_LABELS, TAX_TREATMENTS } from '../../../../types';

@Component({
  selector: 'md-vat-rate-editor',
  providers: [VatRatesApiService, VatRatesStore],
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
  templateUrl: './vat-rate-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VatRateEditor {
  private readonly store = inject(VatRatesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly editing = this.route.snapshot.data['mode'] === 'edit';
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly labels = TAX_TREATMENT_LABELS;
  readonly treatments = TAX_TREATMENTS;
  readonly state = computed<UIStateStatus<string>>(() => {
    const operation = this.store.operationById(this.id());

    return {
      resolved: !this.editing || !!this.store.entityById(this.id()),
      rejected: this.editing && operation?.type === 'getById' && operation.status === 'error',
      pending: this.store.saving() || (this.editing && (!operation || operation.status === 'pending')),
      err: operation?.error ?? null,
    };
  });
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
    active: new FormControl(true, { nonNullable: true }),
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
    this.form.reset({ code: '', name: '', treatment: 'TAXABLE', rate: '', active: true }, { emitEvent: false });
    this.applyRateTreatment();
    if (!this.editing) {
      return;
    }

    this.form.controls.code.disable();
    this.store.getById(this.id()).subscribe(record => {
      this.form.reset(record, { emitEvent: false });
      this.applyRateTreatment();
    });
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
            active: values.active,
            expected_version: record.version,
          },
        })
      : this.store.create({ ...values, rate: values.treatment === 'TAXABLE' ? values.rate : '0' });
    request
      .pipe(
        finalize(() => {
          this.form.enable({ emitEvent: false });
          this.applyRateTreatment();
          if (this.editing) {
            this.form.controls.code.disable();
          }
        }),
      )
      .subscribe(() => {
        this.back();
      });
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
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
