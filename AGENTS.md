<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Warehouse ERP project guidelines

## Workspace and scope

- Use npm and the local Nx CLI. Read resolved project metadata with `npx nx show project <name> --json`.
- `apps/warehouse-erp-ui` is the warehouse application and administration shell (port 4301).
- `libs/access-management` is a publishable Angular package that owns users, roles, permissions, and their navigation routes.
- `libs/auth` owns Auth0 integration, runtime auth configuration, the ERP profile, and permission guards.
- `libs/shared` owns cross-application components, types with their associated metadata, and pure utilities independent of the applications, domains, and Auth0. Keep those concerns in focused internal collection directories; do not create a separate shared Nx library solely to separate those folders unless explicitly requested.
- The backend is in the sibling `warehouse-erp` repository. Read its API contracts before changing frontend requests.
- Preserve existing uncommitted work. Keep UI text, code comments, and repository documentation in English.

## Architecture

- Keep applications as thin runner projects. They may bootstrap Angular, register application-wide providers, define top-level routes, render the application layout, and compose feature libraries; they must not own domain workflows, business rules, feature state, or HTTP implementations.
- Put business behavior in libraries. Scope-specific feature libraries own use-case orchestration and screens; data-access libraries own API clients and state; UI libraries own presentation; utility libraries own types and pure helpers.
- A typical application layout has a top taskbar with branding and login/logout or account actions, a left navigation area that links to the application's top-level sections, and a main `router-outlet` for feature content.
- Use the APX UI layout composition as the application-layout reference, adapted to current standalone Angular: keep the root component as a minimal `router-outlet`; place the route chrome in an `AppLayout` under `layouts`; keep `AppHeader` and `AppNavigation` as focused presentation components; and render application pages and feature routes through the layout's nested outlet. The layout may render public content without authenticated navigation. Do not copy APX UI's deprecated NgModules, `fxLayout`, constructor injection, or legacy state patterns.
- Treat navigation entries as configuration. Each section routes to a feature library instead of invoking domain behavior from the application layout.
- Lazy-load feature sections from libraries with standalone route arrays through `loadChildren`, or a standalone entry component through `loadComponent`. Keep only the application layout and the essential landing route eager; do not introduce NgModules solely for lazy loading.
- Keep shared code reusable across applications. Separate shared presentation components, cross-application data access, and cross-application types into focused libraries such as shared UI, shared data-access, and shared types/util projects. Access-management behavior belongs to `scope:access-management`; other domain behavior belongs to `scope:admin` or `scope:warehouse`, not `scope:shared`.
- Keep cross-library wire types and their shared display metadata in `@warehouse/shared`. Define each value set once (for example, `UserStatus` and `USER_STATUS_LABELS`) and reuse it from auth and feature packages instead of duplicating unions or label maps.
- Keep `@warehouse/shared` buildable because publishable libraries depend on its public API. Declare it as a package dependency or peer dependency instead of bypassing Nx buildable-library boundaries.
- Extract cohesive features as they grow; do not create empty layers or a library for every component.
- New libraries need one scope tag (`scope:admin`, `scope:access-management`, `scope:warehouse`, or `scope:shared`) and one type tag (`type:feature`, `type:ui`, `type:data-access`, or `type:util`).
- The ERP runner uses `scope:shell` to compose warehouse, access-management, and shared libraries. Domain library boundaries remain unchanged.
- Scope rules: admin can use access-management and shared libraries; access-management can use its own scope and shared libraries; warehouse can use warehouse and shared libraries; shared code can use only shared libraries.
- Type rules: apps/features can use feature, UI, data-access, and utility libraries; UI can use UI/util; data-access can use data-access/util; util can use only util.
- Libraries must never import applications. Do not introduce cross-application imports or circular dependencies.
- Use public library exports through `@warehouse/auth`, `@warehouse/shared`, and `@warehouse/access-management`; keep internal file imports within their own entry point.
- Keep reusable interfaces, type aliases, and enums in a dedicated `types` directory. Each `types` directory must expose an `index.ts` barrel; import from that barrel or from the library's public entry point, never from an individual type file across directory or library boundaries.
- In applications, keep injectable Angular services in `services`, reusable presentation components in `components`, application chrome in `layouts`, and route-level screens in `pages`. Each collection directory (`services`, `components`, `layouts`, or `pages`) must expose one `index.ts` barrel; import through that collection barrel instead of reaching into an implementation file. Domain feature libraries may continue to use `containers` for route-level components that coordinate feature workflows.
- Keep `ACCESS_MANAGEMENT_ROUTES` in the primary `@warehouse/access-management` entry point. It is routing configuration for the package, not a secondary library or `routes` entry point.
- The access-management package uses secondary entry points for `feature/users`, `feature/roles`, `data-access`, `ui`, and `util`. Do not expose implementation files directly.
- Keep shared utilities small and free of domain-specific workflows. Keep HTTP requests and state out of reusable presentation components.
- Use one application-level `ErrorPage` for authentication-required, forbidden, not-found, and service-unavailable states. Pass the status through route data for static routes or query parameters for guard redirects. Preserve the originally requested browser URL for errors by rendering the wildcard page in place or returning a `RedirectCommand` with `skipLocationChange`; do not silently redirect unknown URLs to the welcome page.
- Enforce dependencies with `@nx/enforce-module-boundaries`; do not add exemptions to hide architectural violations.

