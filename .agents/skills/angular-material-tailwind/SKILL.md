---
name: angular-material-tailwind
description: Build or update ERP interfaces that use Angular Material for interactive components and Tailwind CSS for layout, spacing, sizing, and responsive presentation. Use for pages, forms, tables, dialogs, navigation, and reusable UI in this workspace.
---

# Angular Material + Tailwind UI

Follow the workspace architecture and validation requirements in `AGENTS.md`. Inspect the target application's existing Material theme and Tailwind setup before editing; do not assume packages or configuration are present.

## Responsibilities

- Keep each application a thin runner shell: top-level providers and routes, a top taskbar with login/logout or account actions, a section sidebar, and a main `router-outlet`.
- Put domain workflows, feature state, and HTTP access in libraries. The shell composes and displays library-owned features; it does not implement their business behavior.
- Model sidebar sections as routes. Lazy-load standalone feature route arrays from scope-specific libraries with `loadChildren`, or a standalone entry component with `loadComponent`; do not add NgModules only to enable lazy loading.
- Keep shared UI, cross-application data access, and shared types in focused shared libraries with matching Nx type tags. Do not collect unrelated responsibilities in one shared project, and do not move domain-specific behavior into the shared scope.
- Use Angular Material for interactive controls and established UI patterns: buttons, form fields, tables, menus, dialogs, navigation, feedback, and overlays.
- Use Tailwind utilities for layout, grid, flexbox, gaps, spacing, sizing, alignment, responsive presentation, and small visual adjustments.
- Prefer templates composed from Material components and Tailwind utilities. Do not create a component stylesheet or add `styleUrl` unless the design cannot be expressed clearly through those systems.
- Keep Material theme generation, Tailwind imports, application-shell defaults, and unavoidable global overrides in global styles. Share theme definitions across the two applications when their design is the same.
- Customize Material through its public theming, tokens, inputs, and host classes. Never depend on private implementation selectors such as `.mat-mdc-*`.
- Use Tailwind responsive variants for visual changes. Use CDK `BreakpointObserver` only when viewport changes alter component behavior or application logic.
- Import only the standalone Angular Material components or modules required by the feature. Do not create a catch-all Material module.
- Preserve semantic HTML, keyboard behavior, focus management, labels, and accessible names. Prefer Material test harnesses when tests need to interact with Material components.

## Workflow

1. Identify the owning feature library and respect its Nx scope/type boundaries. Keep only shell composition in the application project.
2. Define or update the feature library's standalone routes, then connect the section to the runner's route and sidebar configuration through lazy loading.
3. Reuse an existing shared UI primitive before creating another one.
4. Choose the Material component that owns interaction and accessibility; use Tailwind only for its surrounding layout and presentation.
5. Keep domain state and HTTP access outside presentation-only components and out of the runner shell.
6. Add behavior tests for meaningful interactions and state. Do not test utility class strings as behavior.
7. Run workspace formatting, relevant Nx lint/typecheck/tests, and a production build when configuration or theme output changes.

This skill guides new UI work and refactoring in the current codebase. It does not introduce legacy layout libraries or prescribe migration work that the project does not need.
