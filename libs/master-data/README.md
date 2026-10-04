# Master data

A standalone Angular feature package, mounted through its single public export `MASTER_DATA_ROUTES`.

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
