# Master data

A standalone Angular feature package, mounted through its single public export `MASTER_DATA_ROUTES`.

## Adjustment reasons

The backend-backed Adjustment reasons directory uses the existing `operation-reasons` menu destination:

- `operation-reasons`: paginated code/name search with active/archived/all filters.
- `operation-reasons/create`: create a reason.
- `operation-reasons/:id/edit`: edit a reason or reactivate an archived reason. Codes are immutable.
- Delete opens a confirmation dialog and archives via `PATCH` with `active=false`. There is no delete route or destructive DELETE request.

`AdjustmentReasonsApiService` owns transport to `/reference-data/adjustment-reasons`; `AdjustmentReasonsStore` maps this contract through the inline adapter supplied to shared `withEntityData`. Each page/dialog has an isolated store. The list follows the Users screen: PageLayout filter panel, shared debounced query search, compact status and refresh controls, outlined Material card/table, status badges, and paging footer. Search, status, page size and offset live in URL parameters and are preserved through create/edit navigation. The footer uses the same Material paginator as Users. The API returns `{ items, total }`, with the total matching the current search/status filters. The paginator displays the exact total and provides first/last page controls. The shared state container renders loading, empty, error and update states; snackbars report request failures and successful mutations. Failed edits preserve form values, and write failures preserve form values.

The shell provides `MASTER_DATA_CONFIG` on the lazy route mount: `apiUrl`, `hasPermission`, and `permissionGuard`. The package has no Auth0 dependency. List/create/edit routes require `catalog.read`, `catalog.create`, and `catalog.edit`, respectively; buttons follow the same permissions. Backend authorization remains authoritative.

## Price types

The Price types directory uses the same layout and workflow as Adjustment reasons, with its own API service and store. Routes are `price-types`, `price-types/create`, and `price-types/:id/edit`; the existing menu now mounts these routes. Each record contains an immutable code, name, default tax-inclusive/exclusive price entry mode, and active state. Delete archives through a confirmation dialog and `PATCH`. Errors preserve form input and are shown once in the shared state container, with snackbar notifications for request outcomes.

The backend list endpoint `/reference-data/price-types` returns `{ items, total }`; search, status, and pagination are preserved in URL parameters. The list uses the standard Material paginator and the same filter panel, table, and status styles as Users. Routes and mutation actions use catalog read/create/edit permissions.

## Currencies

Currencies follows the same list/create/edit and archive-dialog workflow through its own API service and store. Fields are a three-letter immutable code, name, symbol, display/rounding decimal places (0–9), and rounding mode. Routes are `currencies`, `currencies/create`, and `currencies/:id/edit`; permissions are `settings.read` and `settings.manage`.

The list displays accounting-currency and import metadata in a compact line above the table. Rate import is a secondary action beside Add currency; the single filter-panel refresh rereads both the list and saved rates without downloading new rates. Accounting currency is selected in Administration → Settings → Accounting; this list displays that setting. “Load exchange rates” calls the backend, which fetches Frankfurter data and persists snapshots. Rates display quote units per one accounting-currency unit, with observation dates, source, import timestamp, and unavailable currency codes. Switching the base never relabels rates from a different base. Failures retain the last saved snapshot; no automatic conversion of monetary documents is introduced. CurrencyRatesStore uses the existing API service through an inline request adapter and owns rate notifications through store events. The backend requires migration `20261011_0010` for rate storage.

## VAT rates and treatments

The `vat-rates` list/create/edit routes use a dedicated HTTP API service and store. The `withEntityData` adapter object in the store maps pagination and trims write payloads, without a separate adapter service. The routes use the same PageLayout, filter panel, Material table/paginator, icon actions, state container, archive dialog, and snackbar pattern as the other dictionaries. Permissions are `settings.read` and `settings.manage`. The list API returns `{ items, total }`. Store event handlers show success/failure snackbars from `withEntityData` events; correlation ids isolate notifications between store instances. The archive dialog supplies its update-success message through a scoped token. Components retain only form/dialog cleanup and navigation.

Treatments remain distinct: `TAXABLE`, `ZERO_RATE`, and `NO_VAT`. Taxable percentages must be positive, at most 100, and use at most four fractional digits. Decimal values travel as strings. Choosing Zero-rated or No VAT sets the rate to zero and disables percentage entry. Codes are immutable; edits and archiving use ordinary partial updates. Default/settings and Product references remain protected by backend validation. No country-specific rates are seeded automatically.

## Products

