import type { LibraryMount, MenuConfig, PlaceholderPage, ResolvedPrimaryMenuItem } from '../types';

export function assertUnique(values: readonly string[], label: string): void {
  const found = new Set<string>();
  for (const value of values) {
    if (!value.trim() || found.has(value)) {
      throw new Error(`Empty or duplicate ${label}: "${value}".`);
    }
    found.add(value);
  }
}

export function assertPath(path: string, label: string, absolute = false, allowEmpty = false): void {
  const relative = absolute ? path.slice(1) : path;
  const segments = relative.split('/');
  if (
    (absolute && !path.startsWith('/')) ||
    (!relative && !allowEmpty) ||
    (relative &&
      segments.some(segment => !segment || segment === '.' || segment === '..' || /[\\\s?#:;*%]/.test(segment)))
  ) {
    throw new Error(
      `Invalid ${label}: "${path}". Use a static ${absolute ? 'absolute' : 'relative'} path without query parameters or a trailing slash.`,
    );
  }
}

export function validateRouteConfiguration(
  menu: MenuConfig,
  libraries: readonly LibraryMount[],
  placeholders: readonly PlaceholderPage[],
  navigation: readonly ResolvedPrimaryMenuItem[],
): void {
  const configuredPaths = [
    ...menu.primaryMenu.map(item => item.route.slice(1)),
    ...libraries.map(library => library.path),
    ...placeholders.map(page => page.path),
  ];
  if (configuredPaths.some(path => path === 'error' || path.startsWith('error/'))) {
    throw new Error('The error route is reserved for shell access and service failures.');
  }
  assertUnique(
    placeholders.map(page => page.path),
    'placeholder path',
  );
  for (const page of placeholders) {
    assertPath(page.path, 'placeholder path');
    assertPath(page.primaryMenuRoute, 'placeholder back URL', true);
    if (
      menu.primaryMenu.some(item => item.route === `/${page.path}`) ||
      libraries.some(library => library.path === page.path)
    ) {
      throw new Error(`Placeholder route conflicts with a menu overview or library mount: "${page.path}".`);
    }
  }
  for (const library of libraries) {
    if (libraries.some(other => other !== library && other.path.startsWith(`${library.path}/`))) {
      throw new Error(`Overlapping library mounts: "${library.path}".`);
    }
    if (menu.primaryMenu.some(item => item.route.startsWith(`/${library.path}/`))) {
      throw new Error(`Menu overview shadows a library route beneath "${library.path}".`);
    }
  }
  for (const item of menu.submenuItems) {
    if ('libraryId' in item.target) {
      const target = item.target;
      const library = libraries.find(entry => entry.id === target.libraryId)!;
      const path = [library.path, target.path].filter(Boolean).join('/');
      if (placeholders.some(page => page.path === path)) {
        throw new Error(`Placeholder shadows public library entry: "${path}".`);
      }
    }
  }
  const destinations = navigation.flatMap(item => item.groups.flatMap(group => group.items.map(link => link.route)));
  assertUnique(destinations, 'submenu destination');
}
