# Recomte

Recomte is a small Node.js + Fastify web app for managing and listing European caravans for sale.
It includes a public website (catalog + detail pages) and an admin area for managing inventory.

## Tech stack

- Server: Fastify (Node.js, ESM)
- Views: EJS templates
- DB: SQLite (`better-sqlite3`), schema + automatic migrations on startup

## Quick start

1) Install deps

- `npm install`

1) Create a `.env` (minimal)

- `SESSION_SECRET` (>= 32 chars)
- `NODE_ENV` (`development` | `production` | `test`)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD` (>= 12 chars)

1) Run

- Public + admin: `npm run start`
- Public only: `npm run start:public`
- Admin only: `npm run start:admin`

Default ports:

- Public: `3000` (`PORT`)
- Admin: `3001` (`ADMIN_PORT`)

## Database

- Default DB file: `data/app.db` (override with `DB_PATH`)
- Schema is applied on startup (`CREATE TABLE/INDEX IF NOT EXISTS`).
- Migrations are applied automatically on startup (unless disabled).

Controls:

- Disable auto migrations: `MIGRATIONS_AUTO=0`
- Run migrations manually: `npm run db:migrations` (forces migrations even if auto is disabled)
- Create a DB backup: `node scripts/backup-db.js --out data/backups/app-YYYYMMDD.db`
- Initialize/seed:
  - `npm run db:init`
  - `npm run db:seed`

### Prod -> Test DB sync (Docker Compose)

If you run separate prod/test containers with separate bind mounts (e.g. `./data` and `./storage/test`),
you can copy a consistent snapshot from prod into test by running `scripts/sync-prod-db-to-test.sh` on the server.
