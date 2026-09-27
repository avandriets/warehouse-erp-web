import type { ParamMap } from '@angular/router';
import { USER_STATUS_LABELS } from '@warehouse/shared';

import type { UsersQuery, UserStatus } from './types';

export const USERS_PAGE_SIZE = 25;

export function parseUserStatus(value: string | null): UserStatus | undefined {
  return value && Object.hasOwn(USER_STATUS_LABELS, value) ? (value as UserStatus) : undefined;
}

export function parseActive(value: string | null): boolean | undefined {
  return value === 'true' ? true : value === 'false' ? false : undefined;
}

export function parseUsersQuery(params: ParamMap): UsersQuery {
  const offset = Number(params.get('offset'));
  return {
    limit: USERS_PAGE_SIZE,
    offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
    status: parseUserStatus(params.get('status')),
  };
}
