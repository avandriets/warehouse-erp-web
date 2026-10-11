import type { SubmenuGroup, SubmenuItem } from '../types';

export const ADMINISTRATION_GROUPS: readonly SubmenuGroup[] = [
  { id: 'administration-settings', primaryMenuId: 'administration', title: 'Configuration' },
  { id: 'administration-access', primaryMenuId: 'administration', title: 'Access management' },
];

export const ADMINISTRATION_LINKS: readonly SubmenuItem[] = [
  {
    id: 'admin-settings',
    submenuGroupId: 'administration-settings',
    title: 'Settings',
    icon: 'settings',
    permission: 'settings.manage',
    target: { libraryId: 'administration-library', path: 'settings' },
  },
  {
    id: 'admin-users',
    permission: 'users.manage',
    submenuGroupId: 'administration-access',
    title: 'Users',
    icon: 'people',
    target: { libraryId: 'administration-library', path: 'users' },
  },
  {
    id: 'admin-roles',
    permission: 'users.manage',
    submenuGroupId: 'administration-access',
    title: 'Roles and permissions',
    icon: 'admin_panel_settings',
    target: { libraryId: 'administration-library', path: 'roles' },
  },
];
