import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PRIMARY_MENU_WITH_SUBMENUS_TOKEN } from '../../config/primary-menu-with-submenus.token';
import { NavigationCard } from '..';

@Component({
  selector: 'erp-welcome',
  imports: [NavigationCard],
  templateUrl: './welcome.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
  readonly primaryMenu = inject(PRIMARY_MENU_WITH_SUBMENUS_TOKEN);
}