The product directory uses `/catalog/products` with `{items, total}` pages, code/name/active-barcode search, category/status filtering and category/unit summaries. List/create/edit routes follow the shared PageLayout and Material table/paginator pattern. Archiving uses a dialog. Catalog read/create/edit permissions are separate. HTTP services remain stateless; store adapters normalize payloads, and store events own snackbars.

Product cards include category, immutable storage unit/code, description, brand, an optional VAT reference, typed attributes and the batch-expiry requirement. Attributes use a Material table with add/edit dialogs and removal confirmation. Attributes, barcodes and additional measurements are independent components shown only for a saved product. Creation opens its edit card, preserving list query parameters. Attribute dialogs save through an attributes-only product PATCH; main-form Save excludes attributes. Failed requests keep dialog values, and successful detail operations preserve unsaved main-form fields. Selectors receive complete dictionary data from the parent form and filter it locally, including saved archived references. Legacy package choices are also supplied by the parent. Blank brand/description edits send empty strings to clear values under the existing backend patch contract. The Package set field is hidden in the product card; existing backend associations are preserved when editing.

Saved products also expose barcode and additional-measurement sections. Barcodes appear in a Material table with icon actions. Add/edit forms and archival confirmation open in dialogs. Barcodes can identify the storage unit or an active package from the linked set. Editing can correct the unique barcode value, clear/change its package, or restore an archived barcode. Measurements appear in a Material table with dialog-based add/edit forms and archival confirmation. They retain positive quantities as exact decimal strings, specify reference/document use and an optional report unit. Archived measurements can be restored in the editor. Units remain immutable on existing measurements. Archiving requires confirmation; restoration and validation failures retain the appropriate component state. These sections save independently of the main product form.

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

## Counterparties

`counterparties`, `counterparties/create` and `counterparties/:id/edit` use the same list, breadcrumbs, state component and icon actions as the other dictionaries. A counterparty has one or more supplier/customer/other-recipient roles, identifiers, addresses, contact and payment details. Search covers code, name and both identifiers. The paginated API returns `{ items, total }`.

The stateless CounterpartiesApiService handles transport; mapping and normalization live in CounterpartiesStore. Store events own snackbar notifications and filter by request ownership. Editing preserves immutable codes; deletion archives in a dialog. Duplicate-check warnings require explicit confirmation to continue, exclude the edited record, and preserve input on cancellation or failure. Viewing/creating/editing use `catalog.read`/`catalog.create`/`catalog.edit`.

## Categories

Categories use `/catalog/categories` with paginated search, active-state and all/root/direct-child filtering. Folder actions open direct subcategories without fetching the complete tree. Creation and editing use page layout, breadcrumbs and the state component; archiving uses a dialog. Snackbar notifications are owned by CategoriesStore events.

The parent form loads all category pages once. The autocomplete receives plain options and filters locally, excluding the edited category and its descendants from the loaded adjacency tree. Free text is invalid until an option is chosen; clearing the selection creates/moves to a root. Codes are immutable; nullable descriptions can be cleared. Existing archived parents are retained when unchanged. Categories currently have no version field in their backend contract.

The category table shows the parent name from the page's `parent` summary, including archived parents, with no per-row HTTP lookups. Clicking a parent opens its direct children; roots display a dash.

When a category is opened, list-response `ancestors` feed the store's breadcrumb state. Breadcrumbs show the full root-to-current path even for empty/filtered pages; links reopen each ancestor's direct children while clearing search/offset and preserving status/page size. The path is loaded with the page, not by frontend ancestor lookups.

## Units of measure

`units`, `units/create` and `units/:id/edit` use the existing page layout, list/search/status filters, icon actions, state component, archive dialog and store-owned snackbar events. `/catalog/units` returns `{ items, total }`, with dimension filtering and base-unit summaries for fixed conversions.

Units define a symbol, COUNT/MASS/VOLUME/LENGTH/AREA/OTHER dimension, optional classifier code, display decimal places (0–9) and storage precision (0–6). A derived unit chooses an active root unit of the same dimension from the locally loaded reference snapshot; its positive factor is sent as an exact decimal string, with at most 15 integral and 9 fractional digits. Code/base/factor are immutable after creation. OTHER may be classified once; established dimensions are read-only. Units have no version field in the current backend contract. Product packaging and product-specific ratios remain separate workflows.

## Warehouses

The warehouse directory now uses real `/warehouses` HTTP endpoints instead of demo memory state. The list has search, status filtering, server totals and actor capabilities; creation/editing use separate routes and archiving uses a dialog. UI actions follow global creation and warehouse-scoped management capabilities from the backend, with permission guards and authoritative server checks. Notifications use store events.

