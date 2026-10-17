import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import type { ProductAttributeEntry, ProductAttributeType } from '../../../types';

function attributeValue(row: ProductAttributeEntry): unknown {
  return row.type === 'text' ? row.value : JSON.parse(row.value);
}

function validAttributeValue(control: AbstractControl): ValidationErrors | null {
  const row: ProductAttributeEntry = control.getRawValue();
  try {
    const value = attributeValue(row);
    const valid =
      row.type === 'text' ||
      row.type === 'json' ||
      (row.type === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
      (row.type === 'boolean' && typeof value === 'boolean');

    return valid ? null : { attributeValue: true };
  } catch {
    return { attributeValue: true };
  }
}

function uniqueAttributeName(keys: readonly string[]): ValidatorFn {
  return control => (keys.includes(String(control.value).trim()) ? { uniqueAttributeName: true } : null);
}

export function uniqueAttributeNames(control: AbstractControl): ValidationErrors | null {
  const rows: ProductAttributeEntry[] = control.getRawValue();
  const keys = rows.map(row => row.key.trim());

  return new Set(keys).size === keys.length ? null : { uniqueAttributeNames: true };
}

export function createAttributeForm(
  entry: ProductAttributeEntry = { key: '', type: 'text', value: '' },
  existingKeys: readonly string[] = [],
): FormGroup<{ key: FormControl<string>; type: FormControl<ProductAttributeType>; value: FormControl<string> }> {
  return new FormGroup(
    {
      key: new FormControl(entry.key, {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/\S/), uniqueAttributeName(existingKeys)],
      }),
      type: new FormControl<ProductAttributeType>(entry.type, {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^(text|number|boolean|json)$/)],
      }),
      value: new FormControl(entry.value, { nonNullable: true }),
    },
    { validators: validAttributeValue },
  );
}

export function productAttributeEntry(key: string, value: unknown): ProductAttributeEntry {
  const type =
    typeof value === 'number'
      ? 'number'
      : typeof value === 'boolean'
        ? 'boolean'
        : typeof value === 'string'
          ? 'text'
          : 'json';

  return { key, type, value: type === 'text' ? String(value) : (JSON.stringify(value) ?? '') };
}

/** Serialize entries after the attribute forms and collection validators pass. */
export function productAttributesPayload(rows: readonly ProductAttributeEntry[]): Record<string, unknown> {
  return Object.fromEntries(rows.map(row => [row.key.trim(), attributeValue(row)]));
}
