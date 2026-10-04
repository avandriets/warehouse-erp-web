import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageLayout } from '@warehouse/shared';

import { WarehouseStoreService } from '../../../../data-access/services';
import type { DirectoryMode } from '../../../../types';
import { DirectoryFields, DirectoryTable } from '../../../../ui/components';

@Component({
  selector: 'md-warehouses',
  imports: [
    PageLayout,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    DirectoryFields,
    DirectoryTable,
  ],
  templateUrl: './warehouses.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehousesPage {
  private readonly store = inject(WarehouseStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly mode = computed(() => this.data()['mode'] as DirectoryMode);
  readonly id = computed(() => this.params().get('id'));
  readonly records = computed(() => this.store.list());
  readonly record = computed(() => this.store.find(this.id() ?? ''));
  readonly missing = computed(() => ['edit', 'delete'].includes(this.mode()) && !this.record());
  readonly label = 'Warehouses';
  readonly singular = 'warehouse';
  readonly heading = computed(() =>
    this.mode() === 'list' ? this.label : `${this.mode()[0].toUpperCase()}${this.mode().slice(1)} ${this.singular}`,
  );
  readonly rows = computed(() =>
    this.records().map(record => ({ id: record.id, code: record.code, name: record.name, detail: record.address })),
  );
  readonly error = signal('');
  readonly form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
  });

  constructor() {
    effect(() => {
      const record = this.record();
      this.form.reset({ code: record?.code ?? '', name: record?.name ?? '', address: record?.address ?? '' });
      this.error.set('');
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    try {
      this.store.save(this.form.getRawValue(), this.id() ?? undefined);
      this.back();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to save the record.');
    }
  }

  deleteRecord(): void {
    const id = this.id();
    if (id && this.record()) {
      this.store.remove(id);
      this.back();
    }
  }

  back(): void {
    void this.router.navigate(['.'], { relativeTo: this.route.parent });
  }
}
