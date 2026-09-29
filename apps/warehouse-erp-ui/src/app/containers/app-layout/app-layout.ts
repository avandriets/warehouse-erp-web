import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';

import { AppHeader } from '../../components';

@Component({
  selector: 'erp-layout',
  imports: [RouterOutlet, AppHeader],
  templateUrl: './app-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  readonly auth = inject(WarehouseAuthService);

  login(): void {
    this.auth.login('/');
  }
}
