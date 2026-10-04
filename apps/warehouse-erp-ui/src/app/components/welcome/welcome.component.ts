import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { PRIMARY_MENU_WITH_SUBMENUS_TOKEN } from '../../config/primary-menu-with-submenus.token';

@Component({
  selector: 'erp-welcome',
  imports: [MatIcon, RouterLink],
  templateUrl: './welcome.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
  readonly primaryMenu = inject(PRIMARY_MENU_WITH_SUBMENUS_TOKEN);
}
