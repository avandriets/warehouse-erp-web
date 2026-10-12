# Master data

A standalone Angular feature package, mounted through its single public export `MASTER_DATA_ROUTES`.

## Adjustment reasons

The backend-backed Adjustment reasons directory uses the existing `operation-reasons` menu destination:

- `operation-reasons`: paginated code/name search with active/archived/all filters.
- `operation-reasons/create`: create a reason.
- `operation-reasons/:id/edit`: edit a reason or reactivate an archived reason. Codes are immutable.
- Delete opens a confirmation dialog and archives via `PATCH` with `active=false` and `expected_version`. There is no delete route or destructive DELETE request.

`AdjustmentReasonsApiService` owns transport to `/reference-data/adjustment-reasons`; the dedicated `AdjustmentReasonsAdapterService` connects this contract to `AdjustmentReasonsStore` using shared `withEntityData`. Each page/dialog has an isolated store. The list follows the Users screen: PageLayout filter panel, shared debounced query search, compact status and refresh controls, outlined Material card/table, status badges, and paging footer. Search, status, page size and offset live in URL parameters and are preserved through create/edit navigation. The footer uses the same Material paginator as Users. The API returns `{ items, total }`, with the total matching the current search/status filters. The paginator displays the exact total and provides first/last page controls. The shared state container renders loading, empty, error and update states; snackbars report request failures and successful mutations. Failed edits preserve form values, and version conflicts offer explicit reload.

The shell provides `MASTER_DATA_CONFIG` on the lazy route mount: `apiUrl`, `hasPermission`, and `permissionGuard`. The package has no Auth0 dependency. List/create/edit routes require `catalog.read`, `catalog.create`, and `catalog.edit`, respectively; buttons follow the same permissions. Backend authorization remains authoritative.

## Price types

The Price types directory uses the same layout and workflow as Adjustment reasons, with its own API service, adapter, and store. Routes are `price-types`, `price-types/create`, and `price-types/:id/edit`; the existing menu now mounts these routes. Each record contains an immutable code, name, default tax-inclusive/exclusive price entry mode, and active state. Delete archives through a confirmation dialog and versioned `PATCH`. Errors preserve form input and are shown once in the shared state container, with snackbar notifications for request outcomes.

The backend list endpoint `/reference-data/price-types` returns `{ items, total }`; search, status, and pagination are preserved in URL parameters. The list uses the standard Material paginator and the same filter panel, table, and status styles as Users. Routes and mutation actions use catalog read/create/edit permissions.

## Currencies

Currencies follows the same list/create/edit and archive-dialog workflow through its own API, adapter, and store. Fields are a three-letter immutable code, name, symbol, display/rounding decimal places (0–9), and rounding mode. Routes are `currencies`, `currencies/create`, and `currencies/:id/edit`; permissions are `settings.read` and `settings.manage`.

The list displays accounting-currency and import metadata in a compact line above the table. Rate import is a secondary action beside Add currency; the single filter-panel refresh rereads both the list and saved rates without downloading new rates. Accounting currency is selected in Administration → Settings → Accounting; this list displays that setting. “Load exchange rates” calls the backend, which fetches Frankfurter data and persists snapshots. Rates display quote units per one accounting-currency unit, with observation dates, source, import timestamp, and unavailable currency codes. Switching the base never relabels rates from a different base. Failures retain the last saved snapshot; no automatic conversion of monetary documents is introduced. A separate request adapter/store owns these settings and rate actions. The backend requires migration `20261011_0010` for rate storage.

## Demo directories

Products and warehouses each provide the following relative routes:

- `products` / `warehouses`: list
- `products/create` / `warehouses/create`: create
- `products/:id/edit` / `warehouses/:id/edit`: edit
- `products/:id/delete` / `warehouses/:id/delete`: confirmation before deletion

Both directories initially contain records `123` and `124`. Data is kept in separate route-scoped in-memory stores for products and warehouses. Reloading the browser resets it. No backend requests or persistent writes are made. Code and name are required, and codes are unique within each directory.

The package owns its routes, forms, state and mutations. The shell owns the menu and the mount URL. All internal links are relative. Each feature owns its page, form, model and store: products have a description, warehouses have an address. Presentation-only directory fields and a table are shared. Only the route tree is public; feature implementation stays private.

## Shell integration

Register the library in `apps/warehouse-erp-ui/src/app/config/library-mounts.config.ts`:

```ts
{
  id: 'master-data-library',
  path: 'master-data',
  loadChildren: () => import('@warehouse/master-data').then(m => m.MASTER_DATA_ROUTES),
}
```

The shell menu is independent of library routes:

- `config/menu.config.ts`: primary menu items and assembled menu configuration.
- `config/*-menu.config.ts`: groups and items: groups reference `primaryMenuId`; items reference only `submenuGroupId`.
- `navigation/`: validates configuration and resolves library-relative links; `config/primary-menu-with-submenus.token.ts` contains the injection token.
- `services/menu-selection.service.ts`: selects the active menu item by the most specific matching URL, including nested pages.
- `config/app-placeholders.config.ts`: explicit temporary destinations for unimplemented features; library routes are never generated from menu links.

A menu link to a directory looks like this:

```ts
{
  id: 'products',
  submenuGroupId: 'master-data-products',
  title: 'Products',
  target: { libraryId: 'master-data-library', path: 'products' },
}
```

Changing a group’s `primaryMenuId` moves all its items without changing their destinations. Changing an item’s `submenuGroupId` moves that item alone. Changing the library mount changes all of its resolved links without editing the library. Submenu overview URLs are shell pages and can be independent of the library mount.

When adding a real feature that replaces a placeholder, remove that entry from `config/app-placeholders.config.ts` and update the menu target to its library id and relative path. There is no wildcard in the package: unmatched paths fall through to the shell's not-found page.

## Verification

```sh
npx nx test master-data
npx nx test warehouse-erp-ui
npx nx build master-data
npx nx build warehouse-erp-ui
npm run check
```

Tests cover CRUD and validation in both directories, relative navigation under a different mount, reassignment to another primary menu item, direct nested URLs, active menu selection and unknown routes.

## Configuration and rendering

`MenuConfig` contains `primaryMenu`, `submenuGroups` and `submenuItems`. Configuration types (`PrimaryMenuItem`, `SubmenuGroup`, `SubmenuItem`) are distinct from resolved rendering types (`ResolvedPrimaryMenuItem`, `ResolvedSubmenuGroup`, `ResolvedSubmenuItem`). The renderer receives complete URLs, never library references.

Validation rejects duplicate identifiers, malformed static paths, missing references, duplicate submenu destinations, overlapping library mounts and shell routes shadowing public library entries. Integration tests verify that configured library entry points exist; the shell does not inspect lazy route implementations.

Shell menu and library configuration files are under `config/`. Angular bootstrap providers remain in the application root `app.config.ts`; `app.routes.ts` composes routes. The unavailable/error placeholder is a reusable component under `components/unavailable`. Sidebar navigation uses real Angular router links, supporting copy-link and opening in another tab.
