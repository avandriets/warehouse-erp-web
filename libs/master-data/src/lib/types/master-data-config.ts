import type { CanActivateFn } from '@angular/router';

export interface MasterDataConfig {
  apiUrl: string;
  hasPermission: (permission: string) => boolean;
  permissionGuard: CanActivateFn;
}