## Domain package blueprint

Use `libs/access-management` as the reference structure for a domain that may later be published and installed as one npm package. It is one Nx project and one npm package with Angular Package Format secondary entry points. Directories such as `feature/users` and `data-access` are package entry points, not independent Nx projects; do not add nested `project.json` files for them.

```text
libs/access-management/
├── package.json                         # npm package metadata and peer dependencies
├── ng-package.json                      # primary Angular package entry point
├── project.json                         # the single Nx project definition
├── src/
│   ├── index.ts                         # primary public API
│   └── lib/
│       └── access-management.routes.ts  # exported package route tree
├── feature/
│   ├── users/
│   │   ├── ng-package.json
│   │   └── src/
│   │       ├── index.ts                 # exports USER_ROUTES
│   │       └── lib/
│   │           ├── users.routes.ts
│   │           ├── components/
│   │           │   ├── index.ts
│   │           │   └── user-access/
│   │           │       ├── user-access.html
│   │           │       ├── user-access.spec.ts
│   │           │       └── user-access.ts
│   │           └── containers/
│   │               ├── index.ts
│   │               └── users/
│   │                   ├── users.html
│   │                   ├── users.spec.ts
│   │                   └── users.ts
│   └── roles/                           # follows the same shape as feature/users
├── data-access/
│   ├── ng-package.json
│   └── src/
│       ├── index.ts
│       └── lib/services/
│           ├── index.ts
│           └── access-management-api.service.ts
├── ui/
│   ├── ng-package.json
│   └── src/
│       ├── index.ts
│       └── lib/components/
│           ├── index.ts
│           └── status-badge/
│               ├── status-badge.html
│               └── status-badge.ts
└── util/
    ├── ng-package.json
    └── src/
        ├── index.ts
        └── lib/
            ├── config.ts
            └── types/
                ├── index.ts
                ├── user.ts
                ├── role.ts
                ├── permission.ts
                └── role-assignment.ts
```

### Layer responsibilities

- The primary entry point configures the domain package and exports its top-level route tree. `ACCESS_MANAGEMENT_ROUTES` belongs here; there is intentionally no `routes` secondary entry point.
- `feature/<name>` owns a user-facing use case and exposes its standalone route array. A feature may contain `containers`, feature-local `components`, and feature-local helpers.
- `containers` contains route-level components. Containers load data, coordinate state and mutations, compose components, and handle use-case flow. A container may import its feature-local components plus `data-access`, `ui`, and `util` entry points.
- `components` contains reusable or feature-local presentation building blocks. Components receive state through inputs and emit user intent through outputs when practical. They must not become alternate route entry points.
- `data-access/services` contains injectable API clients, repositories, and domain state services. HTTP wire formats must use the backend contract unchanged.
- `ui/components` contains domain-wide presentation components shared by multiple features. It must not own HTTP calls or feature workflows.
- `util/types` contains interfaces, type aliases, and enums. `util` may also contain injection tokens, configuration types, and pure helpers; it must not depend on Angular feature or data-access code.
- Put a type in a feature-local `types` directory only when it is genuinely private to that feature. Types shared by API clients or multiple features belong in the domain `util/types` entry point.

