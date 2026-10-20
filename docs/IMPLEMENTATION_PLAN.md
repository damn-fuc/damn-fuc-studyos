# StudyOS Implementation Plan

> **Execution record:** Completed implementation items are checked below. External Supabase and GitHub Pages setup remains owner-operated and is documented separately.

**Goal:** Build a responsive, single-user learning and research workspace backed by Supabase and deployable to GitHub Pages.

**Architecture:** A strict TypeScript React SPA is hosted as static files on GitHub Pages. HashRouter owns client navigation; Supabase Auth and PostgreSQL RLS own identity and persistence; feature modules expose real reads and writes through TanStack Query.

**Tech Stack:** React, TypeScript strict, Vite, Tailwind CSS, shadcn/ui, lucide-react, ECharts, React Router, TanStack Query, React Hook Form, Zod, Supabase, Vitest, Playwright, GitHub Actions.

**Spec:** `docs/PRD.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`

## Global Constraints

- Website contains no public sign-up flow; account creation and invitation are Dashboard-only.
- Browser configuration uses Supabase URL and Publishable Key only; never bundle a Secret/Service Role Key.
- Every business table has user ownership and separate authenticated SELECT / INSERT / UPDATE / DELETE RLS policies.
- Activity dates use user-local `date`; default timezone is `Asia/Shanghai`; duration is never negative.
- Learning duration comes only from activity logs. Task state changes do not create logs or change dates.
- No mock records may reach production analytics or dashboard totals.
- Mobile layout must work at 360px, 390px and 430px without horizontal overflow.
- Keep existing files outside the new `studyos/` app directory untouched.

## Review Focus

- Supabase recovery links arrive with a PKCE query parameter while the app uses HashRouter; test recovery navigation and successful password update.
- Crossing local midnight or a daylight-saving timezone boundary must not shift a selected `date` record; test pure date/stat functions.
- A task linked to a milestone from a different project or user must fail database constraints; test composite foreign keys and RLS.
- Failed network writes and rapid repeated submit must not clear input or create duplicate records; test disabled submit and error result.
- Empty database and absent environment variables must display honest empty/configuration states; test no sample values appear in analytics.

---

## Phase 1 — Project foundation and responsive UI

### Task 1: Scaffold the app and design system

**Files:** `package.json`, lockfile, `index.html`, `vite.config.ts`, `tsconfig*.json`, `components.json`, `src/main.tsx`, `src/styles/*`, `src/components/ui/*`, `.gitignore`, `.env.example`

- [x] Create Vite React TypeScript project in the isolated `studyos/` directory.
- [x] Configure strict TypeScript, `/studyos/` base path, Tailwind Vite plugin, aliases and shadcn/ui.
- [x] Install the requested runtime and test libraries; pin reproducible versions through `package-lock.json`.
- [x] Add loading, empty, error, success, unconfigured, focus and reduced-motion tokens/components.
- [x] Add `.env.example` with public URL/key variable names and ignore local env files.
- [x] Run `npm run typecheck`, `npm run test:run`, and `npm run build`; all pass.

### Task 2: Build the navigable responsive shell

**Files:** `src/app/*`, `src/layouts/*`, `src/components/*`, `src/pages/*`, `src/features/dashboard/*`, `tests/e2e/*`

- [x] Add HashRouter, application error boundary, TanStack Query provider and theme provider.
- [x] Build desktop fixed sidebar/top toolbar and mobile top header/five-item bottom navigation with safe-area padding.
- [x] Implement working navigation to all requested sections; display true empty states until data services exist.
- [x] Add responsive login, dashboard, task, log, project, analytics, review and settings page shells with clear next actions.
- [x] Run `npm run typecheck`, `npm run test:run`, and `npm run build`; record unimplemented cloud actions in the phase notes.

## Phase 2 — Supabase authentication, schema and RLS

### Task 3: Create the schema and policies

**Files:** `supabase/config.toml`, `supabase/migrations/*_studyos_schema.sql`, `src/types/database.ts`, `docs/ARCHITECTURE.md`

- [x] Create the seven business tables, constraints, indexes, update trigger, composite foreign keys and per-operation authenticated policies.
- [x] Revoke business table access from `anon`; grant the required operations to `authenticated`.
- [x] Ensure dates are `date`, timestamps are `timestamptz`, `duration_minutes >= 0`, and week starts are Mondays.
- [x] Generate/check TypeScript database definitions against the migration.
- [x] Run SQL checks in local Supabase if available; otherwise inspect migration and record the unverified Dashboard step accurately.

### Task 4: Implement auth and safe routing

**Files:** `.env.example`, `src/lib/supabase.ts`, `src/features/auth/*`, `src/app/router.tsx`, `src/pages/LoginPage.tsx`, `src/pages/ResetPasswordPage.tsx`, `tests/*auth*`

