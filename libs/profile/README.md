# Own profile

Lazy self-service feature mounted at `/profile` and linked from the account menu. Every active
ERP user can edit their own first name, last name, display name, and email without administrative
permissions. The feature uses the auth library's identity API and session state.

`PATCH /identity/me` contains only changed profile fields; an empty field sends null. The
backend returns a user record, so auth merges the returned profile fields into the existing
session while retaining its identity and permission list. The account menu updates immediately.
Errors preserve entered values. Email changes edit the ERP contact address.

`ProfileAdapterService` owns loading and changed-field updates. `ProfileStore` uses the shared
`withRequestData` feature to serialize requests and expose one page state. `ProfileComponent`
owns the form and composes `UIStateContainerComponent` for progress, retry, and action errors.
