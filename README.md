# Warehouse ERP frontend

An Nx workspace with two thin Angular applications, shared authentication, and a publishable access-management package.

```text
apps/warehouse-erp-ui    — original application, port 4300
apps/warehouse-admin-ui  — administration runner application, port 4301
libs/access-management   — publishable users, roles, and permissions package
libs/auth                — Auth0, configuration, HTTP interceptor, ERP profile, and route guard
libs/shared              — shared utilities, imported through @warehouse/shared
```

The existing login, signup, and profile screen is preserved in `warehouse-erp-ui`.
The admin application layout composes `@warehouse/access-management`; its domain behavior stays in that package. The backend lives in the
sibling `warehouse-erp` repository and requires no changes for this migration.

## Getting started

Tested with Node.js 24.13 and npm 11.6.2.

```bash
npm ci
npm start              # http://localhost:4300
npm run start:admin    # http://localhost:4301
npm run build          # production builds of both applications
npm test               # Vitest: original application, auth, and administrative operations
npm run graph          # Nx project graph
```

You can also use `npx nx build warehouse-admin-ui`, `npx nx test warehouse-admin-ui`, `npx nx serve warehouse-erp-ui`,
and `npx nx affected -t build,test --base=<your-base-ref>`.
Build output is written to `dist/apps/<application>/browser`.
Nx caches builds and tests and tracks changes to the shared auth library.
Angular's cache remains disabled, as in the original project.
If your environment limits the number of file watchers (`EMFILE`), run
`npm run start:admin -- --poll=1000` (the same option works with `npm start`).

## Auth0 and API

Each application owns build-time settings in `src/environments/environment.ts` and uses
`environment.development.ts` through the Nx build target's `fileReplacements`. Changes require a rebuild.
These files contain public SPA settings, not secrets:

- `domain`, `clientId`, `audience` — Auth0 values; the original application's settings are preserved.
- `apiUrl` — defaults to `/api`; an absolute API URL can also be used.

The shared import is `@warehouse/auth`. `provideWarehouseAuth(config)` configures Auth0 and
HTTP client providers. `WarehouseAuthService` provides login, signup, logout, and the ERP profile.
`permissionGuard` checks account status and permissions through `GET /api/identity/me`.
The access token is attached only to requests under the configured `apiUrl`.
The application does not store tokens in localStorage.

In your Auth0 SPA application settings, add **both** origins to all three lists:

- Allowed Callback URLs: `http://localhost:4300`, `http://localhost:4301`.
- Allowed Logout URLs: `http://localhost:4300`, `http://localhost:4301`.
- Allowed Web Origins: `http://localhost:4300`, `http://localhost:4301`.

The audience must match the backend's `AUTH0_AUDIENCE` (`https://api.warehouse-erp`).
If you use separate Auth0 SPA clients, set the appropriate `clientId` in each application's
configuration. This migration does not change settings in the external Auth0 tenant.

The development proxy forwards `/api` to `http://127.0.0.1:8100`, the backend's default port.
If the backend runs on a different port, update `proxy.conf.json`.
When calling an absolute `apiUrl` directly, add the frontend origin to the backend's
`APP_CORS_ORIGINS`.
In production, configure a reverse proxy for `/api` and serve the SPA's `index.html` for client-side routes.
The Angular development proxy is not included in production builds.

## Administration

Access requires an active ERP account with the global `users.manage` permission.
A new Auth0 account does not automatically become an administrator.
After running the backend migrations, create the first administrator using its bootstrap command:

```bash
python -m warehouse_erp.identity.bootstrap_admin \
  --auth0-sub 'auth0|USER_ID' \
  --email admin@example.com \
  --display-name 'ERP administrator'
```

Run this command in the backend environment with its database settings. For details, see
`warehouse-erp/src/warehouse_erp/identity/README.md`.

Available operations:

- Users: paginated listing with status filters, search within the current page,
  creation, editing, activation, and suspension.
- User access: explicit linking to an exact Auth0 subject; assigning and revoking roles
  with GLOBAL, COMPANY, or WAREHOUSE scope. Scoped assignments require the scope's UUID.
- Roles: listing, creation, editing names and descriptions, and deactivation.
  Existing role codes are immutable.
