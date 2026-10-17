import { FormArray } from '@angular/forms';

import type { ProductAttributeEntry } from '../../../types';
import {
  createAttributeForm,
  productAttributeEntry,
  productAttributesPayload,
  uniqueAttributeNames,
} from './product-attributes';

describe('product attribute form validation', () => {
  it.each([
    ['number', 'heavy'],
    ['number', '"20"'],
    ['number', 'true'],
    ['number', '1e999'],
    ['boolean', '1'],
    ['boolean', '"false"'],
    ['boolean', 'yes'],
    ['json', '{broken'],
  ] as const)('rejects an invalid %s value %s and revalidates after correction', (type, value) => {
    const form = createAttributeForm({ key: 'test', type, value });
    expect(form.hasError('attributeValue')).toBe(true);
    form.controls.value.setValue(type === 'number' ? '20' : type === 'boolean' ? 'false' : '{"width":20}');
    expect(form.valid).toBe(true);
  });

  it('revalidates when the type changes and rejects unknown types', () => {
    const form = createAttributeForm({ key: 'test', type: 'text', value: 'plain text' });
    expect(form.valid).toBe(true);
    form.controls.type.setValue('number');
    expect(form.hasError('attributeValue')).toBe(true);
    form.controls.value.setValue('20');
    expect(form.valid).toBe(true);
    form.controls.type.setValue('unknown' as ProductAttributeEntry['type']);
    expect(form.controls.type.invalid).toBe(true);
  });

  it('validates trimmed duplicate names in both the dialog and collection', () => {
    const duplicate = createAttributeForm({ key: ' size ', type: 'text', value: '' }, ['size']);
    expect(duplicate.controls.key.hasError('uniqueAttributeName')).toBe(true);
    duplicate.controls.key.setValue('color');
    expect(duplicate.valid).toBe(true);
    const attributes = new FormArray(
      [
        createAttributeForm({ key: 'size', type: 'text', value: 'L' }),
        createAttributeForm({ key: ' size ', type: 'text', value: 'XL' }),
      ],
      uniqueAttributeNames,
    );
    expect(attributes.hasError('uniqueAttributeNames')).toBe(true);
    attributes.removeAt(1);
    expect(attributes.valid).toBe(true);
  });

  it('preserves typed payload values and special attribute names without changing the object prototype', () => {
    const values: Record<string, unknown> = Object.fromEntries([
      ['size', 20],
      ['enabled', false],
      ['text', 'false'],
      ['details', { width: 10 }],
      ['empty', null],
      ['__proto__', { color: 'red' }],
      ['constructor', 'custom'],
    ]);
    const entries = Object.entries(values).map(([key, value]) => productAttributeEntry(key, value));
    const forms = new FormArray(
      entries.map(entry => createAttributeForm(entry)),
      uniqueAttributeNames,
    );
    expect(forms.valid).toBe(true);
    const payload = productAttributesPayload(forms.getRawValue());
    expect(payload).toEqual(values);
    expect(Object.getPrototypeOf(payload)).toBe(Object.prototype);
    expect(Object.hasOwn(payload, '__proto__')).toBe(true);
  });
});
