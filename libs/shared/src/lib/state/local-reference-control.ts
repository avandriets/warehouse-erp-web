import { computed, Directive, effect, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ControlValueAccessor, ValidationErrors, Validator } from '@angular/forms';
import { FormControl } from '@angular/forms';

import type { ReferenceOption } from '../types';
import { selectionFieldState } from './selection-field-state';

/** Presentation-only reference selection. The parent owns loading and failures. */
@Directive()
export abstract class LocalReferenceControl<T extends ReferenceOption = ReferenceOption>
  implements ControlValueAccessor, Validator
{
  readonly items = input<readonly T[]>([]);
  readonly compact = input(false);
  readonly allowArchived = input(false);
  private readonly currentId = signal<string | null>(null);
  private readonly query = signal('');
  private onChange: (id: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private onValidationChange: () => void = () => undefined;
  protected readonly validationKey: string = 'referenceSelection';
  readonly value = new FormControl<T | string | null>(null);
  readonly field = selectionFieldState(this.value);
  readonly options = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();

    return this.items().filter(
      option =>
        option.active &&
        this.eligible(option) &&
        (!query || this.searchText(option).toLocaleLowerCase().includes(query)),
    );
  });
  readonly displayValue = (value: T | string | null): string =>
    typeof value === 'string' ? value : value ? `${value.code} — ${value.name}` : '';

  constructor() {
    effect(() => {
      const id = this.currentId();
      const selected = this.items().find(option => option.id === id) ?? null;
      // Track eligibility inputs as well, so a changed dimension revalidates the outer control.
      if (selected) {
        this.eligible(selected);
      }
      this.allowArchived();
      untracked(() => {
        if (typeof this.value.value !== 'string') {
          this.value.setValue(selected, { emitEvent: false });
        }
        this.onValidationChange();
      });
    });
    this.value.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      this.query.set(typeof value === 'string' ? value : '');
      if (typeof value !== 'string' || !value.trim()) {
        this.currentId.set(typeof value === 'object' && value ? value.id : null);
        this.onChange(this.currentId());
      }
      this.onValidationChange();
    });
  }

  search(): void {
    this.query.set(typeof this.value.value === 'string' ? this.value.value : '');
  }

  touched(): void {
    this.onTouched();
  }

  clear(): void {
    this.value.setValue(null);
    this.onTouched();
  }

  writeValue(id: string | null): void {
    this.currentId.set(id);
    this.query.set('');
    this.value.setValue(this.items().find(option => option.id === id) ?? null, { emitEvent: false });
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
    if (this.value.disabled) {
      return null;
    }

    const value = this.value.value;
    const selected = this.items().find(option => option.id === this.currentId());
    const invalid =
      typeof value === 'string'
        ? !!value.trim()
        : !!this.currentId() && (!selected || !this.eligible(selected) || (!selected.active && !this.allowArchived()));

    return invalid ? { [this.validationKey]: true } : null;
  }

  registerOnValidatorChange(callback: () => void): void {
    this.onValidationChange = callback;
  }

  protected eligible(option: T): boolean {
    return !!option.id;
  }

  protected searchText(option: T): string {
    return `${option.code} ${option.name}`;
  }
}
