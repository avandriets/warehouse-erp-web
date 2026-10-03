import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import type { NavigationSection } from '../../types';

@Component({
  selector: 'erp-navigation-rail',
  imports: [MatIcon, MatTooltip],
  templateUrl: './navigation-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationRailComponent {
  readonly sections = input.required<readonly NavigationSection[]>();
  readonly activeSection = input.required<string | null>();
  readonly sidebarOpen = input.required<boolean>();

  readonly sectionChange = output<string>();
  readonly sidebarToggle = output<void>();
}
