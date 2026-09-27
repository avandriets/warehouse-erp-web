import type { UserStatus } from '@warehouse/shared';

export type CurrentUserStatus = UserStatus;

export interface CurrentUser {
  user_id: string;
  subject: string;
  status: CurrentUserStatus;
  permissions: string[];
}
