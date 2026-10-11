# Administrative settings

Lazy feature mounted at `/administration/settings`. The shell requires `settings.manage` for
both the navigation entry and direct route access. The backend separately enforces
`settings.read` on reads and `settings.manage` on writes.

Enterprise details, accounting, the global negative-stock policy, and each document numbering
rule save independently through the existing settings API. PATCH requests contain only changed
fields and `expected_version`; clearing nullable fields sends null. Errors preserve form values.
Reloading reads current versions and discards unsaved changes. Identifier captions are fixed in
print templates, so the editor exposes only their numbers and omits caption fields from updates.

Cost accounting makes the negative-stock control unavailable. Enabling cost accounting requires
all saved negative-stock overrides to be false; scoped overrides are reported but are outside
this global-policy editor. Existing currency and default VAT references are preserved.

`SettingsApiService` owns stateless HTTP transport. `SettingsAdapterService` implements the
shared request adapter: it loads the complete `SettingsSnapshot`, computes changed fields and
versions, saves a section, and returns a snapshot with that section replaced. Updates do not
re-read or overwrite unrelated sections.

The component-scoped `SettingsStore` uses `withRequestData` for the snapshot, request state,
write errors, and cancellation. It serializes writes and prevents reloads during a save. The
page uses `UIStateContainerComponent` for loading, updating, retry, and error presentation;
containers only coordinate forms and preserve unsaved edits in other sections.
The backend remains responsible for policy validation, permissions, and structural restrictions.
