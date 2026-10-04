import type { SubmenuGroup, SubmenuItem } from '../types';

export const ADMINISTRATION_GROUPS: readonly SubmenuGroup[] = [
  { id: 'administration-access', primaryMenuId: 'administration', title: 'Access management' },
];

export const ADMINISTRATION_LINKS: readonly SubmenuItem[] = [
  {
    id: 'admin-users',
    submenuGroupId: 'administration-access',
    title: 'Users',
    target: { libraryId: 'access-management-library', path: 'users' },
  },
  {
    id: 'admin-roles',
    submenuGroupId: 'administration-access',
    title: 'Roles and permissions',
    target: { libraryId: 'access-management-library', path: 'roles' },
  },
];
