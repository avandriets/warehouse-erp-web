import { InjectionToken } from '@angular/core';

import type { AccessManagementConfig } from './types';

export const ACCESS_MANAGEMENT_CONFIG = new InjectionToken<AccessManagementConfig>('Access management configuration');
