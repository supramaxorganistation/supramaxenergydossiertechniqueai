---
kind: build_system
name: Per-App npm Scripts Build System (Vite + Express + Expo)
category: build_system
scope:
    - '**'
source_files:
    - apps/web/package.json
    - apps/web/vite.config.ts
    - apps/web/tsconfig.app.json
    - apps/web/tsconfig.node.json
    - server/package.json
    - apps/mobile/package.json
    - .env
---

## What system/approach is used

This repository is a monorepo with three independent applications, each built and published via its own `package.json` scripts. There is no top-level orchestrator (no root `build` script, no Makefile, no Dockerfile, no CI/CD pipeline). Each app manages its own dependencies, TypeScript configuration, and build tooling:

- **Web frontend** (`apps/web/`): Vite + TypeScript (`vite build`, `tsc -b`).
- **Backend server** (`server/`): Plain Node.js Express app run directly with `node server.js`.
- **Mobile app** (`apps/mobile/`): Expo/React Native project driven by `expo start` / `expo start --android` / `expo start --ios`.

The root `package.json` only declares a single dependency (`mongodb`) and has no scripts — it does not orchestrate the sub-apps.

## Key files and packages

- `apps/web/package.json` — defines `dev`, `build`, `lint`, `preview` scripts; uses Vite 8, TypeScript ~6.0.2, oxlint for linting, React 19.
- `apps/web/vite.config.ts` — Vite configuration for the web build.
- `apps/web/tsconfig.app.json`, `apps/web/tsconfig.node.json`, `apps/web/tsconfig.json` — split TS configs for app and node build targets.
- `server/package.json` — defines `dev` and `start` both running `node server.js`; runtime deps include Express, Mongoose, Puppeteer, pdf-lib, multer, bcryptjs, jsonwebtoken, @google/generative-ai.
- `apps/mobile/package.json` — Expo SDK ~57 with React Native 0.86; scripts are `start`, `android`, `ios`, `web`.
- `.env` at repo root — shared environment file consumed by the server (loaded via `dotenv` in `server/server.js`).
- `server/.env` — per-server environment overrides.

## Architecture and conventions

- **No monorepo build tool**: The repo does not use Lerna, Nx, Turborepo, or a root `npm run build`. Each application is built independently from its own directory.
- **Dev vs production parity**: For the server, `dev` and `start` are identical (`node server.js`); there is no separate compilation step — JS is executed directly.
- **TypeScript compilation**: Only the web app compiles TypeScript before bundling (`tsc -b && vite build`); the server runs uncompiled JS source.
- **Linting**: Web-only linting via `oxlint` (`npm run lint`); no lint step for server or mobile.
- **Environment variables**: Loaded through `dotenv` in the server; the root `.env` file is present but the server also ships its own `.env`.
- **Artifacts**: Web builds output to `apps/web/dist/` (present in tree); server produces PDFs into `server/uploads/` at runtime; mobile artifacts are produced by Expo on the developer machine.

## Conventions and constraints

- **Each app owns its own dependency graph**: `apps/web/node_modules`, `server/node_modules`, and `apps/mobile/node_modules` are kept separate; there is no shared `node_modules` at the root beyond the minimal mongodb entry.
- **Versioning is per-package**: Each `package.json` carries an independent `version` field (`web: 0.0.0`, `server: 1.0.0`, `mobile: 1.0.0`); there is no synchronized versioning strategy across apps.
- **Module type**: Both `web` and `server` declare `"type": "module"`, enforcing ESM syntax throughout their codebases.
- **No containerization or CI**: No `Dockerfile`, `docker-compose.yml`, GitHub Actions, or other CI/CD configuration was found in the repository. Deployment steps are not codified here.
- **No cross-compilation or platform-specific build scripts**: Mobile builds rely on Expo's host-based toolchain (`expo start --android` / `--ios`); no shell scripts or Makefiles exist to automate this.
- **Build reproducibility**: Lockfiles (`package-lock.json`) exist per package, pinning exact dependency versions for reproducible installs.