- [x] Create typed client only when public environment variables exist; show setup help otherwise.
- [x] Implement email/password sign-in, persistent session, sign-out, protected routes and cache clearing on logout/expiry.
- [x] Implement reset-email request and recovery-password update; redirect to origin root and route on Supabase recovery event to avoid HashRouter fragment conflict.
- [x] Do not call `signUp`; keep session errors and account recovery accessible without exposing credentials.
- [x] Run typecheck, auth tests, and production build.

## Phase 3 — Task, log and project CRUD

### Task 5: Add tasks and task views

**Files:** `src/features/tasks/*`, `src/pages/TasksPage.tsx`, `tests/tasks/*`

- [x] Define Zod schemas and typed service functions for create/read/update/delete.
- [x] Implement list/board, status/priority/category/date filters, search, stable sort, overdue treatment and deletion confirmation.
- [x] Load projects/milestones for validated associations; never change scheduled/due dates as a side effect of status changes.
- [x] Disable saving during requests; show success/error state and invalidate the correct user-scoped queries.
- [x] Run task form/service tests, typecheck and build.

### Task 6: Add activity logs and daily review

**Files:** `src/features/logs/*`, `src/pages/LogsPage.tsx`, `tests/logs/*`

- [x] Implement date-grouped multi-activity CRUD with historical date entry, category, content, integer duration, Markdown notes and project association.
- [x] Enforce nonnegative values in Zod and PostgreSQL; prevent repeat saves while a mutation is pending.
- [x] Implement daily wins/difficulties/tomorrow review upsert on `(user_id, review_date)`.
- [x] Derive daily learning time only from activity rows; task mutations cannot affect it.
- [x] Run date, duration and CRUD tests, typecheck and build.

### Task 7: Add projects and milestones

**Files:** `src/features/projects/*`, `src/pages/ProjectsPage.tsx`, `tests/projects/*`

- [x] Implement project CRUD, archive/unarchive, safe HTTP(S) external links, milestones and confirmation for destructive operations.
- [x] Show task/activity associations; compute progress from linked task rows without a stored fake percentage.
- [x] Enforce same-owner/project associations in forms and SQL; reject deleting a project with live references until explicitly unlinked.
- [x] Run project and milestone tests, typecheck and build.

## Phase 4 — Analytics, weekly review and export

### Task 8: Implement true-data analytics

**Files:** `src/features/analytics/*`, `src/pages/AnalyticsPage.tsx`, `tests/analytics/*`

- [x] Add timezone-aware date helpers, 7/30/90-day totals, weekly totals, categories, completion counts and active-day streak functions.
- [x] Query current-user activities and tasks only; no fixtures or hardcoded counts enter production paths.
- [x] Render ECharts contribution heatmap, duration trend, category share and task completion with accessible summaries and data-empty state.
- [x] Test DST/local-midnight boundaries and records at week/year transitions.
- [x] Run analytics tests, typecheck and build.

### Task 9: Implement weekly review and settings/export

**Files:** `src/features/weekly-reviews/*`, `src/features/settings/*`, `src/lib/export.ts`, `tests/export/*`

- [x] Upsert weekly review on `(user_id, Monday week_start)` with automatic activity/completion summary and editable fields.
- [x] Add timezone, weekly goal, theme and profile display settings with Zod validation.
- [x] Export all seven tables as versioned JSON or per-table CSV with IDs, foreign keys and timestamps; start browser download.
- [x] Verify no export path exposes another user's data and failed writes/downloads are reported.
- [x] Run weekly, settings and export tests, typecheck and build.

## Phase 5 — Verification, deployment and handoff

### Task 10: Finish automated checks and user documentation

**Files:** `tests/*`, `playwright.config.ts`, `vitest.config.ts`, `package.json`, `.github/workflows/deploy.yml`, `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`

- [x] Add Vitest core-rule coverage and Playwright flows for auth, responsive layouts, chart rendering, task/activity CRUD, project associations and review upserts.
- [x] Configure scripts `typecheck`, `test`, `test:e2e`, and `build`; make CI run `npm ci`, typecheck and Vitest before building.
- [x] Configure the official GitHub Pages artifact/deploy workflow with least-required permissions; the repository owner still enables Pages and adds project variables.
- [x] Document local setup, Supabase project/auth/RLS/migration steps, GitHub variables, Pages settings, recovery URLs and limitations.
- [x] Run `npm ci`, typecheck, Vitest, Playwright and production build; record lint warnings and unrun cloud SQL checks accurately.
- [x] Mark unverified remote Supabase/Pages configuration as manual; never report a deployment that did not actually occur.

