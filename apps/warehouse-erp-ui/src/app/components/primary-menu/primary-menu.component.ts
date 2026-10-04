import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import type { PrimaryMenuItem } from '../../types';

@Component({
  selector: 'erp-primary-menu',
  imports: [MatIcon, MatTooltip],
  templateUrl: './primary-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrimaryMenuComponent {
  readonly primaryMenu = input.required<readonly PrimaryMenuItem[]>();
  readonly activePrimaryMenuId = input.required<string | null>();
  readonly sidebarOpen = input.required<boolean>();

  readonly primaryMenuChange = output<string>();
  readonly sidebarToggle = output<void>();
}
