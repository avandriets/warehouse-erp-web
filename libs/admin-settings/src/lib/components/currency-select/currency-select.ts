import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import type { ReferenceOption } from '@warehouse/shared';
import { LocalReferenceControl } from '@warehouse/shared';

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
export class CurrencySelect extends LocalReferenceControl<ReferenceOption> {
  readonly label = input('Accounting currency');
  readonly hint = input('Base currency for accounting and exchange rates.');
  protected override readonly validationKey = 'currencySelection';
}
