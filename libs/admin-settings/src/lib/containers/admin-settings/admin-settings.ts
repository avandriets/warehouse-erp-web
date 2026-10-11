import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { PageLayout, UIStateContainerComponent } from '@warehouse/shared';
import { finalize } from 'rxjs';

import { SettingsStore } from '../../data-access/stores';
import type {
  AccountingFields,
  AccountingSettings,
  EnterpriseEditableFields,
  EnterpriseSettings,
  SettingsSnapshot,
  SettingsUpdate,
} from '../../types';
import type { NumberingEditor } from '../types';

@Component({
  selector: 'admin-settings',
  providers: [SettingsStore],
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    RouterLink,
    PageLayout,
    UIStateContainerComponent,
  ],
  templateUrl: './admin-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettings {
  private readonly store = inject(SettingsStore);
  private readonly snackBar = inject(MatSnackBar);

  readonly state = this.store.state;
  readonly validationError = signal('');
  readonly actionError = computed(() => this.store.actionError() || this.validationError());
  readonly costEnabled = signal(false);
  readonly negativeUnavailable = computed(
    () => this.costEnabled() || !!this.store.data()?.accounting.cost_accounting_enabled,
  );
  readonly scopedNegative = this.store.scopedNegative;
  readonly numbering = signal<NumberingEditor[]>([]);
  readonly enterpriseFields: readonly {
    key: keyof EnterpriseEditableFields;
    label: string;
    nullable: boolean;
    multiline?: boolean;
  }[] = [
    { key: 'legal_name', label: 'Legal name', nullable: false },
    { key: 'display_name', label: 'Display name', nullable: false },
    { key: 'tax_identifier', label: 'Tax identifier number', nullable: true },
    { key: 'registration_identifier', label: 'Registration identifier number', nullable: true },
    { key: 'legal_address', label: 'Legal address', nullable: true, multiline: true },
    { key: 'postal_address', label: 'Postal address', nullable: true, multiline: true },
    { key: 'contact_details', label: 'Contact details', nullable: true, multiline: true },
    { key: 'payment_details', label: 'Payment / bank details', nullable: true, multiline: true },
    { key: 'logo_url', label: 'Logo URL (HTTPS)', nullable: true },
  ];
  readonly enterpriseForm = new FormGroup({
    legal_name: new FormControl('', { nonNullable: true, validators: Validators.maxLength(255) }),
    display_name: new FormControl('', { nonNullable: true, validators: Validators.maxLength(255) }),
    tax_identifier: new FormControl('', { nonNullable: true }),
    registration_identifier: new FormControl('', { nonNullable: true }),
    legal_address: new FormControl('', { nonNullable: true }),
    postal_address: new FormControl('', { nonNullable: true }),
    contact_details: new FormControl('', { nonNullable: true }),
    payment_details: new FormControl('', { nonNullable: true }),
    logo_url: new FormControl('', { nonNullable: true, validators: Validators.pattern(/^https:\/\/[^\s]+$/) }),
  });
  readonly accountingForm = new FormGroup({
    cost_accounting_enabled: new FormControl(false, { nonNullable: true }),
    cost_valuation_method: new FormControl<AccountingFields['cost_valuation_method']>('MOVING_WEIGHTED_AVERAGE', {
      nonNullable: true,
    }),
    changes_locked_through: new FormControl('', {
      nonNullable: true,
      validators: Validators.pattern(/^\d{4}-\d{2}-\d{2}$/),
    }),
    accounting_timezone: new FormControl('UTC', { nonNullable: true, validators: Validators.required }),
    vat_enabled: new FormControl(false, { nonNullable: true }),
    price_entry_mode: new FormControl<AccountingFields['price_entry_mode']>('TAX_EXCLUSIVE', { nonNullable: true }),
  });
  readonly negativeForm = new FormGroup({ allowed: new FormControl(false, { nonNullable: true }) });

  constructor() {
    this.accountingForm.controls.cost_accounting_enabled.valueChanges.pipe(takeUntilDestroyed()).subscribe(enabled => {
      if (enabled && (this.negativeForm.getRawValue().allowed || this.store.negativeStockEnabled())) {
        this.accountingForm.controls.cost_accounting_enabled.setValue(false, { emitEvent: false });
        this.validationError.set(
          'Before enabling cost accounting, disable and save the global negative-stock allowance and clear any enabled scoped overrides.',
        );

        return;
      }

      this.costEnabled.set(enabled);
      this.syncNegativeControl();
    });
    this.load();
  }

  load(): void {
    this.validationError.set('');
    this.store.reload().subscribe(snapshot => this.resetForms(snapshot));
  }

  dismissActionError(): void {
    this.validationError.set('');
    this.store.dismissActionError();
  }

  saveEnterprise(): void {
    if (this.enterpriseForm.invalid) {
      this.enterpriseForm.markAllAsTouched();

      return;
    }

    const raw = this.enterpriseForm.getRawValue();
    const values: EnterpriseEditableFields = {
      ...raw,
      tax_identifier: raw.tax_identifier || null,
      registration_identifier: raw.registration_identifier || null,
      legal_address: raw.legal_address || null,
      postal_address: raw.postal_address || null,
      contact_details: raw.contact_details || null,
      payment_details: raw.payment_details || null,
      logo_url: raw.logo_url || null,
    };
    this.save({ section: 'enterprise', values }, snapshot => this.resetEnterprise(snapshot.enterprise));
  }

  saveAccounting(): void {
    if (this.accountingForm.invalid) {
      this.accountingForm.markAllAsTouched();

      return;
    }

    const raw = this.accountingForm.getRawValue();
    const values: AccountingFields = {
      ...raw,
      accounting_timezone: raw.accounting_timezone.trim(),
      changes_locked_through: raw.changes_locked_through || null,
    };
    this.save({ section: 'accounting', values }, snapshot => this.resetAccounting(snapshot.accounting));
  }

  saveNegative(): void {
    if (this.negativeForm.disabled) {
      return;
    }

    this.save({ section: 'negative', value: this.negativeForm.getRawValue().allowed }, () => {
      this.negativeForm.reset({ allowed: this.store.globalNegative()?.value ?? false });
    });
  }

  saveNumbering(editor: NumberingEditor): void {
    if (editor.form.invalid) {
      editor.form.markAllAsTouched();

      return;
    }

    this.save(
      { section: 'numbering', documentType: editor.record.document_type, values: editor.form.getRawValue() },
      snapshot => {
        const record = snapshot.numbering.find(rule => rule.document_type === editor.record.document_type);
        if (record) {
          editor.record = record;
          editor.form.reset(record);
        }
      },
    );
  }

  documentLabel(type: string): string {
    return type
      .toLowerCase()
      .split('_')
      .map(word => word[0].toUpperCase() + word.slice(1))
      .join(' ');
  }

  private resetForms(snapshot: SettingsSnapshot): void {
    this.resetEnterprise(snapshot.enterprise);
    this.resetAccounting(snapshot.accounting);
    this.negativeForm.reset({ allowed: this.store.globalNegative()?.value ?? false });
    this.syncNegativeControl();
    this.numbering.set(
      snapshot.numbering.map(record => ({
        record,
        form: new FormGroup({
          prefix: new FormControl(record.prefix, { nonNullable: true, validators: Validators.maxLength(32) }),
          numeric_width: new FormControl(record.numeric_width, {
            nonNullable: true,
            validators: [Validators.required, Validators.min(1), Validators.max(18), Validators.pattern(/^\d+$/)],
          }),
          reset_annually: new FormControl(record.reset_annually, { nonNullable: true }),
        }),
      })),
    );
  }

  private resetEnterprise(record: EnterpriseSettings): void {
    const values = this.enterpriseForm.getRawValue();
    for (const field of this.enterpriseFields) {
      values[field.key] = record[field.key] ?? '';
    }
    this.enterpriseForm.reset(values);
  }

  private resetAccounting(record: AccountingSettings): void {
    this.accountingForm.reset(
      { ...record, changes_locked_through: record.changes_locked_through ?? '' },
      { emitEvent: false },
    );
    this.costEnabled.set(record.cost_accounting_enabled);
  }

  private syncNegativeControl(): void {
    if (this.negativeUnavailable()) {
      this.negativeForm.controls.allowed.disable();
    } else {
      this.negativeForm.controls.allowed.enable();
    }
  }

  private setFormsDisabled(disabled: boolean): void {
    const forms = [
      this.enterpriseForm,
      this.accountingForm,
      this.negativeForm,
      ...this.numbering().map(editor => editor.form),
    ];
    for (const form of forms) {
      if (disabled) {
        form.disable({ emitEvent: false });
      } else {
        form.enable({ emitEvent: false });
      }
    }
  }

  private save(update: SettingsUpdate, apply: (snapshot: SettingsSnapshot) => void): void {
    const { pending, resolved } = this.state();
    if (pending || !resolved) {
      return;
    }

    this.setFormsDisabled(true);
    this.store
      .update(update)
      .pipe(
        finalize(() => {
          this.setFormsDisabled(false);
          this.syncNegativeControl();
        }),
      )
      .subscribe(snapshot => {
        this.validationError.set('');
        apply(snapshot);
        this.snackBar.open('Settings saved.', 'Dismiss', { duration: 4000 });
      });
  }
}
