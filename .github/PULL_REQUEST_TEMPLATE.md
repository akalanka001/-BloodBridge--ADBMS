## 📋 Pull Request Summary

### 1. Description of Changes
<!-- Provide a clear, detailed overview of what was implemented or modified. -->

### 2. Problems Identified and Resolved
- [ ] Dependency lockfiles: Generated and committed reproducible lockfiles (`frontend/package-lock.json`, `backend/package-lock.json`).
- [ ] Automated tests: Added unit, authorization, validation, and database integration suites.
- [ ] Migration runner: Added incremental migration support for already-initialized databases (`scripts/migrate.js`).
- [ ] Health checks: Added container healthcheck for `web` service in `compose.yaml`.
- [ ] CI/CD: Automated GitHub Actions pipelines for linting, testing, PostgreSQL integration, and GHCR publishing.

### 3. CI/CD Pipelines
- **CI Workflow (`.github/workflows/ci.yml`)**:
  - `frontend`: Node 22 LTS, `npm ci`, Vitest component tests, Vite production build.
  - `backend`: Node 22 LTS, `npm ci`, authentication and input validation tests (`npm run test:unit`).
  - `postgres-integration`: Isolated PostgreSQL 16 container, schema migrations (001, 002, 007, 010), object catalog verification (009), behavioral database assertions (`npm run test:db`).
  - `docker-integration`: Docker Compose stack build, health check wait, demo seed, automated smoke check (`scripts/smoke-check.js`).
- **CD Workflow (`.github/workflows/cd.yml`)**:
  - Automatically publishes backend and frontend images to GitHub Container Registry (GHCR) on `dev` push.
  - Pinned SHA and `dev` tags without embedded secrets.

### 4. Database Verification
- Stored procedures: `sp_approve_donation_camp` tested with authorized and unauthorized callers.
- User-defined functions: `fn_reserve_blood_unit` tested with atomic locking and double-allocation safeguards.
- Triggers: `trg_check_camp_registration` capacity limit and `trg_log_blood_unit_status` audit movements verified.
- ACID transactions: Rollback guarantees verified.
- New migration: `010_runtime_privileges.sql` applied.

### 5. Verification Checklist
- [ ] `npm run lint` passes with 0 syntax errors.
- [ ] `npm run test` passes (all backend and frontend tests).
- [ ] `npm run build` succeeds for frontend production bundle.
- [ ] `node scripts/smoke-check.js` passes against running Docker stack.
- [ ] No `.env`, credentials, or confidential secrets are committed.
- [ ] `npm run dev` remains the working one-command startup for local development.

### 6. Security Considerations
- All data fixtures are strictly synthetic.
- Role-based and organization-based access checks enforced on sensitive endpoints.
- `.env` remains git-ignored; `.env.example` contains only non-secret placeholders.

### 7. Recommended Repository Settings for Maintainers
- Protect the `dev` branch on GitHub:
  - Require pull request reviews before merging.
  - Require status checks to pass before merging:
    - `Frontend Validation`
    - `Backend Validation`
    - `PostgreSQL Integration & Stored Objects`
    - `Docker Stack & Smoke Verification`
  - Restrict direct pushes to `dev`.
