import type { UserStatus } from '@warehouse/shared';

export type CurrentUserStatus = UserStatus;

export interface CurrentUser {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  user_id: string;
  subject: string;
  status: CurrentUserStatus;
  permissions: string[];
}
