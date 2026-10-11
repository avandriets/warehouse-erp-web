import type { CurrentUser, OwnProfileUpdate } from '@warehouse/auth';

export interface ProfileSaveRequest {
  snapshot: CurrentUser;
  values: OwnProfileUpdate;
}
