import { provideHttpClient, withInterceptors } from '@angular/common/http';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { InjectionToken } from '@angular/core';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';

import type { WarehouseAuthConfig } from '../types';

export const AUTH_CONFIG = new InjectionToken<WarehouseAuthConfig>('Warehouse auth configuration');

export function provideWarehouseAuth(config: WarehouseAuthConfig): (Provider | EnvironmentProviders)[] {
  const { apiUrl: configuredApiUrl, ...auth0Config } = config;
  const apiUrl = configuredApiUrl.replace(/\/$/, '');
  const authorizationParams = {
    ...auth0Config.authorizationParams,
    redirect_uri: window.location.origin,
  };
  const httpInterceptor = {
    allowedList: [apiUrl, `${apiUrl}/*`],
  };

  return [
    {
      provide: AUTH_CONFIG,
      useValue: { ...auth0Config, apiUrl, authorizationParams, httpInterceptor } satisfies WarehouseAuthConfig,
    },
    provideHttpClient(withInterceptors([authHttpInterceptorFn])),
    provideAuth0({
      ...auth0Config,
      authorizationParams,
      httpInterceptor,
    }),
  ];
}
