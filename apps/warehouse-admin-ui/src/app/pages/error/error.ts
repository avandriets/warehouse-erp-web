import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WarehouseAuthService } from '@warehouse/auth';

type ErrorStatus = 401 | 403 | 404 | 503;

@Component({
  standalone: true,
  imports: [MatButtonModule, RouterLink],
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
}
