import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  templateUrl: './welcome.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePage {}
