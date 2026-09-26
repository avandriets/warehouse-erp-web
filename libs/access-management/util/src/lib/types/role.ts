export interface RoleRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleCreate {
  code: string;
  name: string;
  description: string | null;
}

export interface RoleUpdate {
  name: string;
  description: string | null;
  active: boolean;
}
