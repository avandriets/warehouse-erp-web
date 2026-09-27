import type { UserStatus } from '@warehouse/shared';

export type { UserStatus } from '@warehouse/shared';

export interface UserRecord {
  id: string;
  auth0_subject: string | null;
  email: string | null;
  display_name: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface UserWrite {
  email: string | null;
  display_name: string | null;
}