### Public APIs and barrel imports

- Every `components`, `containers`, `services`, `guards`, `providers`, and `types` directory must have an `index.ts` barrel.
- Place each component and container with its co-located template in its own named subdirectory (for example, `components/status-badge/status-badge.ts` and `status-badge.html`).
- Place barrels at collection boundaries only. Do not add an `index.ts` inside a directory that represents one component, container, service, guard, provider, or type; the parent collection barrel must export that item's implementation file directly (for example, `components/index.ts` exports `./app-header/app-header`).
- Imports crossing a directory boundary must target the closest barrel. For example, a users container imports `UserAccess` from `../components`, not `../components/user-access`.
- Imports crossing an entry-point boundary must use the package alias: `@warehouse/access-management/data-access`, `@warehouse/access-management/ui`, or `@warehouse/access-management/util`. Never reach into another entry point with a relative path.
- Application code normally imports only `@warehouse/access-management`. Secondary entry points are primarily package-internal boundaries and optional advanced public APIs.
- An entry point's `src/index.ts` is its only public API. Do not export tests, internal helpers, or implementation-only components accidentally.
- Use `import type` when a symbol is used only as a TypeScript type.

### Allowed dependency direction

```text
ERP application layout ──> access-management primary API
                       │
                       └──lazy──> feature/* ──> data-access ──> util
                                             ├──> ui ─────────> util
                                             └───────────────> util
```

- The application layout owns application-wide authentication providers, permission guards, global Material theming, and top-level chrome. It must not import a feature's implementation files.
- Features may depend on `data-access`, `ui`, and `util`.
- Data access may depend on `util`, but never on `feature` or `ui`.
- UI may depend on `util`, but never on `feature` or `data-access`.
- Util must not depend on the other domain layers.
- Keep authentication outside the access-management package. The runner application guards the package route before composing `ACCESS_MANAGEMENT_ROUTES`, keeping the domain package reusable.

When adding another publishable domain package, start with only the layers it needs, preserve this dependency direction, and use its domain name instead of copying `access-management` names literally. Do not create empty directories solely to mirror the example.

## Authentication and API contracts

- Auth0 proves identity; the ERP backend owns account status, roles, permissions, and scope checks.
- Use the shared auth providers and guard. Do not introduce authentication bypasses or persist tokens in localStorage.
- Keep public build-time application settings in each app's `src/environments/environment.ts`, with environment-specific files selected through the app's Nx `fileReplacements`. Do not add runtime `config.json` loading unless deployment explicitly requires one build artifact to be configured after compilation.
- Auth0 SPA `domain`, `clientId`, `audience`, and public API URL may live in environment files; never place client secrets, tokens, or other credentials there. Derive callback and logout URLs from `window.location.origin` in the auth provider rather than hard-coding application ports.
- Preserve the configured API allowlist for access tokens.
- Preserve API field names and enum values. Do not translate wire-format keys.
- Account creation creates a local ERP user, not an Auth0 account or an invitation email.
- Preserve immutable role codes and explicit Auth0 subject linking.
- Preserve form values on failed writes and show meaningful loading, empty, and error states.

## Validation and code style

