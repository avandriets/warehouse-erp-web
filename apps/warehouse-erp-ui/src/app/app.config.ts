import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAccessManagement } from '@warehouse/access-management';
import { provideWarehouseAuth } from '@warehouse/auth';

import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAccessManagement({ apiUrl: environment.auth.apiUrl }),
    ...provideWarehouseAuth(environment.auth),
  ],
};
