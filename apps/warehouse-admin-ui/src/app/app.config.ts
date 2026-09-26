import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAccessManagement } from '@warehouse/access-management';
import type { WarehouseAuthConfig } from '@warehouse/auth';
import { provideWarehouseAuth } from '@warehouse/auth';

import { routes } from './app.routes';

export function createAppConfig(config: WarehouseAuthConfig): ApplicationConfig {
  return {
    providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes), provideAccessManagement({ apiUrl: config.apiUrl }), ...provideWarehouseAuth(config)],
  };
}
