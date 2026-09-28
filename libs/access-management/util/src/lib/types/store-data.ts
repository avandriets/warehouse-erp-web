import type { UserStatus, UserWrite } from './user';

export interface UsersQuery {
  limit: number;
  offset: number;
  status?: UserStatus;
  q?: string;
}

export interface RolesQuery {
  active?: boolean;
  q?: string;
}

export type UserUpdateCommand = UserWrite | { status: 'ACTIVE' | 'SUSPENDED' } | { auth0_subject: string };
