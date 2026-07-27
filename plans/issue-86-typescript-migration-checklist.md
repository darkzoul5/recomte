# Issue #86 Checklist: Migrate Project from JavaScript to TypeScript

## Goal

Migrate the project from JavaScript to TypeScript without changing runtime behavior, while keeping the app deployable throughout the transition.

## Checklist

- [ ] Confirm migration scope for the whole app, including `src/`, `db/`, `scripts/`, and `tests/`.
- [ ] Allow mixed JavaScript and TypeScript during the transition so the app remains runnable.
- [ ] Add TypeScript tooling and a minimal `tsconfig.json`.
- [ ] Keep current runtime scripts working during the migration:
  - [ ] `pnpm start`
  - [ ] `pnpm start:public`
  - [ ] `pnpm start:admin`
  - [ ] `pnpm db:migrations`
  - [ ] Repository test scripts under `tests/`
- [ ] Migrate shared low-level code first:
  - [ ] `src/utils/`
  - [ ] `db/`
- [ ] Add types for environment handling, storage paths, database access, and migration flow.
- [ ] Keep SQLite schema and migration behavior stable.
- [ ] Migrate server bootstrap code next:
  - [ ] `src/server/setup.js`
  - [ ] `src/server/public.js`
  - [ ] `src/server/admin.js`
  - [ ] `src/server/index.js`
- [ ] Migrate feature modules one domain at a time:
  - [ ] `auth`
  - [ ] `admin`
  - [ ] `caravans`
  - [ ] `pages`
  - [ ] `sitemap`
- [ ] Preserve public/admin separation throughout the migration.
- [ ] Convert operational scripts as needed:
  - [ ] `scripts/init-db.js`
  - [ ] `scripts/migrate-db.js`
  - [ ] `scripts/seed-db.js`
  - [ ] `scripts/backup-db.js`
  - [ ] `scripts/admin-password-reset.js`
  - [ ] `scripts/validate-db.js`
  - [ ] `scripts/start-all.js`
- [ ] Update tests as needed while keeping existing coverage intact:
  - [ ] DB migrations
  - [ ] auth and CSRF protection
  - [ ] SQL injection and XSS protection
  - [ ] smoke HTTP checks
- [ ] Update package scripts so TypeScript execution is consistent and predictable.
- [ ] Verify Docker and CI paths still work after migration.
- [ ] Keep EJS templates and static assets unchanged unless a small type boundary requires an adapter.
- [ ] Remove obsolete JavaScript-only glue after the TypeScript conversion is stable.
- [ ] Tighten linting and TypeScript strictness gradually.
- [ ] Update `README.md` and environment docs if any workflow changes are introduced.

## Exit Criteria

- [ ] Public and admin servers start successfully.
- [ ] Existing tests pass.
- [ ] No behavior regressions in auth, database migrations, or public pages.
- [ ] The codebase is migrated to TypeScript with a clear, maintainable structure.

