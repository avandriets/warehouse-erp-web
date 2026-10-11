import { inject, Injectable } from '@angular/core';
import type { CurrentUser, OwnProfileUpdate } from '@warehouse/auth';
import { WarehouseAuthService } from '@warehouse/auth';
import type { RequestDataAdapter } from '@warehouse/shared';
import type { Observable } from 'rxjs';
import { defer, EMPTY } from 'rxjs';

import type { ProfileSaveRequest } from '../../types';

@Injectable({ providedIn: 'root' })
export class ProfileAdapterService implements RequestDataAdapter<CurrentUser, void, ProfileSaveRequest> {
  private readonly auth = inject(WarehouseAuthService);

  load(): Observable<CurrentUser> {
    return defer(() => this.auth.loadCurrentUser());
  }

  save({ snapshot, values }: ProfileSaveRequest): Observable<CurrentUser> {
    return defer(() => {
      const payload: OwnProfileUpdate = {};
      for (const key of ['first_name', 'last_name', 'display_name', 'email'] as const) {
        const value = values[key];
        if (value !== undefined && value !== snapshot[key]) {
          payload[key] = value;
        }
      }

      return Object.keys(payload).length ? this.auth.updateOwnProfile(payload) : EMPTY;
    });
  }
}
