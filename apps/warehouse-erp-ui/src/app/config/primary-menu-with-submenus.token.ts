import { InjectionToken } from '@angular/core';

import type { ResolvedPrimaryMenuItem } from '../types';

export const PRIMARY_MENU_WITH_SUBMENUS_TOKEN = new InjectionToken<readonly ResolvedPrimaryMenuItem[]>(
  'Primary menu with submenus',
);
