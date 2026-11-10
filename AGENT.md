# AGENTS.md

Guidance for AI coding agents working on this repository.

## Project

A time-tracking and employee-monitoring platform in the style of Hubstaff and TimoDesk. Teams track work hours against projects and tasks, review timesheets and reports, and (optionally, with consent) capture activity levels, app/URL usage, and screenshots.

Components:

1. **Web dashboard** (`apps/web`): Vite + React + Redux Toolkit/RTK Query
2. **API** (`apps/api`): NestJS
3. **Desktop agent** (`apps/agent`): Electron, tracks time and activity on the user's machine
4. **Browser extension** (`apps/extension`): Chrome/Firefox Manifest V3, reports the active tab URL
5. **Shared code** (`packages/shared`): types, DTOs, constants, validation schemas

## Tech stack

- Language: TypeScript everywhere (`strict: true`, no `any` without a comment explaining why)
- API: NestJS, PostgreSQL, Redis, BullMQ
- Web: Vite + React, Redux Toolkit + RTK Query, Tailwind CSS v4
- Desktop: Electron, SQLite (local offline queue), `active-win`, `uiohook-napi`
- Storage: S3-compatible object storage for screenshots
- Tooling: pnpm workspaces, Docker / docker-compose for local services

## Repository layout

```
apps/
  api/          NestJS backend
  web/          Next.js dashboard
  agent/        Electron desktop agent
  extension/    Browser extension
packages/
  shared/       Shared types, schemas, constants
docker-compose.yml
AGENTS.md
```

## Commands

```bash
pnpm install              # install all workspaces
docker compose up -d      # start Postgres, Redis, pgAdmin, MinIO (profile: storage)
# pgAdmin: http://localhost:5050 — admin@example.com / admin
# DB connection: host "postgres", port 5432, database "time_tracker", user "postgres" / "postgres"
pnpm dev                  # run API + dashboard together
pnpm --filter @crewclock/api dev      # run API only
pnpm --filter @crewclock/web dev      # run dashboard only
pnpm --filter agent dev   # run desktop agent
pnpm lint                 # lint all workspaces
pnpm typecheck            # type-check all workspaces
pnpm test                 # run all tests
```

Run `pnpm lint && pnpm typecheck && pnpm test` before considering a task done.

## Domain model (core tables)

`users`, `workspaces`, `members` (user + workspace + role), `projects`, `tasks`, `time_entries`, `activity_samples`, `screenshots`, `timesheets`, `invoices`.

Rules:

- **Every tenant-owned table has `workspace_id`**, and every query must be scoped by it. Never return data across workspaces.
- Roles: `owner`, `manager`, `member`. Members see only their own data unless a manager or owner grants more. Only members can create or modify time entries; owners and managers review time, timesheets, and reports. Members can update the status of tasks assigned to them; other task fields stay owner/manager-only.
- Workspace invitations are link-based: owners/managers create an invite (managers may only invite members), the raw token is returned once and stored as a SHA-256 hash with a 7-day expiry. Existing users accept after signing in with the invited email; new users accept in one step via `POST /auth/accept-invite` (sets a password and joins without creating their own workspace). There is no email delivery service yet; the UI exposes a copyable invite link.
- `time_entries` store `started_at` and `ended_at` as UTC timestamps. Never store elapsed seconds as the source of truth. Overlaps per user are rejected by a database exclusion constraint, and entries in submitted or approved `timesheets` weeks are locked from edits. Members (or a manager) can withdraw a submitted week back to draft; approved weeks are final.
- `activity_samples` are high-volume. Keep them compact (one row per interval, e.g. 1 to 10 minutes) and plan for monthly partitioning.
- Use UUIDs for primary keys. All entities extend `BaseEntity` (`id`, `created_at`, `updated_at`, `deleted_at`, `is_active`, `created_by`, `updated_by`, `deleted_by`). Audit fields are `UserEntity` relations backed by `created_by`-style columns; set the `*ById` properties from services.
- Soft-delete through `deleted_at`/`deleted_by` where history matters; do not hard-delete rows referenced by time entries.

## Conventions

### General

- Small, focused modules. Prefer clarity over cleverness.
- Entities use the global snake_case naming strategy. Do not hardcode column names unless a column intentionally diverges from its property name.
- Validate all external input (API bodies, agent payloads) with DTOs or shared schemas.
- No secrets in code. Use environment variables and keep `.env.example` current.
- Write migrations for every schema change. Never edit an applied migration.

