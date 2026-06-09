# Recomte

Recomte is a small Node.js + Fastify web app for managing and listing European caravans for sale.
It includes a public website (catalog + detail pages) and an admin area for managing inventory.

## Tech stack

- Server: Fastify (Node.js, ESM)
- Views: EJS templates
- DB: SQLite (`better-sqlite3`), schema + automatic migrations on startup

## Quick start

1) Install deps

- `corepack enable`
- `pnpm install`

1) Create a `.env` (minimal)

- `SESSION_SECRET` (>= 32 chars)
- `NODE_ENV` (`development` | `production` | `test`)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD` (>= 12 chars)

1) Run

- Public + admin: `pnpm start`
- Public only: `pnpm start:public`
- Admin only: `pnpm start:admin`

Default ports:

- Public: `3000` (`PORT`)
- Admin: `3001` (`ADMIN_PORT`)

## Runtime storage

- Default runtime storage root: `storage`
- Runtime layout under `STORAGE_ROOT`:
  - `db/app.db`
  - `backups/`
  - `images/caravans/`
- Override the storage root with `STORAGE_ROOT`
- Override only the database path with `DB_PATH`

## Database

- Default DB file: `storage/db/app.db` (override with `DB_PATH`)
- Schema is applied on startup (`CREATE TABLE/INDEX IF NOT EXISTS`).
- Migrations are applied automatically on startup (unless disabled).

Controls:

- Disable auto migrations: `MIGRATIONS_AUTO=0`
- Run migrations manually: `pnpm db:migrations` (forces migrations even if auto is disabled)
- Create a DB backup: `pnpm db:backup`
- Initialize/seed:
  - `pnpm db:init`
  - `pnpm db:seed`

### Prod -> Test DB sync (Docker Compose)

If you run separate prod/test containers with separate storage roots (e.g. `./storage/prod` and `./storage/test`),
you can copy a consistent snapshot from prod into test by running `scripts/sync-prod-db-to-test.sh` on the server.
