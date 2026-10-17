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
  selector: 'md-product-reference-select',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ProductReferenceSelect), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => ProductReferenceSelect), multi: true },
  ],
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './product-reference-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductReferenceSelect extends LocalReferenceControl<ReferenceOption> {
  readonly label = input('VAT rate');
  readonly hint = input('Leave empty to use the enterprise default.');
}
