import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page',
  templateUrl: './page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-w-0',
  },
})
export class Page {
  readonly header = input(true);
}
