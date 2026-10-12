import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { UIStateStatus } from '@warehouse/shared';
import { PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import { distinctUntilChanged, finalize, map } from 'rxjs';

import { CurrenciesAdapterService, CurrenciesApiService } from '../../../../data-access/services';
import { CurrenciesStore } from '../../../../data-access/stores';
import type { CurrencyRoundingMode } from '../../../../types';
import { CURRENCY_ROUNDING_LABELS, CURRENCY_ROUNDING_MODES } from '../../../../types';

@Component({
  selector: 'md-currency-editor',
  providers: [CurrenciesApiService, CurrenciesAdapterService, CurrenciesStore],
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
  templateUrl: './currency-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyEditor {
  private readonly store = inject(CurrenciesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly editing = this.route.snapshot.data['mode'] === 'edit';
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly labels = CURRENCY_ROUNDING_LABELS;
  readonly roundingModes = CURRENCY_ROUNDING_MODES;
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
      validators: [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.pattern(/^[A-Za-z]{3}$/),
        Validators.maxLength(3),
      ],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)],
    }),
    symbol: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(32)],
    }),
    display_decimal_places: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(9), Validators.pattern(/^\d$/)],
    }),
    rounding_decimal_places: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(9), Validators.pattern(/^\d$/)],
    }),
    rounding_mode: new FormControl<CurrencyRoundingMode>('HALF_UP', {
      nonNullable: true,
      validators: Validators.required,
    }),
    active: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
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
    this.form.reset({
      code: '',
      name: '',
      symbol: '',
      display_decimal_places: 2,
      rounding_decimal_places: 2,
      rounding_mode: 'HALF_UP',
      active: true,
    });
    if (!this.editing) {
      return;
    }

    this.form.controls.code.disable();
    this.store
      .getById(this.id())
      .pipe(
        finalize(() => {
          if (!this.destroyRef.destroyed && this.store.actionError()) {
            this.snackBar.open(this.store.actionError()!, 'Dismiss', { duration: 6000 });
          }
        }),
      )
      .subscribe(record => this.form.reset(record));
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
            symbol: values.symbol.trim(),
            display_decimal_places: values.display_decimal_places,
            rounding_decimal_places: values.rounding_decimal_places,
            rounding_mode: values.rounding_mode,
            active: values.active,
            expected_version: record.version,
          },
        })
      : this.store.create(values);
    request
      .pipe(
        finalize(() => {
          this.form.enable({ emitEvent: false });
          if (this.editing) {
            this.form.controls.code.disable();
          }
          if (!this.destroyRef.destroyed && this.store.actionError()) {
            this.snackBar.open(this.store.actionError()!, 'Dismiss', { duration: 6000 });
          }
        }),
      )
      .subscribe(() => {
        this.snackBar.open(this.editing ? 'Currency saved.' : 'Currency created.', 'Dismiss', {
          duration: 4000,
        });
        this.back();
      });
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
  }
}
