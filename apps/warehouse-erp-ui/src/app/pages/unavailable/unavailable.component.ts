import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ErrorState } from '@warehouse/shared';

@Component({
  selector: 'erp-unavailable',
  imports: [ErrorState, MatButton, RouterLink],
  templateUrl: './unavailable.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnavailableComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  readonly notFound = computed(() => this.data()['status'] === 404);
  readonly heading = computed<string>(() => this.data()['pageTitle'] ?? 'Page not found');
  readonly sectionRoute = computed<string>(() => this.data()['sectionRoute'] ?? '/');
}
