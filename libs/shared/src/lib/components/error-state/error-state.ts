import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-error-state',
  templateUrl: './error-state.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-w-0',
  },
})
export class ErrorState {}
