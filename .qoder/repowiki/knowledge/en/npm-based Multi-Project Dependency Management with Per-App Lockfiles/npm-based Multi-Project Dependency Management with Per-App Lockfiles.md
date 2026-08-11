---
kind: dependency_management
name: npm-based Multi-Project Dependency Management with Per-App Lockfiles
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - apps/web/package.json
    - apps/web/package-lock.json
    - apps/mobile/package.json
    - apps/mobile/package-lock.json
    - server/package.json
    - server/package-lock.json
---

## What system/approach is used

This repository uses **npm** as the package manager for all JavaScript/TypeScript code. It follows a **multi-project (monorepo) layout** where each application and service maintains its own `package.json` and its own `package-lock.json`, rather than using a workspace tool like npm workspaces, pnpm, or Yarn. The root-level `package.json` only declares a single dependency (`mongodb`) and exists primarily to host a root `package-lock.json`; it does not orchestrate the subprojects.

There is no vendoring of third-party packages — every dependency is resolved from the public npm registry at install time via `node_modules` directories under each project folder (`apps/web/node_modules`, `apps/mobile/node_modules`, `server/node_modules`, plus a root `node_modules`).

## Key files and packages

- `package.json` (root): declares the top-level `mongodb` driver dependency; serves as a placeholder manifest paired with the root lockfile.
- `package-lock.json` (root): lockfile version 3, pins the exact transitive tree for the root `mongodb` dependency.
- `apps/web/package.json`: frontend React + Vite app; dependencies include `react`, `react-dom`, `recharts`; devDependencies include TypeScript (~6.0.2), Vite (^8.2.0), oxlint, and React type definitions.
- `apps/mobile/package.json`: Expo/React Native mobile app; pinned to `expo ~57.0.10`, `react-native 0.86.2`, `react 19.2.3`.
- `server/package.json`: Express backend; runtime dependencies include `express`, `mongoose`, `@google/generative-ai`, `bcryptjs`, `jsonwebtoken`, `multer`, `pdf-lib`, `puppeteer`, `cors`, `dotenv`, `@pdf-lib/fontkit`.
- Each project also ships its own `package-lock.json` that pins the full dependency graph for that project.

## Architecture and conventions

- **Per-app isolation**: Each subproject (`apps/web`, `apps/mobile`, `server`) has an independent dependency surface. There are no shared internal packages referenced between them; cross-cutting concerns (e.g., API clients) are implemented inline in source files (`apps/web/src/api.ts`, `erpApi.ts`) rather than extracted into a local package.
- **Versioning style**: Dependencies use caret (`^`) ranges for major-version flexibility (e.g., `express ^4.21.2`, `react ^19.2.8`, `mongoose ^8.9.0`), while some critical platform packages are pinned more tightly (e.g., `react-native 0.86.2`, `react 19.2.3`, `typescript ~6.0.x`). This balances upgradeability with stability for platform-specific code.
- **Lockfiles committed per project**: Every `package.json` is paired with a `package-lock.json` in the same directory, ensuring reproducible installs across environments.
- **No private registry configuration**: No `.npmrc`, `.yarnrc`, or `package.json` `publishConfig` fields were found; all packages resolve from the default public npm registry.
- **No build-time dependency transformation**: The server runs directly with `node server.js` (via `npm start`/`dev` scripts); there is no bundler for the backend. Only the web frontend uses a bundler (Vite).

## Conventions and constraints

- **One `package.json` per deployable unit**: Each independently runnable target (web app, mobile app, server) owns its own manifest and lockfile. The root manifest is minimal and not used as a workspace root.
- **Runtime vs. dev dependencies are separated**: Development-only tooling (TypeScript, Vite, oxlint, `@types/*`) lives in `devDependencies`; production runtime libraries live in `dependencies`.
- **Platform versions are pinned or narrowly ranged**: Mobile uses `react-native 0.86.2` (exact) and `expo ~57.0.10` (patch-range), reflecting the sensitivity of native toolchain compatibility.
- **No shared monorepo dependency hoisting**: Because npm workspaces are not configured, each project resolves its own `node_modules`, which can lead to duplicated transitive dependencies across projects but keeps builds isolated.
- **Environment variables drive external services**: The server reads secrets from `.env` (loaded via `dotenv`); this is how credentials for MongoDB, Google AI, etc., are supplied at runtime rather than baked into dependencies.