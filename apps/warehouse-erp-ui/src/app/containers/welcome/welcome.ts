import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePage {}
