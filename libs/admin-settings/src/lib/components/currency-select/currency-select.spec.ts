import { TestBed } from '@angular/core/testing';

import { CurrencySelect } from './currency-select';
const option = { id: 'eur', code: 'EUR', name: 'Euro', active: true };
describe('CurrencySelect local options', () => {
  it('resolves parent-provided ids, filters locally, and emits selected ids', () => {
    const fixture = TestBed.createComponent(CurrencySelect);
    fixture.componentRef.setInput('items', [option, { ...option, id: 'archived', active: false }]);

    fixture.detectChanges();
    const picker = fixture.componentInstance;
    const changed = vi.fn();
    picker.registerOnChange(changed);
    picker.writeValue(option.id);
    fixture.detectChanges();
    expect(picker.value.value).toEqual(option);
    expect(changed).not.toHaveBeenCalled();
    picker.search();
    expect(picker.options()).toEqual([option]);
    picker.value.setValue('does not exist');
    expect(picker.options()).toEqual([]);
    expect(picker.validate()).toEqual({ currencySelection: true });
    picker.value.setValue(option);
    expect(picker.validate()).toBeNull();
    expect(changed).toHaveBeenLastCalledWith(option.id);
    picker.clear();
    expect(changed).toHaveBeenLastCalledWith(null);
  });
  it('retains archived selections and rejects ids missing from the snapshot', () => {
    const fixture = TestBed.createComponent(CurrencySelect);
    fixture.componentRef.setInput('items', [{ ...option, active: false }]);
    fixture.componentRef.setInput('allowArchived', true);

    const picker = fixture.componentInstance;
    picker.writeValue(option.id);
    fixture.detectChanges();
    expect(picker.validate()).toBeNull();
    expect(picker.options()).toEqual([]);
    picker.writeValue('missing');
    expect(picker.validate()).toEqual({ currencySelection: true });
    fixture.componentRef.setInput('items', [{ ...option, id: 'missing' }]);
    fixture.detectChanges();
    expect(picker.value.value).toEqual({ ...option, id: 'missing' });
    expect(picker.validate()).toBeNull();
  });
});
