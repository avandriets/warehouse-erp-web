import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';

@Component({
  standalone: true,
  imports: [MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './forbidden.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {
  readonly auth = inject(WarehouseAuthService);
}
