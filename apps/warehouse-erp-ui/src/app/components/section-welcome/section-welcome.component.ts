import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { APP_NAVIGATION } from '../../app-navigation.config';

@Component({
  selector: 'erp-section-welcome',
  imports: [MatIcon, MatButton, RouterLink],
  templateUrl: './section-welcome.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionWelcomeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  readonly currentSection = computed(
    () => APP_NAVIGATION.find(section => section.id === this.data()['navigationSection']) ?? null,
  );
}
