import type { ParamMap } from '@angular/router';
import { USER_STATUS_LABELS } from '@warehouse/shared';

import type { RolesQuery, UsersQuery, UserStatus } from '../types';

export const USERS_PAGE_SIZE = 25;

export const USERS_PAGE_SIZES = [25, 50, 100] as const;

export function parseUserStatus(value: string | null): UserStatus | undefined {
  return value && Object.hasOwn(USER_STATUS_LABELS, value) ? (value as UserStatus) : undefined;
}

export function parseActive(value: string | null): boolean | undefined {
  return value === 'true' ? true : value === 'false' ? false : undefined;
}

export function parseUsersQuery(params: ParamMap): UsersQuery {
  const offset = Number(params.get('offset'));
  const requestedLimit = Number(params.get('limit'));
  const limit = USERS_PAGE_SIZES.includes(requestedLimit as (typeof USERS_PAGE_SIZES)[number])
    ? requestedLimit
    : USERS_PAGE_SIZE;

  return {
    limit,
    offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
    q: params.get('q')?.trim() || undefined,
    status: parseUserStatus(params.get('status')),
  };
}

export function parseRolesQuery(params: ParamMap): RolesQuery {
  return {
    active: parseActive(params.get('active')),
    q: params.get('q')?.trim() || undefined,
  };
}
