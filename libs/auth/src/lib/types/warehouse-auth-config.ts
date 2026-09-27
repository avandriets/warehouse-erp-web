import type { AuthConfig } from '@auth0/auth0-angular';

export interface WarehouseAuthConfig extends AuthConfig {
  apiUrl: string;
}
