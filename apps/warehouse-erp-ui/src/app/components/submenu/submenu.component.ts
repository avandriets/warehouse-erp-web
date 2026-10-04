import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { ResolvedSubmenuGroup } from '../../types';

@Component({
  selector: 'erp-submenu',
  imports: [RouterLink],
  templateUrl: './submenu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmenuComponent {
  readonly heading = input.required<string>();
  readonly groups = input.required<readonly ResolvedSubmenuGroup[]>();
  readonly selectedId = input<string | null>(null);
}
