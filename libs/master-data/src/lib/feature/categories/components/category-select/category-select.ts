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
  selector: 'md-category-select',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CategorySelect), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => CategorySelect), multi: true },
  ],
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './category-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategorySelect extends LocalReferenceControl<ReferenceOption> {
  readonly label = input('Parent category');
  readonly hint = input('Leave empty for a root category.');
  readonly excludedId = input<string | null>(null);
  protected override readonly validationKey = 'categorySelection';

  protected override eligible(option: ReferenceOption): boolean {
    return option.id !== this.excludedId();
  }
}
