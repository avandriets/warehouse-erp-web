import type { UserStatus } from '@warehouse/shared';

export interface OwnProfileResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  status: UserStatus;
}

export interface OwnProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  email?: string | null;
}
