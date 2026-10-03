import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { NavigationGroup } from '../../types';

@Component({
  selector: 'erp-workspace-sidebar',
  templateUrl: './workspace-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSidebarComponent {
  readonly heading = input.required<string>();
  readonly groups = input.required<readonly NavigationGroup[]>();
  readonly selectedId = input<string | null>(null);

  readonly itemSelect = output<string>();
}
