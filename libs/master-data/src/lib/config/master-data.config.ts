import { InjectionToken } from '@angular/core';

import type { MasterDataConfig } from '../types';

export const MASTER_DATA_CONFIG = new InjectionToken<MasterDataConfig>('Master data configuration');
