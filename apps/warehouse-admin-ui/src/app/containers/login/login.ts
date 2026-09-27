import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';

@Component({
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  readonly auth = inject(WarehouseAuthService);

  login(): void {
    this.auth.login();
  }
}
