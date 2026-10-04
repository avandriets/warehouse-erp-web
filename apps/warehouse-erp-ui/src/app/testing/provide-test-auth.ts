import type { Provider } from '@angular/core';
import { signal } from '@angular/core';
import { WarehouseAuthService } from '@warehouse/auth';
import { of } from 'rxjs';

export function provideTestAuth(): Provider {
  return {
    provide: WarehouseAuthService,
    useValue: {
      loading: signal(false),
      authenticated: signal(true),
      error: signal(null),
      user: signal({ name: 'Test User' }),
      ensureCurrentUser: () => of({ status: 'ACTIVE', permissions: [] }),
      can: () => true,
      login: (): void => undefined,
      logout: (): void => undefined,
    },
  };
}
