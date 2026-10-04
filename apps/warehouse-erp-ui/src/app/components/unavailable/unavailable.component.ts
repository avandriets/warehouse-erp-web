import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ErrorState } from '@warehouse/shared';

import { ShellSessionService } from '../../services';

@Component({
  selector: 'erp-unavailable',
  imports: [ErrorState, MatButton, RouterLink],
  templateUrl: './unavailable.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnavailableComponent {
  readonly session = inject(ShellSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly status = computed(() =>
    this.data()['status'] === 404 ? 404 : Number(this.params().get('status') ?? this.data()['status']),
  );
  readonly accessError = computed(() => this.params().has('status'));
  readonly description = computed(() => {
    switch (this.status()) {
      case 401:
        return 'Sign in to access your warehouse workspace. You will return to the requested page after signing in.';
      case 403:
        return 'Your ERP account is inactive or does not have the required permissions.';
      case 404:
        return 'The requested page could not be found.';
      default:
        return this.accessError()
          ? 'The ERP service is temporarily unavailable. Please try again.'
          : 'This page is not available yet.';
    }
  });
  readonly notFound = computed(() => this.status() === 404);
  readonly heading = computed<string>(() =>
    this.status() === 401
      ? 'Sign in to continue'
      : this.status() === 403
        ? 'Access unavailable'
        : this.accessError()
          ? 'Something went wrong'
          : (this.data()['pageTitle'] ?? 'Page not found'),
  );
  readonly primaryMenuRoute = computed<string>(() => this.data()['primaryMenuRoute'] ?? '/');
}
