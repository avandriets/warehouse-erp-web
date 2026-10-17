import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { CategoryReference } from '../../../../types';

@Component({
  selector: 'md-category-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './category-breadcrumbs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class CategoryBreadcrumbs {
  readonly parentId = input<string | null>(null);
  readonly ancestors = input<readonly CategoryReference[]>([]);
}
