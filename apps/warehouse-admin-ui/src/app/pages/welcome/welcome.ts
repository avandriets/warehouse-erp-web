import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  templateUrl: './welcome.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePage {}
