import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PRIMARY_MENU_WITH_SUBMENUS_TOKEN } from '../../config/primary-menu-with-submenus.token';

@Component({
  selector: 'erp-submenu-overview',
  imports: [MatIcon, MatButton, RouterLink],
  templateUrl: './submenu-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmenuOverviewComponent {
  private readonly primaryMenu = inject(PRIMARY_MENU_WITH_SUBMENUS_TOKEN);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  readonly currentPrimaryMenuItem = computed(
    () => this.primaryMenu.find(primaryMenuItem => primaryMenuItem.id === this.data()['primaryMenuId']) ?? null,
  );
}
