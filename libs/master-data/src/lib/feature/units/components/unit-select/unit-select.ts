import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LocalReferenceControl } from '@warehouse/shared';

import type { UnitDimension, UnitReference } from '../../../../types';

@Component({
  selector: 'md-unit-select',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UnitSelect), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => UnitSelect), multi: true },
  ],
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './unit-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitSelect extends LocalReferenceControl<UnitReference> {
  readonly hint = input('');
  readonly dimension = input<UnitDimension | null>('COUNT');
  readonly rootOnly = input(true);
  readonly excludedId = input<string | null>(null);
  readonly physicalOnly = input(false);
  readonly label = input('Base unit');
  protected override readonly validationKey = 'unitSelection';

  protected override eligible(option: UnitReference): boolean {
    return (
      option.id !== this.excludedId() &&
      (!this.physicalOnly() || option.dimension !== 'OTHER') &&
      (this.dimension() === null || option.dimension === this.dimension()) &&
      (!this.rootOnly() || !option.base_unit_id)
    );
  }

  protected override searchText(option: UnitReference): string {
    return `${option.code} ${option.name} ${option.symbol}`;
  }
}
