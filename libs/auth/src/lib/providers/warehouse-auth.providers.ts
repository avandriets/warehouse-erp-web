import { provideHttpClient, withInterceptors } from '@angular/common/http';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { InjectionToken } from '@angular/core';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';

import type { WarehouseAuthConfig } from '../types';

export const AUTH_CONFIG = new InjectionToken<WarehouseAuthConfig>('Warehouse auth configuration');

export async function loadAuthConfig(): Promise<WarehouseAuthConfig> {
  const response = await fetch('/config.json');
  if (!response.ok) throw new Error('Configuration unavailable');
  const config = (await response.json()) as WarehouseAuthConfig;
  if (![config.apiUrl, config.domain, config.clientId, config.audience].every(value => typeof value === 'string' && value.length > 0)) throw new Error('Invalid configuration');

  return config;
}

export function provideWarehouseAuth(config: WarehouseAuthConfig): (Provider | EnvironmentProviders)[] {
  const apiUrl = config.apiUrl.replace(/\/$/, '');

  return [
    { provide: AUTH_CONFIG, useValue: { ...config, apiUrl } },
    provideHttpClient(withInterceptors([authHttpInterceptorFn])),
    provideAuth0({
      domain: config.domain,
      clientId: config.clientId,
      authorizationParams: { audience: config.audience, redirect_uri: window.location.origin },
      httpInterceptor: { allowedList: [`${apiUrl}/*`] },
    }),
  ];
}
