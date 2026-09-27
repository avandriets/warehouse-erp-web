import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [MatButtonModule, RouterLink],
  templateUrl: './not-found.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
