import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'erp-navigation-card',
  imports: [MatIcon, RouterLink],
  templateUrl: './navigation-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class NavigationCard {
  readonly route = input.required<string>();
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly compact = input(false);
}