- Follow the existing ESLint rules from `nutrition-ui`, including explicit return types, type-only imports, import sorting, and accessible Angular templates.
- Name application and library configuration files with the `.config.ts` suffix so they are distinct from components and runtime services (for example, `admin-navigation.config.ts`). Keep Angular's conventional `app.config.ts` bootstrap filename.
- Name injectable Angular service files with the `.service.ts` suffix and their classes with the `Service` suffix (for example, `access-management-api.service.ts` exports `AccessManagementApiService`).
- Keep backend transport in stateless API services. Authentication orchestration must call `IdentityApiService` for session-scoped `/identity/*` requests instead of injecting `HttpClient` directly; access-management administration endpoints remain in its data-access layer.
- Order class members as follows: injected fields (`inject()`), inputs, outputs, private fields, protected fields, public fields, constructor, getters/setters, Angular lifecycle hooks, public methods, protected methods, and private methods. Keep lifecycle hooks in Angular invocation order: `ngOnChanges`, `ngOnInit`, `ngDoCheck`, `ngAfterContentInit`, `ngAfterContentChecked`, `ngAfterViewInit`, `ngAfterViewChecked`, `ngOnDestroy`. The local `warehouse/class-member-order` ESLint rule enforces this convention.
- Order Angular template attributes by category: template references (`#ref`), structural directives, static attributes and attribute directives, property bindings (`[]`), two-way bindings (`[()]`), then event bindings (`()`). Preserve author order inside each category. Angular ESLint applies this ordering before `html-beautify` aligns wrapped attributes.
- Always place Angular component templates in a co-located `.html` file and reference them with a relative `templateUrl`. Inline `template` declarations are forbidden even for one-line components; `@angular-eslint/component-max-inline-declarations` enforces a template limit of zero lines.
- Inline CSS is forbidden: do not use HTML `style` attributes, Angular `[style]` bindings, `[ngStyle]`, `<style>` elements, or component metadata `styles`. Express visual states with CSS classes and Tailwind utilities. When CSS cannot be expressed clearly that way, create a co-located `.scss` file and reference it with `styleUrl`.
- Angular 21 components, directives, and pipes are standalone by default. Do not write redundant `standalone: true` metadata; specify `standalone: false` only when deliberately declaring an artifact in an NgModule.
- Prettier formats code; js-beautify formats external HTML. Use `npm run format`, not Prettier on HTML files.
- Run `npm run check` for formatting, lint, and type checks. Run relevant Nx tests and builds for behavior changes.
- After shared-library changes, validate affected consumers. `npm test` and `npm run build` cover the application and libraries.
- Add meaningful behavior tests for new behavior; do not add tests solely for text or formatting edits.
- Use mocked HTTP in frontend unit tests. Do not modify the application database for testing.
- Keep Angular's cache disabled unless a separate change explicitly validates enabling it. For file-watcher limits, use `--poll=1000`.

## UI system

- Use Angular Material for interactive components and established patterns such as forms, buttons, tables, dialogs, menus, navigation, feedback, and overlays.
- Use Tailwind CSS for layout, flexbox, grid, spacing, sizing, alignment, responsive presentation, and small visual adjustments.
- Prefer templates built from Material components and Tailwind utilities. Do not create component `.scss` files or add `styleUrl` unless the design cannot be expressed clearly with those systems.
- Compose route screens with `Page` from `@warehouse/shared`. Use its `pageBreadcrumb`, `pageBack`, `pageTitle`, `pageActions`, and `pageBody` projection slots instead of duplicating page-header structure. Use `ErrorState` and its `errorEyebrow`, `errorTitle`, `errorDescription`, and `errorActions` slots for application error screens.
- Keep Material theme generation, Tailwind imports, application-layout defaults, and unavoidable global overrides in global styles. Share theme definitions between applications when their design is the same.
- Customize Material only through public theming APIs, design tokens, component inputs, and host classes. Never depend on private implementation selectors such as `.mat-mdc-*`.
- Use Tailwind responsive variants for visual changes. Use CDK `BreakpointObserver` only when a breakpoint changes component behavior or application logic.
- Import only the standalone Material components or modules required by a feature. Do not create a catch-all Material module.
- Preserve semantic HTML, keyboard navigation, focus management, labels, and accessible names. Prefer Material test harnesses for component interaction tests.

## Agent tooling

- Official Nx skills are in `.agents/skills`; Claude Code receives them through the configured Nx plugin.
- Keep custom project guidance outside the generated Nx marker block so updates preserve it.
- MCP configuration is available in `.codex/config.toml`, `.cursor/mcp.json`, and the Claude Nx plugin settings.
- If MCP tools are unavailable in the current session, use the installed Nx CLI and official documentation; do not claim a configured server is already connected.
- CI monitoring skills require an actual configured CI/Nx Cloud workflow. Do not initiate monitoring or configure Nx Cloud unless requested.
