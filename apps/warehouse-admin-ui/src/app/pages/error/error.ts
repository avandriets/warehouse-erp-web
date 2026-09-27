import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';
import { ErrorState } from '@warehouse/shared';

type ErrorStatus = 401 | 403 | 404 | 503;

type ErrorContent = Readonly<{ title: string; description: string }>;

const ERROR_CONTENT: Record<ErrorStatus, ErrorContent> = {
  401: {
    title: 'Sign in to continue',
    description:
      'The requested section is available only to authenticated users. Use the Sign in button in the toolbar; after authentication, you will return to the requested page.',
  },
  403: {
    title: 'Access unavailable',
    description: 'Your ERP account is inactive or does not have the required permissions for this section.',
  },
  404: {
    title: 'Page not found',
    description: 'The requested URL does not match any page in Warehouse ERP administration.',
  },
  503: {
    title: 'Something went wrong',
    description: 'The ERP service is temporarily unavailable. Try again later or return to the welcome page.',
  },
};

@Component({
  imports: [ErrorState, MatButtonModule, RouterLink],
  templateUrl: './error.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorPage {
  readonly auth = inject(WarehouseAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  readonly status = computed<ErrorStatus>(() => {
    const configuredStatus = Number(this.data()['status']);
    const status =
      configuredStatus === 404 ? configuredStatus : Number(this.queryParams().get('status') ?? configuredStatus);

    return status === 401 || status === 403 || status === 404 ? status : 503;
  });
  readonly content = computed(() => ERROR_CONTENT[this.status()]);
}
