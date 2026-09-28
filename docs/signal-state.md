# Signal state and request rendering

The ERP uses `@ngrx/signals` 21.1.1 with Angular 21.2. The implementation ports the application's own `nutrition-ui` features, rather than introducing classic NgRx Store/Effects/Data.

## Reference assessment

| Reference                                | Adopted                                                                                                                                                                            | Deliberately excluded                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| nutrition-ui `withRequestData`           | Arbitrary result data, request state, latest/exhaust/parallel loads, correlation IDs, processors, optional SignalStore events, reset                                               | Nutrition-specific services and events                                                                  |
| nutrition-ui `withEntityData`            | NgRx `withEntities`, adapters, CRUD, per-entity operation status, separate read/write errors, pagination metadata, replace/append/prepend/upsert merging, local collection updates | Nutrition-specific product contracts                                                                    |
| nutrition-ui `UIStateContainerComponent` | A status, array, or named status map; resolved/pending/rejected/empty/updating templates; action errors                                                                            | Inline sizing and nutrition styles                                                                      |
| NgRx SignalStore                         | Composable features, protected state, computed signals, normalized entities, component-scoped providers                                                                            | A global cache shared across authenticated sessions                                                     |
| NgRx Data                                | Collection adapters and reusable CRUD/status conventions                                                                                                                           | The package itself, automatic URL conventions, optimistic rollback and transactional multi-entity saves |
| ngx-container-resolver                   | A container owns request-state presentation and replaceable templates                                                                                                              | Its NgModule/service implementation and global event bus                                                |

NgRx Data is in maintenance mode. Its CRUD conventions remain useful, but installing it would add a separate Store/Effects architecture. The ngx-container-resolver author identifies that library as a proof of concept, not recommended for production.

Sources:

