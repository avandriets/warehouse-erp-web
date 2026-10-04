import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { FormControl } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'md-directory-fields',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './directory-fields.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
})
export class DirectoryFields {
  readonly code = input.required<FormControl<string>>();
  readonly name = input.required<FormControl<string>>();
}
