import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { APP_NAVIGATION } from '../../app-navigation.config';

@Component({
  selector: 'erp-welcome',
  imports: [MatIcon, RouterLink],
  templateUrl: './welcome.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
  readonly sections = APP_NAVIGATION;
}