- [NgRx custom SignalStore features](https://ngrx.io/guide/signals/signal-store/custom-store-features)
- [NgRx Data](https://ngrx.io/guide/data)
- [ngx-container-resolver](https://github.com/mpezzi/ngx-container-resolver)

## Public APIs and integration

`@warehouse/shared` exports `withCallState`, `withRequestData`, `withEntityData`, `UIStateContainerComponent`, and their configuration/state types. `withRequestData` supports an optional typed save adapter for replacing a resource. Implementations live in focused `state`, `types`, and `components` collections inside the existing buildable library.

`@warehouse/access-management/data-access` exports component-scoped `UsersStore`, `RolesStore`, and `AccessStore`, plus the local `AccessApiService`. Components own draft form fields and presentation state. Stores own remote data, request status and writes; the stateless API service handles users/roles transport, while `AccessApiService` owns permission and assignment HTTP operations. Both preserve backend endpoints and payloads.

Users and roles use `withEntityData`. Access management uses one domain-specific `AccessStore`
in the package's local data-access entry point. It owns three resource slices: the permission
catalog, assigned role permissions, and user role assignments. Each slice keeps its data and context ID; three named `withCallState` features own independent
read/write status and errors. Status flags are not duplicated in the resource data. Panels compose these statuses through the existing container
status-map input. Empty collections remain valid editor data, and permission drafts survive
failed writes. Each dialog provides its own store and API service; no global access cache is used.

The API service returns the original cold Observables from HttpClient. Store adapters pass them through directly, with no Promise conversion or transport `defer` wrappers. Components observe signals. Command handlers return void and subscribe to Observable workflows: resource writes update state from API responses; routed list screens reload their current query when needed. UI busy state is derived from store loading/saving signals rather than a separately maintained flag. Subscriptions end on component destruction; the role permission panel also cancels ongoing workflows when its role changes. User access is scoped to one user for the dialog lifetime. Store operations receive explicit user/role IDs; changing a resource context cancels its old operations and clears its data. Routed loading uses switchMap.

```ts
const CatalogStore = signalStore(
  withEntityData<Item, ItemWrite, Query>({
    adapter: () => {
      const api = inject(CatalogApiService);
      return {
        load: query => api.list(query).pipe(map(entities => ({ entities }))),
        create: payload => api.create(payload),
        update: (id, payload) => api.update(id, payload),
      };
    },
    errors: {
      load: 'Could not load items.',
      create: 'Could not create item.',
      update: 'Could not update item.',
      remove: 'Could not remove item.',
    },
  }),
);
```

The ERP API follows this Observable-based pattern. Declare the store in the consuming component's `providers` and subscribe once to each command. `load`, `create`, and other feature methods are cold: calling them alone does not send a request. Errors update state and complete the stream without a value. Optional event handlers are not required to operate the stores.

```html
<app-ui-state-container
  [state]="state()"
  [resolved]="content"
  [actionError]="actionError()"
  (actionErrorDismissed)="dismissActionError()"
  (retry)="load()"
/>
<ng-template #content>
  <!-- Render store.entities() with the feature's presentation components. -->
</ng-template>
```

Use `requestState()` for request stores. Pass an array or named map to aggregate prerequisites. All statuses must resolve before content appears. Use one container per independent region when partial rendering is desired.

## Reusable call state

`withCallState({ collection: 'permissions' })` is a named SignalStore feature exported by
`@warehouse/shared`. Multiple collections can be composed in one store:

```ts
signalStore(
  withState(initialState),
  withCallState({ collection: 'permissions' }),
  withCallState({ collection: 'rolePermissions' }),
  withCallState({ collection: 'roleAssignments' }),
);
```

Each instance exposes `<collection>Loading`, `Loaded`, `Saving`, `Error`, `ActionError`, and
`State` signals. The `State` signal matches the existing `UIStateContainer` contract; it does
not infer empty state because this feature does not own data. All values derive from one named
`<collection>CallState` state slice.

The lifecycle methods are `<collection>StartCall(operation)`, `CallSucceeded(operation)`,
`CallFailed(operation, message)`, and `FinishCall(operation)`, where operation is `load` or `save`.
Call `FinishCall` in finalization, including cancellation: success/error records the outcome,
while finalization clears the busy flag. A successful load marks data as loaded. A successful
incremental write does not claim that the entire collection was loaded; `SetLoaded()` is available
when a complete resource is accepted, such as the replacement of assigned permissions.

`DismissActionError()` clears only the write error. `ResetCallState()` restores all statuses for
that collection without touching domain data or other collections. Refresh failures preserve
loaded status, and starting a retry clears only the matching error.

The feature owns no HTTP calls, subscriptions, data, or concurrency policy. `AccessStore` retains
request cancellation, context changes, write concurrency, and updates from server responses.
It cancels operations before resetting their call state. `UsersStore`, `RolesStore`, and the
existing generic data features retain their current implementations.

## Adaptation details and boundaries

- `resolved` means data is available, even if a refresh fails. The container retains that content and displays the refresh error with Retry. Writes use `actionError`, so rejected writes do not replace the editor.
- Initial loading uses a spinner; refresh uses a progress bar. Empty results have their own view. Optional templates keep feature-specific presentation out of the shared component.
- `latest` accepts only the active result. Stale results no longer reach command subscribers. `exhaust` skips a load while another is pending; `parallel` tracks separate operations. Explicit correlation IDs must uniquely identify operations.
- Correlation IDs are allocated per subscription. Unsubscription and injector destruction clear pending operations. Unsubscribing now cancels the underlying HTTP request. Routed query changes cancel the previous read through switchMap; mutation reset and injector destruction unsubscribe pending mutations. Read features still use logical latest-result protection when consumers start independent subscriptions. Cancelling a write request does not guarantee a server-side rollback.
- Switching a filter/page resets the previous collection. Refreshing the same query retains its data. Role selection changes reset assigned permissions and cancel pending workflows, preventing old responses from changing the new panel.
- API error details are mapped with `errorMessage`, while the reference fallback messages remain available.
- Auth0 linking emits the updated user and updates the parent collection immutably; it no longer mutates the input object.
- Entity writes are pessimistic: the server response updates the collection. The routed screens then reload using the current URL parameters to honor pagination and filters. ERP deletion/get-by-id adapters are not enabled unless that screen needs them.
- `withRequestData.save(payload)` calls the configured adapter and replaces data with the server response. It tracks saving and action errors, skips concurrent writes, and cancels pending reads before saving and when accepting the saved response. Reset, unsubscription, and destruction cancel pending saves. Failed saves preserve existing data and form drafts. Internal `defer` allocates operation state per subscription.
- `AccessStore` exposes the domain operations `listPermissions`, `listRolePermissions`, `replaceRolePermissions`, `listRoleAssignments`, `assignRole`, and `revokeRoleAssignment`. The API service owns HTTP calls; the store accepts server responses and updates the affected collection without reloading catalogs. Its internal request lifecycle cancels stale reads, serializes writes per resource, and skips reads while that resource is saving. Reset, unsubscription, context changes, and destruction cancel pending operations. Failed writes preserve data. No generic public mutation callback or CRUD wrappers are used for access operations.
- `UsersStore.update` continues to handle profile, status, and Auth0 payloads through its existing adapter. Components never call transport directly. Backend HTTP methods and payloads remain unchanged.
- Auth/session orchestration remains in `@warehouse/auth`; feature stores are not root singletons and are destroyed with their screens.

Validation covers the transferred feature behavior, UI state aggregation and retry, failed writes, late responses, selection changes, unsubscribe/destruction, and existing backend payload contracts using mocked HTTP.

## List filters and URLs

User and role filters live in separate `UsersFilter` and `RolesFilter` form components and URL query parameters, never in store state. Users support `status`, `offset`, and `q`; roles support `active=true|false` and `q`. Search (`q`) is sent to the backend: users match name/email before pagination; roles match name/code. Updating search replaces the current history entry and resets user pagination. The input is limited to the backend maximum of 255 characters. Filter and page changes create history entries so browser Back/Forward restores them. Invalid filter and offset values fall back to an unfiltered first page.

Filter components restore their own controls on navigation. The shared `UrlSearch` writes `q` after a 300 ms debounce; navigation cancels pending drafts. The routed screen normalizes query parameters and calls the original `store.load(params)`. A changed server query resets old collection data and switches the request subscription; Refresh/Retry retains existing data. After a successful write the screen reloads from the current URL, not from stored filters or draft inputs. `loadUsers`, `loadRoles`, `query`, and `activeFilter` are not part of the stores. Forms call the original `create` or `update` method directly; no `saveRole` or `saveUser` wrapper is needed. Forms use their validation state and the store write status; screens use the store loading status during reload. There are no separate writing flags in the screens or detail panels. Successful saves use a snackbar rather than a notification signal on the page.

## Dialog workflows

`UserFormDialog` and `RoleFormDialog` adapt the nutrition-ui form-dialog pattern using Material Dialog and reactive forms. Each owns a scoped entity store for write status and errors and calls `create` or `update` directly. A successful write closes the dialog; a failure retains the draft and displays the error inside it. The list reloads its current URL selection after successful closure. Cancel does not send a write. Role codes remain immutable on edits.

Access and permission panels open in dialogs as well. `ConfirmDialog` is a reusable presentation component for confirmation. The existing API has no user/role delete endpoints, so Users confirms suspension and Roles confirms deactivation. Deactivation sends the existing full role-update payload, preserving name and description. Cancelling confirmation does not mutate data.

All data-entry controls use Reactive Forms. User access uses separate typed form groups for account linking and role assignment; the scope UUID control is disabled for GLOBAL scope and required otherwise. Role permissions use a FormRecord of boolean controls keyed by permission code, preserving drafts on rejected writes. Request status drives form availability without separate busy flags. Detail dialogs set Material Dialog's disableClose while saving, blocking Escape and backdrop closure, then restore normal closing when the request finishes.

Tables render server results directly; no additional local text filter is applied. Shared pure query parsers in the access-management util entry point normalize search, status, active and pagination consistently for filters and pages. A computed request query drives routed loading; changes to search reload the list and cancel the previous request through switchMap.
