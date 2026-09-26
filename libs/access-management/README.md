# @warehouse/access-management

A publishable Angular package for ERP identity administration: users, roles, permissions, role assignments, shared UI, and API access.

## Public API

The primary entry point configures the package and exports its route tree:

```ts
import { ACCESS_MANAGEMENT_ROUTES, provideAccessManagement } from '@warehouse/access-management';

export const appConfig: ApplicationConfig = {
  providers: [provideAccessManagement({ apiUrl: '/api' })],
};

export const routes: Routes = [
  {
    path: 'access-management',
    children: ACCESS_MANAGEMENT_ROUTES,
  },
];
```

`ACCESS_MANAGEMENT_ROUTES` is a constant in the primary package API. There is intentionally no `@warehouse/access-management/routes` secondary entry point.

The package also exposes these secondary entry points:

- `@warehouse/access-management/feature/dashboard`
- `@warehouse/access-management/feature/users`
- `@warehouse/access-management/feature/roles`
- `@warehouse/access-management/data-access`
- `@warehouse/access-management/ui`
- `@warehouse/access-management/util`

Feature entry points are lazy-loaded by `ACCESS_MANAGEMENT_ROUTES`. Consumers normally import only the primary entry point.

Inside an entry point, injectable services live in `services`, reusable components in `components`, and route-level orchestration components in `containers`. Every such directory has an `index.ts` barrel; implementation files are not cross-directory import boundaries.

## Styling

Interactive controls use Angular Material; layout and presentation use Tailwind CSS. The consuming application owns the Material theme. A Tailwind v4 consumer installing the built package must include its templates in source detection, adapting the relative path to its global stylesheet:

```css
@import 'tailwindcss';
@source '../../../node_modules/@warehouse/access-management';
```

No package-private Material selectors are required.

## Development

```bash
npx nx test access-management
npx nx build access-management
```

The package output is written to `dist/libs/access-management` and can be inspected with `npm pack --dry-run` from that directory.
