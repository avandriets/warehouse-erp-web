import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

import type { DirectoryTableRow } from '../../../types';

@Component({
  selector: 'md-directory-table',
  imports: [MatButtonModule, MatTableModule, RouterLink],
  templateUrl: './directory-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectoryTable {
  readonly rows = input.required<readonly DirectoryTableRow[]>();
  readonly detailHeading = input.required<string>();
  readonly columns = ['code', 'name', 'detail', 'actions'];
}
