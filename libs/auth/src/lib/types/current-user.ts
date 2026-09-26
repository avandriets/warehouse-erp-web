export type CurrentUserStatus = 'INVITED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';

export interface CurrentUser {
  user_id: string;
  subject: string;
  status: CurrentUserStatus;
  permissions: string[];
}
