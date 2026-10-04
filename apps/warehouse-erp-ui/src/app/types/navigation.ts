import type { LoadChildrenCallback } from '@angular/router';

export interface ResolvedSubmenuItem {
  readonly id: string;
  readonly route: string;
  readonly title: string;
}

export interface ResolvedSubmenuGroup {
  readonly id: string;
  readonly title: string;
  readonly items: readonly ResolvedSubmenuItem[];
}

export interface PrimaryMenuItem {
  readonly id: string;
  readonly route: string;
  readonly title: string;
  readonly icon: string;
  readonly sidebarTitle: string;
}

export interface ResolvedPrimaryMenuItem extends PrimaryMenuItem {
  readonly groups: readonly ResolvedSubmenuGroup[];
}

export interface LibraryMount {
  readonly id: string;
  readonly path: string;
  readonly loadChildren: LoadChildrenCallback;
}

export interface SubmenuGroup {
  readonly id: string;
  readonly primaryMenuId: string;
  readonly title: string;
}

export type MenuTarget = { readonly libraryId: string; readonly path: string } | { readonly route: string };

export interface SubmenuItem {
  readonly id: string;
  readonly submenuGroupId: string;
  readonly title: string;
  readonly target: MenuTarget;
}

export interface MenuConfig {
  readonly primaryMenu: readonly PrimaryMenuItem[];
  readonly submenuGroups: readonly SubmenuGroup[];
  readonly submenuItems: readonly SubmenuItem[];
}

export interface PlaceholderPage {
  readonly path: string;
  readonly title: string;
  readonly primaryMenuRoute: string;
}

export interface NavigationSelection {
  readonly primaryMenuItem: ResolvedPrimaryMenuItem | null;
  readonly itemId: string | null;
}
