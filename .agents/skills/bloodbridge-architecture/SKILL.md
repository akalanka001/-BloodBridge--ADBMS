---
name: bloodbridge-architecture
description: Use for BloodBridge repository setup, Docker Compose, environment variables, design consistency, file organization, and integration decisions.
---

# BloodBridge architecture and developer environment

## First read
`AGENTS.md`, `README.md`, `compose.yaml`, root `package.json`, `frontend/vite.config.js`, `backend/src/server.js`, `docs/ARCHITECTURE.md`.

## Known structure (do not invent another)
- React/Vite JSX in `frontend/src`; Express ESM in `backend/src`; PostgreSQL migrations in `database/migrations`; warehouse DDL in `database/warehouse`.
- Docker services `db`, `api`, `web`. Host frontend `http://localhost:5173`, backend `http://localhost:4000`, DB host `localhost:5433`. Internal database host `db:5432`.
- Start all services from root: `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`) then `npm run dev`; equivalent `docker compose up --build`.
- Never commit `.env`, expose password/JWT to frontend, or reset Docker volumes to fix migrations without explicit permission (reset deletes data).

## Workflow
1. Inspect scripts, service healthchecks, mounted volumes and Vite proxy before making changes.
2. State whether change is runtime, module, data schema, API, design, or CI.
3. Reuse existing configs, paths and environment names rather than adding parallel frameworks or command runners.
4. Keep first-run initialization separate from incremental migrations: `database/init/00-bootstrap.sh` executes only on **new database volumes**.
5. Check `docker compose config`; if Docker available, `docker compose up --build` then health/API checks. For code: `docker compose exec -T api npm test`, `docker compose exec -T web npm run build` after services start.
6. Update README/setup instructions for changed commands, and report if live Docker checks couldn't run.

## Acceptance
- `npm run dev` remains the **single developer startup**; frontend API calls still go to `/api/v1/*`; three folders remain logically separate within one Git repository; instructions work on Windows PowerShell.
