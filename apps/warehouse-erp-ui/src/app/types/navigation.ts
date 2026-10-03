export interface NavigationItem {
  readonly id: string;
  readonly route: string;
  readonly title: string;
}

export interface NavigationGroup {
  readonly title: string;
  readonly items: readonly NavigationItem[];
}

export interface NavigationSection {
  readonly id: string;
  readonly route: string;
  readonly title: string;
  readonly icon: string;
  readonly sidebarTitle: string;
  readonly groups: readonly NavigationGroup[];
}
