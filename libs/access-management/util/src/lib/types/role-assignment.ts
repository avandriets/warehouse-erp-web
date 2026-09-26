export type ScopeType = 'GLOBAL' | 'COMPANY' | 'WAREHOUSE';

export interface RoleAssignmentRecord {
  id: string;
  user_id: string;
  role_id: string;
  scope_type: ScopeType;
  scope_id: string | null;
  created_at: string;
}

export interface RoleAssignmentCreate {
  role_id: string;
  scope_type: ScopeType;
  scope_id: string | null;
}