The warehouse card edits code (create only), name, description and active state. Users with settings management permission also configure addressed storage, batch tracking and issue strategy on the same card. Disabling batch tracking sets the strategy to MANUAL and disables its selector. Other warehouse managers see those policy fields read-only, and their payloads omit policy fields. Active locations block archival and the dialog preserves backend errors. No warehouse version field or physical address field exists in the current contract.

Selection fields use labels for names, persistent hints for purpose, and Material error messages for invalid selections only after touch or form submission. Required/error state follows the outer reactive-form control. Disabled selectors hide clear actions and show their explanatory hint; reference loading and failures belong to the parent state component.

Product activation is an immediate action in the page action panel: Archive opens confirmation, Restore sends a status-only PATCH. The main form has no Active checkbox and its Save payload omits active state. Both actions preserve unsaved product fields and attributes. Archival returns the saved record from its dialog so the card can update its status without resetting/reloading the form.

Autocomplete options are loaded by parent forms/stores and passed to child controls and dialogs. Categories, units, VAT rates, and accounting currencies load all pages, including archived records needed to display existing links; only active eligible records are offered for new selections. Focus, typing, and selected-id resolution make no HTTP requests. Server search is reserved for product autocompletes. Directory list pagination/search remains server-side.

Forms reuse their scoped CategoriesStore, UnitsStore, and VatRatesStore instances for autocomplete data. `loadAll()` is provided by shared `withEntityData`: it calls the existing adapter for each offset/limit page, commits the complete collection once, and uses the ordinary load state, processors and store events. `load.pageParams` explicitly supplies the pagination contract. Reset, destruction, and a replacement load cancel pending page requests. Product forms compose these store states and pass `entities()` to pure selectors; directory pagination in another store instance is unaffected. There is no separate aggregate reference API or reference store. Legacy package options use the existing ProductDetailsApiService from the parent form.

ProductEditor coordinates loading through `resetState()`, `resetForm()`, `loadReferenceData()`, and `fillForm()`. `applyFormLocks()` restores editable fields and reapplies immutable-code/storage-unit locks after load or save cleanup. `combineUIStates()` combines dependency readiness, loading and failures; empty-list decisions stay with the primary screen data so an empty auxiliary dictionary does not hide an editor. `entityEditorState()` separates retrieval failures from write failures and keeps forms resolved during saving.

`withEntityData` exposes `ownsRequest(correlationId)`. Standard entity snackbar handling lives in shared `withEntityNotifications`, configured with the store's event creators and success messages, including scoped message tokens. Categories, units, VAT rates, products, warehouses, counterparties, product barcodes/measurements, users and roles reuse it. Domain handlers remain local for category paths, warehouse capabilities and counterparty duplicate checks. Notifications remain owned by the requesting instance; cancelled/reset requests cannot notify.

Product attribute dialogs use the shared attribute form factory and validators. Validators check supported types, parsed value types, finite numbers, and trimmed unique names. Validation errors appear next to the relevant field after touch/submission. Save serializes validated rows with `Object.fromEntries`, preserving JSON types and special property names; it does not catch validation exceptions or inspect error message text.

Dictionary editors use PageLayout `pageActions` for Save/Cancel, with submit buttons explicitly linked to their forms. Editor state comes from `entityEditorState`, and named reset/fill/lock methods preserve immutable fields and permissions across loads and failed writes. Adjustment reasons, Price types and Currencies use shared store notification handlers, including scoped archive-success messages; components handle navigation and cleanup only.

Barcode and measurement status is managed through Archive/Restore table actions. Archive requires confirmation; Restore sends a status-only PATCH. Their edit dialogs do not expose an Active checkbox or include status in ordinary saves.

All directory editors manage status with Archive/Restore in PageLayout actions; no editor exposes an Active checkbox. Ordinary updates omit status, and new records start active. Lists expose the same status actions and preserve their filters/pagination when refreshing. A shared `createDirectoryStatusActions` helper owns confirmation orchestration, cancellation, permissions and repeated-click guards; stores still own requests and snackbar events. Archive dialogs return the saved record so cards update their cache without resetting unsaved fields. Backend accounting-reference and warehouse permission locks remain authoritative.

Reload actions are absent from form action panels. Load failures use the state container Retry action; write failures may render a reload action next to the error with an explicit warning that reloading discards unsaved changes. Creation forms do not offer record reload for write failures.

No master-data or settings request requires a client-supplied edit version. Stores send field changes directly; later successful saves win for supplied fields. Server revision numbers are audit metadata only. Ordinary business conflicts are displayed without version-conflict recovery text.