- Permissions: listing permissions registered in the backend and replacing a role's permission set.
  The API does not support creating arbitrary permission codes.

Creating a user creates a local ERP record; it does not send an email or create an Auth0 account.
Account linking is explicit, with no automatic email matching.
The server remains the source of truth for account status, permissions, and scopes. `/identity/me`
returns a flat list of permission codes; the server performs the actual scope checks.
The interface displays 401/403/409/422 errors and API availability failures. Form values are
preserved when saving fails.

## Validation

Tests use HttpTestingController and do not modify the application database. Access-management tests cover
access restrictions, user creation, save failures, filtering, immutable role codes,
role assignment and revocation, and permission replacement.
Full integration testing requires a running backend, configured Auth0 callbacks, and
an administrator account. There is no automatic authentication bypass.

An npm override pins `smol-toml` to the patched `^1.9.0` release range to address a
vulnerability in this transitive Nx dependency (GHSA-7w5x-hrqm-74c2).

## ESLint and formatting

Rules are carried over from `nutrition-ui`: Angular ESLint (including templates and accessibility),
TypeScript recommended/stylistic rules, explicit return types, type-only imports, and
simple-import-sort. Component selectors use the `app` prefix.

Prettier settings: `printWidth: 180`, `singleQuote: true`, `arrowParens: avoid`.
External HTML templates are formatted with `js-beautify`: Angular templating, a line width of 180,
and `force-aligned` attribute wrapping. Prettier skips HTML files.
The commands cover both applications and all libraries; Nx tracks the ESLint configuration.

```bash
npm run lint          # ESLint for all four projects
npm run lint:fix      # automatically fix supported ESLint violations
npm run format        # Prettier + js-beautify
npm run format:check  # check formatting without modifying files
npm run typecheck    # type-check applications, tests, and libraries
npm run check        # formatting + ESLint + type checks
```

`@warehouse/shared` exports `apiError`, a shared utility that converts HTTP/FastAPI errors
into interface messages. The library does not depend on the applications or Auth0.

## Architecture boundaries and AI agents

ESLint enforces project dependencies using Nx scope and type tags:

- The admin application may use access-management and shared libraries; the access-management package may use only its own scope and shared libraries.
- The warehouse application uses warehouse and shared libraries.
- `auth` is shared data-access code and may depend on `shared` utilities.
- `shared` cannot import `auth` or application code.
- Libraries cannot import applications; cycles and cross-project relative imports are rejected.
- Access-management exposes one npm package with secondary feature, data-access, UI, and util entry points. Its route constant is exported from the primary entry point.
- Future feature/UI/data-access/util libraries follow the rules in `AGENTS.md` and `eslint.config.mjs`.

`AGENTS.md` combines the official Nx guidelines with project-specific architecture and validation rules.
`CLAUDE.md` also points to those project rules. Official Nx skills are installed in `.agents/skills`
for Codex and Cursor; Claude Code uses the `nx@nx-claude-plugins` plugin configured in `.claude/settings.json`.
Codex and Cursor have project-local Nx MCP configurations in `.codex/config.toml` and `.cursor/mcp.json`.

Open or reload this repository in your agent client to discover the configuration and skills.
Claude Code needs to load its configured plugin marketplace. Cursor can use the project MCP configuration
without the Cursor CLI or Nx Console extension; enable the server in the editor if it requests approval.
The setup does not connect this repository to Nx Cloud or start CI monitoring.

To update the official artifacts and inspect their status:

```bash
npx nx configure-ai-agents --agents codex claude cursor --no-interactive
npx nx configure-ai-agents --check=all
```

The full check also reports agents you have not configured. Cursor detection in Nx relies on the
Cursor CLI/Nx Console and may not recognize a manually configured `.cursor/mcp.json`.
Nx 23.2.1 also has a Codex status-detection limitation: its checker looks for the literal
`[mcp_servers."nx-mcp"]` header, while its generator can emit the equivalent valid TOML
`[mcp_servers.nx-mcp]`. This can produce an "update available" message even when the
configuration matches the generator. Inspect the parsed MCP entry and actual server startup
rather than changing working configuration solely to silence this warning.
Keep custom project rules outside the generated Nx marker blocks.
