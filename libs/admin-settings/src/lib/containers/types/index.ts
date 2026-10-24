import type { FormControl, FormGroup } from '@angular/forms';

import type { DocumentNumbering } from '../../types';

export interface NumberingEditor {
  record: DocumentNumbering;
  form: FormGroup<{
    prefix: FormControl<string>;
    numeric_width: FormControl<number>;
  }>;
}
