export type UserStatus = 'INVITED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';

export const USER_STATUS_LABELS = {
  INVITED: 'Invited',
  PENDING_APPROVAL: 'Pending approval',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
} as const satisfies Record<UserStatus, string>;
