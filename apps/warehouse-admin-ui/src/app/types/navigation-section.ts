export interface NavigationLink {
  readonly iconPath: string;
  readonly exact: boolean;
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly permission: string;
}

export interface NavigationGroup {
  readonly id: string;
  readonly title: string;
  readonly iconPath: string;
  readonly children: readonly NavigationLink[];
}

export type NavigationSection = NavigationLink | NavigationGroup;
