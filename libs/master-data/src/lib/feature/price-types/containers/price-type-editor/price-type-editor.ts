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

import { PriceTypesAdapterService, PriceTypesApiService } from '../../../../data-access/services';
import { PriceTypesStore } from '../../../../data-access/stores';
import type { PriceEntryMode } from '../../../../types';
import { PRICE_ENTRY_MODE_LABELS, PRICE_ENTRY_MODES } from '../../../../types';

@Component({
  selector: 'md-price-type-editor',
  providers: [PriceTypesApiService, PriceTypesAdapterService, PriceTypesStore],
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
  templateUrl: './price-type-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceTypeEditor {
  private readonly store = inject(PriceTypesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly editing = this.route.snapshot.data['mode'] === 'edit';
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly labels = PRICE_ENTRY_MODE_LABELS;
  readonly entryModes = PRICE_ENTRY_MODES;
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
    price_entry_mode: new FormControl<PriceEntryMode>('TAX_EXCLUSIVE', {
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
    this.form.reset({ code: '', name: '', price_entry_mode: 'TAX_EXCLUSIVE', active: true });
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
            price_entry_mode: values.price_entry_mode,
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
        this.snackBar.open(this.editing ? 'Price type saved.' : 'Price type created.', 'Dismiss', {
          duration: 4000,
        });
        this.back();
      });
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
  }
}
