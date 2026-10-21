---
name: bloodbridge-express-api
description: Use for building or editing Express.js REST endpoints, input validation, role/organization authorization, integration of PostgreSQL objects, and OpenAPI documentation.
---

# Express API implementation contract

## First read
`backend/src/server.js`, `backend/src/db.js`, `backend/src/middleware/auth.js`, `backend/src/routes/*.js`, `docs/API_IMPLEMENTED.md`, `docs/openapi-starter.yaml`. `docs/PLANNED_OPENAPI.yaml` is *only a roadmap*.

## Architecture and conventions
- JavaScript ESM, Express, Zod validation, `pg` parameterized SQL, JWT and bcryptjs. Preserve runtime and module style; TypeScript and ORMs are not currently used.
- Routes are under `/api/v1/`; Vite frontend calls relative `/api/v1/*`.
- Role names in schema: `ADMIN`, `DONOR`, `HOSPITAL_STAFF`, `BANK_STAFF`. Every staff operation must also check active `staff_memberships` association to the *specific* hospital/blood bank.
- Use `pool.query` for isolated statements and `inTransaction(async client => client.query(...))` for multi-step mutations. Use the same transaction client for every statement.

## Workflow
1. Compare endpoint with `docs/API_IMPLEMENTED.md`. If existing, extend without breaking response envelope `{ data: ... }` and documented errors.
2. Agree request/response schemas, status codes, roles, institution scope, pagination and indexes before implementation.
3. Validate params/body/query via Zod; use prepared/parameterized SQL, never interpolate user input in SQL text.
4. Delegate stock/camp authorization and integrity to the existing DB function/procedure where applicable, **also** enforce gateway authorization.
5. No JWT or SQL exception detail in client error; use generic 401, 403, 404, 409; log securely without clinical/personal payloads.
6. Test success, input error, unauthorized user, cross-organization user, duplicate conflict, and rollback. Add/update only **implemented** contracts in `docs/API_IMPLEMENTED.md` and `docs/openapi-starter.yaml`.

## Acceptance
Endpoint has working example HTTP request/response, schema validation, role/organization restriction, database tests, and docs. UI can consume it through the existing Vite proxy.
