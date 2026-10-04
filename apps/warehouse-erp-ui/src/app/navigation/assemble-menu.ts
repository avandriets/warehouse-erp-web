import type {
  LibraryMount,
  MenuConfig,
  ResolvedPrimaryMenuItem,
  ResolvedSubmenuGroup,
  ResolvedSubmenuItem,
} from '../types';
import { assertPath, assertUnique } from './validate-route-configuration';

export function assembleMenu(
  menu: MenuConfig,
  libraries: readonly LibraryMount[],
): readonly ResolvedPrimaryMenuItem[] {
  assertUnique(
    menu.primaryMenu.map(item => item.id),
    'primary menu id',
  );
  assertUnique(
    menu.primaryMenu.map(item => item.route),
    'menu overview URL',
  );
  assertUnique(
    menu.submenuGroups.map(group => group.id),
    'submenu group id',
  );
  assertUnique(
    menu.submenuItems.map(item => item.id),
    'submenu item id',
  );
  assertUnique(
    libraries.map(library => library.id),
    'library id',
  );
  assertUnique(
    libraries.map(library => library.path),
    'library mount path',
  );

  const mounts = new Map(libraries.map(library => [library.id, library]));
  const groups = new Map<string, ResolvedSubmenuGroup>();
  const itemsByGroup = new Map<string, ResolvedSubmenuItem[]>();

  for (const library of libraries) {
    assertPath(library.path, 'library mount path');
  }

  for (const item of menu.primaryMenu) {
    assertPath(item.route, 'menu overview URL', true);
  }

  for (const group of menu.submenuGroups) {
    if (!menu.primaryMenu.some(item => item.id === group.primaryMenuId)) {
      throw new Error(`Unknown primary menu "${group.primaryMenuId}" for group "${group.id}".`);
    }

    const items: ResolvedSubmenuItem[] = [];

    itemsByGroup.set(group.id, items);
    groups.set(group.id, { id: group.id, title: group.title, items });
  }

  for (const item of menu.submenuItems) {
    const items = itemsByGroup.get(item.submenuGroupId);

    if (!items) {
      throw new Error(`Unknown group "${item.submenuGroupId}" for submenu item "${item.id}".`);
    }

    const target = item.target;
    let route: string;

    if ('route' in target) {
      assertPath(target.route, 'submenu URL', true);
      route = target.route;
    } else {
      const library = mounts.get(target.libraryId);
      if (!library) {
        throw new Error(`Unknown library "${target.libraryId}" for submenu item "${item.id}".`);
      }
      assertPath(target.path, 'library entry path', false, true);
      route = `/${[library.path, target.path].filter(Boolean).join('/')}`;
    }
    items.push({ id: item.id, title: item.title, route });
  }

  return menu.primaryMenu.map(item => ({
    ...item,
    groups: menu.submenuGroups.filter(group => group.primaryMenuId === item.id).map(group => groups.get(group.id)!),
  }));
}