### API (NestJS)

- One module per domain area (`auth`, `workspaces`, `projects`, `tasks`, `time-entries`, `timesheets`, `reports`, `activity`, `screenshots`).
- Each module folder is self-contained:

  ```
  modules/<area>/
    <area>.module.ts
    <area>.controller.ts
    <area>.service.ts
    entities/       TypeORM entities
    guards/         guards scoped to this module
    decorators/     metadata decorators used by this module
    mappers/        entity -> API response mapping
    types/          types internal to this module
    utils/          pure helpers used by this module
  ```

  Cross-cutting code that is not specific to one module lives in `src/common` (`decorators`, `pipes`, `guards`).
- Controllers are thin, services hold logic, repositories or the ORM handle data access.
- Use guards for authentication and role checks. Every endpoint is protected unless explicitly public.
- Heavy work (report generation, image processing, email) goes through BullMQ queues, not request handlers.
- Paginate all list endpoints.

### Web (Vite + React)

- Single-page app built with Vite, React, Redux Toolkit, and RTK Query.
- UI primitives are shadcn/ui components in `src/components/ui` (Tailwind v4 + Radix). Add more with `pnpm dlx shadcn@latest add <component>` from `apps/web`.
- Organize by feature, not by atomic-design taxonomy:
  - `src/app` — bootstrap, router, store
  - `src/api` — one `baseApi` plus feature endpoint slices
  - `src/components/ui` — shadcn primitives
  - `src/components/layout` — app shell, sidebar, mobile header, auth template
  - `src/components/shared` — cross-feature presentational components
  - `src/features/<domain>/components` — domain UI and panels
  - `src/pages` — thin route-level composition
- All server calls go through `apps/web/src/api`: `baseApi` owns the `baseQuery` (including 401 refresh/retry), and feature modules add endpoints with `baseApi.injectEndpoints`.
- Access tokens are kept in memory in Redux; refresh tokens are httpOnly cookies set by the API.
- Styling uses Tailwind utilities and shadcn variants. Avoid ad-hoc CSS files and atomic-design folder names.

### Desktop agent

- The agent must work **offline**: write to the local SQLite queue first, then sync in batches with retries and idempotency keys.
- Timestamps come from UTC and are sent with the sample interval, so the server can detect gaps or clock drift.
- Platform-specific code (permissions, active-window, screenshots) is isolated behind interfaces so Windows, macOS, and Linux can differ.
- Never block the main process. Capture and sync run in background workers.

### Browser extension

- Manifest V3 service worker, minimal permissions (`tabs`, `idle`, storage as needed).
- Sends only the active tab URL and title, and only while the user's timer is running.

## Privacy and consent (non-negotiable)

This product monitors people, so these rules apply to all changes:

- Monitoring only runs while the user has **explicitly started tracking**, and the agent always shows a visible tracking indicator.
- Users can see what was captured about them. Screenshots can be deleted or blurred according to workspace settings.
- Screenshot and activity retention is configurable per workspace, with a sensible default and automatic deletion after it.
- Screenshots are stored in private buckets and served only through short-lived signed URLs.
- Do not capture keystroke contents. Record **activity counts only** (keys pressed, mouse events), never what was typed.
- Do not add hidden or stealth tracking features.

## Security

- Hash passwords with argon2 or bcrypt. Use short-lived access tokens with refresh tokens.
- Agent authentication uses per-device tokens that can be revoked.
- Rate-limit auth and ingestion endpoints.
- Sanitize and validate everything the agent and extension send. Treat them as untrusted clients.

## Testing

- Unit tests for services and utilities. Integration tests for API endpoints against a real test database.
- Test time logic carefully: timezones, DST, entries crossing midnight, overlapping entries, and offline backfill.
- Add tests with every bug fix.

## Working agreements for agents

- Make the smallest change that solves the task. Do not refactor unrelated code.
- Ask before adding a new dependency, changing the database schema in a breaking way, or altering auth.
- Match existing patterns in the file and module you are editing.
- If requirements are ambiguous, state your assumption in the PR or summary instead of guessing silently.
- Update this file when conventions change.

## Build order (MVP roadmap)

1. Auth, workspaces, roles, projects, tasks
2. Manual and timer-based time entries, timesheets, basic reports
3. Desktop agent: timer, idle detection, offline sync
4. Activity levels and app/URL tracking, browser extension
5. Screenshots with consent and retention controls
6. Payroll, invoicing, integrations
