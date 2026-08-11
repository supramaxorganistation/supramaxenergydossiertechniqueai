---
kind: error_handling
name: Express Route-Level try/catch with Centralized JSON Error Responses and Frontend ApiError
category: error_handling
scope:
    - '**'
source_files:
    - server/server.js
    - server/erpRoutes.js
    - apps/web/src/api.ts
    - apps/web/src/erpApi.ts
---

## Overview

This repository implements a straightforward, route-level error handling pattern across an Express.js backend (`server/`) and a React frontend (`apps/web/src`). There is no centralized error middleware, no custom error class hierarchy on the server, and no `throw`/`catch` propagation between layers — each route handler wraps its body in a local `try/catch` and responds directly.

## Backend (Express)

### Pattern: per-route `try/catch` returning `{ message }` JSON

Every route in `server/server.js` and `server/erpRoutes.js` follows the same shape:

```js
app.post('/auth/register', async (req, res) => {
  try { ... }
  catch (error) { res.status(500).json({ message: error.message }); }
});
```

- Validation failures return early with explicit HTTP status codes and a human-readable string in `{ message }`: e.g. `400` for missing fields, `401` for missing/invalid bearer token, `403` for insufficient role or ownership checks, `404` for not-found resources, `409` for duplicate users, `201` for created resources.
- Business logic errors are surfaced via the scanned-data contract from `services/aiScanner.js`, which returns `{ success, error }`; routes check `scannedData.success` and respond with `400` + the error string.
- Unhandled exceptions inside a route bubble into the route's own `catch` block and become `500 { message }` responses. There is **no global Express error-handling middleware** (`app.use((err, req, res, next) => ...)`) — uncaught rejections outside a route handler would crash the process.
- Database connection failure is handled at startup: `mongoose.connect(...).catch(error => { console.error('MongoDB connection error:', error.message); process.exit(1); })` — the server exits rather than serving requests.
- File-system operations use synchronous calls (`fs.existsSync`, `fs.unlinkSync`, `fs.readFileSync`) without explicit error handling; failures would throw into the enclosing route `catch`.

### Middleware errors

Authentication and authorization are implemented as inline middleware functions in `server/server.js`:

- `authMiddleware`: rejects missing/invalid JWT tokens with `401 { message: 'Missing bearer token' | 'Invalid token' }`.
- `authorizeRoles(...)`: rejects missing `req.user` with `401` and unauthorized roles with `403 { message: 'Forbidden: insufficient permissions' }`.

These do not call `next(err)`; they short-circuit by calling `res.json(...)` directly.

### No server-side error types

There is no `errors/` directory, no custom `AppError` class, no error code constants, and no `throw new Error(...)` used to propagate errors up the stack. Errors are converted to HTTP responses at the boundary of each route.

## Frontend (React / Vite)

### Centralized fetch wrapper with typed `ApiError`

`apps/web/src/api.ts` defines a single `request<T>()` helper that:

- Attaches `Authorization: Bearer <token>` headers automatically.
- On non-`response.ok`, attempts to parse `{ message }` from the response body and throws a custom `ApiError extends Error` carrying both `message` and `status`.
- Returns parsed JSON otherwise; `204` responses resolve to `undefined`.

A parallel `requestBlob()` helper handles binary downloads (e.g. PDF export) with the same error behavior.

The ERP module has its own `apps/web/src/erpApi.ts` with a nearly identical `erpRequest<T>()` helper that throws a plain `Error` (not `ApiError`) on non-OK responses.

### Page-level error handling

Pages in `apps/web/src/pages/` wrap API calls in `try/catch` blocks and handle errors ad hoc:

- `alert(err.message)` for user-facing errors (e.g. creating accounts, attendance).
- `console.error(e)` for silent logging (e.g. loading products, employees).
- Some catches swallow errors entirely with empty `catch {}` blocks (e.g. seeding accounts if empty).

There is no global error boundary component, no toast/notification system, and no centralized error display — error presentation is scattered across individual page handlers.

## Conventions Observed

| Area | Convention | Evidence |
|---|---|---|
| Server validation | Return `400 { message }` for malformed input | Multiple routes check required fields and return `400` |
| Auth failures | Return `401 { message }` for missing/invalid tokens | `authMiddleware` |
| Authorization failures | Return `403 { message }` for wrong role or ownership | `authorizeRoles`, per-resource owner checks |
| Not found | Return `404 { message }` when resource lookup fails | Every CRUD route checks `if (!resource)` |
| Duplicate keys | Return `409 { message }` for unique constraint violations | `/auth/register` checks existing email |
| Unexpected errors | Return `500 { message }` from route `catch` | Universal `catch (error) { res.status(500).json({ message: error.message }) }` |
| Frontend network errors | Throw `ApiError` with `status` and `message` | `api.ts` `request()` |
| Frontend ERP errors | Throw plain `Error` with message | `erpApi.ts` `erpRequest()` |
| Startup failures | Log and `process.exit(1)` | MongoDB connect `.catch()` |

## Constraints & Gaps

- **No global error middleware**: A thrown error escaping a route handler (e.g. from a third-party library) will crash the Node process instead of being turned into a `500` response.
- **No structured error objects**: The server only sends `{ message }`; callers have no machine-readable error code beyond the HTTP status.
- **Inconsistent frontend error classes**: `api.ts` uses `ApiError` while `erpApi.ts` uses plain `Error`, so consumers cannot uniformly distinguish network vs business errors.
- **No retry/backoff**: Failed fetches are not retried.
- **No request tracing/correlation IDs**: Errors contain no request ID for log correlation.
- **Silent catches**: Several `catch {}` blocks swallow errors without logging, making debugging harder.