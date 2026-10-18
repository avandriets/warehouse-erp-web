import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { UIStateStatus } from '@warehouse/shared';
import { ConfirmDialog, entityEditorState, PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, EMPTY, finalize, map, of, Subject, switchMap, take, takeUntil } from 'rxjs';

import { MASTER_DATA_CONFIG } from '../../../../config';
import { CounterpartiesApiService } from '../../../../data-access/services';
import { CounterpartiesStore } from '../../../../data-access/stores';
import type { Counterparty, CounterpartyCreate, CounterpartyMatch } from '../../../../types';
import { normalizeCounterparty } from '../../../../types';

function requireRole(control: AbstractControl): ValidationErrors | null {
  return ['is_supplier', 'is_customer', 'is_other_recipient'].some(key => control.get(key)?.value === true)
    ? null
    : { roleRequired: true };
}

import { createDirectoryStatusActions } from '../../../../util';
import { DeleteCounterpartyDialog } from '../../components';

@Component({
  selector: 'md-counterparty-editor',
  providers: [CounterpartiesApiService, CounterpartiesStore],
  imports: [
    PageLayout,
    RouterLink,
    UIStateContainerComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './counterparty-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterpartyEditor {
  private readonly store = inject(CounterpartiesStore);
  private readonly config = inject(MASTER_DATA_CONFIG);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly selectionChanged = new Subject<void>();
  private readonly saving = signal(false);

  readonly editing = this.route.snapshot.data['mode'] === 'edit';
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly record = computed(() => this.store.entityById(this.id()));
  readonly canManage = computed(() => this.config.hasPermission('catalog.edit'));
  readonly statusActions = createDirectoryStatusActions<Counterparty>({
    pending: (): boolean => !!this.state().pending,
    canEdit: () => this.config.hasPermission('catalog.edit'),
    archiveDialog: DeleteCounterpartyDialog,
    restore: record => this.store.update({ id: record.id, payload: { active: true } }),
    accept: record => this.store.upsert(record),
  });
  readonly state = computed<UIStateStatus<string>>(() =>
    entityEditorState({
      editing: this.editing,
      exists: !!this.store.entityById(this.id()),
      operation: this.store.operationById(this.id()),
      saving: this.saving() || this.store.saving() || this.statusActions.busy(),
    }),
  );
  readonly actionError = computed(() =>
    this.state().rejected ? null : (this.store.duplicateCheckError() ?? this.store.actionError()),
  );
  readonly form = new FormGroup(
    {
      code: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(64)],
      }),
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)],
      }),
      tax_identifier: new FormControl('', { nonNullable: true, validators: Validators.maxLength(128) }),
      registration_identifier: new FormControl('', { nonNullable: true, validators: Validators.maxLength(128) }),
      legal_address: new FormControl('', { nonNullable: true }),
      postal_address: new FormControl('', { nonNullable: true }),
      contact_details: new FormControl('', { nonNullable: true }),
      payment_details: new FormControl('', { nonNullable: true }),
      is_supplier: new FormControl(false, { nonNullable: true }),
      is_customer: new FormControl(false, { nonNullable: true }),
      is_other_recipient: new FormControl(false, { nonNullable: true }),
    },
    { validators: requireRole },
  );

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
    this.selectionChanged.next();
    this.store.reset();
    this.store.dismissDuplicateError();
    this.resetForm();
    if (this.editing) {
      this.store.getById(this.id()).subscribe(record => this.fillForm(record));
    }
  }

  dismissActionError(): void {
    this.store.dismissActionError();
    this.store.dismissDuplicateError();
  }

  save(): void {
    if (this.state().pending || !this.state().resolved || this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const values = normalizeCounterparty(this.form.getRawValue());
    const record = this.store.entityById(this.id());
    if (this.editing && !record) {
      return;
    }

    this.dismissActionError();
    this.saving.set(true);
    this.form.disable({ emitEvent: false });
    this.store
      .checkDuplicates(values)
      .pipe(
        switchMap(({ matches }) => this.confirmDuplicates(matches, record?.id)),
        switchMap(confirmed => (confirmed ? this.persistRecord(values, record) : EMPTY)),
        takeUntil(this.selectionChanged),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving.set(false);
          this.applyFormLocks();
        }),
      )
      .subscribe(() => this.back());
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent, queryParamsHandling: 'preserve' });
  }

  private confirmDuplicates(matches: CounterpartyMatch[], currentId?: string): Observable<boolean> {
    const others = matches.filter(match => match.id !== currentId);
    if (!others.length) {
      return of(true);
    }

    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Similar counterparties found',
        message: `Review these records before saving: ${others.map(match => `${match.code} — ${match.name}`).join('; ')}. Save this counterparty anyway?`,
        confirmText: 'Save anyway',
      },
      width: '560px',
      maxWidth: '95vw',
    });

    return ref.afterClosed().pipe(
      take(1),
      map(confirmed => confirmed === true),
      finalize(() => ref.close()),
    );
  }

  private persistRecord(values: Omit<CounterpartyCreate, 'active'>, record?: Counterparty): Observable<Counterparty> {
    const { code, ...update } = values;

    return record
      ? this.store.update({ id: record.id, payload: { ...update } })
      : this.store.create({ ...update, code, active: true });
  }

  private resetForm(): void {
    this.form.reset();
    this.applyFormLocks();
  }

  private fillForm(record: Counterparty): void {
    this.form.reset(
      {
        ...record,
        tax_identifier: record.tax_identifier ?? '',
        registration_identifier: record.registration_identifier ?? '',
        legal_address: record.legal_address ?? '',
        postal_address: record.postal_address ?? '',
        contact_details: record.contact_details ?? '',
        payment_details: record.payment_details ?? '',
      },
      { emitEvent: false },
    );
    this.applyFormLocks();
  }

  private applyFormLocks(): void {
    this.form.enable({ emitEvent: false });
    if (this.editing) {
      this.form.controls.code.disable({ emitEvent: false });
    }
  }
}
