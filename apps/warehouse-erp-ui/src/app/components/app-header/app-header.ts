import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatMenuModule, MatToolbarModule, RouterLink],
  templateUrl: './app-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  readonly loading = input(false);
  readonly authenticated = input(false);
  readonly userName = input<string | null>(null);
  readonly signIn = output<void>();
  readonly signOut = output<void>();
}
