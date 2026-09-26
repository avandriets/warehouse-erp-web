import type { EnvironmentProviders } from '@angular/core';
import { makeEnvironmentProviders } from '@angular/core';
import type { AccessManagementConfig } from '@warehouse/access-management/util';
import { ACCESS_MANAGEMENT_CONFIG } from '@warehouse/access-management/util';

export { ACCESS_MANAGEMENT_ROUTES } from './lib/access-management.routes';
export type { AccessManagementConfig } from '@warehouse/access-management/util';

export function provideAccessManagement(config: AccessManagementConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ACCESS_MANAGEMENT_CONFIG,
      useValue: { apiUrl: config.apiUrl.replace(/\/$/, '') } satisfies AccessManagementConfig,
    },
  ]);
}
