import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'erp-welcome',
  templateUrl: './welcome.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomePage {}
