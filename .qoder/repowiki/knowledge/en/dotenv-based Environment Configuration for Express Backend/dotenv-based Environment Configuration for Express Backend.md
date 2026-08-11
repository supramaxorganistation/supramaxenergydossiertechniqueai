---
kind: configuration_system
name: dotenv-based Environment Configuration for Express Backend
category: configuration_system
scope:
    - '**'
source_files:
    - server/.env
    - server/server.js
    - server/package.json
    - apps/web/vite.config.ts
    - apps/mobile/app.json
---

## What system/approach is used

The repository uses a minimal, flat configuration approach centered on the `dotenv` package to load key-value pairs from a `.env` file into `process.env`. There is no centralized config module, schema validation, or layered configuration (e.g., no YAML/JSON config files, no feature-flag system). The server reads its runtime settings directly from `process.env` at startup.

## Key files and packages

- `server/.env` — the single source of truth for runtime secrets and service endpoints. It defines:
  - `PORT` (HTTP port)
  - `MONGO_URI` (MongoDB connection string)
  - `JWT_SECRET` (JWT signing secret)
  - `GEMINI_API_KEY` (Google Gemini AI API key)
- `server/server.js` — calls `dotenv.config()` at the top of the process, then reads values via `process.env.PORT`, `process.env.JWT_SECRET`, and `process.env.MONGO_URI`.
- `server/package.json` — declares the `dotenv` dependency (`"dotenv": "^16.4.1"`) and exposes `dev` / `start` scripts that run `node server.js`.
- `apps/web/vite.config.ts` — Vite configuration is empty aside from the React plugin; no `VITE_` prefixed env vars are referenced in any web source file, so the frontend currently has no build-time environment configuration.
- `apps/mobile/app.json` — Expo app metadata (name, slug, version, platform icons); this is static app metadata rather than runtime configuration.

## Architecture and conventions

- **Single-file env**: All server configuration lives in one `.env` file under `server/`. There are no per-environment files (e.g., `.env.development`, `.env.production`).
- **Direct `process.env` access**: Configuration values are consumed inline wherever needed — e.g., `const port = process.env.PORT || 5000;`, `const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';`, and `mongoose.connect(process.env.MONGO_URI)` — rather than being gathered into a typed config object.
- **Fallback defaults**: Every required value has a hardcoded fallback in code: default port `5000`, default JWT secret `'dev-secret-change-me'`, and an explicit comment in `.env` instructing to change `JWT_SECRET=change-this-secret-in-production`.
- **No validation**: There is no runtime check that required env vars are present before starting; missing values will surface as errors later (e.g., MongoDB connection failure).
- **No shared config layer**: The backend and frontend share no configuration mechanism. The frontend does not reference `process.env` or `import.meta.env`; it communicates with the backend via relative paths (`api.ts`, `erpApi.ts`) without an injected base URL.
- **No feature flags or toggles**: The application has no configuration-driven feature switches; behavior is controlled by code paths and role checks inside middleware.

## Conventions and constraints

- Secrets and service URIs must be placed in `server/.env` and loaded via `dotenv.config()` before use.
- Required keys observed in use: `PORT`, `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`.
- Hardcoded fallbacks exist for `PORT` (5000) and `JWT_SECRET` ('dev-secret-change-me'), meaning the server will start even if those keys are absent from `.env` — but production deployments should override them.
- The `.env` file is tracked in the repository (it contains a real MongoDB URI and Gemini API key), which violates standard secret-management practice; the `JWT_SECRET` line itself documents the intended replacement step.
- Frontend builds do not consume environment variables; there is no `VITE_*` configuration in `vite.config.ts` and no references to `import.meta.env` in `apps/web/src/`.
- Mobile app configuration is limited to Expo's `app.json` metadata and does not include runtime secrets.