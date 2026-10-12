import { ChangeDetectionStrategy, Component, forwardRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ControlValueAccessor, ValidationErrors, Validator } from '@angular/forms';
import { FormControl, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import type { ReferenceOption } from '@warehouse/shared';
import { apiError } from '@warehouse/shared';
import { catchError, of, Subject, switchMap, takeUntil, tap, timer } from 'rxjs';

import { CurrencyLookupService } from '../../data-access/services';

@Component({
  selector: 'admin-currency-select',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CurrencySelect), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => CurrencySelect), multi: true },
  ],
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './currency-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencySelect implements ControlValueAccessor, Validator {
  private readonly api = inject(CurrencyLookupService);
  private readonly queries = new Subject<string>();
  private readonly selectedIds = new Subject<string | null>();
  private currentId: string | null = null;
  private onChange: (id: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private onValidationChange: () => void = () => undefined;

  readonly value = new FormControl<ReferenceOption | string | null>(null);
  readonly options = signal<ReferenceOption[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly displayValue = (value: ReferenceOption | string | null): string =>
    typeof value === 'string' ? value : value?.code ? `${value.code} — ${value.name}` : (value?.name ?? '');

  constructor() {
    this.selectedIds
      .pipe(
        switchMap(id =>
          id
            ? this.api.get(id).pipe(
                takeUntil(this.value.valueChanges),
                catchError(error => {
                  this.error.set(apiError(error));

                  return of(null);
                }),
              )
            : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(option => {
        if (option) {
          this.value.setValue(option, { emitEvent: false });
        }
      });
    this.queries
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap(query =>
          timer(250).pipe(
            switchMap(() => this.api.search(query)),
            catchError(error => {
              this.error.set(apiError(error));

              return of({ items: [], total: 0 });
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(page => {
        this.options.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      });
    this.value.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      if (typeof value === 'string' && value.trim()) {
        this.queries.next(value);
      } else {
        this.currentId = typeof value === 'object' && value ? value.id : null;
        this.onChange(this.currentId);
      }
      this.onValidationChange();
    });
  }

  search(): void {
    this.queries.next(typeof this.value.value === 'string' ? this.value.value : '');
  }

  retry(): void {
    this.error.set('');
    this.selectedIds.next(this.currentId);
    this.search();
  }

  touched(): void {
    this.onTouched();
  }

  clear(): void {
    this.value.setValue(null);
    this.onTouched();
  }

  writeValue(id: string | null): void {
    this.currentId = id;
    this.error.set('');
    this.value.setValue(id ? { id, code: '', name: 'Current currency', active: true } : null, { emitEvent: false });
    this.selectedIds.next(id);
  }

  registerOnChange(callback: (id: string | null) => void): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  setDisabledState(disabled: boolean): void {
    if (disabled) {
      this.value.disable({ emitEvent: false });
    } else {
      this.value.enable({ emitEvent: false });
    }
  }

  validate(): ValidationErrors | null {
    return typeof this.value.value === 'string' && !!this.value.value.trim() ? { currencySelection: true } : null;
  }

  registerOnValidatorChange(callback: () => void): void {
    this.onValidationChange = callback;
  }
}
